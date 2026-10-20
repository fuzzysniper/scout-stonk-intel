// Incident #130: REAL loopback TLS-terminating PostgreSQL proxy + disposable PG.
// SYNTHETIC credentials, source packets and hosting context ONLY. No provider DNS,
// hosted SQL, native Helius transport, deployed endpoint, cookie or hosted authentication.
import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer,connect} from 'node:net';
import {TLSSocket,createSecureContext} from 'node:tls';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {localPostgres} from './postgres-harness.mjs';
import {root,envelope,response,SYNTHETIC_KEY,SYNTHETIC_HMAC} from './fixtures.mjs';
const require=createRequire(import.meta.url),{Pool}=require('pg');
const {productionCanaryRuntime}=require(root+'/lib/onchain-mint/server/production.js');
const {LIVE_APPROVAL,prepareDatabase,databaseParameters}=require(root+'/lib/onchain-mint/server/production-config.js');
const {USDC_CANARY:C}=require(root+'/lib/onchain-mint/server/canary-policy.js');
const {postgresStore}=require(root+'/lib/onchain-mint/server/postgres-store.js');
const {POSTGRES_COMPATIBILITY_SQL,STEP_BODY_SHA256}=require(root+'/lib/onchain-mint/server/postgres-compatibility.js');
const HOST=LIVE_APPROVAL.storeHost,PASSWORD='SYNTHETIC_LOCAL_TEST_PASSWORD_111';
const DEPLOYMENT='scout-stonk-intel-synthetic130-riskledgerapp.vercel.app',ORIGIN='https://'+DEPLOYMENT;
const CONTEXT={vercel:'1',environment:'production',projectId:LIVE_APPROVAL.vercelProjectId,deploymentUrl:DEPLOYMENT,commitSha:'c'.repeat(40)};
let db,dir,server,port,ca;let pools=[];const sockets=new Set();
before(async()=>{
 dir=mkdtempSync(join(tmpdir(),'scout130-tls-proxy-'));
 const cert=join(dir,'local.crt'),key=join(dir,'local.key');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST,'-keyout',key,'-out',cert],{stdio:'ignore',timeout:10000});
 chmodSync(key,0o600);ca=readFileSync(cert,'utf8');
 const secureContext=createSecureContext({cert:ca,key:readFileSync(key),minVersion:'TLSv1.2'});
 db=await localPostgres({database:'neondb',runtimeRole:'scout_mint_app'});
 const backendPath=join(db.owner.options.host,'.s.PGSQL.'+db.owner.options.port);
 const track=s=>{sockets.add(s);s.on('error',()=>{});s.once('close',()=>sockets.delete(s));return s;};
 server=createServer(raw=>{
  track(raw);let first=Buffer.alloc(0);
  const startup=part=>{
   first=Buffer.concat([first,part]);
   if(first.length<8)return;
   raw.removeListener('data',startup);
   // Real PostgreSQL SSLRequest only. No packet or password logging/retention.
   if(first.length!==8 || first.readUInt32BE(0)!==8 || first.readUInt32BE(4)!==80877103){raw.destroy();return;}
   raw.write('S');
   const front=track(new TLSSocket(raw,{isServer:true,secureContext}));
   const back=track(connect({path:backendPath}));
   front.pipe(back);back.pipe(front);
   front.on('error',()=>back.destroy());back.on('error',()=>front.destroy());
   front.once('close',()=>back.destroy());back.once('close',()=>front.destroy());
  };
  raw.on('data',startup);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 port=server.address().port;
});
beforeEach(async()=>{
 await Promise.all(pools.map(p=>p.end()));pools=[];
 // Fixture-only state reset in a disposable LOCAL PG, never a production reset.
 await db.reset();
});
after(async()=>{
 await Promise.all(pools.map(p=>p.end()));
 for(const socket of sockets)socket.destroy();
 if(server)await new Promise(resolve=>server.close(resolve));
 await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});
});
function nativeStore(options={}){
 const handle=prepareDatabase(`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb`,HOST,C);
 assert.ok(handle);const params=databaseParameters(handle);
 const pool=new Pool({...params,host:'127.0.0.1',port,ssl:{...params.ssl,ca},...options});
 pool.on('error',()=>{});pools.push(pool);
 return {pool,store:postgresStore(pool,{host:HOST})};
}
function req(headers={}){
 return new Request(ORIGIN+'/api/mint-facts?mint='+C.mint,{method:'POST',headers:{
  origin:ORIGIN,'sec-fetch-site':'same-origin','x-scout-canary-intent':C.intent,
  host:DEPLOYMENT,'x-forwarded-host':DEPLOYMENT,'x-forwarded-proto':'https',
  'x-forwarded-for':'203.0.113.9','x-vercel-forwarded-for':'203.0.113.9','content-length':'0',...headers,
 }});
}
function runtime(options={}){
 const calls={credentials:0,store:0,rpcStub:0};
 const now=Date.now();
 const handler=productionCanaryRuntime(LIVE_APPROVAL,{
  hosting:()=>{if(options.hostingError)throw Error('SYNTHETIC_HOSTING_ERROR');return{...CONTEXT,...options.context}},
  readSecret:name=>{calls.credentials++;return{
   SCOUT_MINT_HELIUS_API_KEY:SYNTHETIC_KEY,SCOUT_MINT_ADMISSION_HMAC_KEY:SYNTHETIC_HMAC,
   SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb`,...options.secrets,
  }[name]},
  store:async()=>{calls.store++;if(options.storeError)throw Error('SYNTHETIC_STORE_ERROR');return options.store??nativeStore(options.poolOptions).store},
  transport:async(_url,init)=>{
   calls.rpcStub++;if(options.rpc)return options.rpc(init);
   const e=envelope();e.id=JSON.parse(init.body).id;e.result.value.data.parsed.info.decimals=6;
   return response(e);
  },
  clock:{now:()=>Date.now(),monotonic:()=>performance.now()},
 },{notBeforeMs:now-60000,expiresAtMs:now+3600000});
 return{handler,calls};
}
const read=async(s,r=req())=>{const res=await s.handler(r);return{res,body:await res.json()}};
const policy=async()=>(await db.owner.query('SELECT * FROM scout_mint.policy')).rows[0];

test('TLS proxy: verified native client TLS and plaintext backend must not falsely fail compatibility',async()=>{
 const {pool,store}=nativeStore();const client=await pool.connect();
 try{
  const socket=client.connection.stream;
  assert.equal(socket.encrypted,true);assert.equal(socket.authorized,true);assert.equal(socket.servername,HOST);
  assert.ok(['TLSv1.2','TLSv1.3'].includes(socket.getProtocol()));
  const backend=(await client.query('SELECT ssl,version FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0];
  assert.deepEqual(backend,{ssl:false,version:null});
 }finally{client.release()}
 const s=runtime({store}),a=await read(s);
 assert.equal(a.res.status,200,JSON.stringify({status:a.res.status,reason:a.body.reason,stubCalls:s.calls.rpcStub,seq:(await policy()).seq}));
 assert.equal(a.body.source.acquisition,'production_rpc'); // Trusted test construction, NOT genuine hosted evidence.
 assert.equal(s.calls.rpcStub,1);assert.equal((await policy()).seq,'1');
});

test('causal SQL proof: all retained catalog gates pass; adding only the old backend TLS predicate makes them fail',async()=>{
 const {pool}=nativeStore(),client=await pool.connect();
 try{
  await client.query('BEGIN; SET LOCAL synchronous_commit=on; SET LOCAL search_path=pg_catalog');
  assert.deepEqual((await client.query(POSTGRES_COMPATIBILITY_SQL,[STEP_BODY_SHA256])).rows,[{compatible:true}]);
  const old=POSTGRES_COMPATIBILITY_SQL.replace(" current_user='scout_mint_app'",
   " (SELECT s.ssl AND s.version IN('TLSv1.2','TLSv1.3') FROM pg_catalog.pg_stat_ssl s WHERE s.pid=pg_catalog.pg_backend_pid()) AND current_user='scout_mint_app'");
  assert.notEqual(old,POSTGRES_COMPATIBILITY_SQL);
  assert.deepEqual((await client.query(old,[STEP_BODY_SHA256])).rows,[{compatible:false}]);
 }finally{await client.query('ROLLBACK');client.release()}
 assert.equal((await policy()).seq,'0');
});

test('proxy path preserves native CA, hostname/SNI and frontend TLS requirements',async()=>{
 for(const poolOptions of [
  {ssl:{rejectUnauthorized:true,servername:HOST}},
  {ssl:{rejectUnauthorized:true,servername:'wrong.synthetic.invalid',ca}},
  {ssl:false},
 ]){
  const s=runtime({poolOptions}),a=await read(s);
  assert.equal(a.res.status,503);assert.equal(a.body.reason,'upstream_unavailable');
  assert.equal(s.calls.rpcStub,0);assert.equal((await policy()).seq,'0');
 }
});
test('function fingerprint/config and restricted grants still fail before admission through proxy',async()=>{
 const original=(await db.owner.query("SELECT pg_get_functiondef('scout_mint.step(jsonb)'::regprocedure) AS sql")).rows[0].sql;
 for(const sql of [original.replace('DECLARE','-- SYNTHETIC SOURCE DRIFT\nDECLARE'),"ALTER FUNCTION scout_mint.step(jsonb) SET search_path=public"]){
  try{
   await db.owner.query(sql);const s=runtime(),a=await read(s);
   assert.equal(a.res.status,503);assert.equal(a.body.reason,'upstream_unavailable');
   assert.equal(s.calls.rpcStub,0);assert.equal((await policy()).seq,'0');
  }finally{await db.owner.query(original)}
 }
 await db.owner.query('GRANT SELECT ON scout_mint.policy TO PUBLIC');
 try{
  const s=runtime(),a=await read(s);assert.equal(a.body.reason,'upstream_unavailable');
  assert.equal(s.calls.rpcStub,0);assert.equal((await policy()).seq,'0');
 }finally{await db.owner.query('REVOKE SELECT ON scout_mint.policy FROM PUBLIC')}
});
test('correct empty POST-to-GET translation passes; ordinary identity mismatches are 403, not the incident reason',async()=>{
 const s=runtime(),a=await read(s);assert.equal(a.res.status,200);assert.equal(s.calls.rpcStub,1);
 for(const headers of [{'x-vercel-forwarded-for':''},{'x-forwarded-host':'wrong.synthetic.invalid'},{origin:'https://wrong.synthetic.invalid'}]){
  const denied=runtime(),r=await read(denied,req(headers));
  assert.equal(r.res.status,403);assert.equal(r.body.reason,'access_denied');assert.equal(denied.calls.credentials,0);
 }
});
test('503 matrix: hosting/config/store-construction errors sanitize with zero stub traffic',async()=>{
 for(const options of [
  {hostingError:true},{secrets:{SCOUT_MINT_STORE_DATABASE_URL:undefined}},
  {secrets:{SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb?sslmode=require&channel_binding=require`}},
  {secrets:{SCOUT_MINT_ADMISSION_HMAC_KEY:undefined}},{secrets:{SCOUT_MINT_HELIUS_API_KEY:undefined}},
  {storeError:true},
 ]){
  const s=runtime(options),a=await read(s);assert.equal(a.res.status,503);assert.equal(a.body.reason,'upstream_unavailable');
  assert.equal(s.calls.rpcStub,0);assert.equal((await policy()).seq,'0');
  for(const secret of [PASSWORD,SYNTHETIC_KEY,SYNTHETIC_HMAC,'SYNTHETIC_HOSTING_ERROR','SYNTHETIC_STORE_ERROR'])assert.ok(!JSON.stringify(a.body).includes(secret));
 }
});
test('503 matrix: admission failure/timeout is indistinguishable publicly, and cannot dispatch',async()=>{
 for(const store of [{transact:async()=>{throw Error('SYNTHETIC_ADMISSION_ERROR')}},{transact:async()=>new Promise(()=>{})}]){
  const s=runtime({store}),start=performance.now(),a=await read(s);
  assert.equal(a.res.status,503);assert.equal(a.body.reason,'upstream_unavailable');
  assert.equal(s.calls.rpcStub,0);assert.ok(performance.now()-start<3500);
 }
});
test('503 matrix: provider 500/503 or missing policy is compatible with incident; only the former spends a lease',async()=>{
 for(const status of [500,503]){
  await db.reset();const s=runtime({rpc:()=>new Response('SYNTHETIC PRIVATE ERROR',{status})}),a=await read(s);
  assert.equal(a.res.status,503);assert.equal(a.body.reason,'upstream_unavailable');assert.equal(a.body.source,null);
  assert.equal(s.calls.rpcStub,1);assert.equal((await policy()).seq,'1');assert.equal((await policy()).circuit,'upstream_unavailable');
  const second=runtime();assert.equal((await read(second)).body.reason,'circuit_open');assert.equal(second.calls.rpcStub,0);
 }
 await db.reset();await db.owner.query('DELETE FROM scout_mint.policy');
 const s=runtime(),a=await read(s);assert.equal(a.body.reason,'upstream_unavailable');assert.equal(s.calls.rpcStub,0);
 assert.equal((await db.owner.query('SELECT count(*) FROM scout_mint.policy')).rows[0].count,'0');
});
test('503 matrix: lost admission acknowledgement preserves charged lease without source traffic',async()=>{
 const {store}=nativeStore();const s=runtime({store:{async transact(c){await store.transact(c);throw Error('SYNTHETIC_LOST_ACK')}}}),a=await read(s);
 assert.equal(a.body.reason,'upstream_unavailable');assert.equal(s.calls.rpcStub,0);assert.equal((await policy()).seq,'1');
 const next=runtime();assert.notEqual((await read(next)).res.status,200);assert.equal(next.calls.rpcStub,0);
});
test('503 matrix: lost completion acknowledgement hides a completed stub read and cannot rearm',async()=>{
 const {store}=nativeStore();const s=runtime({store:{async transact(c){const r=await store.transact(c);if(c.kind==='complete')throw Error('SYNTHETIC_LOST_ACK');return r}}}),a=await read(s);
 assert.equal(a.res.status,503);assert.equal(a.body.reason,'upstream_unavailable');assert.equal(a.body.source,null);
 assert.equal(s.calls.rpcStub,1);assert.equal((await policy()).seq,'1');
 const next=runtime();assert.equal((await read(next)).body.reason,'circuit_open');assert.equal(next.calls.rpcStub,0);
});
test('transport network/401/429/invalid packet failures have other reasons; 503 alone does not locate the failure',async()=>{
 for(const [rpc,expected] of [
  [()=>{throw Error('SYNTHETIC_NETWORK_ERROR')},'network_unavailable'],
  [()=>new Response(null,{status:401}),'access_denied'],
  [()=>new Response(null,{status:429}),'rate_limited'],
  [()=>new Response('not JSON',{headers:{'content-type':'application/json'}}),'invalid_response'],
 ]){
  await db.reset();const s=runtime({rpc}),a=await read(s);
  assert.equal(a.body.reason,expected);assert.equal(s.calls.rpcStub,1);assert.equal((await policy()).seq,'1');
 }
});
test('unchanged absolute expiry/budget and public GET cannot be renewed or made live by this correction',async()=>{
 assert.equal(C.expiresAtMs,Date.parse('2026-10-21T00:00:00.000Z'));assert.equal(C.maxLeaseId,1);
 const s=runtime();const request=new Request(ORIGIN+'/api/mint-facts?mint='+C.mint);
 assert.notEqual((await read(s,request)).res.status,200);assert.equal(s.calls.credentials,0);assert.equal(s.calls.rpcStub,0);
 await db.owner.query('UPDATE scout_mint.policy SET seq=3');
 const charged=runtime(),a=await read(charged);assert.equal(a.body.reason,'admission_limited');assert.equal(charged.calls.rpcStub,0);
 assert.equal((await policy()).seq,'4'); // New fixture reservation, never reset/reused sequence1.
});
