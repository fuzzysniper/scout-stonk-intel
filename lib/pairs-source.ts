/** Server-only, fixed official GET sources; bounded discovery, never collection. */
import { createHash } from 'node:crypto';
import { isSolanaMint } from './solana';
import { parseHistoryTimestamp } from './history';
import { trackedTokens } from './tracked-tokens';
import { parseLedgerLifetime } from './reward-lifetime';
import type { LedgerLifetimeRead } from './reward-lifetime';
import type { PairCatalog, PairQuote, PairSource, PairToken } from './pairs-contract';
export const PAIR_REGISTRY_URL = 'https://www.stonkfun.xyz/api/public/v1/pairs';
export const TOKEN_CATALOG_URL = 'https://www.stonkfun.xyz/api/public/v1/tokens';
export const REWARD_V2_URL = 'https://www.stonkfun.xyz/api/v2/tokens/';
export const PAIR_CACHE_MS = 300_000;
export const PAIR_MAX_BYTES = 1024 * 1024;
export type QuoteRecord = {
 mint: string; symbol: string; name: string; decimals: number; tokenProgram: string; symbolAmbiguous: boolean;
};
export type CatalogToken = {
 mint: string; symbol: string; name: string; poolMint: string; quoteMint: string; quoteSymbol: string;
 mode: PairToken['mode']; provenance: PairSource; market: PairToken['market'];
 modeVerification: PairToken['modeVerification']; rewardSource: PairSource | null;
 lifetimeReceipt?: LedgerLifetimeRead;
 modeFailure?: 'rate_limited'|'provider_cooldown'|'stale_transport'|'stale_source'|'invalid_source'|'deadline'|'oversized_source'|'source_unavailable';
};
export type PairSnapshot = {
 quotes: QuoteRecord[]; tokens: CatalogToken[]; sources: PairSource[]; warnings: string[];
 pagesFetched: number; recordsReceived: number; rejectedRecords: number;
 providerReportedTotal: number | null; modeChecks: number; fetchedAt: string;
 discovery?: NonNullable<PairCatalog['dataset']['coverage']['discovery']>;
 /** Reuses the same registry GET, independently validated for interval gates. */
 registryEvidence?: QuoteRegistrySnapshot;
};
export type PairSourceResult = { value: PairSnapshot | null; sourceStatus: 'available' | 'cached' | 'degraded' | 'unavailable' };
function object(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid_source');
 return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
 if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw Error('invalid_text');
 return value;
}
function mint(value: unknown): string {
 if (typeof value !== 'string' || !isSolanaMint(value)) throw Error('invalid_identity');
 return value;
}
function integer(value: unknown, max: number): number {
 if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) throw Error('invalid_count');
 return value;
}
function generated(value: unknown, now: number): string {
 const time = parseHistoryTimestamp(value);
 if (time === null || now - time > 3 * 3600_000 || time - now > 60_000) throw Error('stale_source');
 return new Date(time).toISOString();
}
function amount(value: unknown): number | null {
 return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function parsePairRegistry(value: unknown): QuoteRecord[] {
 const data = object(object(value).data);
 if (data.selectBy !== 'mint' || !Array.isArray(data.pairs) || data.pairs.length > 1024) throw Error('invalid_registry');
 const seen = new Set<string>();
 return data.pairs.map(raw => {
  const p = object(raw), address = mint(p.mint);
  if (seen.has(address) || typeof p.symbolAmbiguous !== 'boolean' ||
      !['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'].includes(String(p.tokenProgram))) throw Error('invalid_registry');
  seen.add(address);
  return {mint:address,symbol:text(p.symbol,32),name:text(p.name,160),decimals:integer(p.decimals,18),
   tokenProgram:String(p.tokenProgram),symbolAmbiguous:p.symbolAmbiguous};
 });
}
export const QUOTE_REGISTRY_MAX_BYTES=512*1024;
export const QUOTE_REGISTRY_MAX_RECORDS=1024;
export const normalizeQuoteSearch=(value:string)=>value.normalize('NFKC').toLowerCase();
type QuoteRegistrySnapshot = { quotes: PairQuote[]; provenance: PairSource; providerAmbiguousSymbolCount: number };
export type QuoteRegistrySourceResult = { value: QuoteRegistrySnapshot | null; sourceStatus: 'available' | 'cached' | 'unavailable' };
export function parseQuoteRegistry(value: unknown, provenance: PairSource): QuoteRegistrySnapshot {
 const root=object(value),data=object(root.data),meta=object(root.meta);
 const records=parsePairRegistry(value);
 if (!records.length || records.length>QUOTE_REGISTRY_MAX_RECORDS) throw Error('invalid_registry');
 // The inspected endpoint is one unpaginated array. Refuse a future partial
 // response rather than guessing paging semantics or silently claiming scope.
 for (const envelope of [root,data,meta]) {
  if (envelope.error!=null) throw Error('invalid_registry');
  for (const key of ['pagination','page','nextCursor','nextPage','next'])
   if (envelope[key]!=null) throw Error('incomplete_registry');
  for (const key of ['hasMore','partial','truncated'])
   if (envelope[key]!=null && envelope[key]!==false) throw Error('incomplete_registry');
  if (envelope.complete!=null && envelope.complete!==true) throw Error('incomplete_registry');
  for (const key of ['count','total','totalCount'])
   if (envelope[key]!=null && integer(envelope[key],QUOTE_REGISTRY_MAX_RECORDS)!==records.length) throw Error('incomplete_registry');
 }
 const providerCounts=new Map<string,number>(),searchCounts=new Map<string,number>();
 for (const row of records) {
  if (row.mint!==row.mint.trim() || row.symbol!==row.symbol.trim() ||
      /[\p{Cc}\p{Cs}]/u.test(row.symbol+row.name)) throw Error('invalid_registry');
  const key=row.symbol.toLowerCase(),searchKey=normalizeQuoteSearch(row.symbol);
  providerCounts.set(key,(providerCounts.get(key)??0)+1);searchCounts.set(searchKey,(searchCounts.get(searchKey)??0)+1);
 }
 const ambiguous=integer(data.ambiguousSymbolCount,QUOTE_REGISTRY_MAX_RECORDS);
 if (ambiguous!==[...providerCounts.values()].filter(count=>count>1).length ||
     records.some(row=>row.symbolAmbiguous!==(providerCounts.get(row.symbol.toLowerCase())!>1))) throw Error('invalid_registry_ambiguity');
 const quotes=records.map(row=>({quoteMint:row.mint,quoteSymbol:row.symbol,quoteName:row.name,decimals:row.decimals,
  tokenProgram:row.tokenProgram,symbolAmbiguous:row.symbolAmbiguous || searchCounts.get(normalizeQuoteSearch(row.symbol))!>1,
  providerSymbolAmbiguous:row.symbolAmbiguous,symbolMatchCount:searchCounts.get(normalizeQuoteSearch(row.symbol))!,
  verification:'official_registry_only' as const,verifiedAt:provenance.fetchedAt}));
 const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
 quotes.sort((a,b)=>compare(normalizeQuoteSearch(a.quoteSymbol),normalizeQuoteSearch(b.quoteSymbol)) || compare(a.quoteMint,b.quoteMint));
 return {quotes,provenance,providerAmbiguousSymbolCount:ambiguous};
}
function retrySeconds(value:string|null):number|null {
 return value===null?60:/^[1-9]\d{0,3}$/.test(value) && Number(value)<=3600?Number(value):null;
}
function hasNextRegistryLink(value:string|null):boolean {
 for (const match of (value??'').matchAll(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,;\s]+))/gi))
  if ((match[1]??match[2]??match[3]).toLowerCase().split(/\s+/).includes('next'))return true;
 return false;
}
export function createQuoteRegistrySource(fetcher:typeof fetch=fetch,clock:()=>number=()=>Date.now(),deadlineMs=3000) {
 if (!Number.isSafeInteger(deadlineMs) || deadlineMs<1 || deadlineMs>3000) throw Error('invalid_deadline');
 let entry:QuoteRegistrySnapshot|null=null,retryAt=0;
 let pending:Promise<QuoteRegistrySourceResult>|null=null;
 const result=(sourceStatus:QuoteRegistrySourceResult['sourceStatus']):QuoteRegistrySourceResult=>({value:sourceStatus==='unavailable'?null:entry,sourceStatus});
 async function refresh():Promise<QuoteRegistrySourceResult> {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),deadlineMs);
  const stopped=new Promise<never>((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('deadline')),{once:true}));
  try {
   const response=await Promise.race([fetcher(PAIR_REGISTRY_URL,{method:'GET',redirect:'error',cache:'no-store',signal:controller.signal,headers:{accept:'application/json'}}),stopped]);
   if (response.status===429) {
    const seconds=retrySeconds(response.headers.get('retry-after'));
    retryAt=seconds===null?Infinity:Math.max(retryAt,clock()+seconds*1000);throw Error('rate_limited');
   }
   if (response.status!==200 || !response.body || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??'') ||
       Number(response.headers.get('content-length'))>QUOTE_REGISTRY_MAX_BYTES || response.headers.has('content-range') ||
       hasNextRegistryLink(response.headers.get('link'))) throw Error('invalid_registry_response');
   for (const name of ['age','source-age']) {
    const age=response.headers.get(name);
    if (age!==null && (!/^\d+$/.test(age) || Number(age)>300)) throw Error('stale_transport');
   }
   const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
   try {
    while (true) {
     const part=await Promise.race([reader.read(),stopped]);if (part.done)break;
     size+=part.value.byteLength;if (size>QUOTE_REGISTRY_MAX_BYTES)throw Error('oversized_registry');chunks.push(part.value);
    }
   } finally {void reader.cancel().catch(()=>{});}
   const bytes=Buffer.concat(chunks),value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   const providerGeneratedAt=generated(object(object(value).meta).generatedAt,clock());
   entry=parseQuoteRegistry(value,{source:PAIR_REGISTRY_URL,fetchedAt:new Date(clock()).toISOString(),providerGeneratedAt,
    revision:'sha256:'+createHash('sha256').update(bytes).digest('hex')});
   return result('available');
  } catch {entry=null;retryAt=Math.max(retryAt,clock()+60_000);return result('unavailable');}
  finally {clearTimeout(timer);controller.abort();}
 }
 return async ():Promise<QuoteRegistrySourceResult>=>{
  if (entry && (clock()-Date.parse(entry.provenance.providerGeneratedAt)>3*3600_000 || Date.parse(entry.provenance.providerGeneratedAt)-clock()>60_000))entry=null;
  if (entry && clock()-Date.parse(entry.provenance.fetchedAt)<PAIR_CACHE_MS)return result('cached');
  if (clock()<retryAt)return result('unavailable');
  if (pending)return pending;
  pending=refresh();try{return await pending;}finally{pending=null;}
 };
}
export function parseCatalogPage(value: unknown, page: number, quotes: QuoteRecord[], provenance: PairSource, quoteMint: string | null = null) {
 const data = object(object(value).data), pagination = object(data.pagination);
 if (data.network !== 'mainnet-beta' || pagination.page !== page || pagination.pageSize !== 25 ||
     !Array.isArray(data.tokens) || data.tokens.length > 25) throw Error('invalid_pagination');
 const total = integer(pagination.total,100_000_000);
 if (pagination.totalPages !== Math.ceil(total/25)) throw Error('invalid_pagination');
 if (quoteMint !== null) {
  // A 200 is not proof the upstream applied a filter. Reject the whole page;
  // never silently turn an ignored provider parameter into a local sample.
  if (data.tokens.some(raw => object(object(raw).quote).mint !== quoteMint)) throw Error('pair_filter_mismatch');
  if (data.tokens.length !== Math.min(25, Math.max(0, total - (page - 1) * 25))) throw Error('incomplete_pair_page');
 }
 const registry = new Map(quotes.map(q=>[q.mint,q]));
 let rejected = 0;
 const tokens: CatalogToken[] = [];
 for (const raw of data.tokens) {
  try {
   const row = object(raw), quote = object(row.quote), quoteMint = mint(quote.mint), verified = registry.get(quoteMint);
   if (!verified || quote.symbol !== verified.symbol || !['reward','standard'].includes(String(row.mode))) throw Error('invalid_identity');
   const market = row.market && typeof row.market === 'object' && !Array.isArray(row.market) ? object(row.market) : {};
   const priceUsd=amount(market.priceUsd),liquidityUsd=amount(market.liquidityUsd),volume24hUsd=amount(market.volume24hUsd);
   tokens.push({mint:mint(row.mint),symbol:text(row.symbol,32),name:text(row.name,160),poolMint:mint(row.pool),
    quoteMint,quoteSymbol:verified.symbol,mode:row.mode as CatalogToken['mode'],provenance,
    modeVerification:'catalog_only',rewardSource:null,
    market:{status:[priceUsd,liquidityUsd,volume24hUsd].some(v=>v!==null)?'reported_snapshot':'unavailable',
     unit:'USD',priceUsd,liquidityUsd,volume24hUsd,observedAt:null,providerGeneratedAt:provenance.providerGeneratedAt}});
  } catch { rejected++; }
 }
 return {tokens,total,rejected,received:data.tokens.length,totalPages:pagination.totalPages as number};
}
function identity(token: CatalogToken) {
 return JSON.stringify([token.mint,token.poolMint,token.quoteMint,token.quoteSymbol,token.mode,token.symbol,token.name]);
}
export function verifyMode(value: unknown, token: CatalogToken): PairToken['modeVerification'] {
 const data = object(value);
 if (data.mint !== token.mint || data.mode !== token.mode) return 'identity_mismatch';
 if (data.mode === 'standard') return data.rewards === null ? 'verified_standard' : 'identity_mismatch';
 const quote = object(data.quote);
 if (quote.mint !== token.quoteMint || quote.symbol !== token.quoteSymbol) return 'identity_mismatch';
 // Verification is mode/quote identity, not a promise of payouts. Awaiting totals remain missing.
 return 'verified_reward';
}
export function createPairSource(fetcher: typeof fetch = fetch, clock: () => number = () => Date.now(), deadlineMs = 10_000, quoteMint: string | null = null) {
 if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 10_000) throw Error('invalid_deadline');
 if (quoteMint !== null && !isSolanaMint(quoteMint)) throw Error('invalid_quote_mint');
 const discovery: NonNullable<PairSnapshot['discovery']> = { strategy: quoteMint === null ? 'global_sample' : 'provider_quote_mint',
  quoteMint, providerReportedTotalScope: quoteMint === null ? 'catalog' : 'quote_mint' };
 let entry: PairSnapshot | null = null, fetched = 0, retryAt = 0;
 let pending: Promise<PairSourceResult> | null = null;
 const result = (sourceStatus: PairSourceResult['sourceStatus']): PairSourceResult => ({
  value:sourceStatus==='unavailable'?null:entry,sourceStatus,
 });
 async function refresh(): Promise<PairSourceResult> {
  const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),deadlineMs);
  let bytesRead = 0;
  async function read(url: string, maxBytes: number, v2 = false): Promise<{value:unknown;source:PairSource}> {
   if (controller.signal.aborted) throw Error('deadline');
   const local = new AbortController();
   const abort = ()=>local.abort();
   controller.signal.addEventListener('abort',abort,{once:true});
   const timeout = setTimeout(abort,3000);
   let rejectAbort: (error: Error)=>void = ()=>{};
   const stopped = new Promise<never>((_,reject)=>{rejectAbort=reject;});
   const onAbort = ()=>rejectAbort(Error('deadline'));
   local.signal.addEventListener('abort',onAbort,{once:true});
   try {
    const response = await Promise.race([fetcher(url,{method:'GET',redirect:'error',cache:'no-store',signal:local.signal,headers:{accept:'application/json'}}),stopped]);
    if (response.status===429) {
     const retry=response.headers.get('retry-after');
     const seconds=retry===null?60:/^[1-9]\d{0,3}$/.test(retry) && Number(retry)<=3600?Number(retry):null;
     // Never shorten an unsupported provider delay and retry early. Pause this instance instead.
     retryAt=seconds===null?Infinity:Math.max(retryAt,clock()+seconds*1000); controller.abort(); throw Error('rate_limited');
    }
    if (!response.ok || !response.body || Number(response.headers.get('content-length'))>maxBytes) throw Error('source_unavailable');
    for (const name of ['age','source-age']) {
     const age=response.headers.get(name);
     if (age!==null && (!/^\d+$/.test(age) || Number(age)>300)) throw Error('stale_transport');
    }
    const reader=response.body.getReader(), chunks:Uint8Array[]=[];let length=0;
    try {
     while(true) {
      const part=await Promise.race([reader.read(),stopped]); if(part.done)break;
      length+=part.value.byteLength;bytesRead+=part.value.byteLength;
      if(length>maxBytes || bytesRead>PAIR_MAX_BYTES)throw Error('oversized_source');
      chunks.push(part.value);
     }
    } finally { void reader.cancel().catch(()=>{}); }
    const bytes=Buffer.concat(chunks),value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    const root=object(value),metadata=v2?root:object(root.meta);
    const providerGeneratedAt=generated(metadata.generatedAt,clock());
    return {value,source:{source:url,fetchedAt:new Date(clock()).toISOString(),providerGeneratedAt,
     revision:'sha256:'+createHash('sha256').update(bytes).digest('hex')}};
   } finally {
    clearTimeout(timeout);controller.signal.removeEventListener('abort',abort);
    local.signal.removeEventListener('abort',onAbort);local.abort();
   }
  }
  try {
   const registry=await read(PAIR_REGISTRY_URL,512*1024),quotes=parsePairRegistry(registry.value);
   let registryEvidence:QuoteRegistrySnapshot|undefined;
   try {registryEvidence=parseQuoteRegistry(registry.value,registry.source);} catch { /* Existing discovery remains backward compatible; intervals fail closed. */ }
   const sources=[registry.source],warnings=['bounded_catalog','non_atomic_pagination','market_observation_time_unavailable'];
   if (quoteMint !== null && !quotes.some(q => q.mint === quoteMint)) {
    // A verified registry miss can support the existing 404 contract without
    // sending a token query or treating it as an empty verified pair.
    entry={quotes,tokens:[],sources,warnings,pagesFetched:0,recordsReceived:0,rejectedRecords:0,
     providerReportedTotal:null,modeChecks:0,fetchedAt:new Date(clock()).toISOString(),discovery};
    fetched=clock();return result('available');
   }
   const found=new Map<string,CatalogToken>(),conflicts=new Set<string>();
   let pagesFetched=0,recordsReceived=0,rejectedRecords=0,providerReportedTotal:number|null=null;
   for(let page=1;page<=2;page++) {
    try {
     const url=TOKEN_CATALOG_URL+'?sort=marketCap&page='+page+'&pageSize=25'+(quoteMint === null ? '' : '&quoteMint='+encodeURIComponent(quoteMint));
     const raw=await read(url,128*1024),parsed=parseCatalogPage(raw.value,page,quotes,raw.source,quoteMint);
     sources.push(raw.source);pagesFetched++;recordsReceived+=parsed.received;rejectedRecords+=parsed.rejected;
     if(providerReportedTotal!==null && providerReportedTotal!==parsed.total)warnings.push('pagination_total_changed');
     providerReportedTotal=parsed.total;
     for(const token of parsed.tokens) {
      if(conflicts.has(token.mint)){rejectedRecords++;continue;}
      const prior=found.get(token.mint);
      if(prior && identity(prior)!==identity(token)) {
       found.delete(token.mint);conflicts.add(token.mint);rejectedRecords+=2;warnings.push('conflicting_catalog_identity');
      } else if(!prior)found.set(token.mint,token);
      else warnings.push('duplicate_catalog_record');
     }
     if(page>=parsed.totalPages)break;
    } catch (error) {
     if (error instanceof Error && ['pair_filter_mismatch','incomplete_pair_page'].includes(error.message)) warnings.push(error.message);
     warnings.push('catalog_page_unavailable');break;
    }
   }
   if(!pagesFetched)throw Error('catalog_unavailable');
   if(rejectedRecords)warnings.push('rejected_catalog_records');
   const tracked=new Set(trackedTokens().map(t=>t.mint));
   const candidates=[...found.values()].sort((a,b)=>Number(tracked.has(b.mint))-Number(tracked.has(a.mint)) || a.mint.localeCompare(b.mint,'en')).slice(0,12);
   let modeChecks=0,next=0;
   await Promise.all(Array.from({length:3},async()=>{
    while(next<candidates.length) {
     const token=candidates[next++];
     if(controller.signal.aborted){token.modeVerification='source_unavailable';token.modeFailure='deadline';warnings.push('mode_check_unavailable');continue;}
     modeChecks++;
     try {
      const raw=await read(REWARD_V2_URL+token.mint+'/rewards',32*1024,true);
      token.modeVerification=verifyMode(raw.value,token);token.rewardSource=raw.source;sources.push(raw.source);
      if(token.modeVerification==='verified_reward') {
       const data=object(raw.value),q=object(data.quote),verified=quotes.find(q=>q.mint===token.quoteMint);
       token.lifetimeReceipt=verified && q.decimals===verified.decimals
        ? parseLedgerLifetime(data,verified.decimals,raw.source.providerGeneratedAt)
        : {state:'unavailable',value:null,reason:'units_unverified'};
      }
      if(token.modeVerification==='identity_mismatch') {
       found.delete(token.mint);rejectedRecords++;warnings.push('reward_identity_mismatch');
      }
     } catch(error) {
      const code=error instanceof Error?error.message:'';
      token.modeFailure=(['rate_limited','provider_cooldown','stale_transport','stale_source','invalid_source','deadline','oversized_source'].includes(code)?code:'source_unavailable') as CatalogToken['modeFailure'];
      token.modeVerification='source_unavailable';warnings.push('mode_check_unavailable');
     }
    }
   }));
   entry={quotes,tokens:[...found.values()].sort((a,b)=>a.mint.localeCompare(b.mint,'en')),sources:sources.sort((a,b)=>a.source.localeCompare(b.source,'en')),
    warnings:[...new Set(warnings)].sort(),pagesFetched,recordsReceived,rejectedRecords,providerReportedTotal,modeChecks,fetchedAt:new Date(clock()).toISOString(),discovery,registryEvidence};
   fetched=clock();
   const degraded=entry.warnings.some(w=>!['bounded_catalog','non_atomic_pagination','market_observation_time_unavailable','duplicate_catalog_record'].includes(w));
   if(degraded)retryAt=Math.max(retryAt,clock()+60_000);
   return result(degraded?'degraded':'available');
  } catch {entry=null;retryAt=Math.max(retryAt,clock()+60_000);return result('unavailable');}
  finally {clearTimeout(timer);controller.abort();}
 }
 return async ():Promise<PairSourceResult>=>{
  if(entry && entry.sources.some(s=>clock()-Date.parse(s.providerGeneratedAt)>3*3600_000 || Date.parse(s.providerGeneratedAt)-clock()>60_000))entry=null;
  if(entry && clock()-fetched<PAIR_CACHE_MS) {
   const degraded=entry.warnings.some(w=>!['bounded_catalog','non_atomic_pagination','market_observation_time_unavailable','duplicate_catalog_record'].includes(w));
   return result(degraded?'degraded':'cached');
  }
  if(clock()<retryAt)return result('unavailable');
  if(pending)return pending;
  pending=refresh();try{return await pending;}finally{pending=null;}
 };
}
export const PAIR_SCOPE_CACHE_LIMIT=4;
export const PAIR_SCOPE_REFRESH_MS=60_000;
export function createPairSources(fetcher: typeof fetch = fetch, clock: () => number = () => Date.now()) {
 let blockedUntil=0, nextScopedRefresh=0;
 const cooledFetch: typeof fetch = async (...args) => {
  if (clock()<blockedUntil) throw Error('provider_cooldown');
  const response=await fetcher(...args);
  if (response.status===429) {
   const retry=response.headers.get('retry-after');
   const seconds=retrySeconds(retry);
   blockedUntil=seconds===null?Infinity:Math.max(blockedUntil,clock()+seconds*1000);
  }
  return response;
 };
 type Slot = { read: ReturnType<typeof createPairSource>; expires: number; busy: number };
 const scopes=new Map<string,Slot>();
 const unavailable = ():PairSourceResult => ({value:null,sourceStatus:'unavailable'});
 async function scoped(mint: string):Promise<PairSourceResult> {
  if (!isSolanaMint(mint)) return unavailable();
  let slot=scopes.get(mint);
  if (!slot) {
   if (clock()<blockedUntil || clock()<nextScopedRefresh) return unavailable();
   for (const [key,entry] of scopes) if (!entry.busy && clock()>=entry.expires) scopes.delete(key);
   if (scopes.size>=PAIR_SCOPE_CACHE_LIMIT) return unavailable();
   const created:Slot={read:async()=>unavailable(),expires:clock()+PAIR_CACHE_MS,busy:0};
   const boundedFetch: typeof fetch = async (...args) => {
    if (String(args[0])===PAIR_REGISTRY_URL) {
     if (clock()<nextScopedRefresh) throw Error('scoped_refresh_budget');
     nextScopedRefresh=clock()+PAIR_SCOPE_REFRESH_MS;created.expires=clock()+PAIR_CACHE_MS;
    }
    return cooledFetch(...args);
   };
   created.read=createPairSource(boundedFetch,clock,10_000,mint);
   scopes.set(mint,created);slot=created;
  }
  slot.busy++;
  try {
   const result=await slot.read();
   if (result.value) slot.expires=Date.parse(result.value.fetchedAt)+PAIR_CACHE_MS;
   return result;
  } finally {slot.busy--;}
 }
 return {global:createPairSource(cooledFetch,clock),scoped,quotes:createQuoteRegistrySource(cooledFetch,clock)};
}
const pairSources=createPairSources((...args)=>fetch(...args));
export const readPairSource=pairSources.global;
export const readScopedPairSource=pairSources.scoped;
export const readPairQuoteRegistry=pairSources.quotes;
