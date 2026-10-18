# Issue #99 validation — October 18, 2026

Base `c3cbbeb9e7183ded8181f7083ebb57851398972f` is latest fetched main after both #96 and #97 merges; their merge commits were checked as ancestors. Branch `feat/99-permissioned-freshness`. Node 24.19.0, npm 11.9.0. Owner actions/email/protocol are in this directory; code/tests stay in the evidence directory. No changes to app/UI/model, APIs/lib, data/research catalogs, collector, scheduler, workflows, deployment, infrastructure or credentials.

| Actual local check | Result |
| --- | --- |
| `npm ci --cache /tmp/scout99-npm-cache` | Passed, 336 packages; no dependency/lockfile changes. |
| `bash experiments/consumer-mvp/evidence/test.sh` | Passed: pinned original/candidate source reproduction, 29 original +31 expansion +**24 new pilot** tests. |
| Final `npm test` | Passed: **501 app/consumer/security/archive Node +29 original evidence +31 expansion +24 pilot +18 adapter Node =603 Node; 106 Python**. Zero failures/skips. Existing operational tests use mocks/local harnesses, not live auth or dispatch. |
| `npx --no-install tsc --noEmit` | Passed, including after build-generated-file cleanup. Evidence types also compile with ES2020/no Node or DOM libraries. The new protocol is a separate offline Node tool using only standard crypto/module/path support. |
| `npm run lint` | Passed after final policy/replay hardening. |
| `npm run build` | Passed; generated `next-env.d.ts` restored. New protocol is not imported into production. |
| `npm run archive:dry-run` | Passed in disposable local checkout. |
| `bash scripts/archive-tool.sh check origin/main` | Passed, append-only/reproduction. |
| Scope/default proof | Original engine entrypoint/identities/contract/receipts/guards/retained data/preview JSON byte-identical. Exactly three dated defaults remain. Only pre-existing edit: one line in the evidence test script to run the new suite. |

The full suite was repeated after fixing two review findings: narrower pending permission scope must cancel an older broader lease; duplicate completed-proof replay must clear metadata cache. New tests cover both. All original source dates/hashes remain untouched; genuine retained SI metadata is used for stale rejection. Positive policy/acquisition responses are explicitly synthetic fixtures, not new permission, origin evidence or retimed original records.

No provider/terms/site/API/RPC requests, credentials, keys, paid services, wallets, provider outreach, merge, deployment or activation were performed. No browser/device/live permission/current-source proof is claimed. The new tool has no HTTP or persistence capability; every result remains disabled, rights unverified, source unattested, public explanation null, and financial/holder-return quantities null. A passing fixture is not launch readiness or genuine live verification. See [owner actions](OWNER_ACTIONS.md) for the separate approval/execution gates and rollback.
