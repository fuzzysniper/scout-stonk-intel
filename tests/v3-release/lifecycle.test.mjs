import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fixture,copy,ROOT} from './lifecycle-fixtures.mjs';
import {inspectRelease,verifyMainPacket,bindingFor,runtimeState} from './lifecycle.mjs';
const using=fn=>{const f=fixture();try{fn(f);}finally{f.close();}};
const valid=(f,packet=f.packet())=>verifyMainPacket(f.r,packet.binding.head,packet,packet.binding,f.p);
test('normal two-parent merge preserves reviewed source ancestry and verifies before any source activation',()=>using(f=>{const out=valid(f);assert.equal(out.release,f.merge);assert.equal(out.transitions.length,0);assert.ok(f.r.ancestor(f.source,f.merge));}));
test('byte-identical squash is explicitly NO-GO rather than skipping ancestry',()=>using(f=>{const squash=f.objCommit(f.r.git('rev-parse',f.family+'^{tree}'),[f.base]);assert.throws(()=>inspectRelease(f.r,squash,f.p),/ancestry/);assert.equal(f.r.git('rev-parse',squash+'^{tree}'),f.r.git('rev-parse',f.merge+'^{tree}'));}));
test('byte-identical rebased candidate without original source ancestry is NO-GO',()=>using(f=>{const rebased=f.objCommit(f.r.git('rev-parse',f.family+'^{tree}'),[f.base]);const merge=f.objCommit(f.r.git('rev-parse',rebased+'^{tree}'),[f.base,rebased]);assert.throws(()=>inspectRelease(f.r,merge,f.p),/ancestry/);}));
test('fast-forward-only release is rejected even while source ancestry survives',()=>using(f=>assert.throws(()=>inspectRelease(f.r,f.family,f.p),/two_parent/)));
test('reversed merge parents are rejected',()=>using(f=>{const m=f.objCommit(f.r.git('rev-parse',f.family+'^{tree}'),[f.family,f.base]);assert.throws(()=>inspectRelease(f.r,m,f.p));}));
function mainAdvancedMerge(f,{keepData=true,mutateCode=false}={}){
 f.command(['checkout','--detach','-q',f.base]);const update=f.append();
 f.command(['checkout','--detach','-q',f.family]);
 if(keepData)for(const file of f.p.data)f.write(file,f.r.blob(update.sha,file));
 if(mutateCode)f.write('protected.txt','UNREVIEWED MERGE RESOLUTION\n');
 f.command(['add','.']);const merge=f.objCommit(f.command(['write-tree']),[update.sha,f.family]);
 f.command(['checkout','--detach','-q',merge]);return {merge,update};
}
test('scheduled collector advancement before merge survives exactly on first parent and is independently verified',()=>using(f=>{const {merge,update}=mainAdvancedMerge(f),state=valid(f);assert.equal(state.release,merge);assert.equal(state.transitions[0].commit,update.sha);for(const file of f.p.data)assert.deepEqual(f.r.blob(merge,file),f.r.blob(update.sha,file));}));
test('normal merge cannot overwrite newer main collector history with old candidate bytes',()=>using(f=>{const {merge}=mainAdvancedMerge(f,{keepData:false});assert.throws(()=>inspectRelease(f.r,merge,f.p),/overwrites_main_data/);}));
test('merge resolution cannot edit protected code while preserving source ancestry and current data',()=>using(f=>{const {merge}=mainAdvancedMerge(f,{mutateCode:true});assert.throws(()=>inspectRelease(f.r,merge,f.p),/changed_reviewed_candidate_code/);}));
test('one verified future scheduled append passes; original clocks and Git parent preserved',()=>using(f=>{const u=f.append();const state=valid(f);assert.equal(state.transitions.length,1);assert.equal(state.transitions[0].parent,f.merge);assert.equal(state.transitions[0].commit,u.sha);}));
test('summary-only failed acquisition keeps all observations and is not fake zero/success',()=>using(f=>{f.append({failed:true});const state=valid(f);assert.equal(state.transitions.length,1);const summary=JSON.parse(f.r.blob(state.transitions[0].commit,f.p.data[0]));assert.equal(summary.overall,'failed');}));
test('rollover at the EXISTING193 bound only removes exact oldest overflow; old Git blob remains',()=>{const f=fixture({rows:193});try{const old=f.r.blob(f.merge,f.p.data[1]);f.append();valid(f);assert.equal(JSON.parse(f.r.blob('HEAD',f.p.data[1]))[f.mint].length,193);assert.deepEqual(f.r.blob(f.merge,f.p.data[1]),old);}finally{f.close();}});
test('two missed verification jobs catch up with exact proofs, not a reset',()=>using(f=>{f.append();f.append();assert.equal(valid(f).transitions.length,2);}));
test('successful SAME-CODE parent checkpoint bounds verification without needing expired old artifacts',()=>using(f=>{const first=f.append();const second=f.append();const state=valid(f,f.packet(f.checkpoint(first.sha),[second.proof]));assert.equal(state.transitions.length,1);assert.equal(state.checkpoint,first.sha);}));
test('missing checkpoint proof cannot be replaced by an arbitrary SHA',()=>using(f=>{const first=f.append();const second=f.append();const packet=f.packet({sha:first.sha,proof:null},[second.proof]);assert.throws(()=>valid(f,packet));}));
test('more than8 unverified source commits stop for reviewed recovery, not unbounded requests',()=>using(f=>{for(let i=0;i<9;i++)f.append();assert.throws(()=>valid(f),/budget/);}));
test('checkpoint must be on the exact first-parent history',()=>using(f=>{f.append();const packet=f.packet(f.checkpoint(f.family));assert.throws(()=>valid(f,packet));}));
for(const [name,change] of [
 ['old counter rewrite',x=>{x.after[Object.keys(x.after)[0]][0].distributedTokens=123;}],
 ['deletion',x=>{x.after[Object.keys(x.after)[0]].shift();}],
 ['insertion of two new rows',x=>{const rows=x.after[Object.keys(x.after)[0]];rows.push({...rows.at(-1),observedAt:'2026-10-28T12:00:01.000Z'});}],
 ['quote substitution',x=>{x.after[Object.keys(x.after)[0]].at(-1).quoteSymbol='OTHER';}],
 ['source substitution',x=>{x.after[Object.keys(x.after)[0]].at(-1).source='https://invalid.example/';}],
 ['reward mode substitution',x=>{x.after[Object.keys(x.after)[0]].at(-1).mode='fee';}],
 ['future provider clock',x=>{x.after[Object.keys(x.after)[0]].at(-1).providerGeneratedAt='2026-10-29T12:00:00.000Z';}],
 ['missing provider clock',x=>{delete x.after[Object.keys(x.after)[0]].at(-1).providerGeneratedAt;}],
 ['stale provider clock',x=>{x.after[Object.keys(x.after)[0]].at(-1).providerGeneratedAt='2026-10-27T12:00:00.000Z';}],
 ['summary mint mismatch',x=>{x.summary.results[0].mint='unsupported';}],
 ['invented success over failure',x=>{x.summary.overall='failed';}],
 ['manual event',x=>{x.summary.event='workflow_dispatch';}],
])test('authenticated artifact still cannot authorize '+name,()=>using(f=>{f.append({change});assert.throws(()=>valid(f));}));
for(const [name,change] of [
 ['wrong repository',p=>{p.collectors[0].run.repository.id=999;}],['wrong workflow',p=>{p.collectors[0].run.path='another.yml';}],
 ['manual workflow',p=>{p.collectors[0].run.event='workflow_dispatch';}],['wrong parent',p=>{p.collectors[0].run.head_sha='a'.repeat(40);}],
 ['expired artifact',p=>{p.collectors[0].artifact.expired=true;}],['artifact wrong run',p=>{p.collectors[0].artifact.workflow_run.id=9;}],
 ['missing artifact digest',p=>{p.collectors[0].artifact.digest=null;}],['oversized artifact',p=>{p.collectors[0].artifact.size_in_bytes=99999999;}],
 ['wrong source bytes',p=>{p.collectors[0].hashes['reward-snapshots.json']='0'.repeat(64);}],['unproven push',p=>{p.collectors[0].steps['Persist observations and summary']='failure';}],
 ['incomplete proof',p=>{p.collectors=[];}],['wrong session binding',p=>{p.binding.runAttempt='2';}],
])test('fail closed on '+name,()=>using(f=>{f.append();const p=f.packet(),binding=copy(p.binding);change(p);assert.throws(()=>verifyMainPacket(f.r,p.binding.head,p,binding,f.p));}));
test('post-release runtime/guard edits reject even if checkpoint status looks green',()=>using(f=>{f.write('protected.txt','changed');const bad=f.commit('OFFLINE forbidden code change');assert.throws(()=>inspectRelease(f.r,bad,f.p));}));
test('source byte rewrites after release reject',()=>using(f=>{f.write('reviewed-source.txt','rewritten');f.commit('OFFLINE source mutation');assert.throws(()=>valid(f));}));
test('a forged bot commit message and no authenticated run is not provenance',()=>using(f=>{f.append();const p=f.packet();p.collectors[0].run=null;assert.throws(()=>valid(f,p));}));
test('working tree mutation after an authenticated commit rejects',()=>using(f=>{f.append();const p=f.packet();f.write('protected.txt','dirty');assert.throws(()=>valid(f,p),/dirty_released/);}));
test('PR and offline runtime cannot promote to released using an evidence path',()=>using(f=>{const names=['V3_RELEASE_EVIDENCE','GITHUB_ACTIONS','GITHUB_EVENT_NAME'],old=Object.fromEntries(names.map(n=>[n,process.env[n]]));process.env.V3_RELEASE_EVIDENCE='/tmp/not-an-approval';process.env.GITHUB_ACTIONS='true';process.env.GITHUB_EVENT_NAME='pull_request';try{assert.deepEqual(runtimeState(f.r,f.p),{mode:'proposal',dataAllowed:false});}finally{for(const n of names){if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];}}}));
test('main context binds repo, exact SHA, immutable ref, run and attempt',()=>using(f=>{const e={repository:{id:f.p.repositoryId,full_name:f.p.repository},ref:'refs/heads/main',after:f.merge};const env={head:f.merge,ref:e.ref,runId:'999',runAttempt:'1'};assert.equal(bindingFor('push',e,env,f.p).head,f.merge);for(const v of [{...env,head:'a'.repeat(40)},{...env,ref:'refs/heads/feature'},{...env,runId:'bad'}])assert.throws(()=>bindingFor('push',e,v,f.p));}));
test('collector workflow_run context cannot be a dispatch or fork',()=>using(f=>{const e={action:'completed',repository:{id:f.p.repositoryId,full_name:f.p.repository},workflow_run:{id:42,event:'schedule',head_branch:'main',head_repository:{id:f.p.repositoryId},path:f.p.collector}};const env={head:f.merge,ref:'refs/heads/main',runId:'999',runAttempt:'1'};assert.equal(bindingFor('workflow_run',e,env,f.p).triggerRunId,'42');e.workflow_run.event='workflow_dispatch';assert.throws(()=>bindingFor('workflow_run',e,env,f.p));}));
for(const [name,change] of [
 ['wrong checkpoint job',p=>{p.checkpoint.proof.job.name='build';}],['skipped checkpoint',p=>{p.checkpoint.proof.job.conclusion='skipped';}],
 ['PR checkpoint',p=>{p.checkpoint.proof.run.event='pull_request';}],['foreign checkpoint',p=>{p.checkpoint.proof.run.repository.id=7;}],
 ['checkpoint wrong SHA',p=>{p.checkpoint.proof.run.head_sha='a'.repeat(40);}],['current run as checkpoint',p=>{p.checkpoint.proof.run.id=Number(p.binding.runId);p.checkpoint.proof.job.run_id=Number(p.binding.runId);}],
])test('cannot trust '+name,()=>using(f=>{const a=f.append(),b=f.append(),packet=f.packet(f.checkpoint(a.sha),[b.proof]);change(packet);assert.throws(()=>valid(f,packet));}));
function withMain(f,packet,fn){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'v3-synthetic-ci-')),file=path.join(temp,'unfarmd-v3-main-evidence.json'),eventPath=path.join(temp,'event.json');
 const names=['GITHUB_ACTIONS','GITHUB_EVENT_NAME','GITHUB_EVENT_PATH','GITHUB_SHA','GITHUB_REF','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','RUNNER_TEMP','V3_RELEASE_EVIDENCE'],old=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 fs.writeFileSync(file,JSON.stringify(packet),{mode:0o600});fs.writeFileSync(eventPath,JSON.stringify({repository:{id:f.p.repositoryId,full_name:f.p.repository},ref:'refs/heads/main',after:packet.binding.head}));
 Object.assign(process.env,{GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',GITHUB_EVENT_PATH:eventPath,GITHUB_SHA:packet.binding.head,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ID:packet.binding.runId,GITHUB_RUN_ATTEMPT:'1',RUNNER_TEMP:temp,V3_RELEASE_EVIDENCE:file});
 try{return fn({file,eventPath,temp});}finally{for(const n of names){if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];}fs.rmSync(temp,{recursive:true,force:true});}
}
test('actual main file loader verifies merge and synthetic future append with exact event/run binding',()=>using(f=>{f.append();withMain(f,f.packet(),()=>assert.equal(runtimeState(f.r,f.p).transitions.length,1));}));
test('actual main loader rejects stale run attempts rather than reusing an approval',()=>using(f=>{f.append();withMain(f,f.packet(),()=>{process.env.GITHUB_RUN_ATTEMPT='2';assert.throws(()=>runtimeState(f.r,f.p),/context/);});}));
test('actual main loader rejects evidence inside checkout and symlinks',()=>using(f=>{f.append();withMain(f,f.packet(),({file,temp})=>{const link=path.join(temp,'another.json');fs.symlinkSync(file,link);process.env.V3_RELEASE_EVIDENCE=link;assert.throws(()=>runtimeState(f.r,f.p),/location/);});}));
test('feature branch cannot borrow an otherwise valid current-main proof to change collector data',()=>using(f=>{f.append();withMain(f,f.packet(),()=>{process.env.GITHUB_EVENT_NAME='pull_request';assert.throws(()=>runtimeState(f.r,f.p),/feature_branch_data_change/);});}));
test('untracked main evidence/runtime files reject rather than being silently ignored',()=>using(f=>{f.append();f.write('unreviewed.txt','unknown');assert.throws(()=>valid(f),/untracked_released/);}));
test('bad collector JSON fails without echoing its contents',()=>{const payload={beforeRaw:'{"SENSITIVE_CANARY":NaN}',afterRaw:'{}',summaryRaw:'{}',trackedRaw:'[]',run:{}};assert.throws(()=>execFileSync('python3',[path.join(ROOT,'tests/v3-release/collector-append.py')],{input:JSON.stringify(payload),encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'}}),e=>e.stderr.trim()==='collector_transition_rejected'&&!e.message.includes('SENSITIVE_CANARY'));});
