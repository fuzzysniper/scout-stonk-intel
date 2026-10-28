// Invoked only by the read-only current-main GitHub Actions audit job.
// Uses its short-lived built-in GitHub client, never a configured SCOUT secret.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {POLICY,repository,inspectRelease,segment,checkpointValid,verifyCheckpoint,verifyMainPacket,verifyRun,bindingFor,digest} from './lifecycle.mjs';
const runView=r=>({id:r.id,run_attempt:r.run_attempt,event:r.event,path:r.path,head_branch:r.head_branch,head_sha:r.head_sha,status:r.status,conclusion:r.conclusion,run_started_at:r.run_started_at,updated_at:r.updated_at,repository:{id:r.repository?.id},head_repository:{id:r.head_repository?.id}});
const artifactView=a=>({id:a.id,name:a.name,expired:a.expired,size_in_bytes:a.size_in_bytes,digest:a.digest,workflow_run:{id:a.workflow_run?.id,head_sha:a.workflow_run?.head_sha}});
/** Injectable GitHub SDK for deterministic tests. Production supplies ONLY the
 * official github-script client with retries:0; no endpoint or credential input. */
export async function acquireProof({github,r,binding,p=POLICY}){
 const [owner,repo]=p.repository.split('/');let calls=0;
 async function api(route,args={}){
  assert.ok(++calls<=p.maxApiCalls,'github_request_budget');
  const abort=new AbortController();let timer;
  try{
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('github_read_timeout'));},p.timeoutMs);});
   const response=await Promise.race([github.request(route,{owner,repo,...args,request:{timeout:p.timeoutMs,signal:abort.signal}}),deadline]);
   assert.equal(response.status,200,'github_evidence_unavailable');return response.data;
  }finally{clearTimeout(timer);}
 }
 const head=binding.head,release=inspectRelease(r,head,p),packet={version:'unfarmd-v3-main-proof/1',binding,checkpoint:null,collectors:[],trigger:null};
 if(binding.event==='workflow_run'){
  packet.trigger=runView(await api('GET /repos/{owner}/{repo}/actions/runs/{run_id}',{run_id:Number(binding.triggerRunId)}));
  verifyRun(packet.trigger,{head:packet.trigger.head_sha,event:'schedule',workflow:p.collector},p);
  assert.ok(r.ancestor(packet.trigger.head_sha,head),'trigger_head_not_on_history');
 }
 let current=head,count=0;
 for(;;){
  if(current===p.base){packet.checkpoint={sha:current,proof:null};break;}
  if(current===release.merge&&release.parents[0]===p.base){current=p.base;continue;}
  if(checkpointValid(r,current,release,p)){
   const page=await api('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{workflow_id:path.basename(p.workflow),head_sha:current,branch:'main',status:'completed',per_page:20});
   assert.ok(Array.isArray(page.workflow_runs)&&page.workflow_runs.length<=20,'invalid_checkpoint_page');
   for(const item of page.workflow_runs){
    if(String(item.id)===binding.runId||item.conclusion!=='success'||!['push','workflow_run'].includes(item.event))continue;
    const jobs=await api('GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs',{run_id:item.id,per_page:30});
    assert.ok(Array.isArray(jobs.jobs)&&jobs.jobs.length<=30,'invalid_checkpoint_jobs');
    const matches=jobs.jobs.filter(j=>j.name==='post-merge-current-main'&&j.conclusion==='success');
    if(matches.length!==1)continue;
    const j=matches[0],proof={run:runView(item),job:{id:j.id,name:j.name,run_id:j.run_id,status:j.status,conclusion:j.conclusion}};
    verifyCheckpoint(proof,current,release,r,binding,p);packet.checkpoint={sha:current,proof};break;
   }
   if(packet.checkpoint)break;
  }
  const part=segment(r,current,release,p);assert.ok(part,'main_history_incomplete');
  if(part.kind==='collector'){
   assert.ok(++count<=p.maxTransitions,'catchup_budget_exceeded');
   const summary=JSON.parse(r.blob(current,p.data[0]));assert.ok(Number.isSafeInteger(summary.runId)&&summary.runId>0,'summary_run_missing');
   const run=runView(await api('GET /repos/{owner}/{repo}/actions/runs/{run_id}',{run_id:summary.runId}));
   verifyRun(run,{head:part.parent,event:'schedule',workflow:p.collector},p);
   const jobs=await api('GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs',{run_id:run.id,per_page:30});
   assert.ok(Array.isArray(jobs.jobs)&&jobs.jobs.length===1,'unexpected_collector_jobs');
   assert.equal(jobs.jobs[0].name,'collect');assert.equal(jobs.jobs[0].status,'completed');
   const steps=Object.fromEntries((jobs.jobs[0].steps??[]).filter(x=>['Collect observations','Persist observations and summary','Preserve diagnostic evidence'].includes(x.name)).map(x=>[x.name,x.conclusion]));
   const artifacts=await api('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts',{run_id:run.id,per_page:20});
   assert.ok(Array.isArray(artifacts.artifacts)&&artifacts.artifacts.length<=20,'invalid_artifact_page');
   const matches=artifacts.artifacts.filter(a=>a.name===`collector-evidence-${run.id}-${run.run_attempt}`);
   assert.equal(matches.length,1,'collector_artifact_missing_or_ambiguous');const artifact=artifactView(matches[0]);
   assert.ok(!artifact.expired&&artifact.size_in_bytes>0&&artifact.size_in_bytes<=p.maxBytes,'collector_artifact_bounds');
   assert.ok(Number.isSafeInteger(artifact.id)&&artifact.id>0,'invalid_artifact_id');
   assert.equal(artifact.workflow_run?.id,run.id,'artifact_wrong_run');assert.equal(artifact.workflow_run?.head_sha,part.parent,'artifact_wrong_head');
   assert.match(artifact.digest??'',/^sha256:[a-f0-9]{64}$/,'collector_artifact_digest');
   const data=await api('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}',{artifact_id:artifact.id,archive_format:'zip'});
   assert.ok(data instanceof ArrayBuffer||ArrayBuffer.isView(data),'invalid_zip_response');
   const zip=Buffer.from(data instanceof ArrayBuffer?new Uint8Array(data):data);
   assert.ok(zip.length<=p.maxBytes&&zip.length===artifact.size_in_bytes,'download_size_mismatch');assert.equal('sha256:'+digest(zip),artifact.digest,'download_digest_mismatch');
   const hashes=JSON.parse(execFileSync('python3',[path.join(r.root,'tests/v3-release/collector-append.py'),'zip'],{input:zip,cwd:r.root,maxBuffer:65536,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1'}}));
   packet.collectors.push({commit:current,run,artifact,hashes,steps});
  }
  current=part.parent;
 }
 verifyMainPacket(r,head,packet,binding,p);
 assert.ok(Buffer.byteLength(JSON.stringify(packet))<=256*1024,'proof_packet_bound');
 return {packet,calls};
}
export async function writeCurrentMainEvidence({github,context,env=process.env}){
 const r=repository(),head=r.git('rev-parse','HEAD');assert.equal(env.GITHUB_SHA,head,'wrong_main_checkout');
 const binding=bindingFor(context.eventName,context.payload,{head,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,ref:env.GITHUB_REF});
 const {packet}=await acquireProof({github,r,binding});
 const file=path.join(fs.realpathSync(env.RUNNER_TEMP),'unfarmd-v3-main-evidence.json');assert.equal(env.V3_RELEASE_EVIDENCE,file);
 fs.writeFileSync(file,JSON.stringify(packet),{flag:'wx',mode:0o600});
 // No URLs, artifact bodies, owner input, SDK errors or credentials are logged.
}
