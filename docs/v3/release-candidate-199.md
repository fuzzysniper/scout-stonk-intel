# Source-disabled V3 release candidate

Issue #199 · 2026-10-28 · **DRAFT / product GO remains HOLD**.
No production release, provider acquisition or journal persistence is authorized.

## Exact inputs and preservation

Release main: `9ed40610eb34c34b56996d55a768f2eac9b43cdd`.
Original source base: `ba4b2e494f768350ec285e26791b61a90c50220b`.
Main advanced during validation by one scheduled collector commit. Its summary
and reward snapshots were carried through unchanged by merging that exact commit;
the manifest separately pins those two original main blobs/modes/content hashes.
Historical guards accept only that specific verified main update, never a general
collector/data exception. Diff versus release main contains no data changes.

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
   root/current/historical/mobile/native-STOP checks. No secret/environment grant,
   dispatch, schedule, provider endpoint or deployment command. Both dedicated
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

All 16 new files are under `tests/v3-release/**` and this document, including six
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
