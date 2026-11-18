# Guided Decision Desk · #192 · founder review

2026-10-28. **DRAFT, not release authorization.** Fresh main was fetched and independently verified with `ls-remote` before branching: `ba4b2e494f768350ec285e26791b61a90c50220b`. Exact #191 `d838cb138f9642a2b4a4572ddf432e5f7df9614b` is preserved as a merge ancestor in this new branch. Original #191 remains untouched, draft and unmerged. Exact delivery head and CI links are in the new draft PR.

## The change that matters

The founder rejected the long developer form on a physical iPhone. This follow-up replaces its primary flow with **CONSIDER → THESIS → RISK → DECIDE**, one stage at a time. It does not ask the founder to repeat the old long-form acceptance test.

| Stage | Main task | Next action |
| --- | --- | --- |
| Consider | “What are you considering?” One manual asset input. | Research / Plan / Watch; PASS always available. |
| Thesis | Why it might work, what could go wrong, what remains unknown; purpose and horizon. | Continue to risk, or decide for now. |
| Risk | Four smaller checks: prices/holding → time/exit → capital/limits → costs. | Back/next keeps this session’s inputs. |
| Decide | Written reason, concise actual model when available, explicit choice and acknowledgements. | Record MANUAL PLAN / WATCH / PASS, or correct a specific linked blocker. |

Entry actions are visible without scrolling at 320×740/390×844/1280×900. PASS is two deliberate button actions: PASS → type reason → Record PASS. No asset or risk input is needed. WATCH can record incomplete research; unfinished risk assumptions are excluded from WATCH/PASS records and are never reported as approved. Inputs remain in page memory for further editing. Research does not implicitly select PLAN. Selecting Plan at the entry is an explicit manual planning intent, not approval.

The legacy Terminal/Radar/Daily Brief header and ecosystem footer are removed **only at `/desk`** by one exact pathname exception; all other routes retain their existing chrome. No large introduction, canonical keys, BPS, source-policy or ledger terminology in the primary workflow. Identity details, provenance limitations, model precision details, research notes and optional quantity use disclosure controls.

Market data remains disconnected. An unresolved ticker stays unresolved. Optional chain/listing formatting invokes actual A identity logic; recognition is never labeled asset verification. Source observation time and source facts remain unavailable. “Trade the thesis. Not the dopamine.” is product direction, not an investment claim.

## Validation and safety that remain real

- A #188 `65c42e8ee41f165c273a5bdcfaa8c63f84bce4bb` and B #189 `36ede0e45046d8dba5a5163cc57ebc94434e2513` libraries/tests remain byte-identical, as does #191’s `app/desk/integration/model.ts`. Coordination is recorded on [#192](https://github.com/fuzzysniper/scout-stonk-intel/issues/192#issuecomment-6457366184), building on the [A/B contract discussion](https://github.com/fuzzysniper/scout-stonk-intel/issues/186).
- Journey calls the existing actual A/B adapter. MANUAL PLAN requires actual `evaluateRiskPlan`, non-null calculation, `recordDecision`, and explicit owner/cost acknowledgements. Record time is checked again; page navigation never refreshes an assumption’s time.
- No financial arithmetic is duplicated. New presentation conversion is **exact decimal percent → integer BPS** using integer arithmetic: at most two percent decimals, range 0–100. No floating point, rounding, clamping or fallback zero. All 10,001 supported BPS values are exhaustively round-tripped in one test, plus malformed/excess-precision cases. Prices, money and quantities remain original exact decimal strings validated by B.
- Cash, exposure, costs, capital, allocation, entry, exit, time and validity have no numerical defaults. Missing is unknown; genuine zero is explicit. Currency and unleveraged holding context are explicit choices. Omitted costs stay unestimated, not known zero.
- Every input change invalidates a receipt and owner acknowledgement; changing cost assumptions also invalidates the cost acknowledgement. Moving between stages keeps inputs. Both acknowledgements are on the final decision screen, after the reason, so ordinary navigation does not force repeated confirmation.
- The model distinguishes proposed quantity from an arithmetic ceiling; neither is an order. Actual loss can exceed the planned loss; a stop is not a guaranteed exit. Manual recordability never means source verification or an approved investment.
- Session memory only; no saved journal, API, source, wallet, trade, tracking, cookies or application storage. Refresh/pagehide clears the draft. Browser restoration is not secure erasure; use Clear this session on shared devices. There is no implicit user data export.
- API/auth/CSP/Origin/STOP/TLS, source controls, Helius/Render/Neon/Vercel settings, dependencies, collector/data, scheduler and production are unchanged. No new SQL or database schema change. Existing root/security CI retains disposable local PostgreSQL fixtures; no operational/hosted SQL is authorized or performed.

## Evidence and repeatable tests

Flow: manual fields → exact presentation conversion → unchanged A/B adapter → actual model/record or linked blockers → in-memory receipt. Browser tests do not stub A/B or invent market responses. All numeric browser inputs are labeled invented LOCAL TEST assumptions.

Commands (from repo root):

```sh
bash tests/desk-journey/run.sh
bash tests/desk-journey/historical.sh focused
npx tsc --noEmit
npm run lint
npm run build
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/desk-journey/playwright.config.mjs
```

Local results: 103 adapter tests (57 unchanged #191 adapter + 46 new journey cases) and 4 current-head scope/security tests passed. Historical exact #191: 60 adapter/scope + C3; A118 and B171 suites passed unmodified. Typecheck, lint and optimized production build passed; new desk is statically rendered, approximately 18.5 kB route / 121 kB first-load JS. Existing edge-runtime build notice remains unrelated.

30 actual optimized-app browser cases passed at 320×740 / 390×844 / 1280×900: entry visibility; immediate reason-only PASS; incomplete WATCH; back/next; real guided MANUAL PLAN with exact 50 USD modeled loss / 500 USD modeled cash in the invented test; no implicit numerical defaults; missing checks with focused correction; stop/future-time/over-budget/percentage failures; edit/refresh/clear; keyboard/focus; full-page axe WCAG A/AA; 200% CSS zoom, reduced motion and landscape. Every case asserts zero API/third-party requests, storage access, IndexedDB opens, cookies and page errors. CSS zoom is not a physical Safari pinch/text-zoom acceptance claim. Exhaustive decimal conversion cases are not counted as thousands of user tests.

The new scope test pins #191 ancestry and every inherited file/mode except the exact route switch and additive CI wiring. It pins the one `/desk` chrome exception and verifies latest-main collector/security paths remain unchanged. Historical #191’s frozen route/scope and browser tests are preserved **in an isolated exact-#191 worktree**, not relaxed to match the new UX. Current-head journey tests and original adapter regressions run against the new code. Full A/B suites retain their original branch guards. CI also keeps full existing root regression, types/lint/build/archive, current legacy homepage browser tests, actual default-OFF API checks and native local HTTPS/PG STOP/security checks. No tests are skipped to claim green. Exact-head remote results are reported in the draft PR after inspection.

## LOCAL TEST screenshots

All captures visibly label invented manual assumptions, no live data. These are Chromium emulation, not physical iPhone evidence.

| State | 320 | 390 | 1280 |
| --- | --- | --- | --- |
| Consider / entry | [PNG](../../tests/desk-journey/screenshots/consider-320.png) | [PNG](../../tests/desk-journey/screenshots/consider-390.png) | [PNG](../../tests/desk-journey/screenshots/consider-1280.png) |
| Risk / progressive check | [PNG](../../tests/desk-journey/screenshots/risk-320.png) | [PNG](../../tests/desk-journey/screenshots/risk-390.png) | [PNG](../../tests/desk-journey/screenshots/risk-1280.png) |
| Actual manual PLAN receipt | [PNG](../../tests/desk-journey/screenshots/plan-320.png) | [PNG](../../tests/desk-journey/screenshots/plan-390.png) | [PNG](../../tests/desk-journey/screenshots/plan-1280.png) |
| Reason-only PASS | [PNG](../../tests/desk-journey/screenshots/pass-320.png) | [PNG](../../tests/desk-journey/screenshots/pass-390.png) | [PNG](../../tests/desk-journey/screenshots/pass-1280.png) |

## New founder acceptance · release blocker

Do not repeat the rejected #191 manual-plan script. On a separately approved protected review target for the exact new head:

- [ ] In under five seconds, identify what to do next without external instructions. Research, Plan, Watch and PASS should be understandable. Automated viewport checks cannot prove comprehension.
- [ ] Type any unresolved reference, choose PASS, write a reason and record it within three deliberate taps after typing. No mandatory risk form.
- [ ] Start Research, write a tentative thesis, go back, choose Watch, record a reason despite incomplete research. Check the difference between “recorded this session” and saved history.
- [ ] Start a manual plan and follow the four stages using your own hypothetical numbers, including time/cash/exposure/cost choices. Understand the quantity ceiling versus a chosen quantity. No ChatGPT-guided old-form instructions required.
- [ ] A wrong exit price or over-budget quantity explains what needs fixing and takes you to that field. No data loss when going back/next. Refresh and Clear this session clear app state.
- [ ] Safari portrait/landscape, keyboard open/closed, pinch/text zoom and VoiceOver: all labels, progress, current step, focus changes, disclosure controls, errors and final receipt read correctly. No horizontal scrolling or trapped focus.
- [ ] You can distinguish manual assumptions, unavailable market data, an unverified asset, model uncertainty and an unexecuted decision. Existing protection must still apply; no source/STOP action is part of this acceptance.

Pending release gates: physical Safari/VoiceOver and comprehension acceptance; ten actual manual research sessions from the parent charter; any journal/persistence/privacy/retention design; source rights/admission and public personalized-use legal review. No Helius/source GO, trades, merge or deployment is authorized by this UX PR.

Rollback: hold/close this new draft. For a separately authorized future release, revert the guided follow-up commit to the preserved #191 desk, or revert the aggregate through review. Do not reset any STOP/fence/counter, restart a source, mutate the ledger or roll back collector data. Original #191 and its exact source commits stay available and unmerged.
