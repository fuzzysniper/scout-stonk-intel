# Exact OFF-only union — code review, not source or release permission

Issue274 / exact handoff272/comment-6552933099. The earlier acceptance preparation
is preserved verbatim, including its intentional missing-head HOLD on its own
historical input. This document records the newly supplied C input; it does not
rewrite that guard or turn its historical status into activation permission.

## Immutable inputs and composition

| Role | Exact SHA |
| --- | --- |
| Shared integration271 base | `8effe6ba0967d7a83e976840d5ed8df1d95fcbf5` |
| C275 THE TAKE, first parent | `3316612ce256f9827b88e6272c3cec9fefb3f79b` |
| B272 recovery v2, second parent | `09a11e700ea932c7b161664cdf5bbc9b3dcbe00b` |
| B preparation, third parent | `94cadce1b6831d03fc58b89477353311a356ed53` |
| C273 already in275; no second merge | `0b342b7f2447e4ab07b09d9a8a36feb66daacbc9` |

The complete expected tree is271 with C275's exact delta, B272's disjoint ten
files, and preparation94's exact three-file delta over its original pair. Every
input tree, path, before/after blob/mode and full binary patch is pinned in
`tests/oracle-union-274/review.json`. There are only seven new integration files:
the new workflow, this document and five review/replay/artifact files listed
individually in that manifest. No runtime/app/API/SQL/source/rights/trust/collector
file is integration-owned. All source heads remain DRAFT/unmerged and unchanged.

`review()` verifies the actual committed HEAD tree AND working bytes/modes, exact
ordered three parents, independent merge base/ancestry, no source collisions and
no extra paths. Negative controls mutate source/auth/STOP/SQL/pins/collector,
original v1/v2/preparation/claim/TAKE/guards, omissions, symlinks, executable modes
and unexpected additions. No directory waiver or historical baseline edit.

## Reproducible verification and CI truth

Use locked `npm ci --ignore-scripts` and the pinned PG18 build script. All Node
functional/security/browser commands run with
`NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs`. PG uses disposable
local fixtures with native TLS/SCRAM-PLUS; data and signing materials are synthetic.
Source SQL installer/body pins and runtime trust remain original.

- Actual union: new full-tree guard; original v2 verifier + real PG extraction;
  issuer/source owner/native/TLS/STOP tests; C signature/claim tests; THE TAKE
  model; native/holder/source functional tests; types/declarations/lint/build;
  original optimized native/source-OFF/cold-start/bootstrap and archive checks.
- Actual union browser at320/390/1280: THE TAKE45, claims27, mount24, original
  optimized3 and THE TAKE optimized3. Includes one-tap original evidence,
  keyboard/axe/200% reflow, red/conflict/unknown/stale/expiry/STOP/Clear, all24
  findings, no added requests/storage or invented live receipt. Original before
  render uses immutable273 with IDENTICAL TEST input. Screenshots are synthetic
  evidence only, captured to CI artifacts; original committed screenshots remain
  exact reviewed bytes after the run.
- Original input reviews: unchanged271 guard, full272 suite,273 guard/negative
  controls,275 guard/negative controls, and preparation94 guard/negative controls
  each run on its exact original worktree. Its old HOLD is expected, never waived.
  Original reviews/native-root/security-history replay unchanged through272's
  original runner, which preserves all prior immutable-input chains.
- New actual artifact check requires the clean-install72-file CA trace SHA256
  `ba7a82836483b727791dd6f9e1555e730a0ee02b86be45503dced3acc4814650`, zero inactive
  PG/auth/native-producer dependencies, and zero offline-v2 imports/strings in
  built app/client output. Original built OFF checks retain secret/payload/Host/
  Origin/protocol checks. No branch/Host/Origin/trust retargeting is introduced.

Original source CI (271:3/3;272:5/5;273:5/5;275:3/3) is provenance, **not union
CI**. The new branch-scoped workflow runs seven jobs on the PR HEAD SHA, with
read-only GitHub permission and persisted checkout credentials disabled. Report
every job conclusion and inspect completed logs. Pending/failed/skipped required
jobs or any changed code mean HOLD. Exact union SHA/tree/new CI conclusions belong
in the PR's review card after execution; this source document claims no result.

## Recovery and operational HOLD

Every v2 outcome remains `activate:false`. Positive tests establish only offline
logical preservation. No independent latest-checkpoint/signing custody or store,
trusted clock/latest selection, complete uncertain-activity coverage or enforced
writer quiescence is installed/proven here. Two old matching snapshots and counter
maxima do not substitute. Uncertain leases, fences, spent credits, STOP and full
ordered history/receipts must survive exactly; no reset/refund/reclaim.

Physical durability, independent recovery anchor/key custody, provider facts and
rights are not certified by the logical verifier. Old Neon snapshot stays intact.
Launch billing, fresh snapshot, exact installer/SQL, restricted setup, owner and
source signing, any bounded native session, hosted Save and public distribution
remain distinct owner decisions. No source grant or hosted recovery is inferred.

The reviewed265 Jupiter-only iPhone Preview remains untouched. Vercel Ready for
this union, if automatic Git integration reports it, is build evidence only. No
protected API authorization/native receipt or physical authenticated Safari test
is claimed or requested. Runtime branch/host/trust pins remain the original271
values; this new integration branch is not an admitted hosted source branch.

## Review card / errors / rollback

Owner review requires exact union SHA/tree and parents, complete changed paths,
all new exact-head CI job conclusions, labeled TEST screenshots, independent
checkpoint/source rights/setup holds, and the distinction between Ready and
actual hosted/device acceptance. This is OFF-only review, not release approval.

Any guard drift, trace/payload leakage, uncertain current anchor, clock mismatch,
invalid signature, source/auth/STOP/SQL mismatch or failed test means HOLD. Do not
edit old guards, widen provider/host admission, retry uncertain source activity,
reset/refund counters, clear permanent STOP or reinterpret synthetic fixtures.

Rollback now: close this unmerged dependent draft / discard only its integration
commit. Original275/273/272/preparation/271 remain intact. There is no deployed or
hosted database change to undo. Preserve collector/journal/admission history,
fences/uncertain leases/STOP. No main/production merge, manual deployment, hosted
SQL/branch/snapshot/restore/billing, credential handling, provider calls, activation,
new public sharing or owner terminal step is authorized by this integration.
