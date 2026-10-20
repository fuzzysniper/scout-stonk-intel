// REAL disposable local PostgreSQL/TLS. SYNTHETIC key, password and state; NOT hosted evidence.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Client,Pool} from 'pg';
import {mkdtempSync,readFileSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {localPostgres} from './postgres-harness.mjs';
import {EXPECTED,EXECUTION_FLAGS,BEGIN_SQL,SELECT_ONLY_SQL,runReadOnlySmoke,clientOptions,validateIntent} from '../../scripts/ops/scout-neon-smoke.mjs';
const PASSWORD='SYNTHETIC_SMOKE_ONLY_PASSWORD_118';
const env={VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_ID:EXPECTED.vercelProjectId,
  SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_mint_app:${PASSWORD}@${EXPECTED.host}/neondb`};
let db,dir,port,ca,owner;
before(async()=>{
  dir=mkdtempSync(join(tmpdir(),'scout-smoke-pg-'));
  const cert=join(dir,'test.crt'),key=join(dir,'test.key');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+EXPECTED.host,
    '-addext','subjectAltName=DNS:'+EXPECTED.host,'-keyout',key,'-out',cert],{stdio:'ignore',timeout:10000});
  chmodSync(key,0o600);ca=readFileSync(cert,'utf8');
  const listener=createServer();await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
  port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
  db=await localPostgres({tls:{port,cert,key}});
  await db.owner.query('CREATE DATABASE neondb');
  owner=new Pool({...db.owner.options,database:'neondb'});
  // Owner-only OFFLINE fixture setup, never part of the probe.
  // Runtime group already exists in this disposable cluster from the harness.
  await owner.query(readFileSync('lib/onchain-mint/server/postgres/schema.sql','utf8').replace('CREATE ROLE scout_mint_runtime NOLOGIN;',''));
  await owner.query(readFileSync('lib/onchain-mint/server/postgres/bootstrap.sql','utf8'));
  await owner.query(`CREATE ROLE scout_mint_app LOGIN PASSWORD '${PASSWORD}'; GRANT scout_mint_runtime TO scout_mint_app`);
  await owner.query("CREATE TABLE public.synthetic_readonly_canary(value integer); GRANT INSERT ON public.synthetic_readonly_canary TO scout_mint_app");
  // Nonzero retained counters, slot, lease and populated tables catch accidental reset/claim/cleanup.
  await owner.query(`UPDATE scout_mint.policy SET seq=42,highest_slot=421,last_clock=1792411200000,
    minute=29873520,reads=19,rpc_min=2,day=20746,rpc_day=99,
    lease_id=42,lease_mint='SYNTHETIC_OFFLINE_LEASE',last_rpc=1792411200000,lease_until=1792411215000`);
  await owner.query("INSERT INTO scout_mint.clients VALUES('scout-helius-mint/production-v1',$1,29873520,5,1792411320000)",['a'.repeat(64)]);
  await owner.query("INSERT INTO scout_mint.cache VALUES('scout-helius-mint/production-v1','SYNTHETIC_OFFLINE_CACHE','{\"synthetic\":true}',1792411230000)");
});
after(async()=>{await owner?.end();await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});});
function openClient(cfg,patch={}) {
  // ONLY local test injection overrides destination/trust. Executable main has no such inputs.
  return new Client({...cfg,host:'127.0.0.1',port,ssl:{...cfg.ssl,ca},...patch});
}
const run=(patch={},record=[])=>runReadOnlySmoke({argv:[...EXECUTION_FLAGS],env,openClient:cfg=>{
  const client=openClient(cfg,patch),query=client.query.bind(client);
  client.query=sql=>{record.push(sql);return query(sql);};return client;
}});
async function snapshot() {
  const result={};
  for(const table of ['policy','clients','cache'])result[table]=(await owner.query(`SELECT row_to_json(t) AS row FROM scout_mint.${table} t ORDER BY 1::text`)).rows;
  return result;
}
test('actual native probe passes pinned identities, verified TLS, restricted privileges, clocks and rollback; all admission state unchanged',async()=>{
  const before=await snapshot(),record=[],report=await run({},record);
  assert.equal(report.ok,true);assert.equal(report.rollback,'acknowledged');assert.equal(report.authenticationMechanism,'not_observed');
  assert.deepEqual(record,[BEGIN_SQL,SELECT_ONLY_SQL,'ROLLBACK']);assert.deepEqual(await snapshot(),before);
  assert.ok(Math.abs(Date.now()-Date.parse(report.serverObservedAt))<2000);
});
test('actual same startup prohibits persistent INSERT even where the local fixture granted INSERT',async()=>{
  const c=openClient(clientOptions(validateIntent([...EXECUTION_FLAGS],env)));c.on('error',()=>{});
  try{
    await c.connect();await c.query(BEGIN_SQL);
    await assert.rejects(c.query('INSERT INTO public.synthetic_readonly_canary VALUES(1)'),e=>e.code==='25006');
    assert.equal((await c.query('ROLLBACK')).command,'ROLLBACK');
  }finally{await c.end();}
  assert.equal((await owner.query('SELECT count(*) FROM public.synthetic_readonly_canary')).rows[0].count,'0');
});
test('actual runtime startup overrides hostile role search path and default read-write settings',async()=>{
  await owner.query("ALTER ROLE scout_mint_app SET search_path=public,pg_catalog; ALTER ROLE scout_mint_app SET default_transaction_read_only=off");
  try{assert.equal((await run()).ok,true);}finally{await owner.query('ALTER ROLE scout_mint_app RESET ALL');}
});
test('actual inherited/PUBLIC application table grants fail assertions without modifying admission',async()=>{
  const before=await snapshot();
  for(const table of ['policy','clients','cache']) {
    await owner.query(`GRANT SELECT ON scout_mint.${table} TO PUBLIC`);
    try{await assert.rejects(run(),/^Error: smoke_failed$/);}finally{await owner.query(`REVOKE SELECT ON scout_mint.${table} FROM PUBLIC`);}
  }
  // MAINTAIN is new in PG17. SQL condition also works on supported PG15/16 without that privilege.
  if(Number((await owner.query('SHOW server_version_num')).rows[0].server_version_num)>=170000){
    await owner.query('GRANT MAINTAIN ON scout_mint.policy TO scout_mint_app');
    try{await assert.rejects(run(),/^Error: smoke_failed$/);}finally{await owner.query('REVOKE MAINTAIN ON scout_mint.policy FROM scout_mint_app');}
  }
  assert.deepEqual(await snapshot(),before);
});
test('actual extra membership fails even when role privileges are not inherited',async()=>{
  const version=Number((await owner.query('SHOW server_version_num')).rows[0].server_version_num);
  await owner.query('CREATE ROLE synthetic_extra NOLOGIN');
  await owner.query('GRANT synthetic_extra TO scout_mint_app'+(version>=160000?' WITH INHERIT FALSE':''));
  if(version>=160000)assert.equal((await owner.query("SELECT pg_has_role('scout_mint_app','synthetic_extra','USAGE') AS inherited")).rows[0].inherited,false);
  try{await assert.rejects(run(),/^Error: smoke_failed$/);}finally{
    await owner.query('REVOKE synthetic_extra FROM scout_mint_app; DROP ROLE synthetic_extra');
  }
  assert.equal((await run()).ok,true);
});
test('actual elevated login and elevated runtime group fail assertions',async()=>{
  for(const role of ['scout_mint_app','scout_mint_runtime']){
    await owner.query(`ALTER ROLE ${role} CREATEDB`);
    try{await assert.rejects(run(),/^Error: smoke_failed$/);}finally{await owner.query(`ALTER ROLE ${role} NOCREATEDB`);}
  }
});
test('actual role ADMIN and schema/function grant options fail closed',async()=>{
  for(const [grant,revoke] of [
    ['GRANT scout_mint_runtime TO scout_mint_app WITH ADMIN OPTION','REVOKE ADMIN OPTION FOR scout_mint_runtime FROM scout_mint_app'],
    ['GRANT USAGE ON SCHEMA scout_mint TO scout_mint_app WITH GRANT OPTION','REVOKE USAGE ON SCHEMA scout_mint FROM scout_mint_app'],
    ['GRANT EXECUTE ON FUNCTION scout_mint.step(jsonb) TO scout_mint_app WITH GRANT OPTION','REVOKE EXECUTE ON FUNCTION scout_mint.step(jsonb) FROM scout_mint_app'],
  ]){
    await owner.query(grant);try{await assert.rejects(run(),/^Error: smoke_failed$/);}finally{await owner.query(revoke);}
  }
  assert.equal((await run()).ok,true);
});
test('actual database/schema CREATE or missing required execution privilege fails closed',async()=>{
  for(const [grant,revoke] of [
    ['GRANT CREATE ON DATABASE neondb TO scout_mint_app','REVOKE CREATE ON DATABASE neondb FROM scout_mint_app'],
    ['GRANT CREATE ON SCHEMA scout_mint TO scout_mint_app','REVOKE CREATE ON SCHEMA scout_mint FROM scout_mint_app'],
    ['REVOKE EXECUTE ON FUNCTION scout_mint.step(jsonb) FROM scout_mint_runtime','GRANT EXECUTE ON FUNCTION scout_mint.step(jsonb) TO scout_mint_runtime'],
  ]){
    await owner.query(grant);try{await assert.rejects(run(),/^Error: smoke_failed$/);}finally{await owner.query(revoke);}
  }
});
test('actual TLS rejects untrusted CA, wrong hostname and plaintext; bad SCRAM password is redacted',async()=>{
  for(const patch of [{ssl:{rejectUnauthorized:true,servername:EXPECTED.host}},
    {ssl:{rejectUnauthorized:true,servername:'wrong.synthetic.invalid',ca}},
    {ssl:false},{password:'SYNTHETIC_WRONG_PASSWORD'}]){
    const record=[];await assert.rejects(run(patch,record),/^Error: smoke_failed$/);assert.deepEqual(record,[]);
  }
});
test('actual local outage fails without SQL or a retry and recovery does not require an admission reset',async()=>{
  const before=await snapshot();await owner.end();owner=null;await db.outage();
  const record=[];await assert.rejects(run({},record),/^Error: smoke_failed$/);assert.deepEqual(record,[]);
  await db.restore();owner=new Pool({...db.owner.options,database:'neondb'});
  assert.deepEqual(await snapshot(),before);assert.equal((await run()).ok,true);
});
