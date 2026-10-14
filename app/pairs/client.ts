import { parseCatalog, validMint, discoveryEvidence } from './adapter';
import type { PairCatalog } from './adapter';
import type { RadarReport } from '../../lib/radar';
export type CatalogRead={status:'ready';catalog:PairCatalog}|{status:'unavailable'|'not_found'};
async function boundedJson(response:Response) {
 if(!response.body || Number(response.headers.get('content-length'))>2*1024*1024)throw Error('Invalid response');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
 try {
  while(true){const p=await reader.read();if(p.done)break;length+=p.value.byteLength;if(length>2*1024*1024)throw Error('Oversized response');chunks.push(p.value);}
 }finally{void reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown;
}
export async function fetchCatalog(signal:AbortSignal,quoteMint?:string,pairScoped=false):Promise<CatalogRead> {
 if(quoteMint!==undefined && !validMint(quoteMint))throw Error('Invalid quote identity');
 const response=await fetch('/api/pairs'+(quoteMint?'?quoteMint='+encodeURIComponent(quoteMint)+(pairScoped?'&discovery=pair':''):''),{signal,cache:'no-store'});
 if(response.status===404)return {status:'not_found'};
 if(!response.ok)return {status:'unavailable'};
 const catalog=parseCatalog(await boundedJson(response));
 if(catalog.status==='unavailable')return {status:'unavailable'};
 if(quoteMint && (catalog.groups.length!==1 || catalog.groups[0].quoteMint!==quoteMint))throw Error('Invalid quote identity');
 if(pairScoped){const proof=discoveryEvidence(catalog);if(!quoteMint || proof?.strategy!=='provider_quote_mint' || proof.quoteMint!==quoteMint)throw Error('Unverified discovery scope');}
 return {status:'ready',catalog};
}
export async function fetchRadar(signal:AbortSignal):Promise<RadarReport> {
 const response=await fetch('/api/radar?sort=name',{signal,cache:'no-store'});
 const raw=await boundedJson(response);
 if((!response.ok && response.status!==503) || !raw || typeof raw!=='object')throw Error('Invalid observations');
 const r=raw as RadarReport;
 if(!['available','degraded','unavailable'].includes(r.status) || !Array.isArray(r.rows) || r.rows.length>10 || !r.dataset ||
    r.rows.some(row=>!row || !row.signals?.current || !row.signals?.previous || !row.windows?.['24h'] || !row.windows?.['7d'] || !row.pointChange))throw Error('Invalid observations');
 return r;
}
