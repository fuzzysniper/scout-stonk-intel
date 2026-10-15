/** Pure, bounded offline gates. No network, clock reads, persistence or active integration. */
import { isSolanaMint } from './solana';
import { parseHistoryTimestamp, STALE_AFTER_MS, MAX_GAP_MS } from './history';
import { calculateSignals, SIGNAL_PERIOD_MS } from './signals';
import type { PairCatalog, PairGroup, PairQuote, PairQuoteRegistry, PairSource, PairToken } from './pairs-contract';
import type { SourceResult } from './history-source';
import type { TrackedToken } from './tracked-tokens';
import type { PulseAmount, PulseCandidate, PulseCandidateInput, PulseCandidateReport, PulseDistribution, PulseInput, PulseMetric, PulsePeriod, PulseRead, PulseReason, PulseReport, PulseSnapshot } from './pair-pulse-contract';
export type * from './pair-pulse-contract';

export const PULSE_LIMITS = Object.freeze({ catalogTokens: 50, registryQuotes: 100, trackedTokens: 10,
 pointsPerToken: 1024, sourceRecords: 15, sourceAgeMs: 300_000,
 observationAgeMs: STALE_AFTER_MS, crossTokenToleranceMs: 0, periodMs: SIGNAL_PERIOD_MS });
const REGISTRY='https://www.stonkfun.xyz/api/public/v1/pairs';
const CATALOG='https://www.stonkfun.xyz/api/public/v1/tokens';
const HISTORY='https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json';
const LEGACY='https://www.stonkfun.xyz/api/public/v1/tokens/';
const MODE='https://www.stonkfun.xyz/api/v2/tokens/';
const PROGRAMS=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
class Gate extends Error { constructor(readonly reason: PulseReason, readonly details: string[] = []) { super(reason); } }
function need(value: unknown, reason: PulseReason): asserts value { if(!value)throw new Gate(reason); }
const object=(v:unknown):v is Record<string,unknown>=>!!v && typeof v==='object' && !Array.isArray(v);
const integer=(v:unknown,max:number)=>typeof v==='number' && Number.isSafeInteger(v) && v>=0 && v<=max;
const text=(v:unknown,max:number):v is string=>typeof v==='string' && v.length>0 && v.length<=max && !/[\p{Cc}\p{Cs}]/u.test(v);
const mint=(v:unknown):v is string=>typeof v==='string' && isSolanaMint(v);
const hash=(v:unknown):v is string=>typeof v==='string' && /^sha256:[a-f0-9]{64}$/.test(v);
const iso=(t:number)=>new Date(t).toISOString();
function time(v:unknown,reason:PulseReason):number { const t=parseHistoryTimestamp(v);need(t!==null,reason);return t; }
function dateAge(v:unknown,asOf:number,max:number,reason:PulseReason):number {
 const t=time(v,reason);need(t<=asOf,'source_future');need(asOf-t<=max,reason);return t;
}
function source(s:PairSource,asOf:number):PairSource {
 need(object(s) && text(s.source,2048),'invalid_source');need(hash(s.revision),'source_revision_invalid');
 const fetched=dateAge(s.fetchedAt,asOf,PULSE_LIMITS.sourceAgeMs,'source_stale');
 const generated=time(s.providerGeneratedAt,'invalid_source');
 need(generated<=asOf+60_000 && generated<=fetched+60_000,'source_future');need(asOf-generated<=STALE_AFTER_MS,'source_stale');
 return {source:s.source,fetchedAt:s.fetchedAt,providerGeneratedAt:s.providerGeneratedAt,revision:s.revision};
}
function sameSource(a:PairSource,b:PairSource) { return a.source===b.source && a.revision===b.revision && a.fetchedAt===b.fetchedAt && a.providerGeneratedAt===b.providerGeneratedAt; }
function read<T>(s:PulseRead<T>,kind:'registry'|'catalog'|'history'):T {
 need(object(s),'invalid_input');
 if(s.state!=='ready') {need(['partial','unavailable','rate_limited'].includes(s.state),'invalid_input');throw new Gate(`${kind}_${s.state}` as PulseReason);}
 need(object(s.value),'invalid_input');return s.value;
}
function withheld(reason:PulseReason,details:string[]=[]):Extract<PulseMetric<never>,{state:'withheld'}> {return {state:'withheld',confidence:'withheld',value:null,reasons:[reason],details:[...details]};}
function attempt<T>(fn:()=>T,confidence:'snapshot_only'|'coverage_passed'='coverage_passed'):PulseMetric<T> {
 try{return {state:'available',confidence,value:fn()};}catch(e){return withheld(e instanceof Gate?e.reason:'invalid_input',e instanceof Gate?e.details:[]);}
}
function identity(q:PairQuote) {
 need(object(q) && mint(q.quoteMint) && text(q.quoteSymbol,32) && text(q.quoteName,160) && integer(q.decimals,18) && PROGRAMS.includes(q.tokenProgram),'quote_unverified');
 need(q.verification==='official_registry_only' && typeof q.symbolAmbiguous==='boolean' && typeof q.providerSymbolAmbiguous==='boolean' && integer(q.symbolMatchCount,1024) && q.symbolMatchCount>0 && q.symbolAmbiguous===(q.providerSymbolAmbiguous || q.symbolMatchCount>1),'quote_unverified');
}
function verifiedQuote(r:PairQuoteRegistry,qm:string,now:number):PairQuote {
 need(r.schemaVersion===1 && r.dataset?.scope==='official_quote_registry','registry_invalid');
 need(r.status!=='unavailable' && r.dataset.sourceStatus!=='unavailable','registry_unavailable');
 need(r.status==='available' && ['available','cached'].includes(r.dataset.sourceStatus),'quote_unverified');
 need(Array.isArray(r.quotes) && r.quotes.length<=PULSE_LIMITS.registryQuotes,'input_limit_exceeded');
 const c=r.dataset.coverage;
 need(c?.registryResponse==='validated_unpaginated' && c.tokenCatalogComplete===false && integer(c.registryCount,1024) && integer(c.matchedCount,1024) && c.matchedCount!<=c.registryCount! && c.returnedCount===r.quotes.length && c.returnedCount<=c.matchedCount!,'registry_invalid');
 need(integer(r.search?.limit,100) && r.search.limit>0 && integer(r.search.offset,1024) && r.quotes.length<=r.search.limit && (r.search.mint===null || r.search.mint===qm),'registry_invalid');
 const seen=new Set<string>();for(const q of r.quotes){identity(q);need(!seen.has(q.quoteMint),'registry_invalid');seen.add(q.quoteMint);}
 need(r.dataset.provenance!==null,'registry_invalid');const p=source(r.dataset.provenance,now);need(p.source===REGISTRY,'invalid_source');
 need(r.dataset.dataFetchedAt===p.fetchedAt,'registry_invalid');dateAge(r.dataset.fetchedAt,now,PULSE_LIMITS.sourceAgeMs,'registry_stale');
 const q=r.quotes.find(q=>q.quoteMint===qm);need(q,'quote_unverified');need(q.verifiedAt===p.fetchedAt,'quote_unverified');return {quoteMint:q.quoteMint,quoteSymbol:q.quoteSymbol,quoteName:q.quoteName,decimals:q.decimals,tokenProgram:q.tokenProgram,symbolAmbiguous:q.symbolAmbiguous,providerSymbolAmbiguous:q.providerSymbolAmbiguous,symbolMatchCount:q.symbolMatchCount,verification:'official_registry_only',verifiedAt:q.verifiedAt};
}
function catalogGroup(c:PairCatalog,q:PairQuote,now:number):PairGroup {
 need(c.schemaVersion===1 && c.dataset?.scope==='bounded_official_catalog','catalog_invalid');
 need(c.status!=='unavailable' && c.dataset.sourceStatus!=='unavailable','catalog_unavailable');
 need(['available','degraded'].includes(c.status) && ['available','cached','degraded'].includes(c.dataset.sourceStatus),'catalog_invalid');
 need(Array.isArray(c.groups) && c.groups.length===1,'unverified_catalog_scope');const g=c.groups[0],cov=c.dataset.coverage;
 need(cov?.complete===false && cov.atomic===false && cov.discovery?.strategy==='provider_quote_mint' && cov.discovery.quoteMint===q.quoteMint && cov.discovery.providerReportedTotalScope==='quote_mint','unverified_catalog_scope');
 need(g.quoteMint===q.quoteMint && g.quoteSymbol===q.quoteSymbol && g.quoteName===q.quoteName && g.decimals===q.decimals && g.tokenProgram===q.tokenProgram && g.symbolAmbiguous===q.symbolAmbiguous,'quote_identity_mismatch');
 need(Array.isArray(g.tokens) && g.tokens.length<=PULSE_LIMITS.catalogTokens && Array.isArray(c.dataset.sources) && c.dataset.sources.length<=PULSE_LIMITS.sourceRecords,'input_limit_exceeded');
 need(cov.pageLimit===2 && cov.pageSize===25 && integer(cov.pagesFetched,2) && cov.pagesFetched>0 && integer(cov.recordsReceived,cov.pagesFetched*25) && integer(cov.rejectedRecords,cov.recordsReceived) && cov.tokensReturned===g.tokens.length && cov.tokensReturned+cov.rejectedRecords<=cov.recordsReceived && cov.modeCheckLimit===12 && integer(cov.modeChecks,12),'catalog_invalid');
 need(cov.providerReportedTotal===null || integer(cov.providerReportedTotal,Number.MAX_SAFE_INTEGER),'catalog_invalid');
 dateAge(c.dataset.fetchedAt,now,PULSE_LIMITS.sourceAgeMs,'catalog_stale');dateAge(c.dataset.dataFetchedAt,now,PULSE_LIMITS.sourceAgeMs,'catalog_stale');
 need(g.verification===(g.tokens.length?'official_registry_catalog_match':'official_registry_only') && g.availability===(g.tokens.length?'tokens_in_bounded_sample':'no_tokens_in_bounded_sample'),'catalog_invalid');
 const pageUrls=Array.from({length:cov.pagesFetched},(_,i)=>CATALOG+'?sort=marketCap&page='+(i+1)+'&pageSize=25&quoteMint='+q.quoteMint);
 const seenSources=new Set<string>();for(const p of c.dataset.sources){source(p,now);need(!seenSources.has(p.source),'catalog_invalid');seenSources.add(p.source);need(p.source===REGISTRY || pageUrls.includes(p.source) || g.tokens.some(t=>p.source===MODE+t.mint+'/rewards'),'invalid_source');}
 need(seenSources.has(REGISTRY) && pageUrls.every(u=>seenSources.has(u)),'invalid_source');
 const gp=source(g.provenance,now);need(g.source===REGISTRY && g.verifiedAt===gp.fetchedAt && c.dataset.sources.some(p=>sameSource(p,gp)),'quote_unverified');
 const seen=new Set<string>();for(const t of g.tokens){
  need(mint(t.mint) && mint(t.poolMint) && text(t.symbol,32) && text(t.name,160) && !seen.has(t.mint),'catalog_invalid');seen.add(t.mint);
  need(t.quoteMint===q.quoteMint && t.quoteSymbol===q.quoteSymbol,'quote_identity_mismatch');
  const p=source(t.provenance,now);need(t.source===p.source && t.verifiedAt===p.fetchedAt && pageUrls.includes(p.source) && c.dataset.sources.some(s=>sameSource(s,p)),'invalid_source');
 }
 return g;
}
function snapshot(t:PairToken,c:PairCatalog,now:number):PulseSnapshot {
 const m=t.market;need(object(m) && m.status==='reported_snapshot','market_snapshot_missing');
 need(m.unit==='USD' && m.observedAt===null && [m.liquidityUsd,m.volume24hUsd].every(v=>v===null || (typeof v==='number' && Number.isFinite(v) && v>=0)),'market_snapshot_invalid');
 need(m.liquidityUsd!==null || m.volume24hUsd!==null,'market_snapshot_missing');const p=source(t.provenance,now);
 need(m.providerGeneratedAt===p.providerGeneratedAt,'market_snapshot_invalid');
 return {kind:'provider_reported_snapshot_not_trend',unit:'USD',liquidityUsd:m.liquidityUsd,volume24hUsd:m.volume24hUsd,observedAt:null,providerGeneratedAt:p.providerGeneratedAt,fetchedAt:p.fetchedAt,sourceQuality:c.dataset.sourceStatus as PulseSnapshot['sourceQuality'],provenance:p};
}
/** Exact arithmetic of the received decimal representation, without rounding into eligibility. */
function atoms(value:unknown,decimals:number):bigint {
 need(typeof value==='number' && Number.isFinite(value) && value>=0,'invalid_observation');
 const m=/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(value));need(m,'counter_precision_unsafe');
 const digits=m[1]+(m[2]??''),power=decimals+Number(m[3]??0)-(m[2]?.length??0);let n=BigInt(digits);
 if(n===0n)return n;
 if(power<0){need(-power<=digits.length,'counter_precision_unsafe');const d=10n**BigInt(-power);need(n%d===0n,'counter_precision_unsafe');n/=d;}
 else {need(power<=16,'counter_precision_unsafe');n*=10n**BigInt(power);}
 need(n<=BigInt(Number.MAX_SAFE_INTEGER),'counter_precision_unsafe');return n;
}
function amount(n:bigint,decimals:number):PulseAmount {
 const sign=n<0n?'-':'';const digits=(n<0n?-n:n).toString().padStart(decimals+1,'0');
 const tokens=decimals?digits.slice(0,-decimals)+'.'+digits.slice(-decimals):digits;
 return {atomic:n.toString(),tokens:sign+tokens};
}
function historyInput(h:SourceResult,c:PairCatalog,now:number):SourceResult {
 const d=h.dataset;need(object(d) && ['available','cached','degraded','unavailable'].includes(d.sourceStatus),'history_invalid');
 if(d.sourceStatus==='degraded')throw new Gate('history_partial');
 need(['available','cached'].includes(d.sourceStatus),'history_unavailable');need(object(h.store),'history_invalid');
 need(d.kind==='github_snapshot' && d.source===HISTORY && hash(d.revision),'history_invalid');dateAge(d.dataFetchedAt,now,PULSE_LIMITS.sourceAgeMs,'history_stale');
 need(c.dataset.history?.source===d.source && c.dataset.history.revision===d.revision,'history_source_mismatch');
 need(['available','cached'].includes(c.dataset.history.sourceStatus),'history_partial');dateAge(c.dataset.history.dataFetchedAt,now,PULSE_LIMITS.sourceAgeMs,'history_stale');return h;
}
function distribution(t:PairToken,c:PairCatalog,q:PairQuote,h:SourceResult,tracked:readonly TrackedToken[],now:number,end:number):PulseDistribution {
 need(c.status==='available' && ['available','cached'].includes(c.dataset.sourceStatus) && c.dataset.coverage.rejectedRecords===0,'catalog_partial');
 need(t.mode==='reward' && t.rewardModeVerified===true && t.modeVerification==='verified_reward' && t.rewardSource!==null,'reward_mode_unverified');
 const mp=source(t.rewardSource,now);need(mp.source===MODE+t.mint+'/rewards' && c.dataset.sources.some(p=>sameSource(p,mp)),'invalid_source');
 const expected=tracked.find(v=>v.mint===t.mint);need(expected,'token_not_tracked');
 need(expected.quoteMint===q.quoteMint && expected.quoteSymbol===q.quoteSymbol && expected.poolMint===t.poolMint && expected.source===LEGACY+t.mint+'/rewards','tracked_identity_mismatch');
 need(mint(expected.poolMint) && text(expected.symbol,32) && text(expected.name,80) && parseHistoryTimestamp(expected.verifiedAt)!==null && time(expected.verifiedAt,'tracked_identity_mismatch')<=now && expected.discoverySource===CATALOG+'?limit=20','tracked_identity_mismatch');
 const raw=h.store?.[t.mint];need(Array.isArray(raw) && raw.length>0,'no_history');need(raw.length<=PULSE_LIMITS.pointsPerToken,'input_limit_exceeded');
 const times=new Set<number>();let latest=-Infinity;const used:Record<string,unknown>[]=[];
 for(const row of raw){
  need(object(row),'invalid_observation');const at=time(row.observedAt,'invalid_observation');need(at<=now,'source_future');need(!times.has(at),'duplicate_observation');times.add(at);latest=Math.max(latest,at);
  // Never silently delete malformed/future/duplicate points to manufacture coverage.
  if(at>end || at<end-2*SIGNAL_PERIOD_MS)continue;
  need(row.quoteMint===q.quoteMint && row.quoteSymbol===q.quoteSymbol && row.source===expected.source && row.mode==='reward','invalid_observation');
  need(row.payoutCount==null || integer(row.payoutCount,Number.MAX_SAFE_INTEGER),'invalid_observation');atoms(row.distributedTokens,q.decimals);
  const generated=time(row.providerGeneratedAt,'provider_time_missing');need(generated<=at+60_000 && generated<=now,'source_future');need(at-generated<=STALE_AFTER_MS,'source_stale');used.push(row);
 }
 need(t.historyStatus==='recorded' && t.historyFreshness==='fresh' && t.observationCount===raw.length && parseHistoryTimestamp(t.lastObservedAt)===latest,'history_metadata_mismatch');
 const bounded=raw.filter(r=>object(r) && time(r.observedAt,'invalid_observation')<=end);
 const signals=calculateSignals({[t.mint]:bounded},t.mint,{mint:q.quoteMint,symbol:q.quoteSymbol},h.dataset.sourceStatus,new Date(now));
 if(signals.status!=='available')throw new Gate('history_coverage_failed',signals.reasons);
 const getPeriod=(start:number,finish:number):PulsePeriod=>{
  const points=used.filter(r=>time(r.observedAt,'invalid_observation')>=start && time(r.observedAt,'invalid_observation')<=finish).sort((a,b)=>time(a.observedAt,'invalid_observation')-time(b.observedAt,'invalid_observation'));
  const a=points[0],b=points.at(-1);need(a && b && time(a.observedAt,'invalid_observation')===start && time(b.observedAt,'invalid_observation')===finish,'observation_period_unaligned');
  const pa=time(a.providerGeneratedAt,'provider_time_missing'),pb=time(b.providerGeneratedAt,'provider_time_missing');need(pb-pa===SIGNAL_PERIOD_MS,'provider_period_unaligned');
  const gaps=points.slice(1).map((r,i)=>(time(r.observedAt,'invalid_observation')-time(points[i].observedAt,'invalid_observation'))/1000);
  for(let i=1;i<points.length;i++){const gap=time(points[i].providerGeneratedAt,'provider_time_missing')-time(points[i-1].providerGeneratedAt,'provider_time_missing');need(gap>0 && gap<MAX_GAP_MS,'provider_sequence_invalid');}
  const delta=atoms(b.distributedTokens,q.decimals)-atoms(a.distributedTokens,q.decimals);need(delta>=0n,'invalid_observation');
  return {startAt:iso(start),endAt:iso(finish),providerStartAt:iso(pa),providerEndAt:iso(pb),seconds:86400,observationCount:points.length,maxGapSeconds:Math.max(...gaps),distributed:amount(delta,q.decimals)};
 };
 // Signal Lab guards gaps/resets; V0 additionally requires all three exact boundaries.
 const current=getPeriod(end-SIGNAL_PERIOD_MS,end),previous=getPeriod(end-2*SIGNAL_PERIOD_MS,end-SIGNAL_PERIOD_MS);
 return {kind:'observed_aggregate_counter_change',quoteMint:q.quoteMint,decimals:q.decimals,current,previous,
  change:amount(BigInt(current.distributed.atomic)-BigInt(previous.distributed.atomic),q.decimals),interpretation:'not_payout_reconciliation_or_holder_return',
  history:{source:h.dataset.source,revision:h.dataset.revision!,dataFetchedAt:h.dataset.dataFetchedAt!},modeSource:mp,catalogSource:source(t.provenance,now)};
}
function candidate(m:unknown):PulseCandidate {return {mint:mint(m)?m:null,symbol:null,distribution:withheld('invalid_input'),snapshot:withheld('invalid_input')};}
/** Same private source/identity/history/precision/period gates as comparePairPulse. */
export function evaluatePairPulseCandidate(input:PulseCandidateInput):PulseCandidateReport {
 const report:PulseCandidateReport={policy:'pair-pulse-v0-strict',evaluatedAt:null,endAt:null,candidate:candidate(input?.tokenMint)};
 try {
  need(object(input),'invalid_input');const now=time(input.asOf,'invalid_reference_time'),end=time(input.endAt,'invalid_period');report.evaluatedAt=iso(now);report.endAt=iso(end);
  need(end<=now && now-end<=STALE_AFTER_MS && end>=2*SIGNAL_PERIOD_MS,'invalid_period');need(mint(input.quoteMint),'quote_unverified');need(mint(input.tokenMint),'invalid_input');
  need(Array.isArray(input.tracked) && input.tracked.length<=PULSE_LIMITS.trackedTokens,'input_limit_exceeded');const seen=new Set<string>();
  for(const t of input.tracked){need(object(t) && mint(t.mint) && !seen.has(t.mint),'tracked_identity_mismatch');seen.add(t.mint);}
  const q=verifiedQuote(read(input.registry,'registry'),input.quoteMint,now),c=read(input.catalog,'catalog'),g=catalogGroup(c,q,now);
  const token=g.tokens.find(t=>t.mint===input.tokenMint);need(token,'candidate_not_in_sample');report.candidate.symbol=token.symbol;
  report.candidate.snapshot=attempt(()=>snapshot(token,c,now),'snapshot_only');
  report.candidate.distribution=attempt(()=>distribution(token,c,q,historyInput(read(input.history,'history'),c,now),input.tracked,now,end));
 } catch(e) {const code=e instanceof Gate?e.reason:'invalid_input';report.candidate.distribution=withheld(code);report.candidate.snapshot=withheld(code);}
 return report;
}
/** Consumers must keep the individual gates AND comparison gate, never sort by a withheld value. */
export function comparePairPulse(input:PulseInput):PulseReport {
 const report:PulseReport={schemaVersion:1,policy:'pair-pulse-v0-strict',evaluatedAt:null,endAt:null,quote:null,registrySource:null,
  scope:{kind:'selected_two_from_bounded_scoped_sample',complete:false,atomic:false},left:candidate(input?.leftMint),right:candidate(input?.rightMint),comparison:withheld('invalid_input'),
  unsupported:{marketTrend:withheld('historical_market_observations_missing'),quoteRelativeReturn:withheld('synchronized_quote_prices_missing'),holderRoi:withheld('holder_cashflows_missing'),economicLeadership:{...withheld('economic_leadership_not_established'),reasons:['economic_leadership_not_established','historical_market_observations_missing','synchronized_quote_prices_missing','holder_cashflows_missing']}}};
 try {
  need(object(input),'invalid_input');const now=time(input.asOf,'invalid_reference_time'),end=time(input.endAt,'invalid_period');report.evaluatedAt=iso(now);report.endAt=iso(end);
  need(end<=now && now-end<=STALE_AFTER_MS && end>=2*SIGNAL_PERIOD_MS,'invalid_period');need(mint(input.quoteMint),'quote_unverified');
  need(mint(input.leftMint) && mint(input.rightMint),'invalid_input');need(input.leftMint!==input.rightMint,'duplicate_candidate');
  need(Array.isArray(input.tracked) && input.tracked.length<=PULSE_LIMITS.trackedTokens,'input_limit_exceeded');const seen=new Set<string>();
  for(const t of input.tracked){need(object(t) && mint(t.mint) && !seen.has(t.mint),'tracked_identity_mismatch');seen.add(t.mint);}
  const registry=read(input.registry,'registry'),q=verifiedQuote(registry,input.quoteMint,now);report.quote=q;report.registrySource=source(registry.dataset.provenance!,now);
  const c=read(input.catalog,'catalog'),g=catalogGroup(c,q,now);
  const h=attempt(()=>historyInput(read(input.history,'history'),c,now));
  const evaluate=(out:PulseCandidate,id:string)=>{
   const t=g.tokens.find(t=>t.mint===id);if(!t){out.distribution=withheld('candidate_not_in_sample');out.snapshot=withheld('candidate_not_in_sample');return;}
   out.symbol=t.symbol;out.snapshot=attempt(()=>snapshot(t,c,now),'snapshot_only');
   out.distribution=h.state==='withheld'?{...h,reasons:[...h.reasons],details:[...h.details]}:attempt(()=>distribution(t,c,q,h.value,input.tracked,now,end));
  };
  evaluate(report.left,input.leftMint);evaluate(report.right,input.rightMint);
  report.comparison=attempt(()=>{
   const l=report.left.distribution,r=report.right.distribution;need(l.state==='available' && r.state==='available','candidate_withheld');
   for(const k of ['current','previous'] as const){need(l.value[k].startAt===r.value[k].startAt && l.value[k].endAt===r.value[k].endAt,'observation_period_unaligned');need(l.value[k].providerStartAt===r.value[k].providerStartAt && l.value[k].providerEndAt===r.value[k].providerEndAt,'provider_period_unaligned');}
   return {kind:'left_minus_right_observed_distributions' as const,quoteMint:q.quoteMint,decimals:q.decimals,leftMint:input.leftMint,rightMint:input.rightMint,
    current:amount(BigInt(l.value.current.distributed.atomic)-BigInt(r.value.current.distributed.atomic),q.decimals),
    previous:amount(BigInt(l.value.previous.distributed.atomic)-BigInt(r.value.previous.distributed.atomic),q.decimals),
    change:amount(BigInt(l.value.change.atomic)-BigInt(r.value.change.atomic),q.decimals),currentStartAt:l.value.current.startAt,endAt:l.value.current.endAt,previousStartAt:l.value.previous.startAt,
    interpretation:'activity_difference_not_economic_leadership' as const};
  });
 }catch(e){
  const code=e instanceof Gate?e.reason:'invalid_input';for(const c of [report.left,report.right]){c.distribution=withheld(code);c.snapshot=withheld(code);}report.comparison=withheld(code);
 }
 return report;
}
