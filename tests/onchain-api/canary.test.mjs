// SYNTHETIC offline RPC/hosting only. REAL disposable local PostgreSQL/TLS.
// Never resolves the Neon hostname or calls Vercel/Helius. No production secret is read.
import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import {mkdtempSync,readFileSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {localPostgres} from './postgres-harness.mjs';
import {root,envelope,response,SYNTHETIC_KEY,SYNTHETIC_HMAC,MINT as OTHER} from './fixtures.mjs';
const require=createRequire(import.meta.url),{Pool}=require('pg');
const {productionCanaryRuntime}=require(root+'/lib/onchain-mint/server/production.js');
const {LIVE_APPROVAL,PRODUCTION_PROFILE,prepareDatabase,databaseParameters}=require(root+'/lib/onchain-mint/server/production-config.js');
const {USDC_CANARY:C}=require(root+'/lib/onchain-mint/server/canary-policy.js');
const {STEP_BODY_SHA256}=require(root+'/lib/onchain-mint/server/postgres-compatibility.js');
const {postgresStore}=require(root+'/lib/onchain-mint/server/postgres-store.js');
const HOST=LIVE_APPROVAL.storeHost,DEPLOYMENT='scout-stonk-intel-synthetic9-riskledgerapp.vercel.app',ORIGIN='https://'+DEPLOYMENT;
const PASSWORD='SYNTHETIC_LOCAL_TEST_PASSWORD_111',COMMIT='c'.repeat(40),sqlNow='floor(extract(epoch FROM clock_timestamp())*1000)::bigint';
const CONTEXT={vercel:'1',environment:'production',projectId:LIVE_APPROVAL.vercelProjectId,deploymentUrl:DEPLOYMENT,commitSha:COMMIT};
let db,dir,port,ca;let pools=[];
before(async()=>{
 dir=mkdtempSync(join(tmpdir(),'scout-canary-tls-'));const cert=join(dir,'local.crt'),key=join(dir,'local.key');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST,'-keyout',key,'-out',cert],{stdio:'ignore'});
 chmodSync(key,0o600);ca=readFileSync(cert,'utf8');const probe=createServer();
 await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
 port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 db=await localPostgres({tls:{cert,key,port},database:'neondb',runtimeRole:'scout_mint_app'});
});
beforeEach(async()=>{await Promise.all(pools.map(p=>p.end()));pools=[];await db.reset();});
after(async()=>{await Promise.all(pools.map(p=>p.end()));await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});});
function nativeStore(options={}) {
 const h=prepareDatabase(`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb`,HOST,C);assert.ok(h);
 const p=databaseParameters(h);
 // TEST ONLY: loopback transport + generated CA; all role/db/SNI/protocol proofs remain real.
 const pool=new Pool({...p,host:'127.0.0.1',port,ssl:{...p.ssl,ca},...options});pool.on('error',()=>{});pools.push(pool);
 return postgresStore(pool,{host:HOST});
}
const policy=async()=>(await db.owner.query('SELECT * FROM scout_mint.policy')).rows[0];
function req(options={}) {
 const mint=options.mint??C.mint;
 return new Request(options.url??ORIGIN+'/api/mint-facts?mint='+mint,{method:options.method??'POST',
  headers:{origin:ORIGIN,'sec-fetch-site':'same-origin','x-scout-canary-intent':C.intent,
   'x-forwarded-for':'203.0.113.8','x-vercel-forwarded-for':'203.0.113.8','x-forwarded-host':DEPLOYMENT,'x-forwarded-proto':'https',...options.headers},
  ...(options.body===undefined?{}:{body:options.body,duplex:'half'}),signal:options.signal});
}
function runtime(options={}) {
 const calls={secrets:[],store:0,rpc:0,hosting:0,raw:[],requests:[]};
 const now=Date.now(),window=options.window??{notBeforeMs:now-60000,expiresAtMs:now+3600000};
 const handler=productionCanaryRuntime(options.approval??LIVE_APPROVAL,{
  hosting:()=>{calls.hosting++;return {...CONTEXT,...options.context};},
  readSecret:key=>{calls.secrets.push(key);return {SCOUT_MINT_HELIUS_API_KEY:SYNTHETIC_KEY,SCOUT_MINT_ADMISSION_HMAC_KEY:SYNTHETIC_HMAC,
   SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb`,...options.secrets}[key];},
  store:async()=>{calls.store++;return options.store??nativeStore(options.poolOptions);},
  transport:async(url,init)=>{calls.rpc++;calls.requests.push({url,init});
   const e=envelope();e.id=JSON.parse(init.body).id;e.result.value.data.parsed.info.decimals=6;
   if(options.rpc)return options.rpc(e,init);
   calls.raw.push(JSON.stringify(e));return response(e);
  },clock:options.clock??{now:()=>Date.now(),monotonic:()=>performance.now()},
 },window);
 return {handler,calls};
}
const read=async(s,request=req())=>{const res=await s.handler(request);return{res,body:await res.json()};};

test('catalog proof matches exact reviewed deployed function source and bootstrap policy id',async()=>{
 const sql=readFileSync('lib/onchain-mint/server/postgres/schema.sql','utf8'),bootstrap=readFileSync('lib/onchain-mint/server/postgres/bootstrap.sql','utf8');
 assert.equal(createHash('sha256').update(sql.split('$function$')[1]).digest('hex'),STEP_BODY_SHA256);
 assert.ok(bootstrap.includes("VALUES('"+PRODUCTION_PROFILE.policy+"')"));
 const s=runtime(),a=await read(s);assert.equal(a.res.status,200);assert.equal(s.calls.rpc,1);
 const b=a.body;assert.equal(b.mint,C.mint);assert.equal(b.source.acquisition,'production_rpc');assert.equal(b.facts.program,'spl_token');
 assert.equal(b.facts.supply.decimals,6);assert.equal(b.source.responseSha256,createHash('sha256').update(s.calls.raw[0]).digest('hex'));
 assert.deepEqual(JSON.parse(s.calls.requests[0].init.body),{jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[C.mint,{encoding:'jsonParsed',commitment:'finalized'}]});
 assert.equal(a.res.headers.get('x-scout-delivery'),'rpc');assert.equal(a.res.headers.get('x-scout-deployment-host'),DEPLOYMENT);assert.equal(a.res.headers.get('x-scout-commit'),COMMIT);
 assert.equal((await policy()).seq,'1');assert.equal((await policy()).rpc_day,1);
 for(const secret of [SYNTHETIC_KEY,SYNTHETIC_HMAC,PASSWORD,'api-key=','203.0.113.8'])assert.ok(!JSON.stringify(b).includes(secret));
});
test('homepage/deep-link GETs and public-origin POSTs cannot even inspect hosting or credentials',async()=>{
 const s=runtime();
 for(const r of [req({method:'GET'}),req({method:'GET',url:'https://scout.storkcoin.xyz/api/mint-facts?mint='+C.mint,headers:{origin:'https://scout.storkcoin.xyz','x-forwarded-host':'scout.storkcoin.xyz'}}),
  req({url:'https://scout.storkcoin.xyz/api/mint-facts?mint='+C.mint})])assert.notEqual((await read(s,r)).res.status,200);
 assert.equal(s.calls.hosting,0);assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.store,0);assert.equal(s.calls.rpc,0);
});
test('all other exact mints, tickers, body overrides, query flags and wrong methods fail before configuration',async()=>{
 const s=runtime();
 for(const r of [req({mint:OTHER}),req({mint:'USDC'}),req({url:ORIGIN+'/api/mint-facts?mint='+C.mint+'&enabled=true'}),req({method:'PUT'}),
  req({headers:{'x-scout-canary-intent':'wrong'}}),req({headers:{'x-rpc-url':'https://evil.invalid'}})])assert.notEqual((await read(s,r)).res.status,200);
 assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.store,0);assert.equal(s.calls.rpc,0);
});
test('only exact runtime-provided unique production URL/project/commit and direct ingress pass',async()=>{
 for(const context of [{vercel:'0'},{insecureTls:'0'},{forceNativePg:'1'},{forceNativePg:'0'},{environment:'preview'},{projectId:'prj_OTHERPROJECT'},{deploymentUrl:'scout-stonk-intel-riskledgerapp.vercel.app'},
  {deploymentUrl:'scout-stonk-intel-git-main-riskledgerapp.vercel.app'},{deploymentUrl:'scout-stonk-intel-synthetic9-evil.vercel.app'},{commitSha:undefined}]) {
  const s=runtime({context});assert.equal((await read(s)).res.status,403);assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.rpc,0);
 }
 for(const headers of [{origin:'https://evil.invalid'},{'sec-fetch-site':'cross-site'},{'x-forwarded-for':'198.51.100.2'},{'x-forwarded-host':'evil.invalid'}]) {
  const s=runtime();assert.notEqual((await read(s,req({headers}))).res.status,200);assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.rpc,0);
 }
});
test('nonempty and stalled POST streams cannot initialize pg or read a credential',async()=>{
 for(const body of ['x',new ReadableStream({pull:()=>new Promise(()=>{})})]) {
  const s=runtime();assert.notEqual((await read(s,req({body,headers:{'content-length':'0'}}))).res.status,200);
  assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.store,0);assert.equal(s.calls.rpc,0);
 }
});
test('absolute expired/not-yet-open windows cannot be renewed by env/query/redeployment',async()=>{
 for(const window of [{notBeforeMs:1,expiresAtMs:2},{notBeforeMs:Date.now()+60000,expiresAtMs:Date.now()+120000}]) {
  const s=runtime({window});assert.equal((await read(s)).body.reason,'disabled');assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.rpc,0);
 }
});
test('four independent native TLS pools and HTTP isolates authorize at most ONE Helius call',async()=>{
 const replicas=Array.from({length:4},()=>runtime());const outcomes=await Promise.all(replicas.map(s=>read(s)));
 assert.equal(replicas.reduce((n,s)=>n+s.calls.rpc,0),1);assert.ok(outcomes.some(x=>x.res.status===200));
 assert.equal((await policy()).seq,'1');assert.equal((await policy()).rpc_day,1);
});
test('cache hits keep original response clocks/hash and never issue a second request',async()=>{
 const first=runtime(),a=await read(first),second=runtime(),b=await read(second);
 assert.equal(b.res.status,200);assert.equal(second.calls.rpc,0);assert.equal(b.res.headers.get('x-scout-delivery'),'cache');
 for(const k of ['requestStartedAt','responseReceivedAt','checkedAt','contextSlot','responseSha256'])assert.equal(b.body.source[k],a.body.source[k]);
});
test('one lifetime RPC ceiling survives cache expiry, UTC counter rollover and process/database restart',async()=>{
 const first=runtime();assert.equal((await read(first)).res.status,200);await db.crashRestart();
 await db.owner.query('DELETE FROM scout_mint.cache');
 // TEST OWNER ONLY: model elapsed/rolled windows; production login has no table rights.
 await db.owner.query(`UPDATE scout_mint.policy SET minute=${sqlNow}/60000-1,day=${sqlNow}/86400000-1,last_rpc=${sqlNow}-11000`);
 const s=runtime(),a=await read(s);assert.equal(a.body.reason,'admission_limited');assert.equal(s.calls.rpc,0);
 const p=await policy();assert.equal(p.seq,'2');assert.equal(p.rpc_day,1);assert.equal(p.circuit,'admission_limited');
 const next=runtime();assert.equal((await read(next)).body.reason,'circuit_open');assert.equal(next.calls.rpc,0);
});
test('an existing charged policy sequence is never reset to make the canary pass',async()=>{
 await db.owner.query('UPDATE scout_mint.policy SET seq=27');const s=runtime();
 assert.equal((await read(s)).body.reason,'admission_limited');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'28');
});
test('changed deployed SQL body/config fails compatibility before step or counter mutation',async()=>{
 const original=(await db.owner.query("SELECT pg_get_functiondef('scout_mint.step(jsonb)'::regprocedure) AS sql")).rows[0].sql;
 try {
  await db.owner.query(original.replace('DECLARE','-- SYNTHETIC DRIFT\nDECLARE'));
  const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'0');
 }finally{await db.owner.query(original);}
});
test('elevated role/PUBLIC grants are rejected by effective privilege proof',async()=>{
 await db.owner.query('GRANT SELECT ON scout_mint.policy TO PUBLIC');
 try {const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'0');}
 finally{await db.owner.query('REVOKE SELECT ON scout_mint.policy FROM PUBLIC');}
});
test('missing policy/schema/function cannot bootstrap or reach Helius',async()=>{
 await db.owner.query('TRUNCATE scout_mint.policy CASCADE');const s=runtime();
 assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);
 assert.equal((await db.owner.query('SELECT count(*) FROM scout_mint.policy')).rows[0].count,'0');
});
for(const [status,reason] of [[401,'access_denied'],[429,'rate_limited'],[503,'upstream_unavailable']])test(`synthetic Helius ${status} charges once, redacts and stops every replica`,async()=>{
 const s=runtime({rpc:()=>new Response('SYNTHETIC '+SYNTHETIC_KEY,{status})}),a=await read(s);
 assert.equal(a.body.reason,reason);assert.equal(a.body.facts,null);assert.equal(s.calls.rpc,1);assert.ok(!JSON.stringify(a.body).includes(SYNTHETIC_KEY));
 const next=runtime();assert.equal((await read(next)).body.reason,'circuit_open');assert.equal(next.calls.rpc,0);
});
test('canary rejects Token-2022, non-six decimals, invalid mint facts and reflected scoped key',async()=>{
 for(const edit of [e=>{e.result.value.owner='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';e.result.value.data.program='spl-token-2022';},
  e=>{e.result.value.data.parsed.info.decimals=9;},e=>{e.result.value.data.parsed.type='account';},
  e=>{e.result.context.apiVersion=SYNTHETIC_KEY;}]) {
  await db.reset();const s=runtime({rpc:(e)=>{edit(e);return response(e);}}),a=await read(s);
  assert.equal(a.body.facts,null);assert.equal(a.body.source,null);assert.equal(s.calls.rpc,1);assert.ok(!JSON.stringify(a.body).includes(SYNTHETIC_KEY));
 }
});
test('lost SQL admission acknowledgement consumes durable reservation but authorizes no RPC',async()=>{
 const native=nativeStore(),s=runtime({store:{async transact(c){await native.transact(c);throw Error('SYNTHETIC_LOST_ACK');}}});
 assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'1');
 const next=runtime();assert.notEqual((await read(next)).res.status,200);assert.equal(next.calls.rpc,0);
});
test('lost completion acknowledgement withholds facts and cannot cause another source request',async()=>{
 const native=nativeStore(),s=runtime({store:{async transact(c){const r=await native.transact(c);if(c.kind==='complete')throw Error('SYNTHETIC_LOST_ACK');return r;}}});
 const a=await read(s);assert.equal(a.body.facts,null);assert.equal(s.calls.rpc,1);
 const next=runtime();assert.equal((await read(next)).body.reason,'circuit_open');assert.equal(next.calls.rpc,0);
});
test('real local outage/TLS/auth failures cannot use memory or another RPC provider',async()=>{
 for(const poolOptions of [{ssl:{rejectUnauthorized:true,servername:HOST}},{ssl:{rejectUnauthorized:true,servername:'wrong.invalid',ca}},{password:'SYNTHETIC_WRONG_PASSWORD'}]) {
  const s=runtime({poolOptions});assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);
 }
 await db.outage();try{const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);}finally{await db.restore();}
});

test('wrong restricted login/database or any missing credential denies before opening a pool',async()=>{
 const name='SCOUT_MINT_STORE_DATABASE_URL';
 for(const secrets of [{[name]:`postgresql://scout_other:${PASSWORD}@${HOST}/neondb`},
  {[name]:`postgresql://scout_mint_app:${PASSWORD}@${HOST}/postgres`},
  {[name]:undefined},{SCOUT_MINT_HELIUS_API_KEY:undefined},{SCOUT_MINT_ADMISSION_HMAC_KEY:undefined}]) {
  const s=runtime({secrets});assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.store,0);assert.equal(s.calls.rpc,0);
 }
});
test('deployed function settings and absent function block before admission',async()=>{
 const original=(await db.owner.query("SELECT pg_get_functiondef('scout_mint.step(jsonb)'::regprocedure) AS sql")).rows[0].sql;
 try {
  await db.owner.query('ALTER FUNCTION scout_mint.step(jsonb) SET search_path=public');
  const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'0');
 }finally{await db.owner.query(original);}
 await db.owner.query('ALTER FUNCTION scout_mint.step(jsonb) RENAME TO unavailable_step');
 try {const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'0');}
 finally{await db.owner.query('ALTER FUNCTION scout_mint.unavailable_step(jsonb) RENAME TO step');}
});
test('expiry during admission permits cleanup but cannot start a late Helius request',async()=>{
 const now=Date.now(),window={notBeforeMs:now-1000,expiresAtMs:now+500};let wall=now;
 const native=nativeStore(),s=runtime({window,clock:{now:()=>wall,monotonic:()=>wall-now},store:{async transact(c){const r=await native.transact(c);wall=Math.max(r.now,window.expiresAtMs);return r;}}});
 const a=await read(s);assert.equal(a.body.facts,null);assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'1');assert.equal(a.body.reason,'disabled');assert.equal((await policy()).circuit,'disabled');
});
test('real five-second provider deadline consumes one lease and stops replicas with no retry',async()=>{
 let signal;const s=runtime({rpc:(_e,init)=>{signal=init.signal;return new Promise(()=>{});}}),start=performance.now();
 const a=await read(s);assert.equal(a.body.reason,'timeout');assert.equal(a.res.status,504);assert.ok(performance.now()-start<6500);assert.equal(signal.aborted,true);
 assert.equal(s.calls.rpc,1);assert.equal((await policy()).seq,'1');const next=runtime();assert.equal((await read(next)).body.reason,'circuit_open');assert.equal(next.calls.rpc,0);
});
test('zero integer supply and absent authorities remain explicit source values, never unknown defaults',async()=>{
 const s=runtime({rpc:e=>{const i=e.result.value.data.parsed.info;i.supply='0';i.mintAuthority=null;i.freezeAuthority=null;return response(e);}}),a=await read(s);
 assert.equal(a.res.status,200);assert.equal(a.body.facts.supply.raw,'0');assert.equal(a.body.facts.supply.decimalAmount,'0.000000');
 assert.deepEqual(a.body.facts.mintAuthority,{state:'absent',address:null});assert.deepEqual(a.body.facts.freezeAuthority,{state:'absent',address:null});
});
