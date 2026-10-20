# UNFARMD V1 / verification

Base: `ac1d898578a3a7e17ec30a272674e38316d16397`. Actual Next.js production before/after, Chromium 320×740, 390×844 and 1280×900; mobile uses touch emulation. No physical device or human comprehension session is claimed.

## Reproduce

Use Node 20.19+; verified tool versions and final outcomes are recorded below. From root:

```sh
npm ci
# Existing pinned test-only browser toolchain, if not installed:
npm ci --prefix experiments/consumer-mvp/web
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs --workers 2
```

The local environment uses `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test` for disposable PostgreSQL 17 tests; it is an offline test binary location, not a hosted connection or credential. Browser config starts Next production on loopback:4180 and the existing clearly labeled offline harness on loopback:4181. System Chromium may be selected with `CONSUMER_CHROMIUM_PATH`.

For just the new integration tests, use `--config tests/consumer-homepage/unfarmd.playwright.config.mjs`. Baseline capture was performed **before implementation**, on the current-main production build, with the test-only `UNFARMD_QA_BASELINE=1` selecting `unfarmd-baseline.spec.mjs`. That option never enters app code, enables fixtures in production or changes source policy. Do not capture a false “before” using the candidate build.

## Source truth and safety

- Real localhost mint GET: actual **403 `access_denied`**; facts/source are not accepted. No approved-origin header spoofing or canary POST. Ordinary production GET acquisition remains disabled; this is not an authentic canary success/failure diagnosis.
- Existing market requests are intercepted with an explicit offline 503 in browser QA, never sent to a provider. External browser requests are blocked in the new tests. All recorded API methods must be GET.
- Accepted-path screenshots replay invented onchain test values through the real production HTTP client and MintFactsV1 validator, with a prominent **SYNTHETIC OFFLINE QA** banner. No production URL/activation flag exists for that replay. No market fixture quantities are returned/displayed.
- Tests retain precision, original identity, programs/extensions, provenance/clock, stale expiry, failure/cooldown, concern derivation and separate dated StonkFun publication limits. No gate or validator was changed to obtain a pass.
- Three old landing assertions expecting all dated examples in the first viewport now check the primary action instead, matching the selected hero/input priority; examples remain reachable and all historical risk/rights-first-viewport assertions remain. CTA names/master-brand assertions follow the approved copy. Old V3 regeneration outputs now go to ignored cache, preserving committed historical screenshots.

## Initial implementation results

These full-suite results were recorded before the final founder-copy refinement (commit `026510a2`). The separate final-copy verification below records what was rerun.

Local toolchain: **Node 20.20.2, npm 11.9.0, TypeScript 5.9.3, Next 15.5.28, Chromium 154.0.8037.57**. The existing pinned Playwright/axe toolchain is unchanged. No new dependency or lockfile changes.

| Command | Actual result |
| --- | --- |
| `npm ci` | Exit 0; 356 packages. Existing ESLint deprecation notice. |
| `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test` | Exit 0; **1,130 passed**: 1,023 Node + 107 Python. No failures/skips. Includes disposable local PostgreSQL/claim/admission regressions; no hosted SQL. |
| `npx tsc --noEmit` | Exit 0. |
| `npm run lint` | Exit 0; final run no warnings/errors. |
| `npm run build` | Exit 0; optimized actual Next production build; 14 static pages. Existing edge-runtime static-generation notice. |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; append-only/reproduction integrity passed. |
| Baseline browser capture | **3 passed** on current-main production, four states × three widths. No provider traffic or POST. |
| Full consumer Chromium suite (`--workers 2`) | Exit 0; **150 passed in 3.3m**, no failures/skips/retries. All 135 existing scenarios plus 15 new branding/integration scenarios at 320/390/1280. **0 axe violations** in asserted states; new tests assert **0 external requests, 0 page errors and GET-only API methods**. |
| `git diff --check` | Exit 0. |

### Final founder-copy refinement

The first screen now uses the founder’s exact headline, second line, description and “Paste Solana token address” placeholder. **SCOUT IT**, the sheep/scanner and all analyzer behavior remain. “Stop getting farmed. Start scouting.” stays on the unchanged social preview as the campaign tagline; “Level the trenches.” stays the mission. Only hero text sizing/wrapping and placeholder sizing were adjusted to fit the longer copy. Entered addresses remain **16px**. The redundant old hero aside and its unused rules were removed.

The final production build was checked with:

```sh
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs tests/consumer-homepage/browser.spec.mjs tests/consumer-homepage/readiness.browser.spec.mjs tests/consumer-homepage/unfarmd.browser.spec.mjs --workers 2
```

**Final results:** TypeScript, lint, production build and archive check all exit **0**. The focused Chromium run passes **63/63** at 320/390/1280, with **0 axe violations**, no failed/skipped/retried tests, no page errors and zero external requests in the UNFARMD integration checks. The refreshed landing captures and geometry below are from this final production build.

The focused tests cover the three affected browser files, exact copy, full placeholder fit, CTA visibility/hit target, mobile image selection, keyboard/clipboard, history/share/reset, three dated examples, rights warnings, honest source failures, labeled offline replays and actual social PNG. No assertion permits guessed facts, a hidden source warning or provider requests. Latest root CI is linked from PR #137; no workflow was modified or manually dispatched.

Additional read-only Chromium spot checks at **360×780, 375×812, 701×900, 768×900 and 1000×900** verify the CTA fits, the heading text stays inside its box, the full placeholder fits and no horizontal overflow occurs; see [recorded geometry](copy-fit-additional-widths.json). These are browser emulations, not physical iPhones.

### Performance scope

The Next build reports homepage **first-load JS 133 kB → 134 kB** and route JS **21.2 kB → 22.4 kB**. These are rounded build-tool values, not mobile field benchmarks or an invented Lighthouse score. No remote font, image service or new client dependency. Current local hero assets are **4,222 bytes desktop / 3,525 mobile** (gzip measurements **1,780 / 1,545**), avatar **1,348 bytes** (674 gzip), crew **1,763** (799 gzip). The mobile source is independently recomposed and verified through `currentSrc`, not a blind desktop crop. Final owner art will need its own performance review.

### Browser evidence

**40 genuine PNG artifacts**: 12 current-main baseline captures, 27 candidate browser captures and one actual 1200×630 social-image HTTP response. The six landing captures were refreshed for the final founder copy; existing result-state captures retain their original implementation evidence. Three `layout-{width}.json` files record final first-screen geometry and axe results. Three `actual-get-{width}.json` files preserve real local **403/access_denied**, null facts/source and the explicit offline market stub; these are admission evidence, not provider/canary observations.

| Width / height | SCOUT IT bottom | Source-restriction disclosure bottom |
| --- | --- | --- |
| 320 / 740 | 664.6px | 730.1px |
| 390 / 844 | 750.9px | 818.9px |
| 1280 / 900 | 672.5px | 750.5px |

The long GP historical example’s critical financial/rights warning remains in the 320px first viewport, including with `:has()` selectors removed. All three exact dated identities, source URLs/hashes, ownership caveats and publication boundaries remain covered. The genuine branded image responds **HTTP 200**, `image/png`, PNG signature and **1200×630** verified by decoding its bytes. Existing legacy routes, their headers, no-JS historical rendering and original token OG contracts pass.

### Findings addressed

The longer GP result initially put the rights warning at **743.4px** in a 740px viewport. Compact result-header padding fixes this without shrinking 44px controls, changing warning copy or relaxing the first-screen risk/rights assertions. Historical figures and their source restrictions remain untouched.

The dated-example navigation check now centers each below-fold choice explicitly. Native `scrollIntoViewIfNeeded` could leave a desktop choice 0.125px below the viewport after integer scroll rounding. The visibility/target-size assertions stay intact; no first-screen input/source requirement is removed. One new clipboard test reapplies its denial stub after full navigation because browser globals reset per document. These are QA fixes, not changes to clipboard permissions or production source behavior.

The PR check list records exact-head GitHub CI and existing automatic hosting checks. No manual deployment is part of verification.

## Limits and review

The placeholder’s final art/name rights are unresolved; see [ARTWORK.md](ARTWORK.md). Automated axe/Chromium is not Safari, VoiceOver or a guarantee of comprehension. Existing publication rights and source readiness are unchanged. The prior canary remains a separately owned one-shot incident boundary; this frontend work neither resolves nor retries it.
