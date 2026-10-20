# Actual verification and limitations

Local Next.js **production build** and Chromium; no manual deployment, physical iPhone, human test, genuine Helius request or RPC activation. Base `86a2edf597f728e9fb502b99f624120cf8831725` includes merged #121/#122. No Agent B file, API/shared contract, collector, workflow, database, dependency, security or hosting change.

## Executed checks

| Check | Actual result |
| --- | --- |
| `npm ci` | exit 0; 356 packages; existing lockfile unchanged |
| `npm test` | exit 0; **855 Node +106 Python =961 passed**, zero failures/skips; includes eight new consumer interpretation tests in the root runner |
| `bash tests/consumer-homepage/run-onchain.sh` | exit 0; 19 passed; existing MintFactsV1 precision/source/failure boundaries preserved |
| `npx tsc --noEmit` | exit 0; no TypeScript errors |
| `npm run lint` | exit 0; no ESLint errors |
| `npm run build` | exit 0; actual production build; homepage first-load JS 123 →131 kB, no new dependency/third-party script |
| `bash scripts/archive-tool.sh check origin/main` | exit 0; append-only/reproduction passes, no data/archive edits |
| `npm run archive:dry-run` | **exit 1**; unchanged `FAIL retention_boundary; local dry run did not authorize publication` for the reviewed Oct 11 original outside its eight-day boundary; no clock override or archived edition change |
| Consumer homepage Playwright | exit 0; **126 passed** at 320/390/1280, including 21 new trader cases |
| New trader screenshot recheck | exit 0; 21 passed again after correcting full-page capture scroll position; not additional unique cases |
| Preserved CARDS Playwright | exit 0; 36 passed; secondary CARDS/watch unchanged |
| Total distinct browser cases | **162 passed**; keyboard, clipboard, focus, source failures, original identity, back/forward, sharing, expiry and responsive/accessibility QA |

Logs/counts and screenshot dimensions/hashes are in [validation.json](validation.json). Toolchain: Node 20.20.2, npm 11.9.0, Next 15.5.28, Chromium 154.0.8037.57. Existing database tests use disposable **local** PostgreSQL 17.11 with synthetic records via `SCOUT_TEST_PG_BIN`; no hosted Neon or real credentials. Python/scheduler/security checks are existing offline tests, not live dispatches.

The root archive test is now deterministic from merged #122 and passes. The separate genuine historical publication replay still refuses an expired original under the existing production retention rule. It is not claimed green, regenerated or enabled by this PR.

## Source / API audit and bounded actual read

Reviewed the actual homepage/input/model, same-origin clients, `/api/token`, `/api/mint-facts`, shared MintFactsV1 and existing native production acquisition documentation. The consumer boundary/source contract is unchanged. The generic market route selects a highest-reported-liquidity matching Solana pool, may return a quote-side match, exposes untimed financial fields, and generates `fetchedAt` on the server rather than a market tick time. It does not establish exhaustive coverage or a circulating-cap methodology. The new result reuses the existing metadata projection and withholds its quantities independently of whether HTTP succeeds.

One completed read-only local production `/api/token` probe ran **2026-10-20 18:42:17.972–18:42:18.233 UTC**, HTTP **200**, `consumer_identity_projection_passed`, one attempt, zero mint-facts/Helius requests. Only technical HTTP/validation status was emitted. No source body, pool fields, financial figures or live-source screenshot/receipt was published. The projector validates exact mint/source/clock and, if returned, base/quote/pool membership; this status alone is not a claim that a positive pool or price was returned. No provider-wide search or retry was performed. An initial local probe used port 4190, rejected by Node's standard bad-port policy before a source request; it was corrected to ordinary local port 4183 without altering network/provider restrictions.

The managed environment's normal proxy/CA was used through an ephemeral outside-repository dispatcher for that public read. No app/TLS/source freshness/credential setting changed. Automatic approval review rejected an earlier proposal to write public-market screenshots/receipts into the repository because source redistribution rights are unverified. That rejected command did not execute. The safe completed alternative was read-only status/projection validation with **no source-derived publication artifacts**. No denied provider restriction was bypassed. Market financial quantities remain withheld; HTTP access does not grant publication rights.

## Production browser screenshots

Actual, unedited Chromium renders at 320×740, 390×844 and 1280×900. Before captures use the unchanged main production build completed before implementation; [baseline receipt](before.json). Before unavailable captures explicitly replay a disabled failure; they are not current infrastructure observations. Landing screenshots contain no simulated current result.

Successful **after** screenshots always show a visible `SYNTHETIC OFFLINE QA · NOT LIVE TOKEN OR MARKET DATA` banner. They replay an invented, contract-valid production envelope through the real consumer validator in the actual Next production page. The acquisition discriminator alone is not claimed authentic evidence. Test market labels also say synthetic; financial values deliberately present in fixtures never appear in the consumer projection/DOM. There is no production fixture import, test route, query switch or fake default.

| Screenshot | 320px | 390px | Desktop |
| --- | --- | --- | --- |
| Before landing | [before](screenshots/before-landing-320.png) | [before](screenshots/before-landing-390.png) | [before](screenshots/before-landing-1280.png) |
| New explicit Analyze flow | [landing](screenshots/after-synthetic-landing-320.png) | [landing](screenshots/after-synthetic-landing-390.png) | [landing](screenshots/after-synthetic-landing-1280.png) |
| Accepted contract, synthetic offline | [answer](screenshots/after-synthetic-answer-320.png) | [answer](screenshots/after-synthetic-answer-390.png) | [answer](screenshots/after-synthetic-answer-1280.png) |
| Precise concern + market/unknown layers | [evidence](screenshots/after-synthetic-evidence-320.png) | [evidence](screenshots/after-synthetic-evidence-390.png) | [evidence](screenshots/after-synthetic-evidence-1280.png) |

Additional screenshots cover extension limitations, expired/unverified observations and independent cooldowns. The prior V1.7 screenshot path was redirected to ignored cache during preserved-journey QA. CARDS screenshot outputs were restored/removed after testing so its original evidence is not rewritten. All source-date, source-rights and historical finance assertions remain.

## Regressions / accessibility

New pure tests verify each exact trigger/reference, fresh/expired/backward-clock concerns, absent-authority uncertainty, unreviewed extension labels without guessed powers, synthetic rejection/labeling, market role/time/identity validation, amount stripping and honest SSR unknowns. They are imported by the existing root consumer test file, so GitHub CI executes them without a workflow change.

New production-browser cases cover deliberate clipboard without submit, explicit Analyze, exact u64 supply and finalized slot/time, count/field/hash provenance, native disclosures/Escape, copy mint/share, three concern rules, no all-clear on absent authorities, disabled/denied/unsupported/incomplete/synthetic source states, independent 429 clocks, 60s expiry with no automatic retry, quote-side aging without role promotion, wrong/empty/future market responses and cancellation/replacement/back/forward. Existing cases retain long decimal and Token-2022 semantics, stale dated examples/rights/ownership, no-JS/SSR, keyboard, clipboard denial/races, source links, 200% text/long labels and `:has` removal.

axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks pass at all widths. The 320px regression initially found the new attention link pushed the source boundary below the first viewport; spacing and redundant boundary copy were tightened, preserving visible slot/time/uncertainty and >=44px controls. The initial screenshot-label insertion caused React hydration error 418; the QA banner is now inserted only after the hydrated source request starts. A full-page screenshot captured an offscreen fixed skip-link while scrolled; resetting to document top before full-page capture resolves that capture artifact without editing images or hiding keyboard controls. Final tests preserve focus/overflow/no-page-error assertions.

## Remaining limits and acceptance

No authentic Helius response, physical iPhone Safari, human comprehension study, market financial permission or timing qualification is claimed. The UI is implemented and tested against the existing real contract; Agent B/owner still controls native acquisition, canary scope, permissions and activation. A genuine accepted canary will use the same renderer/rules; denied noncanary requests remain no-verdict states. Financial market/reward/holder figures remain withheld, including when mint facts succeed. See [physical iPhone acceptance](IPHONE_ACCEPTANCE.md) and [deterministic rules](RULES.md). No merge, manual deployment or activation performed.
