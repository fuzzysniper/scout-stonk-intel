# Issue #153 — one private PumpSwap development observation

**Inactive. No mainnet RPC request has been performed.** This is a separate, read-only owner-PC development probe, not GeckoTerminal C0, a public source activation, Agent B's mint-facts proof, a collector or an opportunity recommendation. Only this directory changes. No public UI, wallet, credentials, treasury, existing PR or production configuration is involved.

## What is implemented

One explicit invocation can make **at most two serial RPC attempts** against **`https://api.mainnet-beta.solana.com/`**:

1. `getMultipleAccounts`, `commitment: finalized`, `encoding: base64`, in exactly this order:

   | Account | Published exact identity |
   |---|---|
   | Pool | `GseMAnNDvntR5uFePZ51yZBXzNSn7GdFPkfHwfr6d77J` |
   | Base vault | `5jMpkf4JF4noHftLgNKyPNh6roVfPSGSjuEk3U4eLKRa` |
   | wSOL quote vault | `43DVcZR4kQFjh4Xm2i3DcneRxNjZp7HMud8yDrJWrDr8` |
   | Base mint | `7LSsEoJGhLeZzGvDofTdNg7M3JttxQqGWNLo6vWMpump` |
   | wSOL mint | `So11111111111111111111111111111111111111112` |

2. **Only if the first response passes structural validation**, `getBlockTime` for that exact `context.slot`. This implementation uses the optional second read to enforce freshness; an unsupported/null/stale result withholds the price. No `getSlot`, genesis query, balance query, transaction lookup, simulation or write is hidden in the budget.

The first error ends the run. **No retry, redirect following, fallback host, reconnect, poller or background action.** Each request has a 10-second total deadline and a 64-KiB body limit. The pipeline and approval-bound native reader independently cap requests at two. Claims/reservations are persisted before dispatch; timeout/uncertain completion consumes the reservation. Reusing an approval file, including concurrent invocations, is denied by an exclusive `.spent` claim. Never delete/reset that claim to retry.

## Current official source verification

Pump.fun public-docs latest main, checked **22 October 2026**: [`639b87fb45c3adeffa6f7c4a1bf0cb85e392bf22`](https://github.com/pump-fun/pump-public-docs/tree/639b87fb45c3adeffa6f7c4a1bf0cb85e392bf22). The AMM IDL SHA-256 is **`b7d8c57a4d9c4dd0109a9ab893052352333252d4eedced10ac091d4d66cab89b`**; metadata `pump_amm / 0.1.0 / spec 0.1.0`. [Dated source hashes](docs/source-receipts.json) cover the IDL, public example, negative-reserve/fee documents, official SDK 2.1.0 historical-length reader and official SPL Token source. The SDK was inspected, **not installed as a dependency or executed**. No data endpoint was queried.

[official-layout.json](official-layout.json) contains extracted wire-format facts, not a copied full IDL. Reproduce the check with a local copy of the pinned official file:

```sh
node experiments/agent-zero-onchain/verify-idl.mjs /path/to/pump-public-docs/idl/pump_amm.json
```

The checker verifies the **exact original byte hash**, program, metadata, discriminator, all 18 field names/types/order/offsets and serialized size. It has no HTTP/RPC path. No source license/trademark/commercial-data clearance is claimed by this extraction.

Validation includes:

- Pool owner **`pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`**, executable=false, discriminator `[241,154,109,4,17,177,109,188]`, published creator/index/bump, exact mints/vaults/LP mint. Pool/LP/ATA **seed-hash equality against the fixed published addresses** is checked; this is not a general-purpose PDA/curve finder.
- Documented historical lengths **211/243/244/245/261/270/271**, current **287**, or **300–512 with a zero-only tail**. Missing appended fields use the official legacy zero/false defaults; arbitrary partial fields and unknown/nonzero tails fail. At bytes **245–260**, virtual quote reserves are signed little-endian **i128**, never unsigned.
- Classic SPL Token owner, exact **82-byte mint / 165-byte vault** layouts, initialized states, valid option tags, expected vault mints and pool authorities, no delegates/close authorities, wSOL decimals **9**, native flag/backing, positive base reserve and supply consistency. **Token-2022 is rejected**, rather than interpreting extensions or fee behavior without review.
- Strict duplicate-key/UTF-8/schema/base64 checks; integer JSON is decoded directly to **BigInt**, including `rentEpoch`, lamports and slots above `2^53`. Binary u64 amounts and mint decimals are preserved. No financial amount passes through floating arithmetic.
- One bank context for all five accounts. Request/receipt ordering and ≤10-second capture duration; block-time estimate no more than **120 seconds old** at validation, with at most **5 seconds future clock tolerance**. Original RPC HTTP-Date metadata is retained separately and does not become the market timestamp.

## Price and evidence boundaries

```text
effectiveQuoteRaw = quoteVaultAmountRaw + signedVirtualQuoteReserves
spot_wSOL_per_whole_base =
    (effectiveQuoteRaw × 10^baseDecimals) / (baseVaultAmountRaw × 10^quoteDecimals)
```

Require `0 < effectiveQuoteRaw <= u64::MAX`; do not trust the program's overflow guarantee when decoding untrusted bytes. Waiting protocol/creator fees in the quote vault are **not** added as executable liquidity or subtracted twice. The exact reduced/unreduced rational is primary; the 36-place decimal is explicitly truncated, with an exactness flag. This is a **reserve spot ratio**, not a trade quote, achievable fill, USD value, market cap, performance, alpha or holder return.

Raw responses and metadata remain in the approved **private directory outside every Git checkout**: `approval.json`, `attempt-N.json`, `response-N.bin`, `response-N.json`, `result.json`; the original approval's adjacent `.spent` marker remains permanent. Originals include exact response/request SHA-256 hashes, endpoint/network assertions, all five identities, raw signed/unsigned units, decimals, finalized context slot, estimated slot block time/Unix seconds, raw HTTP-Date, separate local request/receipt/validation UTC and validation failures. No financial payload is automatically committed, uploaded or published.

The pool has **no onchain IDL-version tag**. This checks the pinned official shape; it cannot certify deployed bytecode or upgrade status within the two-read budget. Network scope is the fixed TLS-verified mainnet endpoint and published account identities, **not independent genesis verification**. Finality, account ordering and block time are RPC-reported; block time is an estimate, not a last-trade timestamp. Local UTC is not independently witnessed. Hashes are not signatures or independent chain replay. Pure decoding of a fixture never authenticates its acquisition origin.

This does **not** assess mint/freeze risk, Token-2022 behavior, concentration, LP control, sellability, depth, fees for an actual trade, exit capacity, token birth, activity, candles, coverage or future performance. A fresh reserve snapshot does not unlock Agent 0 eligibility or change the seven insufficient tracked mints.

## Founder approval and exact invocation

Follow [OWNER_RUNBOOK.md](docs/OWNER_RUNBOOK.md). Default/help invocation is safe and performs **zero RPC**:

```sh
node experiments/agent-zero-onchain/run.mjs --help
```

**Only after separate written founder approval**, copy/edit the disabled [approval.example.json](approval.example.json) outside Git, then invoke:

```powershell
node experiments/agent-zero-onchain/run.mjs --one-shot-dev-probe "C:\Users\OWNER\Documents\UNFARMD-private\pump153\approval.json"
```

[Exact request scope/hash](docs/request-scope.json): **`8bc80f985d5b89154f09753be405a4f832e9ea3cc6eb706adb7f837cf020cb56`**. The file must explicitly approve this scope, identify the reviewed commit, provide current UTC approval/expiry (≤24 hours) and name a new private output directory. The reviewed commit is an **owner attestation**, not independently checked running-code identity. This local acknowledgement/claim protects normal use; it cannot authenticate a hostile local operator or prevent copying an approval to defeat the procedure. Such a copy/retry needs new explicit founder authorization.

Native transport **fails closed on CI, Vercel, configured HTTP/HTTPS/ALL proxies or disabled TLS verification**. It never ignores/removes a proxy. This managed cloud's public Solana RPC path is not authorized/configured; no live reachability test was made. Use the approved owner's direct local-PC path, or separately review supported proxy routing first. Do not unset cloud proxy variables to evade policy. No existing Helius key, Neon DSN, production source flag or Agent B budget is read.

## Verification and rollback

```sh
node experiments/agent-zero-onchain/test.mjs
# Equivalent Linux entry point:
bash experiments/agent-zero-onchain/test.sh
```

Offline fixtures use the published identities but **invent every byte amount, slot, time and response**. They are only in tests; there is no fake-data demo or live-looking fixture command. Tests mock/deny network and check arithmetic, legacy layouts, wrong identities/owners, Token-2022, bad clocks, errors, timeout, partial/duplicate/out-of-order payloads, private paths, one-use claims, native and pipeline caps, and zero default acquisition. [Verification](docs/VERIFICATION.md) reports actual results. Root CI remains unchanged: `tests/run.sh` is explicitly protected, so the focused harness is run separately and its results are reported separately from existing root CI.

Rollback before activation: remove this directory; no production or service state exists to reverse. After a separately approved probe, stop, retain `.spent` and permitted private failure evidence; do not repeat/reset it. Review local retention/access and remove evidence when required. Do not publish source-derived financial data commercially without a separate rights review. No probe failure authorizes another provider, source activation, trade or merge.

## Next research step — plan only, not implemented or authorized

After one genuine observation is reviewed, propose **one finite private event-indexing experiment** with a dedicated-provider quote and terms; public Solana RPC is for light development, not a production collector ([RPC](https://solana.com/docs/rpc), [clusters](https://solana.com/docs/references/clusters), [multi-account contract](https://solana.com/docs/rpc/http/getmultipleaccounts)). No current dedicated subscription price, method-credit cost, WebSocket quota, archive depth, SLA or retention/commercial right is verified; obtain those before proposing spend. Today's scope purchases **$0 services** and cannot roll over into subscriptions/crawling.

- Discovery candidate: finalized `logsSubscribe` for the PumpSwap program; authenticate actual program/CPI invocation and decode the pinned `CreatePoolEvent`. Verify new pool/mints/vaults separately; distinguish event/estimated block time, finalized receipt and first discovery. Register all sampled identities/rejects and explicit capacity exclusions. This is not all Solana venues or first-ever token discovery.
- Bars candidate: verify successful transactions and every relevant `BuyEvent`/`SellEvent`, preserving signed virtual reserves and gross/net fee fields. Freeze exact base/quote, execution-price and volume semantics before implementation. Reserve snapshots are **not** trades or candles. Keep authenticated instruction/event order, transaction identity, slot/finality and block-time uncertainty; deduplicate replays and handle finality/reorg transitions without rewriting decision-time evidence.
- Completeness: subscriptions can drop/reconnect, logs may truncate, transaction history/pruned blocks can be unavailable. Preregister a small pool/time/read/byte cap and bounded archival gap proof/backfill. Mark uncovered minutes **UNKNOWN**, never flat/zero-filled or complete. No reconnect/backfill mechanism or new budget is implemented here.
- Manipulation/execution: swaps/volume can be wash activity; apparent price expansion is not demand, executable return or exit capacity. Token controls, holder/LP/deployer evidence, size-aware execution costs and baselines need separate approvals and data. Keep private retention, correction/deletion, provider terms and commercial publication gates explicit. No ongoing collector, eligibility, trading or proof-of-edge claim follows from this probe.
