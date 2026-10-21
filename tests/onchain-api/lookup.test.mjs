// REAL disposable local PostgreSQL/SCRAM + verified loopback TLS-terminating proxy.
// ALL source packets, credentials and hosting context are SYNTHETIC OFFLINE fixtures.
// No Neon/Helius DNS, hosted SQL, credential reads, deployed routes or live observations.
import {test,before,beforeEach,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createServer,connect} from 'node:net';
import {TLSSocket,createSecureContext} from 'node:tls';
import {mkdtempSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {localPostgres} from './postgres-harness.mjs';
import {root,MINT,OTHER,THIRD,FOURTH,envelope,token2022,response,SYNTHETIC_KEY,SYNTHETIC_HMAC} from './fixtures.mjs';
const require=createRequire(import.meta.url),{Pool}=require('pg');
const {lookupRuntime}=require(root+'/lib/onchain-mint/server/lookup.js');
const {LOOKUP_APPROVAL:A,LOOKUP_PROFILE:P,LOOKUP_PROOF:PROOF}=require(root+'/lib/onchain-mint/server/lookup-policy.js');
const {prepareDatabase,databaseParameters}=require(root+'/lib/onchain-mint/server/production-config.js');
const {postgresStore}=require(root+'/lib/onchain-mint/server/postgres-store.js');
const {LOOKUP_STEP_BODY_SHA256:HASH,LOOKUP_COMPATIBILITY_SQL:COMPAT}=require(root+'/lib/onchain-mint/server/postgres-compatibility.js');
const HOST=A.storeHost,PASSWORD='SYNTHETIC_LOCAL_TEST_PASSWORD_111';
const DEPLOYMENT='scout-stonk-intel-synthetic135-riskledgerapp.vercel.app',DEPLOYMENT_ORIGIN='https://'+DEPLOYMENT;
const ORIGIN='https://scout.storkcoin.xyz',COMMIT='c'.repeat(40),SQLNOW='floor(extract(epoch FROM clock_timestamp())*1000)::bigint';
const CONTEXT={vercel:'1',environment:'production',projectId:A.vercelProjectId,deploymentUrl:DEPLOYMENT,commitSha:COMMIT};
const MIGRATION=readFileSync('lib/onchain-mint/server/postgres/lookup.sql','utf8');
let db,dir,server,port,ca,window,migrationSnapshot,oldSnapshot;let pools=[];const sockets=new Set();
async function legacySnapshot(){return (await db.owner.query(`SELECT
 (SELECT jsonb_agg(to_jsonb(p)) FROM scout_mint.policy p) AS policy,
 (SELECT jsonb_agg(to_jsonb(p)) FROM scout_mint.clients p) AS clients,
 (SELECT jsonb_agg(to_jsonb(p)) FROM scout_mint.cache p) AS cache,
 pg_get_functiondef('scout_mint.step(jsonb)'::regprocedure) AS function`)).rows[0];}
before(async()=>{
 dir=mkdtempSync(join(tmpdir(),'scout135-local-tls-'));const cert=join(dir,'cert.pem'),key=join(dir,'key.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST,'-keyout',key,'-out',cert],{stdio:'ignore',timeout:10000});
 chmodSync(key,0o600);ca=readFileSync(cert,'utf8');
 const secureContext=createSecureContext({cert:ca,key:readFileSync(key),minVersion:'TLSv1.2'});
 db=await localPostgres({database:'neondb',runtimeRole:'scout_mint_app'});
 await db.owner.query("UPDATE scout_mint.policy SET seq=27,circuit='upstream_unavailable',highest_slot=400000000");
 const before=await legacySnapshot();await db.owner.query(MIGRATION);migrationSnapshot={before,after:await legacySnapshot()};
 const backendPath=join(db.owner.options.host,'.s.PGSQL.'+db.owner.options.port);
 const track=s=>{sockets.add(s);s.on('error',()=>{});s.once('close',()=>sockets.delete(s));return s;};
 server=createServer(raw=>{
  track(raw);let first=Buffer.alloc(0);
  const startup=part=>{
   first=Buffer.concat([first,part]);if(first.length<8)return;raw.removeListener('data',startup);
   if(first.length!==8 || first.readUInt32BE(0)!==8 || first.readUInt32BE(4)!==80877103){raw.destroy();return;}
   raw.write('S');const front=track(new TLSSocket(raw,{isServer:true,secureContext})),back=track(connect({path:backendPath}));
   front.pipe(back);back.pipe(front);front.on('error',()=>back.destroy());back.on('error',()=>front.destroy());
   front.once('close',()=>back.destroy());back.once('close',()=>front.destroy());
  };raw.on('data',startup);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});port=server.address().port;
});
beforeEach(async()=>{
 await Promise.all(pools.map(p=>p.end()));pools=[];
 await db.reset(); // Disposable LOCAL fixtures only. Never a production/canary reset.
 await db.owner.query("UPDATE scout_mint.policy SET seq=27,circuit='upstream_unavailable',highest_slot=400000000");
 oldSnapshot=await legacySnapshot();
 await db.owner.query("TRUNCATE scout_lookup.policy CASCADE; INSERT INTO scout_lookup.policy(id) VALUES('scout-helius-mint/lookup-v1')");
 const now=Date.now();window={notBeforeMs:now-60000,expiresAtMs:now+3600000};
 await db.owner.query("UPDATE scout_lookup.policy SET mode='proof',not_before=$1,expires_at=$2",[window.notBeforeMs,window.expiresAtMs]);
});
afterEach(async()=>{assert.deepEqual(await legacySnapshot(),oldSnapshot,'new lookup never mutates old canary state/function');});
after(async()=>{
 await Promise.all(pools.map(p=>p.end()));for(const s of sockets)s.destroy();
 if(server)await new Promise(resolve=>server.close(resolve));await db?.close();if(dir)rmSync(dir,{recursive:true,force:true});
});
const policy=async()=>(await db.owner.query('SELECT * FROM scout_lookup.policy')).rows[0];
async function seedPublic(){
 // Explicit SYNTHETIC fixture of a previously approved proof, NOT real live evidence.
 await db.owner.query(`UPDATE scout_lookup.policy SET mode='public',seq=1,proof_completed=true,proof_hash=repeat('a',64),proof_slot=400000000,proof_checked_at=$1`,[window.notBeforeMs+1]);
}
const seed=sql=>db.owner.query(`WITH t AS MATERIALIZED (SELECT ${SQLNOW} AS n) UPDATE scout_lookup.policy SET ${sql.replaceAll(SQLNOW,'t.n')} FROM t`);
const authorization=purpose=>({purpose,...window});
const command=(n=1,mint=MINT,purpose='public')=>({kind:'admit',policy:P.policy,mint,client:n.toString(16).padStart(64,'0'),authorization:authorization(purpose)});
const complete=(lease,extra={})=>({kind:'complete',policy:P.policy,lease,slot:'400000001',cache:null,...extra});
function native(options={}){
 const handle=prepareDatabase(`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb`,HOST,{role:'scout_mint_app',database:'neondb'});assert.ok(handle);
 const p=databaseParameters(handle),pool=new Pool({...p,host:'127.0.0.1',port,ssl:{...p.ssl,ca},...options});pool.on('error',()=>{});pools.push(pool);
 return {pool,store:postgresStore(pool,{host:HOST},'lookup')};
}
function req({mint=MINT,phase='public',url,headers={},method,body,signal}={}){
 const origin=phase==='proof'?DEPLOYMENT_ORIGIN:ORIGIN;
 return new Request(url??origin+'/api/mint-facts?mint='+mint,{method:method??(phase==='proof'?'POST':'GET'),headers:{
  origin,'sec-fetch-site':'same-origin','sec-fetch-dest':'empty',
  'x-forwarded-for':'203.0.113.8','x-vercel-forwarded-for':'203.0.113.8','x-forwarded-host':new URL(origin).host,'x-forwarded-proto':'https',
  ...(phase==='proof'?{'x-scout-lookup-intent':PROOF.intent,'x-scout-lookup-commit':COMMIT}:{}),...headers,
 },...(body===undefined?{}:{body,duplex:'half'}),signal});
}
function runtime(options={}){
 const calls={secrets:[],hosting:0,store:0,rpc:0,requests:[],raw:[]};
 const handler=lookupRuntime(options.approval??{...A,phase:options.phase??'public',...window},{
  hosting:()=>{calls.hosting++;return {...CONTEXT,...options.context}},
  readSecret:name=>{calls.secrets.push(name);return {SCOUT_MINT_HELIUS_API_KEY:SYNTHETIC_KEY,SCOUT_MINT_ADMISSION_HMAC_KEY:SYNTHETIC_HMAC,
   SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb`,...options.secrets}[name]},
  store:async()=>{calls.store++;return options.store??native(options.poolOptions).store},
  transport:async(url,init)=>{calls.rpc++;calls.requests.push({url,init});
   const e=envelope();e.id=JSON.parse(init.body).id;
   if(JSON.parse(init.body).params[0]===PROOF.mint)e.result.value.data.parsed.info.decimals=6;
   if(options.rpc)return options.rpc(e,init);
   calls.raw.push(JSON.stringify(e));return response(e);
  },clock:options.clock??{now:()=>Date.now(),monotonic:()=>performance.now()},
 });return{handler,calls};
}
const read=async(s,r=req())=>{const res=await s.handler(r);return{res,body:await res.json()}};
const assertNoIO=s=>{assert.equal(s.calls.secrets.length,0);assert.equal(s.calls.store,0);assert.equal(s.calls.rpc,0)};

test('additive migration preserves charged old policy and byte-identical old function; fingerprint is exact',async()=>{
 assert.deepEqual(migrationSnapshot.after,migrationSnapshot.before);assert.equal(migrationSnapshot.before.policy[0].seq,27);
 assert.equal(createHash('sha256').update(MIGRATION.split('$function$')[1]).digest('hex'),HASH);
 assert.ok(!/CREATE ROLE|ALTER |DROP |scout_mint\./.test(MIGRATION));
 await assert.rejects(db.owner.query(MIGRATION),e=>e.code==='42P06');await db.owner.query('ROLLBACK');
 assert.equal((await policy()).seq,'0');
});
test('source-disabled route, poisoned environment and ALL methods cannot inspect config or load pg',()=>{
 assert.equal(A.phase,'disabled');assert.equal(A.notBeforeMs,null);assert.equal(A.expiresAtMs,null);assert.ok(Object.isFrozen(A));
 const code=`const assert=require('node:assert/strict');process.env=new Proxy({NODE_ENV:'production'},{get(t,k){if(/SCOUT|HELIUS|PG|VERCEL|RPC|KEY|SECRET/.test(String(k)))throw Error('forbidden configuration read');return t[k]}});globalThis.fetch=()=>{throw Error('forbidden network')};const r=require(${JSON.stringify(root+'/app/api/mint-facts/route.js')});(async()=>{for(const method of ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']){const a=await r[method](new Request(${JSON.stringify(ORIGIN+'/api/mint-facts?mint='+MINT)},{method}));assert.notEqual(a.status,200)}assert.ok(!Object.keys(require.cache).some(x=>/node_modules\\/pg\\//.test(x)))})().catch(()=>process.exitCode=1);`;
 const p=spawnSync(process.execPath,['--conditions=react-server','-e',code],{encoding:'utf8',env:{NODE_ENV:'production',NODE_PATH:process.env.NODE_PATH},timeout:10000});assert.equal(p.status,0,p.stderr);
});
test('inert DB bootstrap and missing/window/phase approvals never authorize source traffic',async()=>{
 await db.owner.query("UPDATE scout_lookup.policy SET mode='disabled',not_before=NULL,expires_at=NULL");
 const off=runtime(),a=await read(off);assert.equal(a.body.reason,'disabled');assert.equal(off.calls.rpc,0);assert.equal((await policy()).seq,'0');
 for(const w of [{notBeforeMs:null,expiresAtMs:null},{notBeforeMs:1,expiresAtMs:2},{notBeforeMs:Date.now()+100000,expiresAtMs:Date.now()+200000},
  {notBeforeMs:1,expiresAtMs:86400002},{notBeforeMs:-1,expiresAtMs:1}]){
  const s=runtime({approval:{...A,phase:'public',...w}});assert.equal((await read(s)).body.reason,'disabled');assertNoIO(s);
 }
});
test('public GET cannot borrow proof authorization and owner cannot promote before proof',async()=>{
 const s=runtime(),a=await read(s);assert.equal(a.body.reason,'disabled');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'0');
 await assert.rejects(db.owner.query("UPDATE scout_lookup.policy SET mode='public'"),e=>e.code==='23514');
 const wrong=native().store;assert.equal((await wrong.transact({...command(1,PROOF.mint,'proof'),authorization:{...authorization('proof'),expiresAtMs:window.expiresAtMs+1}})).reason,'disabled');
});
test('genuine local TLS/SCRAM protocol and backend-proxy compatibility, not hosted/PLUS proof',async()=>{
 const {pool}=native(),client=await pool.connect();
 try{
  const tls=client.connection.stream;assert.equal(tls.authorized,true);assert.equal(tls.servername,HOST);assert.ok(['TLSv1.2','TLSv1.3'].includes(tls.getProtocol()));
  assert.equal((await client.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0].ssl,false);
  await client.query('BEGIN; SET LOCAL synchronous_commit=on; SET LOCAL search_path=pg_catalog');
  assert.deepEqual((await client.query(COMPAT,[HASH])).rows,[{compatible:true}]);
 }finally{await client.query('ROLLBACK');client.release()}
});
test('new one-shot proof → explicit owner public approval → arbitrary-mint GET preserves counters',async()=>{
 const proof=runtime({phase:'proof'}),a=await read(proof,req({phase:'proof',mint:PROOF.mint}));assert.equal(a.res.status,200);assert.equal(proof.calls.rpc,1);
 let p=await policy();assert.equal(p.seq,'1');assert.equal(p.proof_completed,true);assert.equal(p.proof_hash,a.body.source.responseSha256);assert.equal(p.proof_slot,a.body.source.contextSlot);
 const publicBefore=runtime();assert.equal((await read(publicBefore)).body.reason,'disabled');assert.equal(publicBefore.calls.rpc,0);
 await db.owner.query("UPDATE scout_lookup.policy SET mode='public'");await seed(`last_rpc=${SQLNOW}-10001`); // Test owner models elapsed spacing.
 const s=runtime(),b=await read(s);assert.equal(b.res.status,200);assert.equal(b.body.mint,MINT);assert.equal(b.body.facts.supply.raw,'18446744073709551615');
 assert.equal(b.body.facts.mintAuthority.state,'present');assert.deepEqual(b.body.facts.freezeAuthority,{state:'absent',address:null});
 assert.equal(b.body.facts.program,'spl_token');assert.equal(b.body.source.slotTime,null);assert.equal(b.body.source.acquisition,'production_rpc');
 assert.equal(b.body.source.responseSha256,createHash('sha256').update(s.calls.raw[0]).digest('hex'));
 assert.equal(b.res.headers.get('x-scout-policy'),P.policy);assert.equal(b.res.headers.get('x-scout-commit'),COMMIT);
 assert.deepEqual(JSON.parse(s.calls.requests[0].init.body),{jsonrpc:'2.0',id:2,method:'getAccountInfo',params:[MINT,{encoding:'jsonParsed',commitment:'finalized'}]});
 p=await policy();assert.equal(p.seq,'2');assert.equal(p.rpc_day,2);assert.equal(p.proof_hash,a.body.source.responseSha256);
});
test('six independent native TLS pools/proof isolates reserve at most ONE real-protocol source stub',async()=>{
 const replicas=Array.from({length:6},()=>runtime({phase:'proof'}));const out=await Promise.all(replicas.map(s=>read(s,req({phase:'proof',mint:PROOF.mint}))));
 assert.equal(replicas.reduce((n,s)=>n+s.calls.rpc,0),1);assert.ok(out.some(x=>x.res.status===200));assert.equal((await policy()).seq,'1');
});
test('proof budget survives cache expiry, UTC rollover, crash restart; no second lease charged',async()=>{
 const s=runtime({phase:'proof'});assert.equal((await read(s,req({phase:'proof',mint:PROOF.mint}))).res.status,200);
 await Promise.all(pools.map(p=>p.end()));pools=[];await db.crashRestart();await db.owner.query('DELETE FROM scout_lookup.cache');
 await seed(`minute=${SQLNOW}/60000-1,day=${SQLNOW}/86400000-1,last_rpc=${SQLNOW}-10001`);
 const next=runtime({phase:'proof'}),a=await read(next,req({phase:'proof',mint:PROOF.mint}));assert.equal(a.res.status,429);assert.equal(next.calls.rpc,0);assert.equal((await policy()).seq,'1');
});
test('public multi-isolate race shares one lease; cache preserves original source clocks/hash',async()=>{
 await seedPublic();const replicas=Array.from({length:6},()=>runtime());const out=await Promise.all(replicas.map(s=>read(s)));
 assert.equal(replicas.reduce((n,s)=>n+s.calls.rpc,0),1);assert.ok(out.some(x=>x.res.status===200));assert.equal((await policy()).seq,'2');
 const first=out.find(x=>x.res.status===200),next=runtime(),b=await read(next,req({headers:{'x-forwarded-for':'203.0.113.9','x-vercel-forwarded-for':'203.0.113.9'}}));
 assert.equal(b.res.status,200);assert.equal(next.calls.rpc,0);assert.equal(b.res.headers.get('x-scout-delivery'),'cache');
 for(const k of ['checkedAt','requestStartedAt','responseReceivedAt','contextSlot','responseSha256'])assert.equal(b.body.source[k],first.body.source[k]);
});
for(const mint of [MINT,THIRD,FOURTH])test(`exact arbitrary mint accepted without symbol or candidate enrollment: ${mint}`,async()=>{
 await seedPublic();const s=runtime(),a=await read(s,req({mint}));assert.equal(a.res.status,200);assert.equal(a.body.mint,mint);assert.equal(a.body.facts.mint,mint);assert.equal(s.calls.rpc,1);
});
test('zero supply and absent authorities remain genuine values, not unknown defaults',async()=>{
 await seedPublic();const s=runtime({rpc:e=>{const i=e.result.value.data.parsed.info;i.supply='0';i.mintAuthority=null;i.freezeAuthority=null;return response(e)}}),a=await read(s);
 assert.equal(a.res.status,200);assert.equal(a.body.facts.supply.raw,'0');assert.equal(a.body.facts.supply.decimalAmount,'0.000000000');
 assert.equal(a.body.facts.interpretation.minting,'authority_absent');assert.equal(a.body.facts.interpretation.freezing,'authority_absent');
});
for(const [label,edit,reason] of [['null account',e=>{e.result.value=null},'not_found'],['wrong program',e=>{e.result.value.owner=THIRD},'wrong_owner'],['token account',e=>{e.result.value.data.parsed.type='account'},'not_mint']])test(`${label} is a supported negative and does not poison subsequent exact-mint lookups`,async()=>{
 await seedPublic();const s=runtime({rpc:e=>{edit(e);return response(e)}}),a=await read(s);assert.equal(a.res.status,404);assert.equal(a.body.reason,reason);assert.equal(a.body.facts,null);
 assert.equal((await policy()).circuit,null);assert.equal((await policy()).lease_id,null);await seed(`last_rpc=${SQLNOW}-10001`);
 const next=runtime();assert.equal((await read(next,req({mint:FOURTH}))).res.status,200);assert.equal(next.calls.rpc,1);
});
test('Token-2022 unreviewed TLV returns truthful uncertainty and exact base supply',async()=>{
 await seedPublic();const s=runtime({rpc:(_e,init)=>{const e=token2022();e.id=JSON.parse(init.body).id;e.result.value.data.space=500;e.result.value.data.parsed.info.extensions=[{extension:'transferHook'}];return response(e)}}),a=await read(s);
 assert.equal(a.res.status,200);assert.equal(a.body.status,'unsupported_extensions');assert.equal(a.body.facts.program,'token_2022');assert.equal(a.body.facts.supply.raw,'18446744073709551615');
 assert.equal(a.body.facts.interpretation.minting,'extension_review_required');assert.equal(a.body.facts.interpretation.freezing,'extension_review_required');
});
test('invalid mint, quote overrides, duplicate ticker, SSRF, methods and prefetch reject before config',async()=>{
 const s=runtime();for(const r of [req({mint:'USDC'}),req({mint:'0'.repeat(44)}),req({url:ORIGIN+'/api/mint-facts?mint='+MINT+'&quoteMint='+OTHER}),
  req({url:ORIGIN+'/api/mint-facts?mint='+MINT+'&mint='+OTHER}),req({url:ORIGIN+'/api/mint-facts?mint='+MINT+'&rpc=https://evil.invalid'}),
  req({headers:{'x-api-key':'SYNTHETIC_USER_KEY'}}),req({method:'POST'}),req({headers:{purpose:'prefetch'}}),req({headers:{'sec-purpose':'prefetch;prerender'}}),
  req({headers:{'sec-fetch-dest':'document'}}),req({headers:{'sec-fetch-site':'cross-site'}})])assert.notEqual((await read(s,r)).res.status,200);
 assertNoIO(s);
});
test('proof method/intent/commit, body and exact mint cannot be substituted',async()=>{
 const s=runtime({phase:'proof'});for(const r of [req({phase:'proof',mint:MINT}),req({phase:'proof',mint:PROOF.mint,method:'GET'}),
  req({phase:'proof',mint:PROOF.mint,headers:{'x-scout-lookup-commit':'b'.repeat(40)}}),req({phase:'proof',mint:PROOF.mint,headers:{'x-scout-lookup-intent':'usdc-read-once-v1'}}),
  req({phase:'proof',mint:PROOF.mint,body:'x',headers:{'content-length':'0'}}),
  req({phase:'proof',mint:PROOF.mint,body:new ReadableStream({pull:()=>new Promise(()=>{})}),headers:{'content-length':'0'}})])assert.notEqual((await read(s,r)).res.status,200);
 assertNoIO(s);
});
test('runtime/project/ingress and native TLS overrides fail before credentials',async()=>{
 for(const context of [{projectId:'prj_NOTSCOUT'},{environment:'preview'},{vercel:'0'},{insecureTls:'0'},{forceNativePg:'1'},{commitSha:undefined},{deploymentUrl:'scout-stonk-intel-riskledgerapp.vercel.app'}]){
  const s=runtime({context});assert.equal((await read(s)).res.status,403);assertNoIO(s);
 }
 for(const headers of [{'x-forwarded-for':'198.51.100.1'},{'x-vercel-forwarded-for':'203.0.113.8, 198.51.100.1'},{'x-forwarded-host':'evil.invalid'},{'x-forwarded-proto':'http'}]){
  const s=runtime();assert.equal((await read(s,req({headers}))).res.status,403);assertNoIO(s);
 }
});
for(const [sql,label] of [[`minute=${SQLNOW}/60000,reads=30`,'global reads'],[`minute=${SQLNOW}/60000,rpc_min=3`,'source per minute'],
 [`day=${SQLNOW}/86400000,rpc_day=30`,'source per UTC day'],[`last_rpc=${SQLNOW}`,'ten-second spacing'],['seq=31','lifetime ceiling']])test(`shared SQL quota ${label} cannot dispatch`,async()=>{
 await seedPublic();await seed(sql);const s=runtime(),a=await read(s);assert.equal(a.res.status,429);assert.equal(a.body.reason,'admission_limited');assert.equal(s.calls.rpc,0);assert.ok(Number(a.res.headers.get('retry-after'))>=1);
});
test('per-client cache-read budget and bounded HMAC-only client retention survive isolates',async()=>{
 await seedPublic();assert.equal((await read(runtime())).res.status,200);
 for(let i=0;i<5;i++)assert.equal((await read(runtime())).res.status,200);
 const s=runtime();assert.equal((await read(s)).res.status,429);assert.equal(s.calls.rpc,0);
 const rows=(await db.owner.query('SELECT * FROM scout_lookup.clients')).rows;assert.equal(rows.length,1);assert.match(rows[0].client,/^[a-f0-9]{64}$/);assert.equal(rows[0].reads,6);
 await db.owner.query('DELETE FROM scout_lookup.clients');
 await db.owner.query(`INSERT INTO scout_lookup.clients SELECT $1,lpad(to_hex(i),64,'0'),${SQLNOW}/60000,0,${SQLNOW}+120000 FROM generate_series(1,128) AS i`,[P.policy]);
 assert.equal((await native().store.transact(command(129,FOURTH))).reason,'admission_limited');
 await db.owner.query(`UPDATE scout_lookup.clients SET expires=${SQLNOW}-1`);await seed(`last_rpc=${SQLNOW}-10001`);
 assert.equal((await native().store.transact(command(129,FOURTH))).kind,'lease');assert.equal((await db.owner.query('SELECT count(*) FROM scout_lookup.clients')).rows[0].count,'1');
});
test('expiry is checked in SQL and application; it cannot be extended by env/restart',async()=>{
 await seedPublic();await db.owner.query('UPDATE scout_lookup.policy SET expires_at=$1,proof_checked_at=$2',[Date.now()-1,window.notBeforeMs+1]);
 const s=runtime(),a=await read(s);assert.equal(a.body.reason,'disabled');assert.equal(s.calls.rpc,0);
});
test('lease expiry and stale fencing cannot reclaim an uncertain request after restart',async()=>{
 await seedPublic();const a=await native().store.transact(command());assert.equal(a.kind,'lease');
 await Promise.all(pools.map(p=>p.end()));pools=[];await db.crashRestart();
 await seed(`lease_until=${SQLNOW}-1,last_rpc=${SQLNOW}-15001`);
 const next=native().store;assert.equal((await next.transact(command(2,FOURTH))).reason,'circuit_open');assert.equal((await policy()).seq,'2');
 assert.equal((await next.transact(complete(a.lease))).reason,'circuit_open');
});
test('fenced completion is atomic: wrong lease cannot populate cache, advance slot or refund RPC',async()=>{
 await seedPublic();const s=native().store,a=await s.transact(command());assert.equal(a.kind,'lease');
 const r=await s.transact(complete({...a.lease,id:a.lease.id+1}));assert.equal(r.reason,'invalid_response');const p=await policy();assert.equal(p.seq,'2');assert.equal(p.highest_slot,'0');assert.equal(p.lease_id,null);
 assert.equal((await db.owner.query('SELECT count(*) FROM scout_lookup.cache')).rows[0].count,'0');
});
test('transaction rollback commits no admission and lost admission ACK never dispatches RPC',async()=>{
 await seedPublic();const {pool,store}=native(),client=await pool.connect();
 try{await client.query('BEGIN; SET LOCAL synchronous_commit=on');assert.equal((await client.query('SELECT scout_lookup.step($1::jsonb) AS reply',[JSON.stringify(command())])).rows[0].reply.kind,'lease');await client.query('ROLLBACK')}finally{client.release()}
 assert.equal((await policy()).seq,'1');
 const s=runtime({store:{async transact(c){await store.transact(c);throw Error('SYNTHETIC_LOST_ADMISSION_ACK')}}}),a=await read(s);assert.equal(a.body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'2');
 assert.equal((await native().store.transact(command(2,FOURTH))).reason,'admission_limited');
});
test('lost completion ACK withholds source/facts and trips persistent circuit without refund',async()=>{
 await seedPublic();const {store}=native(),s=runtime({store:{async transact(c){const r=await store.transact(c);if(c.kind==='complete')throw Error('SYNTHETIC_LOST_COMPLETION_ACK');return r}}}),a=await read(s);
 assert.equal(a.res.status,503);assert.equal(a.body.facts,null);assert.equal(a.body.source,null);assert.equal(s.calls.rpc,1);assert.equal((await policy()).seq,'2');
 const next=runtime();assert.equal((await read(next)).body.reason,'circuit_open');assert.equal(next.calls.rpc,0);
});
for(const [status,reason] of [[401,'access_denied'],[429,'rate_limited'],[503,'upstream_unavailable']])test(`source ${status} is redacted, charged once, has no fallback and stops replicas`,async()=>{
 await seedPublic();const s=runtime({rpc:()=>new Response(SYNTHETIC_KEY+' '+PASSWORD,{status})}),a=await read(s);assert.equal(a.body.reason,reason);assert.equal(a.body.source,null);assert.equal(s.calls.rpc,1);
 for(const key of [SYNTHETIC_KEY,SYNTHETIC_HMAC,PASSWORD,'api-key=','203.0.113.8'])assert.ok(!JSON.stringify(a.body).includes(key));
 const next=runtime();assert.equal((await read(next)).body.reason,'circuit_open');assert.equal(next.calls.rpc,0);assert.equal((await policy()).seq,'2');
});
for(const [edit,reason] of [[e=>{e.result.value.data.parsed.info.supply='18446744073709551616'},'invalid_response'],
 [e=>{e.result.context.slot=0},'invalid_response'],[e=>{e.result.value.data.parsed.info.freezeAuthority='USDC'},'invalid_response'],
 [e=>{e.result.context.apiVersion=SYNTHETIC_KEY},'invalid_response'],[e=>{e.id=999},'invalid_response']])test(`invalid source facts/identity/id fail closed: ${edit.toString()}`,async()=>{
 await seedPublic();const s=runtime({rpc:e=>{edit(e);return response(e)}}),a=await read(s);assert.equal(a.body.reason,reason);assert.equal(a.body.facts,null);assert.equal((await policy()).circuit,reason);
});
test('stale HTTP source clock cannot publish facts',async()=>{
 await seedPublic();const s=runtime({rpc:e=>response(e,{headers:{'content-type':'application/json',date:new Date(Date.now()-120000).toUTCString()}})}),a=await read(s);
 assert.equal(a.body.reason,'stale_source');assert.equal(a.body.source,null);
});
test('five-second source deadline aborts once; persistent failure forbids retries',async()=>{
 await seedPublic();let signal;const s=runtime({rpc:(_e,init)=>{signal=init.signal;return new Promise(()=>{})}}),start=performance.now(),a=await read(s);
 assert.equal(a.res.status,504);assert.equal(a.body.reason,'timeout');assert.ok(performance.now()-start<6500);assert.equal(signal.aborted,true);assert.equal(s.calls.rpc,1);
 const next=runtime();assert.equal((await read(next)).body.reason,'circuit_open');assert.equal(next.calls.rpc,0);
});
test('cache TTL/MAC/source clocks cannot be forged or renewed',async()=>{
 await seedPublic();assert.equal((await read(runtime())).res.status,200);const first=(await db.owner.query('SELECT entry FROM scout_lookup.cache')).rows[0].entry;
 assert.equal(first.expiresAt,first.checkedAt+30000);await db.owner.query("UPDATE scout_lookup.cache SET entry=jsonb_set(entry,'{mac}',to_jsonb(repeat('0',64)))");
 const s=runtime(),a=await read(s);assert.equal(a.body.reason,'invalid_response');assert.equal(s.calls.rpc,0);assert.equal((await policy()).circuit,'invalid_response');
});
test('least privilege, exact fingerprint/settings and missing policy/function all fail before source',async()=>{
 await seedPublic();const original=(await db.owner.query("SELECT pg_get_functiondef('scout_lookup.step(jsonb)'::regprocedure) AS sql")).rows[0].sql;
 for(const sql of [original.replace('DECLARE','-- SYNTHETIC DRIFT\nDECLARE'),'ALTER FUNCTION scout_lookup.step(jsonb) SET search_path=public','GRANT SELECT ON scout_lookup.policy TO PUBLIC']){
  try{await db.owner.query(sql);const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'1')}
  finally{await db.owner.query(original);await db.owner.query('REVOKE SELECT ON scout_lookup.policy FROM PUBLIC')}
 }
 const role=db.pool();for(const sql of ["UPDATE scout_lookup.policy SET seq=0","TRUNCATE scout_lookup.policy CASCADE","SELECT * FROM scout_lookup.policy","CREATE TABLE scout_lookup.injected(x int)"])
  await assert.rejects(role.query(sql),e=>e.code==='42501');
 await db.owner.query('DELETE FROM scout_lookup.policy');const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);
 await db.owner.query('ALTER FUNCTION scout_lookup.step(jsonb) RENAME TO missing_step');
 try{const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0)}finally{await db.owner.query('ALTER FUNCTION scout_lookup.missing_step(jsonb) RENAME TO step')}
});
test('CA, SNI, plaintext, SCRAM password and real outage cannot fall back or dispatch',async()=>{
 await seedPublic();for(const poolOptions of [{ssl:{rejectUnauthorized:true,servername:HOST}},{ssl:{rejectUnauthorized:true,servername:'wrong.synthetic.invalid',ca}},
  {ssl:false},{password:'SYNTHETIC_WRONG_PASSWORD'}]){
  const s=runtime({poolOptions});assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'1');
 }
 await Promise.all(pools.map(p=>p.end()));pools=[];await db.outage();try{const s=runtime();assert.equal((await read(s)).body.reason,'upstream_unavailable');assert.equal(s.calls.rpc,0)}finally{await db.restore()}
});
test('native DSN and missing secrets fail before SQL; no channel-binding-required downgrade',async()=>{
 for(const secrets of [{SCOUT_MINT_HELIUS_API_KEY:undefined},{SCOUT_MINT_ADMISSION_HMAC_KEY:undefined},{SCOUT_MINT_STORE_DATABASE_URL:undefined},
  {SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_mint_app:${PASSWORD}@${HOST}/neondb?sslmode=require&channel_binding=require&channel_binding=disable`},
  {SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_other:${PASSWORD}@${HOST}/neondb`},
  {SCOUT_MINT_STORE_DATABASE_URL:`postgresql://scout_mint_app:${PASSWORD}@${HOST}/postgres`}]){
  const s=runtime({secrets}),a=await read(s);assert.equal(a.body.reason,'upstream_unavailable');assert.equal(s.calls.store,0);assert.equal(s.calls.rpc,0);
 }
 const s=native().store;await assert.rejects(s.transact({...command(),policy:'scout-helius-mint/production-v1'}));assert.equal((await policy()).seq,'0');
});

test('proof evidence columns cannot use SQL NULL semantics to permit public activation',async()=>{
 for(const sql of ["mode='public',proof_completed=true",`mode='public',seq=1,proof_completed=true,proof_hash=repeat('a',64)`,
  `mode='public',seq=1,proof_completed=true,proof_hash=repeat('a',64),proof_slot=1`])
  await assert.rejects(db.owner.query('UPDATE scout_lookup.policy SET '+sql),e=>e.code==='23514');
 assert.equal((await policy()).seq,'0');assert.equal((await policy()).proof_completed,false);
});
test('slot regression fails fenced completion and never replaces cache or exposes stale facts',async()=>{
 await seedPublic();await seed('highest_slot=400000002');const s=runtime(),a=await read(s);
 assert.equal(a.body.reason,'stale_source');assert.equal(a.body.facts,null);assert.equal(a.body.source,null);assert.equal(s.calls.rpc,1);assert.equal((await policy()).seq,'2');
 assert.equal((await policy()).highest_slot,'400000002');assert.equal((await db.owner.query('SELECT count(*) FROM scout_lookup.cache')).rows[0].count,'0');
});
test('future HTTP clock is never successful evidence',async()=>{
 await seedPublic();const s=runtime({rpc:e=>response(e,{headers:{'content-type':'application/json',date:new Date(Date.now()+120000).toUTCString()}})});
 assert.equal((await read(s)).body.reason,'stale_source');assert.equal(s.calls.rpc,1);
});
test('session expiry during admission cannot authorize even the first source call',async()=>{
 await seedPublic();window.expiresAtMs=Date.now()+500;
 await db.owner.query('UPDATE scout_lookup.policy SET expires_at=$1',[window.expiresAtMs]);
 const {store}=native();let wall=Date.now();const base=wall;
 const s=runtime({clock:{now:()=>wall,monotonic:()=>wall-base},store:{async transact(c){const r=await store.transact(c);wall=Math.max(r.now,window.expiresAtMs);return r}}}),a=await read(s);
 assert.equal(a.body.reason,'disabled');assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'2');assert.equal((await policy()).circuit,'disabled');
});
test('expired session cannot commit a reserved observation or mark proof complete',async()=>{
 const store=native().store,a=await store.transact(command(1,PROOF.mint,'proof'));assert.equal(a.kind,'lease');
 await db.owner.query('UPDATE scout_lookup.policy SET expires_at=$1',[Date.now()-1]);
 assert.equal((await store.transact(complete(a.lease))).reason,'disabled');assert.equal((await policy()).proof_completed,false);assert.equal((await policy()).circuit,'disabled');
});
test('cache is bounded to eight entries and retains original clocks until expiry',async()=>{
 await seedPublic();const store=native().store;
 for(let n=1;n<=9;n++){
  const mint='1'.repeat(31)+String(n),a=await store.transact(command(n,mint));assert.equal(a.kind,'lease');
  const cache={mint,json:JSON.stringify({label:'SYNTHETIC_STRUCTURAL_CACHE_ONLY'}),mac:'a'.repeat(64),checkedAt:a.now,expiresAt:a.now+30000,slot:'400000001'};
  assert.equal((await store.transact(complete(a.lease,{cache}))).kind,'committed');await seed(`last_rpc=${SQLNOW}-10001,rpc_min=0`);
 }
 const rows=(await db.owner.query('SELECT * FROM scout_lookup.cache')).rows;assert.equal(rows.length,8);assert.ok(!rows.some(r=>r.mint==='1'.repeat(32)));
 for(const r of rows)assert.equal(r.expires,String(r.entry.checkedAt+30000));assert.equal((await policy()).seq,'10');
});
test('cache expiry and UTC/day rollovers retain total usage and proof hash',async()=>{
 await seedPublic();const first=await read(runtime());assert.equal(first.res.status,200);
 await db.owner.query(`UPDATE scout_lookup.cache SET expires=${SQLNOW}-1`);await seed(`last_rpc=${SQLNOW}-10001,minute=${SQLNOW}/60000-1,day=${SQLNOW}/86400000-1,reads=30,rpc_min=3,rpc_day=30`);
 const s=runtime(),a=await read(s);assert.equal(a.res.status,200);assert.equal(s.calls.rpc,1);assert.equal((await policy()).seq,'3');assert.equal((await policy()).rpc_day,1);assert.equal((await policy()).proof_hash,'a'.repeat(64));
 assert.notEqual(a.body.source.responseReceivedAt,first.body.source.responseReceivedAt);
});
test('signed facts are withheld when cache entry carries future/inconsistent source clocks',async()=>{
 await seedPublic();const store=native().store,a=await store.transact(command());const cache={mint:MINT,json:'SYNTHETIC_INVALID_CACHE',mac:'a'.repeat(64),checkedAt:a.now+10000,expiresAt:a.now+40000,slot:'400000001'};
 assert.equal((await store.transact(complete(a.lease,{cache}))).reason,'stale_source');assert.equal((await policy()).highest_slot,'0');
});
test('clock regression or asynchronous transaction durability cannot refill source budget',async()=>{
 await seedPublic();const role=db.pool();await role.query('SET synchronous_commit=off');
 await assert.rejects(role.query('SELECT scout_lookup.step($1::jsonb)',[JSON.stringify(command())]),/durability_required/);
 await seed(`last_clock=${SQLNOW}+10000`);assert.equal((await native().store.transact(command())).reason,'invalid_clock');assert.equal((await policy()).seq,'1');
});

test('expiry while a shared cache read is acknowledged cannot publish facts after the window',async()=>{
 await seedPublic();window.expiresAtMs=Date.now()+900;await db.owner.query('UPDATE scout_lookup.policy SET expires_at=$1',[window.expiresAtMs]);
 assert.equal((await read(runtime())).res.status,200);const {store}=native();let wall=Date.now();const base=wall;
 const s=runtime({clock:{now:()=>wall,monotonic:()=>wall-base},store:{async transact(c){const r=await store.transact(c);wall=Math.max(r.now,window.expiresAtMs);return r}}}),a=await read(s);
 assert.equal(a.body.reason,'disabled');assert.equal(a.body.facts,null);assert.equal(s.calls.rpc,0);assert.equal((await policy()).seq,'2');
});
test('expiry while fenced completion is acknowledged withholds facts without refunding admission',async()=>{
 await seedPublic();window.expiresAtMs=Date.now()+900;await db.owner.query('UPDATE scout_lookup.policy SET expires_at=$1',[window.expiresAtMs]);
 const {store}=native();let wall=Date.now();const base=wall;
 const s=runtime({clock:{now:()=>wall,monotonic:()=>wall-base},store:{async transact(c){const r=await store.transact(c);wall=Math.max(wall,r.now);if(c.kind==='complete')wall=window.expiresAtMs;return r}}}),a=await read(s);
 assert.equal(a.body.reason,'disabled');assert.equal(a.body.facts,null);assert.equal(a.body.source,null);assert.equal(s.calls.rpc,1);assert.equal((await policy()).seq,'2');
});
