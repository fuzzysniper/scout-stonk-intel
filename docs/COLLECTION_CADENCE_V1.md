# Collection cadence V1 — dated evidence and inactive cutover

[Issue #80](https://github.com/fuzzysniper/scout-stonk-intel/issues/80). Base main `3de63c4f3e865bf79f90279aaee18d691b7e0775`, including merged #79/#77/#75. **NO-GO for activation.** This PR adds an explicitly invoked offline diagnostic and security regressions, not an hourly producer. No collection, dispatch, schedule/permission change, real App/Cloudflare credential use, deployment or 48-hour proving run occurs.

Evaluation cutoff: **2026-10-16T20:21:09Z (15:21:09 CDT)**. Later retrieval of already-completed run/commit evidence is recorded separately; it does not move that cutoff. UTC is used for canonical minute-17 buckets. Human-local times below are America/Chicago (CDT at this date). Do not copy local clock labels into slot keys.

## Findings: fresh manual success, sparse native starts

[Recorded input](evidence/collection-cadence-input-2026-10-16.json) contains normalized public run/job/commit metadata, API paths, original response hashes/capture times, owner-reported controls and a bounded request ledger. [Reproducible report](evidence/collection-cadence-report-2026-10-16.json) contains metadata only—no reward-counter amounts or new historical financial publication. GitHub input is trusted capture evidence, not a signed provider attestation.

The complete listing has **22 collector runs since introduction: 19 scheduled, 3 workflow-dispatch**, all attempt 1/completed/success in this capture. All **11 runs within the 48-hour audit window** have matching collection/persistence steps, original summaries, exact dataset hashes, new allowlisted observations, one-parent append-only changes and commits reachable from audited main. Each collected **7/7**, with **0 reported provider failures/skips**. Job-start delays are **2–4 seconds**, not multi-hour queues. This bounded sample supports sparse run creation as the primary observed cadence problem; it does not prove which internal GitHub schedules were delayed/dropped or establish provider health outside executed reads.

| Trailing window | Nominal minute-17 opportunities | Past 15m grace | Scheduled runs / creation buckets | Mature buckets without scheduled creation | Workflow-dispatch runs | Confirmed data runs / new points per token | Mature buckets with verified observations per token |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 24h | 24 | 23 | 5 / 5 | 18 | 1 | 6 / 6 | 6/23 |
| 48h | 48 | 47 | 10 / 10 | 37 | 1 | 11 / 11 | 11/47 |

The current 20:17 UTC opportunity is still inside grace, not a mature missing opportunity. These are **creation-time attribution buckets**, not authenticated intended-slot counts or proof that 18/37 jobs were dropped. A scheduled run created before `:17` maps to the preceding minute-17 bucket; e.g. 07:13:59 UTC maps to 06:17, not an invented early execution of 07:17. Workflow-dispatch counts do not authenticate human versus external origin or supplied slot inputs; those need separate run/gate receipts. The identified owner manual run can add a real observation bucket but cannot repair the native creation denominator or fill past hours. Unknown/incomplete listings withhold absence counts.

### Traceable run → observation → commit evidence

All dates are October 2026. Observation times name actual response captures, **not payout timestamps**. Each source had seven newly appended records; exact per-mint seconds and source-generation times are in the report.

| Run ID | Created UTC | Created CDT | Capture UTC | Persisted main commit |
| --- | --- | --- | --- | --- |
| [38960299506](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38960299506), manual | 16 20:10:25 | 16 15:10:25 | 20:10:38–39 | `71ec7be302f1989bdfa9d897cb2aebf545cfa68c` |
| [38939828142](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38939828142) | 16 17:27:31 | 16 12:27:31 | 17:27:41–42 | `3273cd4781e09066b76a8460bd37ca2156ae94f4` |
| [38900992912](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38900992912) | 16 12:30:28 | 16 07:30:28 | 12:30:42 | `1ef29321872921ebdea2559fe3e531d4bc590de0` |
| [38865905362](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38865905362) | 16 07:13:59 | 16 02:13:59 | 07:14:11–12 | `7d65f2fbb1e43d7e1e9d53372c429ac7480716a8` |
| [38834935934](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38834935934) | 16 01:24:22 | 15 20:24:22 | 01:24:32–33 | `e9a76ae2c106d3c4dfc506f9932e74b5cb811b6c` |
| [38816699691](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38816699691) | 15 22:22:51 | 15 17:22:51 | 22:23:05–06 | `98fbb0e8cbf8e0585d4248f011f87f80f9ac65f9` |
| [38784730633](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38784730633) | 15 18:19:59 | 15 13:19:59 | 18:20:09–10 | `f84d304beeabdb33e7459344491230969c2d3e12` |
| [38742987897](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38742987897) | 15 13:28:28 | 15 08:28:28 | 13:28:39–40 | `94788becb98cee161faee4ae7af1729eaecd2bbe` |
| [38699118287](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38699118287) | 15 07:29:41 | 15 02:29:41 | 07:29:51 | `c6926408ec0e831ba15f2f19cc8c568e2e78a624` |
| [38666358430](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38666358430) | 15 01:34:09 | 14 20:34:09 | 01:34:16 | `93b1769e56b296c13f9f4d78a8971b5259a1df79` |
| [38653023256](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38653023256) | 14 23:16:10 | 14 18:16:10 | 23:16:18–19 | `49ab560dde396d302f62dd21c7897379cccec75d` |

The manual run's collection step was 20:10:36–39 UTC and persistence step 20:10:39–40. Its claim gate was **skipped**, as expected for an ordinary user while the integration is off. Dataset SHA-256 at its commit and audited main: `df8259125f0ca57f03de095d7db54cadee536c94be5a9c8a4471e5df57faa639`. A separate public raw-main read at **20:22:50 UTC / 15:22:50 CDT** returned HTTP 200 with the same hash (75,291 bytes); it proves this GitHub-served capture, not the product API's cache or current hosting propagation.

### Actual coverage and source clocks

The pinned dataset contains **149 genuine observations**: KNOTS 23, each other tracked token 21. Every token has six points in 24h and eleven in 48h. Maximum **between-point** gaps in those windows are respectively **20,979s (5h49m39s)** and **21,528–21,529s (5h58m48–49s)**. Window-edge gaps are exposed separately; a small interior gap cannot conceal missing beginning/end coverage. Fresh latest points do not repair these holes.

Latest captures are 20:10:38–39 UTC, **630–631s old** at the evaluation cutoff. Latest v1 provider generation is 20:10:07.090–20:10:39.264 UTC. Capture-minus-generation lags are **−0.814 to +30.910s**; sub-second negative values reflect the collector storing capture time to whole seconds and remain within its existing 60s tolerance. No timestamp is rewritten. These clocks show the accepted v1 reads, not independent payout time, raw onchain confirmation or v2 cache freshness.

The existing collector allows provider generation age up to 3h. [Data Health V2](DATA_HEALTH_V2.md) separately documented dated v2 Age 370–371 failures against a strict 300s transport gate. No new StonkFun/v2 request was made here; current v2 health is **not measured**. Do not transplant the v1 generation clock into v2 evidence, relax freshness/precision/gap/identity checks or label all stored observations eligible interval flow. Scheduling cannot resolve absent exact common boundaries, different counter bases, precision or reconciliation cutoffs.

## What the offline improvement verifies

`scripts/collection_cadence.py` is not imported by a workflow/UI/provider client. It reads a ≤1MiB recorded bundle and fixed paths from pinned **local** Git objects (≤2MiB/blob, ≤16MiB aggregate). No Git fetch/push, network or credential variables: child Git receives a minimal environment with lazy fetch disabled, no replacement objects, no global/system credential profile and no prompts. Missing shallow-clone objects return a fixed unavailable result/exit 2; there is no automatic network recovery. Normal output is status/timing/hash metadata only, never reward amounts or exception bodies.

Counting persistence requires matching workflow/branch/run/attempt/job identity; actual collection/persist steps and times; unique matching summary `runId`/event; exact expected snapshot hash; committed-at inside the persist step; main ancestry/parent match; one genuinely new, source/quote/mode/time/counter-valid record per collected result; and the entire before/after dataset following existing append/193-point retention semantics. A base differing from a run's declared head is exposed, not silently promoted to authenticated gate success. Existing summaries lack attempt identity, so rerun attempts are withheld rather than borrowing the first attempt's summary.

Green-but-skipped collection, stale/reused artifacts, hash mismatch, unconfirmed push, foreign jobs, duplicated/truncated listings, partial provider results and missing Git evidence remain distinct. Failed/unknown persistence never becomes zero observed failure. Verified collection-failure totals are lower bounds unless per-window proof completeness is true; sanitized reason counts distinguish source, storage/order and unknown errors rather than calling every failed token a provider outage. Input is normalized captured evidence; its response hashes are documentary receipts, not a cryptographic signature from GitHub. The tool is operational diagnosis, not another coverage/financial calculation or a 48-slot pilot reconciler.

Reproduce in a checkout containing the pinned commits/parents:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/collection_cadence.py \
  docs/evidence/collection-cadence-input-2026-10-16.json > /tmp/scout-cadence.json
python3 -c "import json; assert json.load(open('/tmp/scout-cadence.json')) == json.load(open('docs/evidence/collection-cadence-report-2026-10-16.json'))"
```

No historical source values are copied into the input bundle. Reproduction uses original Git objects. If a shallow checkout lacks them, stop and separately authorize a bounded fetch of the listed commit/parent IDs; do not auto-unshallow or invent substitute bytes. A future audit needs a newly captured, bounded bundle and explicit cutoff, never an updated date on this capture. The capture used 21 GitHub REST reads plus one raw-GitHub dataset read under the recorded ceiling, zero provider reads and zero retries; PR/CI/issue/fetch operations are separate.

## Scheduler and publication constraints

- **Native cron:** `17 * * * *` remains unchanged. GitHub scheduled events are [best effort and can delay/drop](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule); moving to another minute, adding crons or dispatching catch-up runs is neither a verified fix nor authorized. Actual start evidence cannot reveal missing internal events. Late runs would be rejected by the enabled gate's 15m window; 07:13 creation is not a valid 06:17 external slot merely because attribution uses that bucket.
- **Concurrency:** collector and daily audit share `reward-snapshots`, `cancel-in-progress:false`. GitHub retains at most one pending run in a group; this is not a durable FIFO. Here the 2–4s queue times and audit API created-to-updated ranges (Oct16 12:44:45–12:45:02 UTC; Oct15 12:51:55–12:52:13) do not overlap audited collector execution. No observed queue/cancellation cause for these missing hours is established. Keep shared serialization; don't solve missed starts by allowing two ungated producers.
- **Publication:** ordinary non-force `git push origin HEAD:main` stops on a conflict, and current tests prove a real two-clone rejection. Data/control commits and feature merges can race despite workflow concurrency. Claim CAS confirms exact accepted push, parent/bytes/remote head **before** collection; lost/ambiguous acceptance consumes the slot and stops. Do not rebase/recollect after an uncertain claim or force-push observations. A legitimate main advance before claim causes a fail-closed no-op; the next fresh slot may proceed.
- **Artifacts:** always-uploaded diagnostic files may be the previous checkout's summary if collection was skipped/failed before writing. Seven-day retention is not indefinite evidence or main persistence. Gate artifacts and original step states must be correlated to run/attempt. Existing summary has no attempt field; this diagnostic refuses reruns. No workflow/artifact behavior was changed.
- **Permissions:** active collector declares Contents write but no Actions read. Authenticated gate GETs need an actual job-token proof; today's skipped gate does not establish those rights. The existing [unapplied Actions-read patch](proposals/68-collector-actions-read.patch) remains a separate human-reviewed permission change. #77's isolated workflow proof expressly does **not** prove this collector job's token. No observed 403 cause is asserted here.
- **Hosting:** GITHUB_TOKEN pushes suppress recursive Actions workflow triggers; that does not suppress third-party hosting. Vercel statuses report success for manual data commit `71ec7be…` at **20:11:40 UTC** and native data commit `3273cd4…` at **17:28:39 UTC** on Oct16. This is evidence of existing hosting side effects, not a price/environment/SLA proof. Owner must inspect hosting plan, data/control-only build policy, latest successful reference and usage before a 24-write/day pilot; no hosting settings/filter are changed.

Normal pilot workload would be 24 winning slots/day × seven allowlisted token fetches = **168 primary collection attempts/day**, plus existing readers, GitHub authentication/dispatch and Git operations. A confirmed Git claim plus a data commit can produce **two main pushes per winning slot (48/day)**, with hosting side effects unless separately reviewed policy avoids them. Failure paths and other account use add load. This is a planning model, not new request/spend authorization or a guarantee of exact network counts.

## Shortest safe cadence path — recommendation, not activation

| Choice | Why / remaining evidence |
| --- | --- |
| **Keep native only, now** | No new privileges/producer. Manual 7/7 establishes one successful collection/persistence path, not hourly service. Keep truthful sparse-history states; do not claim reliability or add synthetic observations |
| **Existing Cloudflare Worker + SQLite SLOTS, preferred future pilot** | Most preparation already exists; use the SCOUT-only App and shared Git claim, not a new provider crawler. Still NO-GO: #77 hosted-auth proof, actual collector-token proof, per-component CPU/account quotas, private receipt export/recovery, cost/hosting policy and explicit cutover approvals remain required |
| **Design-vetted fallback: timer on an already trusted, always-on owner host** | A repository-limited App plus durable SQLite attempt journal can avoid a 10ms Worker CPU ceiling while sharing the same Git gate. It requires a separately reviewed host/service/secret-storage/update/uptime/recovery design and operating-cost evidence; no account, host, timer, key transfer or code is provisioned here. Operational reliability is not proven. Do not run it alongside an ungated native/external producer |

Cloudflare Free feasibility is conditional: the dated runbooks describe **10ms Worker Cron CPU** and a separate DO CPU budget; RSA signing, SQL, cold starts and retry paths need measured **per-component CPU**, not aggregate wall time or the older local benchmark. Account-wide request/SQL/storage/Workflow retention quotas also matter. #77's auth-only private Workflow adds independent limits and consumed-state evidence, not scheduling approval. Check current official limits/prices at owner setup. Paid's $5 minimum is not a guaranteed $5 cap or permission to spend; preserve the existing ≤$5/month engineering target, remain Free or stop for an explicit budget decision. Do not provision an external cron service or place App keys in generic webhooks.

Security invariants: preserve owner-reported App actor **342326617**, absent collection-enable variable, encrypted existing secret/binding, `SLOTS` class/namespace identity, no public routes/Cron/workers.dev/preview URLs and `ACTIVATION=disabled`. Repository-variable inspection was unavailable to this session; the input labels these as **owner-reported**, not agent-verified live controls. Do not reread, print, generate or rotate the private key. Tests evaluate the actual workflow condition and Python disabled gate with this exact actor and blank inputs; it cannot masquerade as a normal ungated manual collector.

## Owner checklist: phone versus trusted Windows PC

Every future change below requires its own explicit approval; this PR performs none of them. No deployment/dispatch/activation command is provided as part of this diagnostic.

1. **Phone: evidence/review only.** Inspect run 38960299506, its 7/7 summary, main commit/hash, this PR, actual repo variable state and warnings. Preserve the known actor value. Confirm absent versus denied gate inspection; unknown is NO-GO. Review ownership/Free/billing/hosting policy and assign an operator. Phone review is not a safe place for a PEM file, CLI authentication, Workflow arming, secret upload or incident recovery. Do not dispatch “missing” historical slots.
2. **Trusted Windows PC: offline reproduction.** Use a clean reviewed checkout and existing Python/Git; preserve local changes. Run the command below. Missing objects stop; a separately approved read-only bounded fetch may obtain exact listed commits. Use Linux CI/WSL for root Bash tests with separate native dependencies; Node24+ is required for the existing C2 packager/tests. No `.dev.vars`, profile export or new credential is needed for offline work.
3. **Owner read-only state inspection, separately authorized.** Verify the entire SCOUT-only App installation/grants, bot identity 342326617, actual gate absent, no active/pending collector run, existing Cloudflare account/Worker version, disabled activation, no triggers/routes and unchanged SLOTS/secret identities. Actual values trump defaults; owner-reported C1 passed and was revoked, so do not repeat C1 or request its key.
4. **#77 C2 stages, separately approved and operated.** Apply only reviewed unarmed resources/config if authorized; then separately approve a single hosted-auth window/instance and read-scoped token issuance/revocation. Retain the permanent consumed reservation/receipt and reconcile uncertain token state; never recreate state to retry. Isolated C2-W proof remains distinct from current collector-job identity proof. Successful C2 still grants no dispatch/collection authority.
5. **Actual collector-job token and guard proof, separate implementation/permission approval.** Review the existing Actions-read proposal and a narrowly scoped auth-only proof using the actual collector job/context/token, with collection and persistence suppressed during proof. This wiring is **not implemented or applied** here. A separate workflow/job token cannot stand in for it. Require authenticated exact workflow/run/repository/head/attempt/actor reads before any Git claim; preserve actor-denial behavior. Any denied/unknown read is NO-GO, not fallback to legacy collection.
6. **Receipt/recovery and hosting gates.** Establish a private owner-only export of DO slot/attempt records, Git claim receipt, run/attempt/job state, provider outcomes and remote/served hashes. No public admin route, secret export or SQLite reset. Demonstrate receipt recovery under restart and the reviewed handling of paused/uncertain circuits. Resolve Free CPU/account quotas and Vercel side effects before repeated writes. These are remaining engineering/owner gates, not completed services.
7. **Quiescent cutover, separate future approval.** Wait until native/manual jobs and prior uncertain dispatches/claims are reconciled. All native/manual/external producers must use the same enabled authenticated CAS gate **before** external scheduling can be authorized. Keep the external Worker disabled while proving gate behavior; then only an explicit hourly-pilot decision can authorize its schedule/activation. Do not change the current native schedule here. Manual runs outside the same 15m canonical window will be rejected under the gate; do not use reruns or blank-input App runs as bypasses.

Safe offline Windows reproduction, not activation:

```powershell
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Projects\scout-stonk-intel'  # existing clean reviewed checkout
$scoutCadence = python scripts/collection_cadence.py docs/evidence/collection-cadence-input-2026-10-16.json
if ($LASTEXITCODE -ne 0) { throw 'Evidence unavailable/invalid; do not infer zero or fetch automatically' }
$scoutCadence | Set-Content -Encoding utf8 (Join-Path $env:TEMP 'scout-cadence.json')
# Review timing/status/hash metadata. No real key, token, login or provider call.
```

## Proposed 48-consecutive-slot evidence plan — unexecuted

Owner chooses `[T0,T0+48h)` minute-17 UTC slots **after** every gate above, with an operator and independent +6/+12/+24/+36/+48h inspection. Export receipts from the beginning (Actions artifacts seven days; C2 Workflow Free retention may be shorter). For each of **all 48** retain intended slot, trigger/attempt/receipt identity, authenticated actor/run/head, accepted CAS/parent/hash, collection start/end, seven token outcomes and actual/provider clocks, Git push result, reachable data commit and served revision. Keep missing/denied/uncertain/failed slots in the denominator. Native creation-time attribution does not become intended-slot proof.

Proposed **data** acceptance for this issue: **48/48 slots with seven genuine new persisted observations**, zero duplicate provider collections across all producers, no unresolved dispatch/claim/publication uncertainty, original timestamps and unchanged existing freshness/coverage math. This is stricter than the earlier readiness report's ≥47/48 dispatch-within-15m floor; keep dispatch delivery and data persistence as separate measurements. Any failure records a failed/withheld outcome, pauses/reviews as appropriate and cannot be backfilled or erased to claim 48/48. Successful failure containment is a security result, not a successful data slot. A fresh separately approved proving period may start later; the old failure remains evidence.

Exercise duplicate native/manual/external delivery, explicit confirmed 429 retry bound, denied auth, provider timeout/partial failure, Git conflict, accepted-but-lost response, process restart and receipt recovery offline first (existing integration tests plus this diagnostic's new negative cases). Never create production failures/dispatches as an engineering test. Only known no-dispatch 429 permits the existing bounded retry; uncertain acceptance consumes the slot. A provider failure after confirmed claim never re-collects that slot. Stop on actor/scope drift, secret/permission/billing surprise, duplicates, missing evidence, unsafe clock/identity, quota/CPU failure or unresolved conflict.

Do not claim financial interval eligibility from the pilot: two complete consecutive periods may require 49 genuine boundaries, exact provider periods, compatible identities/counter bases and all existing precision/gap/reset gates. Hourly jobs cannot invent absent history or relax aligned-period rules. No ROI/APY, historical financial publication, catalog expansion or canonical-model changes belong to this work.

## Validation, limits and rollback

New regressions use genuine retained source rows inside explicitly synthetic operational envelopes and disposable Git; no invented positive source amounts enter application data. Cases include stale/wrong-run/reused summary, exact hash, skipped collection, rerun/foreign job, failed/uncertain publication, non-ancestor/non-append change, partial provider failure, incomplete/duplicate listing, minute-17/grace attribution, size/future input, fixed Git paths/no inherited credential environment and the exact App actor denial. Standard tests need no historical Git objects or real credentials; the explicit original-report replay uses local pinned history and fails closed when absent.

Executed checks (app Node20.20.2/npm11.9.0; staging Node24.19.0, unchanged locks):

| Command | Final result |
| --- | --- |
| Root `npm ci` | exit0, 336 packages |
| `npm test` | exit0, 484 application JS +75 Python +18 adapter tests; no failures/skips |
| Final Python discovery after diagnostic refinements | exit0, 75/75; includes 11 new cadence/security cases |
| `npx tsc --noEmit`, `npm run lint` | exit0, no diagnostics |
| `npm run build` | exit0, 10/10 static pages |
| Archive append-only/reproduction + `npm run archive:dry-run` | exit0; working archive unchanged |
| Scheduler `npm ci`, `npm test` | exit0, 40 packages, 29 Node tests (including C2's five-method Python proof suite) |
| Scheduler `npm run dry-run`, `npm run c2:dry-run` | exit0; inactive production bundle 14.77KiB/4.77KiB gzip; isolated/integration/sealed C2 bundles packaged offline only |
| Original report replay / protected-tree check | exact JSON equality; 671 of 672 existing files unchanged, only the existing workflow-condition test extended with actual actor ID |

The staging install initially hit an unwritable default home npm-cache path; using the existing workspace cache resolved it without a dependency/permission change. One concurrent root invocation was reported nonzero by command orchestration despite all assertion summaries passing; an isolated repeat explicitly recorded `npm` exit0 and all 577 tests passing. The nonzero report was not reproduced or attributed to a provider/production fault. Existing ESLint deprecation, Next edge/static, proxy/new-Wrangler and negative no-fetch-handler probe notices remain; no warning was bypassed by weakening checks.

UI/browser screenshots are inapplicable to this offline ops-only change. Current account configuration, C2 hosted/collector-token proof, private recovery/export, hosted Free CPU/cost and a real 48-slot trial remain unverified. Official scheduler/permission/limit references in the earlier runbooks are design evidence, not newly probed account state. No source/provider-wide request increase is made. Existing PR CI/hosting automation may run after a feature push; no hosting configuration or deployment command is executed here.

Rollback before activation: revert this offline script/tests/new report/runbook only; preserve observations, allowlist, actor variable, absent enable gate, existing secret/SLOTS and consumed C2 state. If a later approved pilot is stopped, owner must first disable external execution and reconcile all in-flight/unknown outcomes; do not remove the shared guard while an App/alternate producer can still enter, purge ledger rows, change namespace identity or replay a slot. Reverting code alone is not a safe live cutover rollback. Any later gate/schedule/permission/resource change requires its own reviewed plan. **Human review only; do not merge or activate.**
