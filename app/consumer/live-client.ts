import type {LiveFeed,StopReply} from '../../lib/live-ledger/contract';
import {decodeFeed,decodeStop} from './live-model';
export type LiveFailure='denied'|'unavailable'|'invalid_response'|'timeout'|'network';
type Result<T>={ok:true;value:T}|{ok:false;reason:LiveFailure;feed?:LiveFeed};
export const validOwnerToken=(v:string)=>/^[A-Za-z0-9_-]{43,128}$/.test(v);
async function request(kind:'read'|'stop',token:string,signal:AbortSignal,fetcher:typeof fetch):Promise<Result<LiveFeed|StopReply>>{
 if(!validOwnerToken(token))return {ok:false,reason:'denied'};
 const abort=new AbortController(),cancel=()=>abort.abort();signal.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(cancel,8000);let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const cancelled=new Promise<never>((_,reject)=>abort.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));
 if(signal.aborted)abort.abort();
 try{
  const task=(async()=>{
   const response=await fetcher(kind==='read'?'/api/live-events':'/api/live-events/stop',{method:kind==='read'?'GET':'POST',credentials:'same-origin',redirect:'error',cache:'no-store',mode:'same-origin',referrerPolicy:'no-referrer',signal:abort.signal,headers:{accept:'application/json',authorization:'Bearer '+token,...(kind==='stop'?{'X-Scout-Live-Intent':'STOP_SCOUT_LIVE'}:{})}});
   if(response.status===401||response.status===403)return {ok:false as const,reason:'denied' as const};
   if(!response.headers.get('content-type')?.toLowerCase().includes('application/json'))return {ok:false as const,reason:'invalid_response' as const};
   const max=kind==='read'?98304:4096;if(Number(response.headers.get('content-length'))>max)throw Error('invalid');
   reader=response.body?.getReader();if(!reader)throw Error('invalid');let bytes=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max)throw Error('invalid');text+=decoder.decode(value,{stream:true});}
   text+=decoder.decode();const raw:unknown=JSON.parse(text);
   if(kind==='stop'){const value=decodeStop(raw);return response.ok&&value?{ok:true as const,value}:{ok:false as const,reason:'unavailable' as const};}
   const value=decodeFeed(raw);if(!value)return {ok:false as const,reason:'invalid_response' as const};
   return response.ok&&value.status!=='disabled'&&value.status!=='unavailable'?{ok:true as const,value}:{ok:false as const,reason:'unavailable' as const,feed:value.status==='disabled'||value.status==='unavailable'?value:undefined};
  })();
  return await Promise.race([task,cancelled]);
 }catch(error){return {ok:false,reason:abort.signal.aborted?'timeout':error instanceof SyntaxError||error instanceof TypeError&&error.message.includes('encoded')||error instanceof Error&&error.message==='invalid'?'invalid_response':'network'};}
 finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);abort.abort();void reader?.cancel().catch(()=>{});}
}
export async function readLiveFeed(token:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<Result<LiveFeed>>{return request('read',token,signal,fetcher) as Promise<Result<LiveFeed>>;}
export async function stopLiveFeed(token:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<Result<StopReply>>{return request('stop',token,signal,fetcher) as Promise<Result<StopReply>>;}
