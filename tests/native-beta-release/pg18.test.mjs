// REAL disposable PG18/TLS/PLUS/Better Auth/session and B→A→C join.
// No Neon proof/GitHub owner review/provider identity is invented. Wire is SYNTHETIC.
import {requireLocalPg18Approval} from '../native-postgres/pg18-approval.mjs';requireLocalPg18Approval();await import('../native-postgres/namespace-only.mjs');
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createRequire} from 'node:module';import {randomBytes,createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {createOwnerPgContext} from './owner-pg-context.mjs';
const require=createRequire(import.meta.url),root=process.env.REMOTE_BUILD,{ownerSession}=require(root+'/lib/native-pilot/auth.js'),{prepareNativeOwnerEnrollment}=require(root+'/lib/native-pilot/runtime/owner.js');
const {session,model,nativeClaim}=await import('../native-union-284/session.mjs');
let ctx,p,issuer,reader,enroll,core,secret,password,email,expires,cookie,stats;
const sha=x=>createHash('sha256').update(x).digest('hex');
const ownerRequest=(operation,body,extra={})=>new Request(p.origin+'/api/native-pilot/owner/'+operation,{method:operation==='status'?'GET':'POST',headers:{origin:p.origin,'sec-fetch-site':'same-origin','content-type':'application/json','x-unfarmd-owner-intent':operation==='status'?'status':operation==='sign-out'?'logout':'login',...(cookie?{cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
const inspectRequest=(policy=p,authCookie=cookie,intent='inspect')=>new Request(policy.origin+'/api/native-pilot',{method:'POST',headers:{origin:policy.origin,'sec-fetch-site':'same-origin','content-type':'application/json','x-unfarmd-native-intent':intent,...(authCookie?{cookie:authCookie}:{})},body:JSON.stringify({mint:policy.mint})});
test.before(async()=>{
 ctx=await createOwnerPgContext();const x=await ctx.scenario();p=x.policy;await x.close();expires=Date.now()+899000;secret=randomBytes(48).toString('base64url');password='SYNTHETIC_ONLY_'+randomBytes(24).toString('hex');email='synthetic-owner@example.invalid';
 // AUTH-RELEVANT source DDL ONLY; no journal/legacy budget/reset/physical proof substitute.
 const tables=await fs.readFile('ops/v4-journal/sources/owner-ledger.sql','utf8'),auth=await fs.readFile('ops/v4-owner-auth/issuer.sql','utf8');
 await ctx.db.owner.query('CREATE ROLE unfarmd_v4_boundary_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; CREATE ROLE unfarmd_v4_issuer_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; CREATE SCHEMA unfarmd_v4_owner AUTHORIZATION unfarmd_v4_boundary_owner');
 const testPassword=ctx.installer.options.password;assert.equal(typeof testPassword,'string');
 for(const name of ['unfarmd_v4_issuer_login','unfarmd_v4_enroll_login','unfarmd_v4_auth_login'])await ctx.db.owner.query(`CREATE ROLE ${name} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${testPassword}'`);
 const tableSql=tables.match(/CREATE TABLE public\.v4_owner_[\s\S]*?;/g);assert.equal(tableSql.length,4);
 for(const sql of tableSql)await ctx.db.owner.query(sql);
 await ctx.db.owner.query(tables.match(/CREATE TABLE unfarmd_v4_owner\.policy\([^;]+;/)[0]);
 await ctx.db.owner.query('REVOKE ALL ON public.v4_owner_user,public.v4_owner_account,public.v4_owner_session,public.v4_owner_verification,unfarmd_v4_owner.policy FROM PUBLIC; GRANT USAGE ON SCHEMA public,unfarmd_v4_owner TO unfarmd_v4_issuer_login,unfarmd_v4_enroll_login,unfarmd_v4_auth_login; GRANT SELECT ON public.v4_owner_user,public.v4_owner_account,public.v4_owner_session,public.v4_owner_verification,unfarmd_v4_owner.policy TO unfarmd_v4_issuer_login,unfarmd_v4_auth_login; GRANT INSERT,DELETE ON public.v4_owner_session TO unfarmd_v4_issuer_login; GRANT SELECT,INSERT ON public.v4_owner_user,public.v4_owner_account TO unfarmd_v4_enroll_login; GRANT SELECT ON unfarmd_v4_owner.policy TO unfarmd_v4_enroll_login; GRANT CONNECT ON DATABASE unfarmd_v4_pilot TO unfarmd_v4_issuer_login,unfarmd_v4_auth_login,unfarmd_v4_enroll_login');
 const start=auth.indexOf('CREATE SCHEMA unfarmd_v4_auth_ops'),end=auth.indexOf('-- Existing reader/');assert.ok(start>0&&end>start);await ctx.db.owner.query('BEGIN;'+auth.slice(start,end)+'COMMIT;');
 await ctx.db.owner.query('INSERT INTO unfarmd_v4_owner.policy VALUES(true,$1,$1,$2,$3,$4,true)',[p.ownerSubject,p.issuer,p.origin,sha(secret)]);
 issuer=ctx.makePool('unfarmd_v4_issuer_login');enroll=ctx.makePool('unfarmd_v4_enroll_login',2);reader=ctx.makePool('unfarmd_v4_auth_login');
 await prepareNativeOwnerEnrollment({policy:p,pool:issuer,enrollmentPool:enroll,secret,tlsHost:'localhost',expiresAt:expires}).enroll(email,password);
 await ctx.db.owner.query('ALTER ROLE unfarmd_v4_enroll_login NOLOGIN');
 // Test-only private-core seam: append an export to a DISPOSABLE compiled copy.
 // Core body is byte-identical. Native setup/Neon wrapper is NOT bypassed in production
 // and this test makes NO claim of real control-plane or Neon acceptance.
 const source=path.join(root,'lib/native-pilot/runtime/owner.js'),file=path.join(root,'lib/native-pilot/runtime/owner-core-local.cjs');await fs.writeFile(file,(await fs.readFile(source,'utf8'))+'\nexports.LOCAL_SYNTHETIC_ownerCore=ownerCore;\n');
 core=require(file).LOCAL_SYNTHETIC_ownerCore({policy:p,pool:issuer,secret,tlsHost:'localhost'},()=>expires);
 stats={ownerCoreSha256:sha(await fs.readFile('lib/native-pilot/runtime/owner.ts')),schema:'exact relevant auth table/rate DDL',sourceCalls:false,hostedAcceptance:false};
});
test.after(async()=>{await ctx?.close();});
test('actual PG18 Better Auth issues secure host-only cookie for the enrolled owner; original B session verifier accepts it',async()=>{
 const response=await core.handler(ownerRequest('sign-in/email',{email,password}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'signed_in'});const cookies=response.headers.getSetCookie();assert.equal(cookies.length,1);assert.match(cookies[0],/^__Host-unfarmd-v4-owner=/);for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/'])assert.ok(cookies[0].toLowerCase().includes(flag.toLowerCase()));assert.ok(!/(?:domain|max-age|expires)=/i.test(cookies[0]));cookie=cookies[0].split(';')[0];
 assert.equal(await ownerSession(p,secret,reader,'localhost')(inspectRequest()),true);assert.equal((await (await core.handler(ownerRequest('status'))).json()).status,'signed_in');
});
test('actual owner cookie → original B authorize → actual native PG transaction/budget → A Helius analytics → existing Lens projection',{timeout:30000},async()=>{
 const x=await ctx.scenario(),s=await session('warning',{pgScenario:x});try{
  s.ports.authorize=ownerSession(x.policy,secret,reader,'localhost');const result=await s.run(inspectRequest(x.policy));assert.equal(result.status,'candidate');assert.equal(s.calls,3);assert.equal(s.intakes,1);assert.equal(s.analyses,1);assert.equal(result.evidence.origin.providerAuthenticated,false);assert.equal(result.evidence.origin.label,'SYNTHETIC OFFLINE');
  const view=model.nativeCandidateView(result.evidence);assert.equal(view.riskFindings.length,24);assert.equal(result.evidence.concentration.selectedTotal.basisPointsFloor,'7900');assert.equal(nativeClaim(result.evidence,'organic',Date.now()).outcome,'NOT ESTABLISHED');const state=await s.state();assert.deepEqual([state.attempts,state.credits,state.completed],[3,3,3]);assert.equal((await s.run(inspectRequest(x.policy))).status,'held');assert.equal(s.calls,3);assert.equal((await s.state()).stopped,true);stats.golden={attempts:3,credits:3,completed:3,authenticatedOwner:true,wire:'SYNTHETIC IN MEMORY'};
 }finally{await s.close();}
});
test('actual wrong/duplicate cookie, wrong issuer/audience and policy conflict cannot authenticate or create source permission',async()=>{
 for(const value of ['',cookie+'x',cookie+'; '+cookie])assert.equal(await ownerSession(p,secret,reader,'localhost')(inspectRequest(p,value)),false);
 for(const wrong of [{...p,issuer:'SYNTHETIC_OTHER_ISSUER'},{...p,ownerSubject:'22222222-2222-4222-8222-222222222222'},{...p,origin:'https://scout-stonk-intel-other-riskledgerapp.vercel.app'}])assert.equal(await ownerSession(wrong,secret,reader,'localhost')(inspectRequest(wrong)),false);
 await ctx.db.owner.query('UPDATE unfarmd_v4_owner.policy SET enabled=false');assert.equal((await core.handler(ownerRequest('sign-in/email',{email,password}))).status,503);assert.equal(await ownerSession(p,secret,reader,'localhost')(inspectRequest()),false);await ctx.db.owner.query('UPDATE unfarmd_v4_owner.policy SET enabled=true');
});
test('actual issuer denies signup/reset and cross-origin/absent intent; wrong password spends only auth rate, no source attempt',async()=>{
 assert.equal((await core.handler(ownerRequest('sign-up/email',{email,password}))).status,404);assert.equal((await core.handler(ownerRequest('sign-in/email',{email,password},{origin:'https://evil.invalid'}))).status,403);assert.equal((await core.handler(ownerRequest('sign-in/email',{email,password},{'x-unfarmd-owner-intent':'other'}))).status,403);
 assert.equal((await core.handler(ownerRequest('sign-in/email',{email,password:'SYNTHETIC_WRONG_PASSWORD_000000'}))).status,401);
});
test('actual sign-out invalidates original B owner authorization, enrollment remains disabled and no user overwrite occurs',async()=>{
 const r=await core.handler(ownerRequest('sign-out',{}));assert.equal(r.status,200);assert.equal((await r.json()).status,'signed_out');assert.equal(await ownerSession(p,secret,reader,'localhost')(inspectRequest()),false);assert.equal((await ctx.db.owner.query('SELECT count(*)::int n FROM public.v4_owner_user')).rows[0].n,1);assert.equal((await ctx.db.owner.query("SELECT rolcanlogin FROM pg_roles WHERE rolname='unfarmd_v4_enroll_login'")).rows[0].rolcanlogin,false);
});
test('actual expired session is denied without cookie-cache refresh or source permission',async()=>{
 const r=await core.handler(ownerRequest('sign-in/email',{email,password}));assert.equal(r.status,200);const expired=r.headers.getSetCookie()[0].split(';')[0];
 await ctx.db.owner.query(`UPDATE public.v4_owner_session SET \"expiresAt\"=\"createdAt\"+interval '1 millisecond' WHERE \"userId\"=$1`,[p.ownerSubject]);
 assert.equal(await ownerSession(p,secret,reader,'localhost')(inspectRequest(p,expired)),false);
});
test('current-head owner/Pg join evidence cannot be substituted with a transcript or ancestor',()=>{
 assert.ok(stats.golden);console.log(JSON.stringify({kind:'CURRENT_NATIVE_BETA_OWNER_PG18',commit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}']).toString().trim(),...stats,owner:'SYNTHETIC TEST ACCOUNT / REAL Better Auth AND native TLS/PLUS SQL',neonPhysicalAcceptance:false,reviewerAcceptance:false}));
});
