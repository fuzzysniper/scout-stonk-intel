# Owner-only activation card — no commands here authorize deployment or source access

**Current verdict: NO-GO for activation.** Code/review readiness is separate from account, rights, storage, hosting and exact-session approvals. No real event counts or live reliability are claimed.

See the [current paid-plan card](PAID_PLAN.md) for the confirmed Developer allowance, exact quota-weight mapping, measured10min/hour/week formulas and shorter first-proof checklist. No renewal/reset is supported by the current one-shot ledger.

## Shortest safe sequence

1. **Review combined code:** A worker + B ledger/STOP + C private UI on exact approved heads. Run A offline tests, root checks and A's local TLS/PostgreSQL integration against that B head. Confirm native SOL identity, expiry/STOP, head/service/session alignment and no old proof dependency. B must reconcile its Render template with A's build/start/env commands below.
2. **Account/rights GO (owner, private):** use existing paid Helius account only. Confirm Standard WSS rights, private business research and 1h normalized retention/deletion requirements; record applicable terms/date. Verify remaining included credits, rates/rounding, max connections and hard no-overage enforcement. No DATA key creation/read/export until separately authorized. Do not reuse proof key or its one-shot budget. See SOURCES.md.
3. **Infrastructure GO (separate):** approve exact Render paid plan/region/hosting cost, one instance, no automatic deploy/scaling, and B's isolated storage/auth/roles/physical-retention controls. Only then may owner provision B's resources and deployment. Initially `UNFARMD_DATA_ACTIVATION=disabled`; verify sanitized DISABLED/no source traffic. This is not a free deployment instruction.
4. **STOP rehearsal:** owner verifies B's authenticated private STOP + worker suspension access; fail closed if either unavailable. SQL starts unapproved/STOP. No resume control. Verify old instance fully suspended/closed before any replacement; never reclaim an expired uncertain lease.
5. **Exact-session SOURCE GO:** record approved deployed SHA/service UUID session, canonical scope + worker policy hash, UTC notBefore/expiresAt (recommend **10 minutes**, max1h), raw persistence0/normalized TTL1h, ≤3 attempts/one concurrent connection, ≤20kframes/16MiB each, ≤40 reads/20 corroborations, max200 records, verified credit weights/total and $0 incremental provider ceiling. B's one-session authorization and A grant must match. Each approval boolean must be true based on evidence, not copied from the false example. Grant is owner-authored, exact-head bound, with nonzero rights/account evidence hashes. Do not publish key/DSN/grant internals. Only then may owner enable the dedicated DATA binding for that one session.
6. **Observe and stop:** private source events remain provisional with null mint until original transaction/status corroboration succeeds. Report actual source/frame counts, unique provisional/finalized records, withheld/ignored/duplicate counts, first/last receipt UTC, actual last frame/pong clocks, RPC RTT, gaps and spent quotas. Capture sanitized aggregates; no raw logs/transactions/key-bearing URLs. At deadline/cap/error, worker stops and idles; use durable STOP + suspend and confirm source closure anyway. Reconnect never fills missing history. Uncertain shutdown remains quarantined, not retried.
7. **Review outcome:** no source received is not “zero launches”; missing/withheld finality is not a verified mint. No trading, public alert, future continuous activation or new session follows automatically. A successful bounded session justifies a separately reviewed persistence/budget/rights proposal, not unlimited ingestion.

## Exact reviewed worker commands/bindings

These are build/start specifications for B, **not a request to run a provider command now**:

```text
Build: bash experiments/live-stream/render-build.sh
Start: node experiments/live-stream/run.mjs
Node: 24.19.0 (engine >=24.19.0 <25)
Instances: 1; auto deploy: off
UNFARMD_DATA_ACTIVATION=disabled
UNFARMD_DATA_APPROVAL_JSON=<owner-created exact-session grant; false example is non-executable>
UNFARMD_HELIUS_DATA_KEY=<new separately authorized DATA key; never proof key>
```

B supplies `SCOUT_LIVE_STORE_ENABLED`, isolated worker DB binding, Render service binding and fixed `lib/scout-live/worker-store.mjs`. Runtime requires Render true, matching exact build SHA/RENDER_GIT_COMMIT/service ID, no CI/Vercel/proxy/insecure TLS. Missing B module/store/approval/lease/ticket fails closed. No change to consumer mint-facts source gates is needed or permitted.

## One-session written approval template

> I approve ONLY session [UUID], code [full combined SHA], service [srv-ID], Helius Standard mainnet Pump creations via the separately authorized DATA key, [UTC start] to [UTC end ≤1h]. Rights/account evidence hashes [hashes] refer to privately retained dated approvals. Raw payload persistence0; normalized TTL1h with approved physical deletion/backups controls. One concurrent WSS, ≤3 attempts, receive limits20k/16MiB each plus reviewed overhead; ≤40 read attempts/20 corroborations, max200 rows. B's immutable SQL allowance uses verified weights [connection/RPC] and total [credits], no resets/refunds. Included credits only; incremental provider cap$0 with verified hard enforcement. Render [plan/region/cost] and storage separately approved. STOP auth and suspension were rehearsed. No proof-key/budget reuse, trading, public redistribution or continuing activation is authorized.

If any bracket cannot be completed truthfully, **NO-GO**. Provider documentation availability alone cannot fill it.

## Sanitized result card (currently NOT RUN)

```text
Exact A/B/C heads: NOT YET COMBINED/APPROVED
UTC session: NOT RUN
Provider connections / source frames / bytes: NOT RUN
Unique provisional / RPC-reported finalized / withheld: NOT RUN
Ignored / duplicates / rejected / stop reason: NOT RUN
RPC attempts / charged credits / actual cost: NOT RUN
First/last receipt / actual frame/pong / RPC RTT: NOT RUN
Startup / disconnect / shutdown gaps: NOT RUN
Durable STOP / source-closed confirmation: NOT RUN
Rights/retention/partial-coverage limitations: remain applicable
```

Rollback: authenticated B STOP first; confirm closed or suspend/terminate dedicated instance; leave DATA disabled and spend/fence/history intact. Never reset rows or reuse a session/grant/key budget to retry. If STOP storage is unavailable, suspend/terminate from Render and establish old connection closure before owner-reviewed recovery. B owns physical purge and any fresh-session design. No production consumer/collector/proof rollback is implicated by this isolated worker PR.
