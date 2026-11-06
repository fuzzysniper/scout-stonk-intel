// Offline operational-packet checks only. All GitHub objects here are explicitly SYNTHETIC.
import test from 'node:test';import assert from 'node:assert/strict';import https from 'node:https';import {EventEmitter} from 'node:events';
import {need,canonical,hash,environment,approvedEnvironment,ownerReview,rehearsalRecord,rehearsalPacket,allowed,reader,auditRehearsal} from '../../ops/native-pilot-admission/publisher.mjs';
const clone=structuredClone,owner={id:58099771,login:'fuzzysniper',type:'User'};
const context={sha:'a'.repeat(40),tree:'b'.repeat(40),branch:'native-pilot/review-rehearsal',runId:12345,workflowSha256:hash('SYNTHETIC WORKFLOW'),scriptSha256:hash('SYNTHETIC SCRIPT')};
const record=rehearsalRecord(context,{id:45678,sha256:'c'.repeat(64)}),packet=rehearsalPacket(record);
const env={id:9999,name:environment('rehearsal'),can_admins_bypass:false,protection_rules:[{type:'required_reviewers',prevent_self_review:false,reviewers:[{type:'User',reviewer:owner}]}],deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}};
const branch={total_count:1,branch_policies:[{name:context.branch,type:'branch'}]};
const reviews=[{state:'approved',user:owner,comment:packet.comment,environments:[{id:env.id,name:env.name}]}];
test('non-authorizing rehearsal is isolated from both native admission protocols and task/config/artifact namespaces',()=>{
 assert.equal(record.admissionEligible,false);assert.equal(record.sourceGo,false);assert.equal(packet.body.production_environment,false);
 assert.notEqual(record.version,'native-pilot-setup/1');assert.notEqual(record.version,'native-pilot-source/1');assert.equal(packet.body.environment,'native-pilot-review-rehearsal');assert.ok(packet.comment.startsWith('REHEARSE_NATIVE_REVIEW_ONCE '));
 assert.equal(Object.hasOwn(record,'database'),false);assert.equal(Object.hasOwn(record,'owner'),false);assert.equal(Object.hasOwn(record,'checkpoint'),false);
});
test('sole actual owner branch protection and matching review required',()=>{assert.equal(approvedEnvironment(env,branch,context.branch),true);assert.equal(ownerReview(reviews,env,packet.comment),true);});
for(const [label,fn]of Object.entries({bypass:e=>e.can_admins_bypass=true,'extra reviewer':e=>e.protection_rules[0].reviewers.push({type:'Team',reviewer:{id:1}}),'no reviewer':e=>e.protection_rules=[],'self review semantics drift':e=>e.protection_rules[0].prevent_self_review=true,'protected all branches':e=>e.deployment_branch_policy.protected_branches=true,'unknown rule':e=>e.protection_rules.push({type:'wait_timer'})}))test('environment rejects '+label,()=>{const e=clone(env);fn(e);assert.throws(()=>approvedEnvironment(e,branch,context.branch));});
for(const name of ['main','native-pilot/*','*'])test('exact rehearsal branch rejects '+name,()=>{const b=clone(branch);b.branch_policies[0].name=name;assert.throws(()=>approvedEnvironment(env,b,context.branch));});
for(const [label,fn]of Object.entries({'wrong owner':r=>r[0].user.id++,'bot':r=>r[0].user.type='Bot','hash substitution':r=>r[0].comment+='0','wrong environment':r=>r[0].environments[0].id++,'rejected':r=>r[0].state='rejected','ambiguous':r=>r.push(clone(r[0]))}))test('review rejects '+label,()=>{const r=clone(reviews);fn(r);assert.throws(()=>ownerReview(r,env,packet.comment));});
for(const suffix of ['/actions/workflows/x/dispatches','/actions/secrets','/hooks','/environments/x','/actions/variables/UNFARMD_NATIVE_REHEARSAL_12345','/git/refs/heads/main'])test('publisher cannot write '+suffix,()=>assert.equal(allowed('POST',suffix),false));
test('no Vercel, SQL, Helius or arbitrary host path in the publisher API',()=>{for(const suffix of ['https://api.github.com','https://mainnet.helius-rpc.com','/repos/other/project/deployments','/deployments\r\nX: y'])assert.equal(allowed('GET',suffix),false);assert.throws(()=>environment('production'));});
function responseMap(){
 const bot={id:41898282,login:'github-actions[bot]',type:'Bot'},base='/actions/runs/'+context.runId;
 const d={id:123456,sha:context.sha,ref:context.sha,task:packet.body.task,environment:env.name,production_environment:false,transient_environment:true,creator:bot,payload:packet.body.payload};
 return new Map([
  [base,{id:context.runId,head_sha:context.sha,head_branch:context.branch,path:'.github/workflows/native-pilot-admission.yml',event:'workflow_dispatch',status:'completed',conclusion:'success',repository:{id:1415026436},head_repository:{id:1415026436}}],
  ['/actions/artifacts/45678',{id:45678,name:'native-pilot-review-rehearsal-'+context.runId,expired:false,digest:'sha256:'+record.artifactSha256,workflow_run:{id:context.runId,head_sha:context.sha,head_branch:context.branch,repository_id:1415026436,head_repository_id:1415026436}}],
  ['/actions/variables/UNFARMD_NATIVE_REHEARSAL_'+context.runId,{name:'UNFARMD_NATIVE_REHEARSAL_'+context.runId,value:canonical(record)}],
  ['/environments/'+env.name,env],['/environments/'+env.name+'/deployment-branch-policies?per_page=2',branch],[base+'/approvals',reviews],
  ['/deployments?'+new URLSearchParams({sha:context.sha,environment:env.name,task:packet.body.task,per_page:'2'}),[d]],
  ['/deployments/123456/statuses?per_page=2',[{state:'success',environment:env.name,creator:bot,log_url:'https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/'+context.runId}]],
  ['/contents/.github/workflows/native-pilot-admission.yml?ref='+context.sha,{type:'file',path:'.github/workflows/native-pilot-admission.yml',encoding:'base64',content:Buffer.from('SYNTHETIC WORKFLOW').toString('base64')}]
 ].map(([k,v])=>[k,clone(v)]));
}
test('postrun audit uses 18 GETs and returns NO native authority or Vercel/UI latency claim',async()=>{const responses=responseMap();let count=0;const r=await auditRehearsal(context,45678,async(m,p)=>{assert.equal(m,'GET');assert.ok(allowed(m,p));count++;return clone(responses.get(p));},()=>1000);assert.equal(count,18);assert.equal(r.setupAdmission,false);assert.equal(r.sourceCalls,false);assert.equal(r.vercelLatencyProven,false);});
for(const label of ['unfinished run','wrong artifact','old private record','changed owner','duplicate publication','inactive publication','wrong workflow','budget exceeded'])test('postrun audit fails closed on '+label,async()=>{
 const responses=responseMap();const keys=[...responses.keys()];
 if(label==='unfinished run')responses.get(keys[0]).status='in_progress';
 if(label==='wrong artifact')responses.get(keys[1]).workflow_run.id++;
 if(label==='old private record')responses.get(keys[2]).value+=' ';
 if(label==='changed owner')responses.get(keys[5])[0].user.id++;
 if(label==='duplicate publication')responses.get(keys[6]).push(clone(responses.get(keys[6])[0]));
 if(label==='inactive publication')responses.get(keys[7])[0].state='inactive';
 if(label==='wrong workflow')responses.get(keys[8]).content=Buffer.from('OTHER').toString('base64');
 let at=0;await assert.rejects(()=>auditRehearsal(context,45678,async(_,p)=>clone(responses.get(p)),()=>label==='budget exceeded'?(at++?4001:0):0));
});
for(const mode of ['ok','forbidden','redirect','wrong TLS','oversized'])test('SYNTHETIC fixed-host transport '+mode+' has one attempt and categorical errors',async()=>{
 const original=https.request;let attempts=0;
 https.request=(o,callback)=>{attempts++;assert.equal(o.hostname,'api.github.com');assert.equal(o.rejectUnauthorized,true);assert.equal(o.method,'GET');const q=new EventEmitter();q.destroy=()=>{q.destroyed=true;};q.end=()=>queueMicrotask(()=>{
  const socket=new EventEmitter();Object.assign(socket,{encrypted:true,authorized:mode!=='wrong TLS',servername:'api.github.com',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:api.github.com',subject:{CN:'api.github.com'}})});q.emit('socket',socket);socket.emit('secureConnect');if(q.destroyed)return;
  const r=new EventEmitter();Object.assign(r,{statusCode:mode==='forbidden'?403:mode==='redirect'?302:200,headers:{'content-type':'application/json'},complete:true,destroy(){this.destroyed=true;}});callback(r);if(!r.destroyed){r.emit('data',Buffer.from(mode==='oversized'?'X'.repeat(65537):'[]'));if(!r.destroyed)r.emit('end');}
 });return q;};
 try{const read=reader('SYNTHETIC_ONLY_NOT_A_CREDENTIAL');if(mode==='ok')assert.deepEqual(await read('GET','/actions/runs/12345'),[]);else await assert.rejects(()=>read('GET','/actions/runs/12345'),e=>e.message==='NATIVE_PUBLISH_HOLD');assert.equal(attempts,1);}finally{https.request=original;}
});
