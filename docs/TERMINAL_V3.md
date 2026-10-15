# SCOUT Terminal V3 — Issue #72

Base at task start: `858f0d3` (latest main, including dossier #70 and infrastructure #71). Frontend work only; no backend, financial math, collection or infrastructure changes.

## Visual directions considered

1. **Graphite workspace — selected.** A quiet neutral background, modest SCOUT wordmark, one large search field, subdued mint accent and financial figures aligned to a shared grid. Discovery is the first task; evidence remains immediately accessible on demand. The restrained frame suits long research sessions and keeps 65px rows legible on phones.
2. **Light research ledger.** Off-white surfaces and fine gray rules would provide editorial clarity, but introduce an unrelated theme system and need a second contrast/market-state audit across existing dossiers. More scope than this task needs.
3. **Deep blue command terminal.** A denser blue/navy search palette could feel familiar to crypto-native analysts, but sits too close to the current layered panels and risks making badges/alerts compete with figures. The selected direction uses color sparingly instead.

These are design rationales, not fabricated browser screenshots. No copied assets, branding or exact layouts from Linear, Koyfin or DefiLlama are used.

## Genuine before / after review

All images below are unedited local production Chromium captures, with real upstream responses (no route interception, fixture data, compositing or drawn mockups). Mobile means touch/viewport emulation at 320/390 × 844, not proof from a physical iPhone or Safari system keyboard. Desktop is 1280 × 844. API bodies, request timings, build IDs and geometry are retained in [before](evidence/terminal-v3-before.json) and [after](evidence/terminal-v3-after.json). Separate runs have separate source clocks: changing figures and evidence states must not be read as performance or return comparisons.

| View | 320 before / after | 390 before / after | 1280 before / after |
| --- | --- | --- | --- |
| Landing | [Before](screenshots/terminal-v3-before-home-320.png) · [After](screenshots/terminal-v3-after-home-320.png) | [Before](screenshots/terminal-v3-before-home-390.png) · [After](screenshots/terminal-v3-after-home-390.png) | [Before](screenshots/terminal-v3-before-home-1280.png) · [After](screenshots/terminal-v3-after-home-1280.png) |
| Active search | [Before](screenshots/terminal-v3-before-search-320.png) · [After](screenshots/terminal-v3-after-search-320.png) | [Before](screenshots/terminal-v3-before-search-390.png) · [After](screenshots/terminal-v3-after-search-390.png) | [Before](screenshots/terminal-v3-before-search-1280.png) · [After](screenshots/terminal-v3-after-search-1280.png) |
| Selected NVDAX, at scroll 0 | [Before](screenshots/terminal-v3-before-selected-320.png) · [After](screenshots/terminal-v3-after-selected-320.png) | [Before](screenshots/terminal-v3-before-selected-390.png) · [After](screenshots/terminal-v3-after-selected-390.png) | [Before](screenshots/terminal-v3-before-selected-1280.png) · [After](screenshots/terminal-v3-after-selected-1280.png) |
| First six rows, aligned to results | [Before](screenshots/terminal-v3-before-list-320.png) · [After](screenshots/terminal-v3-after-list-320.png) | [Before](screenshots/terminal-v3-before-list-390.png) · [After](screenshots/terminal-v3-after-list-390.png) | [Before](screenshots/terminal-v3-before-list-1280.png) · [After](screenshots/terminal-v3-after-list-1280.png) |
| Opened SI quick view | [Before](screenshots/terminal-v3-before-quick-320.png) · [After](screenshots/terminal-v3-after-quick-320.png) | [Before](screenshots/terminal-v3-before-quick-390.png) · [After](screenshots/terminal-v3-after-quick-390.png) | [Before](screenshots/terminal-v3-before-quick-1280.png) · [After](screenshots/terminal-v3-after-quick-1280.png) |
| SI dossier above the fold | [Before](screenshots/terminal-v3-before-dossier-320.png) · [After](screenshots/terminal-v3-after-dossier-320.png) | [Before](screenshots/terminal-v3-before-dossier-390.png) · [After](screenshots/terminal-v3-after-dossier-390.png) | [Before](screenshots/terminal-v3-before-dossier-1280.png) · [After](screenshots/terminal-v3-after-dossier-1280.png) |

### What changed

- One purpose statement and one search for official quote identities. No four-asset panel, nested More menu, default selection or automatic keyboard. Optional examples are the first three identities returned by the verified registry; they are not endorsements, leaders or a static universe.
- Search covers names, tickers and original-case exact mints through the existing `/api/pair-quotes` endpoint. Duplicate symbols expose distinct names and short mints; accessible option labels retain full mints. 12 identities per page, at most 48 in a search window; refine instead of crawling. 300ms typed-query debounce, abort on supersession/unmount, 15s deadline and explicit retry. Initial registry read has no typing delay.
- A selected quote has a compact symbol/name/mint line and sampled count. The default local liquidity sort remains; volume/name sorts never change membership or fetch sources. 65px token rows, generated mint marks, sourced USD figures and one reward label are preserved. Phones show liquidity or volume according to the sort, and quick view always shows both.
- One sampling note. Material source/history warnings remain visible. Evidence key, source receipts, full identities/times and sampling methodology open deliberately. `Settings verified`, `Lifetime reported`, `Interval covered`, `No reward mode` and `Unverified` keep the unchanged strict evidence logic. None verifies holder payments, profit, recent earning rates or ROI. Missing values remain unknown; sourced zero remains zero.
- Existing token mint lookup is folded near the utility footer. Archive, data status, Radar and About remain available there; Guide remains in the header. The large global ecosystem footer is suppressed only in the terminal workspace; About preserves access to the existing relationship statement. Other routes retain their existing footer and navigation. No relationship/tokenomics content is changed.
- Dossier endpoints, deep links, source gates and social image routes are untouched. Quick view still closes with focus restoration and preserves exact-mint clipboard/dossier actions. No new fonts, images, packages, analytics or third-party calls.

### Critical visual / five-second review

The landing now gives one obvious action instead of four dominant choices plus a second search. The neutral frame, type hierarchy, aligned USD figures and thin rules produce a calmer research workspace. On the selected screen six complete rows fit without scrolling at each required width. The old green active-Home tab and unreliable font arrows were identified in the first capture pass and corrected before final screenshots. A keyboard-driven selection intentionally leaves a visible focus outline around the selected quote heading; it is not decorative UI.

Tradeoffs remain. The empty landing deliberately has substantial whitespace; it does not imply a loaded market screener before a quote is chosen. Registry examples can be unfamiliar names because they follow the provider registry order, not curated financial assets. “Quote asset” assumes a crypto-native reader. On 320px long project names truncate, with the full name on the linked identity/quick view; the second USD metric requires Volume or Details. Folding the evidence key trades upfront explanation for scanability; unfamiliar evidence labels still require one tap. A sparse design and passing tests alone do not prove that someone will share SCOUT. The researcher’s next action is deliberately explicit: open a row, inspect evidence, copy its exact-token dossier.

Cold-reader hypothesis (self-review, not a user-study result): within five seconds a new analyst should identify search as the starting point, recognize NVDAX as the selected exact quote, read the largest figures as USD liquidity within a limited sample, and see “Unverified” or the specific evidence tier rather than infer verified holder earnings. A human five-second question has been requested; acceptance remains pending until an actual answer is recorded.

### Human-device acceptance checklist (pending)

No physical iPhone/Safari or VoiceOver was available in this environment. Before any separate production decision, the owner should:

- Open the landing on iPhone Safari: keyboard stays closed until search is tapped; search text is 16px and does not trigger input zoom.
- Type a name/ticker, paste an exact mint, clear it and select with touch. Confirm the system keyboard dismisses after choosing; results and quick-view actions remain reachable. Test back/forward, rotation and Safari’s changing toolbar height.
- Use VoiceOver: labelled combobox, announced loading/result count, distinct duplicate-ticker options and active selection; no focus trap. Hardware keyboard arrows/Enter/Escape/Cmd-K must work. Review whether speaking full mint identities is acceptably efficient.
- Use Dynamic Type/200% zoom, reduced motion and increased contrast. Confirm every material warning remains readable, the active metric is clear and long identities reflow in evidence.
- Open token Details and dossier; close folds with focus retained; copy/reopen an exact-mint link and inspect the delivered social card. A copied link identifies a token, not a frozen snapshot.
- Ask a first-time reader the five-second question above and whether they would share the evidence link. Record their words and any confusion rather than treating automated checks as acceptance.

### Rollback

Revert this frontend feature commit/PR through a normal reviewed revert. No API/schema migration, registry/data rewrite, scheduler or infrastructure rollback is needed. The prior pair selector and evidence presentation return with the revert. This PR does not merge, deploy, activate collection or approve production.

## Reproduce the checks

Baseline screenshots were captured from `858f0d3` before changing app code. Run capture scripts only against the corresponding built checkout: each recording includes that checkout’s `.next/BUILD_ID`. To reproduce the after review, use Node 24/npm 11, local Python Playwright + system Chromium + axe-core 4.10.3 (kept under `/tmp`, no repository dependency change). Preserve the environment’s proxy/CA settings. Network-enabled local execution is needed for Chromium/Miniflare sockets and public source reads.

```sh
npm ci
SCOUT_REWARD_UI_FIXTURES=/tmp/scout72-reward-fixtures.json npm test
npx tsc --noEmit
npm run lint
npm run build
npm run archive:dry-run
NODE_USE_ENV_PROXY=1 npm start -- --port 3204
# In another shell; do not rebuild .next while this QA server is in use.
python tests/terminal-v3-capture.py --base http://localhost:3204 --phase after
python tests/terminal-v3-browser.py --base http://localhost:3204 --axe /tmp/scout72-axe/package/axe.min.js
python tests/reward-clarity-browser.py --base http://localhost:3204 --axe /tmp/scout72-axe/package/axe.min.js --prefix terminal-v3 --reward-fixtures /tmp/scout72-reward-fixtures.json
python tests/token-quick-view-browser.py --base http://localhost:3204 --axe /tmp/scout72-axe/package/axe.min.js --prefix terminal-v3
python tests/dossier-evidence-browser.py --base http://localhost:3204 --axe /tmp/scout72-axe/package/axe.min.js --prefix terminal-v3 --fixtures /tmp/scout72-reward-fixtures.json
SCOUT_VERIFY_ENV_PROXY=1 npm run verify:release -- --target preview --base http://localhost:3204
```

`preview` above means read-only verification of the local server; it does not publish or deploy. Fault, forged-contract, zero/null, stale and clipboard fixtures are isolated in browser contexts and never used to make the screenshots. The existing reward/dossier suites now accept the registry search entry path and retain their financial/source/share assertions. Historical fixed-four capture scripts describe older revisions; `terminal-v3-capture.py` is the current capture entry point.

## Observed performance and screen density

[Recorded comparison](evidence/terminal-v3-performance.json). These are local observations from separate real-source runs, not statistically controlled benchmarks or upstream request counts. The first 390px run warms each process; source/network/cache conditions differ.

| Width | Initial app API reads, before → after | Last initial API response, ms from navigation | Complete rows among first six at scroll 0 | Sixth row bottom, before → after |
| --- | --- | --- | --- | --- |
| 320 | 4 → 1 | 349 → 226 | 1 → 6 | 1149.9px → 801px |
| 390 | 4 → 1 | 1602 → 1430 | 1 → 6 | 1110.9px → 784.5px |
| 1280 | 4 → 1 | 376 → 237 | 2 → 6 | 1071px → 795.8px |

All first-six scan rows remain exactly 65px. The initial app API request count falls 75%, from four preset reads to one registry page; Next route prefetches observed in the baseline are also removed from the landing utilities (six observed fetches → one). This does not assert four upstream provider requests became one: server caching/coalescing remains unchanged and is not measured here. No token/radar discovery occurs before explicit selection. A settled name/ticker search remains one registry request after the debounce; rapid 40ms/key typing is checked in the browser report. Sorting makes no requests. Next reports home route JS 25.4 → 25.7kB and first-load JS 136 → 137kB; no new runtime dependencies or remote asset payloads.

## Verification results

All required commands exit 0: `npm ci`; **544 app tests** (462 JavaScript, 64 Python, 18 isolated scheduler); typecheck; lint with zero warnings; production build; local archive dry-run; proxy-enabled read-only release/archive smoke against the final local production build. [Command/PNG manifest](evidence/terminal-v3-validation.json), [archive proof](evidence/terminal-v3-archive.json), [release smoke](evidence/terminal-v3-release.json).

**255 browser checks pass**: [25 search/terminal](evidence/terminal-v3-search-qa.json), [103 reward/source/share](evidence/terminal-v3-qa.json), [43 quick-view/dossier](evidence/terminal-v3-browser.json), [84 dossier evidence](evidence/terminal-v3-semantic-browser.json). All three widths, six 65px rows, real AAVE discovery outside the old four, duplicate ticker identities, keyboard/touch selection, clear/Escape/Ctrl-K, debounce/no token fanout, 48-result cap, scroll-region focus at the cap, revision restart, abort/deadline/late-response rejection, 429/503/malformed/empty responses, null/zero/tiny values, source warnings, strict reward tiers and forged evidence, clipboard fallbacks, 200% reflow, no horizontal overflow/page exceptions, exact-mint links and share payload/cancel/denial are covered. Axe finds zero violations under WCAG 2 A/AA and 2.1 AA tags in tested states; this is not a full accessibility certification. IME handling is guarded in code; actual composition/VoiceOver needs the device checklist.

Genuine OG responses decode as **1200 × 630 PNGs**, including SI and CHONK; [delivery report](evidence/terminal-v3-og.json). No OG/API implementation was edited. [Scope proof](evidence/terminal-v3-scope.json) records unchanged financial label logic, row/quick-view implementation, source/identity adapters, dossier evidence, exact-mint/share helpers and protected paths.

Physical Safari, system-keyboard and VoiceOver acceptance remain pending. The requested current five-second human review has no answer as of this recording; no human usability pass or willingness-to-share claim is made. No merge/deploy or production activation is performed.
