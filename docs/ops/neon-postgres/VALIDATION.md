# PR #118 validation — 20 October 2026

**Native hosted Vercel → Neon remains NOT RUN / UNPROVEN. Helius NOT RUN.** All PostgreSQL credentials/certificates and API/control-plane attack fixtures used by tests are synthetic/local. No new deployment, Function request, hosted SQL, credential-value endpoint, Helius traffic or activation was performed during this revision.

Preserved the existing `ops/review-scout-neon-smoke` branch and reviewed `edcc3602e5c64cba15f013dbefccbab91420010a` history. Inspected and merged latest main `7caf7e55759afe2620c2101988c6649c53d07ef8`, including CARDS #120; fetch immediately before publication still matched. No uncommitted work was overwritten. CARDS/app/lib/data/collector/scheduler files match main. Source revision and the new immutable artifact digests are reported in PR #118/CI, not self-referentially embedded here.

## Actual local results

Runtime: Node **24.19.0**, npm **11.9.0**, PostgreSQL **17.11**, pinned pg **8.23.1**, Next **15.5.28**.

| Check | Observed result |
| --- | --- |
| `npm ci --cache /tmp/scout118-oct20-npm-cache` | PASS, no manifest/lock changes |
| `SCOUT_TEST_PG_BIN=/workspace/scout111-tools/extracted/usr/lib/postgresql/17/bin npm test` | **1,002 passed**: 896 Node + 106 Python; zero failures/skips in final complete run |
| Focused smoke/artifact/isolation | **70 passed** in the full suite: 36 mock/expiry/assertion cases, 12 handler/package cases, 12 alias/ZIP/isolation cases, 10 real local PG/TLS cases. ZIP traversal, duplicates, symlinks, armed manifest, runtime change, hidden trailer, lock mismatch, source mismatch and corruption rejected. |
| Real local PostgreSQL/TLS | PASS with actual native pg authentication over loopback; bad CA/SNI/password/plaintext/outage fail. Known local SCRAM configuration **does not prove** negotiated Neon SCRAM/PLUS. Existing production store/native HTTPS tests also pass. |
| No mutation | PASS: exact 19 assertions unchanged; fixed metadata-only SQL, no step call/admission import/Helius path. Nonzero local counters/slot/lease/client/cache rows remain byte-equivalent; local synthetic canary INSERT rejected SQLSTATE 25006. No hosted writes were attempted. |
| Typecheck / lint | PASS `./node_modules/.bin/tsc --noEmit`, `npm run lint` |
| Production build | PASS `NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build`; provider HTTP egress blocked, no env pull. Generated `next-env.d.ts` restored. |
| Archive integrity | PASS `bash scripts/archive-tool.sh check origin/main`, append-only + original edition reproduction |
| Archive publication dry-run | **REFUSED, exit 1: `retention_boundary`**. Only reviewed original date is 2026-10-11; its 8-day generation window expired on 20 October at 03:00 UTC. This is not a passing dry-run or publication authorization. No clock override, retention-policy change, new edition or source data edit was used to hide the refusal. |
| Browser / OG | **81 passed** at 320/390/1280 using existing lockfile-installed browser harness and `bash tests/security114/run-browser.sh`; local Next production consumer, exact sharing/deep links, disabled/error/expiry responses, keyboard, six 65px terminal rows and real 1200×630 OG PNGs. HTTP provider egress blocked. No physical-device, hosted service or current-mint claim. Temporary screenshots/test images stayed outside existing proofs and were cleaned. |
| Dependency audit | `npm audit --omit=dev --json`: **0 production vulnerabilities** of every severity; no dependency changes. Existing development-tool disposition remains in [Issue #114](../../security/issue114/development-risks.md). |
| Offline artifact | New default-OFF output, deterministic inner ZIP and independent source/inventory/ZIP validation executed from the committed clean revision; actual digests/counts are in the PR/CI. Tests separately verify deterministic bytes. No arming/deploy command is included in CI. |
| Scope / secret review | `git diff --check`, explicit changed-file review and credential-pattern scan. No credential/env/key/generated artifact or CARDS file is staged. Activation constants unchanged: RPC false, LIVE_APPROVAL disabled, pins null. Only the existing **offline artifact review** workflow is changed; no collector/scheduler workflow. |

The first complete regression attempt stopped at the archive **unit fixture** using a real current Git timestamp/evaluation clock against a fixed 11 October synthetic day. Its temporary Git commit and evaluation clocks are now pinned to the fixture's existing `ready` date. No archive implementation, retention rule or genuine archived evidence changed. The later complete run above passed. This unit-fixture correction is distinct from the genuine publication dry-run's intentional expired-window refusal.

Detailed local logs are `/tmp/scout118-oct20-*.log` while this workspace persists. They are not hosted evidence or raw production logs. Browser outputs are disposable local QA artifacts; no Agent A CARDS file was changed.

## CI evidence

Inspected original reviewed-head runs [39276981123](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/39276981123) (offline artifact) and [39276981116](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/39276981116) (SCOUT build), including actual job/step states: both **completed / success**. These runs tested `edcc360`, not this new revision. Updated-head runs and their actual outcomes must be checked after push and are reported separately in the draft description; do not reuse old green results as revised-head evidence.

The offline workflow checks out the exact PR head, installs locked dependencies without lifecycle scripts, runs 60 focused tests, builds the OFF artifact and verifies the deterministic inner ZIP. It has only contents-read permission, no workflow-dispatch trigger, hosting/DB/provider credentials or deployment step, and retains the sanitized review ZIP/summary for one day. The outer GitHub Actions download ZIP is different from the deterministic inner ZIP whose hash is reviewed.

## Security disposition / stop

The founder-reported skip-domain alias incident supersedes the former staging recommendation. Read-only Vercel metadata confirms four restored production aliases agree, while no custom environment is available (`accountLimit.total=0`). Neither metadata configuration nor an offline snapshot digest proves a future exact URL's effective protection or prevents transient alias promotion. [Execution decision, exact commands, mobile checklist and recovery](PRODUCTION-EXECUTION.md) document the unresolved platform/credential-scope gate. Do not repeat production-target staging or substitute an unreviewed API flag.

Probe success would prove only one authenticated native metadata connection with the enumerated TLS/permissions/read-only/rollback checks from an independently identified runtime. SCRAM mechanism, provider internal TLS topology, policy/function-body integrity, future availability and production acquisition permission remain outside its proof. Warm-instance single-use is not a durable distributed latch. Read the [security audit](SMOKE-REVIEW.md).

The [next one-call Helius workflow](HELIUS-CAPTURE.md) requires separately reviewed code/artifact, protected execution path, account quota/rights review, private immutable raw sink, exact mint/timing/hash and new one-POST approval. No Neon success, configured credential or earlier staging approval implies Helius permission.

Keep #118 **DRAFT**. Branch-local `vercel.json` still suppresses automatic draft-branch deployment; it does not prevent manual deploys and must be removed before a future merge-ready revision. No merge/deployment now. Local rollback is reverting the review branch changes/closing the draft; prior temporary hosted deployment was already removed by the founder. Any future live cleanup must use the exact disposable ID, zero-production-alias precheck and fresh full mapping comparison; do not reset admission, revoke credentials or undo existing Neon setup.
