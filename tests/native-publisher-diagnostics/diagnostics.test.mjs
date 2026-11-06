// OFFLINE ONLY. Every API response and transport below is SYNTHETIC.
// Real public incident identifiers are labels, never claims of live responses.
// The original publisher is unchanged; the temporary copy only exports publish.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const baseBlob='d969ce8e33ca4ad7b043de3c9d0f17a1dc273102';
const baselineSource=fs.readFileSync(new URL('../../node_modules/.cache/native-publisher-diagnostics/publisher.baseline',import.meta.url),'utf8');
const targetSource=fs.readFileSync(new URL('../../ops/native-pilot-admission/publisher.mjs',import.meta.url),'utf8');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'native-diagnostic-tests-'));
async function load(source,name){
 const filename=path.join(temporary,name+'.mjs');
 fs.writeFileSync(filename,source.replace('async function publish(c,stage', 'export async function publish(c,stage').replace('function context(){','export function context(){'));
 return import(pathToFileURL(filename).href);
}
const baseline=await load(baselineSource,'baseline'),current=await load(targetSource,'current');
const {canonical,rehearsalRecord,rehearsalPacket,ownerReview,context}=current;
process.once('exit',()=>fs.rmSync(temporary,{recursive:true,force:true}));

const root='/repos/fuzzysniper/scout-stonk-intel';
// Public incident identifiers are fixture labels; all responses below remain synthetic.
const record={version:'native-pilot-approval-rehearsal/1',admissionEligible:false,sourceGo:false,repository:'fuzzysniper/scout-stonk-intel',repositoryId:1415026436,commit:'0a5abd56faa4fbb7aa0049f0207d139a23c051f6',tree:'b06e9a479c07acb8d484c01eb840ccde8ce32d82',branch:'native-pilot/review-rehearsal',runId:42293408658,workflowSha256:'1bf53bd8e6609fdd03cb862cb0d37caae02605e0295c7beadd8ec1adae20ed11',scriptSha256:'6f342a4a7b4e73e41c7ebb4b6fcc2b9e74f00b3f702cb22f1db5e487f3605f60',artifactId:13541200379,artifactSha256:'5b2552bdb08748cc08dd72310f2c288cba31c47e61babbefc488bab8be2a2747'};
const c={sha:record.commit,tree:record.tree,branch:record.branch,runId:record.runId,workflowSha256:record.workflowSha256,scriptSha256:record.scriptSha256};
const manifest=rehearsalRecord(c,{id:record.artifactId,sha256:record.artifactSha256});
const packet=rehearsalPacket(manifest);
const owner={login:'fuzzysniper',id:58099771,type:'User'};
const bot={login:'github-actions[bot]',id:41898282,type:'Bot'};
const envName='native-pilot-review-rehearsal';
const variableName='UNFARMD_NATIVE_REHEARSAL_'+c.runId;

function fixtures(){
 const env={id:26506985994,name:envName,can_admins_bypass:false,
  protection_rules:[{type:'required_reviewers',prevent_self_review:false,reviewers:[{type:'User',reviewer:owner}]}],
  deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}};
 return new Map([
  ['/actions/runs/'+c.runId,{id:c.runId,head_sha:c.sha,head_branch:c.branch,path:'.github/workflows/native-pilot-admission.yml',event:'workflow_dispatch',status:'in_progress',repository:{id:1415026436},head_repository:{id:1415026436}}],
  ['/actions/runs/'+c.runId+'/approvals',[{state:'approved',user:owner,comment:packet.comment,environments:[{id:env.id,name:envName}]}]],
  ['/environments/'+envName,env],
  ['/environments/'+envName+'/deployment-branch-policies?per_page=2',{total_count:1,branch_policies:[{type:'branch',name:c.branch}]}],
  ['/actions/artifacts/'+record.artifactId,{id:record.artifactId,expired:false,digest:'sha256:'+record.artifactSha256,name:envName+'-'+c.runId,workflow_run:{id:c.runId,head_sha:c.sha,head_branch:c.branch,repository_id:1415026436,head_repository_id:1415026436}}],
  ['/actions/variables/'+variableName,{name:variableName,value:canonical(manifest)}]
 ].map(([k,v])=>[k,structuredClone(v)]));
}

async function exercise(kind='success',mutate=()=>{},implementation=current,sink){
 const data=fixtures();mutate(data);
 const attempts=[],accepted=[],out=[],events=[],eventTrace=[];
 const diagnostics=implementation.createDiagnostics?.(r=>{events.push(r);eventTrace.push({record:r,posts:attempts.filter(a=>a.method==='POST').length});if(sink)sink(r);});
 // This automatic Actions deployment intentionally coexists with explicit rows.
 const rows=[{id:70001,sha:c.sha,environment:envName,task:'deploy',payload:{},creator:bot}];
 if(kind==='prior_explicit')rows.push({id:70002,sha:c.sha,environment:envName,task:packet.body.task,payload:packet.body.payload,creator:bot});
 const original=https.request,originalLog=console.log;
 process.env.NATIVE_PUBLISH_OPERATION='metadata-only-owner-approved';
 process.env.NATIVE_ADMISSION_READ_TOKEN=kind==='bad_read_format'?'INVALID':'SYNTHETIC_READ_TOKEN_NOT_A_CREDENTIAL';
 process.env.GITHUB_TOKEN=kind==='bad_write_format'?'INVALID':'SYNTHETIC_WRITE_TOKEN_NOT_A_CREDENTIAL';
 process.env.REHEARSAL_ARTIFACT_ID=String(record.artifactId);
 process.env.REHEARSAL_ARTIFACT_SHA=record.artifactSha256;
 delete process.env.DEPLOYMENT;
 console.log=(...a)=>out.push(a.join(' '));
 https.request=(options,callback)=>{
  assert.equal(options.hostname,'api.github.com');assert.equal(options.servername,'api.github.com');
  assert.equal(options.rejectUnauthorized,true);assert.equal(options.agent,false);
  assert.equal(options.minVersion,'TLSv1.2');assert.ok(options.path.startsWith(root+'/'));
  const req=new EventEmitter();req.destroy=()=>{req.destroyed=true;};
  if(kind==='request_build_secret')throw Error('SYNTHETIC_PRIVATE_ERROR_MARKER https://invalid.test/?token=SECRET');
  req.end=body=>{
   const method=options.method,suffix=options.path.slice(root.length);
   attempts.push({method,suffix});
   queueMicrotask(()=>{
    if(req.destroyed)return;
    const socket=new EventEmitter();Object.assign(socket,{encrypted:true,authorized:kind!=='bad_tls',servername:'api.github.com',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:api.github.com',subject:{CN:'api.github.com'}})});
    req.emit('socket',socket);socket.emit('secureConnect');if(req.destroyed)return;
    if(kind==='read_reset'&&method==='GET'){req.emit('error',new Error('SYNTHETIC_PRIVATE_ERROR_MARKER https://invalid.test/?token=SECRET')); return;}
    if(kind==='read_timeout'&&suffix==='/environments/'+envName)return;
    let status=method==='GET'?200:201,response,headers={'content-type':'application/json'};
    if(method==='GET'){
     if(suffix.startsWith('/deployments?')){
      const query=new URLSearchParams(suffix.split('?')[1]);
      response=rows.filter(r=>r.sha===query.get('sha')&&r.environment===query.get('environment')&&r.task===query.get('task'));
     }else response=data.get(suffix);
     if(/^http_/.test(kind)&&suffix==='/environments/'+envName)status=Number(kind.slice(5));
     const denied={deny_run:'/actions/runs/'+c.runId,deny_reviews:'/actions/runs/'+c.runId+'/approvals',deny_environment:'/environments/'+envName,deny_branch_policy:'/environments/'+envName+'/deployment-branch-policies?per_page=2',deny_artifact:'/actions/artifacts/'+record.artifactId,deny_variable:'/actions/variables/'+variableName};
     if(suffix===denied[kind]||kind==='deny_prior'&&suffix.startsWith('/deployments?'))status=403;
     if(kind==='link_header'&&suffix==='/environments/'+envName)headers.link='<SYNTHETIC_NEXT_PAGE>; rel="next"';
     if(kind==='content_type')headers['content-type']='text/plain; SYNTHETIC_PRIVATE_HEADER';
     if(kind==='encoding')headers['content-encoding']='gzip';
    }else if(suffix==='/deployments'){
     const input=JSON.parse(body.toString());
     assert.deepEqual(input,packet.body);assert.equal(input.production_environment,false);assert.equal(input.transient_environment,true);
     if(kind==='create_denied')status=403;
     else{
      response={...structuredClone(input),id:80001,sha:c.sha,creator:kind==='wrong_write_identity'?{id:1,login:'SYNTHETIC_OTHER'}:bot};
      rows.push(response);accepted.push('create');
      if(kind==='lost_create_ack'){req.emit('error',new Error('SYNTHETIC_PRIVATE_ACK_ERROR_MARKER')); return;}
      if(kind==='create_timeout')return;
     }
    }else if(suffix==='/deployments/80001/statuses'){
     const input=JSON.parse(body.toString());assert.equal(input.auto_inactive,false);
     if(kind==='status_denied')status=403;
     else{
      accepted.push('status');response={id:80002,...input,creator:bot};
      if(kind==='lost_status_ack'){req.emit('error',new Error('SYNTHETIC_PRIVATE_ACK_ERROR_MARKER')); return;}
      if(kind==='status_timeout')return;
     }
    }else assert.fail('Unexpected method/path');
    const res=new EventEmitter();Object.assign(res,{statusCode:status,headers,complete:kind!=='incomplete',destroy(){this.destroyed=true;}});
    callback(res);if(res.destroyed)return;
    let bytes=Buffer.from(JSON.stringify(response??{message:'SYNTHETIC_ERROR'}));
    if(kind==='invalid_json'&&method==='GET')bytes=Buffer.from('{SYNTHETIC_SECRET_LIKE_TEXT_NEVER_LOGGED');
    if(kind==='oversize'&&method==='GET')bytes=Buffer.alloc(65537,88);
    if(kind==='empty')bytes=Buffer.alloc(0);
    if(kind==='invalid_utf8')bytes=Buffer.from([255]);
    res.emit('data',bytes);if(!res.destroyed)res.emit('end');
   });
  };
  return req;
 };
 let error;
 try{await implementation.publish(c,'rehearsal',diagnostics);}catch(e){error=e;diagnostics?.report(e);}
 finally{https.request=original;console.log=originalLog;delete process.env.NATIVE_ADMISSION_READ_TOKEN;delete process.env.GITHUB_TOKEN;delete process.env.NATIVE_PUBLISH_OPERATION;delete process.env.REHEARSAL_ARTIFACT_ID;delete process.env.REHEARSAL_ARTIFACT_SHA;}
 return {attempts,accepted,out,rows,error,events,eventTrace,state:diagnostics?.snapshot(),posts:attempts.filter(a=>a.method==='POST')};
}

test('exact source and reconstructed incident manifest retain approved hashes',()=>{
 const source=baselineSource;
 assert.equal(createHash('sha256').update(source).digest('hex'),'6f342a4a7b4e73e41c7ebb4b6fcc2b9e74f00b3f702cb22f1db5e487f3605f60');
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),baseBlob);
 assert.equal(packet.manifestSha256,'a7da74bfb34d14c04de8412053ca5d26f308785511188115a292268efb331032');
 assert.equal(manifest.admissionEligible,false);assert.equal(manifest.sourceGo,false);
});

test('verified public incident approval subset remains accepted; fixture performs no hosted approval',()=>{
 const reviews=[{state:'approved',user:owner,comment:packet.comment,environments:[{id:26506985994,name:envName,can_admins_bypass:false}]}];
 assert.equal(reviews[0].environments[0].can_admins_bypass,false);
 assert.equal(ownerReview(reviews,reviews[0].environments[0],packet.comment),true);
});

test('unchanged original context guard can produce the same HOLD before Git or HTTPS work',()=>{
 const prior=process.env.GITHUB_REPOSITORY;
 process.env.GITHUB_REPOSITORY='SYNTHETIC_WRONG_REPOSITORY';
 try{assert.throws(()=>context(),e=>e.message==='NATIVE_PUBLISH_HOLD');}
 finally{if(prior===undefined)delete process.env.GITHUB_REPOSITORY;else process.env.GITHUB_REPOSITORY=prior;}
});

for(const kind of ['bad_read_format','bad_write_format','http_401','http_403','http_404','http_429','http_503','bad_tls','read_reset','read_timeout','link_header','invalid_json','oversize','prior_explicit']){
 test('SYNTHETIC '+kind+' holds without making any explicit POST',async()=>{
  const r=await exercise(kind);assert.equal(r.error?.message,'NATIVE_PUBLISH_HOLD');assert.equal(r.posts.length,0);assert.equal(r.accepted.length,0);
  assert.deepEqual(r.out,[]);assert.equal(r.rows[0].task,'deploy');
 });
}
const mutations={
 run_contract:m=>m.get('/actions/runs/'+c.runId).path='SYNTHETIC_WRONG_WORKFLOW',
 missing_admin_bypass_field:m=>delete m.get('/environments/'+envName).can_admins_bypass,
 bypass_enabled:m=>m.get('/environments/'+envName).can_admins_bypass=true,
 self_review_drift:m=>m.get('/environments/'+envName).protection_rules[0].prevent_self_review=true,
 extra_reviewer:m=>m.get('/environments/'+envName).protection_rules[0].reviewers.push({type:'Team',reviewer:{id:1}}),
 extra_branch:m=>m.get('/environments/'+envName+'/deployment-branch-policies?per_page=2').total_count=2,
 wrong_branch:m=>m.get('/environments/'+envName+'/deployment-branch-policies?per_page=2').branch_policies[0].name='main',
 expired_artifact:m=>m.get('/actions/artifacts/'+record.artifactId).expired=true,
 wrong_artifact_owner:m=>m.get('/actions/artifacts/'+record.artifactId).workflow_run.repository_id++,
 variable_trailing_newline:m=>m.get('/actions/variables/'+variableName).value+='\n',
 variable_spaces:m=>m.get('/actions/variables/'+variableName).value=JSON.stringify(manifest,null,2),
 variable_absent_value:m=>delete m.get('/actions/variables/'+variableName).value,
 wrong_owner_approval:m=>m.get('/actions/runs/'+c.runId+'/approvals')[0].comment+='0',
};
for(const [name,mutate]of Object.entries(mutations))test('SYNTHETIC '+name+' holds before explicit POST',async()=>{
 const r=await exercise(name,mutate);assert.equal(r.error?.message,'NATIVE_PUBLISH_HOLD');assert.equal(r.posts.length,0);assert.equal(r.accepted.length,0);assert.deepEqual(r.out,[]);
});
for(const [kind,count,accepted]of [['create_denied',1,[]],['lost_create_ack',1,['create']],['wrong_write_identity',1,['create']],['status_denied',2,['create']],['lost_status_ack',2,['create','status']]]){
 test('SYNTHETIC '+kind+' produces the SAME HOLD despite '+count+' POST attempts',async()=>{
  const r=await exercise(kind);assert.equal(r.error?.message,'NATIVE_PUBLISH_HOLD');assert.equal(r.posts.length,count);assert.deepEqual(r.accepted,accepted);assert.deepEqual(r.out,[]);
  assert.equal(r.rows[0].task,'deploy');if(accepted.includes('create'))assert.equal(r.rows[1].task,'native-pilot-review-rehearsal:42293408658');
 });
}
test('SYNTHETIC valid controls allow exactly two explicit POSTs alongside the separate automatic record',async()=>{
 const r=await exercise();assert.equal(r.error,undefined);assert.equal(r.posts.length,2);assert.deepEqual(r.accepted,['create','status']);
 assert.equal(r.rows.length,2);assert.equal(r.rows[0].task,'deploy');assert.equal(r.rows[1].task,packet.body.task);
 const result=JSON.parse(r.out[0]);assert.equal(result.activate,false);assert.equal(result.sourceCalls,false);assert.equal(result.admissionVerified,false);
});

const transportCases=['success','bad_read_format','bad_write_format','http_401','http_403','http_404','http_429','http_503','bad_tls','read_reset','read_timeout','link_header','invalid_json','oversize','prior_explicit','create_denied','lost_create_ack','wrong_write_identity','status_denied','lost_status_ack','request_build_secret','deny_run','deny_reviews','deny_environment','deny_branch_policy','deny_artifact','deny_variable','deny_prior','content_type','encoding','incomplete','empty','invalid_utf8','create_timeout','status_timeout'];
for(const kind of [...transportCases,...Object.keys(mutations)])test('behavior parity with immutable publisher blob: '+kind,async()=>{
 const mutate=mutations[kind]??(()=>{}),a=await exercise(kind,mutate,baseline),b=await exercise(kind,mutate,current);
 assert.equal(b.error?.message,a.error?.message);assert.deepEqual(b.attempts,a.attempts);assert.deepEqual(b.accepted,a.accepted);assert.deepEqual(b.rows,a.rows);assert.deepEqual(b.out,a.out);
 for(const event of b.events){
  assert.deepEqual(Object.keys(event).sort(),(event.httpStatus===undefined?(event.category===undefined?['kind','phase','event','writes','activate']:['kind','phase','event','writes','activate','category']):['kind','phase','event','writes','activate','category','httpStatus']).sort());
  assert.equal(event.activate,false);assert.equal(event.kind,'NATIVE_PUBLISH_DIAGNOSTIC');
  assert.doesNotMatch(JSON.stringify(event),/SYNTHETIC|https?:|Bearer|github_pat_|NATIVE_ADMISSION_READ_TOKEN|42293408658|0a5abd56|5b2552bd/);
 }
});

for(const [kind,phase,category,status]of [
 ['bad_read_format','read_binding','binding_invalid'],['bad_write_format','write_binding','binding_invalid'],
 ['deny_run','get_run','http_status',403],['deny_reviews','get_reviews','http_status',403],['deny_environment','get_environment','http_status',403],['deny_branch_policy','get_branch_policy','http_status',403],['deny_artifact','get_artifact','http_status',403],['deny_variable','get_variable','http_status',403],['deny_prior','get_prior_deployments','http_status',403],
 ['http_404','get_environment','http_status',404],['http_429','get_environment','http_status',429],['http_503','get_environment','http_status',503],
 ['bad_tls','get_run','tls_verification'],['read_reset','get_run','network'],['read_timeout','get_environment','timeout'],['request_build_secret','get_run','request_build'],['invalid_json','get_run','response_json'],['invalid_utf8','get_run','response_json'],['link_header','get_environment','pagination'],['oversize','get_run','response_size'],['content_type','get_run','response_headers'],['encoding','get_run','response_headers'],['empty','get_run','response_framing'],['incomplete','get_run','response_framing'],
 ['variable_trailing_newline','variable_contract','guard_failed'],['variable_spaces','variable_contract','guard_failed'],['wrong_owner_approval','owner_review','guard_failed'],['missing_admin_bypass_field','environment_contract','guard_failed'],['prior_explicit','prior_deployments_contract','guard_failed']
])test('failure classified without writing: '+kind,async()=>{
 const r=await exercise(kind,mutations[kind]??(()=>{}));assert.equal(r.posts.length,0);
 const failure=r.events.at(-1);assert.equal(failure.phase,phase);assert.equal(failure.category,category);assert.equal(failure.httpStatus,status);assert.deepEqual(failure.writes,{deployment:'not_started',status:'not_started'});
});

for(const [kind,expected]of [
 ['create_denied',{deployment:'started_unconfirmed',status:'not_started'}],
 ['lost_create_ack',{deployment:'started_unconfirmed',status:'not_started'}],
 ['create_timeout',{deployment:'started_unconfirmed',status:'not_started'}],
 ['wrong_write_identity',{deployment:'started_unconfirmed',status:'not_started'}],
 ['status_denied',{deployment:'acknowledged',status:'started_unconfirmed'}],
 ['lost_status_ack',{deployment:'acknowledged',status:'started_unconfirmed'}],
 ['status_timeout',{deployment:'acknowledged',status:'started_unconfirmed'}]
])test('write state remains conservative, never reset or retried: '+kind,async()=>{
 const r=await exercise(kind);assert.equal(r.error?.message,'NATIVE_PUBLISH_HOLD');assert.deepEqual(r.state,expected);assert.deepEqual(r.events.at(-1).writes,expected);
 assert.ok(r.posts.length<=2);assert.equal(r.events.some(e=>e.phase==='complete'),false);
});

test('intent is emitted before each existing POST; snapshots cannot authorize or alter requests',async()=>{
 const r=await exercise('success');
 assert.deepEqual(r.state,{deployment:'acknowledged',status:'acknowledged'});
 const ready=r.eventTrace.find(t=>t.record.phase==='preflight_complete'&&t.record.event==='passed');assert.equal(ready.posts,0);
 const intents=r.eventTrace.filter(t=>t.record.event==='intent');assert.equal(intents.length,2);
 assert.equal(intents[0].posts,0);assert.deepEqual(intents[0].record.writes,{deployment:'started_unconfirmed',status:'not_started'});
 assert.equal(intents[1].posts,1);assert.deepEqual(intents[1].record.writes,{deployment:'acknowledged',status:'started_unconfirmed'});
 assert.ok(Object.isFrozen(intents[0].record));assert.ok(Object.isFrozen(intents[0].record.writes));
});

test('failed diagnostic sink creates no fallback I/O and changes no authorization or request sequence',async()=>{
 const a=await exercise('success',()=>{},baseline),b=await exercise('success',()=>{},current,()=>{throw Error('SYNTHETIC_PRIVATE_SINK_ERROR');});
 assert.equal(b.error,undefined);assert.deepEqual(b.attempts,a.attempts);assert.deepEqual(b.out,a.out);assert.deepEqual(b.accepted,a.accepted);
});

test('diagnostics never inspect or serialize hostile error fields or dynamic phase values',()=>{
 const output=[],d=current.createDiagnostics(r=>output.push(r));let reads=0;
 const error={get message(){reads++;throw Error('PRIVATE');},get stack(){reads++;throw Error('PRIVATE');},category:'SYNTHETIC_PRIVATE',phase:'https://private.invalid'};
 let caught;try{d.check('variable_contract',()=>{throw error;});}catch(e){caught=e;}
 assert.equal(caught,error);d.report(caught);assert.equal(reads,0);assert.doesNotMatch(JSON.stringify(output),/PRIVATE|https?:/);
 assert.equal(output.at(-1).category,'guard_failed');assert.equal(output.at(-1).phase,'variable_contract');
 const count=output.length;assert.throws(()=>d.check('SYNTHETIC_PRIVATE_PHASE',()=>assert.fail('must not run')));assert.equal(output.length,count);
});

test('importing the diagnostic publisher does not write files or initiate requests',async()=>{
 const names=['appendFileSync','writeFileSync','mkdirSync'];const saved=names.map(n=>fs[n]);const request=https.request;let calls=0;
 for(const n of names)fs[n]=()=>{calls++;throw Error('UNEXPECTED_IMPORT_IO');};
 https.request=()=>{calls++;throw Error('UNEXPECTED_IMPORT_NETWORK');};
 try{await import(pathToFileURL(path.join(temporary,'current.mjs')).href+'?import-only');assert.equal(calls,0);}
 finally{names.forEach((n,i)=>fs[n]=saved[i]);https.request=request;}
});

test('identity, policy, payload, URL allowlist and completed-run audit helpers are byte-identical',()=>{
 const blocks=[['export function canonical(', '\nexport function environment('],['export function environment(', '\nexport function approvedEnvironment('],['export function approvedEnvironment(', '\nexport function ownerReview('],['export function ownerReview(', '\nexport function rehearsalRecord('],['export function rehearsalRecord(', '\nexport function rehearsalPacket('],['export function rehearsalPacket(', '\nexport function allowed('],['export function allowed(', '\n// Real transport'],['function context(){','\nfunction artifactCheck('],['function artifactCheck(','\nconst output='],['export async function auditRehearsal(','\nasync function main(']];
 for(const [start,end]of blocks){const slice=s=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));assert.ok(baselineSource.includes(start)&&targetSource.includes(start));assert.equal(slice(targetSource),slice(baselineSource),start);}
});

test('every original need predicate remains present, including TLS/framing/binding and publication gates',()=>{
 function predicates(source){const out=[];const re=/\bneed\(/g;let m;while((m=re.exec(source))){let i=re.lastIndex,depth=1,quote;for(;i<source.length&&depth;i++){const c=source[i];if(quote){if(c==='\\')i++;else if(c===quote)quote=undefined;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='(')depth++;if(c===')')depth--;}assert.equal(depth,0);out.push(source.slice(re.lastIndex,i-1));re.lastIndex=i;}return out;}
 const remaining=predicates(targetSource);for(const predicate of predicates(baselineSource)){const i=remaining.indexOf(predicate);assert.notEqual(i,-1,predicate);remaining.splice(i,1);}
});
