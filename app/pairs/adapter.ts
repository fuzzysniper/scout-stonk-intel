import type { PairCatalog as OfficialCatalog, PairToken as CatalogToken, PairSource } from '../../lib/pairs-contract';
import type { RadarReport, RadarRow } from '../../lib/radar';
import type { TrackedToken } from '../../lib/tracked-tokens';
import { isSolanaMint } from '../../lib/solana';
export type PairCatalog = OfficialCatalog;
export type PairToken = Pick<TrackedToken,'mint'|'name'|'symbol'|'quoteMint'|'quoteSymbol'> & {
 rewardModeVerified:boolean; observationCount:number|null; lastObservedAt:string|null;
 radar:RadarRow|null; catalog:CatalogToken|null;
};
export type PairGroup = {
 quoteMint:string; quoteSymbol:string; quoteName:string; symbolAmbiguous:boolean;
 verifiedAt:string; source:string; tokens:PairToken[];
};
type ObjectValue=Record<string,unknown>;
function object(v:unknown):ObjectValue {
 if(!v || typeof v!=='object' || Array.isArray(v))throw Error('Invalid catalog');
 return v as ObjectValue;
}
function requireValue(condition:unknown):asserts condition {if(!condition)throw Error('Invalid catalog');}
const text=(v:unknown,max:number)=>typeof v==='string' && v.trim().length>0 && v.length<=max && !/[\u0000-\u001f\u007f]/.test(v);
export const validMint=(v:unknown):v is string=>typeof v==='string' && isSolanaMint(v);
const date=(v:unknown)=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,19)===v.slice(0,19);
const count=(v:unknown)=>typeof v==='number' && Number.isSafeInteger(v) && v>=0 && v<=100_000_000;
const amount=(v:unknown)=>v===null || typeof v==='number' && Number.isFinite(v) && v>=0;
const state=(v:unknown,states:string[])=>typeof v==='string' && states.includes(v);
const sourceStates=['available','cached','degraded','unavailable'];
function officialSource(v:unknown):v is string {
 if(typeof v!=='string' || v.length>2048)return false;
 try {
  const u=new URL(v);
  return u.origin==='https://www.stonkfun.xyz' && !u.username && !u.password && !u.hash &&
   (/^\/api\/public\/v1\/(?:pairs|tokens)$/.test(u.pathname) ||
    /^\/api\/(?:public\/v1|v2)\/tokens\/[1-9A-HJ-NP-Za-km-z]{32,44}\/rewards$/.test(u.pathname));
 } catch {return false;}
}
function provenance(v:unknown):PairSource {
 const p=object(v);
 requireValue(officialSource(p.source) && date(p.fetchedAt) && date(p.providerGeneratedAt) && typeof p.revision==='string' && /^sha256:[a-f0-9]{64}$/.test(p.revision));
 return p as PairSource;
}
/** Validate the canonical JSON boundary; no silent dropping of Unicode or forged identities. */
export function parseCatalog(value:unknown):PairCatalog {
 const v=object(value),d=object(v.dataset),c=object(d.coverage),h=object(d.history);
 requireValue(v.schemaVersion===1 && state(v.status,['available','degraded','unavailable']) && Array.isArray(v.groups) && v.groups.length<=1024);
 requireValue(state(d.sourceStatus,sourceStates) && date(d.fetchedAt) && (d.dataFetchedAt===null || date(d.dataFetchedAt)) && d.scope==='bounded_official_catalog');
 requireValue(c.complete===false && c.atomic===false && c.historyScope==='tracked_sample');
 for(const key of ['registryCount','pagesFetched','pageLimit','pageSize','recordsReceived','tokensReturned','rejectedRecords','modeChecks','modeCheckLimit'])requireValue(count(c[key]));
 requireValue(Number(c.pagesFetched)<=Number(c.pageLimit) && Number(c.pageLimit)<=100 && Number(c.pageSize)<=100 && Number(c.registryCount)<=1024 && Number(c.modeChecks)<=Number(c.modeCheckLimit));
 requireValue(c.providerReportedTotal===null || count(c.providerReportedTotal));
 requireValue(Array.isArray(c.warnings) && c.warnings.length<=100 && c.warnings.every(x=>text(x,160)));
 requireValue(Array.isArray(d.sources) && d.sources.length<=1024);d.sources.forEach(provenance);
 requireValue(state(h.sourceStatus,sourceStates) && h.source==='https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json' && (h.dataFetchedAt===null || date(h.dataFetchedAt)) && (h.revision===null || typeof h.revision==='string' && /^sha256:[a-f0-9]{64}$/.test(h.revision)));
 if(v.status==='unavailable')requireValue(d.sourceStatus==='unavailable' && d.dataFetchedAt===null && v.groups.length===0);
 else requireValue(d.sourceStatus!=='unavailable' && date(d.dataFetchedAt));
 const groups=new Set<string>(),tokens=new Set<string>();let tokenCount=0;
 for(const raw of v.groups) {
  const g=object(raw),p=provenance(g.provenance);
  requireValue(validMint(g.quoteMint) && !groups.has(g.quoteMint) && text(g.quoteSymbol,32) && text(g.quoteName,160) && typeof g.symbolAmbiguous==='boolean');
  requireValue(count(g.decimals) && Number(g.decimals)<=18 && validMint(g.tokenProgram) && date(g.verifiedAt) && officialSource(g.source) && g.source===p.source);
  requireValue(state(g.verification,['official_registry_catalog_match','official_registry_only']) && state(g.availability,['tokens_in_bounded_sample','no_tokens_in_bounded_sample']) && Array.isArray(g.tokens));
  requireValue((g.availability==='no_tokens_in_bounded_sample')===(g.tokens.length===0));
  groups.add(g.quoteMint);
  for(const rawToken of g.tokens) {
   const t=object(rawToken),tp=provenance(t.provenance),m=object(t.market),cmp=object(t.comparisons);
   requireValue(validMint(t.mint) && !tokens.has(t.mint) && validMint(t.poolMint) && text(t.symbol,32) && text(t.name,160) && t.quoteMint===g.quoteMint && t.quoteSymbol===g.quoteSymbol);
   requireValue(officialSource(t.source) && t.source===tp.source && date(t.verifiedAt) && state(t.mode,['reward','standard']) && typeof t.rewardModeVerified==='boolean');
   requireValue(state(t.modeVerification,['verified_reward','verified_standard','catalog_only','source_unavailable','identity_mismatch']));
   requireValue(t.rewardModeVerified===(t.modeVerification==='verified_reward'));
   if(t.rewardSource!==null) {
    const rp=provenance(t.rewardSource);
    requireValue(new URL(rp.source).pathname==='/api/v2/tokens/'+t.mint+'/rewards');
   }
   if(t.rewardModeVerified)requireValue(t.mode==='reward' && t.rewardSource!==null);
   if(t.modeVerification==='verified_standard')requireValue(t.mode==='standard' && t.rewardSource!==null);
   requireValue(t.observationCount===null || count(t.observationCount));
   requireValue(t.lastObservedAt===null || date(t.lastObservedAt));
   requireValue(state(t.historyStatus,['recorded','no_history','invalid_data','not_tracked','source_unavailable','identity_mismatch']) && state(t.historyFreshness,['fresh','stale','unavailable']));
   requireValue(Array.isArray(t.historyIssues) && t.historyIssues.length<=100 && t.historyIssues.every(x=>text(x,160)));
   requireValue(state(m.status,['reported_snapshot','unavailable']) && m.unit==='USD' && m.observedAt===null && date(m.providerGeneratedAt));
   for(const key of ['priceUsd','liquidityUsd','volume24hUsd'])requireValue(amount(m[key]));
   if(m.status==='unavailable')requireValue(m.priceUsd===null && m.liquidityUsd===null && m.volume24hUsd===null);
   requireValue(t.comparisonStatus==='unavailable' && cmp.quoteRelativePriceReturn===null && cmp.quoteAssetBenchmarkReturn===null && cmp.holderAttributedReward===null && cmp.reason==='missing_synchronized_price_history_and_holder_entitlement');
   tokens.add(t.mint);tokenCount++;
  }
 }
 requireValue(tokenCount<=1024 && c.tokensReturned===tokenCount && groups.size<=Number(c.registryCount));
 const catalog=v as PairCatalog;discoveryEvidence(catalog);return catalog;
}

export type DiscoveryEvidence=NonNullable<PairCatalog['dataset']['coverage']['discovery']>;
export function discoveryEvidence(catalog:PairCatalog):DiscoveryEvidence|null {
 const c=catalog.dataset.coverage as unknown as ObjectValue;
 if(c.discovery===undefined)return null;
 const d=object(c.discovery);
 requireValue(state(d.strategy,['global_sample','provider_quote_mint']) && (d.quoteMint===null || validMint(d.quoteMint)));
 requireValue(d.providerReportedTotalScope===(d.strategy==='provider_quote_mint'?'quote_mint':'catalog'));
 if(d.strategy==='global_sample')requireValue(d.quoteMint===null);
 if(d.strategy==='provider_quote_mint'){
  requireValue(validMint(d.quoteMint) && catalog.groups.every(g=>g.quoteMint===d.quoteMint));
  const pages=catalog.dataset.sources.filter(p=>new URL(p.source).pathname==='/api/public/v1/tokens');
  requireValue(pages.length===catalog.dataset.coverage.pagesFetched && pages.length>0);
  for(const p of pages)requireValue(new URL(p.source).searchParams.getAll('quoteMint').length===1 && new URL(p.source).searchParams.get('quoteMint')===d.quoteMint);
  for(const g of catalog.groups)for(const t of g.tokens)requireValue(new URL(t.source).pathname==='/api/public/v1/tokens' && new URL(t.source).searchParams.getAll('quoteMint').length===1 && new URL(t.source).searchParams.get('quoteMint')===d.quoteMint);
 }
 return d as DiscoveryEvidence;
}
/** Replace global groups with actual scoped results; counts/search share the same evidence. */
export function mergePairGroups(global:PairGroup[],scopes:PairGroup[][]):PairGroup[] {
 const groups=new Map(global.map(g=>[g.quoteMint,g]));
 for(const scope of scopes)for(const group of scope)groups.set(group.quoteMint,group);
 return [...groups.values()].sort((a,b)=>a.quoteSymbol.localeCompare(b.quoteSymbol,'en')||a.quoteMint.localeCompare(b.quoteMint,'en'));
}
function joinRadar(token:PairToken,report:RadarReport|null,tracked:TrackedToken[]) {
 const expected=tracked.find(t=>t.mint===token.mint && t.quoteMint===token.quoteMint && t.quoteSymbol===token.quoteSymbol);
 const row=expected && report?.rows.find(r=>r.mint===expected.mint && r.quoteMint===expected.quoteMint && r.quoteSymbol===expected.quoteSymbol && r.poolMint===expected.poolMint && r.source===expected.source);
 // Current catalog identity must agree too; never join a ticker or a migrated/unrelated pool.
 if(!row || token.catalog && (token.catalog.poolMint!==expected!.poolMint || !token.catalog.rewardModeVerified || token.catalog.historyStatus!=='recorded' || token.catalog.historyFreshness!=='fresh'))return null;
 return row;
}
export function fromCatalog(catalog:PairCatalog,report:RadarReport|null=null,tracked:TrackedToken[]=[]):PairGroup[] {
 return catalog.groups.map(g=>({
  quoteMint:g.quoteMint,quoteSymbol:g.quoteSymbol,quoteName:g.quoteName,symbolAmbiguous:g.symbolAmbiguous,verifiedAt:g.verifiedAt,source:g.source,
  tokens:g.tokens.map(t=>{
   const token:PairToken={mint:t.mint,symbol:t.symbol,name:t.name,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,rewardModeVerified:t.rewardModeVerified,
    observationCount:t.observationCount,lastObservedAt:t.lastObservedAt,radar:null,catalog:t};
   token.radar=joinRadar(token,report,tracked);return token;
  }).sort((a,b)=>a.symbol.localeCompare(b.symbol,'en')||a.mint.localeCompare(b.mint,'en')),
 })).sort((a,b)=>a.quoteSymbol.localeCompare(b.quoteSymbol,'en')||a.quoteMint.localeCompare(b.quoteMint,'en'));
}
export function fromTracked(tokens:TrackedToken[],report:RadarReport|null):PairGroup[] {
 const groups=new Map<string,PairGroup>();
 for(const t of tokens) {
  let group=groups.get(t.quoteMint);
  if(!group){group={quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,quoteName:t.quoteSymbol,symbolAmbiguous:false,verifiedAt:t.verifiedAt,source:t.discoverySource,tokens:[]};groups.set(t.quoteMint,group);}
  const token:PairToken={mint:t.mint,name:t.name,symbol:t.symbol,quoteMint:t.quoteMint,quoteSymbol:t.quoteSymbol,rewardModeVerified:true,observationCount:null,lastObservedAt:null,radar:null,catalog:null};
  token.radar=joinRadar(token,report,tokens);
  if(token.radar && report?.status==='available'){token.observationCount=token.radar.observationCount;token.lastObservedAt=token.radar.latestObservedAt;}
  group.tokens.push(token);
 }
 return [...groups.values()].map(g=>({...g,tokens:g.tokens.sort((a,b)=>a.symbol.localeCompare(b.symbol,'en')||a.mint.localeCompare(b.mint,'en'))})).sort((a,b)=>a.quoteSymbol.localeCompare(b.quoteSymbol,'en')||a.quoteMint.localeCompare(b.quoteMint,'en'));
}
export function searchPairs(groups:PairGroup[],query:string) {
 const search=query.trim().toLocaleLowerCase('en');
 return groups.filter(g=>[g.quoteSymbol,g.quoteName,g.quoteMint,...g.tokens.flatMap(t=>[t.symbol,t.name,t.mint])].some(v=>v.toLocaleLowerCase('en').includes(search)));
}
export function visibleTokens(group:PairGroup,query:string) {
 const search=query.trim().toLocaleLowerCase('en');
 if(!search || [group.quoteSymbol,group.quoteName,group.quoteMint].some(v=>v.toLocaleLowerCase('en').includes(search)))return group.tokens;
 return group.tokens.filter(t=>[t.symbol,t.name,t.mint].some(v=>v.toLocaleLowerCase('en').includes(search)));
}
