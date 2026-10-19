/** Pure research policy, not a source adapter, forecast, rights grant or live feed. */
import {isSolanaMint} from '../../../lib/solana';
import {CARDS} from './model';
export const PERFORMANCE_POLICY='cards-observed-24h-v1' as const;
export type MarketObservation={kind:'actual_market_observation';observedAt:string;priceQuote:string;liquidityUsd:number|null;volume24hUsd:number|null;source:string;revision:string};
export type ResearchSeries={mint:string;poolMint:string;quoteMint:string;points:readonly MarketObservation[]};
export type Momentum='early_emerging'|'sustained_expansion'|'consolidation'|'weakening'|'no_clear_pattern'|'insufficient_evidence';
export type PerformanceReason='invalid_identity'|'invalid_period'|'missing_price_history'|'unaligned_window'|'invalid_observation'|'duplicate_observation'|'coverage_gap'|'stale_observations'|'momentum_context_missing';
export type SeriesFinding={state:'withheld';reason:PerformanceReason;momentum:'insufficient_evidence'}|{state:'observed';policy:typeof PERFORMANCE_POLICY;mint:string;poolMint:string;quoteMint:string;startAt:string;endAt:string;observationCount:number;maxGapSeconds:number;appreciationPct:string;observedPeakPriceQuote:string;drawdownFromObservedPeakPct:string;momentum:Momentum;momentumReason:'thresholds_met'|'no_pattern'|'momentum_context_missing';interpretation:'sampled_price_change_not_trading_return';publication:'withheld_pending_rights_review'};
const HOUR=3600000,MAX_GAP=90*60000,SCALE=10n**18n;
function decimal(raw:unknown):bigint|null {
 if(typeof raw!=='string'||raw.length>70||!/^(0|[1-9]\d{0,29})(\.\d{1,18})?$/.test(raw))return null;
 const [whole,part='']=raw.split('.');const value=BigInt(whole)*SCALE+BigInt(part.padEnd(18,'0'));return value>0n?value:null;
}
const pct=(a:bigint,b:bigint)=>(b-a)*100000000n/a;
function percent(value:bigint){const sign=value<0n?'-':'';const s=(value<0n?-value:value).toString().padStart(7,'0');return sign+s.slice(0,-6)+'.'+s.slice(-6);}
const timestamp=(v:string)=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&new Date(v).toISOString()===v?Date.parse(v):NaN;
export function analyzeSeries(series:ResearchSeries,startAt:string,endAt:string,asOf:string):SeriesFinding {
 const deny=(reason:PerformanceReason):SeriesFinding=>({state:'withheld',reason,momentum:'insufficient_evidence'});
 if(!isSolanaMint(series.mint)||!isSolanaMint(series.poolMint)||series.quoteMint!==CARDS.mint||series.mint===series.quoteMint)return deny('invalid_identity');
 let start:number,end:number,now:number;
 try{start=timestamp(startAt);end=timestamp(endAt);now=timestamp(asOf);}catch{return deny('invalid_period');}
 if(![start,end,now].every(Number.isFinite)||end-start!==24*HOUR||now<end)return deny('invalid_period');
 if(now-end>MAX_GAP)return deny('stale_observations');
 if(!Array.isArray(series.points)||series.points.length<25)return deny('missing_price_history');
 if(series.points.length>1000)return deny('invalid_observation');
 const points=series.points;let last=-Infinity,maxGap=0,mid=-1;
 const prices:bigint[]=[];const times:number[]=[];
 for(let i=0;i<points.length;i++){
  const p=points[i];if(p.source!==points[0].source)return deny('invalid_observation');let t:number;try{t=timestamp(p.observedAt);}catch{return deny('invalid_observation');}
  const price=decimal(p.priceQuote);
  if(p.kind!=='actual_market_observation'||!Number.isFinite(t)||price===null||!/^sha256:[a-f0-9]{64}$/.test(p.revision))return deny('invalid_observation');
  try{const u=new URL(p.source);if(u.protocol!=='https:'||u.username||u.password||u.hash)return deny('invalid_observation');}catch{return deny('invalid_observation');}
  if(t===last)return deny('duplicate_observation');
  if(t<last||t<start||t>end)return deny('invalid_observation');
  if(i)maxGap=Math.max(maxGap,t-last);
  if(t===start+12*HOUR)mid=i;
  last=t;prices.push(price);times.push(t);
 }
 if(times[0]!==start||times.at(-1)!==end||mid<0)return deny('unaligned_window');
 if(maxGap>MAX_GAP)return deny('coverage_gap');
 const first=prices[0],middle=prices[mid],final=prices.at(-1)!,peak=prices.reduce((a,b)=>a>b?a:b);
 const early=pct(first,middle),late=pct(middle,final),drawdown=pct(peak,final);
 // Corroboration is sampled liquidity and trailing volume, not unique participants.
 const context=points.every(p=>typeof p.liquidityUsd==='number'&&Number.isFinite(p.liquidityUsd)&&p.liquidityUsd>=10000&&typeof p.volume24hUsd==='number'&&Number.isFinite(p.volume24hUsd)&&p.volume24hUsd>=1000);
 let momentum:Momentum='insufficient_evidence';
 if(context){
  if(early>=10000000n&&(late<=-10000000n||drawdown<=-20000000n))momentum='weakening';
  else if(early>=10000000n&&late>=10000000n&&prices.filter(p=>p>=first).length/points.length>=0.8)momentum='sustained_expansion';
  else if(early>=-3000000n&&early<=3000000n&&late>=10000000n&&drawdown>=-5000000n)momentum='early_emerging';
  else if(early>=10000000n&&late>=-3000000n&&late<=3000000n&&drawdown>=-20000000n)momentum='consolidation';
  else momentum='no_clear_pattern';
 }
 const peakIndex=prices.indexOf(peak);
 return {state:'observed',policy:PERFORMANCE_POLICY,mint:series.mint,poolMint:series.poolMint,quoteMint:series.quoteMint,startAt,endAt,observationCount:points.length,maxGapSeconds:maxGap/1000,appreciationPct:percent(pct(first,final)),observedPeakPriceQuote:points[peakIndex].priceQuote,drawdownFromObservedPeakPct:percent(drawdown),momentum,momentumReason:!context?'momentum_context_missing':momentum==='no_clear_pattern'?'no_pattern':'thresholds_met',interpretation:'sampled_price_change_not_trading_return',publication:'withheld_pending_rights_review'};
}
/** Only a comparable observed sample; ties share rank, no ecosystem-leader claim. */
export function compareObserved(series:readonly ResearchSeries[],quoteMint:string,startAt:string,endAt:string,asOf:string){
 if(quoteMint!==CARDS.mint||series.length<2||series.length>50||new Set(series.map(s=>s.mint)).size!==series.length||new Set(series.map(s=>s.poolMint)).size!==series.length||series.some(s=>s.quoteMint!==quoteMint))return {state:'withheld' as const,reason:'compatible_distinct_exact_quote_sample_required',rows:[]};
 const findings=series.map(s=>analyzeSeries(s,startAt,endAt,asOf));
 if(findings.some(f=>f.state!=='observed'))return {state:'withheld' as const,reason:'every_candidate_must_pass_same_window',rows:[]};
 const rows=findings.filter((f):f is Extract<SeriesFinding,{state:'observed'}>=>f.state==='observed').sort((a,b)=>{
  const x=BigInt(a.appreciationPct.replace('.','')),y=BigInt(b.appreciationPct.replace('.',''));return x>y?-1:x<y?1:a.mint.localeCompare(b.mint,'en');
 });
 return {state:'observed_sample' as const,complete:false,publication:'withheld_pending_rights_review' as const,rows:rows.map((row,i)=>({...row,rank:i&&row.appreciationPct===rows[i-1].appreciationPct?rows.findIndex(r=>r.appreciationPct===row.appreciationPct)+1:i+1}))};
}
