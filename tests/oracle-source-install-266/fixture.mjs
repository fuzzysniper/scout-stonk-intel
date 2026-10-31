// Disposable PG18, synthetic credentials only. Installation runs as non-superuser neondb_owner.
import fs from 'node:fs';import {createHash,randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {fixture as pg18Fixture,localNeonDdl} from '../v4-pg18-install/fixture.mjs';import {render} from '../../ops/v4-journal/package.mjs';
export const BASE='f80ecba0d39ad854d189ff5b4c699f4310a45c1d';
export const OWNER='11111111-1111-4111-8111-111111111111',MINT='So11111111111111111111111111111111111111112';
export const sql=()=>fs.readFileSync('ops/v4-owner-auth/source-admission.sql','utf8');
export const oldSql=()=>execFileSync('git',['show',BASE+':ops/v4-owner-auth/source-admission.sql'],{encoding:'utf8'});
export async function fixture(neon=false){const f=await pg18Fixture();try{
 let owner=f.owner;
 const strict=s=>f.run('\\set ON_ERROR_STOP on\n'+s);
 strict(neon?localNeonDdl():render());strict(fs.readFileSync('ops/v4-owner-auth/issuer.sql','utf8'));
 return {...f,get owner(){return owner;},strict,async restart(){await f.restart();owner=f.raw.pool('scout_test_owner',f.config('scout_test_owner').password,'unfarmd_v4_pilot');},async install(){strict(sql());},async stamp(){return (await owner.query(`SELECT n.nspname,p.proname,p.prosrc,p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname LIKE 'unfarmd_%' AND n.nspname<>'unfarmd_v4_ca_budget' ORDER BY 1,2,p.oid`)).rows;},async seed(patch={},runtime='local_fixture'){
  const now=Date.now(),p={ownerSubject:OWNER,origin:'https://synthetic.invalid',startsAt:now-1000,expiresAt:now+600000,maxLookups:3,maxAttempts:3,maxCredits:6,debit:{jupiter:1,helius:2},providers:['helius'],...patch},text=JSON.stringify(p),hash=createHash('sha256').update(text).digest('hex');
  await owner.query('INSERT INTO unfarmd_v4_ca_budget.policy VALUES(true,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,2)',[text,hash,OWNER,p.origin,'a'.repeat(64),runtime,p.startsAt,p.expiresAt,p.maxLookups,p.maxAttempts,p.maxCredits]);await owner.query('INSERT INTO unfarmd_v4_ca_budget.state(singleton) VALUES(true)');
  return {hash,fence:randomUUID(),now:()=>Date.now()};
 },async call(s,c,role='unfarmd_v4_ca_login'){
  // Test-only SET SESSION AUTHORIZATION models the actual restricted session_user without enabling LOGIN.
  if(!['unfarmd_v4_ca_login','unfarmd_v4_ca_stopper_login'].includes(role))throw Error('local_role_not_allowed');
  // A four-connection native TLS/PLUS pool ensures concurrent tests use genuine independent sessions.
  const client=await f.pool('scout_test_owner').connect();try{await client.query('BEGIN');await client.query('SET LOCAL SESSION AUTHORIZATION '+role);const r=(await client.query('SELECT unfarmd_v4_ca_budget.step($1,$2,$3) reply',[JSON.stringify({...c,policyHash:s.hash}),s.fence,s.hash])).rows[0].reply;await client.query('COMMIT');return r;}finally{await client.query('ROLLBACK').catch(()=>{});client.release();}
 }};
}catch(e){await f.close();throw e;}}
