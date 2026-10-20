# Issue #127 validation record

Implementation starts at main `8df27bda59d29901d8996920fbe5f0cd6892ad3d`; only new Pulse library, route, tests and docs. No live provider observations, hosted SQL, production requests, credential reads, deployments or changes to Agent A consumer files.

## Actual local results

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | PASS; locked tree installed, no dependency/lockfile edit |
| `bash tests/trader-pulse/run.sh` | PASS: **119 Node tests** (48 adapter,57 engine,14 public), zero failures/skips; rerun after final exact-quote report fields |
| `npm test` | PASS: **1,112 test results**:1,005 Node +107 Python, zero failures/skips. The Python count includes one discovery bridge running the119 Pulse Node cases; counts are not1,112 unique independent behaviors. |
| Local PostgreSQL/TLS regressions inside full suite | PASS; real ephemeral PostgreSQL17 and loopback TLS with synthetic credentials/state; no hosted SQL |
| `npx tsc --noEmit` | PASS; repeated after final build/restoring generated Next declarations |
| `npm run lint` | PASS |
| `npm run build` with existing `tests/security114/local-only.mjs` preload | PASS; provider egress blocked; `/api/trader-pulse` built as dynamic Node route |
| `node tests/trader-pulse/http-smoke.mjs` | PASS; REAL local built Next server, empty production credentials, fixed loopback, external egress blocked. Neutral GET200, bad mint/override400, POST405; no other backend invoked. |
| `bash scripts/archive-tool.sh check origin/main` | PASS; append-only/reproduction integrity; archive/data untouched |
| `npm audit --omit=dev --json` | PASS;0 findings at every severity for unchanged production tree. No full-development audit clearance claimed. |
| Scope/secret review | Only new `lib/trader-pulse/**`, `app/api/trader-pulse/route.ts`, `tests/trader-pulse/**`, `docs/trader-pulse/**`. No env/keys/raw provider fixtures. Existing protected paths unchanged. |

Node24.19.0 locally. PostgreSQL binaries were reused locally at `/workspace/scout111-tools/extracted/usr/lib/postgresql/17/bin`, test share at `/workspace/scout111-tools/extracted/usr/share/postgresql/17`, selected only via test-specific `SCOUT_TEST_PG_BIN`/`SCOUT_TEST_PG_SHARE`. They are not runtime deployment dependencies. Missing binaries fail the existing suite rather than skip.

New Pulse suites run in unchanged GitHub CI via the discovery bridge; actual run outcome is recorded in the PR when available. The final report-identity additions were also recompiled/retested in the focused119 and final production build/types/lint checks. Next-generated `next-env.d.ts` was restored and excluded from the diff.

Every positive market packet is explicitly synthetic and offline. The source adapter's network behavior is exercised with controlled fetch/stream responses; it is not evidence of live DEX Screener access, provider permission, production quotas or hosting identity. No screenshots are required for this backend-only work. No standalone archive publication dry-run was performed: this PR does not publish/archive figures and changes no retention rights.
