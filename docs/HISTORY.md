# Recorded reward history

Issues: [#2](https://github.com/fuzzysniper/scout-stonk-intel/issues/2) (calculations and UI), [#4](https://github.com/fuzzysniper/scout-stonk-intel/issues/4) (production synchronization).

## Serving path and methodology

`GET /api/history?mint=...` reads the public `https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json` server-side. It no longer reads deployment-local JSON. A deployed application can discover new collector commits without rebuilding. The hourly schedule remains minute 17; the [Radar collector](RADAR.md) validates an allowlist and explicit quote identity; delayed/failed collection still produces old observations. Refreshing history requests a new report; the UI does not poll unattended.

The fixed source is checked on demand, with a five-minute in-memory cache per warm server instance. Expiry is blocking: the request awaits a refresh rather than silently serving stale-while-revalidate. Concurrent requests share one refresh. Cold starts fetch independently; this is not a distributed cache. The same dataset is reused across mints. Fetches use `no-store`, no-cache headers, and a new random query key for each refresh to avoid reusing a GitHub CDN URL cache entry. Redirects are rejected; responses with an `Age`/`Source-Age` over five minutes or invalid age are rejected. An eight-second abort covers headers and body, and streamed/decompressed bytes are capped at 2 MiB before JSON parsing. No retries occur inside a request.

A revision is `sha256:` plus the hash of the exact retrieved bytes, **not** a Git commit SHA. It changes when dataset bytes change. This names the served content without pretending that a branch URL proves the latest GitHub commit. GitHub/provider consistency or transport bugs cannot be eliminated; no claim of an instantaneous latest revision is made. Observation freshness independently determines whether window totals may be shown, even after a successful new fetch of unchanged/old bytes.

## Response contract

- `dataset.kind`: `github_snapshot`; `dataset.source`: the fixed GitHub raw URL.
- `dataset.revision`: SHA-256 content revision, or null when no usable dataset is served.
- `dataset.dataFetchedAt` and top-level `dataFetchedAt`: time the complete, structurally valid dataset was successfully read; cache hits/fallback do not advance it.
- `latestObservedAt` (also `endAt`): latest parseable, nonfuture observation for the selected mint, not retrieval time. Invalid observation fields remain flagged.
- `fetchedAt`: this API response's calculation time. Freshness ages are recomputed on every request.
- `dataset.sourceStatus`: `available` after successful fetch, `cached` within the five-minute cache, `degraded` for bounded last-success retention after a failed refresh, or `unavailable` with HTTP 503.
- `dataset.cacheSeconds`: 300. `continuouslyUpdated: false` means the feed is request-driven and does not promise uninterrupted/real-time updates.

Mint parameters are strictly validated before any source access; missing, invalid, repeated, or traversal values yield 400. A structurally valid dataset lacking a mint (or with an empty array) yields `no_history`, not invented values. Invalid JSON, UTF-8, top-level structure, mint keys or non-array records fail the source read. Individual malformed observations pass to the existing calculator so its barriers and quality warnings are preserved. All API responses with data/errors use `Cache-Control: no-store` (invalid parameters also contain no data).

## Source failure and stale states

A failed fetch (including 404, rate limiting, non-success status, timeout, malformed response or oversized data) backs off for one minute per instance. If a last successful dataset is at most 15 minutes old, the API serves it as **degraded**, retaining its original revision/retrieval time. Both current windows become `source_unavailable` with null totals, even if the retained observations look recent. Archived lifetime totals and adjacent-point comparisons retain their observation times and source warning. If no successful dataset exists or it is older than 15 minutes, return sanitized HTTP 503 with null dataset revision and times. There is no deployment-file fallback and no credentials or upstream exception/path disclosure. A later successful read recovers automatically.

A GitHub fetch can succeed while the collector or StonkFun provider has stopped updating. Observation age greater than three hours yields `stale` and both windows `stale_data` with null totals. This rule applies even with incomplete coverage. A recent retrieval time, content hash or `available` source status never converts stale observations into fresh ones. The UI separately shows source status, revision, retrieval time and observation age.

## Preserved calculation safeguards

- Calendar-valid UTC ISO timestamps (`Z` or collector `+00:00`) are normalized/sorted. Future/malformed timestamps are excluded and prevent comparisons because their sequence position is uncertain.
- Stored entry and unique timestamp counts differ. Missing/invalid counter fields are flagged, never converted to zero. Only finite nonnegative cumulative totals, valid quote metadata, and the exact expected StonkFun URL are usable.
- Identical duplicates collapse; conflicting duplicates are barriers. Adjacent changes use comparable counters only. Counter decreases, missing fields, quote changes and unverified sources produce null deltas; no reset is clamped or bridged. An unchanged valid counter produces zero.
- 24h/7d windows end at the latest observation, not response time. A baseline must exist at/before the boundary within two hours, with no interior gap over two hours. Insufficient coverage returns null totals; earlier boundaries disclose actual duration/offset. Every intervening point must remain comparable.
- Stale/degraded current windows are withheld. No interpolation, extrapolation, annualization, APY, holder profit inference, or transaction reconciliation is introduced.

## Deployment requirements, security and cost

Use a Node runtime with native fetch (Node 20, matching CI), HTTPS egress to `raw.githubusercontent.com`, and the existing public repository/collector. No secrets, GitHub token, environment variable, schema migration, added dependency, paid database, cron service, DNS change or new infrastructure is required. Deployment initially needs this reviewed application change; subsequent data commits do not need redeployment. GitHub Actions bot commits need not trigger another workflow for this serving path to function.

Trust is the repository's `main` snapshot and GitHub TLS, not independently verified transfers. Protect branch writes and collector permissions. User input cannot choose a URL, branch, filesystem path or redirect target, preventing arbitrary source fetches. SHA-256 identifies bytes; it is not a signature or proof of transaction validity. Public data only is sent to browsers. Exceptions are sanitized. Resource limits and one-minute failure backoff bound per-instance work, but high cold-start/concurrent-instance traffic multiplies downloads. At steady traffic each warm instance fetches at most 12 successful datasets/hour; downloads are at most 2 MiB each. GitHub may throttle or fail, and existing hosting execution/egress quotas still apply. There is no new paid service; review a shared cache/store and operational costs if traffic or the dataset outgrows these limits. Do not add credentials to overcome failure silently.

The real dataset remains sparse and cannot yet demonstrate 24h/7d comparisons. See [Radar initial observations](RADAR.md). Legacy points lack quote mint identity; new collector observations record it. Symbols alone do not verify asset identity. JavaScript numeric precision and six-decimal UI rounding apply. The Radar collector records new decreases/resets explicitly; decreases skipped by earlier versions cannot be reconstructed. Per-instance memory is ephemeral; fallback is unavailable after a cold start. This PR does not independently verify production propagation: the following human-approved deployed-host check remains required before promoting that behavior.

## Deployment verification instructions (human approval required)

1. After an approved deployment, record deployment ID/build revision and call `/api/history?mint=8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS`. Save dataset revision, `dataFetchedAt`, `latestObservedAt`, source status and window statuses. Confirm response `no-store`; repeated warm-instance reads within five minutes preserve retrieval time/revision.
2. Wait for a **real successful** collector run on `main`. Record its commit, snapshot byte hash and latest observation; do not insert synthetic data or trigger production writes for this test. Do not redeploy the app.
3. After five minutes, refresh the API on the same deployed host. Confirm changed byte hash/revision and actual new observation when the collector produced different bytes, with unchanged application deployment/build identity. Cold instances can see changes sooner. Account for scheduling/GitHub delays; a failed run or unchanged file is not proof of propagation.
4. Check observation age, adequate real coverage and all quality rules before presenting any 24h/7d total. Fetch time alone is insufficient. Confirm UI displays source/revision/times and no overflow at mobile/desktop widths; Refresh history works without navigating away.
5. Exercise outage/invalid-source behavior in a local or approved isolated environment, not by changing production DNS/credentials. Verify degraded retention has original retrieval time and null windows, expires to 503 after 15 minutes, backs off for one minute and recovers. A cold source outage must return 503, never bundled observations.
6. Attach these observations and hosting/GitHub errors to review evidence. This task performs no production deployment or DNS change.

## Local verification and screenshots

Run `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, then `npm run start -- --hostname 127.0.0.1 --port 3108`. The tests compile the real source reader/calculator/route and use Node's test runner. Artificial data is confined to explicitly labeled test fixtures; screenshots use real GitHub-hosted data. Source tests simulate an unchanged running reader seeing later data after cache expiry, stale data, outages/retention/recovery, malformed/missing responses, invalid observations, transport age, size limits, interrupted bodies, an unresponsive fetch deadline, and concurrent reads.

Final local results on Node 20.20.2/npm 11.9.0: `npm ci` exit 0 (310 packages), `npm test` exit 0 (29 passed, none failed/cancelled/skipped), `npx tsc --noEmit` exit 0, `npm run lint` exit 0 (no errors/warnings), and `npm run build` exit 0. Node was selected through PATH and writable npm cache through `NPM_CONFIG_CACHE=/workspace/.npm`. Installation retained the ESLint 9.39.5 deprecation warning; build retained the edge-runtime/static-generation warning. A transient JSX syntax error during cleanup was caught by typecheck/lint/build, fixed, and all three rerun successfully.

Local production smoke checks used the actual built app and live GitHub data. This managed environment requires a proxy; the smoke server used Node 24.19.0 `--use-env-proxy`, while the build and automated tests used Node 20.20.2. No proxy code/dependency was added to the application. Homepage, recorded history and missing mint returned 200; invalid/repeated mint returned 400; POST returned 405. The served revision matched a separately downloaded live GitHub file: `sha256:6b953a9a00719e23e55eae1de23fb5379d685c2f958b2fb6365b440484eda103`. It contained one observation at `2026-10-12T15:43:41.000Z`; successful retrieval at `2026-10-12T20:25:24.256Z` did not mask its stale state or null windows. A subsequent warm read returned `cached` without advancing retrieval time.

Chromium at 1280px/390px confirmed source/revision visibility, null stale windows, working Refresh history requests and keyboard disclosure, no horizontal overflow and no uncaught page errors. Screenshots contain real observations, with no mocked responses:

- [Desktop GitHub history](screenshots/history-github-desktop.png)
- [Mobile GitHub history](screenshots/history-github-mobile.png)

Post-deployment new-data discovery is demonstrated by deterministic source tests without redeploying/recreating the reader, not by production writes. Actual deployed-host propagation remains unverified until the approved procedure above is completed. Previous PR #3 screenshots represent the old bundled serving path and are retained only as historical artifacts.

## Rollback

Revert this feature commit through a reviewed PR, then perform an approved deployment of the reverted app. This restores PR #3's deployment-bundled reader and labels; that path requires rebuild/deploy for new data and must not be promoted as continuously synchronized. For synchronization-only rollback no collector/data rollback, migration, deletion or credential revocation is needed. Radar rollback is documented separately in [RADAR.md](RADAR.md). Cache is process-local and disappears with the old process. No merge or production rollout occurs without human approval.

## Signal Lab shared calculations

[Signal Lab V1](SIGNALS.md) reuses the history normalizer, timestamp parser, actual-boundary selector and adjacent-point comparison helper. Historical archive behavior and its gap policy are preserved; matched research comparisons add stricter gap, duration, quote-identity and paired-period requirements.

## Data Health operational monitoring

[Data Health V1](DATA_HEALTH.md) documents per-token freshness/coverage, dated scheduler evidence, bounded collection summaries, optional daily operational alerts and human-approved verification. This operational view does not change the historical or Signal Lab calculations.

## Calendar-day research briefs

[Research Briefs V1](BRIEFS.md) reuses the history normalizer and actual boundary selector for provisional UTC-day comparisons. Briefs add explicit quote identity, strict gap/duration gates and versioned sharing; existing history and Signal Lab calculations are unchanged.
