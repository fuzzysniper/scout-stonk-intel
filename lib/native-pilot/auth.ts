import 'server-only';
import {betterAuth} from 'better-auth';
import type {Pool} from 'pg';
import {OWNER_COOKIE,OWNER_COOKIE_OPTIONS} from '../v4-owner-ledger/auth';
import {verifiedPool} from '../v4-owner-ledger/postgres';
import {StrictJournalClient,strictBindingEstablished} from '../../ops/v4-journal/native-tls.mjs';
import {hash,need,type Policy} from './plan';
/** New lane, ordinary actual same-owner session; no Turnkey, old release or grant substitution.
 * Reuses the existing issuer tables/policy read-only. Does not mount login, enroll, or refresh. */
export function ownerSession(p:Policy,secret:string,pool:Pool,tlsHost:string){
 need(Buffer.byteLength(secret)>=64&&Buffer.byteLength(secret)<=256);
 need((pool.options as unknown as {Client:unknown}).Client===StrictJournalClient);
 const checked=verifiedPool(pool,tlsHost),db=new Proxy(checked,{get(target,key){
  if(key==='connect')return async()=>{const c=await checked.connect();if(!strictBindingEstablished(c)){c.release(true);throw Error('native_pilot_held');}return c;};
  const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;
 }}),secretHash=hash(secret);
 const auth=betterAuth({baseURL:p.origin,basePath:'/api/v4/auth',secret,database:db,telemetry:{enabled:false},logger:{disabled:true},
  trustedOrigins:[p.origin],emailAndPassword:{enabled:false,disableSignUp:true},socialProviders:{},plugins:[],
  user:{modelName:'v4_owner_user'},account:{modelName:'v4_owner_account'},verification:{modelName:'v4_owner_verification'},
  session:{modelName:'v4_owner_session',expiresIn:900,disableSessionRefresh:true,deferSessionRefresh:true,cookieCache:{enabled:false},
   additionalFields:{issuer:{type:'string',required:true,input:false},audience:{type:'string',required:true,input:false}}},advanced:OWNER_COOKIE_OPTIONS});
 return async(request:Request)=>{
  try{
   const start=Date.now(),url=new URL(request.url),h=request.headers;
   if(url.origin!==p.origin||url.pathname!=='/api/native-pilot'||url.search||url.hash||request.method!=='POST'||request.signal.aborted
    ||h.get('origin')!==p.origin||h.get('sec-fetch-site')!=='same-origin'||!/^application\/json(?:;\s*charset=utf-8)?$/i.test(h.get('content-type')??'')
    ||!['inspect','stop'].includes(h.get('x-unfarmd-native-intent')??'')||['authorization','x-owner-id','x-owner-email','x-api-key','purpose','sec-purpose'].some(x=>h.has(x))
    ||h.has('sec-fetch-dest')&&h.get('sec-fetch-dest')!=='empty'||['host','x-forwarded-host'].some(k=>h.has(k)&&h.get(k)!==url.host)
    ||h.has('x-forwarded-proto')&&h.get('x-forwarded-proto')!=='https')return false;
   let size=0;h.forEach((v,k)=>{size+=Buffer.byteLength(v+k)+4;});if(size>16384)return false;
   const cookies=(h.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(OWNER_COOKIE+'='));
   if(cookies.length!==1||cookies[0].length>1024)return false;
   const result=await auth.api.getSession({headers:new Headers({cookie:cookies[0]}),query:{disableCookieCache:true,disableRefresh:true}});
   const s=result?.session,now=Date.now(),created=s?new Date(s.createdAt).getTime():NaN,expires=s?new Date(s.expiresAt).getTime():NaN;
   if(now<start||now-start>1000||!s||result?.user.id!==p.ownerSubject||s.userId!==p.ownerSubject||s.issuer!==p.issuer||s.audience!==p.origin
    ||!Number.isSafeInteger(created)||created>now||!Number.isSafeInteger(expires)||expires<=now||expires-created>900000)return false;
   const c=await db.connect();let rows;
   try{rows=await c.query('SELECT owner_subject,issuer,audience,secret_sha256,enabled FROM unfarmd_v4_owner.policy WHERE singleton=true AND EXISTS(SELECT 1 FROM public.v4_owner_session s WHERE s.id=$1 AND s."userId"=$2 AND s."expiresAt">clock_timestamp())',[s.id,p.ownerSubject]);}finally{c.release();}
   const end=Date.now(),r=rows.rows[0];return !request.signal.aborted&&end>=now&&end-start<=1000&&rows.rowCount===1&&r?.enabled===true&&r.owner_subject===p.ownerSubject&&r.issuer===p.issuer&&r.audience===p.origin&&r.secret_sha256===secretHash&&end<expires;
  }catch{return false;}
 };
}
