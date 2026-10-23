# Combined release verification — 23 October 2026

The exact component SHAs and founder-reported account snapshot are in [inputs.json](inputs.json). The release PR records the final immutable head and its actual GitHub/Vercel check results. Local success is **not** hosted connectivity, provider billing/rights, genuine-event or physical-iPhone acceptance.

## Source composition and scope

Latest main `6a9ba2fa58235acd6c56bc4fdf09fefa38f01127` plus B `0fc08db`, A reviewed runtime `5c89f21` and offline/doc-only follow-up `ab13c13`, C reviewed consumer `29ae3cb` and private-feed checkpoint `0111d06`. Merge commits preserve their ancestry; collector, `lib/onchain-mint`, `/api/mint-facts`, scheduler and `neon.ts` bytes remain identical to main. No old proof/preflight/canary gate or state was modified.

All B runtime/SQL/fingerprints are identical to reviewed B. All A runtime/build/package/lock bytes are identical to reviewed A. All C product bytes are identical to its published live-feed checkpoint: the integrator did not redesign or overwrite frontend. Existing dependency locks remain unchanged; worker has its own reviewed isolated lock. The integration adds only this release documentation/input record, composition/native end-to-end tests, a PR-only offline integration/browser workflow, and one coordinated browser test-observation correction.

## Executed local results

| Check | Result |
| --- | --- |
| Locked root, worker and browser-tool installs | Pass |
| Complete root regressions/security | **1,257 Node + 107 Python passed**, zero failures/skips; includes native local PostgreSQL/TLS, privileges, fingerprints, atomic authorization, concurrency, leases/fencing, outages/restart, limits, redaction and protected API tests |
| A worker offline security | **42 passed** |
| A+B real local TLS/PostgreSQL | **3 passed**: source identity/quotes/promotion/STOP/release, and credit envelope refusing second connection before/after40RPC charges |
| A+B+C real local TLS/PostgreSQL | **2 passed**: both quote identities, worker→durable row→authenticated API→C strict decoder; explicit C STOP→SQL latch→worker closure, unchanged clocks/credits and idempotent STOP |
| Release composition/disabled gates | **7 passed** |
| Types, lint, production build | Pass |
| Append-only archive | Pass against current main |
| Built local Node GET/STOP routes | Pass:503disabled/null, wrong methods405; no credential/DB/provider access |
| Worker build / actual default entry | Pass: `DISABLED`, `sourceConnected:false`, `counts:null` |
| Mobile/desktop browser and axe | **39 passed**,320×740 /390×844 /1280×900; see exact-head CI and notes below |
| Changed-file secret review | No credential filenames/private-key/provider-key/token patterns found; test credentials/observations are explicitly synthetic |

All PostgreSQL tests use disposable **local** PostgreSQL17 with self-signed test CA trusted only by the test process, correct SNI/hostname verification, and invented roles/passwords/source callbacks. The production adapter's endpoint, native TLS and channel-binding gates are unchanged. No hosted SQL or provider request was made. No claim that nativepg's preference for PLUS enforces `channel_binding=require`; that DSN remains blocked.

The additional three-component test uses the actual A worker, actual B native PostgreSQL port and authenticated handler, actual Next empty-POST adapter, and actual C client/decoder. Only source responses and hosting/browser identity are synthetic offline seams. It does not prove effective Vercel Authentication or Render identity in production.

## Browser evidence and correction

C's [screenshots](../live-feed-167/screenshots) show the actual optimized local locked/default-disabled app, not accepted fake events. Existing [iPhone checklist](../live-feed-167/IPHONE.md) remains owner-only pending. Successful-record/stale/STOP stories use labeled offline HTTP fixtures under tests only; production contains no fixture switch. Coverage includes no passive API/source request, same-origin cookie/bearer delivery, memory-only capability, five-second serial foreground reads, hidden-tab aging, error halt/record withholding, explicit STOP and uncertain acknowledgment, native-SOL labeling, provisional mint withholding,20records, keyboard/reflow/zoom/reduced motion and axe.

An initial browser run passed38/39: Chromium discarded the already-consumed/aborted response body before Playwright's `response.json()` in the390disabled test. The coordinated correction captures the **actual single local API response** via `route.fetch()` then passes it through unchanged; no invented body, extra request, relaxed assertion or product change. The subsequent complete39-case run passed. A new integration-test teardown initially double-ended a worker-closed pg pool; the test now removes closed pools before final cleanup. Neither correction changed runtime behavior.

## Reproduce without hosted services

Node24.19.0; PostgreSQL15+ server/client including`psql`, OpenSSL; Chromium. If needed use local `SCOUT_TEST_PG_BIN`/`SCOUT_TEST_PG_SHARE` paths documented by the existing harness. No production environment/credential pull.

```sh
npm ci
npm ci --prefix experiments/live-stream --ignore-scripts
npm ci --prefix experiments/consumer-mvp/web --ignore-scripts
npm test
bash experiments/live-stream/test.sh
node --test tests/live-release/contracts.test.mjs
bash tests/live-release/combined.sh
bash tests/live-release/end-to-end.sh
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
node tests/live-ledger/built-api.mjs
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs
bash scripts/archive-tool.sh check origin/main
npm run --prefix experiments/live-stream build
node experiments/live-stream/run.mjs
```

## Remaining release/activation gates

No production action is approved. Owner must verify exact deployed identities/API protection, new roles/native connectivity, secret isolation, actual iPhone read/STOP access, paid Render plan, Helius included-credit metering/cutoff, private-use/retention rights and conservative session weights. Then separately approve one initial SQL/source grant and genuine-event acceptance, followed by permanent STOP and native closure/suspension. Unknown outcomes never authorize retries or resets. See [owner card](OWNER.md).

The separate [mobile-week proposal](MOBILE-WEEK.md) is unimplemented/unapproved. Today's <=1h one-shot grant/200rowstore cannot provide continuous seven-day service or guaranteed physical deletion during outages. Do not advertise either as established.
