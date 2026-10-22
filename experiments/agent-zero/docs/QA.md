# Verification — October 22, 2026

Baseline main: `acd72f2d09cb9bec3f40fd8dcddcf031decae950`. Node 20.20.2, npm 11.9.0. No production/provider request or wallet interaction. Root checks use the existing offline suites, including disposable local PostgreSQL fixtures; this is not hosted Neon SQL.

| Check | Result |
|---|---|
| Root `npm ci` with writable `/tmp` cache | PASS, 356 packages; existing ESLint deprecation notice |
| `node experiments/agent-zero/build.mjs` | PASS, standalone offline build |
| `node --test experiments/agent-zero/tests/engine.test.mjs experiments/agent-zero/tests/server.test.mjs` | PASS, 42 tests, 0 failures/skips |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS, no ESLint errors/warnings |
| `npm run build` | PASS, optimized Next.js; 29 existing route entries, no Agent 0 public route |
| `bash scripts/archive-tool.sh check origin/main` | PASS, append-only/reproduction |
| Root `npm test` | PASS, 1,160 Node + 107 Python = 1,267 tests, no failures/skips |
| Chromium QA | PASS at 320×740, 390×844, 1280×900 |

The first `npm ci` attempt could not create the environment's default `/home/agent/.npm` cache. Retrying the same lockfile with `NPM_CONFIG_CACHE=/tmp/scout-agent0-npm-cache` succeeded. No dependency/lockfile change or permission escalation. Root test fixture command used `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test`.

## Offline regression/security coverage

Exact base58 identity and unsigned >53-bit precision; bounded local imports; original source/provider/local availability clocks and hashes; duplicate/conflicting/future captures; all-as-of evidence and immutable criteria/policy snapshots; late backfill causality; rejection retention; permanently closed eligibility gate; idempotency conflicts; tamper/torn-tail/backward-clock/lock recovery; outside-checkout/symlink/0600 storage; unconfirmed manual claims and duplicate signatures/precision conflicts; negative net quantities; shadow/real separation; forbidden outcome injection; modeled fees/slippage/loss/MAE/MFE/sample drawdown; no hindsight entry; quote/pool/clock/coverage/capacity/budget/zero-price failures; no auto-seeding; explicit local import without global fetch; HTTP Host/Origin/CSP/static/body-size/route restrictions. No test asserts a genuine price, investment edge, wallet balance or provider response.

## Browser evidence

`node experiments/agent-zero/tests/browser.mjs` used actual local HTTP app + Chromium **154.0.8037.57**, DPR 1, fresh disposable journals per viewport. [Machine results](browser-results.json), [image hashes](screenshot-hashes.json). Each width passed: import seven genuine metadata candidates; original clocks; all finalized facts null; explicit wait/reject-form recording; manual claim precision/unconfirmed/null-NAV behavior; isolated synthetic dossier/loss calculation; keyboard focus; 200% reflow; reduced motion; forced colors; axe WCAG A/AA/2.1/2.2 checks. **0 external requests, 0 page errors, 0 axe violations** in each run.

All journal mutations during QA were disposable test actions, not genuine founder decisions/transactions. No screenshot contains founder positions or an asserted real holding. The fictional walkthrough is conspicuously labeled on screen and excluded from genuine outcomes.

| Surface | 320px | 390px | 1280px |
|---|---|---|---|
| Empty, explicit import | [image](screenshots/empty-320.png) | [image](screenshots/empty-390.png) | [image](screenshots/empty-1280.png) |
| Real retained metadata / insufficient evidence | [image](screenshots/recorded-320.png) | [image](screenshots/recorded-390.png) | [image](screenshots/recorded-1280.png) |
| Founder view, no claims recorded (not a wallet-balance assertion) | [image](screenshots/founder-unfunded-320.png) | [image](screenshots/founder-unfunded-390.png) | [image](screenshots/founder-unfunded-1280.png) |
| Invented dossier | [image](screenshots/synthetic-dossier-320.png) | [image](screenshots/synthetic-dossier-390.png) | [image](screenshots/synthetic-dossier-1280.png) |
| Invented shadow loss | [image](screenshots/synthetic-shadow-320.png) | [image](screenshots/synthetic-shadow-390.png) | [image](screenshots/synthetic-shadow-1280.png) |

QA found and fixed a real 200% zoom overflow (workspace min-width, grid minimum sizing and three-column policy values). High-contrast system colors now remain legible. This is a new isolated interface, not a change to a previously approved consumer screen; no fabricated “before” artifact is claimed.

## Limits / release decision

GO for founder review of private offline research. NO-GO for live capital exposure, genuine token ranking/performance, public/private hosted launch or claims of alpha. Physical iPhone Safari, VoiceOver, Windows ACL behavior and long-running power-loss recovery were not exercised. Local hashes cannot prevent owner rewrites. The dedicated 42-test/Chromium suites are explicit local commands, not newly wired root workflow jobs; existing GitHub CI checks the normal root tests, typecheck, lint, build and archive. See PR checks for its actual run status.

No changes to source gate (`LOOKUP_APPROVAL.phase=disabled`, both time bounds null), consumer/backend, collector data/archive, scheduler, permissions, dependencies or deployment. Parent PRs #137/#143/#148 were checked read-only and preserved. Commercial rights, authentic source acquisition, independent reconciliation/anchors and any future actual treasury actions remain separate approval gates.
