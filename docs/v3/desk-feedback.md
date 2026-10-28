# Incomplete PLAN feedback · P0 follow-up to #193

2026-10-28. Addresses [the founder’s physical-iPhone finding](https://github.com/fuzzysniper/scout-stonk-intel/pull/193#issuecomment-6458204458). **Draft review only; renewed physical iPhone acceptance is still a release blocker.**

Original #193 stays draft/unmerged at `6eb9c6ecb35d80ce381e12a6e5b5f6eca4747d4d`. This isolated follow-up branches from that exact head, which preserves verified main `ba4b2e494f768350ec285e26791b61a90c50220b`. The new draft PR pins its separate exact head and narrow comparison; inherited unmerged integration history is not new work.

## Changed behavior

- Before recording is possible, **Plan incomplete** appears beside one actual next requirement and **Go to next missing step**. There is no ready-looking Record button. **Check my plan** evaluates only; it cannot create a receipt, even if the check now passes.
- Four or fewer concise groups summarize actual validator diagnostics. Counts mean flagged inputs, not guessed percentage/stage completion. Duplicate field diagnostics and enclosing group errors do not obscure a more precise field error. Every original error/code remains under the closed **Show all issues** disclosure.
- Navigation opens the correct guided stage/substep and any relevant disclosure, focuses the control, preserves session inputs, and provides **Back to decision**. Returning focuses the updated feedback. Current inputs are reevaluated; remembered error order is not used as progress.
- Required reason and acknowledgements are disclosed on demand, not dumped alongside all missing risk fields. Next-step navigation can open them directly. A diagnostic reported only at a group level remains a group review; the UI does not invent a more precise numeric diagnosis.
- **Plan ready to record** and **Record MANUAL PLAN** require the unchanged actual adapter to be recordable with a non-null B calculation. Recording still invokes unchanged real B `recordDecision` with a fresh clock. Readiness is checked locally each second and on foreground return; no assumption time is filled in or refreshed. A receipt remains its immutable original snapshot.
- Readiness changes do not steal input focus. If expiry removes the focused Record button, focus moves to the actionable summary rather than the page body. No focus loops or full-page reload/navigation.
- PASS remains reason-only and always accessible in the sticky header; WATCH remains available with incomplete research. Neither inherits unfinished PLAN approval requirements. Source-unverified, session-only and loss-may-exceed-plan disclosures remain.

## Scope and safety

Only the journey component/scoped CSS, two presentation helpers, scoped tests/runner/scope assertions, this document and six new screenshots change relative to #193. Current-head scope tests enforce this list. Existing screenshots are retained as historical evidence.

A/B libraries/tests, both decision adapters, exact percentage conversion, existing risk summary/control components, routes/chrome, all workflows, homepage, APIs/auth/CSP/Origin/STOP/TLS, source gates, collector/data/schedulers, dependencies and infrastructure remain byte-identical to #193. No numeric defaults, sizing/risk math, decision-rule bypass, storage, telemetry, API/provider calls, credentials, hosted SQL, source activation, trade, merge or deployment command.

## Verification

Commands: `bash tests/desk-journey/run.sh`; `npx tsc --noEmit`; `npm run lint`; `npm run build`; `node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/desk-journey/playwright.config.mjs`.

The focused suites retain exact decimal/risk/recording regressions and add real-validator grouping, precise-next-field priority, missing fee targeting, warning-only/unknown-diagnostic behavior and expiry checks. Browser tests retain all previous journey scenarios with the intentionally corrected incomplete-PLAN UI, plus the founder’s reproduction, viewport-bounded short feedback, hidden full list, no receipt, correct focus/return, data preservation, correction-to-valid-PLAN retry, explicit acknowledgements, idle expiry/focus and uninhibited PASS/WATCH. Every scenario asserts no API/external requests, storage/IndexedDB access, cookies or page errors. Full-page axe, keyboard and 200% CSS zoom remain; CSS zoom is not a physical Safari pinch/text-zoom claim.

The unchanged root and integration CI retain full root regressions, full A/B suites, historical #191 frozen checks/browser, current legacy homepage, actual default-OFF endpoints and disposable local native HTTPS/PG STOP/security fixtures. No test is skipped or runtime gate relaxed. Exact-head test counts and inspected green-CI job links are in the follow-up PR.

| LOCAL TEST evidence | 320 | 390 | 1280 |
| --- | --- | --- | --- |
| Post-check actual viewport: one next step, closed full list | [PNG](../../tests/desk-journey/screenshots/feedback-incomplete-320.png) | [PNG](../../tests/desk-journey/screenshots/feedback-incomplete-390.png) | [PNG](../../tests/desk-journey/screenshots/feedback-incomplete-1280.png) |
| Actual manual PLAN receipt from invented owner assumptions | [PNG](../../tests/desk-journey/screenshots/feedback-plan-320.png) | [PNG](../../tests/desk-journey/screenshots/feedback-plan-390.png) | [PNG](../../tests/desk-journey/screenshots/feedback-plan-1280.png) |

## Renewed founder iPhone acceptance · pending

On a separately authorized protected review target at the follow-up’s exact head:

- [ ] Enter TEST, select PLAN on DECIDE with missing inputs: understand **Plan incomplete** and the one next action without tapping a false-ready Record CTA.
- [ ] Tap Check my plan: no receipt, no long error dump. The next action and compact summary fit the current screen; complete details appear only when requested.
- [ ] Follow the next step, edit the focused field, and return to decision. Inputs remain; focus returns predictably and the next requirement updates. Try a correction inside an optional disclosure too.
- [ ] Complete an explicitly manual plan: only actual valid inputs plus acknowledgements expose Record. An expired or over-budget plan stays blocked. PASS/WATCH remain usable without completing PLAN.
- [ ] Safari keyboard/VoiceOver, portrait/landscape and pinch/text zoom: no obscured target, focus loss or surprise scroll; manual/source-unverified/not-saved/not-executed distinctions remain understandable.

No physical-device or founder-comprehension pass is claimed by automation. Rollback: hold/close this draft, or revert only its narrow follow-up commit through a separately approved release process. Preserve #193/#191, collector data and every source/STOP gate; no database or source rollback is involved.
