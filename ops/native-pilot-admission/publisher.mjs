// UNAPPLIED operational publisher. GitHub metadata ONLY; never imported by the application.
// Importing this file does no I/O. No SQL, Vercel, provider, key creation or signature implementation.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {checkServerIdentity} from 'node:tls';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const REPO='fuzzysniper/scout-stonk-intel',ROOT='/repos/'+REPO;
const WF='.github/workflows/native-pilot-admission.yml',OWNER=58099771;
const SCRIPT='ops/native-pilot-admission/publisher.mjs';
const BASE='4c6c50b524489f5f0f98bb41e136d0a9bf7ec32e';
const HELD=()=>Error('NATIVE_PUBLISH_HOLD');
export function need(x){if(!x)throw HELD();}
export const hash=x=>createHash('sha256').update(x).digest('hex');
export function canonical(x){
 if(x===null||typeof x==='boolean'||typeof x==='string')return JSON.stringify(x);
 if(typeof x==='number'){need(Number.isSafeInteger(x));return String(x);}
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 need(x&&Object.getPrototypeOf(x)===Object.prototype);
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
export function environment(stage){need(['rehearsal','setup','source'].includes(stage));return stage==='rehearsal'?'native-pilot-review-rehearsal':'native-pilot-'+stage;}
export function approvedEnvironment(e,b,branch){
 need(e?.name&&e.can_admins_bypass===false&&e.deployment_branch_policy?.protected_branches===false&&e.deployment_branch_policy?.custom_branch_policies===true);
 const rules=e.protection_rules;need(Array.isArray(rules)&&rules.length>=1&&rules.length<=2);
 need(rules.every(r=>['required_reviewers','branch_policy'].includes(r.type)));
 const reviewers=rules.filter(r=>r.type==='required_reviewers');need(reviewers.length===1);
 const r=reviewers[0];need(r.prevent_self_review===false&&r.reviewers?.length===1&&r.reviewers[0].type==='User'&&r.reviewers[0].reviewer?.id===OWNER&&r.reviewers[0].reviewer?.login==='fuzzysniper');
 need(b?.total_count===1&&b.branch_policies?.length===1&&b.branch_policies[0].type==='branch'&&b.branch_policies[0].name===branch);return true;
}
export function ownerReview(reviews,env,comment){
 need(Array.isArray(reviews)&&reviews.length===1);const r=reviews[0];
 need(r.state==='approved'&&r.user?.id===OWNER&&r.user?.login==='fuzzysniper'&&r.user?.type==='User'&&r.comment===comment&&r.environments?.length===1&&r.environments[0].id===env.id&&r.environments[0].name===env.name);return true;
}
export function rehearsalRecord(c,artifact){
 need(Number.isSafeInteger(artifact.id)&&artifact.id>0&&/^[a-f0-9]{64}$/.test(artifact.sha256));
 return {version:'native-pilot-approval-rehearsal/1',admissionEligible:false,sourceGo:false,repository:REPO,repositoryId:1415026436,
  commit:c.sha,tree:c.tree,branch:c.branch,runId:c.runId,workflowSha256:c.workflowSha256,scriptSha256:c.scriptSha256,artifactId:artifact.id,artifactSha256:artifact.sha256};
}
export function rehearsalPacket(r){
 need(r.version==='native-pilot-approval-rehearsal/1'&&r.sourceGo===false&&r.admissionEligible===false);
 const sha=hash(canonical(r)),env=environment('rehearsal');return {
  comment:'REHEARSE_NATIVE_REVIEW_ONCE '+sha+' '+r.runId,
  body:{ref:r.commit,task:env+':'+r.runId,auto_merge:false,required_contexts:[],environment:env,transient_environment:true,production_environment:false,
   description:'NONAUTHORIZING source-OFF owner review',payload:{protocol:r.version,manifestSha256:sha,admissionEligible:false}},manifestSha256:sha};
}
export function allowed(method,suffix){
 if(method==='POST')return suffix==='/deployments'||/^\/deployments\/[1-9][0-9]{0,15}\/statuses$/.test(suffix);
 if(method!=='GET')return false;
 return /^\/actions\/(runs\/[1-9][0-9]{0,15}(\/approvals)?|artifacts\/[1-9][0-9]{0,15})$/.test(suffix)
  || /^\/environments\/native-pilot-(setup|source|review-rehearsal)(\/deployment-branch-policies\?per_page=2)?$/.test(suffix)
  || /^\/actions\/variables\/UNFARMD_NATIVE_(SETUP|SOURCE)_DPL_[A-Z0-9]{8,100}$/.test(suffix)
  || /^\/actions\/variables\/UNFARMD_NATIVE_REHEARSAL_[1-9][0-9]{0,15}$/.test(suffix)
  || /^\/deployments\?sha=[a-f0-9]{40}&environment=native-pilot-(setup|source|review-rehearsal)&task=native-pilot-(setup|source|review-rehearsal)%3A[A-Za-z0-9_]+&per_page=2$/.test(suffix)
  || /^\/deployments\/[1-9][0-9]{0,15}\/statuses\?per_page=2$/.test(suffix)
  || /^\/contents\/\.github\/workflows\/native-pilot-admission\.yml\?ref=[a-f0-9]{40}$/.test(suffix);
}
// Real transport only from the explicit operational CLI. No redirects, retries, pagination or logging bodies.
export function reader(token,signal){
 need(typeof token==='string'&&/^[A-Za-z0-9_]{20,512}$/.test(token));
 return (method,suffix,body)=>new Promise((resolve,reject)=>{
  need(allowed(method,suffix));let req,timer,done=false,authenticated=false,total=0;const chunks=[];
  const fail=()=>{if(done)return;done=true;clearTimeout(timer);req?.destroy();chunks.forEach(b=>b.fill(0));reject(HELD());};
  try{
   const bytes=body===undefined?null:Buffer.from(JSON.stringify(body));
   req=https.request({hostname:'api.github.com',servername:'api.github.com',port:443,path:ROOT+suffix,method,signal,agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity,maxHeaderSize:16384,
    headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','accept-encoding':'identity','user-agent':'unfarmd-native-owner-publisher','x-github-api-version':'2022-11-28',...(bytes?{'content-type':'application/json','content-length':bytes.length}:{})}},res=>{
     if(!authenticated||res.statusCode!==(method==='GET'?200:201)||res.headers.link||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'||!/^application\/json(?:;|$)/i.test(res.headers['content-type']??'')){res.destroy();fail();return;}
     res.on('data',b=>{total+=b.length;if(total>65536||chunks.length>=128){res.destroy();fail();}else chunks.push(Buffer.from(b));});res.on('aborted',fail);res.on('error',fail);
     res.on('end',()=>{if(done)return;try{need(total>0&&res.complete);const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));done=true;clearTimeout(timer);chunks.forEach(b=>b.fill(0));resolve(result);}catch{fail();}});
    });
   timer=setTimeout(fail,1200);req.on('error',fail);req.on('socket',s=>s.once('secureConnect',()=>{authenticated=s.encrypted&&s.authorized&&s.servername==='api.github.com'&&['TLSv1.2','TLSv1.3'].includes(s.getProtocol())&&!checkServerIdentity('api.github.com',s.getPeerCertificate());if(!authenticated)fail();}));req.end(bytes??undefined);
  }catch{fail();}
 });
}
function context(){
 const e=process.env,git=(...a)=>execFileSync('git',a,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 need(e.GITHUB_REPOSITORY===REPO&&e.GITHUB_REPOSITORY_ID==='1415026436'&&e.GITHUB_ACTOR_ID===String(OWNER)&&e.GITHUB_EVENT_NAME==='workflow_dispatch'&&e.GITHUB_RUN_ATTEMPT==='1');
 need(/^refs\/heads\/native-pilot\/[a-z0-9-]+$/.test(e.GITHUB_REF??'')&&/^[a-f0-9]{40}$/.test(e.APPROVED_SHA??'')&&e.GITHUB_SHA===e.APPROVED_SHA&&git('rev-parse','HEAD')===e.APPROVED_SHA);
 git('merge-base','--is-ancestor',BASE,'HEAD');need(!git('status','--porcelain','--untracked-files=normal'));
 const runId=Number(e.GITHUB_RUN_ID);need(Number.isSafeInteger(runId)&&runId>0);
 return {sha:e.GITHUB_SHA,tree:git('rev-parse','HEAD^{tree}'),branch:e.GITHUB_REF.slice(11),runId,workflowSha256:hash(fs.readFileSync(WF)),scriptSha256:hash(fs.readFileSync(SCRIPT))};
}
function artifactCheck(a,r,c,stage){
 need(a?.id===r.artifactId&&a.expired===false&&a.digest==='sha256:'+r.artifactSha256&&a.name===(stage==='rehearsal'?'native-pilot-review-rehearsal-'+c.runId:'native-pilot-build-'+process.env.DEPLOYMENT));
 if(stage==='rehearsal')need(a.workflow_run?.id===c.runId);
 need(a.workflow_run?.head_sha===c.sha&&a.workflow_run?.head_branch===c.branch&&a.workflow_run?.repository_id===1415026436&&a.workflow_run?.head_repository_id===1415026436);
}
const output=(k,v)=>{need(/^[a-z_]+$/.test(k)&&typeof v==='string'&&!/[\r\n]/.test(v));if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,k+'='+v+'\n');};
async function publish(c,stage){
 need(process.env.NATIVE_PUBLISH_OPERATION==='metadata-only-owner-approved');
 const read=reader(process.env.NATIVE_ADMISSION_READ_TOKEN),write=reader(process.env.GITHUB_TOKEN),env=environment(stage);
 // All GET preflights precede BOTH writes. An uncertain write is never retried or claimed absent.
 const [run,reviews,e,b]=await Promise.all([read('GET','/actions/runs/'+c.runId),read('GET','/actions/runs/'+c.runId+'/approvals'),read('GET','/environments/'+env),read('GET','/environments/'+env+'/deployment-branch-policies?per_page=2')]);
 need(run.id===c.runId&&run.head_sha===c.sha&&run.head_branch===c.branch&&run.path===WF&&run.event==='workflow_dispatch'&&run.status==='in_progress'&&run.repository?.id===1415026436&&run.head_repository?.id===1415026436);
 need(e.name===env);approvedEnvironment(e,b,c.branch);let packet,artifact;
 if(stage==='rehearsal'){
  need(c.branch==='native-pilot/review-rehearsal'&&!process.env.DEPLOYMENT);
  const r=rehearsalRecord(c,{id:Number(process.env.REHEARSAL_ARTIFACT_ID),sha256:process.env.REHEARSAL_ARTIFACT_SHA});packet=rehearsalPacket(r);artifact=await read('GET','/actions/artifacts/'+r.artifactId);artifactCheck(artifact,r,c,stage);
  const v=await read('GET','/actions/variables/UNFARMD_NATIVE_REHEARSAL_'+c.runId);need(v.name==='UNFARMD_NATIVE_REHEARSAL_'+c.runId&&v.value===canonical(r));
 }else{
  need(/^dpl_[A-Za-z0-9]{8,100}$/.test(process.env.DEPLOYMENT??''));
  const name='UNFARMD_NATIVE_'+stage.toUpperCase()+'_'+process.env.DEPLOYMENT.toUpperCase();
  const v=await read('GET','/actions/variables/'+name);need(v.name===name&&typeof v.value==='string'&&Buffer.byteLength(v.value)<=12288);
  const r=JSON.parse(v.value);need(canonical(r)===v.value&&r.review?.runId===c.runId&&r.review.workflowSha256===c.workflowSha256&&r.identity?.commit===c.sha&&r.identity.tree===c.tree&&r.identity.branch===c.branch&&r.identity.deployment===process.env.DEPLOYMENT);
  // Real schema/packet implementation from the reviewed application. No fake completed-run object.
  const require=createRequire(import.meta.url),contract=require('/tmp/native-publisher-contract/lib/native-pilot/admission/contract.js'),publisher=require('/tmp/native-publisher-contract/lib/native-pilot/admission/publication.js');
  const [setupEnv,sourceEnv]=await Promise.all(['setup','source'].map(x=>read('GET','/environments/native-pilot-'+x)));
  const ctx={identity:r.identity,plan:{workflowId:run.workflow_id,setupEnvironmentId:setupEnv.id,sourceEnvironmentId:sourceEnv.id,branch:c.branch}};
  let setup;
  if(stage==='source'){
   const s=await read('GET','/actions/variables/UNFARMD_NATIVE_SETUP_'+process.env.DEPLOYMENT.toUpperCase());setup=contract.setupCandidate(s.value,ctx,Date.now());
   need(r.setupSha256===hash(s.value));
  }
  const p=publisher.publicationPacket(stage,r,ctx,Date.now(),setup);packet={body:p.request.body,comment:p.reviewComment,manifestSha256:p.manifestSha256};
  artifact=await read('GET','/actions/artifacts/'+r.review.artifactId);artifactCheck(artifact,{artifactId:r.review.artifactId,artifactSha256:r.review.artifactSha256},c,stage);
 }
 ownerReview(reviews,e,packet.comment);
 const q='?'+new URLSearchParams({sha:c.sha,environment:env,task:packet.body.task,per_page:'2'}),prior=await read('GET','/deployments'+q);need(Array.isArray(prior)&&prior.length===0);
 const d=await write('POST','/deployments',packet.body);need(Number.isSafeInteger(d?.id)&&d.id>0&&d.sha===c.sha&&d.creator?.login==='github-actions[bot]'&&d.creator?.id===41898282);
 await write('POST','/deployments/'+d.id+'/statuses',{state:'success',environment:env,log_url:'https://github.com/'+REPO+'/actions/runs/'+c.runId,auto_inactive:false});
 console.log(JSON.stringify({operation:'GITHUB_METADATA_ONLY',deploymentMetadataId:d.id,runId:c.runId,manifestSha256:packet.manifestSha256,activate:false,sourceCalls:false,admissionVerified:false}));
}
export async function auditRehearsal(c,artifactId,read,clock=()=>performance.now()){
 need(c.branch==='native-pilot/review-rehearsal');const start=clock();
 for(let pass=0;pass<2;pass++){
  const call=suffix=>read('GET',suffix),env=environment('rehearsal');
  const run=await call('/actions/runs/'+c.runId);need(run.id===c.runId&&run.head_sha===c.sha&&run.head_branch===c.branch&&run.path===WF&&run.event==='workflow_dispatch'&&run.status==='completed'&&run.conclusion==='success'&&run.repository?.id===1415026436&&run.head_repository?.id===1415026436);
  const artifact=await call('/actions/artifacts/'+artifactId),r=rehearsalRecord(c,{id:artifactId,sha256:artifact.digest?.replace(/^sha256:/,'')});artifactCheck(artifact,r,c,'rehearsal');
  const packet=rehearsalPacket(r),v=await call('/actions/variables/UNFARMD_NATIVE_REHEARSAL_'+c.runId);need(v.name==='UNFARMD_NATIVE_REHEARSAL_'+c.runId&&v.value===canonical(r));
  const e=await call('/environments/'+env),b=await call('/environments/'+env+'/deployment-branch-policies?per_page=2');need(e.name===env);approvedEnvironment(e,b,c.branch);
  ownerReview(await call('/actions/runs/'+c.runId+'/approvals'),e,packet.comment);
  const q='?'+new URLSearchParams({sha:c.sha,environment:env,task:packet.body.task,per_page:'2'}),list=await call('/deployments'+q);need(Array.isArray(list)&&list.length===1);const d=list[0];
  need(Number.isSafeInteger(d.id)&&d.id>0&&d.sha===c.sha&&d.ref===c.sha&&d.task===packet.body.task&&d.environment===env&&d.production_environment===false&&d.transient_environment===true&&d.creator?.id===41898282&&d.creator?.login==='github-actions[bot]'&&canonical(d.payload)===canonical(packet.body.payload));
  const status=await call('/deployments/'+d.id+'/statuses?per_page=2');need(Array.isArray(status)&&status.length>=1&&status.length<=2&&status[0].state==='success'&&status[0].environment===env&&status[0].log_url==='https://github.com/'+REPO+'/actions/runs/'+c.runId&&status[0].creator?.id===41898282);
  const wf=await call('/contents/'+WF+'?ref='+c.sha);need(wf.type==='file'&&wf.path===WF&&wf.encoding==='base64'&&hash(Buffer.from(wf.content,'base64'))===c.workflowSha256);
 }
 const elapsed=clock()-start;need(elapsed>=0&&elapsed<=4000);
 return {kind:'NONAUTHORIZING_GITHUB_REHEARSAL_AUDIT',runId:c.runId,commit:c.sha,reads:18,elapsedMs:Math.round(elapsed*1000)/1000,activate:false,sourceCalls:false,setupAdmission:false,vercelLatencyProven:false};
}
async function main(){
 const command=process.argv[2];
 if(command==='audit-rehearsal'){
  need(process.env.NATIVE_PUBLISH_OPERATION==='metadata-read-only-owner-approved');
  const runId=Number(process.argv[3]),artifactId=Number(process.argv[4]),sha=process.argv[5];need(Number.isSafeInteger(runId)&&runId>0&&Number.isSafeInteger(artifactId)&&artifactId>0&&/^[a-f0-9]{40}$/.test(sha??''));
  const git=(...a)=>execFileSync('git',a,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();need(git('rev-parse','HEAD')===sha&&!git('status','--porcelain','--untracked-files=normal'));
  const c={sha,tree:git('rev-parse','HEAD^{tree}'),branch:'native-pilot/review-rehearsal',runId,workflowSha256:hash(fs.readFileSync(WF)),scriptSha256:hash(fs.readFileSync(SCRIPT))};
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),4000);
  try{console.log(JSON.stringify(await auditRehearsal(c,artifactId,reader(process.env.NATIVE_ADMISSION_READ_TOKEN,abort.signal))));}finally{clearTimeout(timer);abort.abort();}return;
 }
 const c=context(),stage=process.env.MODE;environment(stage);
 if(command==='context'){
  console.log(JSON.stringify({...c,mode:stage,activate:false,sourceCalls:false}));
  if(stage==='rehearsal'){
   need(c.branch==='native-pilot/review-rehearsal'&&!process.env.DEPLOYMENT);
   for(const [f,re]of [['lib/native-pilot/index.ts',/NATIVE_PILOT_ENABLED=false/],['lib/native-pilot/admission/gates.ts',/NATIVE_SETUP_RUNTIME_ENABLED=false/],['lib/native-lens/policy.ts',/NATIVE_LENS_SOURCE_ENABLED=false/]])need(re.test(fs.readFileSync(f,'utf8')));
   fs.mkdirSync('/tmp/native-review-artifact',{recursive:true});fs.writeFileSync('/tmp/native-review-artifact/checkout.json',canonical(c));
   fs.copyFileSync(WF,'/tmp/native-review-artifact/workflow.yml');fs.copyFileSync(SCRIPT,'/tmp/native-review-artifact/publisher.mjs');
  }return;
 }
 if(command==='card'){
  need(stage==='rehearsal');const r=rehearsalRecord(c,{id:Number(process.env.REHEARSAL_ARTIFACT_ID),sha256:process.env.REHEARSAL_ARTIFACT_SHA}),p=rehearsalPacket(r);
  output('artifact_id',String(r.artifactId));output('artifact_sha',r.artifactSha256);output('review_comment',p.comment);
  const text='NONAUTHORIZING GitHub review rehearsal only. No SQL, Vercel or provider.\n\n'+canonical(r)+'\n\nRequired review comment:\n'+p.comment+'\n';
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,text);else console.log(text);return;
 }
 need(command==='publish');await publish(c,stage);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('NATIVE_PUBLISH_HOLD: metadata writes may be uncertain; do not retry, delete records or infer no attempt.');process.exitCode=1;});
