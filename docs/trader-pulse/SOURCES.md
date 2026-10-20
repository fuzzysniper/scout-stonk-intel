# Source rights and launch readiness — 20 October 2026

**Decision: public financial figures/signals and live acquisition remain disabled. No provider permission is claimed. No market API request, crawl, secret, paid service or third-party contact was used for this PR.** Official documentation was read; live origin access, quota headers, market accuracy and coverage were not tested. Previous repo research records403 responses; those are dated intermediary/provider-ambiguous failures, not proof of today's availability.

## Official contract and costs

[DEX Screener API reference](https://docs.dexscreener.com/api/reference) documents chain-specific `/token-pairs/v1/{chainId}/{tokenAddress}` for pool lookup and `/tokens/v1/{chainId}/{tokenAddresses}` for token-address lookup. The reference advertises300 requests/minute for these lookups; that is an advertised ceiling, **not this deployment's verified entitlement or remaining quota**. Pulse selects one token-pairs request, never search, multi-token fanout, legacy chain-ambiguous lookup or an alternate endpoint after failure. The retrieved current reference links a GitBook-hosted OpenAPI asset; that asset could not be independently retrieved in this session. No endpoint has a verified completeness/pagination guarantee or trade-window observation timestamp here. Do not call the returned list all Solana markets. Nullable fields, provider aggregation, cache lag and quote-only coverage remain source limitations. No API key/purchase is added; free access alone is not a rights grant.

## Rights blocker (not legal clearance)

[Official API terms](https://docs.dexscreener.com/api/api-terms-and-conditions), page last updated August18,2023 and reviewed October20,2026: §1 restricts direct competing products; §2 constrains making API services available to third parties; §3 retains provider ownership of data/services; §4 permits commercial use subject to the other limits and mentions free/paid offerings. **Commercial permission does not resolve competition or redistribution.** SCOUT's proposed trader signals could overlap the restricted use. No launch authorization or financial-data license has been established. The reviewed terms do not give SCOUT a confirmed cache/retention, attribution, raw redistribution or derived-signal permission. Owner/legal/provider review is required. No price/quota/billing guarantees were measured.

## Unsent permission request for owner review

> Subject: SCOUT exact-token market context and derived observations — permission request
>
> We are reviewing a read-only Solana research feature using exact token-pair lookups, not trading execution. Before any launch, may SCOUT display selected pool identity, reported USD liquidity and transaction-count summaries, and compute 5m-versus-1h count rates/imbalance and reported pool age? Please confirm whether this use is permitted under the competition/redistribution clauses, including free versus paid consumer access. What written permission/plan is required for public display, derivative summaries and a nonpublic research prototype? Please specify mandatory attribution/linking, in-memory and persisted cache durations, raw-response/hash retention, audit fixtures/screenshots, deletion duties and redistribution restrictions. What source calculation/update timestamps, window alignment/orientation definitions, quote-side coverage, pagination/truncation guarantees and per-client/account shared request quotas are supported? We will keep this feature disabled pending review and will not treat request retrieval time as market time.

This draft has **not been sent**. No addresses/accounts were contacted and no entity/terms were accepted on the founder's behalf.

## Owner decisions required before any launch

- [ ] Owner reviews the exact product use against §1–4 and obtains appropriate written provider approval/terms. Record scope, permission reference, expiry and attribution/retention limits. A boolean or generic commercial-use statement is insufficient.
- [ ] Separately authorize a private, finite source-qualification observation: exact mint(s), ≤3 requests, serial ≥2s apart, ≤24h approval expiry, purpose and cost/quota acceptance. Constructor approval is a trusted assertion, not an automatic enrollment or license. No calls were made under a synthetic test permission.
- [ ] Validate actual origin access/content, base-versus-quote orientation, advertised quota behavior, incomplete sample handling and response time with that approved observation. Stop after any uncertain failure; no fallback or denial circumvention.
- [ ] Establish permissible source/window clock semantics. Current adapter always returns null provider/trade/window clocks; **price impulse cannot be enabled** by finding HTTP Date or a fresh retrieval. Review any future source-clock contract and its tests separately.
- [ ] Review public numerical/derived disclosure and required attribution. Implement genuinely shared production admission, abuse controls and any approved retention only in a new reviewed change. Per-instance private counters are not sufficient for public scale. Do not flip the current route's policy bits in isolation.
- [ ] Owner authorizes normal reviewed rollout separately. No canary, Helius, Neon, collector or consumer integration is needed to merge this inert engine. No merge/deploy was performed here.

Raw bytes exist only transiently during a private observation; they are hashed, not stored. Returned internal reports can contain derived provider values and must remain private until rights are qualified. This PR adds no persistence/public financial response. No cache TTL is claimed licensed; a later retention/publication workflow requires an explicit decision.
