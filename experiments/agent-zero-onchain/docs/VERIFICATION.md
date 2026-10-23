# Verification — issue #153, 22 October 2026 UTC

Base: latest main **`834aad75f7a2fbf290d2c75359cbba51e21f30bc`**. Toolchain **Node 20.20.2 / npm 11.9.0**. Final implementation SHA and automatic CI status are in the draft PR. No live RPC or market API was called; official GitHub/NPM/SPL **source documentation only** was inspected.

| Exact local command/check | Actual outcome |
|---|---|
| `NPM_CONFIG_CACHE=/tmp/scout-agent0-npm-cache npm ci` | PASS; 356 existing packages. No dependency/lockfile change. |
| `node experiments/agent-zero-onchain/test.mjs` | PASS; **39 tests**, zero failures/skips/cancellations. Strict TS compilation plus mocked/offline unit/security tests. |
| `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test` | PASS; **1,160 JS + 107 Python = 1,267 existing root tests**, zero failures/skips/cancellations. Existing local PostgreSQL/TLS fixtures; no hosted SQL. |
| `npx tsc --noEmit` | PASS, exit 0. |
| `npm run lint` | PASS, exit 0; no lint errors/warnings. |
| `npm run build` | PASS, optimized Next.js 15.5.28 build; existing edge/static-generation notice. No route/UI change. Generated `next-env.d.ts` restored to baseline. |
| `bash scripts/archive-tool.sh check origin/main` | PASS: `Archive append-only/reproduction check passed`. |
| `node experiments/agent-zero-onchain/verify-idl.mjs /tmp/scout-pump-official-153/idl/pump_amm.json` | PASS against freshly obtained official pinned source: full original byte SHA-256, program, metadata, discriminator, **all 18 field offsets/types**, serialized **287 bytes**. |
| `node experiments/agent-zero-onchain/run.mjs` and `--help` | Exit 0, explicitly **DISABLED / no RPC**. |
| Protected-path diff and `git diff --check` | PASS; only this new directory changes. `tests/run.sh`, workflows, backend, collector, source gates, treasury and other PRs untouched. |

The 39 focused tests are **separate** from the 1,267 existing root tests. Per explicit issue ownership restrictions, no root test hook or workflow was edited. Existing GitHub CI runs its unchanged regression/types/lint/build/archive steps; it does not automatically invoke this new focused harness. The owner should rerun the portable focused command at the exact approved SHA before the first authentic probe. No claim that focused tests ran in automatic CI is made.

Coverage: fixed network/endpoint/account order; pool owner/discriminator/field layout; seed hashes and published mints/vaults; historical defaults/unknown tails; classic mint/vault layouts; Token-2022 denial; native backing/delegates/frozen state; negative/positive/i128 boundary reserves; zero/u64 overflow; retained-fee sweep invariance; exact values above `2^53`; 255 decimals; strict JSON/base64/partial/duplicate/out-of-order rejection; source/local clock separation; exact freshness boundary; null/stale/future block time; HTTP/RPC errors; timeout/partial/oversize responses; no redirects/authentication/fallback; denied transaction/simulation methods; two-layer attempt caps; denied default/CI/hosted/proxy/unsafe-TLS acquisition; acknowledgement/expiry/scope checks; durable concurrent/repeated claim denial; no filesystem/credential/network I/O in pure decoding.

Every test response amount/slot/time is invented and explicitly labeled offline. Positive fixture decoding is never claimed as a genuine observation. Native transport tests replace HTTPS completely; the CLI concurrency test allows only a stub that throws, so it cannot produce a mock accepted observation bearing a manual-acquisition label. The managed test environment has `/tmp/.git`; that one enclosing harness marker is masked **in the concurrency test only** to emulate a private owner-PC directory. Actual CLI path checks remain unchanged, and a separate negative test rejects Git-backed persistence.

Source/runtime limitations remain explicit: no independent genesis or deployed-bytecode verification, no authenticated remote consensus proof, no independently witnessed clock or signed receipt, no guarantee of provider reachability, no Token-2022 support, no depth/exit/cost/volume/history/holder/LP-control inference. The approved commit is an owner attestation. Local claims cannot prevent a hostile owner from deliberately copying/resetting files; that is outside the permitted procedure.

**Status:** code/offline validation ready for human review; **live observation not collected, awaiting the separate founder GO** in [OWNER_RUNBOOK.md](OWNER_RUNBOOK.md). This cloud's proxy/public-RPC path is unsupported and has not been tested live. The prepared path is the approved direct owner PC. No Helius/Neon key, proof budget, source gate, subscription, deployment, wallet or trade was accessed/activated.
