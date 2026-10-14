# Pair Intelligence — Day 1 backend contract and feasibility

Issue [#38](https://github.com/fuzzysniper/scout-stonk-intel/issues/38), coordinated with [frontend #39](https://github.com/fuzzysniper/scout-stonk-intel/issues/39#issuecomment-6172745825). This is a bounded read-only discovery API, not a returns engine. Based on latest main at task start, 70bd6ca56e12efec51d821dc0726e88390cba020, including UX V2.1 and inactive staging authentication. No frontend component, existing API, calculator, collector, allowlist, history, archive, scheduler or workflow changes.

## What was actually verified

At 2026-10-14 16:02–16:18 UTC, bounded public HTTPS GETs read the official [developer guide](https://www.stonkfun.xyz/developers), [OpenAPI 2.0.0 document](https://www.stonkfun.xyz/api/public/v1/openapi.json), quote registry, two catalog pages, five selected aggregate reward identities and one existing-provider DexScreener token response. No wallet-specific endpoint, holder payout rows, RPC balance, transaction preparation, launch or signing call was made.

The quote registry returned **587 entries**, including several different STONK mints. Its selectBy=mint and symbolAmbiguous flags explicitly rule out ticker-only identity. The discovery probe using limit=20 actually returned pageSize=25: v1 catalog pagination uses **page/pageSize**, not limit. Correct page 2 was confirmed. Provider totals changed from 178026 during initial inspection to 178028 during local API proof. These are dated provider-reported totals, not a verified count of unique StonkFun-only contracts or an exhaustive SCOUT dataset. Pagination is not an atomic snapshot.

Five examples matched exact quote mint/symbol between registry, catalog and the official v2 reward aggregate:

| Quote | Exact quote mint | Example token / reward mint | Registry decimals |
| --- | --- | --- | --- |
| NVDAX | Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh | SI / DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP | 8 |
| STONK | 6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx | KNOTS / 8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS | 9 |
| GLDX | Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re | GP / HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ | 8 |
| SPCXX | Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8 | OWL / 68AGsjomsgTtiTaDhF6XGCeVJDnFeh415ngYYgVxGzns | 8 |
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | BANKROLL / B32ocrADBEo1XHsGVnxqP81SaK2NiZkQmmAoTnmT8Ybu | 6 |

GLDX/SPCXX existence is therefore a dated official-provider identity observation, not an assumed ticker match. Registry names such as NVIDIA, GOLD or SPACEX do **not** establish equity/metal ownership, legal redemption rights, issuer backing, exchange-hour equivalence or exposure to an underlying security. STONK also appears as a standard-mode token paired with SPYX; KNOTS is a different reward-mode token paired with the specific STONK mint above.

[Evidence JSON](evidence/pair-discovery-2026-10-14.json) records actual selected identities, provider times, capture completion times, SHA-256 byte revisions and source URLs. A byte revision is not a Git commit, signature or independent chain proof. Evidence is documentary; the application does not read it as a static catalog/fallback.

## Source selection, rights and practical limits

The official guide recommends v2 where available: the new mode checks use v2 rewards, while registry/token discovery still uses documented v1 endpoints. Existing deprecated-v1 collectors and seven-token allowlist are unchanged. The guide documents no API key, no paid tiers and per-IP limits: v1 reads 300/minute, ordinary v2 reads 240/minute; 429 carries Retry-After. CDN cache hits do not reach the origin. Actual inspected v2 headers confirmed a 240 limit.

No explicit redistribution license, service-level agreement or historical-market-data entitlement was found in the inspected guide/OpenAPI info. Public/no-key access is not proof of unrestricted commercial licensing. Broad redistribution, crawling, archival backfill or any additional/paid provider requires owner review of current terms; none is introduced here. Docs describe launch/claim write APIs too: they are not called or exposed by SCOUT discovery.

The current catalog reports USD price, liquidity and 24h volume for some records, with a response generatedAt. It does **not** provide individual market observation timestamps. These values are passed only as nullable **reported snapshots**, in USD. A missing value, string-valued field, negative/nonfinite number or missing liquidity is never zero. No priceNative, historical return, slippage or synchronized benchmark is inferred from them.

The one DexScreener response returned 30 SI pools: different venues and quote mints (NVDAX, SOL, USDC) and different liquidity. Its SI/NVDAX Raydium pool address differed from the catalog LaunchLab pool address. The higher-liquidity pool is not automatically the official launch pool or the same quote pair. Its pairCreatedAt is pool creation time, not a price observation time. The existing /api/token behavior is preserved; the new discovery API makes **no DexScreener calls** and does not join its highest-liquidity result into a group.

## GET /api/pairs — exact typed contract for #39

Canonical public types: [lib/pairs-contract.ts](../lib/pairs-contract.ts). They contain types only and can be imported with import type by a later frontend adapter without including server/provider code. No current frontend is changed.

GET accepts **only one optional quoteMint**. It must be an exact valid Solana mint, without trimming/aliases. This filters the same cached bounded sample, not a new wider catalog query. Search, sort, page, limit, URLs and other repeated/unknown query parameters are rejected before source access. There is no polling, browser-origin provider fetch or arbitrary upstream URL.

| HTTP | Body / meaning |
| --- | --- |
| 200 | PairCatalog; status available or degraded. Discovery exists; incomplete coverage remains explicit. |
| 400 | {error: string}; invalid/repeated/unknown parameters, no source access. |
| 404 | PairCatalogNotFound; same dataset/groups shape, status not_found and error string, only after registry verification proves the supplied mint absent from that response. |
| 503 | PairCatalog; status unavailable, groups empty, sourceStatus unavailable, dataFetchedAt null; optional sanitized error string. No deployment-file or curated fallback pretending to be a catalog. |
| 405 | Next.js rejects unsupported methods; no POST handler. |

Every data/error response is Cache-Control: no-store (framework method rejection is outside the exported GET). Schema version **1** is the Day 1 contract. Consumers must check HTTP status and then source/coverage states; 200 does not mean complete research or financial comparisons.

### Root and dataset

PairCatalog contains schemaVersion:1, status, groups and dataset. Root status becomes degraded for partial provider/mode verification or unavailable/degraded tracked-history enrichment; independent catalog sourceStatus remains available/cached when only history failed.

Dataset fields:
- sourceStatus: available (new fully validated catalog read), cached (usable warm cache), degraded (partial pages/mode verification/rejected records), unavailable (no usable registry/page).
- fetchedAt: API calculation/response time. dataFetchedAt: completion time of the usable catalog read; warm cache does not advance it.
- scope: bounded_official_catalog. This is not exhaustive ecosystem, allowlist membership or a return ranking.
- coverage: complete=false and atomic=false always; registryCount; pagesFetched; pageLimit=2; pageSize=25; recordsReceived; tokensReturned; rejectedRecords; providerReportedTotal:number|null; modeChecks; modeCheckLimit=12; historyScope=tracked_sample; sorted warnings:string[].
- sources: successfully validated PairSource objects with exact source URL, fetchedAt (retrieval completion), providerGeneratedAt (response envelope time), revision (SHA-256 of received bytes).
- history: sourceStatus/source/revision/dataFetchedAt of the unchanged GitHub history reader. Its byte revision identifies real recorded observations independently of catalog discovery.

Provider totals apply to the fetched upstream pages, not the locally filtered quote or returned unique records. RecordsReceived includes duplicates/rejected input; tokensReturned counts actual output after filtering. RegistryCount is the whole bounded registry response count; default groups include only quotes matched by returned catalog tokens. A registry quote without a token in these pages is not proof no such token exists.

### Group

PairGroup fields: quoteMint:string; quoteSymbol:string; quoteName:string; decimals:number; tokenProgram:string; symbolAmbiguous:boolean; source:string; verifiedAt:string; provenance:PairSource; verification; availability; tokens:PairToken[].

A group key is quoteMint. verifiedAt is the registry retrieval/validation time, not a blockchain observation or price timestamp. verification is official_registry_catalog_match when matched records exist, or **official_registry_only** for a requested known quote with no records in this bounded sample. Availability is tokens_in_bounded_sample or no_tokens_in_bounded_sample. The latter is an honest empty group, not an assertion of ecosystem absence. Default groups sort by quote symbol then exact mint, using a fixed English locale; same ticker groups stay distinct.

### Token

PairToken fields and semantics:
- mint/symbol/name/poolMint/quoteMint/quoteSymbol: official catalog identity matched to exact registry quote. poolMint preserves the existing SCOUT name for the provider pool **account address**, not an asset mint or automatically the post-graduation trading pool.
- source/verifiedAt/provenance: that catalog page's URL and retrieval time. User-supplied names/symbols never choose source URLs; frontend must render text safely.
- mode: catalog-reported reward or standard.
- rewardModeVerified:boolean: true **only** when a bounded v2 read matches token mint, reward mode and exact quote mint/symbol. False does not mean standard; inspect modeVerification.
- modeVerification: verified_reward, verified_standard, catalog_only, source_unavailable, identity_mismatch. Unchecked records remain catalog_only; standard requires matching standard endpoint/null rewards. Conflicting verified ledger identities are excluded from output and counted as rejected records, so identity_mismatch is reserved by the type rather than a trusted group member.
- rewardSource: successful mode read provenance or null. A verified reward mode can have awaiting/null totals: it does not promise payout activity or individually attributable rewards.
- observationCount:number|null and lastObservedAt:string|null: unchanged normalizer's dated unique recorded-point count/time for exact currently tracked identities. A successful tracked read with no points has count0 and null time. Untracked or unusable/identity-mismatched history has both null; no invented history for discovered tokens.
- historyStatus: recorded, no_history, invalid_data, not_tracked, source_unavailable or identity_mismatch. historyFreshness: fresh, stale or unavailable; existing three-hour observation threshold is reused independently of retrieval time. historyIssues:string[] preserves the unchanged normalizer's quality warnings. Malformed existing records remain invalid_data, not an empty history; no parseable points means count=null in that state. Counts are not guarantees of comparable counters, coverage, rewards or returns.
- market: status reported_snapshot or unavailable; unit USD; priceUsd/liquidityUsd/volume24hUsd:number|null; observedAt:null; providerGeneratedAt:string. This is envelope time only. Do not relabel USD values as quote-token units or call them live.
- comparisonStatus: unavailable. comparisons contains quoteRelativePriceReturn:null, quoteAssetBenchmarkReturn:null, holderAttributedReward:null and reason missing_synchronized_price_history_and_holder_entitlement. There are no scores, alpha, APY, investment returns, reward rankings or trading prompts.

Tokens sort by symbol then mint, independently of provider order, payout totals or financial value. The upstream **marketCap** sort selects only the bounded discovery pages and is disclosed as a sampling bias, not a SCOUT investment ranking. Mode checks prioritize existing tracked identities for continuity, then mint order, up to12; this selection is not popularity, return quality or a universal leaderboard.

## Return feasibility matrix

Confidence below refers to dated source/schema evidence, never confidence in profit. A newly fetched quote asset label is not a historical benchmark.

| Input / output | Inspected source and granularity | Available history | Conditions before use | Unknown / Day 1 decision | Confidence |
| --- | --- | --- | --- | --- | --- |
| Base-token price | Official v1 catalog/detail current USD snapshot; existing DexScreener current pools/priceNative | No documented base-token candle endpoint in inspected official OpenAPI; no local price series | Exact mint, venue/pool lineage, quote unit, observed timestamp and synchronized start/end | Envelope time is not tick time; no historical base price endpoints verified. Relative price return=null | High for current reported fields; unavailable for history |
| Quote-asset benchmark price | Registry mint/decimals/token program; DexScreener only inspected for SI pools | No synchronized quote-price series collected or verified | Exact issued-token mint, units, source/times and trading calendar; do not substitute underlying equity/metal ticker | Legal economic equivalence/backing not established; benchmark return=null | High for provider identity; unavailable for historical benchmark |
| Pool/launch holder distributions | Official v2 rewards/holders aggregate schema; five reward identity GETs; unchanged GitHub seven-token counters | Genuine sparse cumulative snapshots for seven tracked tokens; v2 lifetime totals do not themselves supply past boundaries | Matching mint/quote/source, valid monotonic counters, actual timestamps, existing gap/reset/freshness gates | Existing Radar/history gates stay authoritative. Aggregate delivered distributions are neither entitlement nor ROI | High for schema and dated aggregate records; coverage remains limited |
| Holder-attributable reward | Guide documents v2 rewards/payouts rows: signature, holder, assetMint, amountRaw, amountTokens?, createdAt; no rows/wallets requested | Documented cursor ledger, not verified exhaustive historical holdings/entitlement | Deduplicate per recipient/asset, validate raw decimals and actual delivery; account for base payouts, Community Mode quote-holder shares and StandardV2 fee-recipient routing | Delivered payouts may document receipts later; they do not reconstruct every holder's balance/eligibility. Modeled holder reward=null | Documented schema only; historical attribution unproven |
| Individual investment return | No acquisition, disposal, cost basis or fee source read | None | Real holdings/exposure through time, acquisition/sale prices, delivered attributable rewards, transfer taxes, venue fees and quote conversion | Cannot divide total distributed tokens by holderCount or combine them with price change. Individual ROI withheld | Unavailable |
| Liquidity / slippage | Some official current liquidityUsd; DexScreener reports differing pools/quotes | No verified historical reserve/fee/depth series | Exact pool, reserves at target time, trade size/direction, fee model, graduation lineage | Liquidity USD is a snapshot, not an executable slippage estimate. No slippage metric or historical liquidity result | Medium for reported current snapshot; unavailable for history/slippage |

For a future pure price calculation, quote-relative price change would require actual base-in-quote prices at both synchronized boundaries; the benchmark requires that exact quote asset's price in an explicitly chosen common unit. Combining USD base and quote prices from different dates/pools is not valid. Holder-attributed rewards require an independent entitlement/delivery model first. Fees/taxes and inconsistent/unknown timing must withhold combined results. No such math is added here, and no equation is evaluated on fabricated or backfilled inputs.

## Bounds, failure behavior and security

One warm instance refreshes on demand, cache300s, no background tasks. Refresh makes at most15 official GETs: one registry (max1024 entries/512KiB), up to2 token pages (max25 rows/128KiB each), up to12 v2 mode checks (32KiB each, concurrency3). A shared1MiB body budget, fatal UTF-8 parsing, finite identifiers/fields, 3s per-request timeout and 10s total deadline bound headers/body even in test transports that ignore abort. The existing history reader runs concurrently, retains its own2MiB/cache/backoff/safeguards and makes at most one additional GET per refresh when necessary. Partial pages/mode checks remain explicit; first registry/page failure yields503. No retry loop, collection, new provider, paid dependency, secret, filesystem fallback or data write is added.

Failed refresh backs off at least60s. A429 aborts remaining work and honors numeric Retry-After up to3600s; no same-request retry. A missing header uses60s; a present larger/nonstandard delay pauses refresh for the life of that instance rather than shortening the requested wait. Completed usable partial data can remain degraded in the five-minute cache, preserving original times. An unsupported-delay pause has no API reset/bypass; cold starts still have independent state. No last-success stale-data fallback exists after expiry/failure. Header Age/Source-Age over300s or malformed age fails the read; envelope timestamps older than3h or over60s future also fail. Cached evidence cannot cross that envelope-age boundary. An unavailable mode endpoint does not turn catalog identity into verified reward mode.

There is no distributed cache/rate limiter: high cold-start or multi-instance traffic can multiply these per-instance limits and share a provider IP quota. URLs/page sizes are fixed; users cannot amplify crawling via parameters. At steady warm traffic, max180 official GETs/hour per instance plus existing history, not a global cost/rate guarantee. Hosting/provider outages, IP throttling, provider poisoning or mutable pagination can still produce partial/incomplete discovery. Registry/catalog/mode checks are one provider's consistent claims, not independent chain proof. Branch/data trust and all existing methodology remain unchanged.

## Local proof, review and rollback

The production-built local API returned HTTP200/no-store at **2026-10-14T16:17:09.914Z**: 36 groups, 50 records from2 pages, registry587, reported catalog total178028,12 attempted mode checks and zero rejected identity rows. One mode check (SI) was unavailable during that read, so overall sourceStatus remained **degraded** and rewardModeVerified=false for SI. A separate dated genuine SI reward capture matched NVDAX; it does not retroactively validate the failed runtime read or establish its failure cause. Final built verification at 16:30:37.133Z again returned50 records/36 groups with the provider total now178031. Several mode checks remained unavailable and the response correctly stayed degraded; original history quality issues were retained. Both captures and their genuine source times are preserved in evidence. No response or screenshot was filled with synthetic figures. Every historical return/holder entitlement value was null. Malformed query400, verified NVDAX filter200, unknown registry mint404, POST405 were checked. API proof used Node24 --use-env-proxy solely for the managed environment's egress; app checks use Node20. No proxy library/code or public preview endpoint is added.

Tests use explicitly synthetic temporary/provider fixtures only, covering bounds/coalescing/cache, 429/deadlines/hanging bodies, invalid JSON/UTF8/transport ages, stale/future envelope times, partial pages, forged quotes/pools/networks/programs, duplicate/conflicting identities, same-symbol different mints, reward/standard verification, awaiting totals, untracked/empty/unavailable/stale/mismatched history, missing price/entitlement inputs, null return results, zero/missing current fields, deterministic output and API400/404/503 recovery. All required npm/type/lint/build/archive results and exact counts are attached to the review PR.

No UI changes; screenshots do not apply. Hosted API/production propagation, frontend integration, licensing review for broader use, independent chain reconciliation, historical market feeds, holdings attribution and any later pilot remain unproven or separately approved work. No merge, deployment, permission change, scheduler/gate activation, wallet/treasury access, trade or tokenomics change occurs here.

Rollback is a reviewed revert removing the new route, three pair modules/types, backend tests/harness additions and documentary evidence. No schema migration, credential/resource deletion, collector change or historical data rollback is needed. Preserve every real observation/archive/claim and all later genuine commits. Existing APIs/UI remain usable before/after rollback.

### Final command results — 2026-10-14 UTC

Node20.20.2/npm11.9.0; local built-source proof uses Node24.19.0 with the managed proxy flag, without application proxy changes.

| Command | Exact result |
| --- | --- |
| npm ci | Exit0;336 packages, root lockfile unchanged |
| npm test | Exit0;151 app/policy/backend/frontend JS +15 adapter JS +62 Python; no failures/skips |
| npx tsc --noEmit | Exit0; no diagnostics |
| npm run lint | Exit0; no warnings/errors |
| npm run build | Exit0; production compile/types,9/9 static pages; new /api/pairs dynamic route |
| bash scripts/archive-tool.sh check origin/main | Exit0; append-only/reproduction passed |
| npm run archive:dry-run | Exit0; genuine pinned replay/idempotency/tamper checks, working archive unchanged |
| git diff --check | Exit0 |
| Built local GET/filter/error/method probes | HTTP200/200/400/404/405, no-store on GET responses; real catalog data and unavailable historical returns |

Before rebase,83 existing protected files equaled starting main. Main merged frontend PR40 during backend work; this branch was rebased onto441255292f220c61cae651c04b831713d1c403c6, combining only the shared test registrations. All85 existing protected app/components/API/math/data/allowlist/archive/workflow/scheduler/backend-script/dependency/config files equal that rebased main. New route/modules/docs/backend tests and their runner registration are the only scope. The initial typecheck was started prematurely during installation and failed on the unavailable default npm cache; it was rerun after installation with the workspace cache and passed. Existing npm ESLint deprecation and Next edge-runtime/static-generation warnings remain. Several official mode reads were unusable in real local proof: they remain explicitly source_unavailable/degraded, not a fabricated verified status or a hidden test failure.

Day2 consumer note after PR40 merged: its placeholder coverage:string and optional numeric observationCount differ from the canonical object coverage and number|null count here. Its current ASCII/80-character identity filter can omit genuine Unicode-symbol/longer-name catalog records (backend text bounds32/160). A separately reviewed frontend adapter must validate/align these shapes before enabling /api/pairs; do not cast away the mismatch, fabricate counts or silently claim full coverage. Current UI remains on its unchanged tracked sample.
