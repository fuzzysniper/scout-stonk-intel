/** Offline proposal only. No API route or UI integration consumes this contract. */
import type { PairCatalog, PairQuote, PairQuoteRegistry, PairSource } from './pairs-contract';
import type { SourceResult } from './history-source';
import type { TrackedToken } from './tracked-tokens';

export type PulseRead<T> = { state: 'ready'; value: T } |
 { state: 'partial' | 'unavailable' | 'rate_limited'; value: null };
export type PulseInput = {
 quoteMint: string; leftMint: string; rightMint: string;
 /** Explicit UTC evaluation and actual common end observation, never a retrieval time. */
 asOf: string; endAt: string;
 registry: PulseRead<PairQuoteRegistry>; catalog: PulseRead<PairCatalog>;
 history: PulseRead<SourceResult>; tracked: readonly TrackedToken[];
};
export type PulseReason = `${'registry' | 'catalog' | 'history'}_${'unavailable' | 'partial' | 'rate_limited' | 'stale' | 'invalid'}` |
 'invalid_input' | 'input_limit_exceeded' | 'invalid_reference_time' | 'invalid_period' |
 'quote_unverified' | 'quote_identity_mismatch' | 'invalid_source' | 'source_stale' |
 'source_future' | 'source_revision_invalid' | 'unverified_catalog_scope' |
 'duplicate_candidate' | 'candidate_not_in_sample' | 'token_not_tracked' |
 'tracked_identity_mismatch' | 'reward_mode_unverified' | 'history_source_mismatch' |
 'history_metadata_mismatch' | 'no_history' | 'duplicate_observation' |
 'invalid_observation' | 'history_coverage_failed' | 'observation_period_unaligned' |
 'provider_period_unaligned' | 'provider_sequence_invalid' | 'provider_time_missing' | 'counter_precision_unsafe' |
 'market_snapshot_missing' | 'market_snapshot_invalid' | 'candidate_withheld' |
 'historical_market_observations_missing' | 'synchronized_quote_prices_missing' |
 'holder_cashflows_missing' | 'economic_leadership_not_established';
export type PulseMetric<T> =
 { state: 'available'; confidence: 'coverage_passed' | 'snapshot_only'; value: T } |
 { state: 'withheld'; confidence: 'withheld'; value: null; reasons: PulseReason[]; details: string[] };
export type PulseAmount = { atomic: string; tokens: string };
export type PulsePeriod = {
 startAt: string; endAt: string; providerStartAt: string; providerEndAt: string;
 seconds: 86400; observationCount: number; maxGapSeconds: number;
 distributed: PulseAmount;
};
export type PulseDistribution = {
 kind: 'observed_aggregate_counter_change'; quoteMint: string; decimals: number;
 current: PulsePeriod; previous: PulsePeriod; change: PulseAmount;
 /** Dates name counter reads/response generation, not onchain payout cutoffs. */
 interpretation: 'not_payout_reconciliation_or_holder_return';
 history: { source: string; revision: string; dataFetchedAt: string };
 modeSource: PairSource; catalogSource: PairSource;
};
export type PulseSnapshot = {
 kind: 'provider_reported_snapshot_not_trend'; unit: 'USD';
 liquidityUsd: number | null; volume24hUsd: number | null;
 observedAt: null; providerGeneratedAt: string; fetchedAt: string;
 sourceQuality: 'available' | 'cached' | 'degraded'; provenance: PairSource;
};
export type PulseCandidate = {
 mint: string | null; symbol: string | null;
 distribution: PulseMetric<PulseDistribution>; snapshot: PulseMetric<PulseSnapshot>;
};
export type PulseDifference = {
 kind: 'left_minus_right_observed_distributions'; quoteMint: string; decimals: number;
 leftMint: string; rightMint: string;
 current: PulseAmount; previous: PulseAmount; change: PulseAmount;
 currentStartAt: string; endAt: string; previousStartAt: string;
 interpretation: 'activity_difference_not_economic_leadership';
};
export type PulseReport = {
 schemaVersion: 1; policy: 'pair-pulse-v0-strict'; evaluatedAt: string | null; endAt: string | null;
 quote: PairQuote | null; registrySource: PairSource | null;
 scope: { kind: 'selected_two_from_bounded_scoped_sample'; complete: false; atomic: false };
 left: PulseCandidate; right: PulseCandidate; comparison: PulseMetric<PulseDifference>;
 unsupported: {
  marketTrend: PulseMetric<never>; quoteRelativeReturn: PulseMetric<never>;
  holderRoi: PulseMetric<never>; economicLeadership: PulseMetric<never>;
 };
};
