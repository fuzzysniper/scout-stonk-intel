/** Inactive operator diagnostics for recorded receipts. No I/O, retries or eligibility decisions. */
import { parseHistoryTimestamp } from './history';
import { isSolanaMint } from './solana';
export const DIAGNOSTIC_LIMITS=Object.freeze({receipts:48,bytes:2*1024*1024,transportSeconds:300,lifetimeSeconds:300,applicationCacheSeconds:300});
type Age={state:'reported';seconds:number}|{state:'not_recorded'|'invalid';seconds:null};
export type RecordedRewardReceipt={source:string;receivedAt:string;providerGeneratedAt:string|null;headers:Record<string,string>;bodySha256:string;requestStartedAt?:string};
export type RewardReceiptDiagnostic={
 state:'diagnosed'|'invalid_evidence';source:string|null;receivedAt:string|null;providerGeneratedAt:string|null;bodySha256:string|null;
 transport:{age:Age;sourceAge:Age;atReceipt:'within_recorded_limit'|'stale'|'invalid'|'not_recorded';lowerBoundSecondsAtAnalysis:number|null};
 clocks:{residenceSeconds:number|null;providerAgeSecondsAtReceipt:number|null;providerAgeSecondsAtAnalysis:number|null;dateAgeSecondsAtReceipt:number|null;requestDurationSeconds:number|null};
 lifetimeClock:'within_recorded_limit'|'stale'|'future'|'not_recorded';
 advertisedMaxAgeSeconds:number|null;pastAdvertisedMaxAge:boolean|null;
 knownVisibilityBudgetAtReceiptSeconds:number|null;heldPastKnownVisibilityBudget:boolean|null;
 conditionalValidatorsRecorded:boolean;eligibility:'not_evaluated';
};
const object=(v:unknown):v is Record<string,unknown>=>!!v && typeof v==='object' && !Array.isArray(v);
const emptyAge=():Age=>({state:'not_recorded',seconds:null});
function age(v:unknown):Age {
 if(v===undefined)return emptyAge();
 if(typeof v!=='string' || !/^\d{1,16}$/.test(v) || !Number.isSafeInteger(Number(v)))return {state:'invalid',seconds:null};
 return {state:'reported',seconds:Number(v)};
}
export function diagnoseRewardReceipt(input:unknown,asOf:string):RewardReceiptDiagnostic {
 const report:RewardReceiptDiagnostic={state:'invalid_evidence',source:null,receivedAt:null,providerGeneratedAt:null,bodySha256:null,
  transport:{age:emptyAge(),sourceAge:emptyAge(),atReceipt:'not_recorded',lowerBoundSecondsAtAnalysis:null},
  clocks:{residenceSeconds:null,providerAgeSecondsAtReceipt:null,providerAgeSecondsAtAnalysis:null,dateAgeSecondsAtReceipt:null,requestDurationSeconds:null},
  lifetimeClock:'not_recorded',advertisedMaxAgeSeconds:null,pastAdvertisedMaxAge:null,knownVisibilityBudgetAtReceiptSeconds:null,
  heldPastKnownVisibilityBudget:null,conditionalValidatorsRecorded:false,eligibility:'not_evaluated'};
 const now=parseHistoryTimestamp(asOf);
 if(!object(input) || now===null || !object(input.headers) || Object.keys(input.headers).length>32)return report;
 const match=typeof input.source==='string'?/^https:\/\/www\.stonkfun\.xyz\/api\/v2\/tokens\/([^/]+)\/rewards$/.exec(input.source):null;
 const received=parseHistoryTimestamp(input.receivedAt),generated=input.providerGeneratedAt===null?null:parseHistoryTimestamp(input.providerGeneratedAt);
 if(!match || !isSolanaMint(match[1]) || received===null || received>now ||
    (input.providerGeneratedAt!==null && generated===null) || typeof input.bodySha256!=='string' || !/^[a-f0-9]{64}$/.test(input.bodySha256))return report;
 let started:number|null=null;
 if(input.requestStartedAt!==undefined){started=parseHistoryTimestamp(input.requestStartedAt);if(started===null || started>received)return report;}
 const h:Record<string,unknown>={};
 for(const [key,value] of Object.entries(input.headers)){
  const name=key.toLowerCase();if(name in h || key.length>64 || typeof value!=='string' || value.length>1024)return report;h[name]=value;
 }
 report.state='diagnosed';report.source=input.source as string;report.receivedAt=new Date(received).toISOString();
 report.providerGeneratedAt=generated===null?null:new Date(generated).toISOString();report.bodySha256=input.bodySha256;
 const residence=(now-received)/1000,providerReceived=generated===null?null:(received-generated)/1000;
 report.clocks.residenceSeconds=residence;report.clocks.providerAgeSecondsAtReceipt=providerReceived;
 report.clocks.providerAgeSecondsAtAnalysis=generated===null?null:(now-generated)/1000;
 report.clocks.requestDurationSeconds=started===null?null:(received-started)/1000;
 // HTTP Date and Age are distinct clocks. This is a lower bound, not the full
 // RFC corrected-age algorithm or proof of which CDN/proxy supplied the body.
 if(typeof h.date==='string' && h.date.length<=64){const date=Date.parse(h.date);if(Number.isFinite(date) && new Date(date).toUTCString()===h.date)report.clocks.dateAgeSecondsAtReceipt=(received-date)/1000;}
 const ages=[age(h.age),age(h['source-age'])];[report.transport.age,report.transport.sourceAge]=ages;
 const known=ages.flatMap(a=>a.state==='reported'?[a.seconds]:[]);
 report.transport.atReceipt=ages.some(a=>a.state==='invalid')?'invalid':known.some(s=>s>DIAGNOSTIC_LIMITS.transportSeconds)?'stale':known.length?'within_recorded_limit':'not_recorded';
 if(known.length && !ages.some(a=>a.state==='invalid'))report.transport.lowerBoundSecondsAtAnalysis=Math.max(...known)+residence;
 const providerNow=report.clocks.providerAgeSecondsAtAnalysis;
 report.lifetimeClock=providerNow===null?'not_recorded':providerNow<0?'future':providerNow>DIAGNOSTIC_LIMITS.lifetimeSeconds?'stale':'within_recorded_limit';
 if(typeof h['cache-control']==='string'){
  const matches=[...h['cache-control'].matchAll(/(?:^|,)\s*max-age\s*=\s*(\d+)\s*(?=,|$)/gi)];
  if(matches.length===1 && Number.isSafeInteger(Number(matches[0][1])))report.advertisedMaxAgeSeconds=Number(matches[0][1]);
 }
 if(report.advertisedMaxAgeSeconds!==null && report.transport.age.state==='reported')report.pastAdvertisedMaxAge=report.transport.age.seconds>report.advertisedMaxAgeSeconds;
 if(known.length && !ages.some(a=>a.state==='invalid') && providerReceived!==null && providerReceived>=0){
  report.knownVisibilityBudgetAtReceiptSeconds=Math.max(0,Math.min(DIAGNOSTIC_LIMITS.applicationCacheSeconds,DIAGNOSTIC_LIMITS.transportSeconds-Math.max(...known),DIAGNOSTIC_LIMITS.lifetimeSeconds-providerReceived));
  report.heldPastKnownVisibilityBudget=residence>report.knownVisibilityBudgetAtReceiptSeconds;
 }
 report.conditionalValidatorsRecorded='etag' in h || 'last-modified' in h;
 return report;
}
export function diagnoseRewardReceipts(input:unknown):{kind:'offline_recorded_reward_clocks';asOf:string;eligibility:'not_evaluated';receipts:RewardReceiptDiagnostic[]} {
 if(!object(input) || typeof input.asOf!=='string' || parseHistoryTimestamp(input.asOf)===null || !Array.isArray(input.receipts) || input.receipts.length>DIAGNOSTIC_LIMITS.receipts)throw Error('invalid_bounded_evidence');
 return {kind:'offline_recorded_reward_clocks',asOf:input.asOf,eligibility:'not_evaluated',receipts:input.receipts.map(r=>diagnoseRewardReceipt(r,input.asOf as string))};
}
