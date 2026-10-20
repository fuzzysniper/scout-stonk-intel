> Current activation scope: [one protected USDC POST canary](../../../docs/ops/usdc-canary/ROLLOUT.md), pending owner review/release. Public GET and other mints remain disabled. No live observation is claimed by local fixtures.

# Same-origin mint API / isolated Helius protocol — #108

**Historical #108 report.** The inactive native production implementation, real PostgreSQL tests,
current contract, retention distinction and remaining approval gates are now documented in
[PRODUCTION.md](PRODUCTION.md) for #111. The route remains OFF; the statements below about
no real adapter/credential loader describe #108, not the current source tree.

Based on main `e9cc7a9d06841d7b9cba9f66bad9968eaf75f14f`, including merged #106 and #104. This is an executable offline implementation and **hard-disabled production route**. No RPC request, account login, secret lookup/copy/rotation, purchase, deployment or infrastructure change was performed. The prior task's single failed public RPC attempt was not repeated.

## Endpoint and compatibility

`GET /api/mint-facts?mint=<exact>` returns the existing `MintFactsV1` JSON body, without an envelope or wire/type change. The contract was [published early to Agent A #107](https://github.com/fuzzysniper/scout-stonk-intel/issues/107#issuecomment-6252159724). Agent A owns consumer integration; no consumer or UI test files change here.

| HTTP | Body |
| --- | --- |
| 200 | `verified_onchain_mint_at_slot` or `unsupported_extensions` — **synthetic offline handler only in this PR** |
| 400 | `unavailable/invalid_mint` — missing, duplicate/noncanonical query, extra params, invalid exact key, body declaration or oversized URL |
| 403 | `unavailable/access_denied` — origin/host/fetch-metadata or forbidden header |
| 404 | `not_a_supported_mint_account` — not found, wrong owner, not initialized/mint |
| 405 | `unavailable/access_denied`, `Allow: GET` for other Next-supported methods |
| 429 | `unavailable/admission_limited` or `rate_limited`; bounded numeric `Retry-After` 1–3600 seconds, never an automatic retry |
| 502 | malformed RPC/schema/encoding/oversized response or invalid store reply |
| 503 | disabled, missing/unavailable shared store or trusted identity, circuit, source/clock failure, upstream outage/auth rejection |
| 504 | timeout/abort — no facts |

The shipped route accepts only the fixed canonical origin `https://scout.storkcoin.xyz`. Unknown preview/local origins fail 403; synthetic fixtures specify a trusted test origin separately. There is no derivation of trusted origin from caller Host/forwarding headers or unreviewed Vercel environment values. A future approved preview/local policy must be explicit. A valid canonical request returns **503 unavailable/disabled in every environment**. Query/environment flags, a Helius key or even NODE_ENV=test cannot enable the exported production route. It reads no credential, calls no store/transport, and never invokes the development public-RPC reader.

The mint is exactly 32-byte base58 without trim, ticker resolution or case folding. Only canonical `?mint=<base58>` is accepted: no duplicated/encoded aliases, extra filters, targets, URLs, keys, fragments or batches. No body is consumed. Requests are bounded to 256 URL bytes and 16 KiB headers. Origin/fetch-site and Host/forwarded-host/proto disagreement are rejected. Other IP headers are ignored, never forwarded or used as identity. GET without Origin is allowed for direct read clients but is **not** authenticated by that omission. The enabled protocol still requires an independently trusted hosting identity and global admission. Browser/CDN caches are prohibited with private/no-store headers; no CORS is enabled. Framework-level malformed requests/unmatched paths remain outside this route's JSON contract.

All server paths use Next's `server-only` marker. The API has no client secret/config payload. The only shared engine edit adds a strict internal two-host source allowlist; public captured decoding is explicitly pinned to its original public-mainnet host. The new Helius path uses the **actual sanitized `mainnet.helius-rpc.com`** host. The public dev reader and default outputs remain unchanged. No source contract changes are required: `endpointHost` was already a string. Public recorded decoding must not be used to falsely label a future Helius capture as public RPC.

## Executable boundary

`testing.ts` creates the only enabled constructor with a mandatory `SYNTHETIC_OFFLINE_ONLY` label, injected transport, opaque prepared Helius target, HMAC key, store, identity resolver and clock. Every request rechecks NODE_ENV=test; any production/development invocation is disabled. There is no native-fetch fallback, live fixture flag or environment secret loader. All successful output is `acquisition: synthetic_fixture`. Tests are **format/state-machine proofs, not observed mint facts** and cannot be used as genuine successful-source browser screenshots.

`prepareIsolatedHeliusTarget(scopedKey)` is a **pure future configuration adapter**. It validates a key-shaped trusted server input, fixes HTTPS host/root path and the sole api-key parameter, and keeps the full URL in an opaque WeakMap. Serializing the handle reveals only provider/host. It does not load a key or verify account/plan/access. It accepts neither arbitrary URLs nor caller parameters. Proposed future secret names are `SCOUT_MINT_HELIUS_API_KEY` and a separate `SCOUT_MINT_ADMISSION_HMAC_KEY`; neither is read by this implementation. No fallback to the former bot's HELIUS_API_KEY/HELIUS_API_TOKEN, Render config, browser, NEXT_PUBLIC variable or GitHub Actions secret exists.

`rpc.ts` actually constructs and processes the Helius read protocol through the injected transport: one JSON-RPC 2.0 getAccountInfo, jsonParsed/finalized, exact mint and fenced numeric ID. It passes original SPL/Token-2022 data through the existing strict decoder. Five-second total deadline includes stream/hash, 65,536-byte decoded response, 16 KiB headers, no redirects/retries/cookies/forwarded request headers. Date/Age and host/elapsed clocks fail closed; UTF-8 errors/BOM cannot normalize away hash input. Errors never emit upstream URL/body/message/stack. Only the sanitized host, original receipt/check clocks, null slotTime, context slot and body hash are returned. Source receipt freshness does not independently prove chain-tip freshness, consensus, project identity, equity, quote/rewards or holder returns. Authority and extension safeguards remain those of #106.

## Atomic distributed boundary — no production service configured

`AtomicMintStore.transact` is mandatory and must be backed by a **durable serializable atomic service** spanning all Vercel workers/regions. No adapter/service or store credential is configured here. Absence, timeout, corrupted state/replies or ambiguous admission fails closed **before RPC**. No local-memory fallback is implemented. Local stopped state is only an additional guard.

`referenceTransaction` is a bounded **synthetic reference model**, not deployed distributed storage. Tests put two independent handlers against one serialized reference service to verify protocol behavior. This does not establish real hosted-store safety. A separately selected adapter must prove the same behavior against its real transactions, outages, failover and permissions before activation.

1. `admit`: validate policy/version/clock/state, prune expired serving data, charge global/client request admission, return authenticated unexpired cache or atomically precharge RPC budgets and issue one fenced lease. A lost admission reply never authorizes a request; counts are never refunded.
2. `complete`: require the current lease ID, mint and expiry, safe nonregressing source slot, original receipt/expiry and bounded cache. Commit before returning facts. Missing/ambiguous completion withholds facts and never retries the RPC.
3. `fail/stop`: open a durable terminal circuit and remove cached projections. 401/403/429/503, network/clock/schema/hash failure, cache corruption and source slot regression cannot serve stale fallback. No timed automatic retry/reset endpoint exists.
4. **Expired lease is terminal**, not permission to reclaim/overlap a potentially still-running request. Late results are fenced out. Preserve policy, sequence, highest slot and circuit across restarts; changing process or day does not erase them. Recovery needs operator investigation and a separately reviewed policy epoch, not deletion on startup.

| Proposed ceiling (not an approved service quota) | Limit |
| --- | --- |
| All reads, including cache hits, per global UTC-minute window | 30 |
| Reads per trusted client per UTC-minute window | 6 |
| Outbound attempts per UTC-minute / UTC-day | 3 / 120 |
| Minimum time between outbound starts / global in-flight | 10 seconds / 1 |
| RPC deadline / store deadline / lease | 5 seconds / 250 ms / 7 seconds |
| Cache serving TTL / max projections / per entry | 30 seconds / 8 / 16 KiB |
| Client identity retention / max buckets | 120 seconds / 128 |

These are fixed UTC windows, not rolling-window guarantees. At window boundaries bursts remain constrained by the global lease and 10s spacing. Every outbound attempt is conservatively charged, including negative/error/uncertain results. No time-based circuit reset or source fallback. Negative account results release the lease without a cached claim and still advance validated context admission. Previously captured cache may have an earlier slot than another mint checked later: it retains its original clock/slot and is served only within its original TTL; acquisition of a lower new slot is rejected.

Client identity must come from a separately authenticated hosting boundary, not arbitrary `x-forwarded-for`, `x-real-ip`, `forwarded`, Origin, cookies or query. A real adapter must document how the edge strips/overwrites caller input and supplies verified context; absent/ambiguous identity is denied. IPs are canonicalized (including IPv4-mapped IPv6), domain-separated HMACs become private bucket IDs, and raw IPs are not stored/returned. A separate domain-separated MAC binds cache JSON, mint, policy, slot, checked time and expiry. The store never contains the RPC key/full URL/raw upstream metadata/body. MACs authenticate engine-issued projections, not Solana consensus.

Store-native expiry must enforce erasure of cached projections at 30 seconds and client IDs at 120 seconds; atomic checks also reject expiration/future clocks. The reference model prunes lazily and is not a claim of hosted time-based erasure. Durable budget/fencing/circuit state must not expire with the cache. No response/cache access renews checkedAt or expiry; only evaluatedAt advances. Trusted store time and host time must be monitored (future/over-1s divergence fails); no stale-on-error mode. Adapter-level access controls and command validation are required, with no direct browser/store access.

## Existing paid account, source options and cost review

Use the founder's **existing paid Helius account** with a distinct SCOUT project/key where supported. No new subscription/provider signup, top-up, paid add-on or billing action is proposed. The former gem-bot-webhook Render bot's shutdown, positions, schedules/webhooks and old-key revocation are **not verified** and are a separate owner operation; do not access or change its secrets/config.

Public sources checked 2026-10-18 (documentation only; zero RPC/account calls):

- [Helius standard credit table](https://www.helius.dev/docs/billing/credits): standard RPC is listed at one credit, with other method classes priced separately. Thus the proposed 120 attempts/UTC-day implies at most **3,720 standard-call credits in a 31-day month**, conditional on current method pricing. A 20-cold-read/day scenario is 620 credits/month; cache hits consume no RPC credit. These are estimates, not a verified plan entitlement, invoice or promise of $0 additional cost. Account remaining quota, shared bot usage, autoscaling and contractual billing are unknown.
- [Helius official RPC endpoint example](https://www.helius.dev/blog/faster-getprogramaccounts) identifies the mainnet Helius host/API-key pattern. Its broad discovery example is **not** implemented; this adapter only constructs getAccountInfo.
- [Helius terms](https://www.helius.dev/terms), public update Sep 28, 2026: review the existing account's applicable agreement/order form, permitted consumer use, credential/data handling, rate/capacity and fee terms. No legal or redistribution permission is inferred from public documentation.

| Source option | Decision |
| --- | --- |
| Existing paid Helius account, fresh isolated SCOUT credential | Sole proposed production provider; owner plan/terms/quota and distributed adapter review required. |
| Solana shared public endpoint | Existing dev-only prototype remains unchanged, previous attempt failed, no fallback/retry/production reliance. |
| A second paid provider/account | Not pursued; no purchase/signup recommendation or automatic failover. |

No proprietary reward/catalog API or associated publication gate is bypassed. Chain account facts do not establish stock/gold backing, shareholder rights, token branding, quote mode, rewards or ROI.

## Future owner checklist — DO NOT EXECUTE as part of this PR

1. In the existing Helius account, the owner reviews current subscription, remaining/shared credits and applicable terms **without exposing the old bot key**. Approve a conservative method/attempt allowance and incremental hosting/store cost. Do not initiate billing, enable autoscaling or alter the bot to free quota in this task.
2. After separate authorization, the owner creates a new SCOUT-only project/key if the plan supports it, confirms isolation/restrictions and records only nonsecret project/key identifiers in the approval. Do not call it a provider-enforced read-only key unless the provider actually supports/enforces that scope; read-only behavior here is enforced by fixed application protocol.
3. Future Vercel setup: select the SCOUT project → Settings → Environment Variables; add the **new** key as sensitive server-only `SCOUT_MINT_HELIUS_API_KEY`, and independent high-entropy `SCOUT_MINT_ADMISSION_HMAC_KEY` (32–128 allowed characters). Set only the individually approved environment; do not inherit into previews or use NEXT_PUBLIC/GitHub Actions. Configure separate least-privilege store credentials only after a concrete adapter is approved. Do not paste keys into chat, PRs, screenshots, shell arguments or logs. This PR does not read these names; adding variables alone cannot enable it.
4. Review an actual distributed-store adapter and hosting-authenticated identity/origin policy, including native TTL, bounded storage, atomic quota/lease/circuit semantics, failover, restart/corrupt state and uncertain-write tests across workers. Review privacy/retention and expected read/store/hosting charges. No approved adapter means no activation.
5. Review all automatic observability paths: Helius auth is in the query string, so disable/redact full outbound URLs in APM, proxy/access logs, exceptions and telemetry; retain only aggregate counters/reason codes/latency and sanitized host. No source bodies, raw IPs, request credentials or upstream headers in logs. Agree source lag/finality/clock monitoring and extension limitations.
6. A separate activation PR must introduce a reviewed real credential loader/native transport and correct live acquisition provenance, wire the shared store and trusted identity, and replace the hard-disabled route explicitly. Do not reuse synthetic/development provenance as production evidence or add a query/env-only bypass. Coordinate any additive source classification with Agent A; no contract change is made here.
7. Separately authorize **one** serial nonproduction Helius getAccountInfo capture using the new isolated key and one previously reviewed exact mint; one method, finalized/jsonParsed, ≤5s/65,536 bytes, no redirects/retries. Stop on error/rate/clock/schema mismatch. No getSlot/getBlockTime, provider crawl or second credential. Record sanitized host, exact mint, slot, start/receipt time, HTTP clock/unknown, SHA-256 and parser result; keep URL/key out. Agree bounded private original-response retention/rights before capturing; never replace a failed capture with a mock. No capture is authorized or executed today.
8. Before production activation, verify that authentic capture privately and replay it with honest recorded labeling, then run real-source consumer/browser/iPhone QA with Agent A. These gates remain **unmet**. Confirm no reward, stock ownership, holder-return or consensus assurance is inferred. Human approval precedes any deployment/config change.

Rollback: revert the new route/server/tests and the single test-runner line, plus the internal decoder host option if needed. No production data, active keys or infrastructure require rollback. An unknown route must remain an honest unavailable consumer state. Do not revoke or modify the former bot key. For a future live rollout, disable the route first; only a separately authorized owner action may revoke the isolated SCOUT key or clear durable state.

Run `bash tests/onchain-api/run.sh` for offline integration/security tests. Full checks and outstanding gates are recorded in [validation.md](validation.md).
