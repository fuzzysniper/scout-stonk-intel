import 'server-only';
import https from 'node:https';
import type {ClientRequest} from 'node:http';
import {checkServerIdentity,type TLSSocket} from 'node:tls';
import type {Pool} from 'pg';
import {acquire,type Capture,type Intake,type Analyze} from './engine';
import {ownerSession} from './auth';
import type {NativePostgresConfiguration} from './postgres/connection';
import type {Ledger} from './ledger';
import {nativeSourcePermitted,nativeSetupRecord,type NativeSourceAdmission} from './admission/installed';
import {NATIVE_SETUP_RUNTIME_ENABLED} from './admission/gates';
import {policy,HOST,hash,need,LIMITS,type Policy} from './plan';
import type {NativeEvidenceV1} from './evidence-contract';
/** New, independent lane. Not an env toggle, old grant, caller flag or signed-lane bypass. */
export const NATIVE_PILOT_ENABLED=false;
export const NATIVE_PILOT_BUILD:Readonly<{commit:string;tree:string}>|null=null;
export {plan,LIMITS,METHODS} from './plan';
export type {Policy,Debit,Plan} from './plan';
export type {NativeEvidenceV1,NativeEvidenceInputV1} from './evidence-contract';
const held=()=>Object.freeze({status:'held' as const,activate:false as const,providerAuthenticated:false as const});
declare const nativeBrand:unique symbol;
export type NativeObservation=Readonly<{[nativeBrand]:true}>;
const observations=new WeakMap<NativeObservation,{expires:number;valid:()=>Promise<boolean>;evidence:NativeEvidenceV1;receipts:readonly Readonly<{requestSha256:string;responseSha256:string;requestStartedAt:string;receivedAt:string}>[]}>();
export async function verifiedNativeObservation(value:unknown){
 try{
 const v=value&&typeof value==='object'?observations.get(value as NativeObservation):undefined;
 if(!v||Date.now()>=v.expires||!await v.valid())return null;
 return Object.freeze({acquisition:'native_fixed_host_tls' as const,evidence:v.evidence,receipts:v.receipts,commitment:'finalized_requested_not_independently_proven' as const});
 }catch{return null;}
}
function identity(p:Policy){
 const e=process.env,b=NATIVE_PILOT_BUILD;
 return !!b&&b.commit===p.commit&&b.tree===p.tree&&e.VERCEL==='1'&&e.VERCEL_ENV==='preview'&&e.VERCEL_GIT_PROVIDER==='github'
  &&e.VERCEL_GIT_REPO_OWNER==='fuzzysniper'&&e.VERCEL_GIT_REPO_SLUG==='scout-stonk-intel'&&e.VERCEL_PROJECT_ID===p.project
  &&e.VERCEL_DEPLOYMENT_ID===p.deployment&&e.VERCEL_GIT_COMMIT_SHA===p.commit&&e.VERCEL_GIT_COMMIT_REF===p.branch&&'https://'+e.VERCEL_URL===p.origin;
}
function wire(body:string,key:string):Promise<Capture>{
 need(Buffer.byteLength(body)<=LIMITS.requestBytes&&/^[A-Za-z0-9_-]{16,256}$/.test(key));
 return new Promise((resolve,reject)=>{
  const started=Date.now(),chunks:Buffer[]=[];let total=0,settled=false,authenticated=false,req:ClientRequest|undefined,timer:NodeJS.Timeout|undefined;
  const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);req?.destroy();for(const b of chunks)b.fill(0);reject(Error('native_pilot_held'));};
  try{
  // Private fixed host/443/path; no URL input, global fetch, redirect, retry or fallback.
  req=https.request({hostname:HOST,servername:HOST,port:443,path:'/?api-key='+key,method:'POST',agent:false,
   rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity,maxHeaderSize:LIMITS.headerBytes,
   headers:{'content-type':'application/json','content-length':Buffer.byteLength(body),'accept-encoding':'identity'}},res=>{
   if(!authenticated||res.statusCode!==200||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'
    ||!/^application\/json(?:;|$)/i.test(res.headers['content-type']??'')){res.destroy();fail();return;}
   res.on('data',(chunk:Buffer)=>{total+=chunk.length;if(total>LIMITS.responseBytes){res.destroy();fail();}else chunks.push(Buffer.from(chunk));});
   res.on('aborted',fail);res.on('error',fail);res.on('end',()=>{
    if(settled)return;if(total===0||!res.complete||Date.now()<started||Date.now()-started>LIMITS.timeoutMs){fail();return;}
    settled=true;clearTimeout(timer);const responseBytes=Buffer.concat(chunks);for(const b of chunks)b.fill(0);
    resolve({endpointHost:HOST,requestBody:body,responseBytes,httpStatus:200,requestStartedAt:new Date(started).toISOString(),receivedAt:new Date().toISOString()});
   });
  });
  timer=setTimeout(fail,LIMITS.timeoutMs);timer.unref();
  req.on('error',fail);req.on('socket',socket=>{const s=socket as TLSSocket;s.once('secureConnect',()=>{
   authenticated=s.encrypted&&s.authorized&&s.servername===HOST&&['TLSv1.2','TLSv1.3'].includes(s.getProtocol()??'')&&!checkServerIdentity(HOST,s.getPeerCertificate());
   if(!authenticated)fail();
  });});req.end(body);
  }catch{fail();}
 });
}
export type Configuration=Readonly<{policy:Policy;store:NativePostgresConfiguration;sourceAdmission:NativeSourceAdmission;
 issuerPool:Pool;tlsHost:string;authSecret:string;readKey:()=>string;intake:Intake;analyze:Analyze}>;
/** No route, env/key read, SQL, filesystem, auth call or network at construction while OFF.
 * This body is the future assembly, not an operational activation supplied by this PR. */
export function createNativePilot(config:Configuration){
 if(!NATIVE_PILOT_ENABLED||!NATIVE_PILOT_BUILD)return Object.freeze({inspect:async()=>held(),stop:async()=>held()});
 const p=policy(config.policy);need(identity(p)&&nativeSourcePermitted(config.sourceAdmission,config.store.admission,p));
 // Loader cache only, never admission state. No PG import/credential construction before owner verification.
 let opened:Promise<Ledger>|undefined;
 const store=()=>opened??=import('./postgres/connection').then(m=>m.openPostgresLedger(p,config.store));
 const ledger:Ledger={inspect:async()=> (await store()).inspect(),reserve:async(...a)=> (await store()).reserve(...a),
  finish:async(...a)=> (await store()).finish(...a),stop:async(...a)=> (await store()).stop(...a)};
 assertOwnerBindings(config,p);const authorize=ownerSession(p,config.authSecret,config.issuerPool,config.tlsHost);
 let terminal=false;
 const live=()=>!terminal&&identity(p)&&nativeSourcePermitted(config.sourceAdmission,config.store.admission,p);
 return Object.freeze({
  async inspect(request:Request){
   if(!live())return held();
   const receipts:{requestSha256:string;responseSha256:string;requestStartedAt:string;receivedAt:string}[]=[];
   const result=await acquire(p,request,{ledger,authorize,identity:live,clock:Date.now,wait:ms=>new Promise(r=>setTimeout(r,ms)),intake:config.intake,analyze:config.analyze,
    wire:async body=>{need(live());const key=config.readKey();need(hash(key)===p.keySha256);const c=await wire(body,key);
     receipts.push(Object.freeze({requestSha256:hash(body),responseSha256:hash(c.responseBytes),requestStartedAt:c.requestStartedAt,receivedAt:c.receivedAt}));return c;}},'recorded_response');
   if(result.status!=='candidate')return result;
   const observation=Object.freeze({}) as NativeObservation,created=Date.now(),expires=Math.min(created+60000,p.expiresAt);
   observations.set(observation,{expires,valid:async()=>{const now=Date.now();if(now<created){terminal=true;try{await ledger.stop(now);}catch{/* HOLD, no history repair. */}return false;}return live()&&now<p.expiresAt&&!(await ledger.inspect()).stopped;},evidence:result.evidence,receipts:Object.freeze(receipts)});
   const timer=setTimeout(()=>observations.delete(observation),Math.max(0,expires-Date.now()));timer.unref();
   return Object.freeze({status:'observation' as const,activate:false as const,observation});
  },
  async stop(request:Request){
   if(!identity(p)||request.headers.get('x-unfarmd-native-intent')!=='stop'||!await authorize(request))return held();
   try{nativeSetupRecord(config.store.admission,p);terminal=true;const r=await ledger.stop(Date.now());return Object.freeze({status:r.state.stopped?'stopped':'held',activate:false});}catch{return held();}
  }
 });
}

/** Setup authority can only STOP; it cannot inspect/acquire/read a provider key.
 * Source approval/expiry is deliberately irrelevant to durable owner STOP. */
export function createNativeStopper(config:Omit<Configuration,'sourceAdmission'|'intake'|'analyze'>){
 if(!NATIVE_SETUP_RUNTIME_ENABLED)return Object.freeze({stop:async()=>held()});
 const p=policy(config.policy);need(identity(p));nativeSetupRecord(config.store.admission,p);
 assertOwnerBindings(config,p);const authorize=ownerSession(p,config.authSecret,config.issuerPool,config.tlsHost);
 return Object.freeze({async stop(request:Request){
  try{need(identity(p)&&request.headers.get('x-unfarmd-native-intent')==='stop'&&await authorize(request));nativeSetupRecord(config.store.admission,p);
   const {openPostgresLedger}=await import('./postgres/connection');const r=await openPostgresLedger(p,config.store).stop(Date.now());
   return Object.freeze({status:r.state.stopped?'stopped':'held',activate:false});
  }catch{return held();}
 }});
}

function assertOwnerBindings(config:Omit<Configuration,'sourceAdmission'|'intake'|'analyze'>,p:Policy){
 const s=nativeSetupRecord(config.store.admission,p).record,o=config.issuerPool.options;
 need(hash(config.authSecret)===s.owner.authSecretSha256&&config.tlsHost===s.database.host&&o.host===s.database.host&&o.database===s.database.database&&o.user==='unfarmd_v4_auth_login'&&typeof o.ssl==='object'&&hash(String(o.ssl.ca))===s.database.caSha256);
}
