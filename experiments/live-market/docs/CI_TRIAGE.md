# Root CI fixture cancellation — October 23, 2026

**Confirmed immediate failure:** [root CI 39906108505](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/39906108505), job `120258334050`, failed its shared local-PostgreSQL setup, not 47 independent product assertions. The [founder's full-log finding](https://github.com/fuzzysniper/scout-stonk-intel/pull/161#issuecomment-6366145111) identifies `production.test.mjs`'s `before` → `localPostgres()` → initial `reset()` → `TRUNCATE scout_mint.policy CASCADE`, old harness line 51: **SQLSTATE 57014, canceling statement due to statement timeout**. All 47 dependent cases were `hookFailed`; their assertions did not execute. The reported setup was approximately two seconds. GitHub metadata confirms the root regression step failed and later lint/types/build were skipped. The job used `ubuntu-latest`; available metadata does not establish its exact image, CPU scheduling or disk/lock contention. Detailed job logs remain proxy-inaccessible to the agent; this log evidence is attributed to the founder.

Prior exact-head local and GitHub-generated-checkout runs both passed 1,160 Node + 107 Python tests. That does not negate the CI failure, establish flakiness or identify why its administrative statement exceeded 800ms.

## Narrow correction

The harness applied one request-sized timeout to both synthetic fixture-owner administration and restricted runtime queries. Give only user **`scout_test_owner`** bounded DDL/reset headroom; preserve runtime defaults and production controls. No workflow, runner, concurrency, schema, production adapter, TLS, admission, credential, retry or skip change.

| Pool / control | Before | After |
|---|---|---|
| Synthetic test owner statement / client query timeout | 800 / 1,200ms | **5,000 / 6,000ms** |
| Fixture runtime role statement / client query timeout | 800 / 1,200ms | **unchanged** |
| Fixture connection timeout, all roles | 800ms | **unchanged** |
| Production `databaseParameters` statement / client query / connect | 500 / 1,000 / 1,000ms | **unchanged** |
| Production transaction-local statement / lock timeout | 500 / 100ms | **unchanged** |

Five seconds is a finite administrative allowance above the reported setup delay; the six-second client bound permits the server's cancellation to surface. This is not a measured universal CI maximum or proof of a scheduling cause. Exceeding either bound still fails; no automatic retry or ignored exception is introduced. Runtime-role queries cannot select owner headroom without explicitly selecting the separate synthetic owner login. No hosted database is used.

## Regression evidence

New real local-PostgreSQL test `tests/onchain-api/postgres-harness.test.mjs` is registered in the existing root runner. With the old harness, its controlled owner `pg_sleep(1.05)` fails with **57014**; with the correction it succeeds. This reproduces the timeout mechanism with a deliberately slow statement, **not** the original CI TRUNCATE latency/contended-runner conditions.

The test checks actual `SHOW statement_timeout` before/after reset, unchanged runtime connection/query bounds, runtime `pg_sleep(1.05)` still cancelling with 57014, and owner transaction-local cancellation still raising 57014. It asserts SQL outcomes, not a machine-speed threshold. Production security/TLS/admission assertions remain in the full suite; no live RPC or provider is involved.

New-head local/full-CI outcomes are recorded in the PR after execution; prior passing runs are not substituted. If CI still fails, capture its **first** failure, fixture phase/server code, PostgreSQL/runner version and timing before another change. Do not widen production limits or reclassify hook failures as successful assertions.

Main refreshed to `01f4be846c6483860c0e2bd6404a877d6f276e05`; newer changes are collector records/audit only and remain untouched. GitHub's automatic PR check validates the combined checkout; no PR/main merge or manual workflow dispatch is performed here.

Rollback: revert only the synthetic fixture-owner timeout/test registration change if rejected; keep runtime/production code and collector data intact. Source rights and founder session approval remain separate gates even when CI passes.
