# B integration acceptance — preparation, not a combined release

Issue #274 and handoff #272/comment-6552424978. No new C THE TAKE head has been
supplied. Do not create the final dependent integration draft, invent a head, or
treat the current pair as the requested three-input union.

Reviewed fixed inputs:

| Input | Exact commit |
| --- | --- |
| Shared #271 base | `8effe6ba0967d7a83e976840d5ed8df1d95fcbf5` |
| B #272 recovery v2 | `09a11e700ea932c7b161664cdf5bbc9b3dcbe00b` |
| C #273 claims | `0b342b7f2447e4ab07b09d9a8a36feb66daacbc9` |
| Local preliminary pair | `01cf898e5e2b46e93c2a52c4d5bc2ecf5cca698d` |
| Next C THE TAKE | **MISSING — HOLD** |

The preliminary pair has exactly two parents, C then B. This preparation branch
adds only this checklist and two offline guard files. It does not change either
reviewed input. `reviewPreparation()` reconstructs the complete expected tree from
the shared base and disjoint exact deltas, checks independent input ancestry and
ordered parents, and verifies every on-disk blob/mode. No prefix exceptions.
Its CLI exits **2 / HOLD_AWAITING_TAKE_HEAD**, even when those checks pass.
The tests' passing control verifies preservation, not final acceptance.

```
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs \
  node --test tests/oracle-integration-274/preflight.test.mjs
node tests/oracle-integration-274/preflight.mjs # expected exit 2, no activation
```

## Actual preliminary evidence (not final union CI)

All listed tests ran locally against the exact preliminary pair plus these three
preparation files, with nonlocal networking blocked and synthetic data only:

- 77 recovery/preparation cases: 66 original verifier cases, eight real disposable
  PostgreSQL18/native TLS/SCRAM-PLUS cases and three new full-tree/CLI/negative-
  control cases. The first harness run hit Node's ambiguous assertion-message
  handling on a correctly rejected symlink; fixed the test call and reran all77,
  then reran all three guard cases after restoring generated screenshots.
- 44 source/issuer security cases;16 claim/signature cases;25 native mount cases;
  258 native/holder peer cases;126 original source decoder cases. Zero skipped.
- 27 claim browser +24 original mount browser +3 optimized Next browser cases
  pass at320/390/1280 with keyboard/axe/200%/STOP/no-added-I/O checks.
- Original B #272 whole77-case suite and C #273 two-case complete scope guard
  rerun unchanged on their own immutable inputs, separately from pair tests.
- Types/declarations, lint, optimized build, native/source-OFF/cold-start and
  bootstrap, recovery-string absence from built app/client output, and append-only
  archive checks pass. Generated TEST screenshots remain only under
  `/tmp/oracle274-synthetic-browser-evidence`; original screenshot bytes restored.

Local dependencies were symlinked to the same locked installation: the resulting
route trace is11 files/SHA-256
`89fa211e40ebc40f67a501b8487222895568b06f4f12577fde83b0d3a18b7b3e`, zero inactive
dependencies. This is **not** the clean-install CI72-file trace and is not claimed
to be the same inventory. Final union CI needs a fresh locked install and actual
complete trace inspection as specified below.

Original #272 [run41262746059](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/41262746059)
and #273 [run41263093615](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/41263093615)
are successful source-head evidence only. **No final union SHA/CI, next C THE TAKE
tests, hosted observation or physical-device acceptance exists in this preparation.**

## Required final composition, after C supplies a reviewable exact head

1. Read C's draft/diff and completed job logs; independently fetch its full SHA.
   Require exact #273 ancestry, no moved #271/#272/#273 heads, no runtime/SQL,
   trust, source, auth, STOP, collector or protocol changes. Compare C's entire
   delta with its declared finite path list; record before/after blobs, modes,
   full patches and any collision with B. A collision or undeclared change HOLDs.
2. Use a **new** integration branch whose first parent is exact next C and second
   parent is exact B #272. Do not move this preparation branch or any source PR.
   Preserve the complete expected source union, including every original guard.
   Integrator additions must be finite, individually reviewed files only. A
   whole-tree guard must cover the actual final HEAD and working tree, with
   committed negative controls for forbidden files/modes/deletions/new paths.
3. Run each original whole-tree scope guard unchanged on its exact original
   worktree: #271, #272, #273 and next C, including their original negative controls.
   Replaying historical inputs is separate from actual-union functional tests;
   neither replaces the other. Do not waive failures with a directory allowance,
   skip, `continue-on-error`, test grep or edited baseline.
4. On actual union HEAD run B verifier + actual disposable PG18/native TLS/PLUS
   extraction and source/issuer auth/STOP tests; existing C/native/holder/source
   functional tests; #273 forged-signature and claim tests; next C tests; inherited
   root/native/TLS/security/history suites; types and declaration checks, lint,
   optimized production build and append-only archive verification.
5. Run current-HEAD browser suites at 320/390/1280: new THE TAKE plus existing
   claims/mount/optimized app. Include keyboard, axe, 200% reflow, all24 findings,
   red priority, source-OFF/GRAY, disagreement, expiry, Clear, STOP ACK/UNKNOWN and
   no additional I/O. Screenshots must be labeled TEST/SYNTHETIC. No live calls or
   repeat of the already documented owner Safari USDC lookup.
6. Inspect optimized page/API traces and actual built native OFF routes. Require
   unchanged isolated CA route trace (72 files, zero inactive PG/auth/native
   producer dependencies), no recovery-v2 import into app/client bundles, no
   private policy/owner/lease/credential payload, no changed protocol or gate.
   Any branch-specific synthetic artifact adaptation must be a pinned integration-
   owned temporary copy only; preserve original artifact and runtime guard bytes.
7. Open ONE dependent DRAFT only with verified exact input bytes. Trigger new
   exact-head CI, inspect every completed job log and report all conclusions.
   Pending, skipped or failed required jobs mean HOLD; ancestor CI is not union
   CI. Any code change invalidates prior exact-head results. No hosted acceptance
   or API protection claim follows from Vercel Ready or offline Chromium.

## Recovery v2 peer review — positive preservation stays OFF

The verifier requires the pinned Ed25519 public key and the authoritative current
anchor digest/sequence/database/generation/quiescence/policy from independently
protected custody outside the target and its backups. Signature and capture age
alone are insufficient. A freshly reaffirmed latest checkpoint is distinct from
a fresh target probe; both are required. Two old self-consistent signed snapshots
and counter maxima fail. The code checks supplied bindings; it cannot prove
independent custody, signer/clock honesty, complete coverage of uncertain source
activity, monotone latest-head selection or external writer quiescence. No such
authority/store is installed. A caller copying target assertions into trusted
configuration violates the boundary; unavailable trustworthy currentness HOLDs.

All reservations, credits, lookup rows, permanent STOP, fences, uncertain leases,
sequence and complete ordered receipt/history commitments must survive exactly.
Uncertain leases stay uncertain, without refund/reclaim; a sequence advance also
conservatively HOLDs. Read-only repeatable-read extraction cannot prove writer
quiescence or sequence MVCC. Logical preservation does not certify physical
durability, key recovery, whole-catalog integrity, snapshot suitability, rights,
source facts, successful hosted recovery or restore authorization. Every v2 result
remains `activate:false`.

## Holds, rollback and owner card

**Review only / NO release or restoration.** No main merge, production change,
hosted SQL/branch/snapshot/restore, billing, credentials, provider call, activation,
hosted Save, new public sharing or runtime Host/Origin/branch retargeting. Preserve
the old Neon snapshot. Launch billing, fresh snapshot, exact installer, independent
anchor custody and any hosted operation remain separate owner decisions.

Rollback now: close a future unmerged integration draft / discard this local review
branch. No deployed or database state exists to roll back. Preserve all original
PR heads, collector history, counters, STOP, fences, spent/uncertain leases and
admission history. Never reset/refund state as rollback. Final owner review card
must identify actual integration SHA, exact source parents, finite changed-path
set, each CI job conclusion, TEST-only screenshots and remaining holds.
