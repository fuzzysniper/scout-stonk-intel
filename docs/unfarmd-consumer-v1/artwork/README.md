# Founder-selected UNFARMD artwork QA

Integration baseline: PR #137 at `9ec499a78991552c2b02db2d641c75487b52cf47`, refreshed and confirmed current before editing. No concurrent branch work was overwritten. Latest main already integrated; no further rebase required. This is an **asset-only consumer follow-up**, preserving copy/layout, exact-mint validation, deliberate acquisition, focus routing, MintFactsV1, clocks/precision, historical evidence and source restrictions.

See [ARTWORK.md](../ARTWORK.md) for the complete byte-preserved handoff, dimensions, rights gates and rollback. Founder visual approval is recorded by the assignment; independent commercial rights/trademark and generator-master authenticity remain unverified. The optional mobile focus candidate is preserved but not selected.

## Genuine production-browser captures

These are actual Chromium screenshots of the local optimized Next.js build with supplied art, **not image edits or fabricated authentic-source results**. Idle and missing-image views contain no token facts. Story captures open only the existing lore disclosure. Physical iPhone/Safari/VoiceOver are **not** claimed tested.

| State | 320×740 | 390×844 | 1280×900 |
| --- | --- | --- | --- |
| First screen | [Hero](qa/hero-320.png) | [Hero](qa/hero-390.png) | [Hero](qa/hero-1280.png) |
| Below-fold story, full page | [Story](qa/story-320.png) | [Story](qa/story-390.png) | [Story](qa/story-1280.png) |
| Image network failures | [Missing](qa/image-failed-320.png) | [Missing](qa/image-failed-390.png) | [Missing](qa/image-failed-1280.png) |

The adjacent `qa/receipt-{width}.json` records the real first-screen CTA geometry, selected source and zero passive API calls. Existing prior-build gallery remains available in [polish/](../polish/README.md); it is not relabeled as this build.

## Checks

Local results on the actual combined production app:

| Check | Result |
| --- | --- |
| Root `npm test` | **1,193 passed** (1,086 Node + 107 Python), zero failures; disposable local test services only, no hosted SQL. |
| Asset provenance/selection tests | **2/2 passed**; originals and all six derivatives retain supplied hashes, dimensions and bytes. |
| Full consumer Chromium run | **182 passed / 1 failed initially in 4.3m**. All **171 existing scenarios passed**; the single failure was the new 320px CSS-zoom pointer test described below. |
| Final focused artwork run | **12/12 passed in 25.2s** at 320/390/1280 after correcting the zoom test to use keyboard navigation; includes missing hero/story and slow decoding. **183 distinct scenarios verified with no unresolved failure**; not represented as a single clean 183-test run. |
| `npx tsc --noEmit` / final lint / production build / archive / diff | All **exit 0**; lint zero warnings/errors; optimized Next.js build 14 static pages. |
| Asserted axe/source request boundary | **0 violations**; zero passive API/source requests, no external browser requests. Deliberate local denial separately tested; no authentic Helius observation. |

SCOUT IT bottom edges: **664.53 / 750.75 / 672.48px** in **320×740 / 390×844 / 1280×900**, with ≥44px targets and hit-testing confirming no obstruction. Delayed hero decoding changes its vertical position by **less than 0.5px** and preserves field focus. Missing image keeps its reserved slot, descriptive alt and rights caption. The UI and source contracts were not changed to satisfy test assumptions.

Exact committed head and GitHub CI/Vercel results are recorded on draft PR #137. Reproduction:

```sh
node --test tests/consumer-homepage/artwork.test.mjs
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
CONSUMER_CAPTURE=0 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs --workers 2
```

The artwork regression suite checks byte hashes/dimensions for both originals and all six derivatives, the four approved selections, actual served WebP content/hash and homepage avatar metadata, mobile/desktop `currentSrc`, unobscured first-screen ≥44px SCOUT IT, honest rights captions, closed story keyboard/escape focus, zero passive source acquisition and no external requests. Delayed hero decoding must move the CTA by less than 0.5px and preserve address focus. With all WebPs blocked, alt text and the form remain; deliberate Enter exercises actual **403/access_denied** local admission with null accepted facts, then returns to editable address. Reduced motion, forced colors and 200% CSS zoom exercise existing error focus/recovery; this is not a claim of native Safari zoom equivalence. Automated axe checks run on rendered states. No genuine Helius/SQL/provider request is used.

The initial new test run exposed test-selector assumptions (two valid icon links, the arbitrary-mint form already visible after denial, and validation intentionally focusing the error heading). Those tests were corrected to assert the existing behavior. A subsequent full run exposed a 320px Playwright pointer-coordinate mismatch under injected 200% CSS zoom; the final zoom scenario uses real keyboard navigation instead (and passes at all three widths), without claiming physical Safari pointer/zoom acceptance. No unrelated UI behavior was changed to satisfy them. The complete final artwork suite was rerun cleanly; results above preserve the initial full-run failure rather than claiming a clean 183-test run.

## Owner acceptance, no activation

Use [IPHONE.md](../IPHONE.md#tonight-five-minute-founder-check), now also inspecting the selected mobile art and opening the escape story. At 320/390, check the scanner/sheep read clearly and SCOUT IT stays visible with normal text; inspect physical keyboard, VoiceOver alt descriptions, and blocked/slow-image recovery. Founder must approve final visual fit and separately review commercial rights/trademark before public release. No source activation is part of this review. Preview may remain origin-restricted.
