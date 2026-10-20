/** Consumer projection of existing read-only APIs. No source/financial contract changes. */
import {parseCatalog,discoveryEvidence,validMint} from '../../pairs/adapter';
import type {PairSource} from '../../../lib/pairs-contract';
import {CARDS,REGISTRY} from './identity';
export {CARDS,REGISTRY} from './identity';
import {snapshotEligibility,summarizeEligibility,type SnapshotEligibility} from './observations';
export type PairFinding={mint:string;poolMint:string;name:string;symbol:string;source:PairSource;modeSource:PairSource|null;mode:'reward'|'standard'|'unverified';marketSnapshot:'reported'|'unavailable';rewardObservations:number|null;lastRewardObservation:string|null;eligibility:SnapshotEligibility};
export type CardsReport={rows:PairFinding[];sources:PairSource[];reportedTotal:number|null;pages:number;rejected:number;modeChecks:number;degraded:boolean;retrievedAt:string;warnings:string[];priceObservationCount:0;financialPublication:'withheld';ranking:'insufficient_evidence';analysis:ReturnType<typeof summarizeEligibility>};
function sameSource(a:PairSource,b:PairSource){return a.source===b.source&&a.revision===b.revision&&a.fetchedAt===b.fetchedAt&&a.providerGeneratedAt===b.providerGeneratedAt;}
/** Exact identity, pool and provider-scoped coverage must survive the canonical parser. */
export function cardsReport(raw:unknown):CardsReport {
 const c=parseCatalog(raw),g=c.groups[0],proof=discoveryEvidence(c),coverage=c.dataset.coverage;
 if(c.status==='unavailable'||!g||c.groups.length!==1||g.quoteMint!==CARDS.mint||g.quoteSymbol!==CARDS.symbol||g.quoteName!==CARDS.name||g.decimals!==CARDS.decimals||g.tokenProgram!==CARDS.program||g.source!==REGISTRY||g.provenance.source!==REGISTRY||proof?.strategy!=='provider_quote_mint'||proof.quoteMint!==CARDS.mint||coverage.pageLimit!==2||coverage.pageSize!==25||coverage.pagesFetched>2||g.tokens.length>50||!c.dataset.sources.some(s=>sameSource(s,g.provenance)))throw Error('Unverified CARDS scope');
 const rows=g.tokens.map(t=>{
  if(!c.dataset.sources.some(s=>sameSource(s,t.provenance)))throw Error('Missing token source');
  const modeSource=t.rewardSource&&c.dataset.sources.some(s=>sameSource(s,t.rewardSource!))?t.rewardSource:null;
  return {mint:t.mint,poolMint:t.poolMint,name:t.name,symbol:t.symbol,source:t.provenance,modeSource,
   mode:modeSource&&t.modeVerification==='verified_reward'?'reward' as const:modeSource&&t.modeVerification==='verified_standard'?'standard' as const:'unverified' as const,
   marketSnapshot:t.market.status==='reported_snapshot'?'reported' as const:'unavailable' as const,rewardObservations:t.observationCount,lastRewardObservation:t.lastObservedAt,eligibility:snapshotEligibility(t.market)};
 });
 rows.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.mint.localeCompare(b.mint,'en'));
 // Never forward optional reward amounts, market figures or unknown provider fields.
 return {rows,sources:c.dataset.sources.map(s=>({source:s.source,fetchedAt:s.fetchedAt,providerGeneratedAt:s.providerGeneratedAt,revision:s.revision})),reportedTotal:coverage.providerReportedTotal,pages:coverage.pagesFetched,rejected:coverage.rejectedRecords,modeChecks:coverage.modeChecks,degraded:c.status==='degraded',retrievedAt:c.dataset.dataFetchedAt!,warnings:[...coverage.warnings],priceObservationCount:0,financialPublication:'withheld',ranking:'insufficient_evidence',analysis:summarizeEligibility(rows.map(r=>r.eligibility))};
}
export function sourceAge(source:PairSource,now:number):'recent_response'|'dated_response'|'invalid_clock' {
 const generated=Date.parse(source.providerGeneratedAt),fetched=Date.parse(source.fetchedAt);
 if(!Number.isFinite(now)||!Number.isFinite(generated)||!Number.isFinite(fetched)||generated>fetched+1000||fetched>now+1000||generated>now+1000)return 'invalid_clock';
 return now-generated<=300000&&now-fetched<=300000?'recent_response':'dated_response';
}
export function filterPairs(rows:PairFinding[],query:string) {
 if(!query)return rows;
 const exact:boolean=validMint(query);if(exact)return rows.filter(r=>r.mint===query);
 const q=query.toLocaleLowerCase('en');return rows.filter(r=>(r.name+' '+r.symbol).toLocaleLowerCase('en').includes(q));
}
export function watchInput(raw:unknown):string|null{return typeof raw==='string'&&raw===raw.trim()&&validMint(raw)?raw:null;}
export type WatchFinding={state:'not_found'|'quote_side'|'matched';mint:string;pool:string|null;baseMint:string|null;quoteMint:string|null;name:string|null;symbol:string|null;retrievedAt:string;financialPublication:'withheld';marketObservationAt:null};
export function watchReport(raw:unknown,requested:string):WatchFinding {
 if(!watchInput(requested)||!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid market response');
 const r=raw as Record<string,unknown>;
 if(r.mint!==requested||r.source!=='DexScreener'||typeof r.found!=='boolean'||typeof r.fetchedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.fetchedAt)||!Number.isFinite(Date.parse(r.fetchedAt))||new Date(r.fetchedAt).toISOString()!==r.fetchedAt)throw Error('Invalid market identity');
 const empty={mint:requested,pool:null,baseMint:null,quoteMint:null,name:null,symbol:null,retrievedAt:r.fetchedAt,financialPublication:'withheld' as const,marketObservationAt:null};
 if(!r.found)return {...empty,state:'not_found'};
 const b=r.base as Record<string,unknown>|null,q=r.quote as Record<string,unknown>|null;
 if(!b||!q||!validMint(b.address)||!validMint(q.address)||!validMint(r.pairAddress)||(b.address!==requested&&q.address!==requested))throw Error('Wrong market identity');
 const safeText=(s:unknown,max:number):s is string=>typeof s==='string'&&s.length>0&&s.length<=max&&!/[\p{Cc}\p{Cs}]/u.test(s);
 if(!safeText(b.name,160)||!safeText(b.symbol,32))throw Error('Invalid market label');
 // Quote-side responses describe another token's cap/change: never inherit them.
 return {...empty,state:b.address===requested?'matched':'quote_side',pool:r.pairAddress,baseMint:b.address,quoteMint:q.address,name:b.address===requested?b.name:null,symbol:b.address===requested?b.symbol:null};
}
export function watchPath(mint:string){if(!watchInput(mint))throw Error('Invalid mint');return '/research/watch?mint='+encodeURIComponent(mint);}
