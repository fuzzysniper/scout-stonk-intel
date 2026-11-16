import 'server-only';
import {betterAuth} from 'better-auth';
import {randomBytes} from 'node:crypto';
import type {Pool,ClientConfig} from 'pg';
import {StrictJournalClient,strictBindingEstablished} from '../../../ops/v4-journal/native-tls.mjs';
import {verifiedPool} from '../../v4-owner-ledger/postgres';
import {OWNER_COOKIE,OWNER_COOKIE_OPTIONS} from '../../v4-owner-ledger/auth';
import {AUTH_RATE_BODY_SHA} from '../../v4-owner-preview/sql-pins';
import {TARGET} from '../../v4-owner-preview/release';
import {parsePacket} from '../../trader-pulse/validation';
import {nativeSetupRecord,type NativeSetupAdmission} from '../admission/installed';
import {policy,hash,need,type Policy} from '../plan';

/** Existing issuer/enrollment roles only; direct target, strict TLS/PLUS. Pure parser. */
export function nativeIssuerConfiguration(dsn:string,ca:string,enrollment=false):ClientConfig{
 try{need(typeof dsn==='string'&&dsn.length<=4096&&typeof ca==='string'&&ca.includes('BEGIN CERTIFICATE'));
  const u=new URL(dsn),password=decodeURIComponent(u.password);need(['postgres:','postgresql:'].includes(u.protocol)&&u.hostname===TARGET.host&&(!u.port||u.port==='5432')&&u.pathname==='/'+TARGET.database&&!u.hash
   &&decodeURIComponent(u.username)===(enrollment?'unfarmd_v4_enroll_login':'unfarmd_v4_issuer_login')&&password.length>0&&password.length<=1024&&!/[\x00-\x1f\x7f]/.test(password)
   &&u.searchParams.get('sslmode')==='verify-full'&&u.searchParams.get('channel_binding')==='require'&&[...u.searchParams].length===2);
  return {host:TARGET.host,port:5432,database:TARGET.database,user:enrollment?'unfarmd_v4_enroll_login':'unfarmd_v4_issuer_login',password,
   ssl:{ca,servername:TARGET.host,rejectUnauthorized:true,minVersion:'TLSv1.2'},enableChannelBinding:true,connectionTimeoutMillis:1000,query_timeout:1200,statement_timeout:800};
 }catch{throw Error('native_owner_unavailable');}
}
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Origin','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const reply=(status:number,error:string)=>Response.json({error},{status,headers});
/** No preference, session-cache or account-data cookies cross this narrow bridge.
 * rememberMe=false and disabled refresh make the library preference unnecessary. */
function ownerCookie(response:Response,output:Headers,logout=false){
 const cookies=response.headers.getSetCookie().filter(c=>c.startsWith(OWNER_COOKIE+'='));need(response.ok&&cookies.length===1);const cookie=cookies[0];
 need(/;\s*HttpOnly(?:;|$)/i.test(cookie)&&/;\s*Secure(?:;|$)/i.test(cookie)&&/;\s*SameSite=Strict(?:;|$)/i.test(cookie)&&/;\s*Path=\/(?:;|$)/i.test(cookie)&&!/;\s*Domain=/i.test(cookie));
 need(logout||!/;\s*(?:Max-Age|Expires)=/i.test(cookie));output.append('set-cookie',cookie);
}
type Input=Readonly<{policy:Policy;pool:Pool;secret:string;tlsHost:string}>;
function ownerCore(input:Input,current:()=>number,enrollmentPool?:Pool){
 const p=policy(input.policy),secret=input.secret;
 need(Buffer.byteLength(secret)>=64&&Buffer.byteLength(secret)<=256&&(input.pool.options as unknown as {Client:unknown}).Client===StrictJournalClient);
 const db=verifiedPool(input.pool,input.tlsHost),enroll=enrollmentPool?verifiedPool(enrollmentPool,input.tlsHost):null;let enrolling=false,email='';
 async function admitted(){
  try{need(current()>Date.now());const c=await db.connect();try{
   need(strictBindingEstablished(c));
   need((await c.query("SELECT current_user='unfarmd_v4_issuer_login' AND session_user=current_user AND NOT has_database_privilege(current_user,current_database(),'CREATE,TEMP') AS ok")).rows[0]?.ok===true);
   const r=(await c.query("SELECT p.prosecdef AND p.proconfig=ARRAY['search_path=pg_catalog'] AND r.rolname='unfarmd_v4_issuer_owner' AND NOT(r.rolcanlogin OR r.rolsuper OR r.rolbypassrls) AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')=$1 AND NOT EXISTS(SELECT 1 FROM pg_roles x WHERE x.rolname<>current_user AND pg_has_role(current_user,x.oid,'MEMBER')) AS ok FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid='unfarmd_v4_auth_ops.reserve_attempt()'::regprocedure",[AUTH_RATE_BODY_SHA])).rows[0];need(r?.ok===true);
   const row=(await c.query('SELECT owner_subject,issuer,audience,secret_sha256,enabled FROM unfarmd_v4_owner.policy WHERE singleton=true')).rows[0];
   need(row?.enabled===true&&row.owner_subject===p.ownerSubject&&row.issuer===p.issuer&&row.audience===p.origin&&row.secret_sha256===hash(secret)&&current()>Date.now());return true;
  }finally{c.release();}}catch{return false;}
 }
 const options={baseURL:p.origin,basePath:'/api/native-pilot/owner',secret,database:db,telemetry:{enabled:false},logger:{disabled:true as const},trustedOrigins:[p.origin],socialProviders:{},plugins:[],rateLimit:{enabled:false},
  emailAndPassword:{enabled:true,autoSignIn:false,disableSignUp:false,minPasswordLength:16,maxPasswordLength:128},
  user:{modelName:'v4_owner_user'},account:{modelName:'v4_owner_account'},verification:{modelName:'v4_owner_verification'},
  session:{modelName:'v4_owner_session',expiresIn:900,disableSessionRefresh:true,deferSessionRefresh:true,cookieCache:{enabled:false},additionalFields:{issuer:{type:'string' as const,required:true,input:false as const},audience:{type:'string' as const,required:true,input:false as const}}},
  advanced:{...OWNER_COOKIE_OPTIONS,database:{generateId:({model}:{model:string})=>model==='user'?p.ownerSubject:randomBytes(24).toString('base64url')}},
  databaseHooks:{user:{create:{before:async(u:{id?:string;email:string})=>enrolling&&u.email===email&&(!u.id||u.id===p.ownerSubject)?{data:{...u,id:p.ownerSubject,emailVerified:true}}:false as const},update:{before:async()=>false as const},delete:{before:async()=>false as const}},
   account:{create:{before:async(a:{userId:string;providerId:string})=>enrolling&&a.userId===p.ownerSubject&&a.providerId==='credential'?{data:a}:false as const},update:{before:async()=>false as const}},
   session:{create:{before:async(s:{userId:string})=>{if(s.userId!==p.ownerSubject||!await admitted())return false as const;const now=new Date();return {data:{...s,createdAt:now,updatedAt:now,expiresAt:new Date(Math.min(now.getTime()+900000,current())),issuer:p.issuer,audience:p.origin}};}}}},
 };
 const auth=betterAuth(options),enrollAuth=enroll?betterAuth({...options,database:enroll}):null;
 function safe(request:Request){try{const u=new URL(request.url),h=request.headers;let bytes=0;h.forEach((v,k)=>bytes+=Buffer.byteLength(v+k)+4);
  return !request.signal.aborted&&current()>Date.now()&&bytes<=16384&&u.origin===p.origin&&!u.search&&!u.hash&&h.get('sec-fetch-site')==='same-origin'
   &&(request.method==='GET'?!h.has('origin')||h.get('origin')===p.origin:h.get('origin')===p.origin)
   &&!['authorization','x-owner-id','x-owner-subject','x-owner-email','x-api-key','purpose','sec-purpose'].some(k=>h.has(k))
   &&['host','x-forwarded-host'].every(k=>!h.has(k)||h.get(k)===u.host)&&(!h.has('x-forwarded-proto')||h.get('x-forwarded-proto')==='https')&&(!h.has('sec-fetch-dest')||h.get('sec-fetch-dest')==='empty');}catch{return false;}}
 async function session(request:Request){
  if(!safe(request)||!await admitted())return null;const list=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(OWNER_COOKIE+'='));if(list.length!==1||list[0].length>1024)return null;
  const result=await auth.api.getSession({headers:new Headers({cookie:list[0]}),query:{disableCookieCache:true,disableRefresh:true}}),s=result?.session,now=Date.now();
  return s&&result.user.id===p.ownerSubject&&s.userId===p.ownerSubject&&s.issuer===p.issuer&&s.audience===p.origin&&new Date(s.createdAt).getTime()<=now&&new Date(s.expiresAt).getTime()>now&&new Date(s.expiresAt).getTime()-new Date(s.createdAt).getTime()<=900000&&await admitted()?s:null;
 }
 return Object.freeze({
  /** OPERATOR ONLY; never returned by the HTTP loader or mounted as a route.
   * Existing policy must already match. Empty users only; no overwrite/reset/retry. */
  async enroll(ownerEmail:string,password:string){
   need(enroll&&enrollAuth&&!enrolling&&ownerEmail===ownerEmail.toLowerCase()&&ownerEmail.length<=254&&password.length>=16&&password.length<=128&&await admitted());const lock=await enroll.connect();
   try{need(strictBindingEstablished(lock)&&(await lock.query("SELECT current_user='unfarmd_v4_enroll_login' AND session_user=current_user AND NOT has_database_privilege(current_user,current_database(),'CREATE,TEMP') AS ok")).rows[0]?.ok===true);await lock.query('SELECT pg_advisory_lock(243,2)');need((await lock.query('SELECT count(*)::int n FROM public.v4_owner_user')).rows[0]?.n===0);enrolling=true;email=ownerEmail;
    const r=await enrollAuth.api.signUpEmail({body:{name:'UNFARMD owner',email:ownerEmail,password}});need(r?.user.id===p.ownerSubject&&await admitted());return {enrolled:true as const};
   }catch{throw Error('native_owner_enrollment_denied_or_uncertain');}finally{enrolling=false;email='';try{await lock.query('SELECT pg_advisory_unlock(243,2)');}finally{lock.release();}}
  },
  async handler(request:Request):Promise<Response>{try{
   const path=new URL(request.url).pathname,status=path==='/api/native-pilot/owner/status',login=path==='/api/native-pilot/owner/sign-in/email',logout=path==='/api/native-pilot/owner/sign-out';
   if(!status&&!login&&!logout)return reply(404,'not_found');if(request.method!==(status?'GET':'POST'))return reply(405,'method_not_allowed');
   if(!safe(request)||request.headers.get('x-unfarmd-owner-intent')!==(status?'status':login?'login':'logout'))return reply(403,'origin_or_intent_denied');
   if(!await admitted())return reply(503,'native_owner_unavailable');
   if(status){const s=await session(request);return Response.json(s?{status:'signed_in',expiresAtMs:new Date(s.expiresAt).getTime()}:{status:'signed_out'},{headers});}
   if(logout){if(!await session(request))return reply(401,'owner_session_required');const r=await auth.api.signOut({headers:request.headers,asResponse:true}),out=new Headers(headers);ownerCookie(r,out,true);return Response.json({status:'signed_out'},{headers:out});}
   if(request.headers.get('content-type')!=='application/json'||request.headers.has('content-encoding')||Number(request.headers.get('content-length')??0)>2048||!request.body)return reply(400,'invalid_auth_request');
   const reader=request.body.getReader(),parts:Uint8Array[]=[];let size=0,count=0,timer:ReturnType<typeof setTimeout>|undefined;
   let text:string;try{text=await Promise.race([(async()=>{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;need(size<=2048&&++count<=32&&!request.signal.aborted);parts.push(x.value);}return new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(parts));})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('body_timeout')),1000);})]);}finally{clearTimeout(timer);void reader.cancel().catch(()=>{});}
   const body=parsePacket(text) as {email:string;password:string};if(!body||Object.keys(body).sort().join(',')!=='email,password'||typeof body.email!=='string'||typeof body.password!=='string'||body.email.length>254||body.password.length<16||body.password.length>128)return reply(400,'invalid_auth_request');
   const c=await db.connect();try{need(strictBindingEstablished(c));if((await c.query('SELECT unfarmd_v4_auth_ops.reserve_attempt() allowed')).rows[0]?.allowed!==true)return reply(429,'owner_auth_rate_limited');}finally{c.release();}
   const r=await auth.api.signInEmail({headers:request.headers,body:{...body,rememberMe:false},asResponse:true});if(!r.ok||!await admitted())return reply(401,'owner_signin_denied');
   const out=new Headers(headers);ownerCookie(r,out);return Response.json({status:'signed_in'},{headers:out});
  }catch{return reply(503,'native_owner_unavailable');}},
 });
}
/** Runtime constructor requires the SAME opaque native setup capability on every check. */
export function createNativeOwnerAccess(input:Input&Readonly<{admission:NativeSetupAdmission}>){
 const current=()=>{const s=nativeSetupRecord(input.admission,input.policy).record,o=input.pool.options;need(hash(input.secret)===s.owner.authSecretSha256&&input.tlsHost===s.database.host&&o.host===s.database.host&&o.database===s.database.database&&o.user==='unfarmd_v4_issuer_login'&&typeof o.ssl==='object'&&hash(String(o.ssl.ca))===s.database.caSha256);return s.expiresAt;};current();
 const core=ownerCore(input,current);return Object.freeze({handler:core.handler});
}
/** Unmounted operator helper. Possession of a separately approved enrollment login
 * is required; this creates NO setup/source capability and never installs policy.
 * Missing/conflicting policy, existing users or uncertain writes HOLD. */
export function prepareNativeOwnerEnrollment(input:Input&Readonly<{enrollmentPool:Pool;expiresAt:number}>){
 need(Number.isSafeInteger(input.expiresAt)&&input.expiresAt>Date.now()&&input.expiresAt-Date.now()<=900000);
 return Object.freeze({enroll:ownerCore(input,()=>input.expiresAt,input.enrollmentPool).enroll});
}
