# Executed QA and source evidence

This is genuine local Next.js **production-build** Chromium evidence. It is not a deployment, physical iPhone test or human comprehension study. No Helius/RPC, Neon, credentials, wallet, dispatch, collection or scheduler activation was used.

## Source-backed capability

The [public browser receipt](public-browser.json) records actual local production API HTTP 200, degraded/partial catalog status, 50 exact-mint CARDS rows and the API's original source revisions/clocks/coverage. Three adjacent viewport visits shared the unchanged server adapter's five-minute cache. The provider reported 2,146 tokens, compared with 2,145 in the earlier manual two-page [source research](source-receipts.json). Both values remain attributed to their original reads; no stabilized/exhaustive total is invented.

The public capture ran 19 October 2026, 18:05:29.096–18:05:40.624 UTC. At 320/390/1280, it had 50 rows, no horizontal overflow, no uncaught page errors and zero WCAG A/AA axe violations. The first row started at y=627.06/665.33/651.98 respectively, with 76px height. Financial figures, appreciation and momentum remained withheld. Separate reward-source checks are visible per row; unchecked rows are not promoted.

The cloud Node server initially could not reach sources using its default outbound plumbing and correctly showed unavailable, without a zero-world count or cached verified claims. The bounded public capture was repeated using an **ephemeral, outside-repository** Undici dispatcher for the managed session's existing proxy/CA trust; localhost stayed direct. No app/config/credential/freshness change was made. The initial capture utility also needed an explicit browser context for axe and an HTTP-level API receipt rather than reading a body the client had deliberately cancelled. Those utility issues were corrected; the final public receipt has no errors. No cloud-only proxy shim is shipped or prescribed for production.

Manual public research: one registry GET, two catalog GETs, two unsuccessful private-candidate DexScreener research GETs, one per fixed public path (both HTTP 403). Local public capture attempts were bounded by the existing API per cold process: <=1 registry +2 catalog +12 mode attempts plus its unchanged history read; successful adjacent visits used the existing cache. Two initial unproxied local attempts returned source unavailable; there were two source-backed capture runs, the first with a receipt-tool limitation and the second captured above. There was no full-catalog/holder crawl or quota-pressure test. These are request upper bounds, not a claim that every attempted mode read reached origin or succeeded. No recurring behavior is added.

## Commands

The command/result inventory below is generated from executed logs in [validation.json](validation.json). Toolchain: Node 20.20.2, npm 11.9.0, Next 15.5.28, Chromium 154.0.8037.57 on Linux. PostgreSQL-dependent tests use disposable local PostgreSQL 17.11 databases with synthetic data via `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin`; there is no hosted Neon connection.

```sh
npm ci
npm test
bash tests/consumer-homepage/run-onchain.sh
bash tests/consumer-cards/run.sh
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-cards/playwright.config.mjs
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs
```

The new scoped tests are invoked by the root test runner, so CI runs exact-identity, missing-data, comparison, privacy/projection, precision, source and cooldown regressions. The separate browser suite uses the existing pinned Playwright/axe test-only installation under `experiments/consumer-mvp/web/node_modules` and `/usr/bin/chromium`; no root dependency/lockfile change. Browser dependencies can be restored with that directory's existing lockfile (`npm ci --prefix experiments/consumer-mvp/web`). No live provider calls are part of automatic tests. The explicit bounded public capture command, only with owner authorization, is `CARDS_PUBLIC_READ_QA=approved node tests/consumer-cards/capture-public.mjs` after build. A managed cloud environment additionally needs its approved proxy plumbing; never weaken TLS or source gates to make QA pass.

## Screenshot guide

All PNGs are unedited browser screenshots; dimensions and SHA-256 are in the validation inventory. `before-*` captures use unchanged main `314612d`, with data API calls deliberately answered by explicit QA 503 to avoid unrelated source reads; no synthetic token results were substituted. They show the consumer landing/original terminal before this research route existed, not a fabricated prior CARDS page.

| Capture | Meaning |
| --- | --- |
| `before-home-320/390/1280.png`, `before-terminal-*.png` | Actual unchanged main production UI; API-unavailable baseline, not observed financial data |
| `after-home-*.png` | Preserved production consumer landing with the new footer entry; three original examples unchanged |
| `after-public-discovery-*.png` | Genuine provider-backed CARDS sample; no fixtures, fabricated monetary figures or ranks |
| `after-public-evidence-*.png` | Genuine catalog/mode source times, hashes and identities behind accessible Details |
| `after-synthetic-discovery/evidence/empty/rate-limit/loading/stale-*.png` | Explicitly labeled **SYNTHETIC OFFLINE QA — NOT LIVE OBSERVATIONS**; actual Next production page with local intercepted response fixtures |
| `after-synthetic-watch/quote-side/standalone-watch-*.png` | Same labeled offline boundary, demonstrating identity-safe generic lookups and share/recovery behavior; no founder token or portfolio data |

Representative [public 320px](screenshots/after-public-discovery-320.png), [public 390px](screenshots/after-public-discovery-390.png), [desktop](screenshots/after-public-discovery-1280.png), [source evidence](screenshots/after-public-evidence-390.png) and [offline generic watch](screenshots/after-synthetic-standalone-watch-390.png). Public captures preceded the subsequent independent generic-watch route/metadata addition; the CARDS discovery projection/source behavior is unchanged. Final production browser regressions cover the added route and verify its generic share metadata and absence of CARDS/RPC acquisition.

## Regression / accessibility scope

* Exact registry mint, program, decimals and pool; same-symbol wrong quote rejected; missing/mismatched source receipts rejected.
* Incomplete/non-atomic pages, provider totals, untracked history, empty results versus unavailable source, HTML/malformed/oversized responses.
* Separate fresh/dateness of official mode source; loading makes no claims; advancing the clock cannot refresh source evidence or initiate a network request.
* Shared tab cooldowns, numeric/date/unsupported Retry-After, 429/503 and manual recovery; no shortened provider waits or automatic retry.
* Source strings and financial fields do not bypass the projection. Optional lifetime payloads and arbitrary pool URLs cannot leak into result quantities/links.
* Exact base/quote-side mint handling in generic adapter, source-unavailable/denied/no-market states, clipboard gesture/fallback, original input, sharing, back/forward and cancellation of stale in-flight responses.
* Offline positive arithmetic including 1e-18 quote prices, zero/unsafe precision, missing/duplicate/out-of-order/gapped observations, same-window all-candidate gating, shared percentage ties, temporary spikes versus sustained patterns, missing liquidity/volume and stale/future windows. No ATH or holder ROI promotion.
* Keyboard Enter/Escape for native disclosures, deliberate focus recovery, source links, live status messages, long names/addresses, touch viewports and 200% enlarged-text reflow. axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks. Chromium emulation does not establish iPhone Safari or human usability acceptance.

The first QA pass found an offscreen 320px row and a methodology link that lost summary focus after native fragment navigation. The layout was tightened and the link now explicitly opens/focuses/scrolls its disclosure; regressions cover both. Critical source/rights/coverage warnings remain visible. No source gates were reduced to fix layout.

## Critical review and remaining limits

The strongest result is identification plus evidence inspection, not an actionable performance leaderboard. Withholding the desired numbers is a deliberate consequence of missing actual market history and unresolved publication rights. Fifty alphabetized tokens can still be a long mobile list; local search and native row disclosures keep browsing bounded. Source freshness, incomplete selection and unknown pool canonicality prevent an ecosystem-winner claim. Source links can change or fail later. Metadata rights still need owner review; informational access is not licensing clearance. Existing API JSON can still expose its previously available financial fields in Network; this display-only projection does not resolve that pre-existing publication question. No physical iPhone or human test has been performed. Use the [acceptance checklist](IPHONE_ACCEPTANCE.md) before claiming those results.

## Final command results

| Check | Actual result |
| --- | --- |
| `npm ci` | exit 0 · 356 packages installed; lockfile unchanged |
| `npm test` | exit 0 · 826 Node + 106 Python = 932; zero failures/skips |
| `bash tests/consumer-homepage/run-onchain.sh` | exit 0 · 19 passed |
| `bash tests/consumer-cards/run.sh` | exit 0 · 12 passed; also included in npm test |
| `npx tsc --noEmit` | exit 0 · No TypeScript errors |
| `npm run lint` | exit 0 · No ESLint errors |
| `npm run build` | exit 0 · Next production build passed; both research routes 118 kB first-load JS |
| `bash scripts/archive-tool.sh check origin/main` | exit 0 · Append-only/reproduction passed |
| `npm run archive:dry-run` | exit 0 · Local-only replay/idempotency/tamper checks passed |
| `Playwright: consumer-cards/playwright.config.mjs` | exit 0 · 30 passed at 320/390/1280 |
| `Playwright: consumer-homepage/playwright.config.mjs` | exit 0 · 105 passed at 320/390/1280 |

All 135 browser cases passed. Synthetic screenshots are explicitly labeled; the three separate genuine public-data viewport checks passed without overflow or axe violations. The existing V1.7 screenshot outputs were redirected to ignored test cache during preservation QA; its test source was restored afterwards. No old evidence/screenshots are included as modifications.
