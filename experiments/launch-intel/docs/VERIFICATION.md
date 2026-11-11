# Verification — 2026-10-22 UTC

Base main `bf555fbe672b5b16d68511f43787ff7b0f206ef5`; independent `feat/156-launch-intel` branch. Only `experiments/launch-intel/` changes. No production runtime, source, tracked mint, collector, database, workflow or other draft PR changes. Next's generated `next-env.d.ts` change was restored.

| Check | Actual result |
|---|---|
| `npm ci` (Node 20.20.2, npm 11.9.0; task-specific `/tmp` cache) | Exit 0; 356 packages. Existing ESLint 9.39.5 deprecation warning; no dependency changes. |
| `bash experiments/launch-intel/test.sh` | Exit 0; **47/47 focused tests**, no skips/failures. |
| `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test` | Exit 0; **1,160 Node + 107 Python tests**, no failures. One final full root suite; local fixture PostgreSQL only, no hosted database. |
| `npx tsc --noEmit` | Exit 0. |
| `npm run lint` | Exit 0, no lint errors; new browser QA file additionally checked with scoped ESLint. |
| `npm run build` | Exit 0; optimized Next 15.5.28 production build. No new route. |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; append-only/reproduction check passed. No archive writes. |
| `bash experiments/launch-intel/demo.sh` | Exit 0; two local synthetic artifacts generated; zero source requests/journal commands. |
| `node experiments/launch-intel/browser-qa.mjs` | Exit 0; Chromium 320/390/1280, no horizontal overflow, synthetic notice/WAIT visible, Enter toggles evidence, Tab reaches source link, **0 external page requests**. |

The static brief was rendered from committed local HTML bytes (`setContent`); `file://` navigation was blocked by this environment. This is **not** production, physical Safari/VoiceOver or human usability evidence. No production browser test is needed for this disconnected, non-route module. [390px screenshot](mobile-synthetic-390.png); [browser assertions](browser-qa.json); [all-invented receipt/replay artifact](synthetic-report.json).

Negative/security coverage: wrong program/curve/mint/signature/quote/token program, request/response and status binding, account index/event authority, nested or missing event-CPI, malformed/duplicate JSON, unsafe slot numbers, truncated/appended schemas, provisional/failed/reorg/duplicate/revised/out-of-order events, source clocks, stale samples, unavailable creation/price/exit evidence, exact u64 precision, no future evidence at cutoff, rejection retention, private holdings disclosure gates and zero runtime acquisition/posting/wallet dependencies. The independent published global-PDA vector checks the local PDA primitive.

The 47-test suite is explicitly scoped and **not registered in root CI** (no workflow/root test-runner edits). Root CI typechecks these TS files, but its test count does not include this suite. Automatic PR CI outcome is reported in the PR checks/body after push; no workflow dispatch or rerun is performed. A green fixture/build result cannot establish real source compatibility, provider rights or authentic alert delivery.

## Remaining approval gates / rollback

**Offline implementation ready for review; authentic acquisition and public/social use NO-GO.** Founder must first verify a reusable original FuzzySniper receipt/rights, or approve the exact separate endpoint/rights/retention/$0/four-read scope in [SOURCES.md](SOURCES.md) and a narrowly reviewed owner-PC capture adapter. Source permissions, receipt provenance/authenticity and real revision compatibility remain unproven. Existing seven tracked mints remain insufficient, zero eligible capital, no alpha/returns/NAV.

Rollback: revert/remove this experiment directory. Nothing is deployed, activated, scheduled or journal-imported; no credentials/configuration/data need restoration. Keep draft, do not merge.
