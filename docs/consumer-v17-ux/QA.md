# Consumer V1.7 launch readiness

Agent A consumer-only work, continuing [#111](https://github.com/fuzzysniper/scout-stonk-intel/issues/111). Base is latest main `6ea4d48`, including merged Consumer V1.6 #116 and inactive infrastructure preparation #117. Draft #118 is excluded entirely. No earlier merged work recreated or cherry-picked.

## Audit and three shipped improvements

The baseline audit ran actual Chromium at 320×740, 390×844 and 1280×900 through discovery, deliberate paste, result, source-disabled/loading and a current-account fixture for a known historical example. Before PNGs came from the unedited Next production build and labeled offline harness, not an assumed live deployment.

| Remaining V1.6 friction | Working V1.7 change | Meaningful guard |
| --- | --- | --- |
| The result's exact address is behind Evidence, making a result easy to confuse with an edited draft or similarly named token. | The full, selectable exact mint is visible next to every result. It says **Requested token address** for loading/failure and **Exact token address** only after accepted account facts. | No alias, normalization, truncation or ticker-based identity. Editing a draft leaves the previous requested/result identity unchanged until explicit submit. No new clipboard read or source request. |
| Missing source and unsupported states describe technical failure but offer little guidance. | Clear loading scope and a short state-specific next step. Source-disabled/denied users can jump directly to explicitly dated examples; unsupported-account users can focus/select the address for correction. Manual retry/countdown remains for transient/expired/limited states. | No token legitimacy verdict, guessed fields, automatic retries or bypass of disabled source. Loading displays no accepted quantities, authority state or timestamp. Fragment navigation does not call a provider. |
| The global dated-example banner frames the landing search and can also remain above an accepted independent account response for SI/GP/GROK. | Search explains supply/control scope; the Oct 14 capture label sits with dated discovery. A current accepted account response no longer inherits a stale StonkFun banner. Its separate historical disclosure remains explicitly dated/stale; if current facts expire, the old explanation regains its own dated banner. | No renewal of historical evidence, hidden rights change or inference from chain facts to rewards/equity/backing. Three exact examples, original receipts and financial withholding remain. |

The existing quiet palette, typography, paste fallback, Go key, exact supply, control questions and native nested Evidence are preserved. Small-screen spacing accommodates visible full identity without dropping source/extension/unknown warnings or reducing text sizes. This is working UI code, not a new brand or decorative redesign.

## Contract, source and ownership boundaries

[Scope/interface handoff](https://github.com/fuzzysniper/scout-stonk-intel/issues/111#issuecomment-6268892884). **`onchain-model.ts`, `onchain-client.ts`, all backend/shared contracts and APIs are unchanged.** Production still requires matching exact mint, approved `production_rpc` acquisition plus exact Helius host, initialized supported Solana program, exact supply arithmetic, consistent authority/extension interpretation, finalized slot, receipt hash and valid original capture clocks. All freshness, source refusal and body/timeout limits remain in the existing boundary.

The source is RPC-reported, not independently replayed. Project identity, value, holder payments, shares/backing and payout entitlement remain unverified. Authority absence is not unrestricted transfer or a safety promise. Token-2022 unreviewed controls remain explicit; supported metadata-pointer review never verifies branding. Solana program distinctions, raw/decimal units and full receipt fields remain available. Checked time is original server UTC, not UI/render/cache time; finalized slot is a snapshot boundary and slot time remains unavailable.

Original 60-second expiry removes facts. Copying, editing, evaluation time, navigation or UI rerender cannot renew it. The original six-second bounded same-origin GET, 32KiB decoded body bound, cancellation/generation checks, no-store/no-credential/redirect policy and tab-wide 429 cooldown are unchanged. A source failure is not proof that an address is absent or a token illegitimate.

No change to PR #118's operations docs/scripts/tests or `vercel.json`; no Neon/database configuration/migration, infrastructure, credential, production RPC, workflow, collector, scheduler, treasury or data edit. No real Helius/Neon call or authenticated observation occurred. Local full-suite database tests use only the pre-existing disposable Unix-socket harness and synthetic test data, not a hosted database. Provisioning does not establish deployment/activation.

## Genuine browser evidence

Every positive current-account value, source hash, slot and timestamp is an **invented synthetic/offline fixture**, including the production-discriminator envelope. The permanent harness warning stays in those PNGs. They are real Chromium captures of real consumer components/CSS, not authentic Helius data, composited designs, physical iPhone photos or evidence of human comprehension.

| View | 320px | 390px | 1280px |
| --- | --- | --- | --- |
| Before: actual Next production landing | [PNG](screenshots/before-landing-320.png) | [PNG](screenshots/before-landing-390.png) | [PNG](screenshots/before-landing-1280.png) |
| After: actual Next production landing | [PNG](screenshots/after-landing-320.png) | [PNG](screenshots/after-landing-390.png) | [PNG](screenshots/after-landing-1280.png) |
| Before: offline current-account answer | [PNG](screenshots/before-synthetic-answer-320.png) | [PNG](screenshots/before-synthetic-answer-390.png) | [PNG](screenshots/before-synthetic-answer-1280.png) |
| After: offline answer with full identity | [PNG](screenshots/after-synthetic-production-profile-320.png) | [PNG](screenshots/after-synthetic-production-profile-390.png) | [PNG](screenshots/after-synthetic-production-profile-1280.png) |
| After: offline unreviewed Token-2022 | [PNG](screenshots/after-synthetic-production-extensions-320.png) | [PNG](screenshots/after-synthetic-production-extensions-390.png) | [PNG](screenshots/after-synthetic-production-extensions-1280.png) |
| Before: stale banner above independent fixture | [PNG](screenshots/before-synthetic-history-320.png) | [PNG](screenshots/before-synthetic-history-390.png) | [PNG](screenshots/before-synthetic-history-1280.png) |
| After: clearly separate source layers, offline | [Full PNG](screenshots/after-synthetic-history-320.png) | [Full PNG](screenshots/after-synthetic-history-390.png) | [Full PNG](screenshots/after-synthetic-history-1280.png) |
| Before: offline source-disabled state | [PNG](screenshots/before-synthetic-disabled-320.png) | [PNG](screenshots/before-synthetic-disabled-390.png) | [PNG](screenshots/before-synthetic-disabled-1280.png) |
| After: offline disabled state with next step | [Full PNG](screenshots/after-synthetic-disabled-320.png) | [Full PNG](screenshots/after-synthetic-disabled-390.png) | [Full PNG](screenshots/after-synthetic-disabled-1280.png) |
| Before: offline pending request | [PNG](screenshots/before-synthetic-loading-320.png) | [PNG](screenshots/before-synthetic-loading-390.png) | [PNG](screenshots/before-synthetic-loading-1280.png) |
| After: offline pending request and exact identity | [PNG](screenshots/after-synthetic-loading-320.png) | [PNG](screenshots/after-synthetic-loading-390.png) | [PNG](screenshots/after-synthetic-loading-1280.png) |

Additional after PNGs cover Evidence, denied, expired, rate-limited, failed and unsupported responses. [validation.json](validation.json) records final commands, viewport measurements, image dimensions/hashes and context. Existing V1.6 screenshot files remain unchanged; the older browser regressions write scratch captures to ignored test cache. “Production build” means local Next build/start, not independent deployed-site verification.

## Reproduction and coverage

Existing Node 20.20.2 / npm 11.9.0 / Next 15.5.28 / Chromium 154.0.8037.57. No dependency/lockfile changes. Existing isolated Playwright/axe/Vite tools are reused; if missing, restore their existing lockfile with `npm ci --prefix experiments/consumer-mvp/web`. The browser config owns local ports 4180/4181 and starts an actual Next production server plus isolated harness.

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

Final required commands all exited **0**: **920 root tests**, **19 scoped consumer tests**, **105 Chromium browser cases**, typecheck, zero-warning lint, 12-page production build and both archive checks. Tested axe violations, unexpected browser errors and external browser requests: **0**. `npm ci` installed 352 packages with the existing ESLint deprecation notice. All 51 screenshot dimensions/hashes and viewport measurements are in validation.json.

Full root tests require PostgreSQL 15+ for the existing offline harness. This environment reuses locally extracted signed Debian PostgreSQL 17.11 binaries through `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin`. No hosted Neon URL, real database modification, service provisioning or production credential is used. Existing test-only temporary databases are created/disposed by the unchanged harness.

Initial diagnostics: a presentation condition needed an explicit TypeScript union guard, and one existing frontend SSR assertion needed the intentional “3 dated examples” wording. The first complete browser matrix passed 103/105; the two failures were strict 320px first-viewport checks with both mandatory offline labels. Small-screen spacing was tightened without reducing font sizes, omitting fields/warnings or loosening assertions, then the full matrix was rerun.

Coverage includes original parser/precision/program/authority/extension/source/expiry refusal tests; actual Next native source denial/no-JS/SSR/bundle isolation; three original source records and routes; real seeded Chromium clipboard plus denied/missing/delayed variants; keyboard/search/history/clipboard fallback; all new requested-versus-result identity, next-step fragment focus, unsupported-address selection, deferred loading and six recovery states; current/historical label separation before and after expiry; exact original source time/hash/slot; and source/rights preservation. Axe checks WCAG 2 A/AA, 2.1 AA and 2.2 AA in tested states. Unexpected browser errors and external browser traffic fail tests. No assertion of physical Safari or 30-second comprehension follows from an automated pass.

## Self-review, limitations and rollback

A user can now match the full address to the answer and distinguish a new draft from the displayed result. Recovery actions have a clear destination and do not imply a token judgment. The dated source label is closer to the evidence it describes, while current facts for a known example no longer inherit that label. Full addresses add wrapping/height at 320px; first-screen checks remain strict even with both offline warnings. Receipt details remain a second action for specialists. Unsupported wording still refers to a token mint because that is the bounded API's scope; it never promises project/name coverage.

No physical iPhone Safari, VoiceOver, enlarged text, native paste, actual Helius observation or uncoached human test was performed. Use the concise [founder checklist](IPHONE_ACCEPTANCE.md) after a separately authorized genuine observation. Existing StonkFun metadata/retention/publication rights remain unresolved under the [original review](../consumer-homepage/PUBLICATION_REVIEW.md); financial quantities stay withheld. No new source capture, redistribution permission or economic data is published here. Source/store rights, costs, quotas, credentials, real infrastructure validation and activation are B/owner gates, not inferred from a passing UI.

Owner rollback is a reviewed revert of only this PR's eventual merge/squash commit. Preserve merged backend/security/data work and PR #118 independently. No schema, service, secret or configuration rollback is required in A's scope. If a backend has separately been activated later, reverting the consumer does not stop server I/O/costs: use B's approved kill switch first. No agent merge, deployment or activation.
