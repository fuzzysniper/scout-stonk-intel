/** Optional V1 UI contract; types only. Mechanism, lifetime, intervals and returns differ. */
import type { PairSource } from './pairs-contract';
import type { PulseDistribution, PulseReason } from './pair-pulse-contract';
import type { LedgerLifetime, LedgerLifetimeRead } from './reward-lifetime';
export type RewardEvidenceQuality = 'current'|'cached'|'partial'|'stale'|'unavailable';
export type RewardEvidenceReason = 'source_unavailable'|'source_stale'|'source_rate_limited'|'invalid_source'|'registry_unverified'|
 'mode_not_checked'|'mode_not_reward'|'reward_mode_unverified'|'units_unverified'|'receipt_missing'|
 Extract<LedgerLifetimeRead,{state:'unavailable'}>['reason'];
export type RewardEvidenceScope = {
 kind:'bounded_market_cap_catalog'; complete:false; atomic:false;
 strategy:'global_sample'|'provider_quote_mint'|'unavailable'; quoteMint:string;
 catalogRecordsInspected:number; sameQuoteCandidates:number; modeChecksAttempted:number;
 sameQuoteModeVerified:number; sameQuoteLifetimesReported:number; sameQuoteIntervalsCovered:number;
 providerReportedUniverse:number|null;
 universeScope:'all_modes_live_platform_pools_for_exact_quote'|'unknown';
 uninspectedCatalogCount:number|null;
 ranking:{state:'withheld';reason:'nonexhaustive_sample_not_reward_order';ecosystemLeader:null};
};
export type RewardEvidence = {
 schemaVersion:1; evaluatedAt:string; tokenMint:string;
 unit:{kind:'quote_token';mint:string;symbol:string;decimals:number};
 summary:'observed_interval'|'reported_lifetime'|'mechanism_verified'|'standard_mode'|'unverified';
 mechanism:{
  state:'verified_reward'|'verified_standard'|'unverified'; quality:RewardEvidenceQuality;
  evidenceLevel:'official_api_mode_identity'|'catalog_only'|'none'; source:PairSource|null; referenceUrl:string|null;
  reason:RewardEvidenceReason|null; meaning:'settings_confirmation_not_distribution_or_return';
 };
 lifetime:{
  state:'reported'|'unavailable'; quality:RewardEvidenceQuality;
  evidenceLevel:'provider_reported_ledger'|'none'; source:PairSource|null; referenceUrl:string|null;
  value:LedgerLifetime|null; reason:RewardEvidenceReason|null;
 };
 interval:{
  state:'covered'|'insufficient_history'|'unavailable'; quality:RewardEvidenceQuality;
  evidenceLevel:'recorded_counter_coverage_passed'|'none';
  value:PulseDistribution|null; reasons:PulseReason[]; details:string[];
  historySource:{source:string|null;revision:string|null;dataFetchedAt:string|null;sourceStatus:string};
  meaning:'covered_counter_change_not_holder_receipts_or_return';
 };
 holderReturn:{state:'unavailable';value:null;evidenceLevel:'none';reason:'holder_entitlement_costs_and_cashflows_missing'};
 scope:RewardEvidenceScope;
};
