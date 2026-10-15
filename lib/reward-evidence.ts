/** Pure presentation of independently gated evidence; no provider reads or rankings. */
import { parseHistoryTimestamp, STALE_AFTER_MS } from './history';
import { evaluatePairPulseCandidate } from './pair-pulse';
import { isSolanaMint } from './solana';
import type { PairCatalog, PairGroup, PairQuoteRegistry, PairSource, PairToken } from './pairs-contract';
import type { SourceResult } from './history-source';
import type { TrackedToken } from './tracked-tokens';
import type { LedgerLifetimeRead } from './reward-lifetime';
import type { CatalogToken } from './pairs-source';
import type { RewardEvidence, RewardEvidenceQuality, RewardEvidenceReason, RewardEvidenceScope } from './reward-evidence-contract';
const MODE='https://www.stonkfun.xyz/api/v2/tokens/';
const REGISTRY='https://www.stonkfun.xyz/api/public/v1/pairs';
const HISTORY='https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json';
export type RewardEvidenceInput = {
 token:PairToken; group:PairGroup; catalog:PairCatalog; registry:PairQuoteRegistry|null;
 history:SourceResult; tracked:readonly TrackedToken[]; receipt:LedgerLifetimeRead|undefined; modeFailure?:CatalogToken['modeFailure']; asOf:string;
};
function sourceQuality(p:PairSource|null,expected:string,c:PairCatalog,now:number,maxGeneratedAge:number):{quality:RewardEvidenceQuality;reason:RewardEvidenceReason|null} {
 if(!p)return {quality:'unavailable',reason:'source_unavailable'};
 if(c.status==='unavailable' || c.dataset.sourceStatus==='unavailable')return {quality:'unavailable',reason:'source_unavailable'};
 const fetched=parseHistoryTimestamp(p.fetchedAt),generated=parseHistoryTimestamp(p.providerGeneratedAt);
 if(p.source!==expected || !/^sha256:[a-f0-9]{64}$/.test(p.revision) || fetched===null || generated===null ||
    !c.dataset.sources.some(s=>s.source===p.source && s.revision===p.revision && s.fetchedAt===p.fetchedAt && s.providerGeneratedAt===p.providerGeneratedAt))return {quality:'unavailable',reason:'invalid_source'};
 if(!Number.isFinite(now) || fetched>now || generated>now || generated>fetched || now-fetched>300_000 || now-generated>maxGeneratedAge)return {quality:'stale',reason:'source_stale'};
 return {quality:c.dataset.sourceStatus==='degraded'?'partial':c.dataset.sourceStatus==='cached'?'cached':'current',reason:null};
}
export function rewardEvidenceScope(c:PairCatalog,g:PairGroup):RewardEvidenceScope {
 const cov=c.dataset.coverage,discovery=cov.discovery;
 const scoped=discovery?.strategy==='provider_quote_mint' && discovery.quoteMint===g.quoteMint && discovery.providerReportedTotalScope==='quote_mint';
 const total=scoped?cov.providerReportedTotal:null;
 return {kind:'bounded_market_cap_catalog',complete:false,atomic:false,strategy:discovery?.strategy??'unavailable',quoteMint:g.quoteMint,
  catalogRecordsInspected:cov.recordsReceived,sameQuoteCandidates:g.tokens.length,modeChecksAttempted:cov.modeChecks,
  sameQuoteModeVerified:0,sameQuoteLifetimesReported:0,sameQuoteIntervalsCovered:0,providerReportedUniverse:total,
  universeScope:scoped?'all_modes_live_platform_pools_for_exact_quote':'unknown',uninspectedCatalogCount:total===null?null:Math.max(0,total-g.tokens.length),
  ranking:{state:'withheld',reason:'nonexhaustive_sample_not_reward_order',ecosystemLeader:null}};
}
export function summarizeRewardEvidence(input:RewardEvidenceInput):RewardEvidence {
 const {token:t,group:g,catalog:c,history,registry,tracked,receipt,asOf}=input,now=parseHistoryTimestamp(asOf)??NaN;
 const identity=isSolanaMint(t.mint) && isSolanaMint(g.quoteMint) && t.quoteMint===g.quoteMint && t.quoteSymbol===g.quoteSymbol && g.source===REGISTRY &&
  Number.isInteger(g.decimals) && g.decimals>=0 && g.decimals<=18;
 const rq=sourceQuality(g.provenance,REGISTRY,c,now,STALE_AFTER_MS);
 const mq=sourceQuality(t.rewardSource,MODE+t.mint+'/rewards',c,now,STALE_AFTER_MS);
 if(input.modeFailure==='stale_transport' || input.modeFailure==='stale_source') {mq.quality='stale';mq.reason='source_stale';}
 if(input.modeFailure==='rate_limited' || input.modeFailure==='provider_cooldown')mq.reason='source_rate_limited';
 const checked=identity && rq.reason===null && mq.reason===null;
 const modeSource=t.rewardSource?.source===MODE+t.mint+'/rewards'?t.rewardSource:null;
 const state=checked && t.modeVerification==='verified_reward' && t.mode==='reward' && t.rewardModeVerified?'verified_reward':
  checked && t.modeVerification==='verified_standard' && t.mode==='standard' && !t.rewardModeVerified?'verified_standard':'unverified';
 const mechanism:RewardEvidence['mechanism']={state,quality:checked?mq.quality:rq.reason?rq.quality:mq.quality,
  evidenceLevel:state!=='unverified'?'official_api_mode_identity':t.modeVerification==='catalog_only'?'catalog_only':'none',source:modeSource,referenceUrl:isSolanaMint(t.mint)?MODE+t.mint+'/rewards':null,
  reason:state!=='unverified'?null:!identity || rq.reason?'registry_unverified':t.modeVerification==='catalog_only'?'mode_not_checked':mq.reason??'reward_mode_unverified',
  meaning:'settings_confirmation_not_distribution_or_return'};
 const lq=sourceQuality(t.rewardSource,MODE+t.mint+'/rewards',c,now,300_000);
 const lifetime:RewardEvidence['lifetime']={state:'unavailable',quality:state==='unverified'?mechanism.quality:lq.quality,evidenceLevel:'none',source:modeSource,referenceUrl:mechanism.referenceUrl,value:null,
  reason:state!=='verified_reward'?(state==='verified_standard'?'mode_not_reward':'reward_mode_unverified'):lq.reason??'receipt_missing'};
 if(state==='verified_reward' && lq.reason===null && receipt) {
  if(receipt.state==='reported') {lifetime.state='reported';lifetime.evidenceLevel='provider_reported_ledger';lifetime.value={...receipt.value};lifetime.reason=null;}
  else lifetime.reason=receipt.reason;
 }
 const pulse=state==='verified_reward'?evaluatePairPulseCandidate({tokenMint:t.mint,quoteMint:g.quoteMint,asOf,endAt:t.lastObservedAt??asOf,
  registry:registry?{state:'ready',value:registry}:{state:'unavailable',value:null},catalog:{state:'ready',value:c},
  history:{state:'ready',value:history},tracked}).candidate.distribution:{state:'withheld' as const,confidence:'withheld' as const,value:null,reasons:['reward_mode_unverified' as const],details:[]};
 const failures=pulse.state==='withheld'?pulse.reasons:[];
 const insufficient=failures.some(r=>['no_history','token_not_tracked','history_coverage_failed','observation_period_unaligned','provider_period_unaligned','provider_sequence_invalid','provider_time_missing','counter_precision_unsafe','duplicate_observation','invalid_observation'].includes(r));
 const interval:RewardEvidence['interval']={state:pulse.state==='available'?'covered':insufficient?'insufficient_history':'unavailable',
  quality:pulse.state==='available'?history.dataset.sourceStatus==='cached'?'cached':'current':state!=='verified_reward'?mechanism.quality:failures.some(r=>r.includes('stale') || r==='invalid_period')?'stale':failures.some(r=>r.includes('partial'))?'partial':'unavailable',
  evidenceLevel:pulse.state==='available'?'recorded_counter_coverage_passed':'none',value:pulse.state==='available'?pulse.value:null,
  reasons:failures,details:pulse.state==='withheld'?pulse.details:[],historySource:{source:history.dataset.source===HISTORY?HISTORY:null,revision:history.dataset.revision,dataFetchedAt:history.dataset.dataFetchedAt,sourceStatus:history.dataset.sourceStatus},
  meaning:'covered_counter_change_not_holder_receipts_or_return'};
 return {schemaVersion:1,evaluatedAt:asOf,tokenMint:t.mint,unit:{kind:'quote_token',mint:g.quoteMint,symbol:g.quoteSymbol,decimals:g.decimals},
  summary:interval.state==='covered'?'observed_interval':lifetime.state==='reported'?'reported_lifetime':state==='verified_reward'?'mechanism_verified':state==='verified_standard'?'standard_mode':'unverified',
  mechanism,lifetime,interval,holderReturn:{state:'unavailable',value:null,evidenceLevel:'none',reason:'holder_entitlement_costs_and_cashflows_missing'},scope:rewardEvidenceScope(c,g)};
}
