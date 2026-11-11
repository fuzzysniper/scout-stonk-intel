# DEX Screener reuse / rights review — 28 October 2026

No market API, Helius, hosted SQL or production endpoint was called. Only official
documentation was read. This is source qualification, not legal clearance.

## Existing path audited, unchanged

`app/api/token/route.ts` exposes a GET with a `mint` query. It trims and validates
a 32-byte Solana address, calls the fixed legacy
`https://api.dexscreener.com/latest/dex/tokens/{mint}`, requests Next revalidation
after60s, sets8s timeout, then selects one highest-reported-liquidity matching
Solana pair. Non-OK statuses and exceptions become502. Attribution is a
DexScreener string, optional provider pair link and highest-pool note. No source
request was made to test that route, cache or public protection.

Material limitations: no streamed response byte bound or shared admission; raw
JSON cast; Number coercion can turn null/empty fields into zero; upstream URL is
not constrained in its output; no provider observation timestamp/raw body hash;
quote-side matches can attach the base token's change/volume/market-cap context;
sorting a bounded catalog does not establish total liquidity or circulation.
FetchedAt is transport completion only. Revalidate60 is a framework cache policy,
not verified vendor TTL or freshness/license. Framework stale/cache behavior and
production API Authentication remain unverified. These findings are documented,
not silently fixed in this source-off contract PR: no existing route is altered.
Later route hardening/retirement needs its own reviewed backward-compatibility,
privacy/auth/admission and owner release decision.

## Reuse instead of another feed

The existing `lib/trader-pulse/decoder.ts` + `adapter.ts` already provide the
chain-specific documented token-pairs path, exact base/quote/pool validation,
original-byte hashing and stable sample selection. V4 reuses those semantics.
It does not add a fetcher or another price provider. It does not reinterpret
legacy endpoint bytes as the token-pairs array: original endpoint shapes differ.

The existing PRIVATE adapter is OFF without trusted owner source review; bounded
research allows at most3 serial requests per instance, >=2s spacing,4s deadline,
256KiB body/1,024 chunks/64 pools,16KiB response headers, no redirects, omitted
credentials, constrained fixed HTTPS endpoint, no retries/fallback. Failures
remain unavailable;429 honors cooldown and malformed/unbounded delay stops.
This is not a durable distributed public limiter. Recreating instances is not a
production quota control. This PR invokes it only with injected SYNTHETIC
responses and retains all existing implementation/tests unchanged. Public/live
plumbing requires separately approved global admission, abuse protection and
provider quota/credits/cost review. New V4 runtime traffic budget is **zero**.

## Official docs and launch blockers

[API reference](https://docs.dexscreener.com/api/reference) lists the chain-specific
token-pairs endpoint. Prior reviewed repo evidence records300requests/minute;
today's rendered reference embeds an external OpenAPI asset for its numeric
limits, which was not independently downloaded here. Treat300 as previously
advertised, not current entitlement, remaining quota or an authorization to call.
No completeness/pagination, source update timestamp, window alignment or licensed
TTL was verified. Current source observation clocks stay unknown. Attribution
links are reconstructed to the exact DEX Screener Solana pool; no arbitrary
provider link is followed or returned.

[API terms](https://docs.dexscreener.com/api/api-terms-and-conditions), displayed
last updated18August2023 and reviewed28October2026, allow commercial/noncommercial
use subject to restrictions: limited revocable license, no directly competing
product, constraints on making API services available to third parties, and
provider ownership of services/data. Commercial-use language does not establish
UNFARMD's competition, redistribution, retention, derived-signal or private-note
rights. The reviewed terms give no confirmed cache/backup/deletion or attribution
schedule for this product. [General terms](https://docs.dexscreener.com/privacy/terms-and-conditions)
also disclaim data currency/accuracy and third-party content legitimacy. No
permission request was sent, contract accepted, subscription changed or billing
initiated. All financial publication and source acquisition remain OFF.

## Unsent request for owner review

> We are reviewing UNFARMD, an exact-Solana-mint research tool with independent
> RPC mint facts and privately owner-authored thesis notes. May we show a bounded
> selected pool's reported liquidity,24h volume, base price/change and reported
> creation date, attributed/linked to DEX Screener, without trading execution or
> claims of whole-token coverage? Please confirm permitted private and eventual
> commercial display under competition/redistribution clauses; applicable plan
> and shared quotas; required attribution; allowed cache, raw hash/receipt,
> screenshot, derived-fact and private snapshot-reference retention; backups,
> deletion/recovery and downstream restrictions. What exact source/window update
> clocks, quote orientation, completeness/pagination and cache guarantees exist?
> We will keep traffic/publication disabled pending owner/provider review.

Owner must review intended use, obtain required written permission, pin scope
and expiry, approve finite source qualification and quota/cost/retention limits,
then separately approve any production code release. Public access alone is not
a redistribution license. Neither source-off fixtures nor a citation establish
live source evidence, issuer legitimacy or source rights.
