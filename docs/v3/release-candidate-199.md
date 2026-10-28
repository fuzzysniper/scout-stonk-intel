# Source-disabled V3 release candidate

Issue #199 · 2026-10-28 · **DRAFT / product GO remains HOLD**.
No production release, provider acquisition or journal persistence is authorized.

## Dependent Issue #204 correction — 2026-10-28

This separate draft fix starts at exact PR #200 head
`8d990bccef331cad94ddf22af55123605f1dd576` and targets only
`integration/199-source-disabled-v3`. It does not update that branch or main.
Verified new main is `80d356854fdfd2db7246c50e23e1a3cd0a277f2d`:

| Retained commit | Exact change |
| --- | --- |
| `5f0c9603392754fc1a5ae930d284b50fd9d5b5f0` | Hourly summary + reward snapshots |
| `80d356854fdfd2db7246c50e23e1a3cd0a277f2d` | Daily `data/collector-audit.json` only |

Original PR #200 rejects the actual daily commit as
`collector_only_paths_required`; a normal merge preserving latest main's daily
file also fails the old two-file code/data classifier. The correction adds a
**distinct authenticated daily audit transition**, rather than a `data/**`
exception. The original91 cases, entire hourly verifier function and Python
append/ZIP guard, original source manifest and C/B guard files remain byte-identical.

| Contract | Hourly | Daily |
| --- | --- | --- |
| Allowed changed files | Exactly the existing two-file subset | Exactly `data/collector-audit.json`; no mixed update |
| Scheduled workflow / job | `reward-snapshots.yml` / `collect` | `data-health.yml` / `audit` |
| Required successful steps | Existing collection/persist/evidence semantics | Bounded read-only audit, Publish audit evidence, Preserve audit evidence |
| Artifact | `collector-evidence-<run>-<attempt>`, exact two regular entries | `data-health-audit-<run>-<attempt>`, exact one regular audit entry |
| Data semantics | Existing exact append +193-row retention | Whole operational snapshot replacement; old blobs stay in Git |

The audit document has no self run ID. The reader therefore requires a complete,
unambiguous **one-run** result filtered by the exact parent, main branch, schedule,
completed status and audit workflow, then independently re-reads that run and
binds its attempt/job/steps/artifact. Missing, truncated, multiple, changed-during-read
or manual candidates fail closed. It never guesses a run ID from the bot author,
commit message, clock or audit's reported collector run history. Both producers
retain their existing unchanged source/workflow bytes. Daily proof includes SHA-256s
for `data-health.yml`, `audit_collector.py`, `collect_rewards.py` and the exact
tracked-mint allowlist, derived from immutable baseline `9ed4061`.

Daily validation requires exact producer schema, UTC clocks inside the actual
run/publication/artifact interval, increasing `checkedAt`, regular file mode,
matching Git dataset commit/time/content revision, and configured seven-day
artifact lifetime. It rejects unknown/extra fields, duplicates/nonfinite JSON,
wrong source/quote-contract inputs, invalid ZIPs and stale replacement. The
producer captures a microsecond clock but serializes seconds: UTC cadence boundary
checks account only for that quantization, rather than inventing subsecond precision.
Unavailable/partial API facts, incomplete cadence, null counts/links and
`intendedSlotsKnown:false` retain their original meaning. Reported run counts may
fall with GitHub retention/deletion; they are not cumulative payout/admission
counters or proof of provider execution. Audit freshness is **not** reward-source
freshness, coverage, returns or collection success.

Hourly and daily updates share the original global **8 unseen transitions,
64 serial GitHub reads,5s hard timeout/read,0 retries and4MiB ZIP budget**. Daily
decoded JSON is additionally capped at256KiB. The exact previous successful
same-code main job remains the only non-baseline checkpoint. No alternate identity,
API, missing-evidence bypass, reset or source retry is permitted.

The first approved normal main merge must retain latest main's **three** data
files, including Git modes, and candidate non-data bytes. Proposal/local checks
still require the original baseline files; this branch neither copies current
main's data nor changes the original manifest's historical pins. Fresh-base and
future interleaved snapshots are accepted only after their independent main proofs.
All other protected paths and original A/B/C identities/modes/SHA-256s stay frozen.

Verification hooks now include scheduled completion of **SCOUT data health audit**
as well as **Collect reward snapshots**, because both use existing `GITHUB_TOKEN`
pushes. No schedule, dispatch, producer workflow or source permission is edited.
The dependent PR target also gets immutable-head root/native security, focused
and mobile jobs: prior `branches:[main]` filters would otherwise omit this draft
fix's checks. The old root workflow remains untouched; new root job runs only
for PRs into the integration branch, with no secrets or write permission.

**97 additional offline cases** cover the actual pure audit producer (mocked fetcher),
checked/unavailable/partial/incomplete states, source/dataset/attempt/job/artifact/
retention/clock substitutions, ambiguous pages, hourly/daily interleaving,
shared quotas, fresh main before normal merge, later audits, mode changes,
rollback, main-vs-PR runner evidence and categorical redaction. No financial
quantities are fabricated or new source observations acquired by these tests.
Original91 and all full root/native/mobile suites remain in the runner.

Read-only evidence: daily run `40706768191` and job `122880878171` report schedule,
parent `5f0c960`, and all three publication steps successful. Artifact
`12825030105` is unexpired,963 bytes, with reported ZIP digest
`f24de97098412a3c5a7da3b8f3adaaac3ddd0ab68ce2948ed791513e48f94a5d`.
Hourly run `40666617412` / job `122742618218` / artifact `12806680671` independently
match parent `9ed4061`. These are existing GitHub metadata reads, not a new run.
Independent delivery of the existing ZIP bytes was unavailable in this executor;
**no actual ZIP-content match or real post-merge guardian execution is claimed**.
The runtime protocol requires that byte/digest/Git match and fails closed if it
cannot obtain it. Synthetic ZIP tests are explicitly offline evidence.

Release sequence remains: independently review/approve this exact draft head;
only if separately authorized integrate into PR #200 with ancestry retained;
recheck its new exact head, newest main, root/focused/mobile and synthetic merge;
only then consider a separate normal-main-merge/normal-Git-release approval.
The old8d990bc root/test-merge checks against9ed4061 are stale for80d3568.
No squash/rebase/force-update, data rollback, old-canary retry or automatic clock
extension. Missing evidence, >8 unseen transitions or any unrelated main code
change means HOLD and a new reviewed profile, never rebaseline/reset.

Production remains **NO-GO** until the owner resolves the previously recorded
Vercel403/404 identity/protection/OFF/rollback checks and main's reported
`protected:false`/empty visible rulesets. A green offline compatibility fix is
not production authentication, provider rights or source activation. Source-disabled
private `/desk`, physical PLAN/VoiceOver acceptance and future journal/SEC/Helius
work remain independent. Rollback is a separately reviewed code-only revert on
latest main preserving all three current data files and every counter/STOP gate.

## Exact inputs and preservation

Release main: `9ed40610eb34c34b56996d55a768f2eac9b43cdd`.
Original source base: `ba4b2e494f768350ec285e26791b61a90c50220b`.
Main advanced during validation by one scheduled collector commit. Its summary
and reward snapshots were carried through unchanged by merging that exact commit;
the manifest separately pins those two original main blobs/modes/content hashes.
Proposal/PR guards still accept only that specific main snapshot, never a general
collector/data exception. Diff versus release main contains no data changes.
The separately checked post-merge policy below admits later scheduled updates
only with authenticated GitHub provenance and producer-compatible append checks.

| Source | Immutable head | Original paths |
| --- | --- | --- |
| C #196 | `a1e461b9248d72396f038b641c7bc79d81130e7d` | 95 |
| A #197 | `4da9c8f39d815f2a8ee80283efbcfa808e09e352` | 4 |
| B #198 | `df36b54d09a6f5cec304a64a7d99d7a01176e872` | 10 |

These three exact commits are parents/ancestors of a new aggregate branch. Local
Git composition is not a GitHub/production merge. All original PRs, including
#193/#191/#182, remain unmerged. No collector data commit was rewritten or edited.

`tests/v3-release/source-manifest.json` records all **109 unique input paths**,
original Git blob IDs, executable modes and SHA-256 content digests. Current scope
checks independently derive them from the actual source commits. **106 input
files remain byte-identical**; all UI/React/CSS/browser logic, A/B math, SEC and
journal modules and original source documents remain untouched.

Only three reviewed source-file exceptions, with complete before/after content
and full-index patch digests in `integration-exceptions.json`:

1. Existing `.github/workflows/desk-integration.yml`: add source/journal/integration
   triggers; run A47/B149 and typed current-head link tests; retain all original
   root/current/historical/mobile/native-STOP checks. Add a distinct read-only
   current-main verification job and scheduled-collector completion trigger.
   No configured secret/environment grant, dispatch, new schedule, provider
   endpoint or deployment command. Both dedicated PR
   jobs explicitly check out the immutable PR head; unchanged root CI continues
   GitHub's normal PR integration check.
2. C `tests/desk-journey/scope.test.mjs`: admit only independently hash-verified
   A/B inputs and enumerated integration files. All five original tests remain;
   protected-path freeze still rejects any unpinned mutation. Financial/UI checks
   are unchanged. No path-wide exclusion or environment bypass.
3. B `tests/unfarmd-journal/scope.test.mjs`: likewise admits only the exact C/A
   inputs and integration delta. Its old “risk absent from main” assertion becomes
   “composed risk bytes exactly match original B189”. All three original cases
   remain, and B149 runs on the current tree.

The full original standalone C196 and B198 guard suites also run unchanged in
their exact detached temporary worktrees. These **do not substitute** for current
aggregate byte/scope tests, C's actual current adapter/browser or B149. Existing
#191 historical guards/A118/B171/browser27 also remain intact and run separately.

All 24 new files are under `tests/v3-release/**` and this document, including six
new local screenshots. Original screenshots are retained unchanged. The capture
wrapper runs C's unchanged45 current browser tests against the actual optimized
aggregate, copies their six genuine LOCAL TEST outputs to the aggregate directory,
then restores only those known generated source PNGs from C196. No image editing,
fake receipts or provider-response interception. Generated Next metadata and the
six known legacy homepage PNGs/three disabled JSON receipts and three native-parent
test PNGs are similarly restored before final source checks. Only test-generated
artifacts are restored; source/runtime
files and test results are never hidden or reset.

## What this candidate does and does not connect

The current `/desk` is exactly C196. It uses the reviewed venue-neutral identity
and pure risk model; MANUAL PLAN needs explicit valid owner assumptions and the
actual B recordDecision. PASS/WATCH remain uninhibited by an incomplete PLAN.
The concise PLAN readiness/one-next-step behavior is preserved. No UI changes in
this aggregation and no new fields or navigation.

The **only new linking code is test code**. `link-fixtures.ts` type-checks actual
current C DecisionEvents into `unfarmd-journal/1` receipt types and injects the real
current B functions. It proves valid MANUAL PLAN/WATCH/PASS, no-entry, incomplete
and over-budget denial, explicit supersession, unknown outcomes, corrupt replay,
trusted-prefix rollback rejection, original UTC clocks and late original entry
clocks. Nothing is saved, exported, encrypted, uploaded or attached to the UI.
Refresh still loses the desk's in-memory session. No fake saved-history surface.

SEC remains A's **proposed offline source qualification**, with a labeled invented
fixture projection, not a production wire decoder or adapter. Every source result
stays sourceGo:false. No network, price/fundamental observations, grants or rights
promotion. Issuer CIK is not a share class or verified listing association. A
dated filing/financial period is not current market data.

The [owner's independent SEC review](https://github.com/fuzzysniper/scout-stonk-intel/pull/197#issuecomment-6458593665)
reports official SEC documentation supporting no-key/free API access, public
filing reuse and fair-access limits. That is positive access/reuse evidence;
it does not verify this runtime's provider response, complete commercial/trademark
policy, retention/deletion/PITR/backup safety or authorize a live pilot. This
aggregation makes no new SEC request and does not rewrite A's actual blocked-proxy
observation. A's memo and the independent review should be read together.

Existing mint lookup/canary clocks, activation/proof gates, Helius budgets, Neon
schemas/policies/roles/counters, source policies, authentication/Origin/CSP/STOP,
worker, collector, scheduler, infrastructure and dependencies are all unchanged.
No hosted/manual SQL, key access, trading, financial file or storage installation.
Existing regression suites use only disposable local synthetic PG/TLS fixtures.

## Release-engineering review: supported merge and future collector commits

Addresses [the independent review](https://github.com/fuzzysniper/scout-stonk-intel/pull/200#issuecomment-6459730125).
**Preferred and only supported release strategy: normal two-parent merge commit.**
Squash, rebase-and-merge and fast-forward are **NO-GO**, even when their trees are
byte-identical. The original C/A/B ancestry checks and 109 source-byte pins remain
mandatory; no copied manifest or environment flag substitutes for lost ancestry.
This does not authorize any merge or production release.

The immutable reviewed family anchor is
`b8fbace0f3d71e597af7c01dbc7ffeaedee043b9`. It is not a substitute for approving the
exact successor head reported in the PR. The main first-parent commit that first
introduces `tests/v3-release/lifecycle.mjs` must have exactly two parents, in order:
current main, then the reviewed candidate containing that anchor and every original
source head. Its non-data tree must exactly match its candidate parent; its two
collector files must exactly match its main parent. All other protected paths,
permissions, runtime gates, source inputs and original guard tests remain frozen.
A later non-data change requires a separately reviewed successor policy, rather
than an automatic directory exception. No branch protection/settings are changed.

There are three separate verification contexts:

| Context | Required evidence / behavior |
| --- | --- |
| Local / PR | Exact proposal data at `9ed4061`, all source hashes/ancestry and complete exception patches. Cannot borrow a main evidence packet to permit feature-branch data edits. Existing root CI checks GitHub's PR integration tree; dedicated focused/mobile jobs check the immutable PR head. |
| First main merge | Explicit two-parent/order/tree check, original source ancestry and byte checks, unchanged main data. If scheduled data advanced before merge, verify those transitions too; never replace it with old candidate data. |
| Later main collector update | Same reviewed code; single-parent data-only commit, unchanged collector/allowlist, authenticated scheduled run + successful persistence/evidence steps + matching artifact ZIP/Git hashes; independently replay exact producer-compatible append and retention. |

The new `post-merge-current-main` job is verification, not collection. It runs on
main pushes and on **scheduled** `Collect reward snapshots` completions. The latter
is necessary because the existing collector pushes with `GITHUB_TOKEN`, which
normally suppresses a second push-triggered workflow. No collector workflow,
schedule, dispatch, credential, claim gate or source permission is changed.
Manual collector runs are deliberately outside this narrowly reviewed allowance.
The job uses only the short-lived built-in GitHub client with `contents:read` and
`actions:read`. It never receives configured source keys, calls a market/provider
API, requests a deployment or writes repository contents. Current-main regression,
source, type, lint, build, default-OFF API and archive checks remain separate steps.

GitHub evidence is acquired serially: at most **64 API calls**, **8 unverified
collector transitions**, **5 seconds per call**, **zero retries**, and **4 MiB per
ZIP/decoded artifact**. Only the exact two regular artifact basenames are accepted;
traversal, duplicate/extra entries, symlinks, encryption, invalid compression,
oversized/decompression-bomb input and digest mismatches fail closed. Runs bind
repository ID `1415026436`, workflow path, main branch, schedule event, exact Git
parent, run ID/attempt and actual job/step conclusions. A bot name/message or green
unrelated job is insufficient. New main-job evidence binds the current SHA, event,
run and attempt in a mode-0600, create-once file outside the checkout. It contains
hashes and metadata only, is not uploaded or reused, and never prints artifact
bodies, URLs, tokens or raw SDK errors. Unknown/missing/expired/403/429/503/timeout
evidence stops verification without changing data or retrying a source.

An actual successful same-code `post-merge-current-main` job at an exact ancestor
is an inductive checkpoint; unrelated/skipped/failed/PR/current-run statuses cannot
serve as one. That bounds repeated verification without downloading all historical
artifacts forever. Existing collector artifacts last **7 days**; a gap of more than
8 unverified transitions, missing evidence or non-data history needs explicit
review/recovery. Green CI is not a promise of indefinite unattended operation.

The producer already retains **193 observations per token**. Validation imports
only its frozen pure append/identity helpers, never its fetch/collect entry points.
Each update must be exactly the old observations plus at most one valid row per
existing exact mint, with only the producer's oldest-overflow trimming at 193.
Source/quote/mode/provider and observation clocks, null/zero and failure semantics
are retained. Failed attempts can update only the accurate summary. Old rows and
commits remain in immutable Git history; no history rewrite, reset, new mint or
retention expansion is permitted. There is no new claim about payout flow or rights.

Offline synthetic repositories exercise real Git parents/trees, the actual main
packet loader, actual pure producer append logic and mocked GitHub ZIP/SDK reads.
They cover normal merge, identical squash/rebase/fast-forward rejection, a collector
advance before merge, future collector commits, retention rollover, missed jobs,
checkpoint attacks, wrong clocks/identity, historical edits, evidence substitution,
dirty checkouts, request/byte limits and aborting a request that never resolves.
They are **not** a real post-merge/main Actions observation. The new main-only job
is intentionally skipped in this PR, and must be observed after any separately
approved normal merge; main must not be declared verified from synthetic tests.

Future owner review sequence (not execution authorization):

1. Confirm exact reviewed head, fresh main and green root/focused/mobile CI. Review
   all three exception patches; preserve the original draft inputs and #182.
2. If release is separately approved, use **Create a merge commit**, with main as
   first parent and the approved candidate as second. Stop if only squash/rebase
   is offered or if source/code/data preservation fails; do not change repo
   settings, force-push or hand-resolve protected files to make it pass.
3. Confirm the resulting two parent SHAs, exact source ancestry, candidate non-data
   tree and current-main data. Observe the actual root and current-main jobs. On
   the next already-authorized schedule, observe its independent read-only followup;
   never dispatch or acquire data just to test this verification code.
4. On missing/invalid evidence, keep HOLD and preserve commits/artifacts. Review
   the failed categorical condition; no counter reset, data rollback, source retry
   or bypass flag. Any next code epoch needs independently pinned review/tests.

Mobile approval card: **Review PR #200 exact successor SHA, normal-merge-only
restriction and green CI; source/public operation and journal persistence remain
OFF. A release decision remains separate from any provider or infrastructure GO.**

## Founder evidence: keep the distinction

| Acceptance | Actual evidence / state |
| --- | --- |
| Incomplete PLAN denial | Founder physical-iPhone screenshot demonstrated denial; no receipt/approval. |
| Compact feedback / next action | C196 physical-iPhone review confirmed grouped feedback, “Go to next missing step” and return to Consider/asset with inline prompt. |
| Actual focused input / keyboard | **Unproven on the physical phone.** Browser focus assertions are not physical keyboard/VoiceOver evidence. |
| Complete MANUAL PLAN | Automated current-head flow only; **founder physical full PLAN remains unproven**. |
| PASS/WATCH | Actual source adapter and automated current-browser coverage; thoughtful non-entry is valued. Founder repeat-session acceptance still pending. |
| VoiceOver / comprehension | **Pending physical owner acceptance.** No five-second understanding or assistive-device claim. |
| Five real founder decision sessions | **Not completed.** These are research/decision sessions, not a target number of trades. |
| Journal durability / backup recovery | **Not implemented or accepted**. Separate storage pilot needed. |
| SEC/Helius/market source | **OFF / NO-GO**. No genuine current source observation from this candidate. |

The founder also noted that the visible total of 20 flagged inputs may still feel
daunting. Keep that as an open UX follow-up; this byte-preserving aggregation
does not silently change C's presentation or claim whole-flow usability passed.

## Verification and reproduction

Current-head source/exception checks are fail-closed. Changing a reviewed source
file, adding an unlisted path or changing the scope exceptions without explicitly
reviewed new hashes makes the focused jobs fail. No old guard was deleted/skipped.
The root workflow and root runner remain byte-identical to main.

```sh
npm ci --ignore-scripts
npm ci --prefix experiments/consumer-mvp/web --ignore-scripts
bash tests/desk-journey/run.sh
bash tests/desk-journey/historical.sh focused
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v3-release/run.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v3-release/source-history.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm test
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
node tests/live-ledger/built-api.mjs
node tests/continuous-ledger/built-api.mjs
# Restore only build-generated metadata before scope-aware screenshot capture.
git restore -- next-env.d.ts
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v3-release/snapshots.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/desk-journey/historical.sh browser
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs
NODE_ENV=test NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node tests/continuous-ledger/mobile.test.mjs
git restore -- docs/live-feed-167/screenshots/{locked,disabled}-{320,390,1280}.png docs/live-feed-167/disabled-{320,390,1280}.json
git restore -- docs/screenshots/continuous-local-qa/parent-stop-{320,390,1280}.png
node --test tests/v3-release/scope.test.mjs
bash scripts/archive-tool.sh check origin/main
```

Existing PG/TLS suites may require local PostgreSQL binaries, selected through
SCOUT_TEST_PG_BIN / SCOUT_TEST_PG_SHARE; never a hosted DSN. Chromium must be local
or provisioned solely as CI tooling, not a hosting service. No runtime secrets
are supplied. The local-only guard rejects external HTTP(S) requests; browser
tests also assert zero API/third-party calls, cookies, browser storage and errors.

Verification results and exact aggregate SHA are recorded in the PR after checks
finish. Expected distinct suites: root1350 Node+107 Python; C113 adapter+5 scope;
A source47; B journal149; original A evidence118/B risk171; current C45 mobile;
legacy39 and native local STOP5; historical #191 27 mobile. Extra link/source tests
are reported separately. Parameterized/fuzz scenarios and repeated snapshot tests
must not be counted as extra independent user tests.

Local results: **all required suites PASS** with zero failures/skips: root1350
Node+107 Python (including disposable PG/TLS/security), current C113+5, A47/B149,
new aggregate scope4 + typed link24, original A118/B171 and #191 60+C3, current
browser45, historical browser27, legacy39 and native local auth/STOP5. Original
standalone C113+5 and B149 also pass in exact source trees. Locked dependencies,
types, lint, optimized build and default-OFF built endpoint checks PASS. The first
linker run rejected an invalid synthetic ticker containing spaces; only that
new fixture was corrected, not identity validation, arithmetic or UI. GitHub
exact-head CI and final archive/scope evidence are recorded in the draft PR.

Release-engineering follow-up adds **91 offline lifecycle/GitHub-evidence cases**
to the existing runner; none replaces an original test. They include exact-parent
data preservation when main advances before merge, the actual main file loader,
authenticated-evidence/checkpoint attacks, rolling193 append integrity and terminal
GitHub/ZIP/rate/timeout failures. All91, source scope4, A47/B149 and link24 pass
locally. Full successor CI results and the immutable revised SHA are reported in
PR #200; older green runs are not evidence for an untested successor head.

Intermediate follow-up `1a5edaa895ba5f13222ac50df8e73154ded272a4`
produced a failed workflow validation run before any focused/mobile job started.
Its job-level `runner.temp` expression used a context unavailable at that level.
The evidence path is now bound in a runner step via `RUNNER_TEMP`/`GITHUB_ENV`;
the pinned official Actions expression parser checks the main-job condition and
rejects the unsupported old job-env context. Fresh successor CI is required;
the intermediate root/preview checks cannot substitute for the missing jobs.

Initial aggregate CI at `c80f87f8396efa9846721e43e3dfd03c66bb0911` passed
root/focused and all45+27+39+5 browser/security cases, then correctly failed the
final source guard: Ubuntu's legacy browser run changed its generated320px PNG,
while cleanup covered only the1280px disabled PNG. Cleanup now restores exactly
the nine paths written by unchanged legacy browser39 (six PNGs +three JSON files),
not a directory or a code/control file. The source guard remains unchanged and
strict; the workflow patch is re-pinned and full CI must pass on the successor.

## Current local screenshots

These six images are recaptured from the actual aggregate after a successful
current45-case browser run. All contain C's visible **LOCAL TEST** label and
invented owner assumptions, no live data or real-device claim.

| State | 320 | 390 | 1280 |
| --- | --- | --- | --- |
| Incomplete PLAN / one next step | [PNG](../../tests/v3-release/screenshots/current-incomplete-320.png) | [PNG](../../tests/v3-release/screenshots/current-incomplete-390.png) | [PNG](../../tests/v3-release/screenshots/current-incomplete-1280.png) |
| Actual manual PLAN receipt | [PNG](../../tests/v3-release/screenshots/current-plan-320.png) | [PNG](../../tests/v3-release/screenshots/current-plan-390.png) | [PNG](../../tests/v3-release/screenshots/current-plan-1280.png) |

## Mobile review card and remaining gates

**Review-only / no production action.** Owner may review this draft, fixed input
heads, CI logs and local screenshots on iPhone. Retain C's prior finding, then
test the actual candidate on an approved protected preview/physical phone only
when that access is separately permitted; do not invoke any source/proof endpoint.

1. With incomplete TEST select PLAN → Check my plan: no successful receipt; compact
   next action, full list folded. Go to next missing step → correct field, actual
   focus/keyboard, preserve input, Back to decision. Confirm with VoiceOver.
2. Deliberately enter a complete hypothetical MANUAL PLAN with chosen capital,
   cash/exposure, exact prices/clock, limits and costs. Correct one real blocker,
   record, and explain “manual/source-unverified, not saved/executed; losses can
   exceed plan”. Do not use real account identifiers or execute a trade.
3. Record reason-only PASS and incomplete WATCH; verify neither needs a PLAN.
   Refresh loses session; do not imply a durable journal or count that loss as a
   successful backup/recovery test.
4. Schedule five actual founder research/decision sessions and record findings
   outside this app under owner control. No trade count or profit target.

**HOLD:** physical complete PLAN/keyboard/VoiceOver/comprehension and five sessions;
separate encrypted-file/server-storage choice, privacy/key custody/cost/deletion/
PITR/backup/restore review and pilot implementation; SEC live decoder/identity,
rights/attribution/retention/admission and a distinct source GO; any operational or
production release authorization and applicable commercial/adviser/branding review.
Existing Helius/unattended operational blockers
remain separate, unresolved and not bypassed by a manual journal or green UI CI.

## Rollback

Hold/close the aggregate. Inputs stay draft/unmerged. No datastore, schema, source,
key or operational state exists to undo. A separately authorized future code
release may be reverted through normal review; never reset counters/fences/STOP,
retry an old canary, roll back collector data or restart a source as rollback.
