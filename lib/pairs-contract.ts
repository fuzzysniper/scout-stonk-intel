/** Public Day 1 contract. Types only: safe for a later frontend adapter to import. */
export type PairSourceStatus = 'available' | 'cached' | 'degraded' | 'unavailable';
export type PairSource = {
 source: string; fetchedAt: string; providerGeneratedAt: string; revision: string;
};
export type PairToken = {
 mint: string; symbol: string; name: string; poolMint: string;
 quoteMint: string; quoteSymbol: string;
 source: string; verifiedAt: string; provenance: PairSource;
 mode: 'reward' | 'standard';
 rewardModeVerified: boolean;
 modeVerification: 'verified_reward' | 'verified_standard' | 'catalog_only' | 'source_unavailable' | 'identity_mismatch';
 rewardSource: PairSource | null;
 observationCount: number | null; lastObservedAt: string | null;
 historyStatus: 'recorded' | 'no_history' | 'invalid_data' | 'not_tracked' | 'source_unavailable' | 'identity_mismatch';
 historyFreshness: 'fresh' | 'stale' | 'unavailable'; historyIssues: string[];
 market: {
  status: 'reported_snapshot' | 'unavailable'; unit: 'USD';
  priceUsd: number | null; liquidityUsd: number | null; volume24hUsd: number | null;
  observedAt: null; providerGeneratedAt: string;
 };
 comparisonStatus: 'unavailable';
 comparisons: {
  quoteRelativePriceReturn: null; quoteAssetBenchmarkReturn: null; holderAttributedReward: null;
  reason: 'missing_synchronized_price_history_and_holder_entitlement';
 };
};
export type PairGroup = {
 quoteMint: string; quoteSymbol: string; quoteName: string; decimals: number;
 tokenProgram: string; symbolAmbiguous: boolean;
 source: string; verifiedAt: string; provenance: PairSource;
 verification: 'official_registry_catalog_match' | 'official_registry_only';
 availability: 'tokens_in_bounded_sample' | 'no_tokens_in_bounded_sample';
 tokens: PairToken[];
};
export type PairCatalog = {
 schemaVersion: 1; status: 'available' | 'degraded' | 'unavailable';
 groups: PairGroup[];
 dataset: {
  sourceStatus: PairSourceStatus; fetchedAt: string; dataFetchedAt: string | null;
  scope: 'bounded_official_catalog';
  coverage: {
   complete: false; atomic: false; registryCount: number; pagesFetched: number;
   pageLimit: 2; pageSize: 25; recordsReceived: number; tokensReturned: number;
   rejectedRecords: number; providerReportedTotal: number | null;
   modeChecks: number; modeCheckLimit: 12; historyScope: 'tracked_sample';
   warnings: string[];
   discovery?: {
    strategy: 'global_sample' | 'provider_quote_mint'; quoteMint: string | null;
    providerReportedTotalScope: 'catalog' | 'quote_mint';
   };
  };
  sources: PairSource[];
  history: { sourceStatus: PairSourceStatus; source: string; revision: string | null; dataFetchedAt: string | null };
 };
};

export type PairCatalogNotFound = Omit<PairCatalog, 'status'> & { status: 'not_found'; error: string };
export type PairCatalogParameterError = { error: string };
