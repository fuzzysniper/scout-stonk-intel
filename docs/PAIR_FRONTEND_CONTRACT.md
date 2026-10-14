# Issue #39 → #38: Day 1 frontend integration

Frontend base: `70bd6ca56e12efec51d821dc0726e88390cba020` (latest main verified October 14, 2026). Backend/API/lib/data are unchanged. This document belongs to #39; it is a proposed consumer contract, not a claim that #38 already implements it.

## Current reads

Home receives the existing validated `trackedTokens()` allowlist through server props. Six verified quote mints and seven tracked memecoins are labeled **Limited sample**; no catalog discovery, ticker guessing, or client-side provider calls. NVDAX is the initial selection only when present in that allowlist. Chips sort by symbol/mint, tokens by symbol/mint, never payout totals.

One `/api/radar?sort=name` and one `/api/status` request on entry or manual refresh. Pair selection and case-insensitive symbol/name/mint search filter locally. No polling. Requests abort on unmount or after 15 seconds; Radar renders independently of slow Health. Health is diagnostic, never a substitute for metric readiness. Mint-linked dossiers bypass explorer reads.

`app/pairs/adapter.ts` joins Radar by **token mint + quote mint + quote symbol** against allowlisted identity. No join means no observed count, date, or amount. A failed source retains only previously verified identities; it never promotes counts to live coverage. Radar response time and dataset retrieval time stay inside source scope; actual observation timestamps stay on rows.

`flowReading()` is the existing frontend reader of backend gates, not a new calculation: matched-period amount, otherwise supported 24h-window amount, otherwise supported point change, otherwise withheld. Source degraded/unavailable and stale records withhold amounts. Actual interval appears with any amount. Matched current/previous values appear only behind Evidence when `signals.status === 'available'` and Radar status is available. No cross-token ranking or synchronized return comparison is implied by sharing a quote mint.

## #38 group boundary

The exported `PairCatalog` type and `fromCatalog()` accept the proposed group structure:

```ts
type PairCatalog = {
  groups: {
    quoteMint: string;
    quoteSymbol: string;
    verifiedAt: string; // ISO timestamp of identity verification, not price freshness
    source: string;     // HTTPS identity/catalog provenance
    tokens: {
      mint: string;
      symbol: string;
      name: string;
      quoteMint: string;
      quoteSymbol: string;
      rewardModeVerified: boolean;
      observationCount?: number;
      lastObservedAt?: string | null;
      comparisonStatus?: string;
    }[];
  }[];
  dataset: {
    sourceStatus: string;
    fetchedAt: string;
    scope: string;
    coverage: string;
  };
};
```

Group identity must be verified by #38; `fromCatalog()` cannot independently prove provenance. It filters malformed identity/date/source, mixed quote tokens and duplicate token mints. Counts must be nonnegative safe integers; invalid dates/counts become null. Tickers are labels, never keys. `rewardModeVerified: false` must remain unverified. `comparisonStatus` alone **cannot** unlock any metric; catalog rows carry `radar: null` until a documented metric gate is connected.

Day 2 integration: agree #38's final types, coverage shape and bounds; validate its JSON at the fetch boundary, retain the explicit scope/failure/freshness semantics, then replace the allowlist grouping with `fromCatalog()`. No `/api/pairs` fetch exists in this branch. Do not interpret a failed catalog read as an empty ecosystem or retain a successful source state after refresh failure. Empty groups require an explicit no-verified-tokens state. Preserve duplicate ticker/different quote-mint groups as distinct chips and show mint identity.

## Metrics withheld pending confirmed sources

Liquidity/market context, historical quote-relative return and holder-attributable rewards are explicitly Unavailable. Existing generic dossier market data is not reused: its highest-liquidity DexScreener pool need not be the verified StonkFun quote pair.

Before connecting a market metric, #38 must supply exact base/quote/pool identity, unit, source, fetchedAt/observedAt, validity status and coverage. Historical returns additionally need synchronized start/end price observations. Modeled attributable rewards need holdings/entitlement and valuation assumptions. Nullable values must remain Unavailable, never zero; freshness or attribution failures must withhold them. No universal rank, total-market coverage, APR, yield or holder profit may be inferred from distributed pool counters.

## Preserved surfaces / rollback

`/brief`, `/radar`, `/research`, `/status`, immutable archive routes, query-based token dossier/OG metadata, STORK footer and disclosures remain available. Roll back by reverting this frontend commit; no data migration, deployment or backend rollback is needed.
