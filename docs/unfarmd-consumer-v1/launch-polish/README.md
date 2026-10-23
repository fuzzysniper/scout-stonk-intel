# Issue #147 — final launch-polish audit

## Decision and scope

**Frontend review candidate: GO. Final public/authentic-source launch sign-off: NO-GO while the separate owner gates below remain unresolved.** No hero redesign was justified. Founder first-screen/headline acceptance remains **unconfirmed, not failed**; physical VoiceOver is pending.

Two demonstrated defects were corrected:

1. On the actual optimized homepage, consumer `icons.icon=scout-avatar.webp` suppressed Next's file-based metadata: only the old detailed WebP favicon was emitted, with **no Apple touch-icon link**. Removing that consumer override restores the integrated Outlier SVG and native 180px Apple PNG. Icon geometry/files remain unchanged.
2. `/research/history` had the correct page title but inherited “Find reward-asset memecoins” OG/Twitter text and no explicit noindex/canonical. Its existing dated/rights-gated description now also drives its own social metadata, with an exact canonical and `noindex, nofollow`. CARDS already has accurate page-specific titles. Legacy `/terminal`, root legacy defaults and the UNFARMD read-only social image are preserved.

No layout, CSS, headline, hero, original art bytes, source contract, acquisition rule, API, backend, collector, preflight, credential or deployment setting changes. The author-written runtime diff is only `app/consumer/model.ts` and the metadata declaration in `app/research/history/page.tsx`.

## Reproducible integration target

- Main fetched at start: `acd72f2d09cb9bec3f40fd8dcddcf031decae950`.
- #137: `2169247924c05300e4ffc2ce005b3960317cebd8`.
- #143, including merged Outlier child #145: `a10bf94ff866095446fb2d4829df8f5a948d9144`.
- This dependent branch starts at #143; neither parent branch was changed.

A detached local worktree combined fresh main with #143 **without publishing a merge**. The unchanged merge tree is `b9a65a8a828d39f201f3415bd9b87fdd18a038b8`. Only the authored frontend/test overlay was applied before the after-build. The main-only collector snapshots/summary and #141 preflight-session update were retained verbatim. `git diff origin/main -- app/api lib/onchain-mint data scheduler .github` was empty in the combined worktree. `LOOKUP_APPROVAL` remained `phase: disabled`, both approval timestamps null. No hosted SQL, source activation, preflight invocation or authentic Helius acquisition occurred.

The optimized build and entire consumer suite run in this same combined worktree, not a Vite-only substitute. The existing Vite harness remains limited to explicitly labeled synthetic/offline contract scenarios. All 225 browser tests passed in one clean invocation (7.0 min), with zero skipped/flaky tests. Root tests: 1,167 Node + 107 Python; additional consumer units: 19 MintFacts client, 21 trader/Control Receipt, six brand/artwork. Types, lint, production build and archive pass. All three before/after homepage PNGs are byte-identical. See [verification.json](verification.json) for completed check outcomes, source hashes and the single clean full-browser-run summary. PR CI/preview statuses are recorded in the PR because they attach to the published commit, not a predicted future merge.

## Actual evidence

- [Before emitted head and first-screen measurements](before-audit.json).
- [After effective metadata and actual PNG receipts](after-metadata.json).
- Metadata readout: [before](screenshots/before-metadata.png) / [after](screenshots/after-metadata.png). These are browser-rendered readouts of effective HTTP metadata, **not fabricated browser chrome or iOS previews**.
- Unchanged approved first screen: [before 320](screenshots/before-home-320.png) / [after 320](screenshots/after-home-320.png), [before 390](screenshots/before-home-390.png) / [after 390](screenshots/after-home-390.png), [before 1280](screenshots/before-home-1280.png) / [after 1280](screenshots/after-home-1280.png).
- [Current accepted Control Receipt](screenshots/accepted-synthetic-offline-390.png), conspicuously labeled synthetic/offline; not an authentic observation.
- Actual [Apple PNG](apple-icon.png) and [social PNG](social-preview.png), decoded and checked at 180×180 and 1200×630; SVG favicon checked against the original file. The metadata readout displays favicon samples at true 16/32px and Apple at 180px.

Baseline CTA bottoms: 649.53/740px (320), 735.75/844px (390), 672.48/900px (1280). Buttons are 50/50/52px tall, unobscured and reachable without first-screen scrolling. No passive API or external requests occurred during these first-screen captures.

The suite covers slow/missing art and retained dimensions/focus; portrait/landscape reflow; dark/forced colors and reduced motion; 200% **CSS layout-zoom proxy**, keyboard and axe; actual disabled GET/recovery; exact mint, history/share/refresh passivity; visibly labeled synthetic accepted Control Receipt, authority/Token-2022/clock/expiry safeguards and clipboard failures. CSS zoom and Chromium touch emulation do not establish physical Safari text-size/keyboard/VoiceOver acceptance. No synthetic fixture is claimed authentic; no synthetic data is added to production routes.

Initial full execution exposed one obsolete inherited assertion: `/favicon.ico` should return 200. #145 intentionally removed that conflicting file. The run was interrupted to fix the test to assert the integrated SVG and old `.ico` 404. The final result is a **fresh full invocation of all tests**, not a union of partial passes. The artwork test's old avatar expectation was also updated to the actual Outlier/Apple links.

## Founder iPhone acceptance — about five minutes

Use the ordinary preview URL from this PR's bot/check; no bypass link or protection/credential change. Confirm its SHA first.

1. **First screen (1 min):** Safari portrait at default text size: confirm the approved headline, full selected sheep art, address field and SCOUT IT. Rotate landscape and check navigation/disclosures for clipping. Specifically approve or reject this previously unconfirmed hero/headline; it has not been redesigned.
2. **Input/recovery (1 min):** paste a public test mint (e.g. wrapped SOL `So11111111111111111111111111111111111111112`). Pasting alone must not request facts. SCOUT IT should truthfully show “Check not permitted” while GET is disabled, with no supply/authority claim. Reopen/edit input; back/refresh should not resubmit. If clipboard permission is denied, use touch-and-hold Paste.
3. **Icons (30 sec):** bookmark and open Add to Home Screen. Confirm the bone Outlier on charcoal, not the detailed avatar; no need to install a new app. A cached old bookmark is not proof of a new response—recheck using a new preview bookmark if necessary.
4. **VoiceOver/text (90 sec):** check Token address, Paste, SCOUT IT, result heading/failure and Evidence/Details labels/order. Test Safari's larger text setting, keyboard open and focus recovery. Chromium axe/zoom passes do not replace this.
5. **Dated evidence (1 min):** open a selected StonkFun example; confirm 14 Oct 2026, stale/not-live and rights/financial withholding. Keep this separate from future authentic onchain acceptance.

## Recommended release order — human operated only

1. Review/approve #137 against then-current main, preserve incoming collector/ops changes, record the actual resulting merge SHA **M137** and rerun its checks. No merge SHA is knowable in advance.
2. After #137 lands, retarget/review #143 against main. Confirm its intended Control Receipt and already-integrated #145 Outlier changes, then record **M143** if a human merges it. Brand exploration #144 is not an additional runtime dependency.
3. Retarget this dependent PR after #143, inspect that its remaining diff contains only the two metadata fixes and scoped QA/docs, rerun checks on then-current main and record **M147** if approved.
4. Verify each GitHub-reported merge SHA's exact frontend file hashes against the approved heads (or the final combined tested tree), original artwork manifest and current main's backend/data. If using merge commits, additionally check approved-head ancestry; squash merges require content comparison instead. **Never reset main or copy old backend/data from a feature branch.** Recompute conflict/test evidence if a dependency changes.
5. Only the owner can authorize authentic public GET after Agent B's independent security/source evidence. This PR does not authorize it. Preserve the disabled/null gate until separately approved, and do not retry/rearm a previous canary.

## Remaining gates and rollback

Founder physical first-screen, Safari bookmark/Home Screen and VoiceOver acceptance; independent trademark/artwork commercial clearance; existing source/publication rights decisions; independently authorized authentic MintFactsV1 observation. Existing financial quantities stay withheld. No verified live observation, safety certification or commercial permission is claimed.

For a frontend regression, revert this metadata/QA commit first; it does not require API, DB, collector or credential rollback. Any wider rollback of #143/#137 is a separate human choice in reverse dependency order, preserving current main's data/ops. No production reset, merge or deployment was performed for this audit.
