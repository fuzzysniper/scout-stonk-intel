# Consumer release verification

Historical verification for `29ae3cb`; current launch-viewer checks are recorded in [#167 verification](../live-feed-167/VERIFICATION.md). The old production-root stories are preserved as `tests/consumer-homepage/legacy.playwright.config.mjs` for reproduction on that old checkout, not counted as coverage for the new homepage. Pure component/validator regressions remain in root CI.

23 October 2026. [Machine-readable results](verification.json) · [Protected scope](scope.json) · [Release checklist](RELEASE.md) · [Physical iPhone acceptance](IPHONE.md).

**Story:** exact-mint input → deliberate SCOUT IT → unchanged same-origin GET → strict source/identity/freshness validation → receipt if accepted, otherwise honest denial. Production proof and public GET activation are separate owner/Agent B gates.

| Check | Actual result |
| --- | --- |
| Locked root install | `npm ci --cache /tmp/unfarmd166-npm-cache`: pass; no manifest/lockfile edits |
| Root CI-equivalent suite | `npm test`: **1,167 Node + 107 Python = 1,274 passed**, zero failures/skips |
| Focused consumer/client/receipt/artwork/Outlier units | **46 passed**, zero failures/skips |
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Pass, no lint warnings/errors |
| `npm run build` | Pass, optimized Next 15.5.28 production build |
| `bash scripts/archive-tool.sh check origin/main` | Pass |
| Full combined consumer Chromium suite | **231/231 passed in one clean 7.5-minute run**, at 320×740 / 390×844 / 1280×900 |
| Integration boundary cases within that run | **6 passed**: actual local handler denial and failure-only hosting-auth HTML handling at each width |
| Original frontend/art / protected backend comparison | Parent runtime/assets identical; API/lib/data/scheduler/workflows/config/dependencies identical to main `6a9ba2f`; baseline ancestry preserved |
| Client bundle review | No matches for selected server-only markers (`PREFLIGHT_APPROVAL`, `readDsn`, `scout_mint_app`, private-key header) in emitted client JS; not an exhaustive secret audit |
| GitHub CI / automatic preview | See the PR's exact-head checks; local results do not establish hosted success |

The local root suite used **disposable PostgreSQL 17**, extracted under `/tmp`, with `SCOUT_TEST_PG_BIN`, `SCOUT_TEST_PG_SHARE` and its local library path. No hosted SQL, credentials, proof/preflight endpoint or RPC was used. Root dependencies were reinstalled from the unchanged lockfile before the final run. The initial environment lacked those current packages and PostgreSQL binaries; final results above include the completed prerequisites, with no skipped database tests.

The first browser attempt was stopped after a newly added test assumed the search toggle existed while the deep-link input was already visible. The test now checks whether the input is hidden before using that toggle. No runtime change was needed. The final **231** results are a new complete run, not combined partial passes.

## Reproduce locally

Use the unchanged root lockfile and existing browser-tool lockfile:

```sh
npm ci
npm --prefix experiments/consumer-mvp/web ci --ignore-scripts
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs
```

Root tests require PostgreSQL 15+ binaries; set the two test-path variables above when installed outside standard locations. Browser config uses `/usr/bin/chromium` if available, or `CONSUMER_CHROMIUM_PATH`. It runs the optimized app on localhost:4180 and the existing isolated harness on localhost:4181; never replace these with a production source. Some inherited tests refresh old QA artifacts; retain only intentionally reviewed evidence in a future commit.

Focused 46-case reproduction, using a disposable build directory:

```sh
node_modules/.bin/tsc app/consumer/home.tsx app/consumer/cards/model.ts tests/consumer-homepage/synthetic.ts --jsx react-jsx --resolveJsonModule --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir /tmp/unfarmd-consumer-units
NODE_PATH="$PWD/node_modules" HISTORY_TEST_BUILD=/tmp/unfarmd-consumer-units CONSUMER_TEST_BUILD=/tmp/unfarmd-consumer-units node --test tests/consumer-homepage/onchain.test.mjs tests/consumer-homepage/trader.test.mjs tests/consumer-homepage/artwork.test.mjs tests/consumer-homepage/outlier-brand.test.mjs
```

## What the browser evidence establishes

- Actual local production GET: **403/access_denied**, null facts/source, truthful “Check not permitted,” no inferred supply/control facts, zero passive calls and no proof POST. The canonical-origin application denial is **not** proof of canonical disabled status, Vercel protection or authentic production connectivity.
- Failure-only 401 HTML transport fixture: access denial rather than accepted data, automatic login navigation, resubmission or privileged fallback.
- Inherited labeled offline cases: strict exact-mint/program/source/precision, authority/extension limits, Control Receipt clocks/expiry/export rules, cancellation, keyboard/focus, clipboard recovery, no automatic retries, source separation and rejected synthetic acquisition in production. These are tests, not authentic live results or a new demo.
- Approved artwork, loading/failure fallbacks, first-screen task, Outlier SVG favicon, generated 180px Apple icon, social PNG/canonical/noindex metadata, reduced motion, forced colors, layout zoom/reflow and asserted axe states pass. Zero external browser traffic is asserted in the relevant source/visual cases; no genuine provider call was made.
- New committed screenshots show only the actual combined homepage and source-denied flow. Inherited QA screenshots/receipts were restored byte-for-byte after the run, rather than relabeled as new evidence. No design or accepted-data showcase was added.

**Still pending:** physical iPhone Safari/VoiceOver/Home Screen and desktop Edge, actual hosted identity/protection and browser credential compatibility, brand/art/source rights, Agent B's authentic production mint proof, bounded public GET approval and any public/private exposure change. Keep the candidate protected and source-disabled until the applicable separate gates pass. This PR does not complete #166's authentic deployed MVP definition of done.
