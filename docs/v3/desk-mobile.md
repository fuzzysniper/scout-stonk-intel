# UNFARMD Decision Desk · Agent C / #186

Review date: 2026-10-27. Draft prototype only. Fresh base verified by `git fetch origin main` and independent `git ls-remote origin refs/heads/main`: `9e5264b7edd3f37aeb35113ffb8b86aa8a50b7ec`. Exact delivered head is recorded in the draft PR.

## Working behavior

`/desk` is additive; homepage and existing private operations remain unchanged. The loop is manual asset label → written research and assumptions → explicit WATCH / PASS draft decision. Every financial/research input is unverified user text. Identity, source clocks, coverage and live facts are unknown/unavailable. Text URLs are never opened. No automatic ticker/chain/address resolution, sources, financial calculations, wallet or trading links.

Purpose, horizon, thesis, evidence/provenance notes, counter-thesis, unknowns, invalidation/exit rationale, portfolio assumptions, risk/cost assumptions and reason are editable. PASS works with just a written reason. WATCH also requires a reason but permits incomplete research. No default decision. Editing any input or affirmation invalidates the displayed decision; Clear draft erases page state. Reason and asset in the receipt are escaped text.

PLAN is deliberately blocked in this prototype. Activating the focusable `aria-disabled` PLAN control explains missing inputs and the two unconnected integrations; it cannot record a PLAN even when all fields are entered. Completeness means presence only, never evidence quality or a passed budget. No override exists. Risk preview explicitly shows no calculation, approved budget, position size or worst-case loss.

Inputs and decisions live only in React memory. No local/session storage, cookies, IndexedDB, database or URL serialization is implemented. Refresh/close discards application state; browser back/forward cache or browser form restoration is not a secure-erasure guarantee. Clear draft before leaving a shared device. No journal history, export or remote retention is claimed.

## A/B coordination and later integration

[A proposal](https://github.com/fuzzysniper/scout-stonk-intel/issues/186#issuecomment-6452231474), [B proposal](https://github.com/fuzzysniper/scout-stonk-intel/issues/186#issuecomment-6452266311), [C boundary](https://github.com/fuzzysniper/scout-stonk-intel/issues/186#issuecomment-6452336326), [A clarification](https://github.com/fuzzysniper/scout-stonk-intel/issues/186#issuecomment-6452366140).

No cross-agent imports, guessed implementation types or A/B edits. The source-free seam is the owner asset label, unresolved/null exact asset key, textual assertions/unknowns and explicit decision/reason. A future reviewed mapper may use `evidenceRef:{version:'unfarmd-evidence/1',assetKey:null,evidenceIds:[]}` and B's `asset:{label,assetKey:null}`. These shapes describe proposals, not an integrated/validated result. Keep exact Solana case and exact A/B key equality when an identity adapter is separately reviewed; never derive an identity from ticker alone.

A's evidence-component withholding does **not** intrinsically prohibit an owner-authored manual PLAN. C's current block is a conservative prototype boundary while B is unconnected. Future reviewed integration must distinguish a manual-only plan from a sourced-evidence plan. It may permit explicitly manual PLAN after B validates the required bounded numeric assumptions and completeness; do not require a live source merely to draft a manual plan. C must not split free-text portfolio/risk notes into guessed financial values or independently implement B's arithmetic. B's tested numeric fields, error codes, evaluation clock, warnings, risk results and exact head need review first. No B result can verify source facts, authorize execution or establish token safety.

## Verification evidence

Flow: user input → local React state → source-free completeness checks → blocked PLAN or manual WATCH/PASS receipt. Client→API/data boundaries are intentionally absent. Browser instrumentation rejects external requests and asserts no private `/api/**` requests, page errors, storage writes or cookies in every scenario.

- `node tests/desk/draft.test.mjs`: 3 focused cases passed (PLAN fail-closed, reason-only PASS/WATCH, state isolation/source-free ownership). `node --test` reports one file-level pass in this environment; direct execution exposes the three named cases.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with no warnings/errors.
- `npm run build`: passed; `/desk` statically rendered, 3.64 kB route / 106 kB first load. Existing edge-runtime static-generation notice is unrelated.
- `node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/desk/playwright.config.mjs`: 12 passed at 320×740, 390×844 and 1280×900. Uses actual local optimized server; no mocked API or market fixtures. Browser-only input is explicitly MANUAL TEST text.
- Browser cases: empty unavailable states and >=44px field heights; axe WCAG A/AA checks scoped to new desk; incomplete/fully-entered PLAN denial; reason-only PASS; incomplete WATCH; safe literal text rendering; receipt invalidation; refresh and Clear draft; keyboard focus/Enter; reduced motion; 200% CSS zoom and landscape overflow checks. CSS zoom is not physical Safari pinch zoom.
- Automated accessibility checks do not establish VoiceOver or physical iPhone acceptance. Global inherited chrome is not changed or claimed rebranded: legacy SCOUT navigation/ecosystem footer remain outside the new desk.
- Focused tests are standalone under owned paths. Root test/CI workflows are not altered to add them; reviewers must run the command above. No full SQL-backed regression suite was run because this task forbids SQL. No green full-CI claim.

## Screenshot inventory

All images carry a DOM-injected **LOCAL TEST · MANUAL PROTOTYPE · NO LIVE DATA** label; the label is test-only, not product code. Empty and reason-only PASS are full-page captures, not live market demonstrations.

| Viewport | Empty / unavailable | Manual PASS |
| --- | --- | --- |
| 320 | [Empty](../../tests/desk/screenshots/empty-320.png) | [PASS](../../tests/desk/screenshots/pass-320.png) |
| 390 | [Empty](../../tests/desk/screenshots/empty-390.png) | [PASS](../../tests/desk/screenshots/pass-390.png) |
| 1280 | [Empty](../../tests/desk/screenshots/empty-1280.png) | [PASS](../../tests/desk/screenshots/pass-1280.png) |

## Founder iPhone acceptance · pending, no source/control action

- [ ] On a separately approved protected review environment, confirm exact PR head and normal existing protection. No bypass or credentials in the desk.
- [ ] Safari portrait at 320/390-equivalent widths: readable single column, no horizontal scroll; keyboard does not trap fields or obscure the active control. Landscape and pinch/text zoom remain usable.
- [ ] VoiceOver: heading order, every label/help text, checkbox, completeness disclosure, blocked PLAN explanation and manual decision receipt read coherently. Focus moves to outcome on a choice.
- [ ] With empty fields, select PLAN: explanation appears. Fill every field manually: PLAN remains blocked; risk preview remains unconnected.
- [ ] Enter a reason only: PASS succeeds. Choose WATCH with missing data: no implied verified facts or approved budget.
- [ ] Edit after a decision: receipt clears. Clear draft and refresh remove entered app state. Check back/forward behavior separately; do not assume secure browser erasure.
- [ ] Confirm unavailable identity/source clocks, no provider prompts, no wallet/exchange or BUY/SELL action and no connection to STOP controls. Do not test any existing STOP from this checklist.

## Release blockers / limits / rollback

Draft review only. Pending: reviewed exact A/B heads and adapter integration; numeric risk field UI; manual-vs-sourced PLAN policy; actual iPhone/VoiceOver acceptance; protected-route/SSO acceptance on a separately authorized target; persistence/privacy/retention design and legal/source-rights review before any broader product release. Static `/desk` inherits existing platform protection; this work creates no new application-level authentication. It must not be treated as a new public journal or a protected-data store. Global chrome redesign is outside C's ownership.

Only `app/desk/**`, `tests/desk/**` and this file change. Existing authentication, API/source gates, v1/continuous STOP, A/B code, collector commits, database and Vercel configuration stay byte-identical to base. No SQL, credentials, sources, merge, deployment command or activation performed. No new dependencies.

Rollback for a future separately approved release: revert the additive C commit / remove `/desk` and its scoped tests/docs through review. No database rollback, STOP change or source restart is involved. No release/deployment is authorized by this draft.
