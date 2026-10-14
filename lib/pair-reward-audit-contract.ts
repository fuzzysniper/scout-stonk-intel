/** Offline research contract only. Never a live leaderboard or holder return. */
import type { PairSource } from './pairs-contract';
export type RewardAuditPacket = {
 source: string; fetchedAt: string; status: number | null; body: string | null;
 ageSeconds?: number | null;
};
export type RewardAuditInput = {
 quoteMint: string; asOf: string; registry: RewardAuditPacket | null;
 catalog: RewardAuditPacket | null; rewards: readonly RewardAuditPacket[];
};
export type RewardAuditReason =
 | 'invalid_input' | 'source_missing' | 'source_rate_limited' | 'source_unavailable'
 | 'invalid_source' | 'stale_source' | 'registry_unverified' | 'catalog_unverified'
 | 'mode_identity_mismatch' | 'units_unverified' | 'ledger_unavailable'
 | 'payouts_unavailable' | 'invalid_payouts' | 'candidate_set_incomplete'
 | 'observation_skew' | 'insufficient_candidates';
export type AuditedRewardCandidate = {
 mint: string; symbol: string; name: string;
 modeVerification: 'verified_reward' | 'unverified';
 state: 'eligible' | 'withheld'; reasons: RewardAuditReason[];
 source: PairSource | null;
 lifetime: null | {
  basis: 'ledger'; distributedRaw: string; distributedTokens: string;
  payoutCount: number; walletsPaid: number; lastPayoutAt: string | null;
  startAt: null; endAt: null; interpretation: 'provider_reported_lifetime_holder_distributions';
 };
};
export type PairRewardAudit = {
 schemaVersion: 1; method: 'pair-reward-audit-v1'; evaluatedAt: string;
 quote: null | {mint: string; symbol: string; name: string; decimals: number; symbolAmbiguous: boolean; source: PairSource};
 catalogSource: PairSource | null;
 coverage: {
  complete: false; atomic: false; providerReportedTotal: number | null;
  providerReportedTotalScope: 'all_modes_live_platform_pools_for_exact_quote';
  catalogInspected: number; catalogUninspected: number | null;
  candidateSelection: 'first_four_catalog_reported_reward_tokens_in_market_cap_page_one';
  candidatesSelected: number; rewardReadsAttempted: number; rewardModeVerified: number;
  payoutDataAvailable: number; eligibleForComparison: number; rewardsUnassessed: number | null;
 };
 candidates: AuditedRewardCandidate[];
 ranking: {
  state: 'available' | 'withheld'; label: 'Top observed in audited sample';
  metric: 'reported_lifetime_quote_holder_distributions';
  domain: 'eligible_candidates_only'; orderedMints: string[]; topObservedMints: string[];
  reasons: RewardAuditReason[];
  observations: null | {generatedFrom: string; generatedTo: string; fetchedFrom: string; fetchedTo: string};
 };
 ecosystemLeader: {state: 'unknown'; reason: 'nonexhaustive_catalog_and_no_verified_pair_scoped_reward_order'};
 unsupported: {reward24h: null; holderRoi: null; quoteRelativeTotalReturn: null; economicLeadership: null};
 limitations: readonly string[];
};
