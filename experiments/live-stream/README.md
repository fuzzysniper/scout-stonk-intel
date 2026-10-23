# Independent Helius creation worker — review only

Issue [#167](https://github.com/fuzzysniper/scout-stonk-intel/issues/167). **Inactive. No authentic session has been run.** This PR supplies A's source worker; B's separate [#169](https://github.com/fuzzysniper/scout-stonk-intel/pull/169) supplies durable storage/private read/STOP and the final Render manifest. C owns the private interface. This branch alone cannot activate: the fixed B module is intentionally absent, with no fallback.

## What is implemented

One literal mainnet Helius **Standard** `logsSubscribe` connection, finalized commitment, Pump program `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`. This is not Enhanced `transactionSubscribe`, PumpPortal, a public RPC fallback or a trading feed. Only top-level Create/CreateV2 hints are retained. Unrelated trades/migrations are ignored but **still consume received bytes/frames**. Notifications initially carry signature/slot/hash/receipt time; mint/quote/program remain null. They are provider reports even when requested at finalized commitment.

At most one corroboration at a time, sampled no more often than 10 seconds: `getTransaction(finalized,json,maxSupportedTransactionVersion:0)` then `getSignatureStatuses(searchTransactionHistory:true)`. The unchanged #158 decoder verifies original transaction/signature/slot, top-level instruction, event-CPI authority/PDA/stack, token program and exact quote identity. Native SOL sentinel `11111111111111111111111111111111` **is not WSOL**. USDC may be supported; other quotes/layouts/ambiguous or routed creations are withheld. Null, failed, stale, future, inconsistent or unsupported corroboration never becomes a mint claim. There is no RPC retry.

Final label is **RPC-reported finalized, same Helius provider**. Checking transaction + status is additional original-transaction corroboration, **not independent consensus replay**. Provider time and local receipt/check UTC are distinct; clocks are not independently authenticated. Price, liquidity, volume, migrations, trading, market cap, safety and investment claims are absent. This partial top-level creation sample cannot establish exhaustive launch coverage.

### Durable controls

B must durably COMMIT claim/reservation before any source call. Every command binds exact session/head/scope/worker/fence. A serializes native PG calls, validates acknowledgments, seeds persisted session receive counters and stops on denial/uncertainty. Connection allocation precharges the entire receive/credit envelope; each HTTP attempt needs its own irreversible ticket. Delayed/lost acknowledgments never authorize source I/O. No refunds/reset on timeout, crash, reconnect or redeploy.

| Bound | First-session maximum |
| --- | --- |
| Grant | 1 hour; owner should choose 10 minutes for first pilot |
| Instances / concurrent WSS / concurrent HTTP | 1 / 1 / 1 |
| Connection attempts | 3 total, confirmed close before 1s/2s bounded reconnect |
| Received data per connection | 20,000 messages / 16 MiB; 64 KiB/message |
| Control traffic per connection | 512 control frames / 64 KiB |
| HTTP | 40 attempts, 1 MiB response each, 5s deadline |
| Corroborations / normalized records | at most 20 / 200 |
| Pending persistence callbacks | 8; overflow stops and leaves a gap |
| Lease / heartbeat / DB-call deadline | 12s / 1s / 1.5s |
| Ping / matching pong deadline | 30s / 10s |
| Source freshness eligibility | event and non-null block time within 120s before original receipt |
| Retention requested | raw: none persisted; normalized: 1h logical TTL in B |
| Additional provider spend | $0 target; requires verified hard account cap/no overage |

Receive caps are local application limits, not a promise that upstream billing stops at the byte boundary: in-flight frames, protocol/control overhead and billing rounding need conservative **owner-verified** credit reservations and account-level controls. No credit conversion or total credit allowance is guessed here. B's approved SQL weights/global cap are mandatory. A frame cap or record cap can end the pilot well before its wall-clock grant.

Startup, reconnect and shutdown gaps are explicit. There is no Standard replay or backfill. HTTP latency does not block persisting subsequent notifications; skipped corroborations remain provisional. STOP closes/aborts source immediately; a running process learns remote STOP on its next store operation (1s heartbeat; outstanding request may already have been charged). Source failure/auth/quota/schema/caps/clock regression or lost lease closes source. STOP requested is not a confirmed TCP close: source state remains open/connecting until native closure is acknowledged. Only confirmed native close permits reconnection. Uncertain close leaves the old fence quarantined; no new process may reclaim it automatically. Terminal STOP remains latched and the Render process idles to avoid automatic source restart.

## Run offline

From repo root, Node 24.19.x:

```sh
npm ci
npm ci --prefix experiments/live-stream --ignore-scripts
bash experiments/live-stream/test.sh
npm run build --prefix experiments/live-stream
node experiments/live-stream/run.mjs
```

The final command reports `DISABLED`, `sourceConnected:false`, counts null; it does not import B's store, read a data key or open a socket. Root tests remain separate. Tests use conspicuously invented local transactions and mocked transports, never a provider fixture passed off as live data.

Combined local integration, with a separately reviewed B checkout under `/tmp` and its dependencies installed/linked, is explicit:

```sh
SCOUT_TEST_PG_BIN=/path/to/local/postgresql/bin bash experiments/live-stream/integration-test.sh /tmp/reviewed-B-checkout
```

This launches disposable loopback TLS/SCRAM PostgreSQL only, installs B's exact local schema, drives the actual `postgresPort` through A's adapter and checks exact quote promotion, budgets, health and durable STOP. It does **not** invoke `nativeStore`, a hosted DSN or a provider. It must pass on the reviewed combined heads before activation; standalone A tests do not substitute for this test.

`render-worker.example.yaml` is an inert worker-only review fragment, **not an applied Blueprint**. B owns `ops/render/scout-live.render.yaml` and must reconcile it with A's exact commands. No root deployment setting or existing source workflow is modified. See [source prerequisites](SOURCES.md) and [owner activation card](RUNBOOK.md).

## Dependency / security / rollback

`ws@8.22.0` is pinned in an isolated package/lock; root dependencies stay unchanged. New runtime dependency and paid Render proposal require human review. No arbitrary endpoint/module URL, insecure TLS, redirects, compression, proxy, raw payload logging or dynamic source provider. Credentials only from the new server-side DATA namespace after grant/store admission; no restricted mint-proof key or old pilot budget is read. Logs are fixed reasons/aggregate counts only.

Rollback before activation: close this draft; no production state exists. After a separately approved pilot: owner latches B's authenticated durable STOP, confirms source closure/last counters, disables DATA activation and suspends the dedicated worker. If shutdown cannot be confirmed, suspend/terminate the old instance before considering recovery. Keep spent counters/fence/history intact, do not clear STOP/re-authorize by editing rows. B owns rights-compliant physical purge/backups and explicit new-session recovery; logical expiry is **not** proof of physical deletion. Revert only this PR's files if code rollback is needed; preserve all collector data and old proof policies.

## Reviewed combined checkpoint

The local TLS/PostgreSQL integration passed **2/2** against B `c4a64759f4ede609b343ecccb7ff4f476d305e50`: native SOL sentinel and USDC both promote unchanged; exactly one connection/two RPC reservations are retained; STOP then fenced terminal release clears the lease while STOP stays latched. Canonical scope is `694b38b4a0046ad1173d521c83932f7af6050b69ed666592e3d0e0d0c7289442`. This replaces the earlier rejected WSOL policy and post-STOP-release incompatibility. B provider-health age is45s, compatible with A30s ping/10s pong deadline; DB heartbeat is not source freshness. This is local synthetic-source integration evidence, not a live feed or hosting validation.
