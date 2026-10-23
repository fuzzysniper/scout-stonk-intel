# Existing Developer plan: activation and scaling card

Reviewed **2026-10-23 UTC**. Follow-up to #167 / draft #170; coordinates B's #169, reviewed at `0fc08db97531e693b30894dae1724027ac972a25`. **Source OFF. No real WSS measurements exist. No continuous operation is authorized or implemented.**

## What is known

Founder verified Developer: **10,000,000 monthly credits −317,040 used =9,682,960 remaining**, reset in approximately12days. These are founder-reported account observations, not an agent dashboard check; exact snapshot/reset UTC must be captured before GO. Other project/key usage shares this account allowance. The absence of a displayed autoscaling limit is **not proof of a $0 overage cap**.

The [official Helius WSS reference](https://github.com/helius-labs/core-ai/blob/f8c74e6a357fe89fc93c80bac522f5a8b6a7cafe/helius-plugin/skills/build/references/websockets.md) states **2credits/0.1MB =20credits/MB** for Standard and Enhanced WSS. This corroborates the rate in the founder's May2026 announcement citation, but does not independently verify that announcement's date or this account's invoice/metering. Direct pricing/terms remain proxy403 (rechecked pricing 2026-10-23); no account/usage endpoint was called.

**Still unknown:** decimal MB vs MiB, rounding granularity, which bytes/control/overhead are billed, failed/empty RPC weights, dashboard metering delay, actual DATA-key attribution, hard project/account cutoff and existing-socket behavior at the cutoff. Obtain account-specific evidence before approving a cost ceiling. A project RPS limit, budget alert or our SQL quota is not provider spending protection.

## Consumption: calculations, not invented traffic

Use decimal MB **only as a stated calculation convention until provider confirmation**. At20credits/MB:

| Existing runtime envelope | Data-body-only arithmetic; NOT actual spend or a full reservation |
| --- | --- |
| One connection,16MiB | 16.777216MB ×20 =335.54432credits; whole-credit ceiling336 |
| One connection,16MiB +64KiB control payload allowance | 16.842752MB ×20 =336.85504credits; ceiling337, still excluding billing/protocol/overshoot uncertainty |
| Three connection attempts,16MiB each | Aggregate1006.63296credits; B charges per-connection weights, so at least3×336=1008 for data alone, not an aggregate1007 shortcut |
| HTTP corroboration | ≤40attempts × owner-verified maximum method weight `R`; do not assume1credit/request |

Limits are **per connection/session, not per hour**. A10-minute proof and a1-hour grant have the same existing maximum receive envelope; either can stop earlier at20kframes,16MiB,200candidate records, queue/caps or errors. Target duration is not guaranteed. “Low actual usage” does not refund the durably reserved envelope.

Standard `logsSubscribe` filters one program, **not its creation instruction**. Buy/sell/migration logs arriving under that program consume bytes before local ignore. Keep the single Pump program filter, no extra subscriptions; preserve local dedup, serial sampled finalized corroboration (≤20pairs, spacing≥10s), no RPC retries/raw persistence. Measure useful yield after the proof: creations per receivedMB, ignored-byte fraction if actually instrumented, finalized corroborations perRPC attempt, and attributable credits per finalized creation (undefined when count0). Current ignored-frame counts do not establish ignored-byte fraction. These are acquisition-efficiency metrics, not investment signals. Do not enable Enhanced WSS or assume its filters save credits without a separately approved measured comparison. Larger account allowance is not a reason to raise caps blindly.

### Measurement required after a separately authorized proof

Owner records DATA-key/project before/after settled credits and exact UTC window, original receipt clocks, actual observation seconds `t`, forwarded data-body bytes `B`, frames, ignored/duplicates, candidates/finalized/withheld, RPC attempts by method, connections, all STOP/gap/cap reasons and last frame/pong. Keep normalized evidence under approved retention; retain sanitized aggregates only if rights permit. No keys, raw responses or signed URLs in reports.

Current worker `health.bytes` / B `bytesReceived` are forwarded application message bodies, **not wire/billable bytes**: control/protocol overhead, a rejected/cap-crossing message, provider buffering and unobserved periods may be absent. `rpcBytes` is HTTP response-body size, not its credit weight. B `creditsReserved` is committed worst-case allowance, **not a Helius usage meter**. Never relabel one as another.

Use DATA-key-resolved usage if supported. Otherwise reconcile *all* other account traffic in the same settled window; an aggregate317,040→new-total delta cannot be assigned to this worker while Agent B/other clients also consume credits. Do not disable or reuse their proof key. Document dashboard lag/rounding; if attribution or byte accounting is unresolved, withhold calibrated cost claims.

Let `d` be **attributable, settled provider credits** for a complete measured interval of `t` seconds, including its actual RPC traffic. Let `v` be provider-confirmed billable MB for that interval and `h` its actual RPC credits. Then `d = billed_WSS(v) + h`; reconcile with20×v plus documented rounding, do not force an unexplained difference to match. With no session, `t,d,v,h` are **NOT OBSERVED**.

| Horizon | Conditional projection from that actual interval | Current expected usage |
| --- | --- | --- |
| 10minutes | `ceil(d ×600/t)` | UNKNOWN |
| 1hour | `ceil(d ×3600/t)` | UNKNOWN |
| 24hours | `ceil(d ×86400/t)` | UNKNOWN |
| 7days | `ceil(d ×604800/t)` | UNKNOWN |

For a complete10-minute interval these multipliers are1,6,144,1008. This is a linear scenario at the *observed* rate, not a peak/guaranteed forecast or safe approval by itself. A short/cap-censored/disconnected interval does not establish representative hourly/weekly load; record which bound ended it, active-time vs elapsed-time and coverage. Size safety budgets from a representative set of measured windows/bursts plus a reviewed uncertainty margin, not guessed launches/sec or a quiet snapshot.

### Account ceiling, not an allocation

Let `O` reserve included credits for **all other consumers through reset**, and `H` reserve billing delay, rounding, bursts and incident closure. Proposed DATA allowance must satisfy `A ≤ max(0,9,682,960−O−H)`, with updated snapshot/time at approval. `O,H,A` remain owner decisions; no default takes the whole subscription.

For scale only: spreading the **entire** remaining balance across exactly12days would allow806,913.33credits/day or33,621.39/hour, equivalent to1,681.07decimalMB/hour if WSS were the sole use at20/MB. Seven days at that same rate consume5,648,393.33credits. This excludes RPC/other usage/reserves and is **not an approved budget, traffic estimate or evidence of affordability**. Exact reset UTC and remaining period must replace the approximate12days before any allocation.

## First activation: shortest checklist

1. **Meter/cap evidence:** owner verifies current Standard WSS rate/units/rounding, both RPC method weights, available credits/exact reset UTC, and documented provider-enforced no-overage cutoff covering existing WSS. No visible autoscale control means **unresolved**, not disabled. If only alerts/soft quotas are available, STOP/NO-GO; obtain provider confirmation without a test flood.
2. **Isolation/rights/hosting:** separately authorize DATA key, private business use,1h normalized retention and actual physical purge/backups; approve Render cost and B schema/auth rollout. Do not expose/change old proof credentials or budget. Source/store/API stay OFF while preparing.
3. **Combined acceptance:** approved exact A+B+C heads; green CI + local TLS/PG integration; authenticated mobile read/STOP and Render suspension available on founder's phone. Confirm source closure when STOP is requested. Apply no SQL or deployment solely from this checklist.
4. **Approve one10-minute proof:** exact SHA/service/session/UTC grant; unchanged receive/record/RPC caps. In B's initial authorization, set verified conservative integer `C=connection_credits`, `R=rpc_credits`, `L=credit_limit`. Include billing rounding/overhead/in-flight uncertainty in `C`. For one initial connection and up to40RPC attempts, propose `L=C+40R` **only if `40R<C`**, so `L<2C` and a second connection cannot fit. If that inequality fails, the existing ledger cannot promise this one-connection envelope: NO-GO pending a smaller reviewed scope/explicit connection limit. The exact existing quota field mapping was verified with A’s adapter against B0fc08db using real disposable local TLS/PostgreSQL: one connection +40RPC charges retained, second reservation denied atomically and STOP latched. Test weights are invented integers, not provider pricing. No guessed C/R/L values, no grant edits to simulate approval.
5. **Run only after distinct SOURCE GO:** record before/after metering and actual counts/clocks; stop at first cap/error/deadline, confirm durable STOP + native closure. Reconnect attempt may be denied by the deliberately small credit cap; preserve its gap. Current initial authorization is **one-shot**: do not clear STOP, reset counters or reuse the session to get an hour.
6. **Reconcile then decide:** verify settled meter attribution, true source/finality labels and physical retention. A failed/unpriced/no-event/censored run is reported as such. Only after this succeeds may owner approve a separately reviewed1-hour stage and later a mobile-week parent budget. Neither follows automatically.

Ready-to-send owner question (not sent): “For our existing Developer project, confirm Standard WSS20credits/MB billing units/rounding and billed bytes, getTransaction/getSignatureStatuses weights including failures, per-DATA-key usage attribution/settlement delay, and the exact hard control that prevents additional charges or autoscaling when included/project credits run out. Does it terminate an already-open WSS? We see no autoscaling-limit control; please distinguish enforced cutoff from alerts and provide written applicable terms/retention scope.”

## After a successful proof: separate continuous-session proposal

**Not supported by current #169/#170 and not activation-ready for a mobile week.** Current source grant≤1h, one-shot authorization, permanent STOP and200-candidate lifetime cap are deliberate. Do not stretch expiry, run a restart loop, periodically reset `control`, rotate keys or clear history.

Smallest future reviewed change: B adds a billing-period parent allowance and append-only child grants; A admits bounded receive **segments** against that same durable parent before exceeding an envelope. Parent expires before exact account reset; child expiry≤1h and cannot extend parent. Every child/segment reservation remains spent across restarts, failures and grant changes; global STOP is monotonic and inherited, never reset by renewal. One process/fence/socket; no overlapping deployment/auto-scaling or expired-unclean reclaim. In-place admission requires an explicit new protocol/policy review; until then close-confirm-reopen introduces a declared gap, not continuous coverage. No implementation in this update.

A mobile-week GO additionally requires:

- **Measured sizing:** representative peak/burst data, cumulative parent credit/byte/RPC and cost caps ≤A, separately reserved other-account usage, periodic provider-meter reconciliation; unknown/stale/unattributable meter or uncertain cap → no renewal. No paid overage or auto top-up.
- **Bounded storage:** reviewed rolling retention/candidate-throughput policy replacing current200 lifetime-stop only after observed rates justify it. Approved physical erasure during STOP/outage, backups, restore and provider deletion requirements; logical TTL is insufficient. Do not delete restricted history/control/audit to reclaim allowance.
- **Gaps/recovery:** persist original clocks/counters and startup/disconnect/shutdown boundaries. Standard WSS has no history replay; missing creations stay unknown. No automatic RPC backfill or second source/connection to hide gaps. Owner-confirmed old-socket closure before recovery; STOP never auto-resumes.
- **Mobile operations:** actual iPhone authenticated read + durable STOP + Render emergency suspend tested before PC departure; no credentials in URLs/localStorage. Preapprove one notification channel/escalation recipient and delivery test (none configured/contacted here). Notify expiry, stale frames/pongs, disconnects, cap/queue errors, reconciliation mismatch and credit thresholds; notifications do not stop spend. Lost notification/owner acknowledgment or unavailable purge/store/meter denies renewal and leaves STOP. No week-long source GO until these mechanisms are implemented and accepted.

**Today’s decision:** finish the account-specific meter/hard-cutoff and rights evidence, then authorize exactly one capped proof. Existing paid capacity is ample *relative to the small proposed envelope arithmetic*, but unmeasured load and missing hard-spend evidence prevent a defensible hourly/weekly cost approval today. No credentials, acquisitions, charges, SQL, deployments or source activations occurred for this update.
