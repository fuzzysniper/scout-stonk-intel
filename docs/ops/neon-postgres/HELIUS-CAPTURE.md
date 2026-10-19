# Separate future authentic Helius observation — NOT APPROVED

Connectivity approval is **not** Helius approval. Existing production-only credentials are configuration, not traffic authorization. First complete and review authentic native connectivity evidence. Then approve a separately reviewed disposable capture artifact and a new one-time operation; no production API/public gate activation, admission reset, collector or UI change.

## Fixed capture contract

| Item | Exact proposed value / limit |
| --- | --- |
| Target | Solana mainnet mint `DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP` |
| Selection provenance | The existing dated [three-example catalog](../../../experiments/consumer-mvp/evidence/catalog.ts) identifies this as SI. That record chooses the **exact target only**; it does not prove its current owner/state/name/pair/rewards. Never resolve by ticker or substitute the quote/pool mint. |
| Host | HTTPS `mainnet.helius-rpc.com:443`, fixed path `/`; only separately provisioned `SCOUT_MINT_HELIUS_API_KEY` injected server-side. No old bot key, alternate host, credential export or browser credential. |
| JSON-RPC | `{"jsonrpc":"2.0","id":118,"method":"getAccountInfo","params":["DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP",{"encoding":"jsonParsed","commitment":"finalized"}]}` |
| Traffic | **One POST total** in its separately approved window. No retries, redirects, batch, health check, getSlot/getBlockTime, discovery, wallet/holder query or fallback RPC. Timeout/error/429/503/invalid JSON means STOP, not a second call. |
| Bounds | 5,000ms end-to-end wall + monotonic deadline (including response body), abort transport/reader; ≤65,536 response-body bytes and ≤16,384 header bytes. Request `Accept-Encoding: identity`; reject nonidentity Content-Encoding before reading. Stream limits independently of Content-Length. Standard CA/hostname verification, no proxy/redirect override or insecure TLS. |
| Budget/authorization | Owner verifies existing Helius account/key scope, mainnet endpoint, actual remaining quota and acceptable charge for one call; credentials alone prove none of these. No purchase or quota/billing change. Independent operation record is consumed **before** issuing the request; no retry even if receipt is uncertain. Same cross-instance one-shot limitation as the connectivity plan; no fake process-global guarantee. |

## Raw evidence, validation and honest interpretation

The future capture wrapper must retain the **exact bounded, identity-encoded HTTP response-body bytes before parsing** (not TLS/chunk framing), calculate SHA-256 over those bytes and only then parse strict UTF-8/JSON. Do not hash a reformatted object. Reject malformed encoding, duplicate JSON keys, wrong id, RPC errors, invalid slot, wrong SPL/Token-2022 owner/type, uninitialized state, unsafe integer conversions or unexpected extension representations using the existing strict `lib/onchain-mint/decoder.ts`/`MintFactsV1` rules. Supported extensions remain narrow; unreviewed Token-2022 extensions stay visibly unsupported. Supply stays original integer text plus explicit decimals; null/zero authorities remain distinct. No new token enrollment or proprietary StonkFun/reward requests.

Use the existing isolated native `node:https` transport design, not Next's instrumented global fetch: full credential-bearing URLs must never enter request spans/APM. Review hosting instrumentation/redaction before approval. Hash bounded bytes in memory first; persist only after HTTP/schema/secret-reflection checks pass. Do not archive 401/429/503/error bodies, which may reflect credentials. If a response contains the runtime's credential or other secret material, discard it and stop; do not “redact” bytes and call their new hash the original raw evidence. No provider URL, credential value or full headers may be sent to a raw-artifact sink.

Record method, exact mint, fixed host **without the credential-bearing URL**, requested finalized/jsonParsed, request-start UTC, body-complete UTC, monotonic duration, response HTTP Date (or honest null), actual context.slot as exact string, response byte length, SHA-256 and decoder version/commit. Check wall/monotonic disagreement and freshness with existing bounds. HTTP Date is provider-reported transport timing; the local receive clock is observation timing. `context.slot` is RPC-reported finalized context, **not account last-change time**. `slotTime=null`; one request cannot establish current block time or independently replay consensus. Missing/old/invalid source clocks must remain unavailable/stale, not be replaced with “now.”

For a successful authentic, permitted capture, a later reviewed adapter may label acquisition `production_rpc` with `assurance=rpc_reported_not_independently_replayed`. No synthetic/dated fixture may receive that acquisition label. Keep original captured timestamps forever; a later offline explanation is `recorded_response` and becomes stale according to its original clocks. Do not publish an old sample as a fresh live reading.

Use owner-controlled **private, non-overwriting** retention: raw bytes written once under `sha256-<digest>.json` (exclusive create, private permissions), separate sanitized manifest containing the digest and operation/deployment/request IDs. Verify the raw digest on write and every later read; never overwrite bytes or “repair” the source. Runtime `/tmp` is ephemeral and cannot be called a durable archive. The owner must separately approve a private response-artifact sink/transfer and retention period (proposed ≤7 days raw for review, then delete raw and keep sanitized hash/clock/decision record). No new paid storage, public bucket, repository fixture or public raw log is authorized here. Never retain URL query/API keys, authorization/cookie headers, complete request headers, env, exception objects or authentication frames. If there is no reviewed bounded private raw-evidence sink, STOP before calling Helius.

Onchain facts do not prove project legitimacy, token name/ticker, stock backing/ownership, pair, reward settings, distributions, payout flow, holder returns/ROI, signer control, market price, liquidity or trading safety. No such inference is allowed from this observation. Provider access/retention/publication terms and quota remain owner-review gates; independent chain provenance does not waive Helius service terms. Permission for one private capture is not publication or production reliance permission.

## Founder checklist — separate Helius approval

- [ ] Accept the authentic connectivity result; keep public RPC and LIVE_APPROVAL OFF/null.
- [ ] Approve exact mint above, one `getAccountInfo`, finalized/jsonParsed, no retry/extra requests.
- [ ] Confirm isolated SCOUT key/account quota, one-call cost and private retention rights without exposing credentials.
- [ ] Review capture artifact/hash, deadline/size/identity/decoder tests, private write-once raw sink and ≤7-day deletion plan.
- [ ] Approve new operation ID, exact protected runtime/deployment and short UTC window; record invocation consumed before traffic.
- [ ] Explicitly authorize that **one Helius POST only**, independently of Neon approval. Stop on any uncertainty.
- [ ] Verify raw SHA-256, clocks, actual slot and honest result; remove disposable execution and raw sink on schedule. No public activation, enrollment, merge or automatic follow-up.

**Current status: NOT RUN.** This PR supplies no credential reader/capture executable, raw response or genuine current mint fact. All test packets are explicitly synthetic/local.
