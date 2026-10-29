// SYNTHETIC identities/session values/profile only; actual disposable local PostgreSQL/TLS.
import {createRequire} from 'node:module';
import {createHmac,randomBytes} from 'node:crypto';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {createServer} from 'node:net';
import {Pool} from 'pg';
import {localPostgres} from '../onchain-api/postgres-harness.mjs';
export const require=createRequire(import.meta.url),build=process.env.V4_OWNER_BUILD;
export const {createVerifiedOwnerBoundary,OWNER_COOKIE}=require(build+'/lib/v4-owner-ledger/auth.js');
export const {createPostgresPilotLedger}=require(build+'/lib/v4-owner-ledger/ledger.js');
export const {prepareProfile}=require(build+'/lib/v4-helius-pilot/server/profile.js');
export const {createMockPilot}=require(build+'/lib/v4-helius-pilot/server/testing.js');
export const {createHeliusPilot}=require(build+'/lib/v4-helius-pilot/server/index.js');
export const {ownerPilotStatus}=require(build+'/lib/v4-owner-ledger/index.js');
export const OWNER='11111111-1111-4111-8111-111111111111',OTHER_OWNER='22222222-2222-4222-8222-222222222222';
export const ORIGIN='https://owner.synthetic.invalid',HOST='owner-pg.synthetic.invalid';
export const SECRET='SYNTHETIC_LOCAL_ONLY_227_aB9qXr72pRm45Yx19QwZ73pG2sM8aC56fDbK91gV';
export const TOKEN='SYNTHETIC_SESSION_TOKEN_227_never_a_real_credential';
export const SESSION='SYNTHETIC_SESSION_ID_227';
export const MINTS=['So11111111111111111111111111111111111111112','EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v','11111111111111111111111111111111'];
export const ownerPolicy=()=>({ownerSubject:OWNER,journalOwnerId:OWNER,issuer:'unfarmd-v4-owner-issuer-227',audience:ORIGIN});
export function cookie(token=TOKEN,secret=SECRET){return OWNER_COOKIE+'='+encodeURIComponent(token+'.'+createHmac('sha256',secret).update(token).digest('base64'));}
export function request(overrides={}){const h={origin:ORIGIN,'sec-fetch-site':'same-origin','content-type':'application/json','x-unfarmd-v4-pilot-intent':'read',cookie:cookie(),...overrides.headers};return new Request(ORIGIN+'/api/v4/helius-pilot',{method:'POST',headers:h,body:JSON.stringify({action:'read',mint:MINTS[0]}),...Object.fromEntries(Object.entries(overrides).filter(([k])=>k!=='headers'))});}
export async function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'v4-owner-native-')),cert=join(dir,'local.crt'),key=join(dir,'local.key');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST,'-keyout',key,'-out',cert],{stdio:'ignore'});chmodSync(key,0o600);
 const ca=readFileSync(cert,'utf8'),probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const raw=await localPostgres({tls:{port,cert,key}});
 await raw.owner.query('CREATE DATABASE unfarmd_v4_pilot');
 let localOwner=raw.pool('scout_test_owner','SYNTHETIC_LOCAL_TEST_PASSWORD_111','unfarmd_v4_pilot');
 const db={get owner(){return localOwner;},log:raw.log,close:raw.close,async crashRestart(){await raw.crashRestart();localOwner=raw.pool('scout_test_owner','SYNTHETIC_LOCAL_TEST_PASSWORD_111','unfarmd_v4_pilot');},outage:raw.outage,async restore(){await raw.restore();localOwner=raw.pool('scout_test_owner','SYNTHETIC_LOCAL_TEST_PASSWORD_111','unfarmd_v4_pilot');}};
 const password=randomBytes(24).toString('hex'),pools=new Set();
 try{await db.owner.query(readFileSync('lib/v4-owner-ledger/schema.sql','utf8'));
 await db.owner.query(`CREATE ROLE a227_auth LOGIN PASSWORD '${password}'; GRANT unfarmd_v4_auth_reader TO a227_auth; CREATE ROLE a227_pilot LOGIN PASSWORD '${password}'; GRANT unfarmd_v4_pilot_app TO a227_pilot`);}catch(e){await db.close();rmSync(dir,{recursive:true,force:true});throw e;}
 const pool=(role='a227_pilot',changes={})=>{const p=new Pool({host:'127.0.0.1',port,user:role,password,database:'unfarmd_v4_pilot',max:2,connectionTimeoutMillis:800,query_timeout:1200,statement_timeout:800,ssl:{ca,servername:HOST,rejectUnauthorized:true},enableChannelBinding:true,...changes});p.on('error',()=>{});pools.add(p);return p;};
 let profile,hash;
 const reset=async()=>{
  await Promise.all([...pools].map(p=>p.end()));pools.clear();
  await db.owner.query('TRUNCATE public.v4_owner_account,public.v4_owner_verification,public.v4_owner_session,public.v4_owner_user,unfarmd_v4_owner.policy,unfarmd_v4_pilot.history,unfarmd_v4_pilot.reports,unfarmd_v4_pilot.permits,unfarmd_v4_pilot.state,unfarmd_v4_pilot.policy');
  const t=Date.now();profile=prepareProfile({id:'synthetic-pilot-227',origin:ORIGIN,ownerSubject:OWNER,identityIssuer:ownerPolicy().issuer,startsAt:t-1000,expiresAt:t+600000,mints:MINTS,creditsPerAttempt:2,maxCredits:20}).profile;hash=prepareProfile(profile).hash;
  await db.owner.query('INSERT INTO unfarmd_v4_pilot.policy(profile_text,hash,owner_subject,starts_ms,expires_ms,mints,credit_debit,credit_limit) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)',[JSON.stringify(profile),hash,OWNER,profile.startsAt,profile.expiresAt,JSON.stringify(MINTS),2,20]);
  await db.owner.query('INSERT INTO unfarmd_v4_pilot.state(singleton) VALUES(true)');
  await db.owner.query('INSERT INTO unfarmd_v4_owner.policy(owner_subject,journal_owner_id,issuer,audience,secret_sha256,enabled) VALUES($1,$1,$2,$3,encode(sha256(convert_to($4,\'UTF8\')),\'hex\'),true)',[OWNER,ownerPolicy().issuer,ORIGIN,SECRET]);
  for(const id of [OWNER,OTHER_OWNER]) await db.owner.query('INSERT INTO public.v4_owner_user(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,\'SYNTHETIC\',$2,true,now(),now())',[id,id+'@synthetic.invalid']);
  await db.owner.query('INSERT INTO public.v4_owner_session(id,token,"userId","expiresAt","createdAt","updatedAt",issuer,audience) VALUES($1,$2,$3,$4,$5,$5,$6,$7)',[SESSION,TOKEN,OWNER,new Date(profile.expiresAt-1),new Date(t-500),ownerPolicy().issuer,ORIGIN]);
 };
 return {db,pool,reset,get profile(){return profile;},get hash(){return hash;},
  boundary:(changes={},secret=SECRET,clock=Date.now)=>createVerifiedOwnerBoundary({...ownerPolicy(),...changes},secret,pool('a227_auth'),HOST,clock),
  ledger:()=>createPostgresPilotLedger(pool(),HOST,profile),
  async state(){return (await db.owner.query('SELECT reads,attempts,credits::text,stopped,lease,fence FROM unfarmd_v4_pilot.state')).rows[0];},
  async close(){await Promise.all([...pools].map(p=>p.end()));await db.close();rmSync(dir,{recursive:true,force:true});}
 };
}
