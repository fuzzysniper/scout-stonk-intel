# PR #118 validation — 19 October 2026

**Hosted Vercel → Neon: NOT RUN / UNPROVEN. Helius: NOT RUN.** All new test credentials, certificates and response fixtures are explicitly synthetic. Real PostgreSQL/TLS tests run only in a temporary local cluster, over loopback, with generated private test keys removed afterward. No physical iPhone or live-source result is claimed.

Base/main verified `6ea4d48ce013326826d68858eb3bc793200f26a2` (including #115/#116/#117). Recovered PR branch `ops/review-scout-neon-smoke` from existing head `898035c9df100d1cf81fc3372b2016bf23da7e38` into a clean separate worktree; no original modifications were lost or overwritten. Latest main fetch still matched the base; no consumer rebase/conflict was needed.

## Actual local results

Runtime: Node **24.19.0**, npm **11.9.0**, PostgreSQL **17.11**, pinned pg **8.23.1**, Next **15.5.28**. GitHub's existing workflow uses Node 20; see PR checks for that separate result.

| Check | Actual result |
| --- | --- |
| `npm ci --cache /tmp/scout118-npm-cache` | PASS; locked dependency install, no manifest/lock change |
| `SCOUT_TEST_PG_BIN=…/postgresql/17/bin npm test` | **964 passed**, zero failures/skips: 858 Node + 106 Python cases. Final complete rerun includes final 19-assertion probe. |
| New probe suites | **44 passed**: 34 synthetic mock/security cases + 10 real local PostgreSQL/TLS cases. Fixed SQL inventory, no early secret/network use, exact metadata fields, admin/grant options, effective PUBLIC/inherited rights, clock failures, uncertain rollback, teardown, driver errors, 5s/1s stalls. |
| Local state preservation | PASS with **nonzero counters/slot, existing lease, client and cache rows**; full before/after row equality, no reset/claim/cleanup. Local synthetic canary INSERT rejected with SQLSTATE 25006. |
| Native PostgreSQL/TLS | PASS; new actual probe handshake, certificate/SNI, known local SCRAM authentication, privileges and rollback; bad CA/SNI/password/plaintext/outage fail redacted. Existing five PG TLS and ten loopback HTTPS transport cases also pass. Not Neon SCRAM/PLUS proof. |
| `./node_modules/.bin/tsc --noEmit` | PASS, also after build; generated `next-env.d.ts` change restored |
| `npm run lint` | PASS, including final scripts/tests |
| `NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build` | PASS; real local production build, external provider HTTP egress blocked, no secret env pull |
| `bash scripts/archive-tool.sh check origin/main` | PASS, append-only/reproduction |
| `npm run archive:dry-run` | PASS, all 11 checks, zero findings; disposable checkout cleaned, no network/commits/archive changes |
| Existing locked browser install + `bash tests/security114/run-browser.sh` | **81 passed** at 320/390/1280 against local Next production and offline harness. Consumer/search/keyboard/deep links, disabled API, synthetic error/expiry states, six-row terminal, image security and actual 1200×630 OG images. Provider egress blocked; historical UI proofs unchanged. |
| `npm audit --omit=dev --json` | **0** info/low/moderate/high/critical production vulnerabilities; no dependency changes. Existing development-tool audit disposition remains in [Issue #114 docs](../../security/issue114/development-risks.md); this ops review does not remediate those tools. |
| Diff/scope/security review | PASS `git diff --check`; only ops script, focused tests/run hook, review docs and original branch-only Vercel preview suppression. No credentials/private keys/env files/artifacts staged; no app/API/lib/data/consumer/collector/scheduler/workflow/dependency edits. Both activation gates remain OFF, pins null. |

Local detailed command output was retained in temporary `/tmp/scout118-*.log` files during this review; these are not hosted evidence or committed artifacts. Browser screenshots/reports were written to a disposable `/tmp/scout114-browser.*` QA directory, not over Agent A's files. Ephemeral benign test images were cleaned from `public/`.

## Actual original CI inspection

Fetched original-head [run 39262306439](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/39262306439) and job `118092852403`: **completed / success**. Install, append-only archive, history regression tests, lint, typecheck and build steps all completed successfully. This is the original head's CI, not a claim that revisions were tested by that old run. Updated-head CI is reported separately in PR #118's description/Checks after pushing this revision. Neither CI run has production credentials or proves hosted connectivity.

## Security review outcome and remaining gates

Nineteen exact assertions replace the permissive fourteen-field mock proof. Failures never expose raw exceptions/SQL/URLs; bounded rollback/close must acknowledge before PASS. The executable uses one native client and fixed read-only catalog SQL, not app store/admission/provider code. Tests include actual local permission and TLS failures as well as inert-import and credential-redaction checks. Human review remains required; passing tests do not remove [proof limits](SMOKE-REVIEW.md).

No production execution mechanism was created: the [protected minimal staged-runtime specification](PRODUCTION-EXECUTION.md) still needs exact artifact review, effective protection verification and explicit owner approval before staging/invocation. It incurs a temporary real production deployment/connection/compute and offers procedural single-invocation control, not a durable global exactly-once latch. The [Helius plan](HELIUS-CAPTURE.md) needs an entirely separate approval, quota/rights check and private immutable raw-response sink. No credential configuration is treated as traffic permission.

Rollback before any execution: close the draft; no hosted change exists to undo. A future authorized disposable deployment must be deleted by its exact deployment ID, with unchanged production domain targets verified. Do not reset admission state, rerun bootstrap, rotate existing credentials, change billing or activate RPC as cleanup. The temporary branch-only `vercel.json` must be removed from a future merge-ready revision; this PR remains draft/review-only.
