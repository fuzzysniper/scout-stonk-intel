# V3 verification record

Executed locally on 20 Oct 2026, from main `8df27bda59d29901d8996920fbe5f0cd6892ad3d`. Node 20.20.2, npm 11.9.0, Next 15.5.28, TypeScript 5.9.3, system Chromium 154.0.8037.57. Browser testing uses the repository's existing test-only Playwright/axe dependencies; no dependency files changed.

## Commands and actual outcomes

Use the environment's Node 20 toolchain on PATH and an approved writable npm cache. The PostgreSQL binary below is disposable local test infrastructure, not Neon or a hosted credential.

| Command | Outcome |
| --- | --- |
| `npm ci` | Exit 0; 356 packages installed in 7s. npm reported existing package deprecation warnings; dependencies untouched. |
| `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test` | Exit 0; **892 Node + 106 Python = 998 tests**, zero failures. Includes real disposable-local-PostgreSQL integration and backend security regressions. No hosted database or RPC activation. |
| `npx tsc --noEmit` | Exit 0. |
| `npm run lint` | Exit 0; zero warnings/errors on the final implementation. |
| `npm run build` | Exit 0; all 14 static pages generated; all existing routes retained. Existing edge-runtime/static-generation notice remains. |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0: `Archive append-only/reproduction check passed`. |
| `npm run archive:dry-run` | **Exit 1**: `FAIL retention_boundary; local dry run did not authorize publication`. Existing Oct 11 original is beyond its eight-day publication boundary, also documented on base main. No clock override, archive edit or publication performed. |
| Full consumer Playwright production suite | **Exit 0; 135/135 passed in 4.4 minutes** on the final production build. |
| `git diff --check` | Exit 0. |

Full browser command (after production build, without an active development server):

```sh
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test \
  --config tests/consumer-homepage/playwright.config.mjs
```

The test config starts Next production on localhost:4180 and the separate trusted offline harness on localhost:4181. Screenshots in this directory come from **actual Next production browser pages**, not a static mock or image generation. No production/preview site or protected Agent B staging was accessed.

## Coverage and fixture boundaries

- New V3 browser scenarios exercise idle/paste/keyboard/real local GET denial, visibly labeled synthetic accepted controls/receipts/expiry, and blocked loading/clipboard refusal/reduced motion, at every target width.
- Existing complete consumer suite retains malformed/duplicate exact-mint queries; metadata/PNG/SSR/no-JS; three historical captures; source and rights fields; copy/share/history/cancel; delayed clipboard/source races; unsupported accounts; denied/disabled/expired/failed/rate-limited responses; Token Program vs Token-2022; maximum integer precision; independent market cooldowns; quote-side/wrong-pool/empty/future-clock market states; synthetic-source rejection in production.
- Brief unit regressions cover all concern triggers, original clock retention, expiry and failed-source unknowns, truthful skeletons, synthetic-context labeling and no all-clear for absent authorities.
- The actual local API check returns 403 `access_denied`, null facts/source, from the unchanged origin guard. See `actual-get-{width}.json`. This does not establish approved-production-host behavior or a working Helius acquisition. The browser status and rendered unknowns are asserted separately from an additional inert-localhost HTTP GET JSON probe. This avoids a Chromium no-store response-body retention race after History API navigation. The market request in that scenario is an explicitly intercepted offline 503, not a real provider result.
- Successful Next-page screenshots replay invented `production_rpc`-shaped envelopes only through Playwright interception to exercise the production validator. A permanent visible **SYNTHETIC OFFLINE QA** banner accompanies those captures. Trusted harness success uses `synthetic_fixture` context with its own visible warning. Neither is a live observation.
- Fixture acquisition clock remains `2026-10-18T12:00:00.000Z`, context slot `400000001`. These are fictional test values. StonkFun evidence keeps its original 14 Oct capture clocks/hashes. No real clock is rewritten to make evidence pass.
- No provider probe, canary POST, live RPC, hosted DB, secret read, scheduler invocation, new collector or production configuration change. No financial provider response body or private mint/watch history is committed.

## Accessibility and responsiveness

Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks run on idle, unavailable, accepted, expanded receipts and loading states. New V3 receipts record zero violations at each width; existing scenarios also retain their accessibility checks. No horizontal overflow, blocked focus, automatically submitted paste or hidden synthetic success. Source status and attention use words as well as color. Tap actions and disclosures are at least 44px tall; input is 16px to avoid common iPhone auto-zoom. Keyboard focus follows jump actions and returns to disclosure summaries on Escape. Reduced motion is asserted against the actual computed animation name.

The first full browser run exposed a recovery link below the first viewport at all three widths (132 passed, 3 placement failures). The implementation now supplies the dated-example recovery action directly in the Brief, and the regression measures and exercises that first-screen action. Expired/rate-limited/unsupported responses also retain their own source-state wording instead of being mislabeled as a disabled gate.

A subsequent run passed 134/135; the remaining case hit Chromium’s `Network.getResponseBody` protocol error while reading a no-store fetch after navigation. The HTTP-evidence harness was corrected to use Playwright’s API request client for JSON while retaining browser status/UI assertions. No product source or acceptance gate was relaxed.

Before images were captured against the unmodified base production build, then after images against this feature's production build. First-viewport accepted screenshots include the original checked clock, all three control indicators, unknowns and direct evidence actions. Full-page receipts demonstrate optional disclosure density. Screenshots are genuine Chromium captures with mobile viewport/touch emulation; **no physical iPhone, Safari engine or human comprehension test was conducted**.

## Performance scope

Next build reports homepage route **21.2 kB / 133 kB First Load JS**, versus base **19.7 kB / 131 kB**. The route remains dynamically server rendered. No remote fonts, paid assets, new packages, polling request or preloaded provider is added. Loading gives immediate truthful feedback; no synthetic progress percentage. These are build-size results, not device/network latency measurements or a claim of faster Helius responses.

## Critical self-review

The strongest improvement is the source-first Brief: a trader can see accepted versus missing evidence, control concerns and significant unknowns before reading full source fields. The visual accent identifies source acceptance, never investment safety. The untouched validator remains the trust boundary.

The real source is still unavailable to ordinary users; this interface cannot solve that infrastructure gate. Repeated unavailable explanations are intentionally subordinate to the first-screen summary. Full precision and many expanded receipts require scrolling, with direct navigation provided. Automated accessibility/layout tests do not establish comprehension or Safari/VoiceOver quality. Founder acceptance instructions are in [IPHONE.md](IPHONE.md).
