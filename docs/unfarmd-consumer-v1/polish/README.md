# SCOUT IT interaction polish — PR #137

Audit starts exactly at `be75bb9166ae799c3fb13341332890afd7a8c247`. This continues the same draft, not a homepage rebuild or brand revision. All captures use the integrated Next.js **production** consumer in Chromium: **320×740**, **390×844**, **1280×900**. Physical iPhone Safari and VoiceOver have **not** been tested.

## Proven defects and the narrow fix

1. **Result focus was outside the viewport.** Submitting an exact mint focused the onchain `answer-title` below the Brief and concerns, then explicitly scrolled to page top. At 320px the focused loading heading began at **942.9px** in a 740px viewport; accepted facts focused a heading at **1459.5px**. Tab continued from that distant position, skipping the visible Brief actions. Deliberate submission now focuses the existing, visible **SCOUT Brief** heading (`tabIndex=-1`, no added Tab stop). Invalid-input and dated-example headings retain their own focus paths.
2. **Completion interrupted chosen reading.** While a response was pending, selecting **Onchain evidence** correctly focused `research-onchain`. Completion then reassigned focus to `answer-title` and reset scrolling to zero at all three widths. It now preserves persistent controls/sections and finger-style scrolling. Completion only initializes an untouched top-of-page deep link, or replaces the removed dated heading when it held focus at the top; neither path forces a new scroll position.

Only `app/consumer/home.tsx` focus routing and `trader.tsx` heading focusability change in production. No CSS, hero text, artwork, assets, source client, wire contract, parsing, arithmetic, freshness policy or request behavior changes. The finished original Midjourney export is still **not supplied**; the existing [art replacement seam](../ARTWORK.md) and clearly labeled original placeholder remain untouched.

## Audit findings deliberately left alone

- Exact paste remains deliberate, untrimmed and unsubmitted until **SCOUT IT**; denied clipboard access offers native long-press/type recovery. Input remains 16px, targets at least 44px; loading never renders guessed supply/controls.
- The existing evidence hierarchy already distinguishes RPC-reported fields/supply and receipts from **What needs attention** and **Still unknown**. Concerns retain amber treatment and exact trigger evidence; missing fields remain **Unknown**. Standard-authority absence never becomes a safety verdict. No new badge, score, concern, forecast or metric was added.
- Exact decimal supply, original mint, Token Program/Token-2022 qualification, original finalized slot, checked UTC and raw source receipt remain. Displayed clock and receipt are not renewed by browsing or response completion. The 60-second expiry still removes facts/derived concerns without a retry.
- Source-disabled/denied, unsupported, malformed, stale, interrupted and rate-limited responses stay unavailable; cooldown is manual. Dated-example recovery, address review, Back/Forward, sharing and clipboard fallback retain their existing behavior.
- StonkFun remains a separate **14 Oct 2026 / stale** layer. Source-rights restrictions and financial withholding remain. No market financial quantities, prices or provider observations are introduced.

No additional material defect in those checked areas justified a cosmetic or functional change.

## Source honesty

Every accepted-path capture below has a conspicuous **SYNTHETIC OFFLINE QA** banner. Invented fixture fields travel through the real production HTTP client and unchanged MintFactsV1 validation boundary via test-only interception. The production-shaped acquisition discriminator in that replay is **not an authentic Helius observation**. The disabled 503 response is also explicitly replayed offline. No app flag or URL activates fixtures.

Scrolled evidence captures add a fixed **test-only** footer label because the ordinary outer notice would otherwise scroll out of view. This does not change app source fields, production layout or the measured scroll coordinates.

All new audit tests block external browser requests, intercept the market endpoint with an offline 503 and assert GET-only API methods. The broader existing consumer suite separately checks the actual inert localhost 403/access-denied response. No Helius, hosted SQL, provider activation, canary POST/retry or deployment is part of this work.

## Genuine before / after gallery

“Before” was captured from the `be75bb9` production build **before editing application code**. Before audit mode records the defective focus/scroll coordinates; successful capture is not a claim that the defect passed the new regression assertions. “After” runs enforce visible result focus, next-Tab continuity and preserved evidence navigation. Navigation screenshots retain the actual current scroll position; other screenshots show the first viewport or the full page as labeled.

| State | Before · 320 | After · 320 | Before · 390 | After · 390 | Before · 1280 | After · 1280 |
| --- | --- | --- | --- | --- | --- | --- |
| Approved landing | [image](screenshots/before-landing-320.png) | [image](screenshots/after-landing-320.png) | [image](screenshots/before-landing-390.png) | [image](screenshots/after-landing-390.png) | [image](screenshots/before-landing-1280.png) | [image](screenshots/after-landing-1280.png) |
| Loading · offline QA | [image](screenshots/before-loading-320.png) | [image](screenshots/after-loading-320.png) | [image](screenshots/before-loading-390.png) | [image](screenshots/after-loading-390.png) | [image](screenshots/before-loading-1280.png) | [image](screenshots/after-loading-1280.png) |
| Accepted · synthetic offline QA | [image](screenshots/before-accepted-320.png) | [image](screenshots/after-accepted-320.png) | [image](screenshots/before-accepted-390.png) | [image](screenshots/after-accepted-390.png) | [image](screenshots/before-accepted-1280.png) | [image](screenshots/after-accepted-1280.png) |
| Disabled · offline QA | [image](screenshots/before-disabled-320.png) | [image](screenshots/after-disabled-320.png) | [image](screenshots/before-disabled-390.png) | [image](screenshots/after-disabled-390.png) | [image](screenshots/before-disabled-1280.png) | [image](screenshots/after-disabled-1280.png) |
| Completion during evidence navigation | [image](screenshots/before-navigation-320.png) | [image](screenshots/after-navigation-320.png) | [image](screenshots/before-navigation-390.png) | [image](screenshots/after-navigation-390.png) | [image](screenshots/before-navigation-1280.png) | [image](screenshots/after-navigation-1280.png) |

Full evidence hierarchy: [320px](screenshots/after-accepted-full-320.png), [390px](screenshots/after-accepted-full-390.png), [1280px](screenshots/after-accepted-full-1280.png). Open receipts: [320px](screenshots/after-receipts-320.png), [390px](screenshots/after-receipts-390.png), [1280px](screenshots/after-receipts-1280.png). The associated `before/after-{keyboard,disabled,navigation}-{width}.json` files retain measured focus, scroll, request methods and source/test labels.



| Width | Loading focus top · before → after | Accepted focus top · before → after |
| --- | --- | --- |
| 320 | 942.9px → **284.5px** | 1459.5px → **176.5px** |
| 390 | 883.8px → **292.0px** | 1335.9px → **146.5px** |
| 1280 | 846.4px → **290.5px** | 1253.5px → **197.0px** |

All after-result headings are fully within the tested viewport; next Tab reaches **Review concerns**. Evidence navigation retains `research-onchain` focus and a nonzero scroll position on completion. [Landing screenshot hashes](landing-integrity.json) are **identical before/after at all three widths** on this toolchain; this is measured preservation, not a portable font/pixel guarantee.

## Reproduce and results

Use the existing pinned Node/Chromium and test-only browser dependencies; no package/lockfile changes.

```sh
npm run build
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/polish.playwright.config.mjs --workers 2
# Broader preservation checks, including the 12 focused scenarios:
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs --workers 2
npx tsc --noEmit
npm run lint
bash scripts/archive-tool.sh check origin/main
```

Baseline capture uses test-only `UNFARMD_POLISH_BEFORE=1` **only on the unchanged baseline build**; never rerun it on the candidate and present that as “before.” Runtime code does not read this variable. Four older browser assertions now require focus on the visible Brief instead of the offscreen onchain heading; source/precision/rights assertions remain intact. Exact-head CI is linked in draft PR #137.

| Verification | Actual final outcome |
| --- | --- |
| Production baseline audit | **9 capture scenarios completed** on unchanged `be75bb9`; coordinate records expose the defects. The later candidate-only scrolling regression is excluded from baseline acceptance. |
| Full consumer Chromium preservation | **162/162 passed in 3.8m**, including the 12 focused scenarios; no failures/skips/retries, **0 axe violations** in asserted states. |
| Focused final screenshot/interaction rerun | **12/12 passed in 22.4s**; no failures/skips/retries; visible result focus, no focus/scroll theft, expiry and exact-mint recovery; 0 axe violations, 0 external requests/page errors, GET-only API methods. |
| `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test` | Exit **0**, **1,130 passed**: 1,023 Node + 107 Python; no failures. Disposable local PostgreSQL only, no hosted SQL. |
| `npx tsc --noEmit` / `npm run lint` | Both exit **0**; final lint zero errors/warnings. |
| `npm run build` | Exit **0**; actual optimized Next.js production build. Existing edge-runtime static-generation notice. |
| `bash scripts/archive-tool.sh check origin/main` | Exit **0**; append-only/reproduction check passed. |
| Scope / diff | Only permitted consumer, scoped browser tests and UNFARMD documentation; no dependency, contract, CSS, artwork or infrastructure edits. |

An initial broader run had three failures from the same obsolete launch focus expectation (one per width). That assertion now requires the visible Brief; the subsequent clean **162/162** run above includes all original source/precision/rights assertions. A test-config export lint warning was also corrected; final lint is clean.

## Founder acceptance and rollback

- Physical iPhone Safari (portrait/landscape, software keyboard, native Paste) and VoiceOver: **pending**. Use the [owner checklist](../IPHONE.md); automation is not physical-device evidence.
- First authentic Helius observation: **not performed**. Existing disabled/admission and one-shot incident boundaries remain; any future acquisition needs its independently authorized process. Synthetic screenshots cannot satisfy that gate.
- Original Midjourney export/provenance and final art/name rights review: **pending**. No substitute final asset was created.
- PR #137 remains draft/unmerged. No production deployment or source/infrastructure activation is authorized here.

To roll back this polish alone, revert its commit through review; this restores `be75bb9` focus handling and its matching tests. No dataset, API, asset, key, permission or schedule needs reversing. The broader PR rollback remains [documented separately](../README.md#launch-gates-and-rollback).
