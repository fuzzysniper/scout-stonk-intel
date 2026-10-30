import 'server-only';
import { request as httpsRequest,type RequestOptions } from 'node:https';
import type { ClientRequest,IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { isolatedHttpsTransport,nativeHeliusTransport } from '../onchain-mint/server/native-transport';
import type { Transport } from '../onchain-mint/server/rpc';
import { CA_SOURCE } from './index';
export type Wire = (options:RequestOptions,callback:(message:IncomingMessage)=>void)=>ClientRequest;
export type BoundWire = Readonly<{ jupiter:Transport;helius:Transport;kind:'synthetic_fixture'|'native_https' }>;
const registered=new WeakSet<BoundWire>();
const fail=()=>new Error('ca_transport_unavailable');
/** Fixed exact-one-mint GET only. Never global Fetch, credentials in URLs, redirect or retry. */
function jupiter(wire:Wire):Transport {
 return async(url,init)=>{
  const u=new URL(url),mint=u.searchParams.get('query');
  const {isExactPublicKey}=await import('../onchain-mint/validation');
  if(u.protocol!=='https:'||u.hostname!=='api.jup.ag'||u.port||u.username||u.password||u.hash||u.pathname!=='/tokens/v2/search'||!isExactPublicKey(mint)||u.search!=='?query='+mint||init.method!=='GET'||init.body||!init.signal||init.signal.aborted||init.redirect!=='error'||init.credentials!=='omit'||init.cache!=='no-store')throw fail();
  const key=new Headers(init.headers).get('x-api-key');if(key!==null&&!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw fail();
  return await new Promise<Response>((resolve,reject)=>{
   const bad=()=>reject(fail());
   try{const req=wire({protocol:'https:',hostname:'api.jup.ag',servername:'api.jup.ag',port:443,path:u.pathname+u.search,method:'GET',agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',maxHeaderSize:16384,insecureHTTPParser:false,timeout:5000,signal:init.signal!,headers:{accept:'application/json','accept-encoding':'identity',...(key?{'x-api-key':key}:{})}},message=>{
    try{const headers=new Headers();for(let i=0;i<message.rawHeaders.length;i+=2)headers.append(message.rawHeaders[i],message.rawHeaders[i+1]);if(headers.has('content-encoding')&&headers.get('content-encoding')!=='identity')throw fail();
      const stream=Readable.toWeb(message,{strategy:{highWaterMark:16384,size:(b:Uint8Array)=>b.byteLength}});resolve(new Response(stream as ReadableStream<Uint8Array>,{status:message.statusCode??502,headers}));
    }catch{message.destroy();bad();}
   });req.once('error',bad);req.once('timeout',()=>req.destroy());req.end();}catch{bad();}
  });
 };
}
function binding(x:BoundWire):BoundWire {const b=Object.freeze(x);registered.add(b);return b;}
export const nativeBinding=binding({kind:'native_https',jupiter:async(u,i)=>{if(!CA_SOURCE.enabled)throw fail();return jupiter(httpsRequest)(u,i);},helius:async(u,i)=>{if(!CA_SOURCE.enabled)throw fail();return nativeHeliusTransport(u,i);}});
export function localBinding(wire:Wire):BoundWire {
 if(process.env.NODE_ENV!=='test')throw fail();const j=jupiter(wire),h=isolatedHttpsTransport(wire);
 return binding({kind:'synthetic_fixture',jupiter:(u,i)=>{if(process.env.NODE_ENV!=='test')throw fail();return j(u,i);},helius:(u,i)=>{if(process.env.NODE_ENV!=='test')throw fail();return h(u,i);}});
}
export const isBinding=(b:BoundWire)=>registered.has(b);
