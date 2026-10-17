import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectHostedApp,permitted,PUBLIC} from './app-proof.mjs';
import {context,responder,FAKE_TOKEN,syntheticKey} from './fixtures.mjs';
import {proposal,assertProposal,assertUnchangedStaging} from './policy.mjs';
import {assertUnarmedIntegration,unarmedIntegration} from './integration-policy.mjs';
const install='/app/installations/'+PUBLIC.installation;
globalThis.fetch=()=>{throw Error('offline_outbound_forbidden');};
async function run(change,mutate=()=>{}){
 const c=await context();change?.(c);const original=globalThis.fetch,calls=[];
 globalThis.fetch=responder(calls,mutate);
 try{return {value:await inspectHostedApp(c.env,c.event),calls,env:c.env};}finally{globalThis.fetch=original;}
}
function safe(value,key){const text=JSON.stringify(value);assert.ok(!text.includes(FAKE_TOKEN));assert.ok(!text.includes(key));assert.ok(!text.includes('offline-sensitive-error'));assert.equal(value.dispatches,0);assert.equal(value.collectionClaims,0);assert.equal(value.providerQueries,0);assert.equal(value.repositoryWrites,0);assert.equal(value.pilotReady,false);assert.equal(value.workflowTokenVerified,false);}
test('strict unarmed proposal preserves original staging and rejects surfaces/privilege/state drift',async()=>{
 const original=JSON.parse(await readFile(new URL('../wrangler.json',import.meta.url),'utf8'));assertUnchangedStaging(original);assertProposal(proposal);
 assert.equal(proposal.vars.ACTIVATION,'disabled');assert.equal(proposal.vars.C2_ARMED,'false');assert.deepEqual(proposal.durable_objects.bindings[0],original.durable_objects.bindings[0]);assert.deepEqual(proposal.exports.SlotCoordinator,original.exports.SlotCoordinator);
 for(const mutate of [c=>c.vars.ACTIVATION='human-approved',c=>c.vars.C2_ARMED='true',c=>c.vars.APP_PRIVATE_KEY='offline-sensitive-error',c=>c.triggers={crons:[]},c=>c.routes=[],c=>c.exports.SlotCoordinator.storage='legacy-kv',c=>c.exports.SlotCoordinator.state='deleted',c=>c.services=[{}],c=>c.workers_dev=true,c=>c.preview_urls=true,c=>c.vars.C2_EXPIRES_AT='2026-10-15T12:00:00.000Z']){
  const c=structuredClone(proposal);mutate(c);assert.throws(()=>assertProposal(c),e=>{assert.ok(!e.stack.includes('offline-sensitive-error'));return true;});
 }
});
test('missing/wrong guards, identity, actor, instance and clock reject before binding/key access or HTTP',async()=>{
 const mutations=[c=>delete c.env.ACTIVATION,c=>c.env.ACTIVATION='human-approved',c=>c.env.C2_ARMED='false',c=>c.env.C2_GATE_DISABLED_ATTESTED='false',c=>c.env.APP_ID='other',c=>c.env.INSTALLATION_ID='1',c=>c.env.REPOSITORY_ID='1',c=>c.env.C2_APP_ACTOR_ID=String(PUBLIC.owner),c=>c.env.C2_APP_ACTOR_ID='900000001',c=>c.env.C2_APP_ACTOR_ID='0',c=>c.env.C2_APP_ACTOR_ID='UNAPPROVED',c=>c.event.instanceId='other',c=>c.event.workflowName='other',c=>c.event.createdAt=Date.now()+1000,c=>c.env.C2_NOT_BEFORE='not-utc',c=>c.env.C2_EXPIRES_AT=c.env.C2_NOT_BEFORE,c=>c.env.C2_EXPIRES_AT='2099-01-01T00:00:00.000Z'];
 for(const mutate of mutations){const c=await context();mutate(c);Object.defineProperty(c.env,'APP_PRIVATE_KEY',{get(){throw Error('key_access_forbidden');}});assert.equal(permitted(c.env,c.event),false);const v=await inspectHostedApp(c.env,c.event);assert.equal(v.passed,false);assert.equal(v.tokenIssuanceAttempted,false);}
});
test('absent/malformed/wrong key and 401/403/429/503/redirect/timeout are fail closed and redacted',async()=>{
 for(const key of [undefined,'','offline-not-a-private-key']){const {value,calls}=await run(c=>c.env.APP_PRIVATE_KEY=key);assert.equal(value.passed,false);assert.equal(calls.length,0);}
 const wrongKey=await syntheticKey(),wrong=await run(c=>c.env.APP_PRIVATE_KEY=wrongKey);assert.equal(wrong.value.passed,false);assert.equal(wrong.value.tokenIssuanceAttempted,false);assert.equal(wrong.calls.length,1);safe(wrong.value,wrongKey);
 for(const status of [301,401,403,429,503]){const r=await run(null,({path})=>path==='/app'?new Response('offline-sensitive-error',{status,headers:{location:'https://untrusted.invalid'}}):undefined);assert.equal(r.value.passed,false);assert.equal(r.calls.length,1);safe(r.value,r.env.APP_PRIVATE_KEY);}
 const r=await run(null,()=>{throw Error('offline-sensitive-error');});assert.equal(r.value.passed,false);safe(r.value,r.env.APP_PRIVATE_KEY);
});
test('mock-key success mints only SCOUT Actions-read and revokes; whole installation/hosting/current collector remain unproven',async()=>{
 const {value,calls,env}=await run();assert.equal(value.passed,true);assert.equal(value.exitCode,0);assert.equal(value.appActorId,Number(env.C2_APP_ACTOR_ID));assert.equal(value.temporaryTokenRevoked,true);assert.equal(calls.length,7);assert.deepEqual(calls.map(c=>c.method),['GET','GET','POST','GET','GET','GET','DELETE']);safe(value,env.APP_PRIVATE_KEY);
});
test('wrong grant/app/installation/repo/default branch/workflow/bot and invalid token TTL revoke known token without write or retry',async()=>{
 const cases=[
  ['/app',d=>d.id++],['/app',d=>d.permissions.contents='read'],[install,d=>d.id++],[install,d=>d.account.login='other'],[install,d=>d.repository_selection='all'],[install,d=>d.suspended_at='2026-01-01T00:00:00Z'],
  [install+'/access_tokens',d=>d.permissions.actions='write'],[install+'/access_tokens',d=>d.permissions.contents='read'],[install+'/access_tokens',d=>d.expires_at='2099-01-01T00:00:00Z'],
  ['/installation/repositories?per_page=2',d=>d.total_count=2],['/installation/repositories?per_page=2',d=>d.repositories[0].id++],['/installation/repositories?per_page=2',d=>d.repositories[0].default_branch='other'],
  ['/users/offline-scout%5Bbot%5D',d=>d.id++],['/users/offline-scout%5Bbot%5D',d=>d.type='User'],
  ['/repos/fuzzysniper/scout-stonk-intel/actions/workflows/reward-snapshots.yml',d=>d.id++],['/repos/fuzzysniper/scout-stonk-intel/actions/workflows/reward-snapshots.yml',d=>d.path='other']];
 for(const [target,mutate]of cases){const r=await run(null,({path,data,status})=>{if(path===target)mutate(data);return {data,status};});assert.equal(r.value.passed,false);const issued=r.calls.some(c=>c.method==='POST');assert.equal(r.value.temporaryTokenRevoked,issued);assert.equal(r.calls.filter(c=>c.method==='POST').length,issued?1:0);safe(r.value,r.env.APP_PRIVATE_KEY);}
});
test('known-token downstream failure still revokes; failed/lost revoke and uncertain issuance never pass',async()=>{
 for(const status of [401,403,429,503]){
  const r=await run(null,({path})=>path==='/installation/token'?{status}:undefined);assert.equal(r.value.passed,false);assert.equal(r.value.revokeUncertain,true);assert.equal(r.value.temporaryTokenRevoked,false);safe(r.value,r.env.APP_PRIVATE_KEY);
 }
 for(const target of [install+'/access_tokens','/installation/token']){
  const r=await run(null,({path})=>{if(path===target)throw Error('offline-sensitive-error');});assert.equal(r.value.passed,false);assert.equal(r.value.tokenIssuanceUncertain,target.endsWith('access_tokens'));assert.equal(r.value.revokeUncertain,target.endsWith('/token'));safe(r.value,r.env.APP_PRIVATE_KEY);
 }
 const downstream=await run(null,({path})=>path.includes('/actions/workflows/')?{status:503}:undefined);assert.equal(downstream.value.passed,false);assert.equal(downstream.value.temporaryTokenRevoked,true);
});
test('malformed, oversized, invalid UTF8, no-body and unusable issuance token do not leak or claim revocation',async()=>{
 for(const reply of [()=>new Response('{',{status:201}),()=>new Response('x'.repeat(32769),{status:201}),()=>new Response(new Uint8Array([255]),{status:201}),()=>new Response(null,{status:201}),()=>Response.json({token:'bad\ncredential'},{status:201})]){
  const r=await run(null,({path})=>path===install+'/access_tokens'?reply():undefined);assert.equal(r.value.passed,false);assert.equal(r.value.tokenIssuanceUncertain,true);assert.equal(r.value.temporaryTokenRevoked,false);safe(r.value,r.env.APP_PRIVATE_KEY);
 }
});
test('real request/revocation AbortSignal deadlines and a stalled issuance body stop without retries or raw errors',async()=>{
 const c=await context(),original=globalThis.fetch;
 const keepAlive=setInterval(()=>{},1000);
 try{
  for(const target of ['issue','revoke','body']){
   const calls=[],normal=responder(calls);
   globalThis.fetch=async(url,init)=>{
    if(target==='body' && String(url).endsWith('/access_tokens')){
     calls.push({method:'POST',path:'offline-stalled-body'});
     return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{"token":"'+FAKE_TOKEN));},cancel(){return new Promise(()=>{});}}),{status:201});
    }
    if(target==='issue' && String(url).endsWith('/access_tokens') || target==='revoke' && init.method==='DELETE'){
     calls.push({method:init.method,path:'offline-timeout'});
     return new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(Error('offline-sensitive-error')),{once:true}));
    }
    return normal(url,init);
   };
   const value=await inspectHostedApp(c.env,c.event);assert.equal(value.passed,false);assert.equal(value.exitCode,1);
   assert.equal(value.tokenIssuanceUncertain,target!=='revoke');assert.equal(value.revokeUncertain,target==='revoke');safe(value,c.env.APP_PRIVATE_KEY);
   assert.equal(calls.filter(v=>v.method==='POST').length,1);
  }
 }finally{clearInterval(keepAlive);globalThis.fetch=original;}
});

test('unselected integration preserves namespace/class and rejects armed config, credentials and ingress',async()=>{
 const value=JSON.parse(await readFile(new URL('./wrangler.unarmed.json',import.meta.url),'utf8'));
 assertUnarmedIntegration(value);assert.deepEqual(value,unarmedIntegration);
 const active=JSON.parse(await readFile(new URL('../wrangler.json',import.meta.url),'utf8'));
 assert.equal(active.main,'staging-entry.ts');assert.equal(active.vars.ACTIVATION,'disabled');
 assert.deepEqual(value.durable_objects.bindings[0],active.durable_objects.bindings[0]);
 assert.deepEqual(value.exports.SlotCoordinator,active.exports.SlotCoordinator);assert.equal(value.vars.C2_APP_ACTOR_ID,'342326617');
 for(const mutate of [c=>c.vars.C2_ARMED='true',c=>c.vars.C2_APP_ACTOR_ID='900000001',c=>c.vars.ACTIVATION='enabled',
  c=>c.vars.APP_PRIVATE_KEY='offline-sensitive-error',c=>c.triggers={crons:['17 * * * *']},c=>c.routes=[],c=>c.workers_dev=true,
  c=>c.preview_urls=true,c=>c.durable_objects.bindings[0].class_name='Replacement',c=>c.exports.SlotCoordinator.storage='legacy-kv',
  c=>c.workflows=[{}],c=>c.env={},c=>c.migrations=[{tag:'new',deleted_classes:['SlotCoordinator']}],c=>c.keep_vars=true]){
  const bad=structuredClone(value);mutate(bad);assert.throws(()=>assertUnarmedIntegration(bad),e=>{assert.doesNotMatch(e.stack,/offline-sensitive-error/);return true;});
 }
});
