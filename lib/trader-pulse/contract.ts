/** Pulse V1 describes bounded provider reports, never independently observed trades. */
export type WindowName = 'm5' | 'h1' | 'h6' | 'h24';
export type Counts = Readonly<{ buys: number; sells: number }>;
export type SourceClock = Readonly<{
  requestStartedAt: string;
  retrievedAt: string;
  /** Neither HTTP Date, pairCreatedAt, nor our retrieval clock qualifies these. */
  providerObservedAt: null;
  underlyingTradeAt: null;
  windowEndAt: null;
  semantic: 'retrieval_only_market_time_unknown';
}>;
export type Pool = Readonly<{
  chainId: 'solana'; dexId: string; pairAddress: string; sourceUrl: string;
  base: Readonly<{ mint: string; name: string | null; symbol: string | null }>;
  quote: Readonly<{ mint: string; name: string | null; symbol: string | null }>;
  liquidityUsd: number | null;
  volumeUsd: Readonly<Record<WindowName, number | null>>;
  txns: Readonly<Record<WindowName, Counts | null>>;
  priceUsd: string | null;
  priceChangePercent: Readonly<Record<WindowName, number | null>>;
  pairCreatedAt: number | null;
}>;
export type Snapshot = Readonly<{
  schemaVersion: 1; requestedMint: string; requestedQuoteMint: string | null;
  source: Readonly<{
    provider: 'dexscreener'; endpoint: string; responseSha256: string; clock: SourceClock;
    assurance: 'provider_report_not_onchain_verified';
  }>;
  scope: Readonly<{
    kind: 'bounded_returned_pools'; complete: false; returned: number;
    baseMatches: number; quoteMatches: number; eligibleBasePools: number;
  }>;
  pools: readonly Pool[];
  /** Highest reported liquidity among eligible BASE matches, then ASCII pool address.
   * Known zero ranks above unknown. Not an official/canonical launch-pool assertion. */
  selectedPool: Pool | null;
  identity: 'base_match' | 'quote_side_only' | 'no_eligible_base_pool' | 'no_returned_pools';
}>;
export type Signal<T> = Readonly<{
  state: 'observed' | 'uncertain' | 'unavailable'; ruleId: string;
  value: T | null; providerFields: readonly string[]; clock: SourceClock | null;
  reasons: readonly string[]; interpretation: string;
}>;
export type PulseReport = Readonly<{
  schemaVersion: 1; policy: 'scout-pulse-v1'; evaluatedAt: string;
  mint: string; requestedQuoteMint: string | null; poolAddress: string | null;
  pair: Readonly<{
    baseMint: string; quoteMint: string; dexId: string; sourceUrl: string;
    selection: 'highest_reported_liquidity_in_bounded_eligible_base_sample_then_ascii_pool';
  }> | null;
  source: Snapshot['source']; scope: Snapshot['scope'];
  identity: Snapshot['identity'];
  liquidity: Signal<{ reportedUsd: number; unit: 'USD' }>;
  activityAcceleration: Signal<{
    fiveMinuteTransactions: number; oneHourTransactions: number;
    fiveMinutePerMinute: number; oneHourPerMinute: number;
    ratio: number | null; comparison: 'higher' | 'lower' | 'equal' | 'no_reported_activity';
    baseline: 'overlapping_hour_includes_last_five_minutes';
  }>;
  transactionImbalance: Signal<{
    window: 'm5'; buys: number; sells: number; total: number;
    normalizedDifference: number; direction: 'buy_count_heavier' | 'sell_count_heavier' | 'balanced';
    orientation: 'provider_base_token';
  }>;
  poolAge: Signal<{ reportedCreatedAt: string; elapsedSecondsAtRetrieval: number; context: 'under_one_hour' | 'one_hour_to_one_day' | 'at_least_one_day' }>;
  priceImpulse: Signal<never>;
  redFlags: Signal<{ flags: readonly string[]; assessment: 'limited_checks_not_safety_clearance' }>;
  publication: 'withheld_pending_source_rights_and_clock_review';
}>;

export const LIMITS = Object.freeze({
  bytes: 262144, pairs: 64, chunks: 1024, deadlineMs: 4000,
  retrievalMaxAgeMs: 60000, spacingMs: 2000, maxResearchRequests: 3,
});
/** No environment variable, request parameter, or implicit commercial-use license enables this. */
export const PUBLIC_POLICY = Object.freeze({ sourceObservation: false, financialPublication: false } as const);
