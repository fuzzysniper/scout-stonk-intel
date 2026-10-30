import 'server-only';
import {betterAuth,type BetterAuthOptions} from 'better-auth';
import {randomBytes,createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {OWNER_COOKIE,OWNER_COOKIE_OPTIONS} from '../v4-owner-ledger/auth';
import {verifiedPool} from '../v4-owner-ledger/postgres';
import {strictBindingEstablished} from '../../ops/v4-journal/native-tls.mjs';
import {parsePacket} from '../trader-pulse/validation';
import {OwnerReleaseAuthority,type OwnerRelease} from './release';
export type VerifiedSession=Readonly<{ownerSubject:string;journalOwnerId:string;issuer:string;audience:string;sessionId:string;authenticatedAt:number;expiresAt:number}>;
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Origin','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const reply=(status:number,error:string)=>Response.json({error},{status,headers});
async function packet(request:Request){
 if(request.headers.get('content-type')!=='application/json'||request.headers.has('content-encoding')||Number(request.headers.get('content-length')??0)>2048)throw Error('invalid_auth_request');
 if(!request.body)throw Error('invalid_auth_request');const reader=request.body.getReader(),parts:Uint8Array[]=[];let bytes=0,chunks=0;const start=Date.now();
 try{for(;;){let timer:ReturnType<typeof setTimeout>|undefined;const n=await Promise.race([reader.read(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('auth_body_timeout')),1000);})]).finally(()=>clearTimeout(timer));if(n.done)break;bytes+=n.value.byteLength;if(bytes>2048||++chunks>32||Date.now()-start>1500)throw Error('invalid_auth_request');parts.push(n.value);}return parsePacket(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts)));}finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
}
/** Real Better Auth issuer. No public signup/reset/OAuth, no cookie synthesis or principal cast. */
export function createOwnerIssuer(config:Readonly<{authority:OwnerReleaseAuthority;release:OwnerRelease;pool:Pool;enrollmentPool?:Pool;tlsHost:string;secret:string}>){
 const admitted=()=>config.authority.inspect(config.release);const release=admitted();if(!release)throw Error('owner_preview_not_admitted');
 if(typeof config.secret!=='string'||Buffer.byteLength(config.secret)<64||Buffer.byteLength(config.secret)>256||createHash('sha256').update(config.secret).digest('hex')!==release.authSecretSha256)throw Error('owner_issuer_configuration');
 const db=verifiedPool(config.pool,config.tlsHost),enrollDb=config.enrollmentPool?verifiedPool(config.enrollmentPool,config.tlsHost):null;let enrolling=false,enrollmentEmail='';
 async function policy(){const r=admitted();if(!r)return null;const c=await db.connect();try{if(!strictBindingEstablished(c))throw Error('native_binding_required');const row=(await c.query('SELECT owner_subject,journal_owner_id,issuer,audience,secret_sha256,enabled FROM unfarmd_v4_owner.policy WHERE singleton=true')).rows[0];return admitted()&&row?.enabled===true&&row.owner_subject===r.ownerSubject&&row.journal_owner_id===r.journalOwnerId&&row.issuer===r.issuer&&row.audience===r.identity.origin&&row.secret_sha256===r.authSecretSha256?r:null;}finally{c.release();}}
 const options={appName:'UNFARMD owner',baseURL:release.identity.origin,basePath:'/api/v4/owner',secret:config.secret,database:db,
  telemetry:{enabled:false},logger:{disabled:true},trustedOrigins:[release.identity.origin],socialProviders:{},plugins:[],rateLimit:{enabled:false},
  emailAndPassword:{enabled:true,autoSignIn:false,disableSignUp:false,minPasswordLength:16,maxPasswordLength:128},
  user:{modelName:'v4_owner_user'},account:{modelName:'v4_owner_account'},verification:{modelName:'v4_owner_verification'},
  session:{modelName:'v4_owner_session',expiresIn:900,disableSessionRefresh:true,deferSessionRefresh:true,cookieCache:{enabled:false},additionalFields:{issuer:{type:'string',required:true,input:false},audience:{type:'string',required:true,input:false}}},
  advanced:{...OWNER_COOKIE_OPTIONS,database:{generateId:({model})=>model==='user'?release.ownerSubject:randomBytes(24).toString('base64url')}},
  databaseHooks:{
   user:{create:{before:async u=>enrolling&&(!u.id||u.id===release.ownerSubject)&&u.email===enrollmentEmail?{data:{...u,id:release.ownerSubject,emailVerified:true}}:false},update:{before:async()=>false},delete:{before:async()=>false}},
   account:{create:{before:async a=>enrolling&&a.userId===release.ownerSubject&&a.providerId==='credential'?{data:a}:false},update:{before:async()=>false}},
   session:{create:{before:async s=>{const r=await policy();if(!r||s.userId!==r.ownerSubject)return false;const now=new Date();return {data:{...s,createdAt:now,updatedAt:now,expiresAt:new Date(Math.min(now.getTime()+900000,r.expiresAt)),issuer:r.issuer,audience:r.identity.origin}};}}},
  },
 } satisfies BetterAuthOptions;
 const auth=betterAuth(options),enrollAuth=enrollDb?betterAuth({...options,database:enrollDb}):null;
 function safe(request:Request,write=false){try{const r=admitted(),url=new URL(request.url);return !!r&&!request.signal.aborted&&url.origin===r.identity.origin&&!url.search&&!url.hash&&request.headers.get('sec-fetch-site')==='same-origin'&&(!request.headers.has('origin')||request.headers.get('origin')===r.identity.origin)&&(!write||request.headers.get('origin')===r.identity.origin)&&!['authorization','x-owner-id','x-owner-subject','x-owner-email','x-api-key','purpose','sec-purpose'].some(k=>request.headers.has(k));}catch{return false;}}
 async function session(request:Request):Promise<VerifiedSession|null>{try{
  if(!safe(request))return null;const r=await policy();if(!r)return null;const list=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(OWNER_COOKIE+'='));if(list.length!==1||list[0].length>1024)return null;
  const result=await auth.api.getSession({headers:new Headers({cookie:list[0]}),query:{disableCookieCache:true,disableRefresh:true}});const s=result?.session,t=Date.now();
  if(!result||!s||result.user.id!==r.ownerSubject||s.userId!==r.ownerSubject||s.issuer!==r.issuer||s.audience!==r.identity.origin||!admitted())return null;
  const start=new Date(s.createdAt).getTime(),end=new Date(s.expiresAt).getTime();if(start>t||end<=t||end-start>900000||end>r.expiresAt||typeof s.id!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(s.id)||!await policy())return null;
  return Object.freeze({ownerSubject:r.ownerSubject,journalOwnerId:r.journalOwnerId,issuer:r.issuer,audience:r.identity.origin,sessionId:s.id,authenticatedAt:start,expiresAt:end});
 }catch{return null;}}
 return Object.freeze({session,
  /** Server/operator-only one-time enrollment, never exposed by handler. Unknown ACK => HOLD. */
  async enroll(email:string,password:string){if(!enrollDb||!enrollAuth||enrolling||!await policy()||typeof email!=='string'||email.length>254||email!==email.toLowerCase()||password.length<16||password.length>128)throw Error('owner_enrollment_denied');
   const lock=await enrollDb.connect();try{if(!strictBindingEstablished(lock))throw Error('native_binding_required');await lock.query('SELECT pg_advisory_lock(243,2)');const count=(await lock.query('SELECT count(*)::int n FROM public.v4_owner_user')).rows[0]?.n;if(count!==0)throw Error('owner_already_enrolled');enrolling=true;enrollmentEmail=email;
    const result=await enrollAuth.api.signUpEmail({body:{name:'UNFARMD owner',email,password}});if(!result||result.user.id!==release.ownerSubject||!await policy())throw Error('owner_enrollment_uncertain');return Object.freeze({enrolled:true});
   }catch{throw Error('owner_enrollment_denied_or_uncertain');}finally{enrolling=false;enrollmentEmail='';try{await lock.query('SELECT pg_advisory_unlock(243,2)');}finally{lock.release();}}
  },
  async handler(request:Request):Promise<Response>{try{
   if(!admitted())return reply(503,'owner_preview_off');const path=new URL(request.url).pathname;
   if(!['/api/v4/owner/sign-in/email','/api/v4/owner/sign-out','/api/v4/owner/status'].includes(path))return reply(404,'not_found');
   const status=path.endsWith('/status');if(request.method!==(status?'GET':'POST'))return reply(405,'method_not_allowed');
   if(!safe(request,!status)||request.headers.get('x-unfarmd-owner-intent')!==(status?'status':path.endsWith('/sign-out')?'logout':'login'))return reply(403,'origin_or_intent_denied');
   if(status){const s=await session(request);return Response.json(s?{status:'signed_in',expiresAtMs:s.expiresAt}:{status:'signed_out'},{headers});}
   if(!await policy())return reply(401,'owner_session_required');
   if(path.endsWith('/sign-out')){if(!await session(request))return reply(401,'owner_session_required');const response=await auth.api.signOut({headers:request.headers,asResponse:true});const out=new Headers(headers);for(const cookie of response.headers.getSetCookie())out.append('Set-Cookie',cookie);return Response.json({status:'signed_out'},{headers:out});}
   const body=await packet(request);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='email,password'||typeof (body as {email?:unknown}).email!=='string'||typeof (body as {password?:unknown}).password!=='string')return reply(400,'invalid_auth_request');
   const input=body as {email:string;password:string};if(input.email.length>254||input.password.length<16||input.password.length>128)return reply(401,'owner_signin_denied');
   const c=await db.connect();let allowed=false;try{if(!strictBindingEstablished(c))throw Error('native_binding_required');allowed=(await c.query('SELECT unfarmd_v4_auth_ops.reserve_attempt() allowed')).rows[0]?.allowed===true;}finally{c.release();}if(!allowed)return reply(429,'owner_auth_rate_limited');
   const response=await auth.api.signInEmail({headers:request.headers,body:{email:input.email,password:input.password,rememberMe:false},asResponse:true});if(!response.ok||!await policy())return reply(401,'owner_signin_denied');
   const cookies=response.headers.getSetCookie();if(!cookies.some(v=>v.startsWith(OWNER_COOKIE+'=')))return reply(503,'owner_signin_uncertain');
   const out=new Headers(headers);for(const cookie of cookies)out.append('Set-Cookie',cookie);return Response.json({status:'signed_in'},{headers:out});
  }catch{return reply(503,'owner_auth_unavailable');}},
 });
}
