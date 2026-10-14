/** Pure bounded replay of recorded public responses. No fetch, clock, cache or writes. */
import { createHash } from 'node:crypto';
import { parseHistoryTimestamp } from './history';
import { isSolanaMint } from './solana';
import { parseCatalogPage, parseQuoteRegistry, PAIR_REGISTRY_URL, TOKEN_CATALOG_URL, REWARD_V2_URL } from './pairs-source';
import type { PairSource } from './pairs-contract';
import type { RewardAuditInput, RewardAuditPacket, RewardAuditReason, PairRewardAudit, AuditedRewardCandidate } from './pair-reward-audit-contract';
export const REWARD_AUDIT_LIMITS = Object.freeze({candidates:4, catalogPageSize:25, sourceAgeMs:300_000, observationSkewMs:60_000, rawDigits:78});
const LIMITATIONS = Object.freeze([
 'Market-cap-selected sample; thousands of uninspected candidates may have larger distributions.',
 'Provider-reported lifetime totals have unknown start/cutoff coverage and unequal launch ages; no common 24h window.',
 'Sequential non-atomic observations; provider generation time is not a payout observation or reconciliation watermark.',
 'Quote-holder Community Mode allocations may be included; fee recipients, pending balances and base-token payouts are excluded.',
 'Ledger basis is a provider assertion, not independent blockchain reconciliation or complete payout-history proof.',
 'Aggregate distributions are not holder ROI, equity ownership, a yield forecast or an investment recommendation.',
]);
function fail(reason: RewardAuditReason): never {throw reason;}
function object(value: unknown): Record<string, unknown> {
 if (!value || typeof value!=='object' || Array.isArray(value)) return fail('invalid_source');
 return value as Record<string, unknown>;
}
function timestamp(value: unknown): number {
 const time=parseHistoryTimestamp(value);if(time===null)return fail('invalid_source');return time;
}
function read(packet:RewardAuditPacket|null, expected:string, asOf:number, maxBytes:number, v2=false):{data:Record<string,unknown>;source:PairSource} {
 if(!packet)return fail('source_missing');
 if(packet.source!==expected)return fail('invalid_source');
 if(packet.status===429)return fail('source_rate_limited');
 if(packet.status!==200)return fail('source_unavailable');
 const fetched=timestamp(packet.fetchedAt);
 if(asOf<fetched || asOf-fetched>REWARD_AUDIT_LIMITS.sourceAgeMs)return fail('stale_source');
 if(packet.ageSeconds!=null && (!Number.isSafeInteger(packet.ageSeconds) || packet.ageSeconds<0 || packet.ageSeconds>300))return fail('stale_source');
 if(typeof packet.body!=='string' || Buffer.byteLength(packet.body)>maxBytes)return fail('invalid_source');
 let data:Record<string,unknown>;
 try {data=object(JSON.parse(packet.body));}catch{return fail('invalid_source');}
 if(data.error!=null)return fail('invalid_source');
 const generated=timestamp(v2?data.generatedAt:object(data.meta).generatedAt);
 if(generated>fetched || asOf-generated>(v2?REWARD_AUDIT_LIMITS.sourceAgeMs:3*3600_000))return fail('stale_source');
 // v2 totals must have been generated within five minutes of the explicit audit
 // time. Registry/catalog metadata uses the established three-hour source gate.
 return {data,source:{source:expected,fetchedAt:new Date(fetched).toISOString(),providerGeneratedAt:new Date(generated).toISOString(),revision:'sha256:'+createHash('sha256').update(packet.body).digest('hex')}};
}
function reason(error:unknown, fallback:RewardAuditReason):RewardAuditReason {
 return typeof error==='string'?error as RewardAuditReason:fallback;
}
function count(value:unknown):number {
 if(typeof value!=='number' || !Number.isSafeInteger(value) || value<0)return fail('invalid_payouts');return value;
}
function decimal(raw:string, decimals:number):string {
 if(decimals===0)return raw;
 const digits=raw.padStart(decimals+1,'0');return digits.slice(0,-decimals)+'.'+digits.slice(-decimals);
}
export function auditPairRewards(input:RewardAuditInput):PairRewardAudit {
 const result:PairRewardAudit={schemaVersion:1,method:'pair-reward-audit-v1',evaluatedAt:input.asOf,quote:null,catalogSource:null,
  coverage:{complete:false,atomic:false,providerReportedTotal:null,providerReportedTotalScope:'all_modes_live_platform_pools_for_exact_quote',catalogInspected:0,catalogUninspected:null,candidateSelection:'first_four_catalog_reported_reward_tokens_in_market_cap_page_one',candidatesSelected:0,rewardReadsAttempted:0,rewardModeVerified:0,payoutDataAvailable:0,eligibleForComparison:0,rewardsUnassessed:null},
  candidates:[],ranking:{state:'withheld',label:'Top observed in audited sample',metric:'reported_lifetime_quote_holder_distributions',domain:'eligible_candidates_only',orderedMints:[],topObservedMints:[],reasons:[],observations:null},
  ecosystemLeader:{state:'unknown',reason:'nonexhaustive_catalog_and_no_verified_pair_scoped_reward_order'},unsupported:{reward24h:null,holderRoi:null,quoteRelativeTotalReturn:null,economicLeadership:null},limitations:LIMITATIONS};
 try {
  const asOf=parseHistoryTimestamp(input.asOf);
  if(asOf===null || !isSolanaMint(input.quoteMint) || !Array.isArray(input.rewards) || input.rewards.length>4)return fail('invalid_input');
  const registry=read(input.registry,PAIR_REGISTRY_URL,asOf,512*1024);
  let verified;
  try {verified=parseQuoteRegistry(registry.data,registry.source);}catch{return fail('registry_unverified');}
  const quote=verified.quotes.find(q=>q.quoteMint===input.quoteMint);if(!quote)return fail('registry_unverified');
  result.quote={mint:quote.quoteMint,symbol:quote.quoteSymbol,name:quote.quoteName,decimals:quote.decimals,symbolAmbiguous:quote.symbolAmbiguous,source:registry.source};
  const catalogUrl=TOKEN_CATALOG_URL+'?sort=marketCap&page=1&pageSize=25&quoteMint='+input.quoteMint;
  const catalog=read(input.catalog,catalogUrl,asOf,128*1024);
  let page;
  try {page=parseCatalogPage(catalog.data,1,verified.quotes.map(q=>({mint:q.quoteMint,symbol:q.quoteSymbol,name:q.quoteName,decimals:q.decimals,tokenProgram:q.tokenProgram,symbolAmbiguous:q.symbolAmbiguous})),catalog.source,input.quoteMint);}catch{return fail('catalog_unverified');}
  if(page.rejected || new Set(page.tokens.map(t=>t.mint)).size!==page.tokens.length)return fail('catalog_unverified');
  result.catalogSource=catalog.source;
  const selected=page.tokens.filter(t=>t.mode==='reward').slice(0,4);
  const sources=new Set(selected.map(t=>REWARD_V2_URL+t.mint+'/rewards'));
  if(input.rewards.some(p=>!p || !sources.has(p.source)) || new Set(input.rewards.map(p=>p.source)).size!==input.rewards.length)return fail('invalid_input');
  Object.assign(result.coverage,{providerReportedTotal:page.total,catalogInspected:page.tokens.length,catalogUninspected:page.total-page.tokens.length,candidatesSelected:selected.length,rewardReadsAttempted:input.rewards.length,rewardsUnassessed:page.total});
  result.candidates=selected.map(token=>{
   const candidate:AuditedRewardCandidate={mint:token.mint,symbol:token.symbol,name:token.name,modeVerification:'unverified',state:'withheld',reasons:[],source:null,lifetime:null};
   try {
    const packet=input.rewards.find(p=>p.source===REWARD_V2_URL+token.mint+'/rewards')??null;
    const reward=read(packet,REWARD_V2_URL+token.mint+'/rewards',asOf,32*1024,true),data=reward.data;
    candidate.source=reward.source;
    const unit=object(data.quote);
    if(data.mint!==token.mint || data.mode!=='reward' || unit.mint!==quote.quoteMint || unit.symbol!==quote.quoteSymbol)return fail('mode_identity_mismatch');
    if(unit.decimals!==quote.decimals)return fail('units_unverified');
    candidate.modeVerification='verified_reward';result.coverage.rewardModeVerified++;
    if(data.basis!=='ledger')return fail('ledger_unavailable');
    if(data.rewards==null)return fail('payouts_unavailable');
    const totals=object(data.rewards),raw=totals.distributedRaw;
    if(typeof raw!=='string' || raw.length>REWARD_AUDIT_LIMITS.rawDigits || !/^(0|[1-9]\d*)$/.test(raw))return fail('invalid_payouts');
    const payoutCount=count(totals.payoutCount),walletsPaid=count(totals.walletsPaid);
    if(walletsPaid>payoutCount || (BigInt(raw)>0n && (payoutCount===0 || walletsPaid===0)))return fail('invalid_payouts');
    const last=totals.lastPayoutAt===null?null:timestamp(totals.lastPayoutAt);
    if((last===null && payoutCount>0) || (last!==null && (payoutCount===0 || last>Date.parse(reward.source.providerGeneratedAt))))return fail('invalid_payouts');
    // Never compare float distributedTokens or add base/pending/fee recipients.
    candidate.lifetime={basis:'ledger',distributedRaw:raw,distributedTokens:decimal(raw,quote.decimals),payoutCount,walletsPaid,lastPayoutAt:last===null?null:new Date(last).toISOString(),startAt:null,endAt:null,interpretation:'provider_reported_lifetime_holder_distributions'};
    candidate.state='eligible';result.coverage.payoutDataAvailable++;result.coverage.eligibleForComparison++;
   }catch(error){candidate.reasons.push(reason(error,'invalid_payouts'));}
   return candidate;
  });
  result.coverage.rewardsUnassessed=page.total-result.coverage.eligibleForComparison;
  if(selected.length<2)return fail('insufficient_candidates');
  // Withhold the ordering if any preselected candidate lacks valid evidence;
  // never quietly rank a survivors-only subset after failures or rate limits.
  if(result.coverage.eligibleForComparison!==selected.length)return fail('candidate_set_incomplete');
  const dates=result.candidates.map(t=>t.source!),generated=dates.map(t=>Date.parse(t.providerGeneratedAt)),fetched=dates.map(t=>Date.parse(t.fetchedAt));
  if(Math.max(...generated)-Math.min(...generated)>REWARD_AUDIT_LIMITS.observationSkewMs || Math.max(...fetched)-Math.min(...fetched)>REWARD_AUDIT_LIMITS.observationSkewMs)return fail('observation_skew');
  const ordered=[...result.candidates].sort((a,b)=>{
   const aa=BigInt(a.lifetime!.distributedRaw),bb=BigInt(b.lifetime!.distributedRaw);
   return aa>bb?-1:aa<bb?1:a.mint<b.mint?-1:a.mint>b.mint?1:0;
  });
  result.ranking.state='available';result.ranking.orderedMints=ordered.map(t=>t.mint);
  result.ranking.topObservedMints=ordered.filter(t=>t.lifetime!.distributedRaw===ordered[0].lifetime!.distributedRaw).map(t=>t.mint);
  result.ranking.observations={generatedFrom:new Date(Math.min(...generated)).toISOString(),generatedTo:new Date(Math.max(...generated)).toISOString(),fetchedFrom:new Date(Math.min(...fetched)).toISOString(),fetchedTo:new Date(Math.max(...fetched)).toISOString()};
 }catch(error){result.ranking.reasons.push(reason(error,'invalid_input'));}
 return result;
}
