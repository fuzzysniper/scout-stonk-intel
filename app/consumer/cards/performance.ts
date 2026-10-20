/** Internal offline arithmetic. A typed series/hash is not source attestation or publication permission. */
import {isSolanaMint} from '../../../lib/solana';
import {CARDS} from './identity';
import {decimalAtomic,percentRatio as pct,percentText,compareRatios} from './decimal';
export const PERFORMANCE_POLICY='cards-observed-24h-v2' as const;
export type MarketObservation={kind:'actual_market_observation';observedAt:string;priceQuote:string;liquidityUsd:number|string|null;volume24hUsd:number|string|null;source:string;revision:string};
export type ResearchSeries={mint:string;poolMint:string;quoteMint:string;points:readonly MarketObservation[]};
export type Momentum='early_emerging'|'sustained_expansion'|'consolidation'|'weakening'|'no_clear_pattern'|'insufficient_evidence';
export type PerformanceReason='invalid_identity'|'invalid_period'|'missing_price_history'|'unaligned_window'|'invalid_observation'|'duplicate_observation'|'coverage_gap'|'stale_observations'|'momentum_context_missing'|'cadence_not_comparable';
export type SeriesFinding={state:'withheld';reason:PerformanceReason;momentum:'insufficient_evidence'}|{state:'observed';policy:typeof PERFORMANCE_POLICY;mint:string;poolMint:string;quoteMint:string;startAt:string;endAt:string;observationCount:number;maxGapSeconds:number;appreciationPct:string;observedPeakPriceQuote:string;observedPeakAt:string;maximumDrawdownPct:string;drawdownFromObservedPeakPct:string;momentum:Momentum;momentumReason:'thresholds_met'|'no_pattern'|'momentum_context_missing';interpretation:'sampled_price_change_not_trading_return';publication:'withheld_pending_rights_review'};
export const HOUR=3600000,MAX_GAP=90*60000;
export function utcTime(v:unknown):number|null {
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v))return null;
 const t=Date.parse(v);return Number.isFinite(t)&&new Date(t).toISOString().replace('.000Z','Z')===v.replace('.000Z','Z')?t:null;
}
export function analyzeSeries(series:ResearchSeries,startAt:string,endAt:string,asOf:string):SeriesFinding {
 const deny=(reason:PerformanceReason):SeriesFinding=>({state:'withheld',reason,momentum:'insufficient_evidence'});
 if(!series||!isSolanaMint(series.mint)||!isSolanaMint(series.poolMint)||series.quoteMint!==CARDS.mint||series.mint===series.quoteMint||series.poolMint===series.mint||series.poolMint===series.quoteMint)return deny('invalid_identity');
 const start=utcTime(startAt),end=utcTime(endAt),now=utcTime(asOf);
 if(start===null||end===null||now===null||end-start!==24*HOUR||now<end)return deny('invalid_period');
 if(now-end>MAX_GAP)return deny('stale_observations');
 if(!Array.isArray(series.points)||series.points.length<25)return deny('missing_price_history');
 if(series.points.length>1000)return deny('invalid_observation');
 const points=series.points,prices:bigint[]=[],times:number[]=[];let last=-Infinity,maxGap=0,mid=-1;
 for(let i=0;i<points.length;i++){
  const p=points[i];if(!p||p.source!==points[0]?.source)return deny('invalid_observation');
  const t=utcTime(p.observedAt),price=decimalAtomic(p.priceQuote);
  if(p.kind!=='actual_market_observation'||t===null||price===null||price===0n||typeof p.revision!=='string'||!/^sha256:[a-f0-9]{64}$/.test(p.revision))return deny('invalid_observation');
  try{const u=new URL(p.source);if(u.protocol!=='https:'||u.username||u.password||u.hash)return deny('invalid_observation');}catch{return deny('invalid_observation');}
  if(t===last)return deny('duplicate_observation');
  if(t<last||t<start||t>end)return deny('invalid_observation');
  if(i)maxGap=Math.max(maxGap,t-last);
  if(t===start+12*HOUR)mid=i;
  last=t;prices.push(price);times.push(t);
 }
 if(times[0]!==start||times.at(-1)!==end||mid<0)return deny('unaligned_window');
 if(maxGap>MAX_GAP)return deny('coverage_gap');
 // One actual point at each common hourly boundary. Dense spike sampling cannot
 // dominate the persistence fraction or silently change comparison cadence.
 if(points.length!==25||times.some((time,i)=>time!==start+i*HOUR))return deny('cadence_not_comparable');
 const first=prices[0],middle=prices[mid],final=prices.at(-1)!;
 let peak=first,peakIndex=0,drawdownPeak=first,drawdownTrough=first;
 for(let i=1;i<prices.length;i++){
  const price=prices[i];if(price>peak){peak=price;peakIndex=i;}
  if(price*drawdownPeak<drawdownTrough*peak){drawdownPeak=peak;drawdownTrough=price;}
 }
 const drawdown=pct(peak,final);
 const atLeast=(a:bigint,b:bigint,percent:bigint)=>100n*(b-a)>=percent*a;
 const atMost=(a:bigint,b:bigint,percent:bigint)=>100n*(b-a)<=percent*a;
 const contextAmount=(v:number|string|null,minimum:bigint)=>{const amount=decimalAtomic(typeof v==='number'&&Number.isFinite(v)?String(v):v);return amount!==null&&amount>=minimum*10n**18n;};
 const context=points.every(p=>contextAmount(p.liquidityUsd,10000n)&&contextAmount(p.volume24hUsd,1000n));
 let momentum:Momentum='insufficient_evidence';
 if(context){
  if(atLeast(first,middle,10n)&&(atMost(middle,final,-10n)||atMost(peak,final,-20n)))momentum='weakening';
  else if(atLeast(first,middle,10n)&&atLeast(middle,final,10n)&&prices.filter(p=>p>=first).length*5>=points.length*4)momentum='sustained_expansion';
  else if(atLeast(first,middle,-3n)&&atMost(first,middle,3n)&&atLeast(middle,final,10n)&&atLeast(peak,final,-5n))momentum='early_emerging';
  else if(atLeast(first,middle,10n)&&atLeast(middle,final,-3n)&&atMost(middle,final,3n)&&atLeast(peak,final,-20n))momentum='consolidation';
  else momentum='no_clear_pattern';
 }
 return {state:'observed',policy:PERFORMANCE_POLICY,mint:series.mint,poolMint:series.poolMint,quoteMint:series.quoteMint,startAt,endAt,observationCount:points.length,maxGapSeconds:maxGap/1000,appreciationPct:percentText(pct(first,final)),observedPeakPriceQuote:points[peakIndex].priceQuote,observedPeakAt:points[peakIndex].observedAt,maximumDrawdownPct:percentText(pct(drawdownPeak,drawdownTrough)),drawdownFromObservedPeakPct:percentText(drawdown),momentum,momentumReason:!context?'momentum_context_missing':momentum==='no_clear_pattern'?'no_pattern':'thresholds_met',interpretation:'sampled_price_change_not_trading_return',publication:'withheld_pending_rights_review'};
}
/** Complete eligibility within a declared sample, never ecosystem or holder-return leadership. */
export function compareObserved(series:readonly ResearchSeries[],quoteMint:string,startAt:string,endAt:string,asOf:string){
 if(quoteMint!==CARDS.mint||!Array.isArray(series)||series.length<2||series.length>50||series.some(s=>!s)||new Set(series.map(s=>s.mint)).size!==series.length||new Set(series.map(s=>s.poolMint)).size!==series.length||series.some(s=>s.quoteMint!==quoteMint))return {state:'withheld' as const,reason:'compatible_distinct_exact_quote_sample_required',rows:[]};
 const findings=series.map(s=>analyzeSeries(s,startAt,endAt,asOf));
 if(findings.some(f=>f.state!=='observed'))return {state:'withheld' as const,reason:'every_candidate_must_pass_same_window',rows:[]};
 const ratioByMint=new Map(series.map(s=>[s.mint,[decimalAtomic(s.points[0].priceQuote)!,decimalAtomic(s.points.at(-1)!.priceQuote)!]]));
 const ratio=(a:string,b:string)=>{const x=ratioByMint.get(a)!,y=ratioByMint.get(b)!;return compareRatios(x[0],x[1],y[0],y[1]);};
 const rows=findings.filter((f):f is Extract<SeriesFinding,{state:'observed'}>=>f.state==='observed').sort((a,b)=>-ratio(a.mint,b.mint)||a.mint.localeCompare(b.mint,'en'));
 let rank=1;
 return {state:'observed_sample' as const,complete:false,publication:'withheld_pending_rights_review' as const,rows:rows.map((row,i)=>{if(i&&ratio(row.mint,rows[i-1].mint)!==0)rank=i+1;return {...row,rank};})};
}
