// REAL disposable local PostgreSQL + TLS/SCRAM; explicitly SYNTHETIC events/keys/credentials. No provider calls.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {Readable} from 'node:stream';
import {createRequire} from 'node:module';
import {liveHandler,PROJECT} from '../../lib/live-ledger/http.mjs';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {localPostgres} from '../onchain-api/postgres-harness.mjs';
import {postgresPort,databaseConfig,NEON_HOST,fingerprintSource} from '../../lib/live-ledger/database.mjs';
import {SCOPE,POLICY,validEvent,validCommand} from '../../lib/live-ledger/policy.mjs';
const PASSWORD='SYNTHETIC_LIVE_LEDGER_PASSWORD_167';
const head='a'.repeat(40),session=randomUUID(),worker=randomUUID();
const base={v:1,session,worker,scope:SCOPE,head};
const pools=new Set();let db,dir,ca,port;
const sql=readFileSync('lib/live-ledger/postgres/schema.sql','utf8');
const fingerprints=JSON.parse(readFileSync('lib/live-ledger/fingerprints.json','utf8'));
before(async()=>{
 dir=mkdtempSync(join(tmpdir(),'scout-live-tls-'));const key=join(dir,'test.key'),cert=join(dir,'test.crt');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+NEON_HOST,'-addext','subjectAltName=DNS:'+NEON_HOST,'-keyout',key,'-out',cert],{stdio:'ignore',timeout:10000});chmodSync(key,0o600);ca=readFileSync(cert,'utf8');
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));port=probe.address().port;await new Promise(r=>probe.close(r));
 db=await localPostgres({tls:{port,cert,key},database:'neondb',runtimeRole:'scout_mint_app'});
 await db.owner.query(readFileSync('lib/onchain-mint/server/postgres/lookup.sql','utf8'));
 await db.owner.query(sql);
 for(const role of ['worker','reader','stop'])await db.owner.query(`ALTER ROLE scout_live_${role} PASSWORD '${PASSWORD}'`);
});
after(async()=>{await Promise.all([...pools].map(p=>p.end()));await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});});
beforeEach(async()=>{
 await Promise.all([...pools].map(p=>p.end()));pools.clear();
 await db.owner.query('TRUNCATE scout_live.events,scout_live.control');
 await db.owner.query(`INSERT INTO scout_live.control(id,approved,session,head,starts_at,expires_at,connection_credits,rpc_credits,credit_limit,terms_approved,quota_approved) VALUES(true,true,$1,$2,clock_timestamp()-interval '1 minute',clock_timestamp()+interval '30 minutes',100,1,10000,true,true)`,[session,head]);
});
function pool(kind,override={}){
 const config=databaseConfig(`postgresql://scout_live_${kind}:${PASSWORD}@${NEON_HOST}/neondb?sslmode=require`,kind);
 const p=new Pool({...config,host:'127.0.0.1',port,ssl:{...config.ssl,ca},...override});p.on('error',()=>{});pools.add(p);return p;
}
function store(kind='worker',override){const p=pool(kind,override);const s=postgresPort(p,{kind,host:NEON_HOST});return {...s,async close(){pools.delete(p);await s.close();}};}
async function claimed(){const s=store();const r=await s.transact({...base,op:'claim'});assert.equal(r.ok,true);return {s,c:{...base,fence:r.fence}};}
async function connected(){const {s,c}=await claimed();assert.equal((await s.transact({...c,op:'reserve',resource:'connection'})).ok,true);return {s,c};}
const event=(sig='2'.repeat(88))=>({signature:sig,slot:1234,receivedAt:new Date().toISOString(),source:'helius_standard',program:POLICY.program,notificationHash:'b'.repeat(64),finality:'provisional',mint:null,quoteMint:null,tokenProgram:null,transactionHash:null,verificationHash:null,checkedAt:null,blockTime:null});
const final=e=>({...e,finality:'rpc_reported_finalized',mint:'So11111111111111111111111111111111111111112',quoteMint:'11111111111111111111111111111111',tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',transactionHash:'c'.repeat(64),verificationHash:'d'.repeat(64),checkedAt:new Date().toISOString()});
const heartbeat=c=>({...c,op:'heartbeat',framesReceived:0,bytesReceived:0,sourceState:'closed',lastFrameAt:null,lastPongAt:null,lastRpcElapsedMs:null});
test('reviewed SQL body hashes match source exactly',()=>assert.deepEqual(fingerprintSource(sql),fingerprints));
test('unapproved installation is empty and cannot claim',async()=>{
 await db.owner.query('TRUNCATE scout_live.control');await db.owner.query('INSERT INTO scout_live.control(id) VALUES(true)');
 assert.equal((await store().transact({...base,op:'claim'})).reason,'unapproved');
 const r=await store('reader').transact(null);assert.deepEqual(r.events,[]);assert.equal(r.health.state,'unapproved');assert.equal(r.budget.creditsMax,null);
});
test('real verified TLS/SNI and SCRAM authenticate all three isolated roles',async()=>{
 for(const kind of ['reader','stop'])assert.ok(await store(kind).transact(null));
});
test('concurrent worker claims admit exactly one fence',async()=>{
 const replies=await Promise.all(Array.from({length:2},()=>store().transact({...base,op:'claim',worker:randomUUID()})));
 assert.equal(replies.filter(r=>r.ok).length,1);assert.equal(new Set(replies.map(r=>r.fence)).size,1);
});
test('connection reservation charges whole envelope before native I/O and refuses overlap',async()=>{
 const {s,c}=await connected();assert.equal((await s.transact({...c,op:'reserve',resource:'connection'})).reason,'connection_state');
 const r=await store('reader').transact(null);assert.equal(r.budget.connectionsUsed,1);assert.equal(r.budget.framesReserved,20000);assert.equal(r.budget.bytesReserved,16777216);assert.equal(r.budget.creditsReserved,100);
});
test('concurrent HTTP reservations never exceed global 40 and STOP on exhaustion',async()=>{
 const {s:initial,c}=await connected();await initial.close();const ports=Array.from({length:2},()=>store());let ok=0;
 for(let batch=0;batch<21;batch++){const replies=await Promise.all(ports.map(s=>s.transact({...c,op:'reserve',resource:'rpc'})));ok+=replies.filter(r=>r.ok).length;}
 assert.equal(ok,40);const r=await store('reader').transact(null);assert.equal(r.budget.rpcUsed,40);assert.equal(r.budget.creditsReserved,140);assert.equal(r.health.stopped,true);
});
test('credit cap failure is atomic and durable with no partial increment',async()=>{
 await db.owner.query('UPDATE scout_live.control SET credit_limit=99');const {s,c}=await claimed();const r=await s.transact({...c,op:'reserve',resource:'connection'});assert.equal(r.reason,'budget');
 const snap=await store('reader').transact(null);assert.equal(snap.budget.connectionsUsed,0);assert.equal(snap.budget.creditsReserved,0);assert.equal(snap.status,'stopped');
});
test('expired unclean lease latches STOP rather than admitting replacement',async()=>{
 await connected();await db.owner.query("UPDATE scout_live.control SET lease_until=clock_timestamp()-interval '1 second'");
 const r=await store().transact({...base,op:'claim',worker:randomUUID()});assert.equal(r.ok,false);assert.equal(r.reason,'unclean_lease');assert.equal(r.stopped,true);
});
test('clean socket release permits reconnect but never refunds connection budget',async()=>{
 const {s,c}=await connected();assert.equal((await s.transact({...c,op:'release',connectionClosed:true,terminal:false})).ok,true);
 assert.equal((await s.transact({...c,op:'reserve',resource:'connection'})).ok,true);assert.equal((await store('reader').transact(null)).budget.connectionsUsed,2);
});
test('terminal release changes fence and old process cannot mutate',async()=>{
 const {s,c}=await connected();await s.transact({...c,op:'release',connectionClosed:true,terminal:true});
 const r=await store().transact({...base,op:'claim',worker:randomUUID()});assert.notEqual(r.fence,c.fence);assert.equal((await s.transact({...c,op:'heartbeat',...heartbeat(c)})).reason,'fenced');
});
test('STOP survives fresh client and denies all further reservations',async()=>{
 const {s,c}=await connected();assert.equal((await store('stop').transact(null)).status,'stopped');
 assert.equal((await s.transact({...c,op:'reserve',resource:'rpc'})).reason,'stopped');assert.equal((await store('reader').transact(null)).budget.connectionsUsed,1);
});
test('STOP racing reservations leaves a permanent deny latch and bounded spent tickets',async()=>{
 const {s,c}=await connected();await Promise.all([store('stop').transact(null),store().transact({...c,op:'reserve',resource:'rpc'})]);
 const r=await s.transact({...c,op:'reserve',resource:'rpc'});assert.equal(r.stopped,true);assert.ok((await store('reader').transact(null)).budget.rpcUsed<=1);
});
test('provisional insert, duplicate and finalized upgrade preserve identity and original clock',async()=>{
 const {s,c}=await connected(),e=event();assert.ok(validEvent(e));assert.equal((await s.transact({...c,op:'append',event:e})).reason,'inserted');
 assert.equal((await s.transact({...c,op:'append',event:e})).reason,'duplicate');
 await s.transact({...c,op:'reserve',resource:'rpc'});await s.transact({...c,op:'reserve',resource:'rpc'});
 const f=final(e);assert.equal((await s.transact({...c,op:'append',event:f})).reason,'promoted');
 assert.equal((await s.transact({...c,op:'append',event:f})).reason,'duplicate');const snap=await store('reader').transact(null);assert.deepEqual(snap.events,[f]);assert.deepEqual(snap.counts,{provisional:0,finalized:1});
});
test('no direct finalized insertion or finalized identity revision',async()=>{
 const {s,c}=await connected(),e=event();await assert.rejects(s.transact({...c,op:'append',event:final(e)}),/store_unavailable/);
 await s.transact({...c,op:'append',event:e});await s.transact({...c,op:'reserve',resource:'rpc'});await s.transact({...c,op:'reserve',resource:'rpc'});
 const f=final(e);await s.transact({...c,op:'append',event:f});await assert.rejects(s.transact({...c,op:'append',event:{...f,mint:'3'.repeat(44)}}));
 assert.equal((await store('reader').transact(null)).events[0].mint,f.mint);
});
test('SQL itself rejects unverified mint, bad program/hash/slot/future clock despite direct role access',async()=>{
 const {c}=await connected();const p=pool('worker');const e=event();
 for(const patch of [{mint:'11111111111111111111111111111111'},{program:'bad'},{notificationHash:'x'},{slot:0},{receivedAt:'2999-01-01T00:00:00.000Z'},{raw:'NO_RAW_LOGS'}])await assert.rejects(p.query('SELECT scout_live.step($1::jsonb)',[{...c,op:'append',event:{...e,...patch}}]));
 assert.deepEqual((await store('reader').transact(null)).events,[]);
});
test('event retention is bounded to 200, latest 20 ordered, expired hidden without reader writes',async()=>{
 const {s,c}=await connected();const e=event();
 // SYNTHETIC fixture bulk setup by test owner, not a public ingest escape hatch.
 for(let i=0;i<205;i++)await db.owner.query("INSERT INTO scout_live.events VALUES($1,clock_timestamp()-$2*interval '1 second',clock_timestamp()+interval '1 hour',$3)",['synthetic-'+i,i,{...e}]);
 await s.transact({...c,op:'append',event:e});const r=await store('reader').transact(null);assert.equal(r.events.length,20);assert.equal(r.counts.provisional,200);
 await db.owner.query("UPDATE scout_live.events SET expires_at=clock_timestamp()-interval '1 second'");assert.deepEqual((await store('reader').transact(null)).events,[]);
 assert.equal((await db.owner.query('SELECT count(*) FROM scout_live.events')).rows[0].count,'200');
 await s.transact(heartbeat(c));assert.equal((await db.owner.query('SELECT count(*) FROM scout_live.events')).rows[0].count,'0');
});
test('DB heartbeat cannot assert provider freshness, actual frame/pong evidence is separate',async()=>{
 const {s,c}=await connected();await s.transact(heartbeat(c));let r=await store('reader').transact(null);assert.equal(r.status,'waiting');assert.equal(r.health.lastFrameAt,null);
 await s.transact({...heartbeat(c),sourceState:'open',lastPongAt:new Date().toISOString()});r=await store('reader').transact(null);assert.equal(r.status,'observing');assert.equal(r.health.sourceState,'open');
});
test('gap begin/end is explicit and repeated begins do not double-count',async()=>{
 const {s,c}=await connected();for(let i=0;i<2;i++)await s.transact({...c,op:'gap',reason:'startup',phase:'begin'});
 let r=await store('reader').transact(null);assert.equal(r.health.gaps,1);assert.ok(r.health.gapSince);
 await s.transact({...c,op:'gap',reason:'startup',phase:'end'});r=await store('reader').transact(null);assert.equal(r.health.gapSince,null);assert.ok(r.health.gapEndedAt);
});
test('all runtime roles deny persistent DDL, direct state mutation, old proof state, and unauthorized functions',async()=>{
 for(const kind of ['worker','reader','stop']){
  const p=pool(kind);for(const query of ['UPDATE scout_live.control SET stopped=false','SELECT * FROM scout_live.events','DELETE FROM scout_live.control','TRUNCATE scout_live.events','SELECT scout_mint.step(\'{}\')','SELECT scout_lookup.step(\'{}\')','CREATE TABLE public.bad(x int)'])await assert.rejects(p.query(query),e=>e.code==='42501');
  for(const [other,q] of Object.entries({worker:"SELECT scout_live.step('{}')",reader:'SELECT scout_live.snapshot()',stop:'SELECT scout_live.stop()'}))if(other!==kind)await assert.rejects(p.query(q),e=>e.code==='42501');
 }
});
test('function fingerprint drift fails closed before execution',async()=>{
 await db.owner.query("ALTER FUNCTION scout_live.snapshot() SET statement_timeout='900ms'");
 try{await assert.rejects(store('reader').transact(null),/store_unavailable/);}finally{await db.owner.query('ALTER FUNCTION scout_live.snapshot() RESET statement_timeout');}
});
test('TLS rejects wrong host, untrusted CA, plaintext and wrong password',async()=>{
 const bad=[{ssl:{rejectUnauthorized:true,servername:'wrong.invalid',ca}},{ssl:{rejectUnauthorized:true,servername:NEON_HOST}},{ssl:false},{password:'SYNTHETIC_WRONG_PASSWORD'}];
 for(const change of bad)await assert.rejects(store('reader',change).transact(null),e=>e.message==='store_unavailable'&&!e.message.includes(PASSWORD));
});
test('transaction rollback discards a charge when COMMIT was never issued',async()=>{
 const {c}=await connected();const p=pool('worker');const client=await p.connect();
 try{await client.query('BEGIN');await client.query('SELECT scout_live.step($1)',[{...c,op:'reserve',resource:'rpc'}]);await client.query('ROLLBACK');}finally{client.release();}
 assert.equal((await store('reader').transact(null)).budget.rpcUsed,0);
});
test('real crash/restart preserves spent quotas, permanent STOP and event history',async()=>{
 const {s,c}=await connected();await s.transact({...c,op:'reserve',resource:'rpc'});await s.transact({...c,op:'append',event:event()});await store('stop').transact(null);
 await Promise.all([...pools].map(p=>p.end()));pools.clear();await db.crashRestart();
 const r=await store('reader').transact(null);assert.equal(r.health.stopped,true);assert.equal(r.budget.rpcUsed,1);assert.equal(r.budget.connectionsUsed,1);assert.equal(r.events.length,1);
});
test('storage outage is unavailable, never a success/empty feed or memory fallback',async()=>{
 await Promise.all([...pools].map(p=>p.end()));pools.clear();await db.outage();
 try{await assert.rejects(store('reader').transact(null),/store_unavailable/);}finally{await db.restore();}
});
test('aborted request cannot obtain an I/O ticket',async()=>{
 const {s,c}=await connected();const a=new AbortController();a.abort();await assert.rejects(s.transact({...c,op:'reserve',resource:'rpc'},{signal:a.signal}));assert.equal((await store('reader').transact(null)).budget.rpcUsed,0);
});
test('strict command and event schemas exclude raw payloads and fake identity',()=>{
 const e=event();assert.ok(validEvent(e));assert.equal(validEvent({...e,mint:'11111111111111111111111111111111'}),false);assert.equal(validCommand({...base,op:'claim',raw:'anything'}),false);
});

// Run the exact owner authorization file against disposable local SQL, never a hosted DB.
function authorize(values={}) {
 const bin=[process.env.SCOUT_TEST_PG_BIN,...[18,17,16,15].map(v=>`/usr/lib/postgresql/${v}/bin`)].find(b=>b&&existsSync(join(b,'psql')));
 const args=['-X','-v','ON_ERROR_STOP=1','-h',db.owner.options.host,'-p',String(db.owner.options.port),'-U','scout_test_owner','-d','neondb'];
 const now=Date.now();const variables={session,head,start_utc:new Date(now+5000).toISOString(),end_utc:new Date(now+300000).toISOString(),connection_credits:100,rpc_credits:1,credit_limit:10000,...values};
 for(const [k,v] of Object.entries(variables))args.push('-v',`${k}=${v}`);
 args.push('-f','lib/live-ledger/postgres/authorize.sql');
 return execFileSync(join(bin,'psql'),args,{stdio:['ignore','pipe','pipe'],env:{PATH:'/usr/bin:/bin',LANG:'C',LD_LIBRARY_PATH:join(bin,'../../../x86_64-linux-gnu')},timeout:5000}).toString();
}
test('exact owner authorization succeeds once and refuses reuse without resetting state',async()=>{
 await db.owner.query('TRUNCATE scout_live.control');await db.owner.query('INSERT INTO scout_live.control(id) VALUES(true)');
 assert.match(authorize(),/COMMIT/);assert.throws(()=>authorize());
 const c=(await db.owner.query('SELECT * FROM scout_live.control')).rows[0];assert.equal(c.approved,true);assert.equal(c.session,session);assert.equal(c.connections,0);assert.equal(c.stopped,false);
});
test('authorization rejects invalid duration, stale expiry and missing/zero verified pricing atomically',async()=>{
 for(const values of [{end_utc:'2000-01-01T00:00:00Z'},{end_utc:new Date(Date.now()+7200000).toISOString()},{connection_credits:0},{credit_limit:0}]){
  await db.owner.query('TRUNCATE scout_live.control');await db.owner.query('INSERT INTO scout_live.control(id) VALUES(true)');assert.throws(()=>authorize(values));
  assert.equal((await db.owner.query('SELECT approved FROM scout_live.control')).rows[0].approved,false);
 }
});
test('expired sessions cannot auto-extend, and heartbeat cannot decrement receive counters',async()=>{
 const {s,c}=await connected();await s.transact({...heartbeat(c),framesReceived:3,bytesReceived:20});await assert.rejects(s.transact(heartbeat(c)));
 await db.owner.query("UPDATE scout_live.control SET starts_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()-interval '1 minute'");
 const r=await s.transact({...c,op:'reserve',resource:'rpc'});assert.equal(r.reason,'session_expired');assert.equal(r.stopped,true);
});

test('creation operations preserve exact legacy and lookup policy history',async()=>{
 const read=async()=>JSON.stringify((await db.owner.query("SELECT (SELECT jsonb_agg(to_jsonb(p)) FROM scout_mint.policy p) legacy,(SELECT jsonb_agg(to_jsonb(p)) FROM scout_lookup.policy p) lookup")).rows);
 const before=await read();const {s,c}=await connected();await s.transact({...c,op:'append',event:event()});await s.transact({...c,op:'reserve',resource:'rpc'});await store('stop').transact(null);assert.equal(await read(),before);
});

test('repeated notification with new receipt/hash preserves original evidence and suppresses resampling',async()=>{
 const {s,c}=await connected(),e=event();await s.transact({...c,op:'append',event:e});
 const duplicate={...e,receivedAt:new Date().toISOString(),notificationHash:'e'.repeat(64)};
 assert.equal((await s.transact({...c,op:'append',event:duplicate})).reason,'duplicate');
 assert.deepEqual((await store('reader').transact(null)).events,[e]);
 await assert.rejects(s.transact({...c,op:'append',event:{...duplicate,slot:1235}}));
 assert.equal((await store('reader').transact(null)).budget.rpcUsed,0);
});

test('missing approved expiry/pricing cannot exploit PostgreSQL nullable CHECK semantics',async()=>{
 for(const field of ['expires_at','connection_credits','rpc_credits','credit_limit'])await assert.rejects(db.owner.query(`UPDATE scout_live.control SET ${field}=NULL`),e=>e.code==='23514');
 await assert.rejects(db.owner.query('UPDATE scout_live.control SET connected=true'),e=>e.code==='23514');
 const {s,c}=await claimed();assert.equal((await s.transact({...c,op:'reserve',resource:'connection'})).ok,true);
});

test('native SOL sentinel is exact, never relabeled WSOL; unsupported WSOL quote rejected',async()=>{
 const {s,c}=await connected(),e=event();await s.transact({...c,op:'append',event:e});await s.transact({...c,op:'reserve',resource:'rpc'});await s.transact({...c,op:'reserve',resource:'rpc'});
 const f=final(e);assert.equal((await s.transact({...c,op:'append',event:f})).reason,'promoted');assert.equal((await store('reader').transact(null)).events[0].quoteMint,'11111111111111111111111111111111');
 assert.equal(validEvent({...f,mint:'3'.repeat(44),quoteMint:'So11111111111111111111111111111111111111112'}),false);
});
test('only exact fenced closure can be acknowledged after STOP; STOP and budgets remain permanent',async()=>{
 const {s,c}=await connected();await store('stop').transact(null);
 assert.equal((await s.transact({...c,fence:randomUUID(),op:'release',connectionClosed:true,terminal:true})).ok,false);
 assert.equal((await s.transact({...c,op:'release',connectionClosed:true,terminal:true})).reason,'closed_after_stop');
 const r=await store('reader').transact(null);assert.equal(r.status,'stopped');assert.equal(r.health.sourceState,'closed');assert.equal(r.health.leaseUntil,null);assert.equal(r.budget.connectionsUsed,1);assert.equal(r.budget.creditsReserved,100);
 assert.equal((await s.transact({...base,op:'claim'})).reason,'stopped');assert.equal((await s.transact({...c,op:'reserve',resource:'rpc'})).reason,'stopped');
});
test('30s provider ping cadence is healthy; evidence older45s is stale',async()=>{
 const {s,c}=await connected();const pong=age=>new Date(Date.now()-age*1000).toISOString();
 await s.transact({...heartbeat(c),sourceState:'open',lastPongAt:pong(35)});assert.equal((await store('reader').transact(null)).status,'observing');
 await s.transact({...heartbeat(c),sourceState:'open',lastPongAt:pong(50)});assert.equal((await store('reader').transact(null)).status,'stale');
});

test('inherited owner default ACLs cannot leak the isolated schema; installation rolls back',async()=>{
 const other=await localPostgres({database:'neondb',runtimeRole:'scout_mint_app'});
 try{
  await other.owner.query('ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO scout_mint_app');
  await assert.rejects(other.owner.query(sql),/unexpected_live_acl/);await other.owner.query('ROLLBACK');
  assert.equal((await other.owner.query("SELECT to_regnamespace('scout_live') n")).rows[0].n,null);
  assert.equal((await other.owner.query("SELECT count(*) FROM pg_roles WHERE rolname IN ('scout_live_worker','scout_live_reader','scout_live_stop')")).rows[0].count,'0');
 }finally{await other.close();}
});
test('unexpected runtime function grantees fail compatibility without using their credentials',async()=>{
 await db.owner.query('GRANT EXECUTE ON FUNCTION scout_live.snapshot() TO scout_mint_app');
 try{await assert.rejects(store('reader').transact(null),/store_unavailable/);}finally{await db.owner.query('REVOKE EXECUTE ON FUNCTION scout_live.snapshot() FROM scout_mint_app');}
});

test('STOP cannot report success if its durable control row is missing',async()=>{
 await db.owner.query('DELETE FROM scout_live.control');
 await assert.rejects(store('stop').transact(null),e=>e.message==='store_unavailable');
 await assert.rejects(store('reader').transact(null),e=>e.message==='store_unavailable');
});

test('actual Next request adapter/authenticated API reads stored rows and commits STOP through native TLS PG',async()=>{
 const {s,c}=await connected(),e=event();await s.transact({...c,op:'append',event:e});
 const host='scout-stonk-intel-synthetic.vercel.app',token='SYNTHETIC_OWNER_TOKEN_'+ 'x'.repeat(32);
 const env={SCOUT_LIVE_API_ENABLED:'true',SCOUT_LIVE_OWNER_TOKEN:token,VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_ID:PROJECT,VERCEL_GIT_COMMIT_SHA:head,VERCEL_URL:host};
 const read=liveHandler('reader',{env:()=>env,storeFactory:()=>store('reader')});
 const headers={authorization:'Bearer '+token,'sec-fetch-site':'same-origin'};
 const get=()=>new Request('https://'+host+'/api/live-events',{headers});
 let r=await read(get());assert.equal(r.status,200);assert.deepEqual((await r.json()).events,[e]);assert.match(r.headers.get('cache-control'),/no-store/);
 const {NextRequestAdapter}=createRequire(import.meta.url)('next/dist/server/web/spec-extension/adapters/next-request.js');
 const request=NextRequestAdapter.fromNodeNextRequest({method:'POST',url:'https://'+host+'/api/live-events/stop',headers:{...headers,origin:'https://'+host,'x-scout-live-intent':'STOP_SCOUT_LIVE','content-length':'0'},body:Readable.from([])},new AbortController().signal);
 const stop=liveHandler('stop',{env:()=>env,storeFactory:()=>store('stop')});r=await stop(request);assert.equal(r.status,200);assert.equal((await r.json()).status,'stopped');
 r=await read(get());const stopped=await r.json();assert.equal(stopped.health.stopped,true);assert.equal(stopped.budget.connectionsUsed,1);assert.equal((await s.transact({...c,op:'reserve',resource:'rpc'})).ok,false);
});
