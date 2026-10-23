// New private parent endpoints only. Existing one-shot GET/STOP and consumer are untouched.
import {createHash,timingSafeEqual} from 'node:crypto';
import {nativeStore} from './database.mjs';
import {requestOrigin} from './origin.mjs';
import {uuid,digest,validMaintenance,eventOf} from './policy.mjs';
const headers={'Cache-Control':'private, no-store, max-age=0','Vary':'Authorization, Cookie','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const response=(value,status)=>new Response(JSON.stringify(value),{status,headers});
const empty=status=>({version:'unfarmd-continuous-feed/1',status,observedAt:new Date().toISOString(),parent:null,feed:null});
function authorized(req,env,kind){
 if(!requestOrigin(req,env,kind))return false;
 const token=env[kind==='maintenance'?'SCOUT_CONTINUOUS_MAINTENANCE_TOKEN':'SCOUT_CONTINUOUS_OWNER_TOKEN'],bearer=req.headers.get('authorization');
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43,128}$/.test(token)||typeof bearer!=='string'||!/^Bearer [A-Za-z0-9_-]{43,128}$/.test(bearer))return false;
 return timingSafeEqual(createHash('sha256').update(token).digest(),createHash('sha256').update(bearer.slice(7)).digest());
}
async function body(req,max){
 if(req.signal.aborted||req.bodyUsed||req.body?.locked)throw 0;
 if(!req.body)return '';
 const reader=req.body.getReader();let timer,done=false;
 try{
  return await Promise.race([(async()=>{let bytes=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});while(true){const r=await reader.read();if(r.done){done=true;return text+decoder.decode();}bytes+=r.value.byteLength;if(bytes>max)throw 0;text+=decoder.decode(r.value,{stream:true});}})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('body_timeout')),250);})]);
 }finally{clearTimeout(timer);if(!done)void reader.cancel().catch(()=>{});}
}
export function browserFeed(r){
 const h=r.health,source=h.source,t=Date.parse(r.observedAt),times=[source?.lastFrameAt,source?.lastPongAt].filter(Boolean).map(Date.parse),sourceAge=times.length?t-Math.max(...times):null;
 const stale=r.gate!==null&&r.gate!=='unapproved'&&r.gate!=='not_started'||r.worker!==null&&t>=Date.parse(r.leaseUntil)||r.connected&&source?.sourceState==='open'&&(sourceAge===null||sourceAge<0||sourceAge>45000);
 const status=r.stopped?'stopped':stale?'stale':r.connected&&source?.sourceState==='open'&&sourceAge!==null&&sourceAge>=0&&sourceAge<=45000?'observing':'waiting';
 const feed={version:'scout-live/1',status,observedAt:r.observedAt,events:r.events.map(eventOf),counts:r.counts,
 health:{state:r.stopped?'stopped':stale?'stale':status==='observing'?'connected':r.parent===null?'unapproved':'idle',heartbeatAt:h.heartbeatAt,leaseUntil:r.leaseUntil,sourceState:source?.sourceState??(r.connected?'connecting':'closed'),lastFrameAt:source?.lastFrameAt??null,lastPongAt:source?.lastPongAt??null,lastRpcElapsedMs:source?.lastRpcRoundTripMs??null,gapSince:h.gapSince,gapEndedAt:h.gapEndedAt,gaps:h.gaps,errors:h.errors,stopped:r.stopped,reason:r.reason?.toLowerCase()??null},
 budget:{connectionsUsed:r.usage.connections,connectionsMax:r.limits?.connections??0,rpcUsed:r.usage.rpc,rpcMax:r.limits?.rpc??0,framesReserved:r.usage.frames,bytesReserved:r.usage.bytes,creditsReserved:r.usage.credits,creditsMax:r.limits?.credits??null,framesReceived:r.usage.framesReceived,bytesReceived:r.usage.bytesReceived,expiresAt:r.endsAt},retention:{seconds:3600,maxRecords:200,expiresOnRead:true}};
 return {version:'unfarmd-continuous-feed/1',status,observedAt:r.observedAt,parent:r.parent===null?null:{id:r.parent,grantHash:r.grantHash,head:r.head,endsAt:r.endsAt,stopped:r.stopped,reason:r.reason,connected:r.connected,leaseUntil:r.leaseUntil,child:r.child,usage:r.usage,limits:r.limits,assurance:r.assurance,gate:r.gate,maintenance:r.maintenance,retention:r.retention},feed};
}
export function continuousHandler(kind,{env=()=>process.env,storeFactory=nativeStore}={}){
 let store;
 return async req=>{
  const config=env();if(config[kind==='maintenance'?'SCOUT_CONTINUOUS_MAINTENANCE_ENABLED':'SCOUT_CONTINUOUS_API_ENABLED']!=='true')return response(empty('disabled'),503);
  if(req.method!==(kind==='reader'?'GET':'POST'))return response({error:'method_not_allowed'},405);
  if(!authorized(req,config,kind))return response({error:'access_denied'},403);
  if(req.headers.has('transfer-encoding'))return response({error:'invalid_request'},400);
  let command=null;
  try{
   if(kind==='stop'){
    const parent=req.headers.get('x-scout-continuous-parent'),grantHash=req.headers.get('x-scout-continuous-grant');
    if(req.headers.get('x-scout-live-intent')!=='STOP_SCOUT_CONTINUOUS'||!uuid(parent)||!digest(grantHash))throw 0;
    command={parent,grantHash};
   }
   const text=await body(req,kind==='maintenance'?8192:0);
   if(kind==='maintenance'){
    if(req.headers.get('content-type')!=='application/json'||req.headers.get('x-scout-live-intent')!=='MAINTAIN_SCOUT_CONTINUOUS')throw 0;
    command=JSON.parse(text);if(!validMaintenance(command))throw 0;
   }
  }catch{return response({error:'invalid_request'},400);}
  try{store??=storeFactory(kind,config);const result=await store.transact(command,{signal:req.signal});return response(kind==='reader'?browserFeed(result):result,200);}catch{return response(empty('unavailable'),503);}
 };
}
