# Consumer V1.1 — issue #94

Frontend polish from main `f880e6606443a950b2907a6356df0f8636ceb7cf`, including merged #93. The existing live product is the reference; these screenshots/tests use **actual local Next.js 15.5.9 production builds**, not the standalone Vite experiment. No production deployment, physical iPhone test or human comprehension result is claimed.

## Change and contract

The novice-facing labels are now **Token address**, **Paste a token address**, **Explain this token**, **Explore an example**, **3 examples available**. Errors also use “address” rather than unexplained “mint”. Precise case-sensitive mint identity education and original source language remain in Sources & token addresses.

The explanation identifies the actual token and its recorded quote relationship. For SI it says that NVDAX is a token **StonkFun labels “NVIDIA”**, and that buying Super Inu does not mean buying NVIDIA shares or owning NVDAX. This describes a dated provider label, not verified affiliation, backing, redemption or a current market relationship. GP/GLDX and GROK/SPCXX have equivalent explicit gold/SpaceX ownership boundaries. No new source fact, economic state or financial figure is introduced.

“How rewards are supposed to work” describes the platform-reported reward feature and explicitly withholds verification of individual holder payments and eligibility. `consumerFacts` preserves the original `pairRelationship.sourceIds` and `economicMechanism.conclusion.sourceIds` arrays; source buttons resolve those original IDs to the original receipts. Full original Fact texts/receipts, dates/hashes/URLs and mechanism states remain available unchanged. Supported means evidence exists at capture, never current eligibility, chain settlement or holder ROI.

A successful result hides the large form and uses the existing header for **Start over** and **Search another token**. The search button exposes `aria-expanded`/`aria-controls`; opening focuses/selects the exact address, Escape/Cancel closes it and restores button focus, and submitting success closes it and focuses the explanation. Errors show the form and remove the previous successful answer. Back/forward restores the exact result with search collapsed; Start over restores the introduction and focuses its heading. No extra provider lookup or persistent browser state is added.

[Agent B coordination on #95](https://github.com/fuzzysniper/scout-stonk-intel/issues/95#issuecomment-6240909851) records the unchanged schema v1, default three, source IDs, actual evaluation clock and null/withheld quantity boundary. #95 expansion/freshness work is separate; no experimental path is enabled here. The original evidence files, consumer eligibility/rights guards, metadata/share contract and `/terminal` are unchanged.

Existing [publication review](../consumer-homepage/PUBLICATION_REVIEW.md) and all existing rights restrictions still apply. This PR makes no new rights decision or license assertion and changes no publication gate. No additional record, financial quantity or raw provider body is published by this copy polish.

## Executed checks

Node 20.20.2; Chromium 154.0.8037.57; Playwright 1.64.1; existing locked browser tooling from #91. All commands below exited **0**.

| Check | Result |
| --- | --- |
| `npm ci` | 336 packages; existing ESLint 9.39.5 deprecation notice; no dependency/lock changes |
| `npm test` | **501 application + 29 evidence + 106 Python + 18 adapter tests**, no failures |
| `npx tsc --noEmit` | No errors |
| `npm run lint` | No errors or warnings |
| `npm run build` | 12/12 static pages generated; homepage route 9.04 kB / 114 kB first-load JS |
| `bash scripts/archive-tool.sh check origin/main` | Append-only/reproduction passed |
| `npm run archive:dry-run` | Disposable local verification passed; no publication/dispatch |
| Production browser command below | **21/21 cases**, 36.6 seconds, widths 320/390/1280 |

```bash
# Fresh checkout: install existing browser tools without changing locks.
npm ci --prefix experiments/consumer-mvp/web
# Use installed Chromium, or set CONSUMER_CHROMIUM_PATH.
npm run build
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs
```

The browser runner starts/stops `next start` on loopback 4180. It tests the real original evidence engine at its default actual clock; no mock provider responses or synthetic financial metrics feed the screenshots. Baseline captures were made from the unchanged main production build before the updated build, at the same dimensions. Browser QA remains a local explicit check; workflows and CI configuration are unchanged.

## Genuine before/after screenshots

| Viewport | Before landing | After landing | Before SI result | After SI result |
| --- | --- | --- | --- | --- |
| 320×740 | [Before](screenshots/before-landing-320.png) | [After](screenshots/after-landing-320.png) | [Before](screenshots/before-answer-320.png) | [After](screenshots/after-answer-320.png) |
| 390×844 | [Before](screenshots/before-landing-390.png) | [After](screenshots/after-landing-390.png) | [Before](screenshots/before-answer-390.png) | [After](screenshots/after-answer-390.png) |
| 1280×900 | [Before](screenshots/before-landing-1280.png) | [After](screenshots/after-landing-1280.png) | [Before](screenshots/before-answer-1280.png) | [After](screenshots/after-answer-1280.png) |

Expanded search: [320](screenshots/after-search-320.png), [390](screenshots/after-search-390.png), [1280](screenshots/after-search-1280.png). Original-source disclosure: [320](screenshots/after-evidence-320.png), [390](screenshots/after-evidence-390.png), [1280](screenshots/after-evidence-1280.png). All **18 PNGs are unedited captures**; `validation.json` records their SHA-256/bytes and real layout measurements.

For SI, the risk-heading bottom moved from **665.03 → 611.52 px at 320**, **610.22 → 534.30 at 390**, **711.38 → 615.88 at 1280**. At 320, the entire rights/financial-withholding bullet ends at **725.52 px for SI/GROK** and **737.41 for GP**, inside the 740px viewport. The tests assert this for all three examples, alongside the risk heading and explicit holder-payment/eligibility text. At 390 the rights bullet ends at 612.30px for all three; at 1280, 698.38px. No font-size reduction or warning truncation was introduced.

## Regression, accessibility and security evidence

- All three exact supported base/quote identities, same-symbol different SI rejection, quote-mint rejection, empty/name/invalid/whitespace/unknown/duplicate-query states, recovery and original October 14 clocks. Pre-capture clock evaluation fails closed and explicit corrected-clock retry recovers.
- Search collapsed on success/direct URL/reload, keyboard expansion and selected address focus, Escape/Cancel draft cancellation and focus restoration, error recovery, Start over, back/forward, exact share links, clipboard success/manual fallback. The hidden form cannot receive tab focus; no stale successful answer remains after a failed search.
- **Zero** unexpected client/console/HTTP errors, automatic external browser requests, horizontal overflow or axe violations across 21 cases. Eighteen scans cover three landings, nine answers, three original-source disclosures and three expanded search forms. Visible controls are at least 44×44px, including the header search button.
- Actual SSR without JavaScript preserves the supported explanation and material warnings. The closed form is progressive enhancement; JavaScript is required to expand it/select examples. Direct exact-address links and legacy research remain readable. Metadata/noindex/canonical/OG remain unchanged. Both generic image routes return actual HTTP 200 PNG bytes; `/terminal` mint metadata retains its token-specific `/api/og` URL. Existing public routes and API invalid-input 400 states pass.
- Header comparison against a captured main-build response preserves HTML content type and `private, no-cache, no-store, max-age=0, must-revalidate`. Local Next has no CSP, X-Frame-Options, X-Content-Type-Options or Referrer-Policy header in either build. The regression test records and compares that reality; **it does not claim those policies exist or were hardened**. Production CDN headers were not audited/changed. Server/header policy changes are outside this frontend-only PR.
- Malformed/script-like input stays an escaped invalid address; source links remain fixed HTTPS official endpoints with `noopener noreferrer`. HTML/RSC/homepage bundles contain no released financial payload/raw body. Browser storage/cookies remain empty. Original rights/settlement/entitlement/quantity promotion rejection tests still pass.
- **102 protected files** (original evidence, API/library/data/research/scheduler/workflows, terminal, homepage/layout/global styles and root dependency manifests) are byte-identical to main. Only `app/consumer/**`, scoped frontend tests and these frontend QA documents/screenshots change. Consumer guard/share/metadata function bodies are preserved.

## Critical self-review and manual iPhone Safari script — not executed

At 320, the fourth incomplete-coverage bullet and source disclosure require scrolling; the material stale, holder-eligibility and rights warnings are visible before that. Expanded search intentionally takes more vertical room while editing; Cancel restores the compact view. Selecting the whole address can visually show its tail on a narrow input; paste replaces the full selected value. This remains three **stale** examples, not broad search/current financial evidence. Automated axe and viewport emulation do not prove VoiceOver, Safari soft-keyboard behavior or novice understanding.

Owner checks on the approved existing-project preview, then the actual existing production domain after an approved human merge:

1. In iPhone Safari, load `/` with browser chrome visible. Confirm the four novice labels and three examples, dated/stale notice, no new branding, financial figures or wallet prompts. Test actual 320/390-like viewport and normal text size, then larger text.
2. Open SI. Ask an uncoached tester within 30 seconds: what is Super Inu, what does the NVDAX label mean, and do they own NVIDIA shares/NVDAX? Any ownership/backing or current-data inference is a failure; record their words and time.
3. Ask what was verified and when, how rewards are described, and whether individual eligibility/payment is known. Require October 14 provider configuration and unknown holder payouts, not realized return/yield. Confirm visible stale/rights warnings.
4. Tap Search another token. Confirm the keyboard opens, the address is selected, the field/button are readable, and pasted text replaces the entire address. Cancel and Escape on hardware keyboard must return focus to the search button without changing the shared URL/result.
5. Enter GP/GROK addresses; success closes search. Enter a name, malformed address and distinct unsupported SI mint; error keeps search available and removes the prior answer. Try clipboard denial and manual-copy fallback.
6. Test VoiceOver button expanded state, form label, result focus, Sources disclosure, exact token/quote addresses and real source dates. Test back/forward/reload and Start over, including keyboard dismissal after a successful lookup.
7. Open the copied `/?mint=` link in a fresh tab and verify the same identity. Confirm `/terminal`, source index, Radar, Brief and Data Health remain available. Record device, iOS/Safari version, visual viewport, UTC time and failures; do not substitute these local screenshots for live verification.

## Review and rollback

PR only; no merge, manual deploy, workflow dispatch, service activation, secrets or settings change. Existing Vercel preview/CI checks can run through their normal integration; success is not proof that the production domain changed. The owner reviews the copy/contract and manual Safari results, merges through the existing process if approved, and verifies the actual live domain using the script above and the existing [cutover runbook](../consumer-homepage/RELEASE.md).

Before merge: close the PR. After merge: human reverts this PR's squash commit, or uses `git revert -m 1 <merge-commit>` for a merge commit, through normal review. This restores #93 copy and its always-visible result input; later real dataset commits must be preserved. There is no evidence/data/schema migration or backend/rights/scheduler restoration. Do not revert #93 or unrelated Agent B work to undo this polish.
