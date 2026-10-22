# Agent 0 — disconnected market-awareness research

**22 October 2026 · offline mechanics ready for review; C0 acquisition BLOCKED.**

Refs [#149](https://github.com/fuzzysniper/scout-stonk-intel/issues/149), draft [#150](https://github.com/fuzzysniper/scout-stonk-intel/pull/150), draft [#151](https://github.com/fuzzysniper/scout-stonk-intel/pull/151). This separate module implements the research mechanics proposed in #151. It does not acquire data, modify either draft, add a dashboard or establish predictive advantage.

Every success, token/pool address, price, volume and chronology in the demonstration is **INVENTED OFFLINE DATA**. Only the canonical wSOL mint denotes an actual asset, to pin the quote unit. Fixture addresses are deterministic 32-byte strings, not researched candidates. No real candidate or executable return is produced. Live allocation remains **$0**; NAV and alpha remain unavailable.

```sh
# From repository root, with existing root dependencies installed
bash experiments/agent-zero-market/test.sh
bash experiments/agent-zero-market/run-demo.sh > /tmp/agent0-invented-demo.json
```

The demo accepts **no arguments**, addresses, paths, credentials or provider responses. [Committed output](docs/synthetic-demo.json) is reproducible from [fixtures.ts](fixtures.ts). No real financial data or private positions are copied into Git.

## Narrow architecture

`invented packet bytes → normalizeSynthetic → frozen Capture → evaluateStudy → frozen ResearchReport → optional read-only #150 attachment`

- [model.ts](model.ts): independent research types, fixed bounds, exact decimal/time arithmetic and policy.
- [normalize.ts](normalize.ts): only an explicitly invented packet format; **not a GeckoTerminal response decoder**. There is no genuine-source factory, live adapter, HTTP path, configuration switch, poller or activation command.
- [engine.ts](engine.ts): knowledge-as-of views, fixed candidate roster/checkpoints, qualification, decision digests and bounded subsequent price-path evaluation.
- [seam.ts](seam.ts): optional, in-memory attachment to a compatible recorded #150 view. It preserves the caller's exact view reference, produces **no journal commands**, and refuses nonzero genuine eligibility/NAV/exposure. It is not wired into #150 or a production route. The existing journal/outcome admission rules are untouched.
- [tests](tests): deterministic synthetic cases and denied-I/O checks. The single root test hook runs these in existing CI; no dependency, workflow or infrastructure change.

The module reuses only the existing pure exact-mint/UTC/freezing and strict-JSON helpers. Runtime code uses SHA-256 locally and has no network, database, filesystem, credential or execution facilities. Runtime WeakSet admission rejects forged/cloned captures and reports; this is a programming boundary, **not cryptographic authentication against code running in the same process**. Output JSON is inspectable evidence, not an import command or independently authenticated receipt.

## Exact contract and clocks

The complete typed contract is in `model.ts`. The packet's strict allowlist is implemented in `normalize.ts`; fixtures illustrate every field. Unknown fields, ambiguous units, wrong identities, duplicate JSON keys, malformed UTF-8, excessive depth/size, invalid UTC and contradictory OHLC fail rather than being repaired.

| Field | Meaning and boundary |
|---|---|
| `identity` | Exact `solana-mainnet`, 32-byte base58 token/base/pool addresses, `tokenMint === baseMint`, distinct pool, canonical wSOL quote `So11111111111111111111111111111111111111112`; base decimals 0–255 and quote decimals 9. Shape assertions in invented data do **not** verify onchain accounts. No ticker, trimming, wrapped/native alias or pool substitution. One pinned pool per base mint in this bounded cohort; another pool/migration needs a new reviewed study. |
| Units | Price is **wSOL per whole base token**; base/quote volume units are their exact mints. Original decimal strings, coefficients and scales are retained. No USD conversion, rolling-window subtraction or Token-2022 supply/fee interpretation. |
| Decimal precision | Nonnegative plain strings, ≤30 integer and ≤18 fractional digits. Positive prices only; absent price is `null`. Exponents, floating JSON numbers, negatives, whitespace and excess precision fail. BigInt comparisons/sums preserve 18-digit precision; no monetary `Number` conversion. These are bounded research units, not a claim that every provider/pool fits them. |
| `poolCreatedAt` | Nullable **fixture provider claim** of pool creation, not mint creation, first trade or token age. `mintCreationAt` always remains null. |
| `requestedAt`, `receivedAt`, `availableAt` | Distinct original UTC strings, compared at microsecond precision. Availability must be ≥receipt≥request. `availableAt` is when the evidence became usable by this scripted process; later backfill cannot rewrite earlier knowledge. |
| `source.generatedAt`, `clock`, `latency` | Separate nullable source time, `fixture_defined/unverified` and `fixture_bounded/unknown`. Fixture-defined means only an invented assumption. Unknown clock/latency withholds qualification even if timestamps and prices look plausible. No HTTP-Date or retrieval time becomes a trade timestamp. |
| Bar `[start,end)` | UTC-minute aligned, exactly 60 seconds; `complete`, explicit `containsTrades`, nullable OHLC and disjoint base/quote interval volumes. Completed bars cannot end after receipt/source generation. No interpolating, forward filling, invented empty bars or treating zero as a total loss. A close is an interval observation, not a fill or exact trade time. |
| Provenance | Packet-byte SHA-256, original byte count, per-bar content hash, original request/source/receipt/availability clocks, identity and original values. Decision and outcome samples expose these references. A digest identifies invented bytes; it is not a signature, license, provider verification or chain replay. |

Packets: ≤256 KiB/32 bars; study: ≤2,048 packets, 12,000 bar records, 16 MiB aggregate bytes, six distinct base-mint subjects. The first cap is a hard failure, never silent truncation. These **offline memory bounds are not acquisition budgets**.

Repeated identical packets are idempotent. Identical bar observations add duplicate counts but no price samples or volume. Rows/packets may arrive out of order. A changed completed interval or conflicting same-time versions quarantine the affected window; the original decision's as-of information is unchanged by a later revision. Incomplete, untraded, missing-price and missing-volume bars remain explicit quality failures. Source/creation conflicts, >8-second transport latency and >300-second bar-delivery delay also withhold affected windows. No “latest version wins” or favorable revision selection.

## Synthetic awareness hypothesis, not a trading rule

The fixed manifest enrolls every subject before its first available evidence, including a rejection and unpriced outcome. Omitted subjects remain missing; unexpected subjects or duplicate mints fail. Enrollment is not selected by the eventual price. The demonstration is scripted, not a forward experiment on real tokens.

1. First discovery is earliest **available** evidence, even an identity-only packet. Report discovery lag only relative to the source's reported pool creation, never token birth. Replay earlier knowledge to find the first observable pattern; no future packet, complete bar or late backfill is available early.
2. A checkpoint is fixed at first discovery **+30 minutes 10 seconds**, not when the tag or price looks best. Require 20 consecutive completed, positively traded one-minute intervals available then; latest complete-bar frontier ≤90 seconds; reported pool age ≤one hour. Missing intervals, unknown clocks and other quality failures mean `INSUFFICIENT_EVIDENCE`.
3. The unvalidated descriptive pattern is recent ten-minute quote volume ≥2× previous ten minutes (previous >0), **both** recent five-minute volumes above the prior per-five-minute mean, and observed open-to-close appreciation in **(0%,25%]**. Exact comparisons prevent boundary rounding. Passing emits only `SYNTHETIC_PATTERN_OBSERVED`, never a conviction score or monetary eligibility.
4. Store a frozen decision snapshot with the fixed policy, exact identities, then-available packet hashes, original window evidence, reason, missing risks and digest. Decisions are **WAIT or REJECT**. Finalized mint controls, Token-2022 review, true token age, concentration, deployer links, liquidity depth, buy/sell participation, costs and exit capacity remain NOT OBSERVED.
5. Reference the close of the **first fixed one-minute bar starting ≥60 seconds after the checkpoint**. Do not fall forward when that bar is missing. Use 11 consecutive closes (reference plus ten minutes). Each 2×/5×/10× event requires two consecutive complete, traded closes; record bar-end times separately from when **both** observations became available. Entire-horizon gaps/revisions/unknowns withhold the comparison. Before horizon end, outcome is pending.
6. Report all enrolled cases, rejects, missing intervals and lower price paths. Every exit remains `UNKNOWN_NO_DEPTH_COST_OR_FILL_EVIDENCE`; `netReturn` and `realizedReturn` are null even for a complete favorable or declining path. OHLCV cannot establish executable returns, sellability, holders, genuine participation or losses after costs.

The +30:10 checkpoint and ten-minute horizon make offline examples compact and deterministic. They do **not** replace #151's proposed capture-aligned checkpoint, independent timestamp acknowledgement, 24-hour outcome horizon or its separately approved C1 protocol. This module neither tests 20× nor asserts an all-time high or a first-ever expansion. A future authentic factory/policy must be separately reviewed; changing labels or feeding real data through the synthetic factory is forbidden.

Local plan/decision hashes and frozen objects are not independently witnessed, durable pre-outcome commitments. The engine cannot prove when a caller created a plan. A genuine forward experiment still needs a private, approved independent timestamp witness, expiry-controlled evidence storage and append-only registration of **every** sampled admission, reject and capacity exclusion. No witness endpoint is implemented/contacted.

## Reproducible demonstration — every value invented

Fictional UTC date: **20 October 2026**, manifest 09:54; reported pool creation 09:55 for the two priced cases; first discovery 10:00. No fixture represents a real opportunity.

| Cohort member | Evidence at the fixed 10:30:10 checkpoint | Subsequent fixed-window observation | What is withheld |
|---|---|---|---|
| Favorable scripted path | 20 complete bars; first pattern visible 10:26:02; WAIT because risk evidence is absent. Discovery lag 300 seconds against the invented pool-creation claim. | Reference 10:32–10:33 close **1.200000 wSOL/base**. Two-close 2× confirmation 10:36, 5× 10:38, 10× 10:40; received/available two seconds later. Final close **12.000000**, not an executable return. | Exit, fees, net/realized return, true launch age, predictive value. |
| Declining scripted path | Same pre-outcome evidence and WAIT; no hindsight exclusion. | Same reference; final close **0.100000 wSOL/base**; none of the expansion thresholds confirmed. | No assumed fill or manufactured realized loss. Exit unknown. |
| Rejected/unpriced control | Pre-registered REJECT; missing 10:18 interval, null 10:19 close, unknown source clock/latency and pool age. | Missing final four intervals; outcome WITHHELD. Still included in cohort/counts. | No flat price, zero loss, replacement winner or excluded denominator. |

The demo reports **three enrolled / three decisions / one reject / one unpriced outcome / zero real-money eligible**. It does not establish a hit rate or edge. [Full output](docs/synthetic-demo.json) contains decision evidence, gaps, fixed windows and provenance; rerun the demo to reproduce it byte for byte.

The #150 compatibility test uses all **seven actual tracked mint identities**, read locally, with deliberately constructed insufficient-state sentinels. It checks exact view/reference preservation and zero journal commands; it does **not** pretend a genuine #150 journal ran or create real observations. Existing seven-mint evidence and every production source/collector gate remain unchanged. The package is independently runnable without merging #150.

## Future C0 prerequisites — not granted here

See [rights decision and unsent inquiry](docs/PROVIDER_QUALIFICATION.md). C0 stays BLOCKED. Before **any** market-data attempt, the owner must independently approve all of:

1. Written permission or a scoped written legal determination for the exact free product, private treasury research, automated access, raw/normalized/derived retention and deletion. Reconcile immutable decision records with refresh, deletion and backup duties. Review a priced alternative separately if no free permission exists; no spending/key/account implied.
2. Current exact new-pool/detail/OHLCV contracts: network/base/quote/pool/decimals, feed ordering/truncation, original number lexemes, timestamp/clock and completed-candle semantics, volume denomination, empty/traded/revised bars and retention rights. Nothing in the invented schema proves a vendor field exists.
3. A **separate narrow genuine acquisition/decoder PR** with source-specific rights admission, lossless numeric handling and bounded transport. It must not relabel captures synthetic, activate production, borrow a source budget or weaken existing snapshot/reward/tick gates. Any unknown units/clock/identity/rights stop admission.
4. Explicit finite C0 approval: **six attempts total, ≤six per rolling minute, serial ≥10 seconds, no retries**, one mechanically selected exact wSOL pool, $0 purchased services, no new account/key, original per-body/cumulative/time bounds from #151. Stop at the first error/denial/429/conflict/cap; no fallback, background loop or gap repair. Retain only permission-covered evidence privately outside Git.
5. Review actual C0 evidence before deciding metadata-only, source rejection or a separately approved C1 study. There is no automatic rollover to #151's 1,830-attempt C1 ceiling, an authentic outcome factory, RPC, trading, or $10 speculative exposure. A successful C0 cannot prove reliable awareness or economic advantage.

**One next-PC-session decision:** review and, if satisfied, authorize the founder to send the prepared provider inquiry. This is **not** approval for C0, provider contact by an agent, a subscription or capital deployment. If rights remain unanswered, leave acquisition disconnected.

Rollback: revert this isolated package and the single root `tests/run.sh` hook. There is no service, database, credential, journal, production UI or source state to reverse. [Verification record](docs/VERIFICATION.md) reports actual local/CI results. Keep the implementation PR DRAFT for human schema/security/financial-claims review; do not merge or activate.
