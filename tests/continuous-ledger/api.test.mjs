// SYNTHETIC HTTP identity/token/receipts only. No external API/SQL/provider access.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createRequire} from 'node:module';
import {continuousHandler,browserFeed} from '../../lib/scout-continuous/http.mjs';
import {PROJECT} from '../../lib/live-ledger/http.mjs';
import {databaseConfig,NEON_HOST} from '../../lib/scout-continuous/database.mjs';
import {createContinuousStore} from '../../lib/scout-live/continuous-store.mjs';
import {validGrant,validCommand,hash,validMaintenance} from '../../lib/scout-continuous/policy.mjs';
import {grant,base,PASSWORD,health} from './fixtures.mjs';
const g=grant(),parent=g.parent,grantHash=hash(g),host='scout-stonk-intel-synthetic.vercel.app',token='SYNTHETIC_CONTINUOUS_OWNER_'+ 'x'.repeat(32),ops='SYNTHETIC_CONTINUOUS_OPS_'+ 'y'.repeat(32);
const env={SCOUT_CONTINUOUS_API_ENABLED:'true',SCOUT_CONTINUOUS_MAINTENANCE_ENABLED:'true',SCOUT_CONTINUOUS_OWNER_TOKEN:token,SCOUT_CONTINUOUS_MAINTENANCE_TOKEN:ops,VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_ID:PROJECT,VERCEL_URL:host,VERCEL_GIT_COMMIT_SHA:g.head};
const req=(kind='reader',options={})=>new Request('https://'+host+'/api/live-events/continuous'+(kind==='reader'?'':'/'+kind),{method:kind==='reader'?'GET':'POST',...options,headers:{authorization:'Bearer '+(kind==='maintenance'?ops:token),'sec-fetch-site':'same-origin',...(kind==='reader'?{}:{origin:'https://'+host,'x-scout-live-intent':kind==='stop'?'STOP_SCOUT_CONTINUOUS':'MAINTAIN_SCOUT_CONTINUOUS'}),...(kind==='stop'?{'x-scout-continuous-parent':parent,'x-scout-continuous-grant':grantHash}:{}),...options.headers}});
const ack={version:'unfarmd-continuous-stop/1',parent,grantHash,status:'stopped',observedAt:new Date().toISOString(),closureAcknowledged:false};
function harness(kind='stop',change={}){let made=0,calls=0;const run=continuousHandler(kind,{env:()=>({...env,...change}),storeFactory:k=>{assert.equal(k,kind);made++;return {async transact(command){calls++;if(kind==='stop')assert.deepEqual(command,{parent,grantHash});return ack;}};}});return {run,counts:()=>[made,calls]};}
test('default disabled gate returns unknown without secret getters or DB construction',async()=>{
 let secrets=0,sql=0;const config={get SCOUT_CONTINUOUS_OWNER_TOKEN(){secrets++;throw Error('DO_NOT_READ');}};const r=await continuousHandler('reader',{env:()=>config,storeFactory:()=>{sql++;throw 0;}})(req());assert.equal(r.status,503);assert.deepEqual((await r.json()).parent,null);assert.equal(secrets+sql,0);
});
test('protected parent STOP is exact-scope, empty-body, one store role and cache private',async()=>{
 const h=harness(),r=await h.run(req('stop'));assert.equal(r.status,200);assert.deepEqual(await r.json(),ack);assert.deepEqual(h.counts(),[1,1]);assert.match(r.headers.get('cache-control'),/private, no-store/);assert.equal(r.headers.has('access-control-allow-origin'),false);
});
for(const [name,headers] of Object.entries({noToken:{authorization:''},wrongToken:{authorization:'Bearer '+ 'z'.repeat(43)},opsToken:{authorization:'Bearer '+ops},crossSite:{'sec-fetch-site':'cross-site'},noOrigin:{origin:''},wrongOrigin:{origin:'https://evil.invalid'},nullOrigin:{origin:'null'}}))test('STOP rejects '+name+' before any store',async()=>{const h=harness();assert.equal((await h.run(req('stop',{headers}))).status,403);assert.deepEqual(h.counts(),[0,0]);});
for(const [name,change] of Object.entries({preview:{VERCEL_ENV:'preview'},project:{VERCEL_PROJECT_ID:'other'},missingRuntime:{VERCEL:'0'},missingSha:{VERCEL_GIT_COMMIT_SHA:''},wrongHost:{VERCEL_URL:'evil.invalid'}}))test('native runtime pin rejects '+name,async()=>{const h=harness('stop',change);assert.equal((await h.run(req('stop'))).status,403);assert.deepEqual(h.counts(),[0,0]);});
test('STOP rejects GET, queries, alias, wrong intent/target and any payload',async()=>{
 const h=harness();assert.equal((await h.run(req('stop',{method:'GET'}))).status,405);
 for(const headers of [{'x-scout-live-intent':'START'},{'x-scout-continuous-parent':'bad'},{'x-scout-continuous-grant':'0'.repeat(64)}])assert.equal((await h.run(req('stop',{headers}))).status,400);
 for(const body of ['{}',' ','x'])assert.equal((await h.run(req('stop',{body}))).status,400);
 for(const url of ['https://'+host+'/api/live-events/continuous/stop?reset=true','https://scout-stonk-intel.vercel.app/api/live-events/continuous/stop'])assert.equal((await h.run(new Request(url,req('stop')))).status,403);assert.deepEqual(h.counts(),[0,0]);
});
test('real Next empty POST stream reaches STOP; stalled body cancels without SQL',async()=>{
 const {NextRequestAdapter}=createRequire(import.meta.url)('next/dist/server/web/spec-extension/adapters/next-request.js');const r=req('stop'),h=harness();const adapted=NextRequestAdapter.fromNodeNextRequest({method:'POST',url:r.url,headers:Object.fromEntries(r.headers),body:Readable.from([])},new AbortController().signal);assert.equal((await h.run(adapted)).status,200);
 let cancelled=false;const stalled=new ReadableStream({cancel(){cancelled=true;}});assert.equal((await h.run(req('stop',{body:stalled,duplex:'half'}))).status,400);assert.equal(cancelled,true);assert.deepEqual(h.counts(),[1,1]);
});
test('independent maintenance uses separate capability, fixed command schema and bounded body',async()=>{
 let calls=0;const run=continuousHandler('maintenance',{env:()=>env,storeFactory:()=>({async transact(c){calls++;assert.equal(c.op,'tick');return {version:'unfarmd-continuous-maintenance/1',status:'checked'};}})});
 const command={op:'tick',parent,grantHash};const good={headers:{'content-type':'application/json'},body:JSON.stringify(command)};assert.equal((await run(req('maintenance',good))).status,200);
 assert.equal((await run(req('maintenance',{...good,headers:{...good.headers,authorization:'Bearer '+token}}))).status,403);
 for(const c of [{...command,op:'reset'},{...command,url:'https://evil.invalid'},{...command,key:'NO_CREDENTIALS'}])assert.equal((await run(req('maintenance',{...good,body:JSON.stringify(c)}))).status,400);
 assert.equal((await run(req('maintenance',{...good,body:'x'.repeat(8193)}))).status,400);assert.equal(calls,1);
});
test('store errors stay unavailable, never echo DSNs/keys or claim STOP',async()=>{
 const run=continuousHandler('stop',{env:()=>env,storeFactory:()=>{throw Error('postgresql://SYNTHETIC_SECRET api-key=NEVER_ECHO');}});const r=await run(req('stop'));assert.equal(r.status,503);const text=await r.text();assert.ok(!/SECRET|postgresql|api-key/.test(text));assert.equal(JSON.parse(text).status,'unavailable');
});
test('all new isolated DSNs require native cert/hostname TLS and preserve mandatory binding failure',()=>{
 for(const kind of ['worker','reader','stop','maintenance']){
  const dsn=`postgresql://scout_continuous_${kind}:${PASSWORD}@${NEON_HOST}/neondb?sslmode=require`,c=databaseConfig(dsn,kind);assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(c.ssl.servername,NEON_HOST);assert.equal(c.enableChannelBinding,true);assert.equal(c.max,1);
  assert.throws(()=>databaseConfig(dsn+'&channel_binding=require',kind),/blocked_required_channel_binding/);
  for(const bad of [dsn.replace('scout_continuous_','scout_live_'),dsn.replace(NEON_HOST,NEON_HOST+'.evil.invalid'),dsn.replace('require','disable'),dsn+'&options=-canything'])assert.throws(()=>databaseConfig(bad,kind),e=>e.message==='invalid_database_configuration');
 }
});
test('store source gate never reads DSN/key while disabled; Render identity alone cannot select old store',()=>{
 const previous=process.env.SCOUT_CONTINUOUS_STORE_ENABLED;delete process.env.SCOUT_CONTINUOUS_STORE_ENABLED;try{assert.throws(()=>createContinuousStore(),/store_disabled/);process.env.SCOUT_CONTINUOUS_STORE_ENABLED='true';assert.throws(()=>createContinuousStore(),/invalid_runtime/);}finally{if(previous===undefined)delete process.env.SCOUT_CONTINUOUS_STORE_ENABLED;else process.env.SCOUT_CONTINUOUS_STORE_ENABLED=previous;}
});
test('strict grant and commands reject unknown/source-enabling defaults and v1 requests',()=>{
 assert.equal(validGrant(g),true);assert.equal(validCommand({...base(g),op:'claim'}),true);assert.equal(validCommand({...base(g),op:'claim',v:1}),false);assert.equal(validGrant({...g,sourceGo:false}),false);assert.equal(validGrant({...g,limits:{...g.limits,credits:g.allowanceCredits}}),false);assert.equal(validGrant({...g,parent:null}),false);assert.equal(validMaintenance({op:'meter',parent,grantHash,raw:'none'}),false);
});
test('nested feed preserves genuine zero, original source clocks and lower-case compatible summary reason',()=>{
 const at=new Date().toISOString();const r={parent,grantHash,head:g.head,observedAt:at,stopped:true,reason:'OWNER_STOP',connected:false,worker:null,leaseUntil:null,child:null,endsAt:g.endsAt,usage:{credits:100,bytes:16777216,frames:20000,rpc:0,connections:1,children:1,auditRecords:0,framesReceived:0,bytesReceived:0},limits:g.limits,assurance:{},gate:null,maintenance:{},retention:{},health:{source:health(),heartbeatAt:at,gaps:0,errors:0,gapSince:null,gapEndedAt:null},events:[],counts:{provisional:0,finalized:0}};
 const response=browserFeed(r);assert.equal(response.feed.status,'stopped');assert.equal(response.feed.health.reason,'owner_stop');assert.equal(response.parent.reason,'OWNER_STOP');assert.equal(response.feed.health.lastFrameAt,null);assert.equal(response.feed.budget.rpcUsed,0);assert.deepEqual(response.feed.events,[]);assert.equal(response.parent.usage.credits,100);
});
