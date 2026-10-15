import type { PairCatalog, PairToken } from './adapter';
import { validMint } from './adapter';
import type { PairSource } from '../../lib/pairs-contract';
import type { RewardEvidence } from '../../lib/reward-evidence-contract';

export type SampleSort = 'name' | 'liquidity' | 'volume';
export const DEFAULT_SAMPLE_SORT: SampleSort = 'liquidity';

export type RewardEvidenceRead = {state:'absent'|'invalid';value:null}|{state:'ready';value:RewardEvidence};
const evidenceObject=(v:unknown):Record<string,unknown>=>{
 if(!v || typeof v!=='object' || Array.isArray(v))throw Error('Invalid reward evidence');
 return v as Record<string,unknown>;
};
function evidenceNeed(value:unknown):asserts value {if(!value)throw Error('Invalid reward evidence');}
const evidenceDate=(v:unknown):number=>{
 evidenceNeed(typeof v==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(v));
 const n=Date.parse(v);evidenceNeed(Number.isFinite(n) && new Date(n).toISOString().slice(0,19)===v.slice(0,19));return n;
};
const evidenceCount=(v:unknown)=>typeof v==='number' && Number.isSafeInteger(v) && v>=0;
const evidenceHash=(v:unknown)=>typeof v==='string' && /^sha256:[a-f0-9]{64}$/.test(v);
const evidenceCode=(v:unknown)=>typeof v==='string' && /^[a-z][a-z0-9_]{0,99}$/.test(v);
const sameEvidenceSource=(a:PairSource,b:PairSource)=>a.source===b.source && a.revision===b.revision && a.fetchedAt===b.fetchedAt && a.providerGeneratedAt===b.providerGeneratedAt;
/** Exact string consistency only, never float conversion or a new reward calculation. */
function evidenceAmount(raw:unknown,tokens:unknown,decimals:number,signed=false):bigint {
 evidenceNeed(typeof raw==='string' && raw.length<=79 && (signed?/^-?(?:0|[1-9]\d*)$/:/^(?:0|[1-9]\d*)$/).test(raw) && raw!=='-0');
 const n=BigInt(raw),digits=(n<0n?-n:n).toString().padStart(decimals+1,'0');
 evidenceNeed(tokens===(n<0n?'-':'')+(decimals?digits.slice(0,-decimals)+'.'+digits.slice(-decimals):digits));return n;
}
/** Validate optional UI evidence against the already validated catalog; never fall back over a rejected claim. */
export function readRewardEvidence(token:PairToken,catalog:PairCatalog|null=null):RewardEvidenceRead {
 const raw=token.catalog?.rewardEvidence;
 if(raw===undefined)return {state:'absent',value:null};
 try {
  evidenceNeed(catalog && token.catalog);
  const group=catalog.groups.find(g=>g.quoteMint===token.quoteMint),t=token.catalog;
  evidenceNeed(group && group.tokens.some(v=>v.mint===token.mint && v.poolMint===t.poolMint));
  const e=evidenceObject(raw),unit=evidenceObject(e.unit),m=evidenceObject(e.mechanism),l=evidenceObject(e.lifetime),i=evidenceObject(e.interval),h=evidenceObject(e.holderReturn),scope=evidenceObject(e.scope),ranking=evidenceObject(scope.ranking);
  const now=evidenceDate(e.evaluatedAt),decimals=group.decimals,coverage=catalog.dataset.coverage;
  evidenceNeed(e.schemaVersion===1 && e.tokenMint===token.mint && now===evidenceDate(catalog.dataset.fetchedAt));
  evidenceNeed(unit.kind==='quote_token' && unit.mint===token.quoteMint && unit.symbol===token.quoteSymbol && unit.decimals===decimals);
  const modeUrl='https://www.stonkfun.xyz/api/v2/tokens/'+token.mint+'/rewards';
  const source=(value:unknown,expected:PairSource|null):PairSource|null=>{
   if(value===null)return null;
   const p=evidenceObject(value);evidenceNeed(expected && sameEvidenceSource(p as PairSource,expected) && catalog.dataset.sources.some(v=>sameEvidenceSource(v,expected)));
   evidenceNeed(evidenceHash(p.revision) && evidenceDate(p.providerGeneratedAt)<=evidenceDate(p.fetchedAt) && evidenceDate(p.fetchedAt)<=now);
   return p as PairSource;
  };
  const fresh=(p:PairSource|null,maxGenerationAge:number)=>{
   evidenceNeed(p && now-evidenceDate(p.fetchedAt)<=300000 && now-evidenceDate(p.providerGeneratedAt)<=maxGenerationAge);
  };
  const usable=(v:unknown)=>['current','cached','partial'].includes(String(v));
  for(const metric of [m,l,i])evidenceNeed(['current','cached','partial','stale','unavailable'].includes(String(metric.quality)));
  for(const metric of [m,l])evidenceNeed((metric.referenceUrl===null || metric.referenceUrl===modeUrl) && (metric.reason===null || evidenceCode(metric.reason)));
  const ms=source(m.source,t.rewardSource),ls=source(l.source,t.rewardSource);
  evidenceNeed((ms===null || ms.source===modeUrl) && (ls===null || ls.source===modeUrl));
  evidenceNeed(m.meaning==='settings_confirmation_not_distribution_or_return' && ['verified_reward','verified_standard','unverified'].includes(String(m.state)));
  if(m.state!=='unverified'){
   evidenceNeed(usable(m.quality) && m.evidenceLevel==='official_api_mode_identity' && m.reason===null && m.state===t.modeVerification && (m.state==='verified_reward')===t.rewardModeVerified);
   evidenceNeed(group.source==='https://www.stonkfun.xyz/api/public/v1/pairs' && group.provenance.source===group.source);
   fresh(ms,10800000);fresh(source(group.provenance,group.provenance),10800000);
  }else evidenceNeed(['none','catalog_only'].includes(String(m.evidenceLevel)) && evidenceCode(m.reason));
  evidenceNeed(['reported','unavailable'].includes(String(l.state)));
  if(l.state==='reported'){
   evidenceNeed(m.state==='verified_reward' && usable(l.quality) && l.evidenceLevel==='provider_reported_ledger' && l.reason===null);fresh(ls,300000);
   const v=evidenceObject(l.value);evidenceNeed(v.basis==='ledger' && v.interpretation==='provider_reported_lifetime_holder_distributions' && v.startAt===null && v.endAt===null);
   const amount=evidenceAmount(v.distributedRaw,v.distributedTokens,decimals);
   evidenceNeed(String(v.distributedRaw).length<=78 && evidenceCount(v.payoutCount) && evidenceCount(v.walletsPaid) && Number(v.walletsPaid)<=Number(v.payoutCount));
   evidenceNeed(amount===0n || Number(v.payoutCount)>0 && Number(v.walletsPaid)>0);
   evidenceNeed(v.lastPayoutAt===null?Number(v.payoutCount)===0:Number(v.payoutCount)>0 && evidenceDate(v.lastPayoutAt)<=evidenceDate(ls!.providerGeneratedAt));
  }else evidenceNeed(l.value===null && l.evidenceLevel==='none' && evidenceCode(l.reason));
  evidenceNeed(i.meaning==='covered_counter_change_not_holder_receipts_or_return' && ['covered','insufficient_history','unavailable'].includes(String(i.state)));
  evidenceNeed(Array.isArray(i.reasons) && i.reasons.length<=100 && i.reasons.every(evidenceCode) && Array.isArray(i.details) && i.details.length<=100 && i.details.every(v=>typeof v==='string' && v.length<=2000 && !/[\u0000-\u001f\u007f]/.test(v)));
  const hs=evidenceObject(i.historySource),history=catalog.dataset.history;
  evidenceNeed((hs.source===null || hs.source===history.source) && (hs.revision===null || evidenceHash(hs.revision)) && (hs.dataFetchedAt===null || evidenceDate(hs.dataFetchedAt)<=now) && ['available','cached','degraded','unavailable'].includes(String(hs.sourceStatus)));
  if(i.state==='covered'){
   evidenceNeed(m.state==='verified_reward' && ['current','cached'].includes(String(i.quality)) && i.evidenceLevel==='recorded_counter_coverage_passed' && i.reasons.length===0 && i.details.length===0);
   evidenceNeed(catalog.status==='available' && ['available','cached'].includes(catalog.dataset.sourceStatus) && coverage.rejectedRecords===0 && t.historyStatus==='recorded' && t.historyFreshness==='fresh');
   const v=evidenceObject(i.value),vh=evidenceObject(v.history),current=evidenceObject(v.current),previous=evidenceObject(v.previous);
   evidenceNeed(v.kind==='observed_aggregate_counter_change' && v.interpretation==='not_payout_reconciliation_or_holder_return' && v.quoteMint===token.quoteMint && v.decimals===decimals);
   evidenceNeed(hs.source===history.source && hs.revision===history.revision && hs.dataFetchedAt===history.dataFetchedAt && hs.sourceStatus===history.sourceStatus && ['available','cached'].includes(String(hs.sourceStatus)) && now-evidenceDate(hs.dataFetchedAt)<=300000);
   evidenceNeed(vh.source===hs.source && vh.revision===hs.revision && vh.dataFetchedAt===hs.dataFetchedAt);
   fresh(source(v.modeSource,t.rewardSource),10800000);fresh(source(v.catalogSource,t.provenance),10800000);
   for(const p of [current,previous]){
    evidenceNeed(p.seconds===86400 && evidenceDate(p.endAt)-evidenceDate(p.startAt)===86400000 && evidenceDate(p.providerEndAt)-evidenceDate(p.providerStartAt)===86400000);
    evidenceNeed(evidenceDate(p.endAt)<=now && evidenceDate(p.providerEndAt)<=now && evidenceCount(p.observationCount) && Number(p.observationCount)>=2 && typeof p.maxGapSeconds==='number' && p.maxGapSeconds>0 && p.maxGapSeconds<7200);
    const d=evidenceObject(p.distributed);evidenceAmount(d.atomic,d.tokens,decimals);
   }
   evidenceNeed(current.startAt===previous.endAt && current.providerStartAt===previous.providerEndAt && now-evidenceDate(current.endAt)<=10800000 && current.endAt===t.lastObservedAt);
   const change=evidenceObject(v.change),ca=evidenceObject(current.distributed),pa=evidenceObject(previous.distributed);
   evidenceNeed(evidenceAmount(change.atomic,change.tokens,decimals,true)===BigInt(String(ca.atomic))-BigInt(String(pa.atomic)));
  }else evidenceNeed(i.value===null && i.evidenceLevel==='none');
  evidenceNeed(h.state==='unavailable' && h.value===null && h.evidenceLevel==='none' && h.reason==='holder_entitlement_costs_and_cashflows_missing');
  evidenceNeed(scope.kind==='bounded_market_cap_catalog' && scope.complete===false && scope.atomic===false && scope.quoteMint===token.quoteMint && scope.strategy===(coverage.discovery?.strategy??'unavailable'));
  for(const key of ['catalogRecordsInspected','sameQuoteCandidates','modeChecksAttempted','sameQuoteModeVerified','sameQuoteLifetimesReported','sameQuoteIntervalsCovered'])evidenceNeed(evidenceCount(scope[key]));
  evidenceNeed(scope.catalogRecordsInspected===coverage.recordsReceived && scope.sameQuoteCandidates===group.tokens.length && scope.modeChecksAttempted===coverage.modeChecks);
  evidenceNeed(Number(scope.sameQuoteModeVerified)<=group.tokens.length && Number(scope.sameQuoteLifetimesReported)<=Number(scope.sameQuoteModeVerified) && Number(scope.sameQuoteIntervalsCovered)<=Number(scope.sameQuoteModeVerified));
  const scoped=coverage.discovery?.strategy==='provider_quote_mint' && coverage.discovery.quoteMint===token.quoteMint;
  const universe=scoped?coverage.providerReportedTotal:null;
  evidenceNeed(scope.providerReportedUniverse===universe && scope.universeScope===(scoped?'all_modes_live_platform_pools_for_exact_quote':'unknown') && scope.uninspectedCatalogCount===(universe===null?null:Math.max(0,universe-group.tokens.length)));
  evidenceNeed(ranking.state==='withheld' && ranking.reason==='nonexhaustive_sample_not_reward_order' && ranking.ecosystemLeader===null);
  evidenceNeed(e.summary===(i.state==='covered'?'observed_interval':l.state==='reported'?'reported_lifetime':m.state==='verified_reward'?'mechanism_verified':m.state==='verified_standard'?'standard_mode':'unverified'));
  return {state:'ready',value:raw};
 }catch{return {state:'invalid',value:null};}
}

/** Existing dossier route: token identity only, never a frozen pair selection or sample. */
export function tokenResearchPath(mint: string): string {
 if(!validMint(mint))throw Error('Invalid token identity');
 return '/?mint='+encodeURIComponent(mint);
}
export function tokenResearchUrl(mint: string, origin: string): string {
 const base=new URL(origin);
 if(!['https:','http:'].includes(base.protocol) || base.username || base.password || base.pathname!=='/' || base.search || base.hash)throw Error('Invalid research origin');
 return new URL(tokenResearchPath(mint),base.origin).href;
}

/** Scan precision only; greater precision, raw source links and dates remain in Details. */
export function screenUsd(value: number | null): string {
 if(value===null || !Number.isFinite(value) || value<0)return '—';
 if(value>0 && value<0.01)return '$'+value.toExponential(2);
 return '$'+new Intl.NumberFormat('en-US',{notation:value>=1000?'compact':'standard',maximumFractionDigits:value>=1000?1:2}).format(value);
}

/** Only reported USD snapshots participate; an absent value is never zero. */
export function marketValue(token: PairToken, metric: 'liquidity' | 'volume'): number | null {
 const market=token.catalog?.market;
 const value=market?.status==='reported_snapshot' ? market[metric==='liquidity'?'liquidityUsd':'volume24hUsd'] : null;
 return typeof value==='number' && Number.isFinite(value) && value>=0 ? value : null;
}

/** Reorder the fetched exact-mint sample, without mutating it or claiming wider coverage. */
export function sortSample(tokens: readonly PairToken[], quoteMint: string, sort: SampleSort = DEFAULT_SAMPLE_SORT): PairToken[] {
 const name=(a:PairToken,b:PairToken)=>a.name.localeCompare(b.name,'en') || a.symbol.localeCompare(b.symbol,'en') || a.mint.localeCompare(b.mint,'en');
 return tokens.filter(token=>token.quoteMint===quoteMint).sort((a,b)=>{
  if(sort==='name')return name(a,b);
  const av=marketValue(a,sort),bv=marketValue(b,sort);
  if(av===null)return bv===null?name(a,b):1;
  if(bv===null)return -1;
  return bv-av || name(a,b);
 });
}
