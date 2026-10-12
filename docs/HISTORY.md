# Recorded reward history

Issue: [#2](https://github.com/fuzzysniper/scout-stonk-intel/issues/2). Required production synchronization follow-up: [#4](https://github.com/fuzzysniper/scout-stonk-intel/issues/4).

`GET /api/history?mint=...` reads `data/reward-snapshots.json` on the server. It makes no upstream request, writes no observations, and requires no credentials. The same strict base58/32-byte mint validation used by the dossier applies; missing, invalid, and repeated mint parameters return HTTP 400. A missing or unparsable store returns a generic HTTP 503 without file paths or exception details. An unrecorded valid mint returns HTTP 200 with `no_history`, null totals, and insufficient windows. Responses are uncached so `fetchedAt` describes this local read, not an upstream refresh. Successful responses include `dataset.kind = deployment_snapshot`, `dataset.continuouslyUpdated = false`, and the synchronization issue URL. `endAt` is the latest recorded observation; a recent `fetchedAt` does not make old observations fresh.

## Observation handling

- UTC ISO timestamps (`Z` or the collector's `+00:00`) are calendar-validated, normalized, and sorted. Future or malformed timestamps are excluded and prevent comparisons because their place in the sequence is uncertain.
- `recordedCount` counts stored entries; `observationCount` counts unique, parseable, nonfuture timestamps, including entries with invalid counter fields. Missing counter/quote/source values are flagged, not converted to zero. `startAt`/`endAt` are timestamp coverage, not a guarantee that every observation is usable.
- Only finite, nonnegative numeric cumulative totals, valid quote metadata, and the expected StonkFun source URL are usable. Quote symbols are case-sensitive. Optional quote mint identity must agree if present at either endpoint. The current collector records only the symbol; a matching symbol alone does not independently verify asset identity.
- Duplicate timestamps with identical relevant counters, quote metadata, and source count once. Conflicting duplicates become barriers: no comparison uses or bridges that timestamp.
- `changes` subtract adjacent comparable recorded counters. A decrease in distributed tokens or in available payout counts is a reset/decrease, with a null delta. No negative delta is clamped to zero. Missing fields, quote changes, unverified sources, and conflicting duplicates also produce null deltas. A valid unchanged counter produces a genuine zero delta.
- A comparison after a reset can still be valid within the new segment. Windows never sum positive intervals across a reset. The latest valid lifetime counter is reported as recorded, not interpreted as profit.

## 24-hour and 7-day coverage

Windows end at the latest recorded observation (`endAt`), **not** the current fetch time. Each reports the requested start, actual start/end, actual duration, boundary offset, count, maximum observed gap, and timing mode.

The baseline is the nearest recorded point at or before the requested boundary. For the hourly collector, the baseline can be at most 2 hours earlier and all gaps inside the interval must be at most 2 hours. A shorter interval, missing baseline, larger gap, or fewer than two points yields `insufficient_history` and a null total. These conservative limits allow one missed hourly collection without pretending that arbitrarily sparse endpoints cover a period.

An exact baseline is labeled `exact`; an earlier baseline is `nearest_snapshot`, with its actual longer interval and offset disclosed. The result is the counter change over those **actual observations**, never an interpolated exact-period total. Every intervening observation must remain comparable; otherwise the window is `invalid_data` with a null total.

Observations older than 3 hours are explicitly stale. Regardless of historical coverage, stale windows return `stale_data` with null totals; recorded lifetime totals and historical point comparisons remain labeled with their observation times. Window completeness does not establish exhaustive transaction-level coverage.

## Limitations

The checked-in KNOTS history currently contains one observation, so neither a 24-hour nor 7-day comparison is available. Unrecorded mints show no history. No recorded data was added or changed for this feature.

These are StonkFun API-reported token totals, not independently reconciled transfers, APY, holder profit, or recommendations. JavaScript numbers preserve the input representation but do not provide arbitrary precision; UI numbers are rounded to six decimals. The existing collector skips decreasing counters, so resets absent from the recorded file cannot be reconstructed. Missing collection runs and delayed snapshots can limit coverage. GitHub collection updates need to reach the running deployment's local store; this endpoint does not fetch GitHub automatically.

## Verification

Use Node 20 (matching CI):

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run start -- --hostname 127.0.0.1 --port 3108
```

The lockfile now matches the existing manifest: `eslint-config-next` and its Next plugin are 15.5.9, and the root records the existing direct `@eslint/eslintrc` dependency. No manifest dependencies were added. CI uses `npm ci` to detect future drift.

`npm test` compiles the actual history calculator and route into a temporary directory and uses Node's built-in test runner. Twenty-two tests cover all issue-required cases plus strict validation, source/quote consistency, stale/future timestamps, zero/missing values, malformed storage, and sanitized responses. Artificial counters exist only in explicitly labeled unit tests; API checks and UI screenshots use the actual checked-in store. CI runs the new tests and lint before type checking/build.

The history panel announces loading/error/no-history states, uses labeled sections and semantic definitions, displays UTC timestamps, and aborts obsolete requests when the selected mint changes. Window cards stack on mobile. Snapshot lifetime totals and adjacent-point changes are archived evidence with observation times, even if stale; they are not current window totals. The repository snapshot link can differ from the bundled dataset; the history JSON reflects this deployment.

## Deployment and synchronization boundary

The hourly collector runs at minute 17 and commits observations to the repository. This changes repository history only. A running deployment keeps its bundled checkout; `force-dynamic`, `no-store`, refreshing the browser, or reading the file again does not fetch newer GitHub data. Only a successful build from a checkout containing those observations, followed by deployment of that artifact, can change this bundled dataset. This PR does not configure or verify that propagation. GitHub Actions bot commits also must not be assumed to trigger downstream workflows or deployments.

Issue #4 must land in a separately reviewed feature PR before historical comparisons are promoted as continuously updated production data. It requires a durable read-only serving path, dataset revision and observation/fetch times, bounded caching with stale/outage handling, tests for updates after deployment, and verification on the deployed host. Infrastructure choices and any paid costs remain subject to review. This PR adds no storage service, credentials, synchronization job, or production deployment.

### Review follow-up verification

Validated on Node 20.20.2 and npm 11.9.0: `npm ci` exited 0 (310 packages installed); `npm test` exited 0 (22 passed, 0 failed/cancelled/skipped); `npx tsc --noEmit`, `npm run lint`, and `npm run build` each exited 0. Installation emitted the existing ESLint 9.39.5 deprecation warning; the build emitted the existing edge-runtime/static-generation warning. Initial sandboxed test runs reported only two files; the verified run with executor network permission reported all 22 individual assertions. The workspace npm cache was selected with `NPM_CONFIG_CACHE=/workspace/.npm`, and Node 20 was selected through PATH.

Local production-server checks: homepage, recorded history, and unrecorded mint HTTP 200; invalid/repeated mint HTTP 400; POST HTTP 405. Real history contained one observation at `2026-10-12T15:43:41.000Z`; the API returned deployment-snapshot metadata, `no-store`, stale freshness, and null 24h/7d totals. Chromium at 1280px and 390px confirmed snapshot labeling, withheld stale windows, no horizontal overflow or uncaught page errors, and keyboard-operated disclosure. No history or API response was mocked. No deployed-host synchronization or remote CI result is established by these local checks. The original screenshots below predate the deployment-snapshot labeling; refreshed screenshots are added for this review. Tests include stale incomplete windows, the exact three-hour freshness boundary, and repeated reads of the same stale deployment dataset. Artificial data stays in unit tests or temporary directories and never enters checked-in history.
### Screenshots

Captured from the local production build without fabricated API/history responses:

- [Updated desktop: deployment snapshot](screenshots/history-desktop-snapshot.png)
- [Updated mobile: deployment snapshot](screenshots/history-mobile-snapshot.png)
- [Original desktop: recorded KNOTS history](screenshots/history-desktop.png)
- [Mobile: recorded KNOTS history](screenshots/history-mobile.png)
- [Mobile: unrecorded mint](screenshots/history-no-history.png)

## Rollback

Revert the feature commit through a reviewed PR. This removes the history endpoint/panel, calculator, tests, and CI additions. The collector and recorded JSON are unchanged; no data migration or deletion is needed. No production deployment is performed by this task. Human approval is required before merge or production rollout.
