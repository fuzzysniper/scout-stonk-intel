# Dossier Evidence V2 — Issue #69

Main at task start: `633ca3e` (merged quick-view PR #67 and reward-clock diagnostic PR #66). Human iPhone QA passed pair search/results and the token quick view, but the dossier still failed reward clarity and source access. This change is confined to the token dossier; the homepage, six-row screener, quick view, existing pair validators, backend APIs and infrastructure remain unchanged.

The first viewport now has one reward finding, one dated source/freshness qualifier and a direct **View official evidence** action. Copy/native share sit in a secondary Share research link disclosure. Technical Evidence remains a separate native disclosure with exact identities, raw amounts, timestamps, source receipts, history gaps, JSON links and limitations. Both disclosures close on Escape and restore focus to their own summary. No input receives automatic focus.

## Evidence semantics

| Existing source-backed state | Visible finding | What the reader can conclude |
| --- | --- | --- |
| Strict covered interval, positive counter change | Reward counter increase recorded | Settings confirmed; the exact quote-token counter change and actual dated period are recorded. Payments are not independently verified; holder returns unavailable. |
| Strict covered interval, genuine zero | No reward counter increase recorded | A recorded zero in that covered period, not missing data and not evidence of an individual holder’s return. |
| Strict mechanism only, or stale/unavailable lifetime | Reward settings confirmed by provider | Setup only; recent distributions and holder returns are not established. The settings-response date is identified as such. |
| Strict provider-reported lifetime total, without covered interval | Recent reward activity not verified | Settings may be confirmed, but a cumulative lifetime total does not verify recent distributions. No recent rate is calculated. |
| Strict standard mode | Provider reports no holder reward mode | The provider’s exact-mint standard-mode record is confirmed; covered distributions and holder returns are not established. |
| Missing/invalid/stale/unverified strict evidence, including absence from the limited sample | Recent reward activity not verified | Settings are not verified here. Recent distributions and holder returns are not established. Missing sample membership does not mean no token/rewards exist. |

The legacy `/api/rewards` mode flag and total **never upgrade** a dossier into strict settings or interval verification. Legacy lifetime values stay in Technical Evidence, labeled separately from strict evidence. A fresh legacy retrieval cannot make an old observation or unknown lifetime cutoff current. A rejected optional contract does not fall through to a positive legacy conclusion.

Dates are attached to the fact they qualify: covered flow uses the actual observation boundaries; settings confirmation uses the original provider settings-response clock. When a real last recorded observation is known, it stays identified and dated, with stale history visible. Retrieval, calculation/evaluation and reported last-payout timestamps are never substituted for the observation date. UTC timestamps, coverage and original receipts remain folded one tap deeper. Existing backend freshness and coverage gates are reused; no thresholds, deltas or financial calculations are added.

Material official-source staleness, rate limiting, identity/validation problems, history degradation/unavailability and quality warnings stay visible. An identity problem withholds the primary official-evidence link. Where no successful meaningful official record was read, the action is non-clickable **Official evidence unavailable**, not a speculative URL or fabricated edition.

## Existing read contract; no API additions

1. Retain the dossier’s existing parallel `/api/token?mint=<exact mint>` and `/api/rewards?mint=<exact mint>` reads and its existing HistoryPanel `/api/history` read.
2. Only a successful legacy record with the exact requested mint, canonical official record URL and valid retrieval timestamp may provide a quote-mint selector. If that quote mint is valid, make **one** existing bounded `/api/pairs?quoteMint=<exact mint>&discovery=pair` request. No global-catalog fallback, pagination loop, retry, polling, exhaustive crawl or direct provider request is added to the application.
3. Reuse the existing catalog parser and `readRewardEvidence` frontend guard, matching the exact token and quote. All registry identity, amount-string, source-receipt, precision, covered-window and holder-return gates stay authoritative. Missing sample membership and absent optional evidence stay unverified.
4. Reuse HistoryPanel’s already-read report through an optional presentation callback. No second history request or historical calculation is introduced. Other HistoryPanel callers retain their existing rendering.
5. The primary action uses the validated exact-token official response provenance, or a successfully read canonical legacy record when strict evidence is unavailable. Lookup/reference URLs without a successful record do not become the action. It opens the provider’s current JSON record in a new tab, **not a frozen SCOUT edition**. Original receipt hashes and clocks remain in Technical Evidence.

This frontend plan was recorded in [Issue #69](https://github.com/fuzzysniper/scout-stonk-intel/issues/69#issuecomment-6185790361). Issue #68 infrastructure, scheduler and permission work belongs to Agent A and is untouched.

USD liquidity and 24h volume remain separate DexScreener pool snapshots, not quote-token rewards or a synchronized StonkFun market. Market mint/base/quote must match the requested identity before figures are displayed. Missing values stay Unknown; real zero stays zero. Tiny positive USD and legacy audit amounts cannot round to a false zero. Exact quote units and provider precision stay in folded evidence; there is no APR, ROI, paid-holder verification, buy signal or universal earning rank.

## Genuine screenshots and public source evidence

The before build is unmodified main `633ca3e`. After captures use this branch’s local production build and real local API/upstream responses. PNGs are unedited Chromium touch/mobile viewport captures (844px high), with **no intercepted or synthetic screenshot data**. They are not physical iPhone/Safari system-keyboard or VoiceOver proof. Capture times, production build ID, focus state, first-six geometry and full public local source packets are in [before](evidence/dossier-evidence-before.json) and [after](evidence/dossier-evidence-after.json).

| Width | SI dossier above fold | Deliberately expanded Technical Evidence | Preserved successful surfaces |
| --- | --- | --- | --- |
| 320 | [Before](screenshots/dossier-evidence-before-dossier-320.png) / [After](screenshots/dossier-evidence-after-dossier-320.png) | [Before](screenshots/dossier-evidence-before-dossier-evidence-320.png) / [After](screenshots/dossier-evidence-after-dossier-evidence-320.png) | [Six rows](screenshots/dossier-evidence-after-list-320.png) / [Quick view](screenshots/dossier-evidence-after-quick-320.png) |
| 390 | [Before](screenshots/dossier-evidence-before-dossier-390.png) / [After](screenshots/dossier-evidence-after-dossier-390.png) | [Before](screenshots/dossier-evidence-before-dossier-evidence-390.png) / [After](screenshots/dossier-evidence-after-dossier-evidence-390.png) | [Six rows](screenshots/dossier-evidence-after-list-390.png) / [Quick view](screenshots/dossier-evidence-after-quick-390.png) |
| 1280 | [Before](screenshots/dossier-evidence-before-dossier-1280.png) / [After](screenshots/dossier-evidence-after-dossier-1280.png) | [Before](screenshots/dossier-evidence-before-dossier-evidence-1280.png) / [After](screenshots/dossier-evidence-after-dossier-evidence-1280.png) | [Six rows](screenshots/dossier-evidence-after-list-1280.png) / [Quick view](screenshots/dossier-evidence-after-quick-1280.png) |

Genuine second-token checks: [CHONK 320](screenshots/dossier-evidence-unverified-320.png), [390](screenshots/dossier-evidence-unverified-390.png), [1280](screenshots/dossier-evidence-unverified-1280.png). The six 65px result rows remain visible at all requested widths. Homepage before/after captures also remain in `docs/screenshots/dossier-evidence-*`; browser comparison checks layout/text stability. Generated token marks remain mint mnemonics, not official project logos.

Current genuine SI evidence is stale: the visible answer stays **Recent reward activity not verified**, with its actual last recorded observation dated, rather than turning its still-readable legacy cumulative counter into current activity. No positive settings/interval facts are manufactured for screenshots. Before/after requests happen at different times and can have different figures/source states; this is a UX comparison, not synchronized financial performance.

A separate **single bounded real GET** confirmed the primary SI official URL returned HTTP 200 and SI’s exact mint. Its original JSON body, hash, byte count and retrieval time are archived in [official-source proof](evidence/dossier-evidence-official-source.json). This verifies a meaningful source destination, not holder payments or provider freshness. Source lookup links do not imply independent reconciliation.

## Validation

Commands use Node 24/npm 11, Python Playwright, system Chromium and axe-core 4.10.3. Preserve proxy and CA configuration. The running QA server uses a completed production build; do not rebuild its `.next` during browser checks.

```sh
npm ci --cache /tmp/scout64-npm-cache
SCOUT_REWARD_UI_FIXTURES=/tmp/scout69-reward-fixtures.json npm test
npx tsc --noEmit
npm run lint
npm run build
npm run archive:dry-run
NODE_USE_ENV_PROXY=1 npm start -- --port 3193
python3 tests/dossier-evidence-capture.py --base http://localhost:3193 --phase after
python3 tests/reward-clarity-browser.py --base http://localhost:3193 --axe /tmp/scout-qa/package/axe.min.js --prefix dossier-evidence --reward-fixtures /tmp/scout69-reward-fixtures.json
python3 tests/token-quick-view-browser.py --base http://localhost:3193 --axe /tmp/scout-qa/package/axe.min.js --prefix dossier-evidence
python3 tests/dossier-evidence-browser.py --base http://localhost:3193 --axe /tmp/scout-qa/package/axe.min.js --fixtures /tmp/scout69-reward-fixtures.json
SCOUT_VERIFY_ENV_PROXY=1 npm run verify:release -- --target preview --base http://localhost:3193
```

Before captures use the same capture script against the baseline build, before source edits. The fixture export is explicitly synthetic/offline and is used only in isolated unit/browser contexts. It never enters the app, documentary data or screenshots.

**539 app tests passed** (462 JavaScript, 62 Python, 15 isolated scheduler), with typecheck, zero-warning lint, production build, archive dry-run and local release smoke passing. Dedicated browser suites passed **84 dossier evidence checks** and **43 quick-view/dossier checks**, including both decoded OG images. The full reward browser suite passed **103 checks**, for **230 browser checks total**.

The app suite includes dedicated dossier presentation tests covering every evidence tier, zero/null totals, missing/foreign/failed official URLs, exact source identity, invalid/foreign observation clocks, stale history, legacy non-promotion, invalid/forged contracts, source-affordance withholding and precise audit retention. Browser suites cover the preserved homepage/screener/quick view and all dossier tiers; missing/zero/tiny positives, wrong market identity, source failures, absent sample membership, stale dates despite fresh retrieval, identity warnings and forged amounts/units/returns/sources; keyboard/touch, Escape/focus, clipboard/native-share payload/cancel/denial, no editable autofocus, 200% reflow, WCAG A/AA via axe and both genuine OG PNGs decoded at 1200×630. No outgoing native share is sent during automation.

Final results and source-file hashes are in [checks](evidence/dossier-evidence-checks.json), [reward browser QA](evidence/dossier-evidence-qa.json), [quick-view/dossier regression QA](evidence/dossier-evidence-browser.json) and [new dossier semantic QA](evidence/dossier-evidence-semantic-browser.json). Archive dry-run and local release-smoke reports are separate evidence files. No backend or OG route change is needed.

## Critical five-second review and human acceptance

The three requested questions are tested directly in the visible DOM and were offered to a cold reader using the genuine 390px image. This is a **critical self-review and automated evidence, not a claimed human pass**; no unanswered invitation is counted as approval.

| Question | Current genuine SI answer | Critical limitation |
| --- | --- | --- |
| Was reward mode verified? | No: “Reward settings are not verified here,” with stale official settings clearly warned. | A stale verification is not proof that rewards stopped. The wording deliberately avoids that inference. |
| Was actual activity observed in a defensible recent period? | Recent distributions are unverified; the actual last recorded observation is dated and stale. A lifetime counter is not the answer. | Covered counter changes still are not reconciled individual holder payments; the positive synthetic state explicitly says so and is never screenshot evidence. |
| Where can I inspect the official source? | The first primary action opens the exact-token official record directly. | It is provider JSON, not a friendly provider dossier, and reopens the current endpoint rather than a frozen source edition. Original receipts/hashes remain in Technical Evidence. |

The new layout removes the misleading lifetime headline and the need to expand nested evidence to answer the first two questions. It does not prove renewed shareability or physical-device accessibility. A future backend can improve evidence availability; this frontend neither relaxes its gates nor pretends scheduler activation has occurred.

Physical iPhone / VoiceOver checklist before approval:

- Open SI from the passing homepage/quick view. Identify setup status, recent-activity status, last real observation and direct official action within five seconds, without scrolling through Technical Evidence.
- The source action must open SI’s exact official record; Back returns to a readable SCOUT page. Repeat for CHONK and a missing official record. An unavailable action must not masquerade as a link.
- The keyboard must stay closed on dossier arrival, disclosure expansion, share/copy and selectable copy-failure fallback. Mint lookup remains folded until requested; submission dismisses editing and updates exact-mint URL/OG identity.
- VoiceOver announces one finding and one dated qualifier; native disclosures announce expanded state, hidden evidence is excluded, Escape closes the active disclosure and returns to its summary. Verify touch targets, larger text and landscape.
- Copy/reopen the exact research link, invoke/cancel the real native share sheet and verify the OG preview. Explain why settings/lifetime/covered flow do not verify a holder’s profit.

## Scope and rollback

Only dossier frontend code, CSS scoped to `.token-dossier`, UI tests and docs change. `app/pairs/`, homepage routing/metadata, shared research actions, all `lib/`, APIs/OG, data, dependencies, collectors, scheduler, Cloudflare, permissions and workflows are byte-identical to the base. There are no wallet, treasury, trading or tokenomics actions. The history component’s change is an optional presentation callback, not new history policy.

The extra dossier read is bounded but adds latency and may fail/rate-limit; that yields an honest unverified state without retries or crawling. An unavailable sample never implies no rewards. The remaining acceptance risk is whether readers understand provider counter evidence and whether the new source action works comfortably on an actual iPhone. Those human checks remain pending unless explicitly reported.

Rollback: revert this feature commit (or a later human-reviewed merge commit) and rebuild through the normal human release process. No migration, API contract, data write, scheduler, infrastructure or treasury state needs reversal. PR only; no merge or deployment performed.
