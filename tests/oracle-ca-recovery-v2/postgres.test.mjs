// REAL disposable PG18 + native TLS/PLUS; SYNTHETIC data only, no hosted connection or restoration.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {fixture,OWNER,MINT} from '../oracle-source-install-266/fixture.mjs';
import {strictBindingEstablished} from '../../ops/v4-journal/native-tls.mjs';
import {RECOVERY_CAPTURE_V2_PLAN as plan} from '../../ops/v4-journal/recovery-v2-extraction.mjs';
import {recoveryManifestV2,reviewRecoveryV2} from '../../ops/v4-journal/recovery-v2.mjs';
import {signed,H} from './fixtures.mjs';
const withDb=fn=>async()=>{const f=await fixture();try{await fn(f);}finally{await f.close();}};
async function capture(f,beforeCa){const c=await f.pool('neondb_owner').connect(),out={};try{assert.equal(strictBindingEstablished(c),true);for(const step of plan){if(step.name==='ca'&&beforeCa)await beforeCa();const r=await c.query(step.sql);if(['metadata','journal','deploy','boundary','ca'].includes(step.name))out[step.name]=r.rows[0];}return {...out.metadata,legacy:{...out.journal.part,...out.deploy.part,...out.boundary.part},ca:out.ca.part};}finally{await c.query('ROLLBACK').catch(()=>{});c.release();}}
function build(x){return recoveryManifestV2(JSON.stringify(x),{databaseId:H,generation:1});}
async function reserved(f){await f.install();const s=await f.seed(),a=await f.call(s,{kind:'admit',ownerSubject:OWNER,mint:MINT,now:s.now()});await f.call(s,{kind:'reserve',lookupId:a.lookupId,mint:MINT,provider:'helius',debit:2,now:s.now()});await f.call(s,{kind:'stop'},'unfarmd_v4_ca_stopper_login');return s;}
test('preinstall DB cannot produce a CA-aware manifest; no fallback to legacy/absent',withDb(async f=>{await assert.rejects(capture(f));assert.deepEqual(build(null),{status:'blocked',activate:false});}));
test('actual SET-only non-superuser extracts empty source installation with v1-equivalent legacy invariants',withDb(async f=>{
 await f.install();const x=await capture(f),m=build(x);assert.equal(m.status,'manifest_offline_only');assert.equal(JSON.parse(m.manifestJson).ca.policy,null);
 assert.deepEqual(x.legacy,(await f.owner.query(fs.readFileSync('ops/v4-journal/snapshot.sql','utf8'))).rows[0].snapshot);
 const r=(await f.pool('neondb_owner').query("SELECT current_user,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) super,pg_has_role(current_user,'unfarmd_v4_ca_owner','USAGE') inherited")).rows[0];assert.deepEqual(r,{current_user:'neondb_owner',super:false,inherited:false});
 assert.equal((await f.owner.query("SELECT count(*)::int n FROM pg_roles WHERE rolname LIKE 'unfarmd_%' AND rolcanlogin")).rows[0].n,0);
}));
test('positive real CA preservation includes policy, complete original ordered receipts, STOP, fence and uncertain lease',withDb(async f=>{
 await reserved(f);const a=build(await capture(f));assert.equal(a.status,'manifest_offline_only');const first=JSON.parse(a.manifestJson);assert.deepEqual(first.ca.history.map(x=>x.kind),['admit','reserve','stop']);assert.equal(first.ca.state.attempts,1);assert.equal(first.ca.state.credits,2);assert.equal(first.ca.state.lookups,1);assert.equal(first.ca.state.stopped,true);assert.match(first.ca.state.leaseSha256,/^[a-f0-9]{64}$/);assert.match(first.ca.state.fenceSha256,/^[a-f0-9]{64}$/);
 const raw=(await f.owner.query("SELECT encode(sha256(convert_to(receipt::text,'UTF8')),'hex') hash FROM unfarmd_v4_ca_budget.history ORDER BY seq")).rows;assert.deepEqual(first.ca.history.map(x=>x.receiptSha256),raw.map(x=>x.hash));
 const second=build(await capture(f));assert.equal(second.status,'manifest_offline_only');const s=signed(first);s.trust.nowMs=Date.now()+100;assert.deepEqual(reviewRecoveryV2(JSON.stringify(s.envelope),second.manifestJson,s.trust),{status:'preserved_offline_only',activate:false});
}));
test('full lookup row changes and full receipt contents change the extracted commitments',withDb(async f=>{
 await reserved(f);const a=JSON.parse(build(await capture(f)).manifestJson);
 await f.owner.query("UPDATE unfarmd_v4_ca_budget.lookups SET providers=providers||'\"jupiter\"'::jsonb");await f.owner.query("UPDATE unfarmd_v4_ca_budget.history SET receipt=receipt||'{\"SYNTHETIC_changed\":true}'::jsonb WHERE kind='stop'");
 const b=build(await capture(f));assert.equal(b.status,'manifest_offline_only');const s=signed(a);s.trust.nowMs=Date.now()+100;assert.deepEqual(reviewRecoveryV2(JSON.stringify(s.envelope),b.manifestJson,s.trust),{status:'blocked',activate:false});
}));
test('history beyond the bounded ceiling is rejected, never accepted as a truncated prefix',withDb(async f=>{
 await f.install();await f.seed();await f.owner.query("INSERT INTO unfarmd_v4_ca_budget.history(server_ms,kind,receipt) SELECT 0,'stop','{}'::jsonb FROM generate_series(1,65)");const x=await capture(f);assert.equal(x.ca.history.length,65);assert.deepEqual(build(x),{status:'blocked',activate:false});
}));
test('BIGINT sequence above JS safe integer remains exact, ordered and lossless',withDb(async f=>{
 await reserved(f);await f.owner.query("SELECT setval('unfarmd_v4_ca_budget.history_seq_seq',9007199254740995,true)");await f.owner.query("INSERT INTO unfarmd_v4_ca_budget.history(server_ms,kind,receipt) VALUES(0,'stop','{}')");const m=build(await capture(f));assert.equal(m.status,'manifest_offline_only');const ca=JSON.parse(m.manifestJson).ca;assert.equal(ca.history.at(-1).seq,'9007199254740996');assert.equal(ca.sequence.lastValue,'9007199254740996');
}));
test('entire extraction runs READ ONLY; role-scoped writes are rejected by PostgreSQL itself',withDb(async f=>{
 await f.install();await f.seed();const c=await f.pool('neondb_owner').connect();try{await c.query(plan[0].sql);await c.query('SET LOCAL ROLE unfarmd_v4_ca_owner');await assert.rejects(c.query('UPDATE unfarmd_v4_ca_budget.state SET stopped=true'),e=>e.code==='25006');}finally{await c.query('ROLLBACK');c.release();}assert.equal((await f.owner.query('SELECT stopped FROM unfarmd_v4_ca_budget.state')).rows[0].stopped,false);
}));
test('repeatable-read capture is coherent but cannot certify currentness while writers run; latest independent head rejects older view',withDb(async f=>{
 await f.install();const s=await f.seed();const old=build(await capture(f,()=>f.call(s,{kind:'admit',ownerSubject:OWNER,mint:MINT,now:s.now()})));assert.equal(old.status,'manifest_offline_only');assert.equal(JSON.parse(old.manifestJson).ca.state.lookups,0);
 const latest=build(await capture(f));assert.equal(latest.status,'manifest_offline_only');assert.equal(JSON.parse(latest.manifestJson).ca.state.lookups,1);
 const a=signed(JSON.parse(old.manifestJson),{sequence:1}),b=signed(JSON.parse(latest.manifestJson),{sequence:2,pair:a.pair});b.trust.nowMs=Date.now()+100;assert.deepEqual(reviewRecoveryV2(JSON.stringify(a.envelope),old.manifestJson,b.trust),{status:'blocked',activate:false});
}));
