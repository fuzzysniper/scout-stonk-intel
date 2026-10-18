# Issue #95 validation — October 17, 2026

Base: `f880e6606443a950b2907a6356df0f8636ceb7cf`, latest fetched main including merged #93. Branch `feat/95-evidence-expansion`. Node 24.19.0, npm 11.9.0. All changes are inside `experiments/consumer-mvp/evidence/`; the only pre-existing file changed is this directory's focused `test.sh` (two additional offline checks).

| Check | Local result |
| --- | --- |
| `npm ci --cache /tmp/scout95-npm-cache` | Passed, dependency/lockfile unchanged. |
| `bash experiments/consumer-mvp/evidence/test.sh` | Passed: original metadata/JSON preview reproduction, candidate document/hash/rights audit, 29 original + **31 new** evidence tests. |
| `npm test` | Passed: **498 app/consumer/security/archive Node + 29 original evidence Node + 31 expansion Node + 106 Python + 18 scheduler adapter Node**. Total 576 Node, 106 Python, zero failures. Existing infrastructure cases use local/mocked harnesses, not live authentication/dispatch. |
| `npx --no-install tsc --noEmit` | Passed; standalone evidence compiler also passes with ES2020 only and no Node/DOM type libraries. |
| `npm run lint` | Passed. |
| `npm run build` | Passed; generated `next-env.d.ts` restored to original bytes afterward. |
| `npm run archive:dry-run` | Passed in disposable checkout; no remote publication. |
| `bash scripts/archive-tool.sh check origin/main` | Passed, append-only/reproduction. |
| Scope / default support | All app/API/lib/data/research/collector/workflow/infrastructure files unchanged. Original `index.ts`, `catalog.ts`, `contract.ts`, `receipts.ts`, `retained.ts`, `guards.ts` and `preview.json` remain byte-identical. Default support is exactly three before/after both offline entry points. |
| Permission/provenance boundary | Two pinned source documents, seven unique selected source packets reused by three candidate records; original status/paths/bytes/hashes/clocks plus exact identity/quote/pool/mode/program/units verified offline. Source permissions remain unverified; no public candidate explanation, numbers or raw bodies. |

New tests cover inactive defaults without inspecting inputs; unknown/wrong-case/invalid/duplicate-symbol identities; canonical vs other STONK quotes; pool/mode/unit switches; absent sample membership; exact clock and microsecond age boundaries; old captures withheld; source/schema/epoch drift including nested epoch fields; duplicate JSON keys/depth/prototype safety; 429/503/timeout/errors; fixed paths and redirects; per-response UTF-8/body/request/deadline/sequence bounds; missing/null/simulated-zero quantities; no approval-flag bypass; immutable results; no hidden financial/source payload leakage; and disconnected production imports. Simulated fresh transcripts are explicitly test-only and never represented as retimed genuine captures. All permission/transcript results remain disabled/unpublished with zero requests.

Critical limits: offline transcript clocks and origin are supplied, not authenticated; this is not an actual HTTP timer/rate-control or current-source test. A passing transcript gives no chain settlement, rights, economic epoch continuity, holder entitlement or ROI evidence. No live provider adapter is shipped. Current terms, provider approval, new candidate enrollment and any live proof remain blocked for separate human review. The unsent permission draft is not consent.

No browser screenshots or device QA are claimed because this PR does not edit the consumer UI; Agent A owns #94. Original consumer model/render tests passed within the app suite. Rollback and the precise approval path are in [EXPANSION.md](EXPANSION.md).
