# Consumer homepage QA — 17 October 2026

[Issue #92](https://github.com/fuzzysniper/scout-stonk-intel/issues/92), main base `b6ccd1d91fd2570b96f87ca430af73d85be83ce0` (merged #90/#91). Actual **Next.js 15.5.9 production build**, `next start --hostname 127.0.0.1 --port 4180`, Chromium 154 / Playwright 1.64.1. These are local production-mode results, **not evidence of a production-domain deployment**. The running engine is imported unchanged from #90, with its real default evaluation clock and original 14 October receipts; no mocks/fixtures or provider calls supply the consumer answers.

## Executed checks

| Command | Exact result |
| --- | --- |
| `npm ci` | Exit 0; 336 packages installed; existing ESLint 9.39.5 deprecation notice, no dependency changes |
| `npm test` | Exit 0: 498 application tests, 29 original portable-evidence tests, 106 Python tests, 18 scheduler-adapter tests; no failures |
| `npx tsc --noEmit` | Exit 0; no errors |
| `npm run lint` | Exit 0; no errors/warnings |
| `npm run build` | Exit 0; 12/12 static pages generated, both `/` and `/terminal` compile as dynamic routes; homepage 8.69 kB route / 114 kB first-load JS |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; append-only/reproduction check passed |
| `npm run archive:dry-run` | Exit 0; disposable local publication verification completed; no publication/network/commit |
| `node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs` | Exit 0; **18/18 cases**, 28.1 seconds; 320×740, 390×844, 1280×900 |

Root tests now include the original #90 engine receipt/integrity suite, so ordinary root CI exercises the production evidence dependency without browser-tool dependencies. Browser tooling is reused from the existing #91 package; no root package/lock, workflow or deployment configuration changed. On a fresh checkout install it with `npm ci --prefix experiments/consumer-mvp/web`; use installed Chromium (`CONSUMER_CHROMIUM_PATH`) or install Playwright's Chromium locally. Then run the root build and browser command above. The browser config starts/stops its own loopback **Next** server; it does not run Vite. Browser QA is a separately executed local check, not a new CI workflow.

Nine screenshots below are genuine viewport captures of that final production build, unchanged after capture. `validation.json` records SHA-256/bytes, measured risk positions and the byte-identity audit. They show a new homepage, not fabricated before/after images or a deployed preview.

| Width | Landing | SI answer | Expanded evidence |
| --- | --- | --- | --- |
| 320 | [Image](screenshots/landing-320.png) | [Image](screenshots/answer-320.png) | [Image](screenshots/evidence-320.png) |
| 390 | [Image](screenshots/landing-390.png) | [Image](screenshots/answer-390.png) | [Image](screenshots/evidence-390.png) |
| 1280 | [Image](screenshots/landing-1280.png) | [Image](screenshots/answer-1280.png) | [Image](screenshots/evidence-1280.png) |

## What the browser actually proved

- All three supported tokens: exact-mint selection, same-provider source identity, dated explanation, no underlying equity/gold ownership claim, no verified payout/holder return claim, prominent rights/financial withholding, reload and direct links. All three discovery choices fit in the first viewport at all three sizes.
- Risk-heading bottom coordinates for SI/GP/GROK: **665.03/676.92/687.42 px at 320×740**, **610.22/610.22/646.80 at 390×844**, **711.38/685.78/711.38 at 1280×900**. No horizontal overflow. Visible main controls are at least 44×44 px. Nine answer + three landing + three expanded-evidence axe scans: **zero WCAG 2 A/AA, 2.1 AA, 2.2 AA violations**.
- Empty input, ticker, malformed address, whitespace, valid unknown mint, actual distinct same-symbol SI mint, duplicate mint parameters, recovery through a curated example. No implicit trimming/aliases or unknown-as-zero behavior. Pre-capture device clock fails the original engine; explicit retry after clock correction recovers.
- Keyboard Evidence Enter/Escape, source focus, clipboard success and manual-copy fallback, exact URL, reload, browser back/forward, Start again and input reset. No local/session storage or cookies. **Zero unexpected client/console errors and zero automatic external browser requests** across all 18 cases.
- Actual server HTTP: supported homepage HTML/RSC and no-JavaScript rendering, no restricted financial payload markers, neutral/noindex exact-mint metadata, both generic OG routes HTTP 200 + `image/png` + genuine PNG signature. The homepage asset set contains no raw financial field payload. No original raw-capture link is added.
- HTTP 200 for `/terminal`, its exact-mint URL, `/research`, `/research/history`, `/radar`, `/status`, `/brief`. Existing `/api/history?mint=bad` and `/api/og?mint=bad` return 400 before provider access. Root unit/integration tests retain the existing valid/error API, source, reward, archive and security coverage. The legacy dossier client and endpoint implementations were not modified; only Radar/Data Health/Daily Brief dossier anchors adapt to the terminal route; no live provider-dependent dossier result is claimed by these HTTP checks.
- All **77** tracked API/library/data/workflow/scheduler files audited against the base are byte-identical. Original evidence engine, immutable captures, token allowlist, collection gate, Cloudflare staging and root dependency/config files are unchanged.

Browser QA found and fixed three production issues: Next 15's root-query URL resolver dropped mint queries from canonical/`og:url` (the consumer metadata supplies absolute strings with an explicit null metadata base); and the copied legacy generic OG needed explicit flex for its multi-child brand node and an inline SVG instead of a glyph that tried remote font fallback. A streamed-metadata race also requested a missing default favicon; an original neutral static ICO now serves it, and browser QA checks unexpected HTTP errors and the actual ICO header. These fixes are scoped to consumer metadata, the moved generic image and a static favicon. `/api/og` is unchanged.

## Critical self-review and remaining human checks

This is intentionally **three dated examples**, not token discovery or current financial intelligence. A known token outside this set remains unsupported; the footer preserves its exact mint into legacy research. No amount, current market claim or ranking is added to fill that gap. “Verified” always qualifies a dated provider identity/configuration; the sources are all StonkFun, not independent chain corroboration.

At 320px the risk heading and first bullets are visible immediately; the complete risk list and Evidence require a short scroll. Rights/withholding text is outside the disclosure. The input clips its visual address while editing; full exact identities remain copyable/selectable in Evidence. The current STORK-associated hostname can still suggest affiliation even though the homepage has no such consumer branding. `noindex` and a temporary label do not solve publication rights or establish a permanent brand.

Automated accessibility is not a screen-reader audit. Physical soft-keyboard behavior, Safari/VoiceOver and an uncoached human under-30-second comprehension test remain **unperformed**. Owner approval and actual production-domain verification remain pending; see [release/rollback](RELEASE.md) and [specific publication review](PUBLICATION_REVIEW.md). A green preview check must never be described as a completed production launch.

## Five-second / thirty-second owner usability script — not yet executed

With at least three uncoached mobile testers, use the existing domain only after the approved cutover (or the approved existing-project preview beforehand). Do not provide a token/investment explanation first.

1. Show landing for five seconds, then hide it. Ask: “What does this site help you understand?” Pass: explain a token from an exact address, with dated evidence; fail: trade, current earnings, share ownership or broad token search.
2. Restore it. Ask them to choose SI and explain in their own words, within 30 seconds, what holding SI means. Pass: SI token, paired with NVDAX; not NVIDIA shares or guaranteed payouts.
3. Ask “What is verified, and when?” Pass: StonkFun-reported identity/reward setting captured 14 October; stale, not a current payment check.
4. Ask “What could this page not tell you?” Pass: holder entitlement/returns, current settings and withheld financial quantities; partial coverage and unverified rights remain visible.
5. Ask them to find the original source date and copy the exact-mint link. Try the other SI mint; it must stay unsupported. No wallets or transactions.
6. Record actual words, task time, device/browser, wrong assumptions, scrolling and focus problems. Any mistaken live/ownership/earnings claim blocks a success claim; fix/review before expanding publication. Do not mark this script passed based on browser automation.
