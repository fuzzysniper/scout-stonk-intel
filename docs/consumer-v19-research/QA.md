# Executed V1.9 verification

Local Linux Next.js production build + Chromium, not a deployment, physical iPhone test or human study. Node 20.20.2, npm 11.9.0, Next 15.5.28, Chromium 154.0.8037.57. Database-dependent existing tests used disposable local PostgreSQL 17.11 and synthetic data (`SCOUT_TEST_PG_BIN`); no Neon/Helius/RPC/credentials. No production activation or extra recurring acquisition.

## Actual public-data browser evidence

[The genuine receipt](public-browser.json) covers **2026-10-20 08:03:17.113–08:03:28.055 UTC**. The actual built Next API returned HTTP 200 / degraded, with 50 exact-CARDS rows from two pages, provider-reported total **2,156**, incomplete/non-atomic coverage and 12 bounded reward-mode checks attempted. The earlier single-page audit reported 2,155; neither read is rewritten to imply a stable/exhaustive total. Three adjacent viewport visits shared the existing server cache. Each browser view made one same-origin pair request; no RPC, wallet, external browser request, watch lookup, retry or background poll.

The new eligibility table reported **50 / 29 / 50** tokens with price/liquidity/volume snapshot fields, and **0 actual qualified price points**. Financial quantities/ranks/momentum remained withheld. Source revisions, generated/retrieval clocks and the changing catalog total remain attributed to their original reads, not relabeled price times. Reward-mode failures stay unknown.

At 320/390/1280: 50 rows each, no horizontal overflow, no page errors, zero axe WCAG A/AA violations on discovery. First row y=627.06 /685.47 /651.98, height 76px. Expanded evidence/readiness has separate synthetic production-browser accessibility/keyboard tests. Public capture uses the managed environment's normal proxy trust through an ephemeral **outside-repository** Undici dispatcher; localhost stays direct. No app/config/TLS/source-age change was used. No cloud proxy shim ships with the PR.

The manual audit was five successful official GETs and three denied/transport-blocked candidate/docs probes, no retries. Public QA adds at most one registry +two catalog +12 existing mode attempts and the unchanged history read for its cold process; adjacent views use the existing cache. This is a budget bound, not a claim all mode requests reached origin or succeeded. No request-rate increase, provider crawler, holder/trader probe, secret or infrastructure change.

## Commands and outcomes

| Command | Actual result |
| --- | --- |
| `npm ci` | exit 0; 356 packages; lockfile unchanged |
| `npm test` | **exit 1**; initial stages: 7+2+33 passed; root main group 500/501 passed, one pre-existing fixed-date archive fixture failed `retention_boundary`; runner stops there |
| Remaining root stages, independently executed | evidence 84, mint 68, server API 134, scheduler 18 Node tests +106 Python tests all passed; no live credentials/provider calls |
| Overall root inventory, including independently completed stages | 847 Node +106 Python =953 tests: **952 passed /1 failed**, zero skips; **not a green npm test run** |
| `bash tests/consumer-cards/run.sh` | exit 0; 33 passed, including 21 new pipeline/precision regressions; also invoked by root test runner |
| `bash tests/consumer-homepage/run-onchain.sh` | exit 0; 19 passed |
| `npx tsc --noEmit` | exit 0; no TypeScript errors |
| `npm run lint` | exit 0; no ESLint errors |
| `npm run build` | exit 0; production build; CARDS/watch first-load JS 119 kB |
| `bash scripts/archive-tool.sh check origin/main` | exit 0; append-only/reproduction passed; no archive/data edits |
| `npm run archive:dry-run` | **exit 1**; `FAIL retention_boundary; local dry run did not authorize publication` |
| CARDS Playwright production suite | exit 0; **36 passed**, 320/390/1280 |
| Preserved consumer homepage Playwright suite | exit 0; **105 passed**, 320/390/1280; total 141 fixture/preservation browser cases passed |
| Genuine offline capture inspection | exit 0; actual single-token bytes normalized, zero qualified public points, null financial metrics; [output](actual-inspection.json) |

### Pre-existing archive blockers reproduced on unchanged main

An isolated detached checkout of base `7caf7e5` built successfully. Its unchanged `tests/archive.test.mjs` reproduced **9/10 passed /1 failed**, same “git append-only check rejects edition edits and index replacement with an isolated repository” failure at `createEdition(..., new Date())`, `retention_boundary`. Its fixed artificial date is October 11, grace October 12 03:00Z; the eight-day boundary expired **October 20 03:00Z**. Production wall time is later. `npm run archive:dry-run` on unchanged main reproduces the same exit 1 for the reviewed October 11 original. The dry-run explicitly forbids clock overrides; this feature leaves that behavior intact. The real archive append-only/reproduction check still passes.

No clock freeze, fixture regeneration, archived edition replacement or retention weakening was used to turn those failures green. A separate archive-owner decision/test maintenance is required. The PR remains draft with these blockers disclosed; no all-checks-passed or publication authorization claim.

## Reproduction and regression scope

```sh
bash tests/consumer-cards/run.sh
bash scripts/cards-research-report.sh /absolute/path/to/local-capture-input.json
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-cards/playwright.config.mjs
```

Tests use the existing test-only Playwright/axe installation under `experiments/consumer-mvp/web/node_modules` and system Chromium; no dependency change. Restore that directory's pinned lockfile with `npm ci --prefix experiments/consumer-mvp/web` if needed. No live source calls occur in automatic tests. `CARDS_PUBLIC_READ_QA=approved node tests/consumer-cards/capture-public.mjs` is a separate explicit bounded manual read against an already built app; it does not qualify a new provider, license or enable collection.

New regressions cover original JSON numeric lexemes/huge integers/exponents, duplicate/prototype/complexity attacks, invalid encoding/hash tampering, exact base/quote/pool/network and fixed source paths, wrong decimals/program, unavailable/403/429/503, microsecond skew/latency/staleness boundaries, null vs zero, unsupported precision, undocumented timestamps that cannot become history, synthetic/genuine segregation, receipt/count/byte bounds, metadata allowlisting and CLI redaction. Arithmetic checks include chronological maximum vs ending drawdown, irregular/spike sampling, exact-ratio rank differences below display precision and exact momentum/context threshold boundaries. Browser tests add field-presence counts, independently withheld rights, missing fields vs unavailable sample, keyboard disclosure/focus recovery, no external request or financial leak, narrow/200% text and source navigation.

Homepage tests retain deep links, dated examples, unsupported/disabled/denied/expired/synthetic boundaries, sources/risks, clipboard, history and accessible disclosures. The existing V1.7 screenshot output is redirected to ignored test cache during this preservation run and the test source restored afterwards; no homepage or old screenshot changes belong in this PR.

## Screenshot provenance and critical review

[Inventory](validation.json) records actual dimensions and byte SHA-256. Screenshots are unedited browser captures. `before-synthetic-*` use a separate **unchanged main production build** (`7caf7e5`), the same labeled offline discovery fixture and no external requests; [baseline receipt](before.json). `after-synthetic-*` are actual feature production UI with labeled intercepted responses, not live observations. `after-public-*` are the genuine provider-backed captures above; no synthetic rows or source-derived monetary figures are displayed.

| Evidence | 320px | 390px | Desktop |
| --- | --- | --- | --- |
| Before, same offline fixture | [before](screenshots/before-synthetic-discovery-320.png) | [before](screenshots/before-synthetic-discovery-390.png) | [before](screenshots/before-synthetic-discovery-1280.png) |
| After, genuine sample | [public](screenshots/after-public-discovery-320.png) | [public](screenshots/after-public-discovery-390.png) | [public](screenshots/after-public-discovery-1280.png) |
| New readiness, offline fixture | [eligibility](screenshots/after-synthetic-readiness-320.png) | [eligibility](screenshots/after-synthetic-readiness-390.png) | [eligibility](screenshots/after-synthetic-readiness-1280.png) |

[Actual public evidence](screenshots/after-public-evidence-390.png) and [actual public readiness](screenshots/after-public-readiness-390.png) retain identities/clocks/limitations, not financial amounts. Empty/429 screenshots are separately labeled synthetic. To compare the same fixture before/after, use `before-synthetic-methodology-*` and `after-synthetic-readiness-*`; these are not observations about actual performance.

Critical review: this is still a partial discovery product with a better explanation of precisely **why a leaderboard is not supportable**. The new table is behind the existing accessible methodology disclosure; the first viewport keeps a short conclusion/coverage/rights warning. Fifty alphabetized rows are long; search remains local and clearly sample-scoped. Actual public sources have not supplied comparable price times, market-cap definitions, participant counts, covered CARDS reward flows or permission to publish financial results. No UI polish or passing synthetic calculation repairs those gaps. Physical iPhone Safari, human comprehension and provider rights remain untested/unresolved. See [founder acceptance checklist](IPHONE_ACCEPTANCE.md).
