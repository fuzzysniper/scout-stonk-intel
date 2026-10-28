// CI-only release verification. No source, SQL, credential or activation API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const POLICY=Object.freeze({
 repository:'fuzzysniper/scout-stonk-intel',repositoryId:1415026436,
 base:'9ed40610eb34c34b56996d55a768f2eac9b43cdd',family:'b8fbace0f3d71e597af7c01dbc7ffeaedee043b9',
 sources:['a1e461b9248d72396f038b641c7bc79d81130e7d','4da9c8f39d815f2a8ee80283efbcfa808e09e352','df36b54d09a6f5cec304a64a7d99d7a01176e872'],
 marker:'tests/v3-release/lifecycle.mjs',workflow:'.github/workflows/desk-integration.yml',collector:'.github/workflows/reward-snapshots.yml',
 data:['data/collection-summary.json','data/reward-snapshots.json'],tracked:'data/tracked-mints.json',
 audit:'data/collector-audit.json',auditWorkflow:'.github/workflows/data-health.yml',auditProducer:'scripts/audit_collector.py',
 maxTransitions:8,maxApiCalls:64,maxBytes:4*1024*1024,timeoutMs:5000,
});
export const digest=b=>createHash('sha256').update(b).digest('hex');
export const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
export function repository(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});
 const git=(...a)=>raw(...a).toString().trim();
 return {root,raw,git,blob:(ref,p)=>raw('show',ref+':'+p),parents:ref=>git('rev-list','--parents','-n','1',ref).split(' ').slice(1),
  ancestor:(a,b)=>{try{git('merge-base','--is-ancestor',a,b);return true;}catch{return false;}},
  names:(a,b)=>git('diff','--name-only','--no-renames',a,b).split('\n').filter(Boolean),
 };
}
export const dataFiles=(p=POLICY)=>[...p.data,p.audit];
const sameData=(r,a,b,p)=>dataFiles(p).every(file=>r.git('ls-tree',a,'--',file)===r.git('ls-tree',b,'--',file));
const onlyData=(r,a,b,p)=>r.names(a,b).every(file=>dataFiles(p).includes(file));
/** Merge commits are deliberately required. Byte-equivalent squash/rebase is
 * unsupported; do not replace lost source ancestry with a caller flag. */
export function inspectRelease(r,head,p=POLICY){
 assert.ok(sha(head)&&r.ancestor(p.base,head)&&r.ancestor(p.family,head),'release_ancestry_missing');
 for(const source of p.sources)assert.ok(r.ancestor(source,head),'source_ancestry_missing');
 const additions=r.git('log','--first-parent','--diff-merges=first-parent','--diff-filter=A','--format=%H','--no-patch',p.base+'..'+head,'--',p.marker).split('\n').filter(Boolean);
 assert.equal(additions.length,1,'one_main_release_boundary_required');
 const merge=additions[0],parents=r.parents(merge);assert.equal(parents.length,2,'normal_two_parent_merge_required');
 assert.ok(r.ancestor(p.base,parents[0])&&r.ancestor(p.family,parents[1]),'release_parent_order_invalid');
 for(const source of p.sources)assert.ok(r.ancestor(source,parents[1]),'release_candidate_source_missing');
 assert.ok(onlyData(r,parents[1],merge,p),'release_changed_reviewed_candidate_code');
 assert.ok(sameData(r,parents[0],merge,p),'release_overwrites_main_data');
 assert.ok(onlyData(r,merge,head,p),'post_release_code_change_requires_new_review');
 return {merge,parents,head};
}
export function segment(r,current,release,p=POLICY){
 if(current===p.base)return null;
 if(current===release.merge)return {kind:'release',parent:release.parents[0]};
 const parents=r.parents(current);assert.equal(parents.length,1,'collector_commit_must_be_single_parent');
 const changed=r.names(parents[0],current);
 if(changed.length===1&&changed[0]===p.audit){
  assert.equal(r.git('ls-tree',current,'--',p.audit).split(' ')[0],'100644','audit_file_mode_changed');
  for(const file of auditSources(p))assert.deepEqual(r.blob(parents[0],file),r.blob(p.base,file),'audit_source_changed');
  return {kind:'audit',parent:parents[0]};
 }
 assert.ok(changed.length>0&&changed.every(file=>p.data.includes(file)),'collector_only_paths_required');
 for(const file of p.data)assert.equal(r.git('ls-tree',current,'--',file).split(' ')[0],'100644','collector_file_mode_changed');
 assert.equal(r.git('diff',parents[0],current,'--',p.tracked,p.collector),'','collector_contract_changed');
 return {kind:'collector',parent:parents[0]};
}
export function checkpointValid(r,checkpoint,release,p=POLICY){
 return checkpoint===p.base||(r.ancestor(release.merge,checkpoint)&&onlyData(r,release.merge,checkpoint,p));
}
const safeId=v=>Number.isSafeInteger(v)&&v>0;
export function verifyRun(run,{head,event,workflow},p=POLICY){
 assert.ok(run&&safeId(run.id)&&safeId(run.run_attempt),'invalid_github_run');
 assert.equal(run.repository?.id,p.repositoryId,'wrong_run_repository');assert.equal(run.head_repository?.id,p.repositoryId,'wrong_head_repository');
 assert.equal(run.head_branch,'main','wrong_run_branch');assert.equal(run.head_sha,head,'wrong_run_head');
 assert.equal(run.path,workflow,'wrong_workflow');assert.equal(run.event,event,'wrong_run_event');assert.equal(run.status,'completed','unfinished_run');
 assert.ok(['success','failure'].includes(run.conclusion),'uncertain_run');
}
export function verifyCheckpoint(proof,checkpoint,release,r,binding,p=POLICY){
 assert.ok(checkpointValid(r,checkpoint,release,p),'unreviewed_checkpoint_code');
 if(checkpoint===p.base){assert.equal(proof,null,'unexpected_base_proof');return;}
 assert.ok(proof&&['push','workflow_run'].includes(proof.run?.event),'checkpoint_event_invalid');
 verifyRun(proof.run,{head:checkpoint,event:proof.run.event,workflow:p.workflow},p);
 assert.equal(proof.run.conclusion,'success','checkpoint_not_successful');assert.notEqual(String(proof.run.id),binding.runId,'cannot_trust_current_run');
 assert.equal(proof.job?.run_id,proof.run.id);assert.equal(proof.job?.name,'post-merge-current-main');assert.equal(proof.job?.status,'completed');assert.equal(proof.job?.conclusion,'success');
}
export function verifyCollectorProof(proof,commit,parent,r,p=POLICY){
 assert.equal(proof?.commit,commit,'wrong_collector_commit');
 verifyRun(proof.run,{head:parent,event:'schedule',workflow:p.collector},p);
 assert.deepEqual(r.blob(proof.run.head_sha,p.collector),r.blob(p.base,p.collector),'unreviewed_collector_workflow');
 const steps=proof.steps;
 for(const name of ['Persist observations and summary','Preserve diagnostic evidence'])assert.equal(steps?.[name],'success','collector_persistence_not_proven');
 assert.ok(['success','failure'].includes(steps?.['Collect observations']),'collection_step_missing');
 const artifact=proof.artifact;
 assert.ok(artifact&&safeId(artifact.id)&&artifact.expired===false,'artifact_unavailable');
 assert.equal(artifact.name,`collector-evidence-${proof.run.id}-${proof.run.run_attempt}`);
 assert.ok(Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes>0&&artifact.size_in_bytes<=p.maxBytes,'artifact_size_bound');
 assert.match(artifact.digest??'',/^sha256:[a-f0-9]{64}$/,'artifact_digest_missing');
 assert.equal(artifact.workflow_run?.id,proof.run.id,'artifact_wrong_run');
 assert.equal(artifact.workflow_run?.head_sha,parent,'artifact_wrong_head');
 const hashes=proof.hashes;assert.deepEqual(Object.keys(hashes??{}).sort(),['collection-summary.json','reward-snapshots.json']);
 for(const file of p.data)assert.equal(hashes[path.basename(file)],digest(r.blob(commit,file)),'artifact_git_bytes_mismatch');
 const summary=JSON.parse(r.blob(commit,p.data[0]));
 assert.equal(summary.runId,proof.run.id,'summary_run_mismatch');assert.equal(summary.event,'schedule','manual_collection_not_accepted');
 assert.equal(summary.expectedDatasetRevision,'sha256:'+digest(r.blob(commit,p.data[1])),'dataset_revision_mismatch');
}
export const auditSources=(p=POLICY)=>[p.auditWorkflow,p.auditProducer,'scripts/collect_rewards.py',p.tracked];
export function verifyAuditProof(proof,commit,parent,r,p=POLICY){
 assert.equal(proof?.kind,'audit','distinct_audit_proof_required');assert.equal(proof.commit,commit,'wrong_audit_commit');
 verifyRun(proof.run,{head:parent,event:'schedule',workflow:p.auditWorkflow},p);
 for(const file of auditSources(p))assert.deepEqual(r.blob(parent,file),r.blob(p.base,file),'audit_source_changed');
 assert.deepEqual(proof.sources,Object.fromEntries(auditSources(p).map(file=>[file,digest(r.blob(p.base,file))])),'audit_source_hash_mismatch');
 for(const step of ['Bounded read-only audit','Publish audit evidence','Preserve audit evidence'])assert.equal(proof.steps?.[step],'success','audit_execution_or_persistence_not_proven');
 const a=proof.artifact;
 assert.ok(a&&safeId(a.id)&&a.expired===false,'audit_artifact_unavailable');
 assert.equal(a.name,`data-health-audit-${proof.run.id}-${proof.run.run_attempt}`);
 assert.ok(Number.isSafeInteger(a.size_in_bytes)&&a.size_in_bytes>0&&a.size_in_bytes<=p.maxBytes,'audit_artifact_size');
 assert.match(a.digest??'',/^sha256:[a-f0-9]{64}$/);assert.equal(a.workflow_run?.id,proof.run.id);assert.equal(a.workflow_run?.head_sha,parent);
 assert.deepEqual(Object.keys(proof.hashes??{}),['collector-audit.json']);
 assert.equal(proof.hashes['collector-audit.json'],digest(r.blob(commit,p.audit)),'audit_artifact_git_bytes_mismatch');
 const datasetCommit=r.git('log','-1','--format=%H',parent,'--',p.data[1]);assert.ok(sha(datasetCommit),'audit_dataset_history_missing');
 const input={beforeRaw:r.blob(parent,p.audit).toString(),afterRaw:r.blob(commit,p.audit).toString(),run:proof.run,artifact:{createdAt:a.created_at,expiresAt:a.expires_at},
  committedAt:r.git('show','-s','--format=%cI',commit),dataset:{sha:datasetCommit,committedAt:r.git('show','-s','--format=%cI',datasetCommit),revision:'sha256:'+digest(r.blob(parent,p.data[1]))}};
 execFileSync('python3',[path.join(r.root,'tests/v3-release/audit-snapshot.py')],{input:JSON.stringify(input),cwd:r.root,maxBuffer:65536,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1'}});
}
/** Packet is produced by the read-only GitHub step in THIS isolated main job.
 * It is never accepted from a PR, journal import or repository-owned JSON file. */
export function verifyMainPacket(r,head,packet,binding,p=POLICY){
 assert.equal(r.git('diff','--name-only','HEAD'),'','dirty_released_checkout');
 assert.equal(r.git('ls-files','--others','--exclude-standard'),'','untracked_released_checkout');
 assert.equal(packet?.version,'unfarmd-v3-main-proof/1');assert.deepEqual(packet.binding,binding,'evidence_context_mismatch');
 if(binding.event==='workflow_run'){
  assert.equal(String(packet.trigger?.id),binding.triggerRunId,'trigger_run_mismatch');
  assert.ok([p.collector,p.auditWorkflow].includes(packet.trigger?.path),'unapproved_trigger_workflow');
  verifyRun(packet.trigger,{head:packet.trigger.head_sha,event:'schedule',workflow:packet.trigger.path},p);
  assert.ok(r.ancestor(packet.trigger.head_sha,head),'trigger_head_not_on_history');
 }else assert.equal(packet.trigger,null,'unexpected_trigger');
 const release=inspectRelease(r,head,p),cp=packet.checkpoint;
 assert.ok(sha(cp?.sha),'invalid_checkpoint');verifyCheckpoint(cp.proof,cp.sha,release,r,binding,p);
 const chain=[];let current=head,releaseSeen=false;
 for(let n=0;current!==cp.sha;n++){
  assert.ok(n<=p.maxTransitions+1,'catchup_budget_exceeded');
  const part=segment(r,current,release,p);assert.ok(part,'checkpoint_not_on_first_parent');
  if(part.kind==='release'){assert.equal(releaseSeen,false);releaseSeen=true;}
  else{chain.push({commit:current,parent:part.parent,...(part.kind==='audit'?{kind:'audit'}:{})});assert.ok(chain.length<=p.maxTransitions,'catchup_budget_exceeded');}
  current=part.parent;
 }
 assert.equal(packet.collectors?.length,chain.length,'incomplete_or_extra_collector_proofs');
 for(let i=0;i<chain.length;i++){
  const transition=chain[i],proof=packet.collectors[i];
  if(transition.kind==='audit'){verifyAuditProof(proof,transition.commit,transition.parent,r,p);continue;}
  verifyCollectorProof(proof,transition.commit,transition.parent,r,p);
  const input={beforeRaw:r.blob(transition.parent,p.data[1]).toString(),afterRaw:r.blob(transition.commit,p.data[1]).toString(),summaryRaw:r.blob(transition.commit,p.data[0]).toString(),trackedRaw:r.blob(p.base,p.tracked).toString(),run:proof.run};
  execFileSync('python3',[path.join(r.root,'tests/v3-release/collector-append.py')],{input:JSON.stringify(input),cwd:r.root,maxBuffer:1024*1024,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1'}});
 }
 return {mode:'released',dataAllowed:true,release:release.merge,checkpoint:cp.sha,transitions:chain.reverse()};
}
export function bindingFor(eventName,event,{head,runId,runAttempt,ref},p=POLICY){
 assert.ok(sha(head)&&safeId(Number(runId))&&safeId(Number(runAttempt)),'invalid_ci_identity');
 assert.equal(event?.repository?.id,p.repositoryId);assert.equal(event.repository.full_name,p.repository);
 assert.equal(ref,'refs/heads/main','main_context_required');
 if(eventName==='push'){assert.equal(event.ref,ref);assert.equal(event.after,head);}
 else{
  assert.equal(eventName,'workflow_run','unsupported_main_event');assert.equal(event.action,'completed');
  assert.equal(event.workflow_run?.event,'schedule');assert.equal(event.workflow_run?.head_branch,'main');
  assert.equal(event.workflow_run?.head_repository?.id,p.repositoryId);
  assert.ok(Number.isSafeInteger(event.workflow_run?.id)&&event.workflow_run.id>0,'invalid_trigger_id');
  if(event.workflow_run.path!==undefined)assert.ok([p.collector,p.auditWorkflow].includes(event.workflow_run.path),'unapproved_trigger_workflow');
 }
 return {event:eventName,repositoryId:p.repositoryId,head,runId:String(runId),runAttempt:String(runAttempt),triggerRunId:eventName==='workflow_run'?String(event.workflow_run.id):null};
}
/** Offline and PR invocations are always strict proposals. No env flag can
 * convert a PR into a main proof or authorize changed data. */
export function runtimeState(r,p=POLICY){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_EVENT_NAME==='pull_request'){
  for(const file of dataFiles(p))assert.equal(digest(fs.readFileSync(path.join(r.root,file))),digest(r.blob(p.base,file)),'feature_branch_data_change');
  return {mode:'proposal',dataAllowed:false};
 }
 const head=r.git('rev-parse','HEAD'),event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 const binding=bindingFor(process.env.GITHUB_EVENT_NAME,event,{head,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,ref:process.env.GITHUB_REF},p);
 assert.equal(process.env.GITHUB_SHA,head,'wrong_main_checkout');
 const expected=path.join(fs.realpathSync(process.env.RUNNER_TEMP),'unfarmd-v3-main-evidence.json');
 assert.equal(process.env.V3_RELEASE_EVIDENCE,expected,'untrusted_evidence_location');
 const stat=fs.lstatSync(expected);assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=256*1024,'invalid_evidence_file');
 const packet=JSON.parse(fs.readFileSync(expected,'utf8'));
 const result=verifyMainPacket(r,head,packet,binding,p);
 for(const file of dataFiles(p))assert.equal(digest(fs.readFileSync(path.join(r.root,file))),digest(r.blob(head,file)),'dirty_main_data');
 return result;
}
