import 'server-only';
import {isExactPublicKey} from '../onchain-mint/validation';
import {parseJupiterCapture} from './market';
import {assemble,unavailable} from './result';
import type {MarketEvidence} from './contract';
import {presentIntelligence} from '../v4-owner-preview/presentation';
import {internalMarketPreview,marketPreviewHost} from './private-development-gate';

// This isolated lane is for the founder's Vercel-authenticated INTERNAL DEVELOPMENT
// preview only. No Helius, keys, public routes, paid plans, exports or persistence.
// Production/main, other feature branches and unsigned local builds remain OFF.
const jsonHeaders={
 'Cache-Control':'private, no-store, max-age=0',
 'Content-Type':'application/json; charset=utf-8',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Vary':'Cookie, Origin',
};
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:jsonHeaders});
function bodyTooLarge(reader:ReadableStreamDefaultReader<Uint8Array>,limit:number){
 return (async()=>{let total=0;const parts:Uint8Array[]=[];try{for(;;){const c=await reader.read();if(c.done)break;total+=c.value.byteLength;if(total>limit)throw Error('bounded_response');parts.push(c.value);}}finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
 const buffer=Buffer.concat(parts.map(p=>Buffer.from(p)),total);
 return new TextDecoder('utf-8',{fatal:true}).decode(buffer);})();
}
function nativeEvidence(m:MarketEvidence):MarketEvidence{
 // The offline parser verifies identical wire format/freshness/lexical decimal
 // invariants. Only this genuine HTTPS request may upgrade its capture provenance.
 const walk=(v:unknown):unknown=>{
  if(Array.isArray(v))return v.map(walk);
  if(v!==null&&typeof v==='object'){
   const x=Object.fromEntries(Object.entries(v).map(([k,val])=>[k,walk(val)]));
   if(x.provider==='jupiter_tokens_v2'&&x.captureKind==='recorded_response')x.captureKind='native_https';
   return x;
  }
  return v;
 };
 return walk(m) as MarketEvidence;
}
/** One deliberate CA -> one read-only, fixed-host keyless Jupiter request.
 * Vercel Authentication must block anonymous clients at the network edge.
 * Not the eventual globally budgeted multi-source runtime. Never claim that it is.
 */
export async function inspectPrivateDevelopment(request:Request):Promise<Response>{
 if(!internalMarketPreview())return response({error:'private_development_off'},503);
 let mint:string|null=null;
 try{
  const u=new URL(request.url),origin='https://'+marketPreviewHost();
  // Vercel terminates TLS before Next.js, so request.url can reflect an internal
  // HTTP origin. Bind the externally authenticated deployment to Host + HTTPS
  // forwarding + Origin instead of trusting that internal proxy URL's scheme.
  const host=request.headers.get('host'),forwardedHost=request.headers.get('x-forwarded-host'),proto=request.headers.get('x-forwarded-proto');
  if(request.method!=='POST'||host!==marketPreviewHost()||(forwardedHost!==null&&forwardedHost!==host)
   ||(proto!==null?proto!=='https':u.protocol!=='https:')
   ||u.pathname!=='/api/v4/ca-intelligence'||u.search||u.hash
   ||request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')!=='same-origin'
   ||request.headers.get('x-unfarmd-ca-intent')!=='inspect'
   ||request.headers.get('content-type')!=='application/json'
   ||request.headers.has('authorization')||request.headers.has('x-api-key')
   ||request.headers.has('content-encoding')
   ||Number(request.headers.get('content-length')??0)>256)return response({error:'request_denied'},403);
  const inbound=request.body?.getReader();
  if(!inbound)return response({error:'request_denied'},400);
  const raw=await bodyTooLarge(inbound,256);
  const o:unknown=JSON.parse(raw);
  if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join(',')!=='action,mint')return response({error:'invalid_request'},400);
  const p=o as {action?:unknown;mint?:unknown};
  if(p.action!=='inspect'||!isExactPublicKey(p.mint))return response({error:'invalid_mint'},400);
  mint=p.mint;
  const started=new Date().toISOString();
  // No dynamic URL components except an exactly validated 32-byte Solana address.
  const url='https://api.jup.ag/tokens/v2/search?query='+mint;
  const outgoing=await fetch(url,{method:'GET',redirect:'error',cache:'no-store',
    credentials:'omit',headers:{Accept:'application/json','Accept-Encoding':'identity'},
    signal:AbortSignal.timeout(5000)});
  if(outgoing.status===429)return response(presentIntelligence(unavailable(mint,'rate_limited')));
  if(!outgoing.ok||outgoing.redirected||outgoing.url!==url)return response(presentIntelligence(unavailable(mint,'unavailable')));
  const ct=outgoing.headers.get('content-type')??'';
  if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(ct))return response(presentIntelligence(unavailable(mint,'invalid_response')));
  const length=outgoing.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>131072))return response(presentIntelligence(unavailable(mint,'invalid_response')));
  const reader=outgoing.body?.getReader();
  if(!reader)return response(presentIntelligence(unavailable(mint,'unavailable')));
  const text=await bodyTooLarge(reader,131072),received=new Date().toISOString();
  const httpDate=outgoing.headers.get('date');
  const captured=parseJupiterCapture({mint,text,kind:'recorded_response',requestStartedAt:started,receivedAt:received,evaluatedAt:new Date().toISOString(),httpDate});
  // Never claim a fixture/replay as live; only actual completed HTTPS can label native_https.
  const normalized=nativeEvidence(captured);
  const view=presentIntelligence(assemble(mint,normalized,null));
  return response(view);
 }catch{
  // Fail closed. No fake price, guessed mint identity or plaintext provider body in logs.
  return mint?response(presentIntelligence(unavailable(mint,'unavailable'))):response({error:'inspection_unavailable'},503);
 }
}
