import type {DisplayContext} from './onchain-model';
import {addressQuery} from './onchain-model';
export type MintReadOutcome={httpStatus:number;body:unknown;retryMs?:number};
/** Test harness injection is trusted code, not URL/environment/server configuration. */
export type MintFactsPort={context:DisplayContext;read:(mint:string,signal:AbortSignal)=>Promise<MintReadOutcome>};
const unavailable=(mint:string,reason:string)=>({version:'mint-facts/1',status:'unavailable',mint,facts:null,source:null,reason,warnings:[]});
export async function requestMintFacts(mint:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<MintReadOutcome>{
 addressQuery(mint);
 const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,6000);let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const aborted=new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true});});
 if(signal.aborted)controller.abort();
 try{
  const work=(async()=>{
   const response=await fetcher('/api/mint-facts?mint='+encodeURIComponent(mint),{method:'GET',headers:{accept:'application/json'},signal:controller.signal,credentials:'omit',cache:'no-store',redirect:'error',mode:'same-origin',referrerPolicy:'no-referrer'});
   const retryHeader=response.headers.get('retry-after');
   if(response.status===429){const retryMs=retryHeader&&/^\d{1,6}$/.test(retryHeader)?Math.min(300_000,Math.max(1000,Number(retryHeader)*1000)):30_000;return {httpStatus:429,body:unavailable(mint,'rate_limited'),retryMs};}
   const json=response.headers.get('content-type')?.toLowerCase().includes('application/json');
   if(response.status===404&&!json)return {httpStatus:404,body:unavailable(mint,'disabled')};
   if(!json){if(response.status===401||response.status===403)return {httpStatus:response.status,body:unavailable(mint,'access_denied')};if(response.status>=500)return {httpStatus:response.status,body:unavailable(mint,'upstream_unavailable')};throw Error('invalid_response');}
   if(Number(response.headers.get('content-length'))>32768)throw Error('response_too_large');
   reader=response.body?.getReader();if(!reader)throw Error('invalid_response');
   const decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768)throw Error('response_too_large');text+=decoder.decode(value,{stream:true});}
   text+=decoder.decode();return {httpStatus:response.status,body:JSON.parse(text)};
  })();
  return await Promise.race([work,aborted]);
 }catch(error){return {httpStatus:503,body:unavailable(mint,controller.signal.aborted?'timeout':error instanceof Error&&error.message==='response_too_large'?'response_too_large':error instanceof SyntaxError||error instanceof Error&&error.message==='invalid_response'?'invalid_response':'network_unavailable')};}
 finally{clearTimeout(timer);signal.removeEventListener('abort',abort);controller.abort();void reader?.cancel().catch(()=>{});}
}
// Tab-local backoff supplements, and never claims to replace, the server's distributed admission.
let cooldownUntil=0;
export const productionMintFactsPort:MintFactsPort=Object.freeze({context:'production',read:async(mint,signal)=>{
 if(Date.now()<cooldownUntil)return {httpStatus:429,body:unavailable(mint,'rate_limited'),retryMs:cooldownUntil-Date.now()};
 const outcome=await requestMintFacts(mint,signal);if(outcome.httpStatus===429)cooldownUntil=Date.now()+(outcome.retryMs??30_000);return outcome;
}});
