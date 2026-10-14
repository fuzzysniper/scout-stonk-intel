/** Pair presentation only; no return arithmetic or history/collector changes. */
import { trackedTokens } from './tracked-tokens';
import { summarizeHistory } from './history';
import type { SourceResult } from './history-source';
import type { PairCatalog, PairGroup, PairToken } from './pairs-contract';
import type { PairSourceResult } from './pairs-source';
import { PAIR_REGISTRY_URL } from './pairs-source';
export function pairCatalogReport(catalog: PairSourceResult, history: SourceResult, now = new Date(), filter: string | null = null): PairCatalog {
 const value=catalog.value, tracked=new Map((value?.tokens.length?trackedTokens():[]).map(t=>[t.mint,t]));
 const historyGood=history.dataset.sourceStatus==='available' || history.dataset.sourceStatus==='cached';
 const tokens:PairToken[]=(value?.tokens??[]).map(token=>{
  const expected=tracked.get(token.mint);
  let historyStatus:PairToken['historyStatus']='not_tracked',historyFreshness:PairToken['historyFreshness']='unavailable';
  let historyIssues:string[]=[];
  let observationCount:number|null=null,lastObservedAt:string|null=null;
  if(expected) {
   if(token.mode!=='reward' || expected.quoteMint!==token.quoteMint || expected.quoteSymbol!==token.quoteSymbol || expected.poolMint!==token.poolMint)historyStatus='identity_mismatch';
   else if(!historyGood || !history.store)historyStatus='source_unavailable';
   else {
    const h=summarizeHistory(history.store,token.mint,now);
    historyIssues=[...h.issues];
    const rows=history.store[token.mint]??[];
    // A count is dated evidence, not permission to calculate a return. Do not join changed quote identities.
    const identityMismatch=rows.some(r=>{
     if(!r || typeof r!=='object')return false;
     const row=r as Record<string,unknown>;
     return row.quoteMint!=null && (row.quoteMint!==token.quoteMint || row.quoteSymbol!==token.quoteSymbol);
    });
    if(identityMismatch)historyStatus='identity_mismatch';
    else {
     historyStatus=h.status;
     historyFreshness=h.freshness.status;observationCount=h.status==='invalid_data' && !h.observationCount?null:h.observationCount;lastObservedAt=h.latestObservedAt;
    }
   }
  }
  return {mint:token.mint,symbol:token.symbol,name:token.name,poolMint:token.poolMint,quoteMint:token.quoteMint,quoteSymbol:token.quoteSymbol,
   source:token.provenance.source,verifiedAt:token.provenance.fetchedAt,provenance:token.provenance,mode:token.mode,
   rewardModeVerified:token.modeVerification==='verified_reward',modeVerification:token.modeVerification,rewardSource:token.rewardSource,
   observationCount,lastObservedAt,historyStatus,historyFreshness,historyIssues,market:{...token.market},comparisonStatus:'unavailable',
   comparisons:{quoteRelativePriceReturn:null,quoteAssetBenchmarkReturn:null,holderAttributedReward:null,reason:'missing_synchronized_price_history_and_holder_entitlement'}};
 });
 const quoteMap=new Map((value?.quotes??[]).map(q=>[q.mint,q]));
 const quoteMints=filter?[filter]:[...new Set(tokens.map(t=>t.quoteMint))];
 const registrySource=value?.sources.find(s=>s.source===PAIR_REGISTRY_URL);
 const groups:PairGroup[]=registrySource?quoteMints.flatMap(quoteMint=>{
  const q=quoteMap.get(quoteMint);if(!q)return[];
  const rows=tokens.filter(t=>t.quoteMint===quoteMint).sort((a,b)=>a.symbol.localeCompare(b.symbol,'en')||a.mint.localeCompare(b.mint,'en'));
  return [{quoteMint,quoteSymbol:q.symbol,quoteName:q.name,decimals:q.decimals,tokenProgram:q.tokenProgram,symbolAmbiguous:q.symbolAmbiguous,
   source:PAIR_REGISTRY_URL,verifiedAt:registrySource.fetchedAt,provenance:registrySource,
   verification:rows.length?'official_registry_catalog_match':'official_registry_only',
   availability:rows.length?'tokens_in_bounded_sample':'no_tokens_in_bounded_sample',tokens:rows} as PairGroup];
 }).sort((a,b)=>a.quoteSymbol.localeCompare(b.quoteSymbol,'en')||a.quoteMint.localeCompare(b.quoteMint,'en')):[];
 const degraded=catalog.sourceStatus==='degraded' || !historyGood;
 return {schemaVersion:1,status:catalog.sourceStatus==='unavailable'?'unavailable':degraded?'degraded':'available',groups,
  dataset:{sourceStatus:catalog.sourceStatus,fetchedAt:now.toISOString(),dataFetchedAt:value?.fetchedAt??null,scope:'bounded_official_catalog',
   coverage:{complete:false,atomic:false,registryCount:quoteMap.size,pagesFetched:value?.pagesFetched??0,pageLimit:2,pageSize:25,
    recordsReceived:value?.recordsReceived??0,tokensReturned:groups.reduce((n,g)=>n+g.tokens.length,0),rejectedRecords:value?.rejectedRecords??0,
    providerReportedTotal:value?.providerReportedTotal??null,modeChecks:value?.modeChecks??0,modeCheckLimit:12,historyScope:'tracked_sample',
    warnings:[...new Set([...(value?.warnings??['catalog_source_unavailable']),...(!historyGood?['tracked_history_source_unavailable']:[])])].sort(),
    ...(value?.discovery ? {discovery:value.discovery} : {})},
   sources:value?.sources??[],history:{sourceStatus:history.dataset.sourceStatus,source:history.dataset.source,revision:history.dataset.revision,dataFetchedAt:history.dataset.dataFetchedAt}}};
}
// Catalog selection and output order express identity/coverage, never alpha or reward ranking.
