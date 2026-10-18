# Consumer V1.2 — three measured friction reductions

Issue #98. Review-only; no merge, deployment, provider refresh or human study. Started from latest main `c3cbbeb9e7183ded8181f7083ebb57851398972f`, after confirming #96 merged at `1e86774292ee7913f80aa2eed8910a0b7b2db23c` (18 Oct 2026 03:55:40 UTC) and #97 at `c3cbbeb9e7183ded8181f7083ebb57851398972f` (03:56:29 UTC). The baseline screenshots were captured from a build of that merged main before rebuilding with these changes. [Baseline measurements](before-metrics.json) preserve its build ID, capture clock and original displayed receipt fields.

## Audit and changes

These are browser-observable friction proxies, **not measured user comprehension, conversion or time-to-understanding**. Ownership and reward explanations from #96 are unchanged. No redesign, data expansion, telemetry or extra user task was added.

| Friction seen in the merged baseline | Scoped change | Measured acceptance |
| --- | --- | --- |
| Visible choices repeated SI/GP/GROK without full names; names existed only in accessible labels and results | Show Super Inu, RuneScape Gold and Grokification on the same three existing buttons, alongside ticker and quote | 0 → 3 visible full names; all three remain in the initial 320×740 viewport with ≥44px targets; one keyboard activation opens the matching exact-mint result |
| Opening Sources exposed long notes and all technical hashes before the first official link | Put the existing source names, original capture dates and links first; retain generated dates, hashes and commits in keyboard-operable native technical disclosures | First link offset from Sources summary: **1544.6 → 285.9px** at 320, **1321.1 → 266.8px** at 390, **1019.7 → 228.4px** at 1280. Existing warning remains before sources; every original displayed receipt field/URL matches the baseline. Accessible link names identify the receipt and new-tab behavior |
| Compact warning visibility depended on CSS `:has()` support | Use explicit successful-result/search state for the same existing mobile spacing | At 320, RuneScape Gold’s financial-rights warning ends at **737.4px** both normally and with `:has()` rules removed; baseline without those rules ended at **758.4px**, below the 740px viewport. All three tokens retain identical spacing when those selectors are removed |

The last check removes selectors via CSSOM in Chromium. It tests the fallback dependency, **not Safari/WebKit compatibility or a physical device**. A narrow viewport is not an iPhone with Safari toolbars, keyboard, VoiceOver or larger text. [Owner verification](OWNER_VERIFICATION.md) covers those remaining checks.

## Genuine production-build screenshots

PNG viewport captures from `next build` → `next start` on localhost, system Chromium, touch/mobile emulation for 320×740 and 390×844, desktop 1280×900. No mocked engine or fixture server: actual original evidence engine, real root route, SSR, hydration, exact-mint queries, metadata and original dated receipts. Source navigation is intercepted **only** in the link-safety test; screenshots are taken before that interception. No new provider evidence is acquired. No cropping, compositing or simulated financial figures.

| View | 320 before → after | 390 before → after | 1280 before → after |
| --- | --- | --- | --- |
| Discover | [Before](screenshots/before-landing-320.png) → [After](screenshots/after-landing-320.png) | [Before](screenshots/before-landing-390.png) → [After](screenshots/after-landing-390.png) | [Before](screenshots/before-landing-1280.png) → [After](screenshots/after-landing-1280.png) |
| Understand | [Before](screenshots/before-answer-320.png) → [After](screenshots/after-answer-320.png) | [Before](screenshots/before-answer-390.png) → [After](screenshots/after-answer-390.png) | [Before](screenshots/before-answer-1280.png) → [After](screenshots/after-answer-1280.png) |
| Verify, summary aligned to viewport top | [Before](screenshots/before-sources-320.png) → [After](screenshots/after-sources-320.png) | [Before](screenshots/before-sources-390.png) → [After](screenshots/after-sources-390.png) | [Before](screenshots/before-sources-1280.png) → [After](screenshots/after-sources-1280.png) |
| Open technical receipt | [After](screenshots/after-evidence-320.png) | [After](screenshots/after-evidence-390.png) | [After](screenshots/after-evidence-1280.png) |
| Search another token | [After](screenshots/after-search-320.png) | [After](screenshots/after-search-390.png) | [After](screenshots/after-search-1280.png) |

The Sources captures deliberately scroll the same summary to the top to compare disclosure content. Answer and landing captures use the normal initial viewport. The technical-receipt capture follows the actual Evidence action, which focuses a cited receipt. [Validation artifact](validation.json) records screenshot sizes/hashes, build/runtime details, commands and measured after values.

## Verification

Use Node 20.20.2 / npm 11.9.0, as in this environment. From the repository root:

```
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
```

Each command exits **0**. `npm ci` installs 336 packages and reports the existing ESLint 9.39.5 deprecation notice; no dependency/lockfile change. `npm test`: **501 app + 29 original evidence + 31 candidate/offline evidence + 106 Python + 18 scheduler adapter tests**, zero failures. Production build generates all 12 static pages and existing dynamic routes; homepage first-load JS remains approximately 115kB. Archive append-only/reproduction check passes; archive dry-run passes its isolated pin/hash/idempotency/reproduction/provenance checks, cleans up its disposable checkout and publishes nothing.

For scoped browser QA, use the existing isolated browser tooling (unchanged dependencies):

```
npm ci --prefix experiments/consumer-mvp/web
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs
```

The configuration starts its own production Next server on loopback port 4180; build first and leave that port free. Use system Chromium (`/usr/bin/chromium` here), `CONSUMER_CHROMIUM_PATH`, or the configured Playwright installation. The dependency-install command above is a reproduction instruction; this session reused the existing installed browser tools. **30 browser cases** (10 × 3 viewports), zero failures; axe WCAG 2 A/AA, 2.1 AA and 2.2 AA rules report zero violations in tested states. This does not certify accessibility beyond those automated checks.

Coverage includes all three exact base mints, direct links/reload, wrong ticker/malformed/empty/whitespace/unknown/different SI mint/duplicate query, no auto-enrollment, no-JS reading, original capture and provider timestamps, copy success/selectable fallback, search/Cancel/Escape/focus, keyboard examples and disclosures, Back/Forward/Start over, before-capture fail-closed recovery, no horizontal overflow, target sizes, safe new-tab link navigation, unchanged cache/security-header baseline, SSR/JS financial-payload withholding, original source values, neutral PNG metadata/favicon, `/terminal` and research/radar/status/brief routes. Tests assert no automatic external requests, unexpected HTTP errors, console errors, cookies or local/session storage. The explicit source-link click is fulfilled locally and proves navigation/opener behavior only, not current provider availability.

## Source integrity and publication review

`app/consumer/model.ts`, the evidence engine/catalog and candidate adapter, APIs, data, `/terminal`, global styles, infrastructure, workflows, rights policy and all original dated records remain byte-identical to the base. Only `home.tsx`/scoped consumer CSS, scoped browser tests and these new documents/screenshots change. Full names now visible were already in the exact three supported records, accessible labels and result headings. Moving receipt fields changes order/disclosure, not their content or epistemic status. No token, logo, financial quantity, source capture, source-body link, currency comparison or entitlement is added.

The original `permission: unverified`, metadata-only projection and financial-withholding gates remain. Read the existing [field-level publication review](../consumer-homepage/PUBLICATION_REVIEW.md): API availability, prior Git exposure, attribution, hashes and noindex do not establish rights. This PR makes **no new permission determination** or current-terms claim. The owner must resolve/record the exact provisional metadata presentation decision before merging an auto-deploying branch, and stop if a material restriction exists. No rights approval has been supplied here. Broader/current data remains Agent B’s separate #99 scope; [coordination comment](https://github.com/fuzzysniper/scout-stonk-intel/issues/99#issuecomment-6245469166).

## Critical self-review and remaining evidence

- Recognizable names and shorter source access are objectively verified. Whether novices actually understand base-token ownership, a provider-labeled quote, stale settings and unknown payments **has not been established**. Run the [five-user protocol](FIVE_USER_PROTOCOL.md); do not convert test-case counts into human success rates.
- The 320px landing is intentionally tight: all three choices fit, while the incomplete-coverage/rights note below the list requires scrolling. On result pages the yellow risk heading, stale/payout warnings and full financial-rights warning fit at the tested default sizes; the fourth incomplete-coverage bullet can extend below the 320px first viewport. It remains visible in the normal document, never collapsed or clipped. Large text, browser chrome and small physical displays can require more scroll.
- Source links are easier to reach, at the cost of exact mints/full mechanism notes following the three concise receipts. Technical details require one extra disclosure activation. All original fields remain keyboard reachable; this is deliberate progressive disclosure, not deletion. Receipt links are mutable endpoints, and a provider error/change cannot validate this historical explanation.
- The live host audit was blocked by the environment proxy (`Tunnel connection failed: 403 Forbidden`). No live-domain/physical-device/human verification is claimed. No WebKit test was run; selector removal is a targeted fallback regression. Safari keyboard/zoom, VoiceOver, native clipboard and source-tab return remain owner checks.
- Existing baseline security headers are unchanged (no new CSP/anti-framing policy in this scoped PR). Axe and local navigation checks are useful but not a complete security/accessibility audit. No trackers, accounts, wallet actions or production controls are added.

The [owner checklist](OWNER_VERIFICATION.md) specifies human approval, exact deployed SHA verification, live links, physical Safari steps, failure reporting and rollback. A green CI/preview does not approve rights, establish human comprehension, or authorize production activation. Rollback is a human-reviewed revert of this PR only; there is no data/schema migration or infrastructure state.
