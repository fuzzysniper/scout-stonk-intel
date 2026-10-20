// OFFLINE SYNTHETIC fixtures only. No provider, real credential, DNS or socket.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {EXECUTION_FLAGS, EXPECTED, CHECKS, BEGIN_SQL, SELECT_ONLY_SQL, validateIntent, clientOptions, runReadOnlySmoke, main} from '../../scripts/ops/scout-neon-smoke.mjs';

const fakeEnv = Object.freeze({VERCEL:'1', VERCEL_ENV:'production', VERCEL_PROJECT_ID:EXPECTED.vercelProjectId,
  SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_mint_app:${'x'.repeat(40)}@${EXPECTED.host}/neondb?sslmode=require`});
const argv = [...EXECUTION_FLAGS], now = 1792411200000;
const sourceClock = {now:()=>now, monotonic:()=>10};
function fixture(change={}) {
  const actions=[], client=new EventEmitter();
  client.connection={stream:{encrypted:true,authorized:true,servername:EXPECTED.host,getProtocol:()=> 'TLSv1.3'}};
  client.connect=async()=>{actions.push('connect');if(change.connect)throw Error(fakeEnv.SCOUT_MINT_STORE_DATABASE_URL);};
  client.query=async sql=>{
    actions.push(sql);
    if(change.errorAt===sql)throw Error(fakeEnv.SCOUT_MINT_STORE_DATABASE_URL);
    if(change.eventAt===sql)client.emit('error',Error(fakeEnv.SCOUT_MINT_STORE_DATABASE_URL));
    if(sql===SELECT_ONLY_SQL)return {command:'SELECT',rowCount:1,rows:[{...Object.fromEntries(CHECKS.map(k=>[k,true])),server_now_ms:String(now),...change.row}]};
    return {command:sql===BEGIN_SQL?'BEGIN':change.rollbackCommand??'ROLLBACK'};
  };
  client.end=async()=>{actions.push('end');if(change.end)throw Error(fakeEnv.SCOUT_MINT_STORE_DATABASE_URL);};
  return {client,actions};
}
const run=(f,override={})=>runReadOnlySmoke({argv,env:fakeEnv,openClient:()=>f.client,sourceClock,...override});

test('import and help are inert even with poisoned secret readers',async()=>{
  const env=new Proxy({},{get(){throw Error('secret read');}});
  assert.equal(await main(['--help'],env),0);
  const child=spawnSync(process.execPath,['--input-type=module','-e',`globalThis.fetch=()=>{throw Error('network')};await import('./scripts/ops/scout-neon-smoke.mjs')`],{cwd:process.cwd(),env:{PATH:process.env.PATH},encoding:'utf8'});
  assert.equal(child.status,0);assert.equal(child.stdout,'');assert.equal(child.stderr,'');
});
test('fixed SQL inventory cannot write, invoke step, reset admission or access application rows',()=>{
  const sql=SELECT_ONLY_SQL.replace(/'[^']*'/g,"''");
  assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|COMMIT|COPY|CALL|DO|SET|RESET|nextval|setval|set_config|dblink|pg_advisory_lock)\b/i);
  assert.doesNotMatch(sql,/scout_mint\./i);
  assert.doesNotMatch(sql,/;/);
  assert.match(SELECT_ONLY_SQL,/pg_catalog\.pg_has_role.*'MEMBER'/);
  assert.match(SELECT_ONLY_SQL,/'MAINTAIN'/);
  const code=readFileSync('scripts/ops/scout-neon-smoke.mjs','utf8');
  assert.doesNotMatch(code,/import.*(?:helius|postgres-store|production-config)|\bfetch\s*\(|\.transact\(|SCOUT_MINT_HELIUS|SCOUT_MINT_ADMISSION/);
  assert.equal((code.match(/await client\.query\(/g)||[]).length,3); // BEGIN / SELECT / rollback; cleanup uses bounded(query).
});
test('nonsecret gates reject before credential reads or opening a client',async()=>{
  for(const args of [[],['--execute'],['--approve-production-read-only'],[...argv,'--other'],['--execute','--execute']]) {
    let reads=0,opens=0;
    const env=new Proxy(fakeEnv,{get(t,k){if(k==='SCOUT_MINT_STORE_DATABASE_URL')reads++;return t[k];}});
    await assert.rejects(runReadOnlySmoke({argv:args,env,openClient(){opens++;}}),/smoke_failed/);
    assert.equal(reads,0);assert.equal(opens,0);
  }
  for(const patch of [{VERCEL:'0'},{VERCEL_ENV:'preview'},{VERCEL_PROJECT_ID:'prj_wrong'},{NODE_TLS_REJECT_UNAUTHORIZED:'0'}]){
    const env=new Proxy({...fakeEnv,...patch},{get(t,k){if(k==='SCOUT_MINT_STORE_DATABASE_URL')throw Error('premature secret read');return t[k];}});
    assert.throws(()=>validateIntent(argv,env),/smoke_failed/);
  }
});
test('exact target, role, database, decoded password, query, port and URL validation fail closed',()=>{
  const raw=fakeEnv.SCOUT_MINT_STORE_DATABASE_URL;
  const bad=[undefined,'','not-url',raw+'#secret',raw.replace('scout_mint_app','neondb_owner'),raw.replace(EXPECTED.host,'ep-evil.aws.neon.tech'),
    raw.replace('neondb?','postgres?'),raw.replace('?sslmode=require','?sslmode=disable'),raw+'&sslcert=x',raw.replace('/neondb',':5433/neondb'),
    raw.replace('x'.repeat(40),'short'),raw.replace('x'.repeat(40),'%00'+'x'.repeat(40)),raw.replace('x'.repeat(40),'%ZZ'+'x'.repeat(40)),
    raw.replace('x'.repeat(40),'x'.repeat(257)),raw+'\n',raw.replace('postgresql:','postgres:'),raw.replace(EXPECTED.host,EXPECTED.host+'.evil.invalid')];
  for(const value of bad)assert.throws(()=>validateIntent(argv,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:value}),/smoke_failed/);
  assert.ok(validateIntent(argv,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:raw.replace('/neondb',':5432/neondb')}));
});
test('only database credential is read, handles redact secrets and pg cannot fall back to ambient PG settings',()=>{
  const reads=[];
  const env=new Proxy(fakeEnv,{get(t,k){reads.push(k);if(!(k in t)&&k!=='NODE_TLS_REJECT_UNAUTHORIZED')throw Error('unapproved read');return t[k];}});
  const handle=validateIntent(argv,env),cfg=clientOptions(handle);
  assert.equal(reads.filter(k=>k.startsWith('SCOUT_')).join(','),'SCOUT_MINT_STORE_DATABASE_URL');
  assert.doesNotMatch(JSON.stringify(handle),/postgresql:|xxxx|password/i);
  assert.equal(cfg.host,EXPECTED.host);assert.equal(cfg.user,EXPECTED.role);assert.equal(cfg.database,'neondb');assert.equal(cfg.port,5432);
  assert.deepEqual(cfg.ssl,{rejectUnauthorized:true,servername:EXPECTED.host,minVersion:'TLSv1.2'});
  assert.equal(cfg.enableChannelBinding,true);assert.equal(cfg.connectionTimeoutMillis,1000);assert.equal(cfg.query_timeout,1000);
  assert.equal(cfg.statement_timeout,500);assert.equal(cfg.lock_timeout,100);assert.equal(cfg.idle_in_transaction_session_timeout,1000);
  assert.match(cfg.options,/default_transaction_read_only=on.*search_path=pg_catalog/);
  assert.throws(()=>clientOptions({...handle}),/smoke_failed/);
});
test('synthetic pass requires exact check names, acknowledged rollback and successful close',async()=>{
  const f=fixture(),result=await run(f);
  assert.deepEqual(f.actions,['connect',BEGIN_SQL,SELECT_ONLY_SQL,'ROLLBACK','end']);
  assert.equal(result.checks,CHECKS.length);assert.equal(result.rollback,'acknowledged');
  assert.equal(result.authenticationMechanism,'not_observed');assert.equal(result.serverObservedAt,new Date(now).toISOString());
  assert.doesNotMatch(JSON.stringify(result),/password|postgresql:|xxxx|privateKey/);
});
for(const check of CHECKS)test(`missing/false/null ${check} cannot PASS`,async()=>{
  for(const value of [false,null,undefined,'true'])await assert.rejects(run(fixture({row:{[check]:value}})),/smoke_failed/);
});
test('renamed, extra and malformed metadata fields cannot masquerade as proofs',async()=>{
  for(const row of [{extra:true},{identity_ok:undefined,wrong_name:true},{server_now_ms:null},{server_now_ms:'NaN'},{server_now_ms:String(now+1001)}])
    await assert.rejects(run(fixture({row})),/smoke_failed/);
});
test('unverified TLS, wrong SNI and outdated protocol fail before any SQL',async()=>{
  for(const patch of [{encrypted:false},{authorized:false},{servername:'wrong.invalid'},{getProtocol:()=> 'TLSv1.1'}]){
    const f=fixture();Object.assign(f.client.connection.stream,patch);
    await assert.rejects(run(f),/smoke_failed/);assert.deepEqual(f.actions,['connect','end']);
  }
});
test('failed BEGIN/connect sends no follow-up SQL; SELECT failure rolls back once',async()=>{
  for(const change of [{connect:true},{errorAt:BEGIN_SQL}]){
    const f=fixture(change);await assert.rejects(run(f),/smoke_failed/);
    assert.equal(f.actions.includes(SELECT_ONLY_SQL),false);assert.equal(f.actions.includes('ROLLBACK'),false);assert.equal(f.actions.at(-1),'end');
  }
  const f=fixture({errorAt:SELECT_ONLY_SQL});await assert.rejects(run(f),/smoke_failed/);
  assert.deepEqual(f.actions,['connect',BEGIN_SQL,SELECT_ONLY_SQL,'ROLLBACK','end']);
});
test('uncertain rollback, wrong command or close failure never PASS and never retry rollback',async()=>{
  for(const change of [{errorAt:'ROLLBACK'},{rollbackCommand:'COMMIT'},{end:true}]){
    const f=fixture(change);await assert.rejects(run(f),/smoke_failed/);
    assert.equal(f.actions.filter(x=>x==='ROLLBACK').length,1);assert.equal(f.actions.at(-1),'end');
  }
});
test('driver error events are contained, redacted and close connection',async()=>{
  const f=fixture({eventAt:SELECT_ONLY_SQL});await assert.rejects(run(f),/smoke_failed/);
  assert.equal(f.actions.at(-1),'end');assert.equal(f.actions.includes('ROLLBACK'),false);
});
test('source clock regression/nonfinite values fail closed',async()=>{
  for(const sourceClock of [{now:()=>NaN,monotonic:()=>10},{now:()=>now,monotonic:()=>Infinity},{now:()=>now,monotonic:()=>-1},
    {now:(()=>{let i=0;return()=>now-(i++?1:0);})(),monotonic:()=>10}])await assert.rejects(run(fixture(),{sourceClock}),/smoke_failed/);
});
test('main suppresses secret-bearing validation errors without importing pg',async()=>{
  const logs=[],original=console.error;console.error=(...a)=>logs.push(a.join(' '));
  try{assert.equal(await main(argv,new Proxy(fakeEnv,{get(){throw Error(fakeEnv.SCOUT_MINT_STORE_DATABASE_URL);}})),1);}
  finally{console.error=original;}
  assert.equal(logs.length,1);assert.doesNotMatch(logs.join(''),/postgresql:|xxxx|stack|password/);
});
test('stalled connect is bounded, and late resolution cannot send SQL',async()=>{
  const f=fixture();let release;
  f.client.connect=()=>new Promise(resolve=>{f.actions.push('connect');release=resolve;});
  const start=Date.now();await assert.rejects(run(f),/smoke_failed/);assert.ok(Date.now()-start<6500);
  release();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.actions,['connect','end']);
});
test('stalled end fails within cleanup budget rather than reporting PASS',async()=>{
  const f=fixture();f.client.end=()=>new Promise(()=>{});
  const start=Date.now();await assert.rejects(run(f),/smoke_failed/);assert.ok(Date.now()-start<2000);
});

test('expiry guard runs before secrets/client, before SQL and preserves rollback cleanup',async()=>{
  const poison=new Proxy(fakeEnv,{get(){throw Error('premature secret read');}});
  await assert.rejects(runReadOnlySmoke({argv,env:poison,openClient(){throw Error('unexpected');},executionGuard:()=>false}),/smoke_failed/);
  for(const expiryCheck of [2,3,4]) {
    const f=fixture();let checks=0;
    await assert.rejects(run(f,{executionGuard:()=>++checks<expiryCheck}),/smoke_failed/);
    assert.equal(f.actions.includes(SELECT_ONLY_SQL),false);
    if(expiryCheck===2)assert.deepEqual(f.actions,[]);
    if(expiryCheck===3)assert.deepEqual(f.actions,['connect','end']);
    if(expiryCheck===4)assert.deepEqual(f.actions,['connect',BEGIN_SQL,'ROLLBACK','end']);
  }
});

test('review contract pins all nineteen exact security assertions',()=>{
  assert.deepEqual(CHECKS,[
    'identity_ok','database_ok','read_only','isolation_ok','search_path_ok','primary_ok',
    'tls_ok','least_privilege_ok','runtime_group_ok','membership_ok','runtime_role_ok','delegation_denied',
    'schema_usage_ok','schema_create_denied','function_execute_ok','database_create_denied',
    'policy_table_denied','clients_table_denied','cache_table_denied',
  ]);
});
