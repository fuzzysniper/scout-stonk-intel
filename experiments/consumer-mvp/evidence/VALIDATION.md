# Review evidence — October 17, 2026

Base: latest fetched main `5b14071aa0b8f0dde03f3bdb62dee13376b731b0` (includes #87). Branch: `feat/89-consumer-evidence`. Runtime: Node 24.19.0 / npm 11.9.0. No production UI/API, data, active allowlist, collection, scheduler, workflow, archive or infrastructure edits. All **698 pre-existing tracked files** were checked unchanged after restoring the build-generated `next-env.d.ts`.

| Check | Actual local result |
| --- | --- |
| `npm ci --cache /tmp/scout89-npm-cache` | Passed, 336 packages; initial default-cache invocation failed because `/home/agent/.npm/_cacache` was unavailable. No dependency or lockfile change. |
| `bash experiments/consumer-mvp/evidence/test.sh` | Passed: pinned source and typed JSON reproduction, **29 node:test cases**, zero failures/skips. |
| `npm test` | Passed: **488 app/security/archive Node tests + 106 Python tests + 18 scheduler adapter Node tests**. Existing infrastructure tests use mocks/local harnesses; no live auth/dispatch or provider crawl was run. |
| `npx --no-install tsc --noEmit` | Passed; repeated after build/generated-file cleanup. |
| `npm run lint` | Passed. A test-only local variable violating Next's `no-assign-module-variable` rule was renamed before the successful final run. |
| `npm run build` | Passed; production routes unchanged. |
| `npm run archive:dry-run` | Passed in disposable local checkout. |
| `bash scripts/archive-tool.sh check origin/main` | Passed, append-only/reproduction. |
| `git diff --exit-code HEAD` before staging new experiment files | Passed: baseline tracked bytes unchanged. |
| Runtime portability | Focused suite executes compiled entrypoint in an isolated JavaScript context without Node, DOM, network, process or wallet globals; the import graph remains inside this directory. |
| Financial/publication boundary | JSON projection/fixture tests find no raw body, headers, source financial counters or error contents; every financial quantity remains null. No permission/approval flag can release them. |

Focused failure cases include invalid original mint strings; valid unknowns; a genuine duplicate SI ticker; quote mint mistaken for base; wrong token/pool/quote/units/mode; false pair filtering; 429/503/error/malformed JSON; missing/null/simulated-zero counters; missing rights; source hash/length/transport corruption; provider/fetch clock reversal, stale/invalid calendar clocks and exact microsecond freshness boundaries; missing/duplicate bundled records; sampling bias; immutable results and serialization leakage. All verified-fact citations resolve to retained receipts with original clocks and hashes.

The source audit is limited to the existing retained document. It establishes dated provider identity consistency, not current source health, on-chain mint authority, settlement, legal entitlements, economic epoch continuity or independent issuer verification. Source-rights/commercial-publication review remains unresolved; financial figures are withheld. No human comprehension/browser result from Agent A is claimed here. See [README](README.md) for Day 2/3 acceptance and rollback.

No screenshots are attached: this PR changes only the evidence engine. Agent A owns isolated consumer UI and browser/mobile testing in #88. Its integration must use actual stale outputs and preserve the distinction between provider configuration, provider lifetime reports, covered flow and holder returns.
