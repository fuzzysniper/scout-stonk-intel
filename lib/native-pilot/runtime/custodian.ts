import 'server-only';
import {fileAnchor} from '../../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs';
import {checkpointBoundary,type Custody} from '../postgres/checkpoint';
import {need,hash,digest} from '../plan';
import type {AnchorBootstrap} from '../ledger';
import fs from 'node:fs/promises';
/** Independently hosted runtime adapter for B's EXISTING MAC/CAS/fsync interface.
 * No SQL/provider/source credential, reseed/reset/repair endpoint or new protocol. */
export function createNativeCheckpointEndpoint(c:Custody,key:Buffer,directory:string,bootstrap:AnchorBootstrap){
 need(/^\/var\/data\/[a-z0-9-]{8,80}$/.test(directory)&&key.length===32&&hash(key)===c.keySha256&&digest(c.reviewSha256)&&bootstrap.policyHash===c.policyHash);
 const origin=new URL(c.origin);need(origin.protocol==='https:'&&origin.origin===c.origin&&!origin.username&&!origin.password&&!origin.port);
 const anchor=fileAnchor({directory,bootstrap}),boundary=checkpointBoundary(c,key,{current:()=>anchor.current(),async advance(a,b){await anchor.advance(a,b);return anchor.current();}});
 const handler=nativeCheckpointRequest(c,boundary);
 return async(request:Request)=>{
  try{const stat=await fs.lstat(directory);need(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0&&stat.uid===process.getuid?.()&&await fs.realpath(directory)===directory);return await handler(request);}
  catch{return Response.json({error:'native_checkpoint_held'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
 };
}
/** HTTP adapter for the existing authenticated boundary; no storage authority of its own. */
export function nativeCheckpointRequest(c:Custody,boundary:(path:string,body:unknown)=>Promise<unknown>){
 return async(request:Request):Promise<Response>=>{
  const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
  try{const u=new URL(request.url),h=request.headers;
   need(!request.signal.aborted&&u.origin===c.origin&&!u.search&&!u.hash&&request.method==='POST'&&['/native-checkpoint/read','/native-checkpoint/advance'].includes(u.pathname)
    &&h.get('origin')===c.origin&&h.get('content-type')==='application/json'&&!h.has('content-encoding')&&!h.has('authorization')&&Number(h.get('content-length')??0)<=4096&&request.body);
   const reader=request.body.getReader(),parts:Uint8Array[]=[];let bytes=0,chunks=0,timer:ReturnType<typeof setTimeout>|undefined;
   let text:string;try{text=await Promise.race([(async()=>{for(;;){const x=await reader.read();if(x.done)break;bytes+=x.value.length;need(bytes<=4096&&++chunks<=32&&!request.signal.aborted);parts.push(x.value);}return new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts));})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('body_timeout')),650);})]);}finally{clearTimeout(timer);void reader.cancel().catch(()=>{});}
   const {json}=await import('../../../experiments/jupiter-beta-approval/integration/json.mjs');return Response.json(await boundary(u.pathname,json(text)),{headers});
  }catch{return Response.json({error:'native_checkpoint_held'},{status:503,headers});}
 };
}
