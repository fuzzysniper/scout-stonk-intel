# Token Quick View V1 — Issue #64

Actual iPhone feedback on PR #60 failed the research experience: opening Details exposed a technical wall, and the dossier put a mint input before useful facts. This frontend change starts from `f4ea31c`, latest main with merged PR #60.

The selected-pair list, verified choices, search, default sampled-liquidity sort and source gates remain intact. Chevron Details now opens a brief with **two reported USD figures and one reward conclusion**, Open dossier, Copy research link and an explicit Close. Technical evidence is a separate, initially closed native disclosure, with original source access first. Closing by button, chevron or Escape resets that disclosure; Escape/Close returns focus to the row toggle. The token name remains a real exact-mint dossier link.

The dossier puts identity, reward quote label, DexScreener pool liquidity/24h volume, one cumulative-report conclusion and two actions above the fold. Its mint lookup starts closed and follows the brief. Submitting a mint dismisses editable focus and navigates to the actual dossier URL, refreshing server-generated OG metadata. There is no automatic input focus. Failed copying exposes selectable noneditable text only after an explicit failed copy attempt; focusing that text selects its contents without an input or `contenteditable` element.

## Financial and source boundaries

- The pair frontend still uses the unchanged optional `rewardEvidence` validator and strict server contract. **Settings verified** means setup; **Lifetime reported** means a cumulative ledger with unknown start/cutoff; **Interval covered** means dated counter changes across gated windows. None establishes paid holders or ROI. Invalid/stale/unavailable evidence cannot fall through to a stronger legacy claim.
- The dossier uses its **existing** `/api/token`, `/api/rewards` and `/api/history` responses. The legacy reward endpoint does not supply the pair contract’s strict settings/interval verification. A non-null API-reported total, including genuine zero, is labeled Lifetime reported; no usable total is Rewards unverified. It never promotes that endpoint to Settings verified or Interval covered. Its rounded total explicitly has unknown cutoff; full precision and original timestamps stay in Technical evidence.
- Market sources differ: selected-pair snapshots are StonkFun catalog reports; the dossier uses DexScreener’s highest reported-liquidity Solana pool, which may not be StonkFun and may have a different trading quote. Both are labeled. The dossier lists the market base/quote addresses separately from the reward quote mint. It identifies the selected token by exact base/quote address, never blindly substitutes the other side’s name.
- Missing market values read Unknown in the brief; genuine zero stays `$0`. Null reward totals do not become zero or a reported distribution. Very small positive values stay positive. No new financial calculations, rankings, provider queries or backend policy were introduced.
- Original exact token/quote/pool identities, reward states, counter amounts, coverage, timestamps, revisions, warnings and source links remain available. Unsupported return fields are behind the disclosure, away from the quick brief. Dossier optional metrics render only when present; one explanation covers missing holder returns.
- Material row warnings remain visible. Existing history source failure/degradation, stale data and quality warnings also surface outside the folded dossier evidence; this optional presentation callback does not change history calculations or gates.

## Genuine before/after captures

Each PNG is an unedited Chromium capture of the local **production build with real upstream responses**, 844px high. Mobile contexts use touch/mobile emulation at 320/390px; desktop is 1280px. These are not physical iPhone or Safari system-keyboard captures. No route interception or fixtures were used for these images. SI/Super Inu is selected within the exact NVDAX mint sample. The separate unverified-token journey uses CHONK/Le Chonk. Generated token marks remain mint mnemonics, not official project logos.

| Width | Selected first six | Open SI quick view | SI dossier above fold | Deliberately expanded evidence |
| --- | --- | --- | --- | --- |
| 320 | [Before](screenshots/token-quick-view-before-list-320.png) / [After](screenshots/token-quick-view-after-list-320.png) | [Before](screenshots/token-quick-view-before-quick-320.png) / [After](screenshots/token-quick-view-after-quick-320.png) | [Before](screenshots/token-quick-view-before-dossier-320.png) / [After](screenshots/token-quick-view-after-dossier-320.png) | [Row](screenshots/token-quick-view-after-technical-320.png) / [Dossier](screenshots/token-quick-view-after-dossier-evidence-320.png) |
| 390 | [Before](screenshots/token-quick-view-before-list-390.png) / [After](screenshots/token-quick-view-after-list-390.png) | [Before](screenshots/token-quick-view-before-quick-390.png) / [After](screenshots/token-quick-view-after-quick-390.png) | [Before](screenshots/token-quick-view-before-dossier-390.png) / [After](screenshots/token-quick-view-after-dossier-390.png) | [Row](screenshots/token-quick-view-after-technical-390.png) / [Dossier](screenshots/token-quick-view-after-dossier-evidence-390.png) |
| 1280 | [Before](screenshots/token-quick-view-before-list-1280.png) / [After](screenshots/token-quick-view-after-list-1280.png) | [Before](screenshots/token-quick-view-before-quick-1280.png) / [After](screenshots/token-quick-view-after-quick-1280.png) | [Before](screenshots/token-quick-view-before-dossier-1280.png) / [After](screenshots/token-quick-view-after-dossier-1280.png) | [Row](screenshots/token-quick-view-after-technical-1280.png) / [Dossier](screenshots/token-quick-view-after-dossier-evidence-1280.png) |

[Unverified-token dossier, genuine 390px](screenshots/token-quick-view-after-unverified-dossier-390.png). Before expanded-evidence images and before/after homepage images are also in `docs/screenshots/token-quick-view-*`.

Raw public local API packets, focus observations, first-six geometry and capture times are preserved in [before](evidence/token-quick-view-before.json) and [after](evidence/token-quick-view-after.json). Before/after requests occur at different times and can differ in figures, source availability and reward freshness; they are not synchronized financial comparisons. All six rows remain 65px and fit at every requested width. The fresh capture may legitimately show Unverified where the earlier capture showed a lifetime report; stale evidence must not be made attractive by relabeling it.

## Validation and reproducibility

Use Node 24, npm 11, Python Playwright, system Chromium and axe-core 4.10.3. Preserve environment proxy/CA settings; public source access is required. Browser QA is run against `next build` + `next start`, never a fixture-only preview. Do not rebuild that same `.next` while a QA server is running.

```sh
npm ci --cache /tmp/scout64-npm-cache
SCOUT_REWARD_UI_FIXTURES=/tmp/scout64-reward-fixtures.json npm test
npx tsc --noEmit
npm run lint
npm run build
npm run archive:dry-run
NODE_USE_ENV_PROXY=1 npm start -- --port 3183
python3 tests/token-quick-view-capture.py --base http://localhost:3183 --phase after
python3 tests/reward-clarity-browser.py --base http://localhost:3183 --axe /tmp/scout-qa/package/axe.min.js --prefix token-quick-view --reward-fixtures /tmp/scout64-reward-fixtures.json
python3 tests/token-quick-view-browser.py --base http://localhost:3183 --axe /tmp/scout-qa/package/axe.min.js
SCOUT_VERIFY_ENV_PROXY=1 npm run verify:release -- --target preview --base http://localhost:3183
```

Before captures use the same capture script against a production build of `f4ea31c` **before editing source**. The `SCOUT_REWARD_UI_FIXTURES` export is an offline synthetic backend-derived test artifact, not production data, and is never used for screenshots. Browser fixtures are isolated to test contexts.

Results: **500 app tests passed** (423 JavaScript, 62 Python, 15 isolated scheduler tests), with typecheck, zero-warning lint, production build, archive dry-run and proxy-enabled local archive smoke passing. The quick-view browser suite passed **43 checks**, including two genuine decoded OG images; the full reward browser suite passed **103 checks**, for **146 browser checks total**, with OG passing. The app suite covers unchanged data/math/archive/source gates plus two new disclosure/copy regressions. The reward browser suite checks the unchanged homepage, first-six rows, local sorting without extra requests, all legacy error/missing states, 11 optional reward-evidence cases plus five forged/invalid cases at all three widths, 200% reflow, WCAG A/AA via axe, keyboard/touch, genuine clipboard, exact deep links, native-share payload/cancel/denial and a decoded OG PNG. The quick-view suite adds genuine SI/CHONK row-to-dossier journeys and isolated dossier zero/null/tiny, selected-as-market-quote, stale/invalid/degraded/failed history, reward failure and clipboard failures. It also checks a real mint-form navigation updates the URL and OG mint.

Final results are recorded in [check results](evidence/token-quick-view-checks.json), [reward browser QA](evidence/token-quick-view-qa.json) and [quick-view browser QA](evidence/token-quick-view-browser.json). Genuine SI and CHONK OG images are [SI](evidence/token-quick-view-og-si.png) / [CHONK](evidence/token-quick-view-og-chonk.png); their returned bytes decode to 1200×630. The merged #62/#63 image fix is preserved with no `app/api/og` edits. The default production-host archive smoke command was attempted and reported `host_or_network_unreachable` in this environment; it is incomplete, not an app pass. Local preview archive smoke and the disposable archive dry-run are checked separately. No production host policy was bypassed.

## Critical cold-reader review

This is a critical self-review, **not claimed human acceptance**. The actual iPhone failures reported in #64 are the starting evidence.

| Five-second question | New visible answer | Remaining concern |
| --- | --- | --- |
| What coin is this? | Symbol, name when sourced, generated mark and reward quote label | Small tickers can collide. Exact mints remain one deliberate tap away; marks are not official logos. |
| What reward fact is established? | One neutral conclusion and qualifier; cumulative totals explicitly have unknown cutoff and never imply recent earnings | An Unverified pair row can open a legacy dossier reporting a cumulative total. The dossier labels that source boundary, but this still needs a cold-reader check. |
| Where is the evidence? | A plainly named Technical evidence disclosure adjacent to the actions | Evidence remains necessarily long once deliberately opened. It is an audit view, not a reading requirement. |
| Can I inspect/share/close quickly? | Open dossier or Copy research link; explicit Close plus chevron/Escape. Dossier copy/share actions are immediately visible. | Copy requires browser permission; failure uses selectable noneditable text. The native share sheet itself still needs physical-device validation. |

This change reduces the reading burden and makes real research links reachable; it does **not** establish that a crypto-native reader now wants to share SCOUT. A new reader was invited to review the genuine 390px images; no positive response is assumed. Human acceptance remains pending if no reply is available.

Physical iPhone checklist before approval:

- From the homepage, type in pair search, select verified NVDAX, open SI via chevron and via its name. The system keyboard must dismiss and stay dismissed; do not require a manual keyboard close to see the brief.
- Close/reopen the quick view and Technical evidence with touch. The summary must reopen folded and the page must keep a sensible scroll position.
- Copy research link, reopen its exact mint, use the iOS share sheet and cancel. Try denied clipboard access: long-press the noneditable fallback must allow selection without editing or showing the keyboard.
- Inspect another token by mint and submit from the keyboard. The new dossier and sharing metadata must identify the new exact mint, with lookup folded again.
- VoiceOver: identity and conclusion are intelligible, Details and Technical evidence expose expanded state, focus does not enter hidden evidence, Close returns to the originating toggle, and statuses announce without moving to an input.
- Repeat with larger text, landscape and an unverified token. Ask a cold reader to distinguish cumulative reporting from recent flow and paid-holder/ROI verification, and to locate the original source in one deliberate expansion.

## Scope, risks and rollback

Only frontend components, scoped CSS, tests and documentation/artifacts change. `app/page.tsx`, `app/pairs/results.ts`, all `lib/`, `app/api/` (including OG), data, dependencies, collectors and Cloudflare/workflow files are unchanged. Existing financial calculations and API contracts remain authoritative. The history component gains only an optional presentation callback; other callers keep their existing UI.

Presentation risk is hiding a material problem inside a disclosure; visible row warnings and the dossier quality callback are specifically covered by tests. The dossier remains a different, weaker legacy source surface than strict pair evidence; it does not acquire new discovery or verification capabilities. Freshness and incomplete-sample limitations remain real product constraints. Physical Safari keyboard/VoiceOver and desire-to-share acceptance are outstanding human checks.

Rollback: revert this feature commit (or the human-reviewed merge commit later) and rebuild through the normal human release process. There is no migration, backend contract change, data rewrite, collection activation or infrastructure state to undo. Keep the baseline screenshot/evidence packet for comparison. This PR is review only; no merge or deployment is performed.
