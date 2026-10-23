# Combined creation-viewer verification

23 October 2026. Code inputs: C `29ae3cb`, A `5c89f210b06906d364dce671add4fdb077a118f8`, B `5390e75b1300abbe6b2b6ba8364dcaffdca4de84`. Final exact combined SHA/CI are recorded on PR #168. [Release](RELEASE.md) · [iPhone acceptance](IPHONE.md) · [Scope hashes](scope.json) · [Machine results](verification.json).

| Check | Actual local result |
| --- | --- |
| Combined root suite, disposable local PostgreSQL17 | **1,254 Node + 107 Python = 1,361 passed**, zero failures/skips |
| New browser contract/transport unit tests, included above | **16 passed**: identity/finality/quote, bounded20, unknown preservation, clocks/lease, token/auth transport, STOP and malformed/oversized refusal |
| A worker offline suite | **41 passed** |
| A+B actual local TLS/SCRAM PostgreSQL integration | **2 passed**, native SOL/USDC, persisted promotion/tickets, STOP and exact terminal closure; invented source callbacks/credentials only |
| Typecheck / lint / optimized Next build | Pass; lint zero warnings/errors |
| Current launch browser suite | **39/39 passed in one clean 53.4-second final run**, 320×740 / 390×844 / 1280×900 |
| Archive append-only / original collector ancestry | Pass |
| A build / default worker entry | Pass; `DISABLED`, `sourceConnected:false`, `counts:null`, separate owner source GO required |
| Exact-head GitHub root/worker CI and preview | Authoritative final status on PR #168; not inferred from these local results |

## Browser evidence

Actual optimized local Next app and B default-OFF API: no request on landing/query flags, empty token, no sample rows, icons present and exact-mint analysis unavailable. One explicit read with a **test-only noncredential bearer** returns actual HTTP503/`disabled`, `events:null`, `counts:null`, no DB/provider invocation. These are not hosted authentication or real event-delivery proofs.

| Viewport | Actual locked page | Actual disabled API view |
| --- | --- | --- |
| 320 | [PNG](screenshots/locked-320.png) | [PNG](screenshots/disabled-320.png) |
| 390 | [PNG](screenshots/locked-390.png) | [PNG](screenshots/disabled-390.png) |
| 1280 | [PNG](screenshots/locked-1280.png) | [PNG](screenshots/disabled-1280.png) |

All accepted-record/state tests use explicitly labeled **offline HTTP fixtures** in Playwright only; fixture files live only under tests and are never imported by the product. No accepted-data screenshot or synthetic live dataset is delivered. The product contains no fixture switch, seed data, provider client, public response cache or fake fallback.

The 39 cases cover twenty bounded original records; provisional mint/quote withholding; same-provider finalized receipts/native SOL; waiting/stale/stopped; source versus DB clocks; gaps/worker/budget/one-hour limits; legitimate same-origin cookie and bearer transmission; >=5s serial reads; hidden-tab pause; error/unauthorized halt with record withholding; no token persistence/reload restoration; delayed response after lock; separate STOP intent/authorization, preserved original times, success and uncertain failure; no mint/proof fallback; keyboard/zoom/reflow/reduced-motion and asserted axe states. First-screen read button geometry and no horizontal overflow pass. External browser requests and page errors are asserted absent.

Earlier browser attempts exposed test-only case-sensitive text, wall-clock test assumptions and a paused-clock interaction with the accessibility scanner. Corrected the tests rather than changing authentication/freshness rules. The final result is one full invocation. A final STOP review additionally ensured uncertain acknowledgment overrides an old observing headline, and later reads cannot erase a confirmed in-memory STOP.

Initial full-root execution lacked the local `psql` client needed by B's genuine authorization-file test. Added only disposable PostgreSQL client binaries under `/tmp`; the completed run includes all38 B SQL tests, not a skip or stub. No B/legacy test or source policy was weakened.

## Reproduction

Existing root and test-tool lockfiles remain unchanged. Use Node24.19 for the worker and browser tooling and PostgreSQL15+ binaries including **psql**; root CI also checks its configured Node20 runtime. Local nonstandard PostgreSQL paths use `SCOUT_TEST_PG_BIN` and `SCOUT_TEST_PG_SHARE` plus its library path, as in B's test harness.

```sh
npm ci
npm ci --prefix experiments/live-stream --ignore-scripts
npm ci --prefix experiments/consumer-mvp/web --ignore-scripts
npm test
bash experiments/live-stream/test.sh
npx tsc --noEmit
npm run lint
npm run build
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs
bash scripts/archive-tool.sh check origin/main
npm run build --prefix experiments/live-stream
node experiments/live-stream/run.mjs
```

For A+B integration, use `bash experiments/live-stream/integration-test.sh /tmp/<reviewed-combined-checkout>` with local dependencies/PostgreSQL configured. This invokes only the disposable TLS/PostgreSQL harness, never a hosted store or provider. The test worktree used the unchanged A/B code in this combined branch.

The previous231 browser stories describe the retired exact-mint homepage at C `29ae3cb`. Their config is preserved as `tests/consumer-homepage/legacy.playwright.config.mjs` for that checkout; they are **not** claimed as coverage for the new root route. Existing pure component/client/validator regressions continue in root CI. New release tests replace obsolete root-route expectations, not the backend/security checks.

## Release limits

Actual Vercel API Authentication, unique production origin, deployed identity, owner bearer provisioning, Neon/Render identity/TLS/rights, dedicated DATA allowance/hard billing cap, genuine provider messages and retained finalized creations, physical iPhone/Edge and real durable STOP/native closure remain **pending owner-authorized acceptance**. Local fixtures, green CI and default-OFF checks cannot establish those facts. All source, credential, SQL, release and deployment approvals remain separate.
