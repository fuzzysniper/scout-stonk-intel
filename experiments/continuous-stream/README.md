# Continuous Operations V1 — inactive controller candidate

October23,2026 (America/Chicago). Depends on #170 `ab13c13f2e9d9f779694ee14202a1877f7f85ed8`. **Unattended operation: BLOCKED.** No source session, key access, deployment or live database operation has occurred. Original #170/#169/#171 and the bounded activation path are unchanged.

## Implemented here

A separate executable controller reuses the unchanged #170 creation decoder/source worker. An exact-head/service/parent-period owner grant fixes source policy, UTC start/end (≤7days and before account reset), cumulative credit/byte/frame/RPC/connection/child/audit ceilings, verified credit weights and reserves for other account usage/incidents. There are no subscription-sized defaults or implicit source GO. Canonical grant hashing is independent of JSON key order.

A proposed **v2** durable port confirms an exclusive parent fence, then admits sequential children≤1h. Before source I/O, acknowledgments must attest irreversible full connection envelopes (16MiB/20kframes) or one RPC ticket against the **same parent**, including exact counter deltas. Counters cannot decrease across children/reconnects. Replayed tickets, lost commits, conflicting fences, stale or insufficient account/meter/retention/notification evidence stop acquisition. Successful SQL/storage commit is a required B-port semantic, not implemented by an in-memory fallback.

Each child rolls before expiry or after180 newly stored candidates. Source is aborted, native closure confirmed, final counters/gaps committed and child closed before another child may start. This removes the controller's200-record lifetime stop while retaining bounded source queues and decoding limits. Backend must maintain a rolling≤200 payload store plus a separately rights-approved first-seen index; duplicates never acquire again or overwrite original clocks/hashes. Each close/reopen has a declared gap: Standard WSS cannot replay missing creations. This is bounded sequential monitoring, not gap-free coverage.

Permanent STOP is parent-wide and never reset by renewal. Unconfirmed native closure **or unconfirmed durable STOP** retains the parent fence; uncertain source status is reported `null`, not falsely closed. Restart cannot reclaim an occupied/uncertain lease. Data-mode exclusion requires the original one-shot ledger permanently STOPPED **and confirmed closed**; merely expired/unapproved is insufficient, so the old path cannot later race this one. Original source callbacks, authority checks, exact native SOL/USDC identity and same-provider RPC-reported-finalized labels remain unchanged.

Assurance gates require a fresh attributed/reconciled Helius meter (≤5min), provider hard-cutoff evidence valid through the parent end, successful independent purge (≤60s), backup exclusion, delivered-notification health (≤5min), and an independent watchdog. Worker/DB heartbeat is not a provider clock. Account meter balance must still cover remaining parent reservations plus incident reserve. Current founder evidence (dedicated DATA key, autoscalingOff/$0 limit,≈9.68M credits) does not populate these runtime attestations or authorize activation.

## Essential controls not implemented / not proven

| Control | This branch | Remaining B/owner work |
| --- | --- | --- |
| Durable parent/child quotas | Client validates protocol, fences and monotonic committed counters; fault-model tests | **No actual continuous DB binding/schema**. Current B0fc08db is v1/one-shot only |
| Rolling store / first-seen history | Controller continues beyond200 across children; model exercises rolling200 + immutable first-seen metadata | Actual transactional rolling store/index, rights/retention and immutable control journal |
| Physical retention | Acquisition denied if required purge/backups assurance is missing/stale | Independent janitor functioning after workerSTOP/suspension; outage/restore recovery; physical deletion/PITR/WAL/backups verification. SQLDELETE/logicalTTL is not physical erasure |
| Mobile STOP / Render suspend | Local/process STOP + durable parent command and quarantine logic | Existing `/api/live-events/stop` stops **v1 only**. New authenticated parent STOP binding, mobile UI compatibility and actual iPhone read/STOP/suspend acceptance |
| Notifications / unexpected shutdown | Durable outbox command proposal; missing delivery health blocks source | Approved real channel/dispatcher, acknowledgment/failure policy and independent heartbeat watchdog. A stopped/crashed process cannot notify itself |
| Credit reconciliation | Fresh attributable/reconciled-meter gates; conservative reservations never called actual spend | Approved DATA-key meter acquisition/settlement/rounding/method weights and provider cutoff test/evidence. No provider usage endpoint or polling added |

The model fixtures are explicitly invented and **not a production ledger, real purge/meter or delivered notification**. Guard tests demonstrate refusal, not implementation of the missing controls. Current B contract compatibility tests prove continuous requests are rejected and cannot be downgraded to one-shot. This is a passing **negative compatibility** result; successful durable continuous integration is blocked.

## Run offline

Node24, root dependencies and #170's isolated `ws` package:

```sh
npm ci
npm ci --prefix experiments/live-stream --ignore-scripts
bash experiments/continuous-stream/test.sh
node experiments/continuous-stream/build.mjs
node experiments/continuous-stream/run.mjs
bash experiments/continuous-stream/compat-test.sh /tmp/exact-reviewed-B-checkout
```

Default startup returns DISABLED without loading B's store or reading DATA key. New tests/compatibility imports perform **no SQL or network acquisition**. Standard repository CI also runs its existing disposable-local database fixtures; it never installs schema in Neon or any live database. No SQL/credential/provisioning command is supplied for owner execution here.

New fixed seam: `lib/scout-live/continuous-store.mjs` exporting `createContinuousStore()` → `{version:'unfarmd-continuous/1',transact(command,{signal}),close()}`. Exact proposal: [contract.ts](contract.ts), [policy.ts](policy.ts); not an approved shared B schema. Current B module has no such export. Entry has no old-store fallback and no arbitrary module/provider/webhook URLs. B must pin/verify exact grant and policy hash, atomic COMMIT acknowledgment, roles/TLS/fingerprints, cross-mode exclusion and cleanup semantics before implementing this seam.

## Owner gates / rollback

1. Complete the separate bounded release/pilot first; do not deploy this branch in its place. Record genuine counts/finality/source clocks/cost, mobile STOP and confirmed old-source closure. Do not reset the original ledger.
2. B implements/reviews the separate continuous binding, physical retention, parent STOP, outbox/watchdog and meter ingestion. Verify against actual disposable persistence/failure/restore tests and approved backup/deletion behavior, then combine exact A+B+C heads and full CI. No database readiness is inferred from the model tests here.
3. Verify current account cutoff/billing/rights, exact reset UTC, source-specific budget/reserves, notification channel and physical iPhone STOP + Render suspension. Respect the existing one-worker hosting approval; **no second paid service**, key, upgrade or autoscaling is authorized by this candidate.
4. Only then issue a distinct continuous GO with exact deployed SHA/service/parent UUID/source policy/time/caps/credit weights/evidence hashes. False example cannot activate. No measured traffic → no invented week-long sizing. At expiry, exhaustion, uncertain meter/purge/notifications/store or STOP, deny renewal permanently.

Future approved existing-service build: `bash experiments/continuous-stream/render-build.sh`; start: `node experiments/continuous-stream/run.mjs`. Both `UNFARMD_CONTINUOUS_ACTIVATION=disabled` and `UNFARMD_DATA_ACTIVATION=disabled` until their distinct reviewed modes are authorized. New grant binding `UNFARMD_CONTINUOUS_APPROVAL_JSON`; reuses only the separately created server-side DATA key after all admission gates, never proof credentials. B owns final Render/database/auth configuration; no apply/provision command here.

Rollback before activation: close this dependent draft; original bounded release remains available. After future approved operation: authenticated **parent** STOP, confirm source closure or suspend/terminate the same worker, leave new activation disabled, and preserve all spent parent/child reservations, first-seen/control history and uncertain fences. Independent purge/watchdog must keep working while worker is STOPPED or suspended. Never delete/reset the ledger, run blind cron restarts or replace an uncertain worker to manufacture availability. Missing parent STOP/independent purge/notifications means **no unattended GO**.
