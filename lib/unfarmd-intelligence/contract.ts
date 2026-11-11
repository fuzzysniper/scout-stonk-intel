/** V4 wire types only. No fetch, storage, UI, source approval or overall score. */
export type Asset = Readonly<{ chain: 'solana'; mint: string }>;
export type Provider = 'dexscreener' | 'helius-solana-rpc';
export type Acquisition = 'synthetic_fixture' | 'recorded_response';
export type Color = 'green' | 'yellow' | 'red' | 'grey';
export type FactId = 'mint_authority' | 'freeze_authority' | 'program' | 'supply' |
  'pool_liquidity_usd' | 'pool_volume_24h_usd' | 'pool_age_at_fetch' | 'base_price_usd' | 'base_change_24h_percent';
export type FailureReason = 'disabled' | 'rate_limited' | 'timeout' | 'upstream_unavailable' |
  'invalid_response' | 'invalid_clock' | 'stale_source' | 'no_eligible_base_pool' | 'unsupported';
export type FactValue =
  | Readonly<{ kind: 'authority'; state: 'present' | 'absent'; address: string | null }>
  | Readonly<{ kind: 'program'; program: 'spl_token' | 'token_2022'; address: string }>
  | Readonly<{ kind: 'integer_supply'; raw: string; decimals: number; decimalAmount: string }>
  | Readonly<{ kind: 'usd_amount'; amount: number }>
  | Readonly<{ kind: 'usd_price'; decimal: string }>
  | Readonly<{ kind: 'percent'; amount: number }>
  | Readonly<{ kind: 'pool_age_at_fetch'; reportedCreatedAt: string; seconds: number }>;
export type FactCard = Readonly<{
  id: FactId; provider: Provider; state: 'observed' | 'unknown' | 'unavailable' | 'unsupported';
  /** Reported source fields only. Owner text cannot populate this value. */
  fact: FactValue | null;
  assessment: Readonly<{ color: Color; rule: string; reason: string }>;
  evidenceRef: string | null;
}>;
export type SourceEvidence = Readonly<{
  id: string; asset: Asset; provider: Provider; acquisition: Acquisition;
  /** A retained receipt is not an authenticated live transport observation. */
  originVerification: 'capture_origin_not_independently_attested';
  assurance: 'provider_report_not_onchain_verified' | 'rpc_reported_not_independently_replayed';
  endpoint: string; evidenceUrl: string; responseSha256: string;
  requestStartedAt: string; fetchedAt: string; observedAt: null;
  observationTime: 'unknown'; contextSlot: string | null; commitment: 'finalized' | null;
  retrievalFreshness: 'recent' | 'stale';
}>;
export type PoolContext = Readonly<{
  address: string; baseMint: string; quoteMint: string; dexId: string;
  selection: 'highest_reported_liquidity_in_bounded_eligible_base_sample_then_ascii_pool';
  returnedPools: number; complete: false; requestedQuoteMint: string | null;
}>;
export type SourceProjection = Readonly<{
  version: 'unfarmd-source-projection/1'; asset: Asset; provider: Provider;
  evidence: SourceEvidence | null; pool: PoolContext | null; facts: readonly FactCard[];
}>;
export type IntelligenceSnapshot = Readonly<{
  version: 'unfarmd-intelligence/1'; id: string; asset: Asset; evaluatedAt: string;
  sources: readonly SourceEvidence[]; pools: readonly PoolContext[]; facts: readonly FactCard[];
  narrative: null; overallVerdict: null; publication: 'withheld';
}>;
export const INTELLIGENCE_POLICY = Object.freeze({
  acquisition: false, publicFinancialDisplay: false, storage: false,
  retrievalMaxAgeMs: 60000, maxJoinSkewMs: 15000, maxSources: 2,
} as const);
