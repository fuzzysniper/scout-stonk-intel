// SYNTHETIC replies, identities, clocks and credentials. No hosted service or SQL.
import test from 'node:test';import assert from 'node:assert/strict';
import {inspectionCard,inspectionContext,readManifest} from '../../ops/native-beta-output/inspection-context.mjs';
import {evaluateInspection,inspectionAuthority,inspectionPlan} from '../../ops/native-beta-output/inspect-only.mjs';
import {paths} from '../../ops/native-beta-output/preflight.mjs';
import {safeFailure,fail} from '../../ops/native-beta-output/diagnostics.mjs';
import {policy,canonical,hash} from '../../ops/native-beta-output/identity.mjs';
import {context,time,controls,aliasRows,go} from '../native-beta-output/fixtures.mjs';
import https from 'node:https';import fs from 'node:fs';import crypto from 'node:crypto';import cp from 'node:child_process';import {EventEmitter} from 'node:events';
import {runReadOnlyInspection} from '../../ops/native-beta-output/inspect-only.mjs';
export function fixture(){
 const ctx=context(),card=inspectionCard(ctx,time),manifest=card.manifest,p=paths(ctx),c=controls(card.comment),seen=[];
 const data={
  [p.run]:{id:ctx.runId,head_sha:ctx.sha,head_branch:ctx.branch,workflow_id:policy.workflowId,path:'.github/workflows/native-pilot-admission.yml',status:'in_progress',event:'workflow_dispatch',repository:{id:policy.repositoryId},head_repository:{id:policy.repositoryId}},
  [p.environment]:c.environment,[p.branches]:c.branches,[p.reviews]:c.reviews,
  [p.project]:{id:policy.projectId,accountId:policy.teamId,name:'scout-stonk-intel',nodeVersion:'24.x',link:{type:'github',org:'fuzzysniper',repo:'scout-stonk-intel'},ssoProtection:{deploymentType:'all'}},
  [p.aliases]:{aliases:aliasRows()},[p.webhooks]:[],[p.integrations]:[]
 };
 const read=async path=>{seen.push(path);if(!Object.hasOwn(data,path))fail('VC_LEGACY_INTEGRATIONS','http_status',404);return structuredClone(data[path]);};
 return {ctx,card,manifest,p,data,seen,gh:read,vc:read,clock:()=>time};
}
function env(){const c=context();return {MODE:'preview-inspect',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:policy.repository,GITHUB_REPOSITORY_ID:String(policy.repositoryId),GITHUB_ACTOR_ID:String(policy.ownerId),GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:String(c.runId),GITHUB_REF:'refs/heads/'+policy.branch,GITHUB_SHA:c.sha,APPROVED_SHA:c.sha,DEPLOYMENT:'',PREVIEW_STARTS_AT:'',PREVIEW_EXPIRES_AT:''};}
test('phone card binds actual run, exact SHA and canonical manifest hash; no upload window or deployment authority',()=>{
 const ctx=inspectionContext(env()),card=inspectionCard(ctx,time);
 assert.equal(card.manifestSha256,hash(canonical(card.manifest)));
 assert.equal(card.comment,'APPROVE_NATIVE_PREFLIGHT_GET_ONLY '+ctx.runId+' '+ctx.sha+' '+policy.projectId+' '+(time+1800000)+' '+card.manifestSha256);
 assert.deepEqual(readManifest(ctx,canonical(card.manifest),time),card.manifest);
 assert.throws(()=>readManifest(ctx,' '+canonical(card.manifest),time));assert.throws(()=>readManifest(ctx,'null',time));assert.throws(()=>readManifest(ctx,'SYNTHETIC_PRIVATE',time));
 for(const patch of [{MODE:'preview-output'},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_EVENT_NAME:'push'},{GITHUB_REF:'refs/heads/main'},{GITHUB_ACTOR_ID:'1'},{GITHUB_REPOSITORY:'wrong/repo'},{DEPLOYMENT:'dpl_SYNTHETIC'},{PREVIEW_STARTS_AT:'2030-01-01'},{PREVIEW_EXPIRES_AT:'2030-01-01'},{APPROVED_SHA:'b'.repeat(40)}])assert.throws(()=>inspectionContext({...env(),...patch}));
 for(const now of [time-1,time+1800000,NaN])assert.throws(()=>inspectionAuthority(ctx,card.manifest,now));
 assert.throws(()=>inspectionAuthority(ctx,go(),time));
});
test('exact nine sequential GET catalog; legacy comparison cannot promote inspection to authority',async()=>{
 const f=fixture(),r=await evaluateInspection(f),plan=inspectionPlan(f.ctx);
 assert.equal(r.checksPassed,true);assert.equal(r.calls,9);assert.deepEqual(f.seen,plan.requests.map(x=>x.path));
 assert.equal(new Set(f.seen).size,9);assert.ok(plan.requests.every(x=>x.method==='GET'));
 assert.equal(r.decision,'HOLD_NO_DEPLOYMENT_AUTHORITY');assert.equal(r.activate,false);assert.equal(r.sourceGo,false);assert.equal(r.cliState,'not_started');
 assert.equal(r.results.at(-1).failure.httpStatus,404);
});
test('denied/malformed reads stop at every mandatory endpoint; no later or repeated request',async t=>{
 const ids=['GH_RUN','GH_ENVIRONMENT','GH_BRANCHES','GH_APPROVALS','VC_PROJECT','VC_ALIASES','VC_WEBHOOKS','VC_INTEGRATIONS'];
 for(let at=0;at<8;at++)for(const kind of ['denied','malformed'])await t.test(ids[at]+'/'+kind,async()=>{
  const f=fixture(),order=inspectionPlan(f.ctx).requests;let calls=0;
  const read=async path=>{calls++;if(path===order[at].path){if(kind==='denied')fail(ids[at],'http_status',403);return null;}return f.gh(path);};
  const r=await evaluateInspection({...f,gh:read,vc:read});assert.equal(r.checksPassed,false);const expected=kind==='malformed'&&(at===1||at===2)?4:at+1;assert.equal(calls,expected);assert.equal(r.calls,expected);assert.equal(r.activate,false);assert.equal(r.decision,'HOLD_NO_DEPLOYMENT_AUTHORITY');
  assert.equal(r.failure.cliState,'not_started');if(kind==='denied')assert.equal(r.failure.httpStatus,403);
 });
});
test('unclear integration access HOLD: global, malformed, missing scopes, paging, denied, timeout and 503',async()=>{
 for(const x of [null,{},[{}],[{projects:[]}],[{projects:null}],[{projects:['prj_OTHER'],projectSelection:'all'}],[{projects:[policy.projectId]}],{configurations:[],pagination:{next:'SYNTHETIC'}}]){
  const f=fixture();f.data[f.p.integrations]=x;const r=await evaluateInspection(f);assert.equal(r.checksPassed,false);assert.equal(r.calls,8);assert.equal(r.activate,false);
 }
 for(const [reason,status]of [['http_status',401],['http_status',403],['http_status',404],['http_status',429],['http_status',503],['timeout',undefined]]){
  const f=fixture(),read=async p=>{if(p===f.p.integrations)fail('VC_INTEGRATIONS',reason,status);return f.vc(p);};const r=await evaluateInspection({...f,vc:read});assert.equal(r.calls,8);assert.equal(r.failure.check,'VC_INTEGRATIONS');assert.equal(r.failure.reason,reason);assert.equal(r.checksPassed,false);
 }
});
test('manifest-bound comment, wrong owner, bypass, branch, replay, clock and run identity fail before Vercel credential use',async()=>{
 for(const scenario of ['comment','hash','owner','bypass','self-review','branch','tag','attempt','sha','workflow','run-status','expiry']){
  const f=fixture();if(scenario==='comment')f.data[f.p.reviews][0].comment+=' SYNTHETIC';if(scenario==='hash')f.data[f.p.reviews][0].comment=f.card.comment.slice(0,-64)+'0'.repeat(64);if(scenario==='owner')f.data[f.p.reviews][0].user.id=1;
  if(scenario==='bypass')f.data[f.p.environment].can_admins_bypass=true;if(scenario==='self-review')f.data[f.p.environment].protection_rules[0].prevent_self_review=true;if(scenario==='branch')f.data[f.p.branches].branch_policies[0].name='*';if(scenario==='tag')f.data[f.p.branches].branch_policies[0].type='tag';
  if(scenario==='attempt')f.ctx.attempt=2;if(scenario==='sha')f.data[f.p.run].head_sha='b'.repeat(40);if(scenario==='workflow')f.data[f.p.run].workflow_id++;if(scenario==='run-status')f.data[f.p.run].status='completed';if(scenario==='expiry')f.clock=()=>f.manifest.expiresAt;
  let vcCalls=0;const r=await evaluateInspection({...f,vc:async p=>{vcCalls++;return f.vc(p);}});assert.equal(r.checksPassed,false,scenario);assert.equal(vcCalls,0,scenario);
 }
});
test('no body, response, error, URL, token or unsanitized shape can escape results',async()=>{
 const marker='SYNTHETIC_PRIVATE_RESPONSE_TOKEN_URL_STACK';const f=fixture();const r=await evaluateInspection({...f,vc:async()=>{throw Object.assign(Error(marker),{toJSON(){return marker}})}});assert.doesNotMatch(JSON.stringify(r),new RegExp(marker));assert.equal(r.failure.check,'VC_PROJECT');assert.equal(safeFailure(Error(marker)).check,'UNCLASSIFIED');
});
test('bound native transport completes nine GETs while all write/decrypt/subprocess capabilities throw',async t=>{
 const f=fixture(),card=inspectionCard(f.ctx,Date.now()),c=controls(card.comment),seen=[];
 f.data[f.p.reviews]=c.reviews;
 const forbidden=()=>{throw Error('SYNTHETIC_FORBIDDEN_CAPABILITY_REACHED');};
 const hooks=[];for(const [module,names]of [[fs,['writeFileSync','appendFileSync','writeFile','appendFile','createWriteStream','unlinkSync']],[crypto,['createDecipheriv','createCipheriv']],[cp,['exec','execSync','execFile','execFileSync','spawn','spawnSync']]])for(const name of names)hooks.push(t.mock.method(module,name,forbidden));
 hooks.push(t.mock.method(https,'request',(options,callback)=>{
  assert.equal(options.method,'GET');assert.equal(options.port,443);assert.ok(['api.github.com','api.vercel.com'].includes(options.hostname));assert.equal(options.servername,options.hostname);seen.push(options.path);
  const req=new EventEmitter();req.destroy=()=>{};req.end=()=>queueMicrotask(()=>{
   const socket=new EventEmitter();Object.assign(socket,{authorized:true,servername:options.hostname,getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:'+options.hostname})});req.emit('socket',socket);socket.emit('secureConnect');
   const response=new EventEmitter();Object.assign(response,{statusCode:Object.hasOwn(f.data,options.path)?200:404,headers:{'content-type':'application/json'},complete:true,destroy(){}});callback(response);response.emit('data',Buffer.from(JSON.stringify(f.data[options.path]??{SYNTHETIC_PRIVATE:'never log body'})));response.emit('end');
  });return req;
 }));
 try{
  const result=await runReadOnlyInspection(f.ctx,card.manifest,'SYNTHETIC_GITHUB_TOKEN_1234567890','SYNTHETIC_VERCEL_TOKEN_1234567890');
  assert.equal(result.checksPassed,true);assert.equal(seen.length,9);assert.equal(new Set(seen).size,9);assert.equal(result.activate,false);assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC_PRIVATE|SYNTHETIC_FORBIDDEN|TOKEN_123/);
 }finally{for(const hook of hooks)hook.mock.restore();}
});
