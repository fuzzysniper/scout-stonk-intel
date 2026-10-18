# Independent Solana mint facts — #102

Portable read-only prototype, isolated from the consumer UI and the three dated StonkFun examples. No runtime dependencies, SDK, secrets, transactions, wallets, metadata fetches or provider catalog/reward data. Standard Fetch, AbortController, TextDecoder, Web Crypto and bigint are required. The standalone TypeScript build uses no Node types. This is a reviewable engine, not an activated product or production RPC integration.

## Contract and interpretation

Public types: [contract.ts](contract.ts). Entry point: [index.ts](index.ts).

```ts
import { createMintFactsReader, type MintFactsV1 } from "./lib/onchain-mint";
const reader = createMintFactsReader(); // always disabled by default; zero requests
const result: MintFactsV1 = await reader.readMint(exactMint);
```

`createMintFactsReader({ developmentFeasibility: true })` permits the fixed public mainnet endpoint **only on a server with NODE_ENV=development**. No production profile, environment endpoint/key, caller URL, API route, startup request, background polling or production consumer import exists. Importing/types/decoding do not make requests. Do not invoke this profile to repeat this task's stopped feasibility session.

| Status | Meaning |
| --- | --- |
| `verified_onchain_mint_at_slot` | The fixed RPC reported an initialized account owned by original SPL Token or Token-2022, parsed as a mint, at the returned context slot of a finalized request. Supported layout only. |
| `unsupported_extensions` | Base mint fields parsed, but extensions/layout need review. Both issuance and freeze interpretations require extension review. |
| `not_a_supported_mint_account` | Not found, wrong owner, token account/multisig or uninitialized. Never means “fake”. |
| `unavailable` | Disabled, invalid input, admission/budget, transport, clock, stale or malformed source. No facts; fixed redacted reason code. |

Consumer questions answered narrowly:

- **Does this address exist as a mint?** A supported initialized mint was reported at a slot, not proof of project legitimacy or name/ticker identity.
- **Supply?** `supply.raw` is canonical u64 integer text. `decimalAmount` is an exact fixed-decimal string, never a float, price, circulating supply or market cap. Zero is genuine zero. Decimals 0–255 are supported.
- **Can new tokens be issued / accounts frozen?** Base authority `present` or `absent` is a technical fact. It does not establish signer control, multisig membership, all extension behavior or a safety grade. Missing authorities fail, never become absent. Unreviewed extensions override both interpretations.
- **What remains unknown?** Branding, backing, underlying shares, pair/quote relationship, rights, rewards, holder payout/ROI, liquidity and value. A stock-linked token never implies ownership of shares. This engine does not infer a stock link in the first place.

Exact input is case-sensitive base58 decoding to 32 bytes, without trimming, ticker resolution or candidate enrollment. `getAccountInfo` does not echo the queried key: identity is bound by the fixed request's exact mint and matching response ID, **not** independently attested by the account body. A dishonest RPC can lie. There is no genesis check, validator replay, quorum, binary-account decode or cryptographic account proof. These would require a separately approved protocol; no extra methods are silently called.

## Official formats and extension limits

Audited official Agave source on 2026-10-18. These are **Git blob hashes**, not commit hashes. The linked master pages may change; the blob identities pin the reviewed contents.

| Official source | Reviewed blob SHA-1 | Relevant behavior |
| --- | --- | --- |
| [parse_token.rs](https://github.com/anza-xyz/agave/blob/master/account-decoder/src/parse_token.rs) | `3eb87ee1e75e2d5e2d8149e26bea4105c9056cb1` | Mint owner parser, initialized/base fields, extension projection; `get_extension_types().unwrap_or_default()` can hide a failed type-list decode. |
| [token.rs](https://github.com/anza-xyz/agave/blob/master/account-decoder-client-types/src/token.rs) | `3b6809e79cce254a24a25c917759cb9f56ecda0e` | camelCase fields, nullable authorities, supply text, omitted empty extensions, extension/state tags, MetadataPointer state. |
| [parse_account_data.rs](https://github.com/anza-xyz/agave/blob/master/account-decoder/src/parse_account_data.rs) | `b29f220ce2910f69b3f94955bf947d5e4712747e` | Owner-program mapping, `spl-token` / `spl-token-2022`, actual account data `space`. |

Original SPL Token requires the exact owner program and 82-byte mint layout, no extensions. Token-2022 base 82-byte mints are supported. Only a **MetadataPointer-only 234-byte** layout is reviewed (166-byte extended base + 4-byte TLV header + 64-byte payload), with exact nullable public keys. A pointer is an address, never an instruction to fetch a URI or adopt branding. Larger accounts with empty/omitted extensions remain unreviewed because the node can suppress extension-type parse failure. Different sizes, mixed/complex/risk-bearing or future extensions never earn reassuring interpretations. Duplicate or malformed entries fail closed. Arbitrary extension state is not projected; metadata names, symbols, URLs and extra fields cannot leak into output. No claim of full Token-2022 support or independent binary extension verification is made.

## Clocks, finality and retention

`source.contextSlot` is a positive safe integer rendered as text. Commitment is **requested finalized**, not a response-provided attestation. Unexpected commitment/epoch fields, wrong RPC version/ID, unsafe slots and source slot regressions fail. `slotTime` is always null: getAccountInfo provides neither block time nor account last-change time. There is no second getBlockTime/getSlot/getGenesisHash call.

`requestStartedAt`, `responseReceivedAt` and `checkedAt` are acquisition host UTC clocks; `checkedAt` remains the original receipt time on cache hits. `evaluatedAt` advances without renewing the source. Optional HTTP Date is separate transport context, not chain time. Invalid/future/stale HTTP Date or excessive Age is rejected; missing Date stays explicitly unknown. Capture clocks preserve up to microseconds. A source older than 60 seconds is rejected without facts, rather than served as a stale fallback. The declared `freshness` vocabulary allows stale for compatibility, but this implementation only emits fresh accepted facts or `unavailable/stale_source`.

**Fresh here means bounded acquisition age, not independently proven chain currency.** A freshly received replay with a plausible HTTP Date and no earlier higher slot cannot be detected by this one-method protocol. No absolute “current chain” claim is justified from fixtures or an untrusted RPC. Source assurance is always `rpc_reported_not_independently_replayed`.

`decodeCapturedMintResponse` has no I/O and requires explicit `captureKind: recorded_response | synthetic_fixture`. All successful results populate `source.acquisition`; neither replay nor a mock is newly acquired evidence. Callers are responsible for honest capture labeling. No authentic onchain response was captured in this task. Output hash is SHA-256 of UTF-8 response text; transport rejects invalid UTF-8. No full live response is retained by the reader. Memory-only cache holds at most three successful projections with a **30-second serving TTL**. Expiration is lazy on access/eviction; idle expired projections may remain in process memory until access, a circuit failure or process exit. No disk/history or financial publication pipeline is added. Production retention/erasure policy needs separate review.

## Request/security boundary

- Only `https://api.mainnet-beta.solana.com/`, POST JSON-RPC 2.0, single `getAccountInfo`, one exact mint, `encoding=jsonParsed`, `commitment=finalized`. No batches, redirects, cookies, credentials, referrer, caller-selected host, methods, query, URL or environment secret lookup.
- One in-flight request, at least 10 seconds between starts, **maximum three attempts per process shared across factory instances**. Count before I/O, including errors. No retries. A process restart is not authorization for another founder feasibility session; operator session accounting remains required.
- Five-second total deadline covers transport, stream and asynchronous hashing. It returns even when an injected transport ignores abort; timeout opens a terminal circuit, preventing later overlap with a lingering operation. Native Fetch receives AbortSignal. Stream byte bound is 65,536, header bound 16,384, extension count 32, JSON nesting 16 and nodes 5,000. Compression cannot evade the decoded-stream bound.
- Strict schema/duplicate-key parser, including escaped key aliases; required keys, owner/parser agreement, initialized mint and nullable authorities. Known numeric integer fields require canonical unsigned u64 lexemes **before** JS rounding, then field-specific bounds; a tiny fractional tail cannot silently become an integer. Canonical raw supply ≤u64 max. Irrelevant u64 rentEpoch/lamports are never used or emitted (JSON numbers there may be unsafe); source context and supply cannot lose integer precision.
- 401/403/429/503, other non-200, network, timeout, invalid/malformed/stale source and slot regression stop the circuit and clear cached facts. No Retry-After retry. Legitimate not-found/non-mint responses consume admission but are not transport failures. Errors contain fixed codes, no upstream messages, bodies, stack, credential or arbitrary metadata echo.
- Wall and monotonic clocks reject backwards movement or >1s elapsed divergence, including before cache access. No stale-on-error response. No public route exists, so there is no caller Origin/IP surface or claim of distributed abuse protection.

`testing.ts` is a mandatory injected-transport synthetic seam, not re-exported by the public entry. Tests never use native Fetch for enabled requests. Internal modules assume trusted application code: they are not a sandbox against a malicious server importer. Production must use the public disabled boundary and must not import test/internal constructors.

## Development evidence and owner activation gate

[development-feasibility.json](docs/development-feasibility.json) records **one** bounded normal-proxy public-mainnet RPC attempt on 2026-10-18. It failed at the network boundary in this environment, with no HTTP response/body/slot/hash. The session stopped immediately; there were no alternate endpoints, retries, bypasses or additional RPC methods. No current facts or authentic response fixtures are claimed. Positive test inputs are explicitly **synthetic format fixtures**, not invented observations.

Official [Solana RPC guidance](https://solana.com/docs/references/clusters) states shared public RPC is not intended for production. Onchain facts are independent of StonkFun catalog/rewards, but that does not waive a chosen RPC service's acceptable-use terms or permit unrelated provider redistribution.

Owner approval for a future, separate production integration must cover:

1. A production-suitable fixed HTTPS endpoint, terms/allowed use, credentials kept server-only, quota and hosting/cost review. No activation by changing this dev flag.
2. A hosting-owned route with strict input/body/Origin/CSRF policy as applicable; trusted proxy/client-IP handling; per-client and **distributed global** adaptive admission/concurrency and cache bounds across replicas. The per-process dev limiter is insufficient for production.
3. Trusted clock monitoring, source lag/finality assurance policy, extension support audit, bounded memory/log retention, redaction, outages/rate limits and a reviewed real-response verification session with a fresh authorized budget.
4. Actual browser QA of unknown/error/extension states in Agent A #103, provenance/clock presentation and no project, equity, pair/reward/ROI inference. This PR includes no consumer wiring or UI screenshots because no UI changes.
5. Explicit human review of schema/security and an approval PR for any live integration. No merge, deployment or activation is authorized by this prototype.

Rollback: revert this isolated module and the single `tests/run.sh` invocation. No production imports, APIs, data, collector, scheduler, workflows, Cloudflare, credentials, allowlist or source-rights settings were changed, so no infrastructure rollback is required.

Run `bash lib/onchain-mint/test.sh` for deterministic offline parser/security/transport tests and standalone dependency-free compilation. Full repository validation is recorded in [validation.md](docs/validation.md).
