# USDC canary validation — 20 October 2026

Source started at latest main `86a2edf597f728e9fb502b99f624120cf8831725` (#121/#122 included); refreshed before publication without a base change. Implementation checkpoint `91b5bfc93048fe00cce4a6b3b621ca8a01cf3f2a`. A transient execution-service disconnect was recovered: all existing work was inspected/preserved, nothing reconstructed or overwritten. Draft #118 remains clean at `04a47f1`, unchanged/unmerged.

**No deployment, hosted Neon query, Helius request, secret-value retrieval/export, credential/billing change or alias operation occurred.** Actual hosted authentication/SQL/RPC behavior is unproven until the separately approved first canary action. Fake production contexts and `production_rpc` test packets are explicitly synthetic classifications, not hosted proof.

Local runtime: Node24.19.0, npm11.9.0, pg8.23.1, genuine disposable PostgreSQL17.11. Existing dependency lockfiles unchanged.

| Command / check | Actual result |
| --- | --- |
| `npm ci --cache /tmp/scout-canary-npm-cache` | PASS, locked install |
| `SCOUT_TEST_PG_BIN=/workspace/scout111-tools/extracted/usr/lib/postgresql/17/bin npm test` | **984 passed**, 878 Node +106 Python, zero failures/skips in final complete run |
| New canary cases | **25 real local PostgreSQL/TLS integration cases**, **5 offline console verifier cases**, **1 added escaped-key reflection case**. No live provider/hosting response. |
| Concurrency/budget/restart | Four independent pools/HTTP isolates issue one synthetic provider call. Cache expiry, UTC rollover, crash/restart and existing nonzero sequence cannot authorize another. No production state reset/rearm code. |
| SQL/security | Actual local TLS, restricted login/database, function body/config fingerprint, effective grants, nonzero fencing/counters, missing state/function, lost admission/completion ACK and outages tested. Uncertain operations remain charged; no source fallback. |
| Protocol/error | Exact USDC, SPL owner, six decimals, true zero/null authorities, expired window, wrong host/project/ingress, nonempty/stalled body, missing/scoped credentials, insecure TLS/forced-native env guards, 401/429/503, 5s timeout, Token-2022 rejection, secret reflection, raw source hash and cache/new-RPC distinction pass. |
| `./node_modules/.bin/tsc --noEmit` | PASS; also after production build, generated next-env change restored |
| `npm run lint` | PASS |
| `NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build` | PASS, real local production build with external provider HTTP egress blocked |
| `bash tests/security114/run-browser.sh` | **81 passed**, existing 320/390/1280 consumer, keyboard, sharing, six-row terminal and actual OG PNG checks. No CARDS/UI edit or physical-device claim. |
| `node tests/onchain-api/canary-browser.mjs` | PASS at **320/390/1280** in real Chromium, all requests intercepted offline: inert load, one explicit empty POST, correct native Origin, reload/duplicate prevention. Interception occurs before wire-only Fetch Metadata: server metadata validation has synthetic unit coverage, not a claimed real Vercel result. |
| `bash scripts/archive-tool.sh check origin/main` | PASS, append-only/reproduction |
| `npm run archive:dry-run` | **REFUSED exit1 `retention_boundary`** for the only reviewed 2026-10-11 edition, now beyond its existing generation window. Not a passing publication rehearsal; no archive policy/data/clock change to hide it. Separate from backend activation. |
| `npm audit --omit=dev --json` | **0 production vulnerabilities**; existing dev-tool disposition unchanged |
| Scope and secret review | `git diff --check`, explicit changed-file review, credential-pattern scan; no env/key/generated artifact, wallet/bot/collector/Cloudflare/CARDS change. No workflow/dependency/schema/bootstrap change. |

The console's original `no-referrer` policy could cause a null Origin with same-origin POST. Real browser interception identified the mismatch; final tool uses `referrerPolicy=same-origin` and verifies native Origin at all three widths. It requires source delivery `rpc`; cached observations cannot pass as a newly issued canary call. API SHA-256 is computed independently from received API bytes; original RPC-body SHA-256 remains server-reported because the API does not expose raw RPC bytes. Neither hash proves independent chain replay.

Detailed local outputs remain in `/tmp/scout-canary-*.log` while this workspace persists. Browser artifacts/images stayed in disposable locations; previous UI proof files were not overwritten. Synthetic certificates/keys were local temporary fixtures and removed by test cleanup.

The existing GitHub CI runs full npm tests, archive integrity, lint, types and build at the PR head/synthetic merge result. Actual updated-head run/job results must be inspected after push and are reported in the PR; no prior PR #118 green run is reused. No CI job has production acquisition credentials or can establish hosted Neon/Helius connectivity.

See [rollout, exact one-POST verification, cost/budget and rollback](ROLLOUT.md). Remaining live gates: founder release/invocation approval, exact normal-production deployment/Authentication/system identity, existing account quota/terms and native deployed SQL/credential compatibility. A missing/changed/charged policy or fingerprint/permission mismatch stops before RPC; do not clear state or pretend these hosted checks already passed. SCRAM mechanism remains unobserved. No known failing code regression remains in the completed local checks.
