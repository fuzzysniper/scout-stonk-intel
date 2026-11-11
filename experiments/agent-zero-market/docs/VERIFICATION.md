# Offline verification — 22 October 2026 UTC

Base: latest main `6697897d17552a374a55f1af1339203b8d5fcf5a`. Toolchain: **Node 20.20.2 / npm 11.9.0**. The implementation head and automatic CI run are reported in the review PR/checks; this record describes the actual local commands, not a provider validation or production result.

| Command | Actual result |
|---|---|
| `NPM_CONFIG_CACHE=/tmp/scout-agent0-npm-cache npm ci` | PASS; 356 existing dependency packages installed; no manifest/lockfile change. |
| `bash experiments/agent-zero-market/test.sh` | PASS; **51 tests, zero failures/skips/cancellations**. Strict TypeScript compile plus offline unit/security tests. |
| `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test` | PASS; **1,211 JavaScript tests + 107 Python tests = 1,318**, zero failures/skips/cancellations. Includes the 51 above; do not count them twice. Existing local PostgreSQL/TLS and Worker tests use offline fixtures, not hosted Neon or live dispatches. |
| `npx tsc --noEmit` | PASS, exit 0. |
| `npm run lint` | PASS, exit 0; zero lint errors/warnings. |
| `npm run build` | PASS, optimized Next.js 15.5.28 build. Existing edge-runtime/static-generation notice; no new routes or UI. Build-generated `next-env.d.ts` restored to baseline. |
| `bash scripts/archive-tool.sh check origin/main` | PASS: `Archive append-only/reproduction check passed`. |
| `bash experiments/agent-zero-market/run-demo.sh` twice + byte comparison | PASS; committed JSON and repeated output identical. SHA-256 **`5bdbf36b5c7e4172ad13368749d5c9fb8b7dcd0b2e6a3bc799e56e7770390a53`**. |
| `git diff --check` | PASS. |
| Diff against base for `app/`, `lib/`, `data/`, `scheduler/`, `.github/`, `package.json`, `package-lock.json` | EMPTY. Only this isolated package and one root test hook change. |

The focused suite tests exact network/base/quote/pool/decimal identities; malformed bytes/JSON/envelopes; numeric/exponent/overprecision rejection; >53-bit exact amounts; OHLC/trade contradictions; exact demo price/turnover coherence; microsecond clocks; duplicates/out-of-order/revised/conflicting bars; stale/missing/incomplete/late observations; unknown source clock/latency; fixed enrollment/checkpoint/reference; future-data leakage; declining/unpriced/rejected cases; exact 25% boundary; two-close availability using **both** receipts; missing exits; unsupported financial claims; caps; and read-only attachment safety.

Security checks execute normalization/evaluation/attachment while HTTP/fetch/sockets, credential-environment reads and filesystem access throw. An AST/import guard also checks the runtime modules and reused pure helpers for forbidden network/database/credential/execution imports. These demonstrate the implemented paths' behavior, not a sandbox against arbitrary hostile code in the same Node process. Harness compilation/test reads and stdout are expected local operations.

The compatibility test reads seven tracked mint identities locally and constructs an explicitly test-only recorded-view sentinel. Every candidate stays `INSUFFICIENT EVIDENCE`; existing reference/contents are unchanged, journal commands remain empty, eligibility/exposure remain zero and NAV/net return remain null. It is not an actual #150 journal execution or an authentic market-data trial. The seam was reviewed against #150's `service.ts`/`core.ts` at the pinned head below.

Protected drafts were checked read-only and left unchanged:

| PR | Head |
|---|---|
| #137 | `2169247924c05300e4ffc2ce005b3960317cebd8` |
| #143 | `a10bf94ff866095446fb2d4829df8f5a948d9144` |
| #148 | `40ee1d974de0dcb47e3f58dbbc3cccbfe3c67c94` |
| #150 | `0854004d9a84f605100ce05cb5b23efce329a95b` |
| #151 | `df6f654ed41268ec7954b4947761eccd31eef522` |

**Actual boundary:** zero GeckoTerminal/other market-data, Helius, Neon or hosted-SQL calls; no provider contact, credentials, wallet, trading, deployment, workflow dispatch, source activation or merge. No browser screenshots are claimed: there is no UI change. Synthetic examples establish mechanics only; forward timing, provider semantics, coverage, rights, tradability and predictive advantage remain unproved.

**Review decision:** offline implementation prepared for human review; **C0 BLOCKED** on exact source rights/retention and separately approved acquisition. Review the [unsent inquiry and decision table](PROVIDER_QUALIFICATION.md) next. Rollback removes the isolated module and one `tests/run.sh` line; no source/journal/service state exists to reverse.
