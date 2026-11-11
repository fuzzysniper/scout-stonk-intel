# V4 Helius-first Solana fact projection — issue #212

Code/review only, source **OFF**. Based on main `5c6e36fef0fc15acb07c954566a3975cb77fc102`. No live observation, provider request, credential access, runtime route, storage, source-manifest change or production authorization is included. All positive test data is invented offline format data, including the test exercising the `recorded_response` label. No authentic capture is claimed.

## Usable seam for B #213 and C #214

`lib/v4-solana-facts/index.ts` exports:

- `readHeliusFacts(mint: unknown)`: always unavailable/disabled (invalid exact inputs return invalid_mint). There is no enable option, env read, key, request builder, transport injection, fallback or hidden network operation. Runtime attempt budget is **zero**. No old production/canary/lookup reader is imported.
- `projectHeliusCapture(requestedMint, capture: unknown)`: pure, strict offline projection, never acquisition. Returns `unfarmd-solana-facts/1` with `sourceGo:false`, exact `requestedMint`, `state: observed|unknown|unavailable|unsupported`, `observations`, `checks`, `provenance`, `providerError`, `unknowns`, `limitations`.
- Versioned types in `contract.ts`. `HeliusCapture` describes a **local capture envelope**, not a new Helius wire API. `getAccountInfo/jsonParsed` response parsing reuses the audited pure `lib/onchain-mint/decoder.ts`, policy and strict JSON/clock/address validators without changing them. There are no runtime dependencies beyond those pure imports.

B may join only on exact chain + case-sensitive requested mint and admitted clocks; never tickers. C must use runtime `readHeliusFacts`, which supplies grey unavailable facts today, not the fixture projection as a live fallback. No integration with V3 or public UI is added. A separately reviewed runtime adapter must supply authenticated transport provenance; this offline capture API cannot do so and deliberately has no `production_rpc` kind.

### Source facts versus classifications

`observations` holds parsed initialized-mint fields, original program/owner, raw supply/decimals/exact fixed-decimal amount, base authority addresses/states and the bounded extension projection. No float arithmetic, circulating supply, price, wallet grouping, metadata URL fetch, project identity or market inference. Existing decoder interpretations are removed from this source object.

`checks` is a separate deterministic projection. Each check has a state, color, reason/explanation and paths into admitted source fields. There is **no overall score, safety verdict or recommendation**.

| Check | Admitted interpretation |
| --- | --- |
| Account | Green: supported initialized mint reported by the RPC, not project legitimacy. |
| Supply | Green: exact raw u64 and decimals parsed, not a favorable supply level or circulating capitalization. Zero is zero. |
| Mint authority | Red when present: base permission to issue additional units. Green when absent: only that base permission is absent. Signer control is not verified. |
| Freeze authority | Red when present: base permission to freeze accounts. Green when absent: only that base permission is absent. |
| Extensions | Green for supported extension-free base layout; yellow only for the decoder's reviewed exact metadata-pointer-only layout. A pointer authenticates no branding. |
| Stale / unsupported / unavailable | Grey; no positive interpretation or admitted evidence-field paths. |

**Green means THIS CHECK passed, never rug-proof or safe.** Token-2022 remains distinct from original SPL Token. Unreviewed/hidden/mixed extensions make **all checks grey/unsupported**, including apparently absent base permissions. Base fields may remain in `observations` solely for audit; their presence is not permission to bypass grey checks. No reassuring interpretation of arbitrary transfer fees/hooks/delegates/pausing or future extensions.

Always-unknown checks explicitly cover holder concentration, liquidity/LP locks and issuer/name legitimacy. `getTokenLargestAccounts` is not implemented: token accounts are not distinct beneficial owners, account coverage is incomplete, and clustering/insider attribution would require additional evidence.

### Provenance and clocks

The source label `helius-solana-rpc` describes the captured target protocol, **not independently verified provider provenance**. Captures require the exact fixed host `mainnet.helius-rpc.com`, mainnet, one exact requested mint, positive request ID, `getAccountInfo`, `jsonParsed` and requested `finalized` commitment; extra fields/URLs/keys/methods are rejected. The result binds to the original request, since this RPC account response does not echo the mint. A malicious/mislabeled RPC or capture can lie; no signature, chain replay, genesis check, quorum or account proof is claimed.

Provenance records `synthetic_fixture|recorded_response`, `providerAuthentication:not_verified_offline`, original request/receipt/evaluation UTC, requested finality, context slot, optional HTTP Date, and SHA-256 of original UTF-8 JSON. The hash detects byte changes; it does not authenticate an endpoint or cover the whole capture envelope. `slotTime:null` remains explicit: a context slot is not creation time, last modification time or block time.

Admission requires valid monotone capture clocks, at most **5 seconds** request-to-receipt, and at most **60 seconds** receipt-to-evaluation, preserving microseconds. Missing/zero/unsafe slots, future clocks and malformed fields reject without observations. Stale input produces unknown/grey with `stale_source`; re-evaluation never renews the acquisition clock. This bounds capture age, **not chain currency**: a freshly delivered old/replayed account cannot be detected from this one response. The caller must supply a trustworthy evaluation clock in a future runtime; arbitrary caller-supplied capture clocks are not production proof.

HTTP 401/403/429 and other failures retain only numeric status and a fixed application reason, no body. Valid RPC errors retain a small allowlist of numeric codes (-32700/-32600/-32601/-32602/-32603/-32000/-32005/429); unknown codes are null. Node-unhealthy -32005 is not mislabeled rate limiting. Provider messages/data, URLs, headers and exceptions never appear in output. Malformed/duplicate JSON, response-ID mismatch and ambiguous success+error reject. Response bytes <=65,536; inherited strict-parser depth/node/extension bounds apply. No stale-on-error or substitute sample facts.

## Owner gates before any future runtime acquisition — NO-GO now

1. **Commercial rights/retention:** separately record current Helius terms, the actual account/plan entitlements and allowed private/commercial display, derived-use, raw/projection/hash retention, deletion/backup obligations, attribution and any limitations. Paid account access alone does not establish these rights. No terms review or source authorization is newly asserted by this code-only task; the owner must resolve applicable rights, not assume all onchain RPC data has unrestricted provider reuse.
2. **Independent approval:** exact code SHA, fixed mainnet Helius origin, one purpose-scoped DATA credential, approved acquisition period, one user action/exact mint, explicit provider/account cost/credit budget and retention approval. Never reuse or rearm old one-shot proof budgets, preflight, keys, lookup gate or legacy source approval. No keys in chat/git/browser/logs. Owner configures a future server-only env binding directly in the approved host; this module does not read it.
3. **Narrow server-only adapter:** separately implement and review a fixed one-method read-only request (no caller URL/headers/method, batches, writes, wallet or transactions), server-secret handling/redaction, fail-closed unset/false gate, one in-flight globally fenced acquisition, durable pre-I/O credit reservations and hard caps, 5-second total timeout/abort, decoded byte bound, no redirects, no retries, no provider fallback. Cache must be bounded, keyed by exact mint + network + method/finality, original timestamps/hash preserved, at most 30-second serving TTL and <=60-second acquisition age. Missing key/gate must return before any I/O; expiry/circuit clears cache. Today's zero-attempt boundary is not a distributed live-budget implementation.
4. **Hosting/security:** user-triggered same-origin boundary, trusted hosting/client admission, abuse controls, clocks/slot regression and provider cache-age checks, no startup/prefetch/history-triggered acquisition, minimal memory/log retention, no persistent storage until separately approved. Test real bounded transport failure modes and key/URL redaction offline before owner-approved acquisition. No existing production path is changed by this PR.
5. **Authentic proof:** only after separate source/cost/runtime approval, one budgeted authentic request with retained sanitized evidence, no synthetic-to-live promotion; independently verify actual Helius acquisition metadata. A successful mock says nothing about production access, freshness, rights, plan metering or eventual deployment.

## Verification and rollback

Run `bash tests/v4-solana-facts/run.sh` (included in root `npm test`). Tests use synthetic local fixtures and fault injection only: every authority combination, exact decimals/u64/zero, Token Program distinction, metadata pointer, unreviewed Token-2022, wrong exact mint identity, malformed/duplicate JSON, wrong owner/uninitialized/nonmint, stale/future/no-slot, 429/503/errors, redaction, fake production labels, no fallback and permanent OFF. Import-graph and subprocess guards prohibit env-key reads, fetch/socket/timer activation at import or OFF read.

No UI change: no screenshots needed. Existing V3 freeze/source manifests, app routes, collector data/workflows, auth/STOP and `lib/onchain-mint/**` bytes are unchanged. Revert only this isolated module, scoped tests/docs and the single root test invocation. No infrastructure or source rollback exists or is needed. This DRAFT is not merge or activation permission.

### Executed validation — 2026-10-28

Node 24.19.0; PostgreSQL 17.11 only for the existing disposable-local regression harness (synthetic database contents, no hosted database). New adapter tests use no SQL or network.

| Command | Result |
| --- | --- |
| `npm ci --cache /tmp/scout212-npm-cache` | Exit 0; unchanged lockfile. Default cache initially failed with filesystem ENOENT; local writable cache resolved setup. |
| `bash tests/v4-solana-facts/run.sh` | Exit 0; 70 passed, zero failures/skips. |
| `SCOUT_TEST_PG_BIN=... SCOUT_TEST_PG_SHARE=... npm test` | Final complete run exit 0; 1,420 Node + 107 Python tests passed; zero failures/skips. |
| `npx --no-install tsc --noEmit` / `npm run lint` / `npm run build` | All exit 0. |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; append-only/reproduction check passed. |
| Diff of app, legacy mint-facts, workflows, data, scheduler, experiments, scripts and package files against main | Empty. |

Earlier root attempts exposed (1) missing historical object `2d3322bae0a5db001ae63b32eff614e5cd733d5b`, fetched without changing code/refs; (2) one intermittent existing wall-clock quota assertion at `tests/onchain-api/production.test.mjs:162` (200 vs expected429), which had passed on the preceding attempt and passed unchanged on the final complete run. The test uses real UTC minute counters; no quota code, timeout, assertion, clock or production control was altered. No precise causal trace is claimed for that intermittent failure. These outcomes are disclosed rather than treating incomplete runs as passes. CI status belongs to the exact DRAFT PR head, not this local validation record.
