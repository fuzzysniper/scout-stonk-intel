# V4 facts and private thesis format — Issue #213

Code-only, source OFF; no UI/API, persistence, export, credentials or live observation.
Base main `5c6e36fef0fc15acb07c954566a3975cb77fc102`. Separate from unmerged V3
#200/#210 and A #212/C #214. No existing file or guard is changed. Combining V4
with V3 later needs an independent reviewed integration; these files do not give
V3's byte-freeze an exception.

## Typed boundaries for A and C

`lib/unfarmd-intelligence/contract.ts` exports browser-safe **types only**;
runtime projection/journal modules are server-only. `index.ts` exposes the offline
functions. No function reads a secret, fetches, saves, imports a saved journal,
or accepts an enable flag. `INTELLIGENCE_POLICY` keeps acquisition, financial
publication and storage false. `sourceOffSnapshot(exactMint, evaluatedMs)` returns
grey/null cards and no invented source, pool, slot or market figure. This is the
only appropriate shipping default; `publication: withheld` is not a data license.

`unfarmd-intelligence/1` contains exact `{chain: solana, mint}`, independent
sources, scoped pools and fact cards. `narrative` and `overallVerdict` are always
null. Each card separates a typed reported **fact** from a deterministic per-check
**assessment**; owner prose cannot populate either. Green means only the narrow
technical check passed, red an active base authority, yellow reviewed Token-2022
context requires caution, grey unknown/stale/not assessed. There is no overall
safe/rug-proof/buy score, healthy-volume conclusion or issuer legitimacy badge.

`projectMarketReceipt` reuses the original-byte Pulse decoder, not the lossy
legacy `/api/token` JSON. Exact identities, chain, quote pin, pool URL, bounded
catalog, finite/null fields, duplicate keys/pools and original SHA-256 are checked.
Only the highest-reported-liquidity eligible **base** pool in that returned sample
is selected, with original deterministic ASCII tie-break. Every fact carries its
pool scope; quote-only matches produce no borrowed price, volume or price change.
Pool liquidity is not token-wide liquidity. Mint supply is not circulating supply;
no market-cap calculation or holder concentration is supplied. Null stays unknown;
provided zero stays zero. Price remains the provider's decimal string.

DEX has no qualified trade/window observation clock here: `observedAt: null`,
`observationTime: unknown`, no slot. `fetchedAt` records the receipt clock;
`requestStartedAt` and raw response hash remain separate. All DEX assessments
therefore stay grey even when retrieval is recent. Pool age explicitly means
elapsed seconds **at fetch** since the provider's reported creation date, not
token age or a current onchain observation. No trading inference is created.

`projectHeliusCapture` is a **pure offline bridge**, not A's live transport. It
reuses the existing strict MintFacts decoder for original jsonParsed mint bytes,
finalized slot, raw integer supply/program/authorities and Token-2022 uncertainty.
It admits only `synthetic_fixture` or `recorded_response`, never production RPC.
Its fixed Helius designation is a capture assertion, explicitly
`capture_origin_not_independently_attested`; it cannot prove the original request
reached Helius. getAccountInfo does not echo the account address: offline requested
mint metadata is also a capture assertion, not independent request/response binding.
No live observation has occurred. All block times remain unknown.
Agent A's future authenticated acquisition must preserve its own source gates and
independently reviewed transport, not relabel an offline receipt as production.

`joinEvidence` accepts only frozen process-admitted projections for the exact mint
and chain, at most one of each provider. A deserialized object/type cast is not
admission. Independent receipt skew must be <=15s; microseconds are preserved in
that comparison. Original per-source slot/URL/hash/clocks remain available.
Retrieval expiry is 60s (inclusive boundary); at reevaluation, expired values are
withheld/grey without rewriting capture clocks or receipt identity. Snapshot ID
hashes the deterministic current projection, not a provider signature or license.
An unknown market clock is never repaired by Helius's finalized slot.

## Private thesis format; no saved journal

`unfarmd-thesis/1` is an offline append/replay format, separate from source cards
and V3 `unfarmd-journal/1`. It records exact CA/chain, pseudonymous owner scope and
journal IDs, original `created_at`, each `recorded_at`, sequence, prior hash,
explicit change kind and optional snapshot hash references (empty array if none).
Creation/revision retains full owner thesis, optional invalidation/contradictions;
an update adds a separate timestamped note. Revisions explicitly supersede the
last thesis, never silently replace its original bytes. Text is plain owner
prose, not evidence, HTML or a verified fact. References are opaque links, not
proof of the content or authority of a snapshot.

Bounds:64 events,128KiB packet,2,000-character thesis/note,1,000-character optional
invalidation/contradictions,8 snapshot references/event. Saturation rejects append,
never rolls away history. Exact schema, UTC millisecond clocks, quotas, duplicate
keys, unknown fields, scope swaps, reordered/duplicate events, forks, incorrect
supersession, time regression, future dates and stale expected heads fail closed.

Replay without independent trust says **self_consistent_only**, not authenticated
or immutable. An attacker who rewrites all text/hashes can forge self-consistency.
A separately retained trusted prefix detects rollback/truncation/rewrite; this PR
stores no such anchor. Compare-and-append is a pure model, not durable concurrent
CAS or cross-device synchronization. Owner IDs/timestamps are claims, not login
or trusted server receipt clocks. No encryption, account, backup, export/import
feature or persistent history is implemented or promised.

Redaction/deletion are explicit append-only **requests**, with
`privacyExecution: not_performed`; old plaintext remains present. Deletion request
is terminal for the local model. Never call this erasure. Future privacy review
must provide an out-of-band deletion path even when a journal quota is full,
logical visibility rules, per-owner authentication, access isolation, encryption
and key deletion, backup/PITR/restore quarantine, audit-metadata minimization,
deletion receipts and explicit recovery/retention limits. Immutable retention and
erasure conflict: agree what plaintext, hashes and backups may survive. Unsalted
hashes of predictable private text can leak guesses; never publish these chains.

## Verification and later owner gates

`NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/unfarmd-intelligence/run.sh`
runs deterministic explicitly SYNTHETIC tests. Existing full Python regression
discovery invokes the same runner; dedicated read-only PR CI adds no dispatch,
schedule, key, service or source activation. Root/native security tests remain
unchanged. Four colors in fixtures are format/check semantics, not observed coins.

Before any source/UI integration: approve exact contract/security review and
separately resolve [rights and legacy limitations](market-rights-and-legacy-audit.md),
actual provider access/identity/clock/quota verification, shared production
admission and error/circuit behavior. Before storage: explicitly approve privacy,
authentication, access controls, encryption/recovery/deletion/retention/costs and
trusted-head/CAS design. Then approve implementation/release separately. No
existing lookup, legacy canary, STOP, SQL, counter, collector or source gate is
changed. Rollback removes only this additive module/tests/docs/workflow; no data,
stored notes, admission state or credentials exist to migrate/reset.
