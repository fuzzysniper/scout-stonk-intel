// Actual current-Wrangler bundles + local workerd/SQLite/Workflow engine.
// All runtime outbound traffic is intercepted; synthetic key only, no account API.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {proofBundle} from './dry-run.mjs';
import {context,responder,FAKE_TOKEN} from './fixtures.mjs';
import {SINGLETON,WORKFLOW} from './app-proof.mjs';
const require=createRequire(new URL('../package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions,Log,LogLevel}=require('miniflare');
const core=await proofBundle(true),integration=await proofBundle(),sealed=await proofBundle(false,true);
assert.doesNotMatch(core.bundle,/SlotCoordinator|CREATE TABLE IF NOT EXISTS slots|\/dispatches|collect_rewards|collection-slots/);
assert.doesNotMatch(core.bundle,/console\.(log|error|warn|debug)|JSON\.stringify\(env\)/);
assert.match(integration.bundle,/SlotCoordinator/);
assert.doesNotMatch(sealed.bundle,/one-private-auth-proof|INSERT INTO c2_once|C2_ONCE\.get/);
function setup(bundle,env,calls,mutate,extra={}){
 const options=convertV4MiniflareOptions({name:'scout-scheduler-staging',modules:true,script:bundle,compatibilityDate:'2026-10-01',
  bindings:env,durableObjects:{C2_ONCE:{className:'StageC2ProofOnce',useSQLite:true},...(bundle!==core.bundle?{SLOTS:{className:'SlotCoordinator',useSQLite:true}}:{})},
  workflows:{C2_EXECUTOR:{name:WORKFLOW,className:'StageC2AuthProof'}},cf:false,
  outboundService:responder(calls,mutate),...extra});
 options.telemetry={enabled:false};options.log=new Log(LogLevel.NONE);return new Miniflare(options);
}
function redacted(value,key){const text=JSON.stringify(value);assert.ok(!text.includes(FAKE_TOKEN));assert.ok(!text.includes(key));assert.ok(!text.includes('offline-sensitive-error'));assert.equal(value.dispatches,0);assert.equal(value.collectionClaims,0);assert.equal(value.providerQueries,0);assert.equal(value.repositoryWrites,0);assert.equal(value.pilotReady,false);}
async function prove(mf,event){const ns=await mf.getDurableObjectNamespace('C2_ONCE');return ns.get(ns.idFromName(SINGLETON)).prove(event);}
async function stateContainsNoCredentials(dir,key){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())await stateContainsNoCredentials(path,key);
  else if(entry.isFile()){
   const bytes=await readFile(path);
   assert.ok(!bytes.includes(Buffer.from(FAKE_TOKEN)),'persisted state must exclude token');
   assert.ok(!bytes.includes(Buffer.from(key)),'persisted state must exclude private key');
   assert.ok(!bytes.includes(Buffer.from(key.split('\n')[1])),'persisted state must exclude encoded key');
   assert.ok(!bytes.includes(Buffer.from('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.')),'persisted state must exclude signing JWT');
   assert.ok(!bytes.includes(Buffer.from('offline-sensitive-error')),'persisted state must exclude raw errors');
  }
 }
}
test('actual isolated core has no collection/dispatch class; public HTTP unavailable and fixed proof RPC succeeds once',async()=>{
 const {env,event}=await context(),calls=[],mf=setup(core.bundle,env,calls);
 try{await mf.ready;assert.equal((await mf.dispatchFetch('https://offline.invalid/')).status,500);assert.equal(calls.length,0);
  const result=await prove(mf,event);assert.equal(result.passed,true);assert.equal(result.temporaryTokenRevoked,true);assert.equal(calls.length,7);redacted(result,env.APP_PRIVATE_KEY);
  const second=await prove(mf,event);assert.equal(second.passed,false);assert.equal(calls.length,7);redacted(second,env.APP_PRIVATE_KEY);
 }finally{await mf.dispose();}
});
test('actual integration retains disabled production handler/SLOTS while proof has an independent one-use namespace',async()=>{
 const {env,event}=await context(),calls=[],mf=setup(integration.bundle,env,calls);
 try{await mf.ready;const worker=await mf.getWorker();await worker.scheduled({cron:'17 * * * *',scheduledTime:Date.now()});assert.equal(calls.length,0);
  const slots=await mf.getDurableObjectNamespace('SLOTS'),stub=slots.get(slots.idFromName('existing-offline-slots'));
  const read=()=>stub.fetch('https://internal.invalid/',{method:'POST',body:JSON.stringify({operation:'receipt',scheduledTime:Date.parse('2026-10-15T17:17:00Z')})}).then(r=>r.json());
  assert.equal(await read(),null);const result=await prove(mf,event);assert.equal(result.passed,true);assert.equal(await read(),null);assert.equal(calls.length,7);
  assert.equal((await mf.dispatchFetch('https://offline.invalid/')).status,500);redacted(result,env.APP_PRIVATE_KEY);
 }finally{await mf.dispose();}
});
test('durable consumed record survives local process restart; failed/uncertain attempt cannot replay',async()=>{
 const {env,event}=await context(),calls=[],dir=await mkdtemp(join(tmpdir(),'scout-c2-once-'));
 try{
  let mf=setup(core.bundle,env,calls,({path})=>{if(path.endsWith('/access_tokens'))throw Error('offline-sensitive-error');},{resourcePersistencePath:dir});
  try{await mf.ready;const result=await prove(mf,event);assert.equal(result.passed,false);assert.equal(result.tokenIssuanceUncertain,true);redacted(result,env.APP_PRIVATE_KEY);}finally{await mf.dispose();}
  const before=calls.length;mf=setup(core.bundle,env,calls,undefined,{resourcePersistencePath:dir});
  try{await mf.ready;assert.equal((await prove(mf,event)).passed,false);assert.equal(calls.length,before);}finally{await mf.dispose();}
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('unarmed/expired/actor guard fails before network, and concurrent valid requests mint at most one token',async()=>{
 const {env,event}=await context(),calls=[];
 let mf;
 for(const change of [{C2_ARMED:'false'},{C2_EXPIRES_AT:'2000-01-01T00:00:00.000Z'},{C2_APP_ACTOR_ID:'58099771'},{ACTIVATION:'enabled'}]){
  mf=setup(core.bundle,{...env,...change},calls);
  try{await mf.ready;assert.equal((await prove(mf,event)).passed,false);assert.equal(calls.length,0);}finally{await mf.dispose();}
 }
 mf=setup(core.bundle,env,calls);
 try{await mf.ready;const results=await Promise.all(Array.from({length:8},()=>prove(mf,event)));assert.equal(results.filter(r=>r.passed).length,1);assert.equal(calls.filter(c=>c.method==='POST').length,1);assert.equal(calls.filter(c=>c.method==='DELETE').length,1);}finally{await mf.dispose();}
});
test('real Workflow entry persists only sanitized step result and refuses restart/replay; no public caller',async()=>{
 const {env}=await context(),calls=[],dir=await mkdtemp(join(tmpdir(),'scout-c2-workflow-')),mf=setup(integration.bundle,env,calls,undefined,{resourcePersistencePath:dir});
 try{await mf.ready;const bindings=await mf.getBindings(),workflow=bindings.C2_EXECUTOR;
  const instance=await workflow.create({id:env.C2_INSTANCE_ID,params:{}});
  let state;for(let i=0;i<100;i++){state=await instance.status();if(['complete','errored'].includes(state.status))break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(state.status,'complete');assert.equal(state.output.passed,true);redacted(state.output,env.APP_PRIVATE_KEY);assert.equal(calls.length,7);
  await instance.restart();for(let i=0;i<100;i++){state=await instance.status();if(['complete','errored'].includes(state.status))break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(state.status,'complete');assert.equal(state.output.passed,false);assert.equal(calls.length,7);
 }finally{await mf.dispose();try{await stateContainsNoCredentials(dir,env.APP_PRIVATE_KEY);}finally{await rm(dir,{recursive:true,force:true});}}
});
test('packaged failure cases remain one-use, redacted and read-only',async()=>{
 for(const status of [401,403,429,503]){
  const {env,event}=await context(),calls=[],mf=setup(core.bundle,env,calls,({path})=>path==='/app'?new Response('offline-sensitive-error',{status}):undefined);
  try{await mf.ready;const result=await prove(mf,event);assert.equal(result.passed,false);redacted(result,env.APP_PRIVATE_KEY);assert.equal(calls.length,1);await prove(mf,event);assert.equal(calls.length,1);}finally{await mf.dispose();}
 }
 for(const mutate of [
  ({path})=>path==='/installation/repositories?per_page=2'?Response.json({total_count:1,repositories:[{id:1415026436,full_name:'fuzzysniper/scout-stonk-intel',default_branch:'wrong'}]}):undefined,
  ({path})=>path==='/installation/token'?new Response('offline-sensitive-error',{status:503}):undefined,
 ]){
  const {env,event}=await context(),calls=[],mf=setup(core.bundle,env,calls,mutate);
  try{await mf.ready;const result=await prove(mf,event);assert.equal(result.passed,false);redacted(result,env.APP_PRIVATE_KEY);assert.equal(calls.filter(c=>c.method==='POST').length,1);assert.equal(calls.filter(c=>c.method==='DELETE').length,1);const before=calls.length;await prove(mf,event);assert.equal(calls.length,before);}finally{await mf.dispose();}
 }
});
test('real Workflow rejects nonempty input and a different instance before auth',async()=>{
 for(const params of [{unexpected:'offline-sensitive-error'},{}]){
  const {env}=await context(),calls=[],mf=setup(integration.bundle,env,calls);
  try{await mf.ready;const workflow=(await mf.getBindings()).C2_EXECUTOR;
   const instance=await workflow.create({id:Object.keys(params).length?env.C2_INSTANCE_ID:'c2-'+'b'.repeat(40),params});
   let state;for(let i=0;i<100;i++){state=await instance.status();if(['complete','errored'].includes(state.status))break;await new Promise(r=>setTimeout(r,100));}
   assert.equal(state.status,'complete');assert.equal(state.output.passed,false);redacted(state.output,env.APP_PRIVATE_KEY);assert.equal(calls.length,0);
  }finally{await mf.dispose();}
 }
});
test('sealed rollback bundle retains consumed SQLite state across version changes and cannot authenticate',async()=>{
 const {env,event}=await context(),calls=[],dir=await mkdtemp(join(tmpdir(),'scout-c2-sealed-'));
 try{
  for(const bundle of [integration.bundle,sealed.bundle,integration.bundle]){
   const before=calls.length,mf=setup(bundle,env,calls,undefined,{resourcePersistencePath:dir});
   try{await mf.ready;const result=await prove(mf,event);assert.equal(result.passed,before===0);redacted(result,env.APP_PRIVATE_KEY);assert.equal(calls.length,before===0?7:before);}finally{await mf.dispose();}
  }
  await stateContainsNoCredentials(dir,env.APP_PRIVATE_KEY);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('production package still excludes proof classes; no hosted config or secret binding was applied',async()=>{
 const config=JSON.parse(await readFile(new URL('../wrangler.json',import.meta.url),'utf8'));assert.equal(config.main,'staging-entry.ts');assert.equal(config.vars.ACTIVATION,'disabled');assert.equal(config.durable_objects.bindings.length,1);assert.ok(!config.exports.StageC2AuthProof);
});
