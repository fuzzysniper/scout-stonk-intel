# Consumer V1.3 frontend preparation — #103

## Outcome and evidence boundary

**Inactive fallback only. No current onchain result is enabled or demonstrated.** Started from main `c6ab86d`, including merged #100/#101. Agent B #102 had not published MintFactsV1, a source adapter/route, authentic recorded RPC captures or a backend PR during implementation. Immediate coordination and the unresolved contract/activation steps are recorded in [INTEGRATION.md](INTEGRATION.md). No backend schema was invented or copied.

The actual Next production homepage now preserves a valid arbitrary exact address in `/?mint=` while displaying **Onchain source unavailable**. It says that no blockchain check occurred, does not confirm mint account type, and explicitly withholds supply, authorities, extensions, checked slot and check time. The submitted address is not labeled a token. Definitions explain supply vs value/balance, issuance authority, freezing and unknown Token-2022 controls; none is a reported observation. Explorer is a separate, optional external tool, not a verified source result here.

The existing three StonkFun examples, Oct 14 capture clocks, ownership wording, all original receipts and public/financial withholding gates remain unchanged. Their separate onchain panel expressly says the old provider statement does not verify current chain state. On arbitrary-address pages, discovery choices retain their own explicit **14 Oct 2026 · stale StonkFun** label. No NVIDIA/SpaceX shares, gold, holder entitlement, payments, liquidity, prices or returns are inferred from a mint/address.

## Real production screenshots

Actual `next build` → `next start`, original evidence engine, system Chromium 154.0.8037.57. Mobile/touch emulation at 320×740 and 390×844; desktop at 1280×900. These are local production-build screenshots, **not the live hostname, physical iPhones, WebKit or human testing**. The arbitrary address is a submitted input only, not an authenticated RPC fixture. No successful onchain snapshot was simulated or photographed.

| State | 320 | 390 | 1280 |
| --- | --- | --- | --- |
| Source unavailable, initial viewport | [PNG](screenshots/unavailable-320.png) | [PNG](screenshots/unavailable-390.png) | [PNG](screenshots/unavailable-1280.png) |
| Full unchecked-address page and visible unknowns | [PNG](screenshots/unavailable-full-320.png) | [PNG](screenshots/unavailable-full-390.png) | [PNG](screenshots/unavailable-full-1280.png) |
| Historical explanation and separate unavailable chain panel | [PNG](screenshots/historical-separate-320.png) | [PNG](screenshots/historical-separate-390.png) | [PNG](screenshots/historical-separate-1280.png) |
| Preserved discovery | [PNG](screenshots/after-landing-320.png) | [PNG](screenshots/after-landing-390.png) | [PNG](screenshots/after-landing-1280.png) |
| Original provider evidence disclosure | [PNG](screenshots/after-sources-320.png) | [PNG](screenshots/after-sources-390.png) | [PNG](screenshots/after-sources-1280.png) |

Additional exact-result, technical-receipt and search screenshots are retained alongside those linked. [Validation](validation.json) records PNG hashes, actual build ID, source hashes, runtime and first-viewport measurements. No cropped/composited screenshots, fake source responses or live “verified” badges.

## Commands and results

Node 20.20.2, npm 11.9.0, Next 15.5.9. From repository root:

```
npm ci
npm test
bash tests/consumer-homepage/run-onchain.sh
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs
```

All final commands exit **0**. `npm ci`: 336 packages, existing ESLint 9.39.5 deprecation notice; no dependency/lockfile edits. Root suite: **501 app + 29 original evidence + 31 candidate evidence + 24 offline pilot + 106 Python + 18 scheduler adapter tests**. Scoped new unit/SSR suite: **7**. Production browser: **39 cases**, 13 per viewport. Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA rules report zero violations in tested states. Root production build produces all 12 static pages and existing dynamic routes. Both archive checks pass without publication or archive edits.

The browser tools were already installed in the isolated `experiments/consumer-mvp/web/node_modules`; reproduce with its unchanged `npm ci --prefix experiments/consumer-mvp/web` if needed. The Playwright configuration starts its own `next start` on loopback port 4180; build first and leave the port free. Set `CONSUMER_CHROMIUM_PATH` for another installed Chromium. The new scoped Node suite compiles only required consumer modules into a disposable directory and removes it on exit. Existing CI/root tests do not automatically run these additional scoped commands; their local results are separate.

Coverage:

- All three exact dated mints, disclosure and original field/URL preservation, ownership/rights warnings, no restricted financial payload in HTML/RSC or homepage JS, noindex/metadata baseline, neutral PNG/favicon and original `/terminal`/research/radar/status/brief routes.
- Arbitrary exact input/deep link/reload, unknown and different-SI inputs, ticker/whitespace/HTML/URL/duplicate-query rejection, no auto-enrollment or supported-token inference, missing slot/time rather than zero or fabricated clocks.
- Draft input cannot change an existing submitted result/address/link. Back/Forward, result focus, collapsed historical search, Start over, keyboard disclosures/Enter/Escape, copy success and selectable clipboard fallback all work. Copied unchecked-address links exclude injected query flags/targets.
- No RPC/API source requests from new flow. Arbitrary `rpc`, `slot`, `fixture` or activation parameters cannot produce facts, source clocks or a successful result. Fixed HTTPS Explorer links are validated against the exact input; no caller-chosen network target.
- Critical unavailable explanation and unavailable-slot label fit the tested initial viewport. No horizontal overflow; interactive controls meet ≥44px height in the onchain panel. Original compact warning visibility is preserved after CSSOM removal of `:has()` selectors. This is a targeted compatibility regression, **not a Safari certification**.

The first browser run found **nine ambiguous mint-address selectors**, because the same exact identity is correctly present in both separate panels. Those assertions now explicitly address the historical card; no product guard or layout assertion was weakened. The final full browser run passes. Test mutations with synthetic HTML/query strings or extra component props are negative cases only; there is no synthetic successful RPC observation.

## Limits and owner checks

- Genuine verified-at-slot, stale-response, supported/unknown Token-2022 extension results and actual server 429/503/timeout handling are **not exercised or implemented here**: the real source contract and authentic fixtures are missing. An unavailable screenshot does not prove any mint facts. The detailed remaining data/transport/activation gates are in [INTEGRATION.md](INTEGRATION.md). This PR cannot activate a source after backend merge by itself.
- The unavailable page keeps the large search visible because no successful result exists. At 320px, the source failure and missing slot are visible initially; the full yellow unknowns and educational disclosures require scrolling. This is explicit inability to verify, not a hidden positive result or risk rating. The existing first-view ownership and dated risks remain protected by their original browser measurements.
- No actual live-host, physical Safari, VoiceOver or human comprehension test was performed in this task. Run the existing [physical-device checklist](../consumer-usability/OWNER_VERIFICATION.md) after an owner-approved merge and verified normal deployment SHA. Add checks for the new unchecked-address deep link, visible missing slot/time, no current validity claim, separate Oct 14 layer, Explorer context, native keyboard focus and clipboard behavior. At larger text sizes, warnings must remain reachable without clipping.
- Existing metadata publication/retention rights remain unresolved. No provider record, raw body, financial quantity, new mint support or proprietary source acquisition is added. Follow the existing [publication review](../consumer-homepage/PUBLICATION_REVIEW.md); future independently sourced chain facts cannot retroactively clear StonkFun rights.

## Rollback and preservation

Only `app/consumer/**`, scoped `tests/consumer-homepage/**` and this new QA/documentation directory change. `model.ts`, original evidence/candidate/pilot files, APIs, `/terminal`, root/global styles, data/archive, collection, scheduler, workflows and deployment configuration remain byte-identical to the base. No credentials, accounts, transactions, wallets, keys, migrations, storage, permissions or infrastructure activation are involved.

A human may revert only this PR’s approved merge/squash commit in a reviewed PR, preserving #100/#101 and subsequent real datasets/source work. Do not reset main or restore an old data tree. The original three-only unavailable message returns; no external service requires rollback. Verify the normal resulting production SHA and repeat the existing homepage/terminal smoke checks. The agent does not merge or deploy.
