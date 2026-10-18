# Implementation / security validation — #108

Baseline: latest main `e9cc7a9d06841d7b9cba9f66bad9968eaf75f14f`, with #104/#106 merged. Branch `feat/108-helius-mint-api`. Date 2026-10-18 UTC. Scope: new route, isolated server modules, focused API tests; a small internal decoder host boundary and one test-runner invocation. No consumer/UI tests, collector, workflows, Cloudflare, retained data, rights, wallet, old bot or treasury changes.

## Proofs and limits

- Public route tested with poisoned credential/activation environment getters and a failing fetch stub in production/development/test: valid canonical GET always 503/disabled, zero outbound calls and zero credential reads. Adding a key/environment flag cannot activate this code.
- Synthetic API constructor is test-only per request, requires explicit label and injected dependencies; its success cannot enter the deployed route. Native transport is never used by tests. Server-only marker rejects unconditioned client-style imports.
- 72 new deterministic tests: 53 route/Helius/identity/source/security cases and 19 distributed-state cases. They exercise HTTP/body/header mapping, exact mint/query bounds, owner/initialized mint and extensions through #106, actual Helius host projection and unspoofable public decoder default, zero/huge integer supply correctness inherited from the engine, metadata/secret redaction, 401/403/429/503, no retries, byte/UTF-8/BOM/redirect limits, source clocks/epochs/IDs, stream/fetch/hash deadlines and missing identity/store.
- Two independent synthetic workers share one atomic reference service: one in-flight lease, quota/spacing across workers, original cache clocks/hash/expiry, old/new context admission, TTL refresh, per-client and global ceilings, IP alias/forwarding spoof rejection, bounded bucket/cache capacity, HMAC tampering, unknown state/counter/policy, lost reservation/completion, stale/expired leases, late fencing and durable terminal circuit. This proves model behavior, **not real distributed-store availability or deployment safety**.
- Public RPC dev path and original MintFactsV1 types remain unchanged. Current provider support remains three dated examples, checked by the existing evidence suite. No historical reward, live market, brand/quote legitimacy, underlying-share ownership or holder ROI claim is added.
- Production build was served locally and the actual `/api/mint-facts` route returned JSON unavailable with no-store: GET from unapproved localhost origin 403, POST 405. Canonical HTTPS origin 503 is covered by direct route tests; actual Vercel/proxy origin behavior is an unmet hosting QA gate. Local production server was stopped after the check.
- **Zero real RPC/account/provider-data calls** in this task. Only public Helius documentation was read. All successful inputs are labeled SYNTHETIC/OFFLINE format mocks, never authentic observations or real-source browser screenshots. The earlier network failure was not retried. No secret/account/plan or old bot configuration was inspected, changed, copied or revoked; no billing was initiated.

## Required commands

```sh
npm ci
npm test
bash tests/onchain-api/run.sh
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
git diff --check
```

All final checks passed on 2026-10-18 UTC:

| Check | Result |
| --- | --- |
| `npm ci` | Passed; dependency/lockfiles unchanged. |
| `npm test` | Passed: 501 existing app/OG/archive/staging, 84 existing evidence, 68 mint-engine, 72 new API/security, 106 Python and 18 scheduler tests; zero failures. |
| Focused API | Standalone actual-route compile, 53 route + 19 shared-state tests passed. |
| Typecheck / lint | Both passed; typecheck repeated after restoring generated Next reference. |
| Production build | Passed, including the new dynamic `/api/mint-facts` route. Existing edge static-generation notice only. |
| Archive integrity | Append-only/reproduction check against origin/main passed. |
| Archive rehearsal | Dry-run passed, disposable checkout removed, retained archive unchanged. |
| Local production HTTP | Actual route returned JSON 403 for unapproved local origin and 405 for POST, no facts, no-store; server stopped. |
| Scope / diff | Diff check passed. No consumer, UI tests, infrastructure, data or credential changes. Main re-fetched during validation remained `e9cc7a9`. |

New test script compiles the actual route/testing boundary and executes direct Node tests with Next's bundled `server-only` marker under `--conditions=react-server`; no dependency was added. `npm test` includes it alongside the existing app/OG/staging/archive, dated evidence, mint engine, Python and scheduler suites. Staging tests run local mocks/Miniflare, not deployment, workflow dispatch or provider authentication. Archive dry-run uses a disposable local checkout, performs no network/commits, and leaves retained archives unchanged. Generated `next-env.d.ts` is restored after build, followed by typecheck; it is excluded from the change.

## Human review / unmet activation gates

Stable route/schema/status handoff: [#107 early contract](https://github.com/fuzzysniper/scout-stonk-intel/issues/107#issuecomment-6252159724), [origin and source clarification](https://github.com/fuzzysniper/scout-stonk-intel/issues/107#issuecomment-6252307249). Agent A owns browser/consumer integration. No HTTP envelope or contract version change is proposed.

Review security and the trusted internal host change under AGENTS.md. Follow the [owner checklist](README.md): existing paid Helius account/terms/remaining shared quota; fresh isolated SCOUT credential and independent HMAC key supplied directly server-side by the owner; real distributed store and hosting identity/origin adapter; cost/privacy/native TTL/log redaction review; separately authorized single real capture; real-source browser/iPhone QA; separate production activation PR. None of those are inferred from the offline tests. No new provider purchase, account access, live request or old-key revocation is authorized here.

Rollback: revert this scoped code/test addition and decoder host option. No active deployment, key, data or infrastructure requires rollback. Do not touch the former bot or its key. This is a human-review PR only, with no merge/deployment/activation.
