/** Fixed same-origin GETs only; existing server adapters retain their own budgets. */
import {CARDS,cardsReport,watchInput,watchReport,type CardsReport,type WatchFinding} from './model';
export type ResearchRead<T>={state:'ready';value:T}|{state:'unavailable'|'not_found'|'rate_limited'|'invalid_response';retryAt:number};
const waits=new Map<string,number>();
function retryAt(value:string|null,now:number){
 if(value===null)return now+60000;
 if(/^\d+$/.test(value)){const n=Number(value);return Number.isSafeInteger(n)&&n<=86400?now+Math.max(1,n)*1000:Infinity;}
 const t=Date.parse(value);return Number.isFinite(t)&&t>now?t:Infinity;
}
async function read<T>(kind:'cards'|'watch',mint:string|undefined,signal:AbortSignal,project:(raw:unknown)=>T):Promise<ResearchRead<T>> {
 const at=waits.get(kind)??0;if(Date.now()<at)return {state:'rate_limited',retryAt:at};
 const url=kind==='cards'?'/api/pairs?quoteMint='+CARDS.mint+'&discovery=pair':'/api/token?mint='+encodeURIComponent(mint!);
 const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 const timer=setTimeout(abort,12000);
 try{
  const response=await fetch(url,{method:'GET',signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',headers:{accept:'application/json'}});
  if(response.status===429||response.status===503){const until=retryAt(response.headers.get('retry-after'),Date.now());waits.set(kind,until);return {state:response.status===429?'rate_limited':'unavailable',retryAt:until};}
  if(response.status===404)return {state:'not_found',retryAt:Date.now()+60000};
  if(!response.ok)return {state:'unavailable',retryAt:Date.now()+60000};
  if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body)return {state:'invalid_response',retryAt:Date.now()+60000};
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2*1024*1024)throw Error('Bound exceeded');chunks.push(part.value);}}finally{void reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return {state:'ready',value:project(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)))};
 }catch{return {state:'invalid_response',retryAt:Date.now()+60000};}
 finally{clearTimeout(timer);signal.removeEventListener('abort',abort);controller.abort();}
}
export const readCards=(signal:AbortSignal)=>read<CardsReport>('cards',undefined,signal,cardsReport);
export function readWatch(mint:string,signal:AbortSignal){if(!watchInput(mint))throw Error('Invalid mint');return read<WatchFinding>('watch',mint,signal,r=>watchReport(r,mint));}
