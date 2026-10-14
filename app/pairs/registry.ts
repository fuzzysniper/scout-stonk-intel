import type { PairQuoteRegistry, PairQuote, PairCatalog } from '../../lib/pairs-contract';
import { validMint } from './adapter';
export type { PairQuoteRegistry, PairQuote };
export const REGISTRY_PAGE_SIZE=12;
export const REGISTRY_WINDOW_LIMIT=48;
const object=(v:unknown):Record<string,unknown>=>{if(!v || typeof v!=='object' || Array.isArray(v))throw Error('Invalid registry');return v as Record<string,unknown>;};
function requireValue(v:unknown):asserts v {if(!v)throw Error('Invalid registry');}
const count=(v:unknown,max=1024):v is number=>typeof v==='number' && Number.isSafeInteger(v) && v>=0 && v<=max;
const text=(v:unknown,max:number):v is string=>typeof v==='string' && v.trim().length>0 && v.length<=max && !/[\p{Cc}\p{Cs}]/u.test(v);
const date=(v:unknown):v is string=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,19)===v.slice(0,19);
export function registrySearch(raw:string,offset=0) {
 if([...raw].length>64 || /[\p{Cc}\p{Cs}]/u.test(raw) || !count(offset))throw Error('Invalid search');
 const trimmed=raw.trim(),mint=validMint(trimmed)?trimmed:null,query=mint?'':trimmed.normalize('NFKC').toLowerCase();
 if([...query].length>64)throw Error('Invalid search');
 return {query,mint,offset,limit:REGISTRY_PAGE_SIZE};
}
export function parseRegistry(raw:unknown):PairQuoteRegistry {
 const r=object(raw),s=object(r.search),d=object(r.dataset),c=object(d.coverage);
 requireValue(r.schemaVersion===1 && ['available','not_found','unavailable'].includes(String(r.status)) && Array.isArray(r.quotes) && r.quotes.length<=100);
 requireValue(typeof s.query==='string' && [...s.query].length<=64 && !/[\p{Cc}\p{Cs}]/u.test(s.query) && (s.mint===null || validMint(s.mint)) && count(s.offset) && count(s.limit,100) && s.limit>=1);
 requireValue(d.scope==='official_quote_registry' && date(d.fetchedAt) && c.tokenCatalogComplete===false && c.responseLimit===s.limit && c.returnedCount===r.quotes.length && r.quotes.length<=s.limit);
 if(r.status==='unavailable') {
  requireValue(d.sourceStatus==='unavailable' && d.dataFetchedAt===null && d.provenance===null && r.quotes.length===0 && c.registryResponse==='unavailable' && c.registryCount===null && c.matchedCount===null && c.nextOffset===null && c.resultTruncated===null && c.providerAmbiguousSymbolCount===null);
 }else {
  const p=object(d.provenance);
  requireValue(['available','cached'].includes(String(d.sourceStatus)) && date(d.dataFetchedAt) && p.source==='https://www.stonkfun.xyz/api/public/v1/pairs' && date(p.fetchedAt) && date(p.providerGeneratedAt) && d.dataFetchedAt===p.fetchedAt && typeof p.revision==='string' && /^sha256:[a-f0-9]{64}$/.test(p.revision));
  requireValue(c.registryResponse==='validated_unpaginated' && count(c.registryCount) && c.registryCount>0 && count(c.matchedCount) && c.matchedCount<=c.registryCount && count(c.providerAmbiguousSymbolCount) && c.providerAmbiguousSymbolCount<=c.registryCount);
  requireValue(r.quotes.length===Math.min(s.limit,Math.max(0,c.matchedCount-s.offset)) && c.nextOffset===(s.offset+r.quotes.length<c.matchedCount?s.offset+r.quotes.length:null) && c.resultTruncated===(r.quotes.length<c.matchedCount));
  if(r.status==='not_found')requireValue(s.mint!==null && s.query==='' && c.matchedCount===0);
  const mints=new Set<string>();
  for(const rawQuote of r.quotes) {
   const q=object(rawQuote);
   requireValue(validMint(q.quoteMint) && !mints.has(q.quoteMint) && text(q.quoteSymbol,32) && text(q.quoteName,160) && count(q.decimals,18) && ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'].includes(String(q.tokenProgram)));
   requireValue(typeof q.providerSymbolAmbiguous==='boolean' && typeof q.symbolAmbiguous==='boolean' && count(q.symbolMatchCount) && q.symbolMatchCount>=1 && q.symbolMatchCount<=c.registryCount && q.symbolAmbiguous===(q.symbolMatchCount>1) && (!q.providerSymbolAmbiguous || q.symbolAmbiguous) && q.verification==='official_registry_only' && q.verifiedAt===p.fetchedAt);
   requireValue(s.mint!==null?q.quoteMint===s.mint:[q.quoteSymbol,q.quoteName].some(v=>(v as string).normalize('NFKC').toLowerCase().includes(s.query as string)));
   mints.add(q.quoteMint);
  }
 }
 return r as PairQuoteRegistry;
}
/** Never append different registry revisions or quietly merge duplicate identities. */
export function appendRegistryPage(pages:PairQuoteRegistry[],next:PairQuoteRegistry):PairQuoteRegistry[] {
 if(!pages.length){if(next.search.offset!==0)throw Error('Registry changed');return [next];}
 const prior=pages.at(-1)!;
 if(next.status!=='available' || prior.dataset.coverage.nextOffset!==next.search.offset || next.search.query!==prior.search.query || next.search.mint!==prior.search.mint || next.search.limit!==prior.search.limit || next.dataset.provenance?.revision!==prior.dataset.provenance?.revision || next.dataset.dataFetchedAt!==prior.dataset.dataFetchedAt || next.dataset.coverage.registryCount!==prior.dataset.coverage.registryCount || next.dataset.coverage.matchedCount!==prior.dataset.coverage.matchedCount || pages.flatMap(p=>p.quotes).some(q=>next.quotes.some(n=>n.quoteMint===q.quoteMint)))throw Error('Registry changed');
 if(pages.reduce((n,p)=>n+p.quotes.length,0)+next.quotes.length>REGISTRY_WINDOW_LIMIT)throw Error('Refine search');
 return [...pages,next];
}
export function catalogMatchesQuote(catalog:PairCatalog,quote:PairQuote):boolean {
 const g=catalog.groups[0];
 return catalog.groups.length===1 && g.quoteMint===quote.quoteMint && g.quoteSymbol===quote.quoteSymbol && g.quoteName===quote.quoteName && g.decimals===quote.decimals && g.tokenProgram===quote.tokenProgram;
}
