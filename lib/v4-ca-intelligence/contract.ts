import type { MintFactsV1 } from '../onchain-mint/contract';
export type Window = '5m' | '1h' | '24h';
export type UnknownReason = 'sources_off' | 'missing' | 'not_indexed' | 'invalid_response' | 'identity_mismatch' | 'stale' | 'clock_unknown'
  | 'unit_unconfirmed' | 'zero_denominator' | 'not_observed' | 'unsupported_extensions' | 'conflicting_sources' | 'rate_limited'
  | 'unavailable' | 'rights_hold' | 'admission_denied' | 'uncertain' | 'stopped';
export type SourceRef = Readonly<{
  provider: 'jupiter_tokens_v2' | 'helius_rpc'; endpointHost: 'api.jup.ag' | 'mainnet.helius-rpc.com';
  responseSha256: string; captureKind: 'synthetic_fixture' | 'recorded_response' | 'native_https';
  requestStartedAt: string; receivedAt: string; evaluatedAt: string; sourceUpdatedAt: string | null; httpDate: string | null;
  clockBasis: 'provider_record_update_not_each_metric' | 'finalized_rpc_context_not_block_time';
  /** Non-atomic provider aggregation. Receipt time MUST NOT replace an unknown source clock. */
  independentReplay: false;
}>;
export type Evidence<T> = Readonly<{
  state: 'provider_reported' | 'rpc_observed' | 'derived' | 'unknown'; value: T | null;
  unit: string; reason: UnknownReason | null; source: SourceRef | null; paths: readonly string[];
}>;
export type TradingWindow = Readonly<{
  label: Window; seconds: 300 | 3600 | 86400; observedStartAt: null; observedEndAt: null;
  priceChangePercent: Evidence<string>; buys: Evidence<string>; sells: Evidence<string>;
  reportedTraders: Evidence<string>; buyVolume: Evidence<string>; sellVolume: Evidence<string>;
  buyTransactionShare: Evidence<string>;
  /** Decimal ratio intentionally withheld until the provider volume unit/cutoff is confirmed. */
  volumeToLiquidity: Evidence<string>;
}>;
export type MarketEvidence = Readonly<{
  state: 'provider_reported' | 'unknown'; reason: UnknownReason | null;
  name: Evidence<string>; symbol: Evidence<string>; decimals: Evidence<string>; tokenProgram: Evidence<string>;
  priceUsd: Evidence<string>; marketCapUsd: Evidence<string>; fdvUsd: Evidence<string>; liquidityUsd: Evidence<string>;
  holders: Evidence<string>; reportedTokenCreatedAt: Evidence<string>; priceBlockId: Evidence<string>;
  firstPool: Readonly<{ address: Evidence<string>; createdAt: Evidence<string> }>;
  canonicalPool: null; alternativePools: readonly never[];
  poolCoverage: 'not_enumerated_first_pool_is_not_canonical_or_execution_pool';
  windows: Readonly<Record<Window, TradingWindow>>;
  limitations: readonly string[];
}>;
export type Concern = Readonly<{ code: string; severity: 'concern' | 'unknown'; explanation: string; evidencePaths: readonly string[] }>;
export type CaIntelligenceV1 = Readonly<{
  version: 'unfarmd-ca-intelligence/1'; sourceGo: false; network: 'solana-mainnet'; mint: string | null;
  state: 'sources_off' | 'partial' | 'unavailable' | 'offline_fixture' | 'offline_replay'; reason: UnknownReason | 'invalid_mint' | null;
  /** Exact syntax alone is not proof of account existence; Jupiter metadata is not onchain identity. */
  identity: 'not_checked' | 'provider_reported_only' | 'rpc_observed_at_finalized_context' | 'conflicting';
  market: MarketEvidence; onchain: MintFactsV1 | null; concerns: readonly Concern[];
  unknowns: readonly string[]; limitations: readonly string[];
}>;
export type CaLookup = Readonly<{ lookup(request: Request, mint: unknown): Promise<CaIntelligenceV1> }>;
