# Private Pump launch pilot — actual worker, INACTIVE

Follow-up to #156 / #158 and #153 / #154. Latest main `aede88cf1edda125ea2af757a51d03221860aa31` plus **unchanged #158** as a decoder dependency. New work only in this directory; Agent B production proof, credentials, consumer app, collector and all other PRs unchanged.

**Live result today: NOT RUN.** No source/RPC acquisition was authorized or performed by this implementation. Received/finalized/rejected/latency/gap measurements are **unavailable**, not invented zeroes. This is a real native WebSocket/HTTPS worker and private UI, not a simulated live feed; its executable acquisition stays behind exact-head owner approvals. [Source qualification](docs/SOURCES.md) and [Windows owner pilot](docs/OWNER_PC.md) give the remaining gates.

## Smallest usable slice

1. One credential-free public Solana RPC WebSocket, `logsSubscribe` mentioning the pinned **Pump bonding-curve program**, requested finalized. It detects scoped top-level creation/migration instruction hints, never treats notification strings as verified mint identities. Raw receipt/UTC/hash is retained privately before interpretation.
2. First three candidate signatures in received order may each consume two reserved read attempts: original finalized `getTransaction` + exact `getSignatureStatuses`. No retries, polling or backfill. Reuses #158's exact curve/event-authority/token-program/quote/event-CPI checks; additionally binds migration's exact pool account. Unsupported layouts, quotes, routed calls, failures and reorgs withhold rather than guess.
3. Exact mint/curve/pool/quote, original event/receipt/checked UTC, slot, hashes and WAIT reasons appear in the local UI when supported. Until then mint/quote remain UNKNOWN. **Same-provider finalized RPC corroboration is not independent-provider verification or chain replay.** Separate counters prevent that conflation.
4. Initial trade events included in verified transactions can enter exact-string **sampled** 1m/5m windows. Full buy/sell counts and volume remain UNKNOWN: this is not a complete per-token trade stream. Source-clock lag is explicitly unverified; HTTP elapsed times use owner-clock request/receipt times. No fabricated market cap, liquidity, PnL, price or exit.
5. Source error/close, malformed/revised data, timeout, caps, approval expiry, Ctrl+C or STOP file end source I/O. No reconnect/retry or automatic restart. Raw records are owner-private, fsynced and locally hash-linked; permanent non-market spent-ID tombstones survive raw deletion. Crash lock requires manual review. Hashes are not signatures, independent timestamps or power-loss guarantees.

The public endpoint is a **development pilot only**, not a production hosting solution. The first successful run can prove actual arrivals and finalized corroborations within a partial bounded session; it cannot establish persistent reliability, predictive edge or independent-provider verification.

## Run safely

```sh
npm ci --prefix experiments/live-market --ignore-scripts
bash experiments/launch-intel/test.sh
bash experiments/live-market/test.sh
node experiments/live-market/run.mjs scope   # local scope only
node experiments/live-market/run.mjs status  # local retained evidence only
node experiments/live-market/run.mjs view    # loopback-only view; no source capability
```

Actual acquisition is **not** a default command. Only after separate rights/source/RPC/head/window approval, follow [OWNER_PC.md](docs/OWNER_PC.md). Do not create approved files or call a provider while reviewing this PR. The checked-in example has all GO flags **false**.

## Limits and security

One WebSocket attempt, 120 seconds, 2,000 accepted data messages including acknowledgement, 4 MiB decoded UTF-8 payload, 64 KiB/message, 64 candidates, 3 verifications, 6 HTTP reads, 256 KiB/HTTP response, 5s connection/request timeouts, **$0 paid spend**, no keys/wallet/accounts. Byte caps describe application payloads, not TLS/TCP/header overhead; up to one rejected/in-flight message can trigger closure. 32 WS fragments / 64 buffered chunks, no compression/redirects/automatic pongs; a ping/control event ends the pilot. HTTP and WS are separately capped; HTTP is serial (one active request) alongside the single WS. No execution RPC methods can pass the native allowlist.

Approval file and state must be outside every Git tree, without symlinks. Fixed owner-home state, global exclusive lock, permanent ID spend, strict exact approval fields/head/scope/time and private-only rights attestation. POSIX modes 0700/0600; Windows owner checks NTFS ACLs and encryption. Reject CI, Vercel, proxy-configured environments and TLS-disabled acquisition; do not bypass those guards. UI binds only `127.0.0.1`, rejects hostile Host/Origin/Sec-Fetch-Site and all mutations, uses no-store/CSP, renders text only. Its polling reads local memory/files and cannot invoke sources. Same-OS-user compromise remains outside this local protection boundary.

`ws` **8.22.0 MIT** is the sole new, independently locked dependency, used for bounded framing instead of hand-written WebSocket code. Root package/lock and existing workflows unchanged. A new PR-only, read-only offline CI job runs the 47 parent and 30 worker tests, never the native pilot. This dependency and the inactive source capability require human code review before activation.

## Price scope / remaining evidence

#154's signed effective quote reserves and exact rational decimals are appropriate for validated **migrated AMM vaults**. A creation notification is not such a reserve snapshot. This pilot authorizes no new account/vault reads; it does not incorrectly apply PumpSwap math to pre-migration curves or infer token decimals. Prices remain UNKNOWN. A future exact-pool #154-style read needs separate identities, approval and budget. Mint/freeze/Token-2022 controls, holders, manipulation, liquidity, exit capacity and a complete trade feed remain NOT OBSERVED. Agent B's Helius/Neon path is neither invoked nor required.

## Rollback / next stage

Nothing is deployed or activated. Revert this directory to remove the capability; retain the independent #158 decoder PR. After any owner pilot, kill source I/O, keep spent markers and inspect/delete raw records on the approved schedule. Do not reset a budget by restoring/deleting state. Persistent activation needs a separately approved worker runtime, qualified dedicated provider/retention rights, measured quota and cost envelope, independently supervised stop, restart/gap protocol and independent-source verification policy. Never put the persistent process in a Vercel request handler.
