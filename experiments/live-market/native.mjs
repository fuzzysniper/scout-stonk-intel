import https from 'node:https';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
/** Native capabilities are constructed only after exact-head approval and durable claim. */
export function nativePorts(scope){
 const approved=JSON.parse(fs.readFileSync(new URL('./scope.json',import.meta.url),'utf8')).scope;
 if(JSON.stringify(scope)!==JSON.stringify(approved))throw Error('PINNED_SCOPE_REQUIRED');
 if(require('ws/package.json').version!=='8.22.0'||!require.resolve('ws').startsWith(fileURLToPath(new URL('./node_modules/ws/',import.meta.url))))throw Error('PINNED_LOCAL_WS_INSTALL_REQUIRED');
 const {WebSocket}=require('ws'),agent=new https.Agent({keepAlive:true,maxSockets:1,maxTotalSockets:1});let opened=false,attempts=0;
 return {now:()=>new Date().toISOString(),later(ms,fn){const t=setTimeout(fn,ms);return ()=>clearTimeout(t);},
  open(handlers,signal){
   if(opened||signal.aborted)throw Error('ONE_CONNECTION_ONLY');opened=true;
   const ws=new WebSocket(scope.websocket,{maxPayload:scope.maxFrameBytes,maxFragments:32,maxBufferedChunks:64,allowSynchronousEvents:false,perMessageDeflate:false,followRedirects:false,handshakeTimeout:scope.timeoutMs,rejectUnauthorized:true,autoPong:false});
   signal.addEventListener('abort',()=>ws.terminate(),{once:true});
   ws.on('open',handlers.open);ws.on('message',(data,binary)=>{if(binary){handlers.error();return;}handlers.data(data.toString('utf8'));});
   // Reject control traffic rather than adding unbudgeted heartbeat/control exchanges.
   ws.on('ping',handlers.error);ws.on('pong',handlers.error);ws.on('error',handlers.error);ws.on('close',handlers.close);
   return {send:s=>ws.send(s),close:()=>{ws.terminate();agent.destroy();}};
  },
  read(body,signal){return new Promise((resolve,reject)=>{
   const p=JSON.parse(body),signature=p.method==='getTransaction'?p.params?.[0]:p.params?.[0]?.[0];
   if(typeof signature!=='string'||!(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/).test(signature))throw Error('SIGNATURE_REQUIRED');
   const allowed=p.method==='getTransaction'?{jsonrpc:'2.0',id:10,method:'getTransaction',params:[signature,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]}:{jsonrpc:'2.0',id:11,method:'getSignatureStatuses',params:[[signature],{searchTransactionHistory:true}]};
   if(body!==JSON.stringify(allowed)||attempts>=scope.maxRpcReads||signal.aborted)throw Error('READ_ONLY_SCOPE_OR_CAP');attempts++;
   const req=https.request(scope.rpc,{method:'POST',agent,signal,rejectUnauthorized:true,headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
    if(res.statusCode!==200||(res.headers?.['content-encoding']&&res.headers['content-encoding']!=='identity')){res.destroy();reject(Error('RPC_NON_200_OR_ENCODING_NO_RETRY'));return;}
    let size=0;const chunks=[];
    res.on('data',b=>{size+=b.length;if(size>scope.maxRpcResponseBytes){res.destroy();reject(Error('RPC_BODY_CAP'));}else chunks.push(b);});
    res.on('end',()=>{try{resolve(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks)));}catch{reject(Error('RPC_INVALID_UTF8'));}});res.on('error',()=>reject(Error('RPC_RESPONSE_FAILURE')));
   });
   const timer=setTimeout(()=>req.destroy(Error('RPC_TIMEOUT')),scope.timeoutMs);req.on('close',()=>clearTimeout(timer));req.on('error',()=>reject(Error('RPC_TRANSPORT_FAILURE')));req.end(body);
  });},
 };
}
