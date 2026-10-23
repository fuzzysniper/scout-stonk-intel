// SYNTHETIC offline HTTP inputs and owner token only. Store stubs are not hosted/live evidence.
import {test} from 'node:test';
import {Readable} from 'node:stream';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {liveHandler,PROJECT} from '../../lib/live-ledger/http.mjs';
import {databaseConfig,NEON_HOST} from '../../lib/live-ledger/database.mjs';
import {createWorkerStore} from '../../lib/scout-live/worker-store.mjs';
import {SCOPE,validCommand,validEvent,POLICY} from '../../lib/live-ledger/policy.mjs';
const token='SYNTHETIC_OWNER_TOKEN_'+ 'x'.repeat(32),host='scout-stonk-intel-synthetic.vercel.app';
const env={SCOUT_LIVE_API_ENABLED:'true',SCOUT_LIVE_OWNER_TOKEN:token,VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_ID:PROJECT,VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),VERCEL_URL:host};
const req=(stop=false,{headers={},...options}={})=>new Request('https://'+host+'/api/live-events'+(stop?'/stop':''),{method:stop?'POST':'GET',headers:{authorization:'Bearer '+token,'sec-fetch-site':'same-origin',...(stop?{origin:'https://'+host,'x-scout-live-intent':'STOP_SCOUT_LIVE'}:{}),...headers},...options});
const fixture={version:'scout-live/1',status:'waiting',observedAt:'2026-10-23T00:00:00.000Z',events:[],counts:{provisional:0,finalized:0}};
function handler(kind='reader',change={},reply=fixture){let calls=0,constructed=0;return {run:liveHandler(kind,{env:()=>({...env,...change}),storeFactory:k=>{constructed++;assert.equal(k,kind);return {transact:async(command)=>{calls++;assert.equal(command,null);return reply;}};}}),counts:()=>[constructed,calls]};}
test('default OFF does not read credentials or instantiate DB and preserves unknown',async()=>{
 let touched=0;const e={get SCOUT_LIVE_OWNER_TOKEN(){touched++;throw Error('not allowed');}};let sql=0;
 const r=await liveHandler('reader',{env:()=>e,storeFactory:()=>{sql++;throw Error();}})(req());
 assert.equal(r.status,503);const v=await r.json();assert.equal(v.status,'disabled');assert.equal(v.events,null);assert.equal(v.counts,null);assert.equal(touched+sql,0);
});
test('owner authenticated same-origin GET returns actual store snapshot only',async()=>{
 const h=handler();const r=await h.run(req());assert.equal(r.status,200);assert.deepEqual(await r.json(),fixture);assert.deepEqual(h.counts(),[1,1]);assert.match(r.headers.get('cache-control'),/private, no-store/);assert.equal(r.headers.has('access-control-allow-origin'),false);
});
for(const [title,change] of Object.entries({missing:{authorization:''},wrong:{authorization:'Bearer '+ 'z'.repeat(43)},malformed:{authorization:'Basic anything'},crossOrigin:{'sec-fetch-site':'cross-site'},missingFetchSite:{'sec-fetch-site':''},wrongOrigin:{origin:'https://evil.invalid'},nullOrigin:{origin:'null'}}))test('GET rejects '+title+' before DB',async()=>{
 const h=handler();assert.equal((await h.run(req(false,{headers:change}))).status,403);assert.deepEqual(h.counts(),[0,0]);
});
for(const [name,change] of Object.entries({preview:{VERCEL_ENV:'preview'},project:{VERCEL_PROJECT_ID:'other'},notVercel:{VERCEL:'0'},missingSha:{VERCEL_GIT_COMMIT_SHA:''},wrongDeployment:{VERCEL_URL:'other.vercel.app'},missingToken:{SCOUT_LIVE_OWNER_TOKEN:undefined}}))test('runtime fails closed '+name,async()=>{
 const h=handler('reader',change);assert.equal((await h.run(req())).status,403);assert.deepEqual(h.counts(),[0,0]);
});
test('query overrides, arbitrary host and alias are rejected',async()=>{
 const h=handler();for(const url of ['https://'+host+'/api/live-events?limit=100','https://scout-stonk-intel.vercel.app/api/live-events','https://evil.invalid/api/live-events']){
  const r=req();assert.equal((await h.run(new Request(url,r))).status,403);
 }assert.deepEqual(h.counts(),[0,0]);
});
test('separate STOP role only, exact owner intent, empty body, never resume',async()=>{
 const reply={version:'scout-live/1',status:'stopped',observedAt:'2026-10-23T00:00:00.000Z'};const h=handler('stop',{},reply);
 assert.equal((await h.run(req(true))).status,200);assert.deepEqual(h.counts(),[1,1]);
 for(const opts of [{headers:{'x-scout-live-intent':'RESUME'}},{body:'{}'},{headers:{'content-length':'10'}}])assert.equal((await h.run(req(true,opts))).status,400);
 assert.deepEqual(h.counts(),[1,1]);
});
test('STOP requires exact Origin and method; GET cannot mutate',async()=>{
 const h=handler('stop');for(const origin of ['', 'null','https://evil.invalid'])assert.equal((await h.run(req(true,{headers:{origin}}))).status,403);
 assert.equal((await h.run(req(true,{method:'GET'}))).status,405);assert.deepEqual(h.counts(),[0,0]);
});
test('database outage is unknown/unavailable and redacts arbitrary secret errors',async()=>{
 const run=liveHandler('reader',{env:()=>env,storeFactory:()=>{throw Error('postgresql://SYNTHETIC_SECRET api-key=NEVER_OUTPUT');}});const r=await run(req());assert.equal(r.status,503);const text=await r.text();assert.ok(!/postgresql|SECRET|api-key/.test(text));assert.equal(JSON.parse(text).events,null);
});
test('worker disabled by default, no PG/Helius credentials read',()=>{
 const old=process.env.SCOUT_LIVE_STORE_ENABLED;delete process.env.SCOUT_LIVE_STORE_ENABLED;
 try{assert.throws(()=>createWorkerStore(),/store_disabled/);}finally{if(old!==undefined)process.env.SCOUT_LIVE_STORE_ENABLED=old;}
});
test('worker cannot masquerade as Render by enabling store alone',()=>{
 const old=process.env.SCOUT_LIVE_STORE_ENABLED;process.env.SCOUT_LIVE_STORE_ENABLED='true';
 try{assert.throws(()=>createWorkerStore(),/invalid_runtime/);}finally{if(old===undefined)delete process.env.SCOUT_LIVE_STORE_ENABLED;else process.env.SCOUT_LIVE_STORE_ENABLED=old;}
});
const dsn=(kind='worker',query='')=>`postgresql://scout_live_${kind}:SYNTHETIC_DATABASE_PASSWORD_167@${NEON_HOST}/neondb${query}`;
test('isolated DSN enforces native TLS/SNI, bounded pool/timeouts and role',()=>{
 for(const k of ['worker','reader','stop']){const c=databaseConfig(dsn(k,'?sslmode=require'),k);assert.equal(c.user,'scout_live_'+k);assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(c.ssl.servername,NEON_HOST);assert.equal(c.ssl.minVersion,'TLSv1.2');assert.equal(c.enableChannelBinding,true);assert.equal(c.max,1);assert.equal(c.query_timeout,1500);assert.equal(c.application_name,'scout_live_'+k);}
});
test('mandatory channel binding is blocked, never silently stripped or claimed enforced',()=>{
 assert.throws(()=>databaseConfig(dsn('worker','?sslmode=require&channel_binding=require'),'worker'),/blocked_required_channel_binding/);
});
for(const [title,value] of Object.entries({oldRole:dsn().replace('scout_live_worker','scout_mint_app'),oldDatabase:dsn().replace('/neondb','/postgres'),fakeHost:dsn().replace(NEON_HOST,NEON_HOST+'.evil.invalid'),sslOff:dsn('worker','?sslmode=disable'),duplicateQuery:dsn('worker','?sslmode=require&sslmode=require'),options:dsn('worker','?options=anything'),extraPath:dsn().replace('/neondb','/neondb/'),plain:'http://'+NEON_HOST,missing:undefined}))test('DSN rejects '+title+' categorically without secrets',()=>{
 assert.throws(()=>databaseConfig(value,'worker'),e=>e.message==='invalid_database_configuration'&&!e.message.includes('PASSWORD'));
});
test('canonical schemas reject unknown versions/scopes/raw payloads/identities',()=>{
 const base={v:1,op:'claim',session:'00000000-0000-4000-8000-000000000001',worker:'00000000-0000-4000-8000-000000000002',scope:SCOPE,head:'a'.repeat(40)};
 assert.ok(validCommand(base));for(const p of [{v:2},{scope:'b'.repeat(64)},{rawLog:'no'},{head:'main'},{worker:'fake'}])assert.equal(validCommand({...base,...p}),false);
 const e={signature:'2'.repeat(88),slot:1,receivedAt:'2026-10-23T00:00:00.000Z',source:'helius_standard',program:POLICY.program,notificationHash:'a'.repeat(64),finality:'provisional',mint:null,quoteMint:null,tokenProgram:null,transactionHash:null,verificationHash:null,checkedAt:null,blockTime:null};
 assert.ok(validEvent(e));for(const p of [{finality:'finalized'},{slot:1.5},{signature:'bad'},{mint:'11111111111111111111111111111111'},{receivedAt:'not a clock'},{raw:'no'}])assert.equal(validEvent({...e,...p}),false);
});

test('actual Next Node adapter empty POST stream reaches authenticated STOP port',async()=>{
 const {NextRequestAdapter}=createRequire(import.meta.url)('next/dist/server/web/spec-extension/adapters/next-request.js');
 const original=req(true);const request=NextRequestAdapter.fromNodeNextRequest({method:'POST',url:original.url,headers:Object.fromEntries(original.headers),body:Readable.from([])},new AbortController().signal);
 assert.notEqual(request.body,null,'real adapter empty POST is a stream, not null');
 const reply={version:'scout-live/1',status:'stopped',observedAt:'2026-10-23T00:00:00.000Z'};const h=handler('stop',{},reply);
 assert.equal((await h.run(request)).status,200);assert.deepEqual(h.counts(),[1,1]);
});
test('stalled authenticated POST body times out/cancels before any SQL',async()=>{
 let cancelled=false;const body=new ReadableStream({cancel(){cancelled=true;}});const h=handler('stop');
 const r=await h.run(req(true,{body,duplex:'half'}));assert.equal(r.status,400);assert.deepEqual(h.counts(),[0,0]);assert.equal(cancelled,true);
});
