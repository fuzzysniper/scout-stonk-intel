// Synthetic disposable Git/SDK fixtures only. No dispatch, SQL, credentials or source traffic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {fixture,copy,zipFiles,ROOT} from './lifecycle-fixtures.mjs';
import {verifyMainPacket,inspectRelease,segment,bindingFor,runtimeState,POLICY,digest} from './lifecycle.mjs';
import {acquireProof} from './github-proof.mjs';
import {assertAggregate} from './assertions.mjs';
const H='8d990bccef331cad94ddf22af55123605f1dd576';
const using=async fn=>{const f=fixture();try{await fn(f);}finally{f.close();}};
const valid=(f,p=f.packet())=>verifyMainPacket(f.r,p.binding.head,p,p.binding,f.p);
function client(f,updates,{mutate=(_route,data)=>data,fail=null}={}){
 const calls=[];
 return {calls,github:{request:async(route,args)=>{
  calls.push({route,args});assert.equal(args.owner,'fixture');assert.equal(args.repo,'offline');assert.equal(args.request.timeout,f.p.timeoutMs);
  if(fail)throw fail;let data;
  if(route.includes('/workflows/')){
   if(args.workflow_id===path.basename(f.p.auditWorkflow)){
    assert.equal(args.event,'schedule');assert.equal(args.branch,'main');assert.equal(args.status,'completed');assert.equal(args.per_page,5);
    const runs=updates.filter(u=>u.proof.kind==='audit'&&u.parent===args.head_sha).map(u=>copy(u.proof.run));data={total_count:runs.length,workflow_runs:runs};
   }else data={workflow_runs:[]};
  }else if(route.endsWith('/jobs')){
   const u=updates.find(u=>u.proof.run.id===args.run_id);assert.ok(u);data={total_count:1,jobs:[{id:1000+u.proof.run.id,run_id:u.proof.run.id,name:u.proof.kind==='audit'?'audit':'collect',status:'completed',steps:Object.entries(u.proof.steps).map(([name,conclusion])=>({name,conclusion}))}]};
  }else if(route.endsWith('/artifacts'))data={total_count:1,artifacts:[copy(updates.find(u=>u.proof.run.id===args.run_id).proof.artifact)]};
  else if(route.includes('/actions/artifacts/'))data=updates.find(u=>u.proof.artifact.id===args.artifact_id).zip;
  else data=copy(updates.find(u=>u.proof.run.id===args.run_id).proof.run);
  return {status:200,data:mutate(route,data)};
 }}};
}
const acquire=(f,c,b=f.binding(f.r.git('rev-parse','HEAD')))=>acquireProof({github:c.github,r:f.r,binding:b,p:f.p});
test('reproduce exact PR200 rejection, then admit only the distinct authenticated daily transition',()=>using(async f=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'audit204-old-'));
 try{const file=path.join(temp,'old.mjs');fs.writeFileSync(file,execFileSync('git',['show',H+':tests/v3-release/lifecycle.mjs'],{cwd:ROOT}));const old=await import(pathToFileURL(file));
  const u=f.appendAudit();assert.throws(()=>old.segment(f.r,u.sha,{merge:f.merge,parents:[f.base,f.family]},f.p),/collector_only_paths_required/);
  assert.equal(segment(f.r,u.sha,{merge:f.merge,parents:[f.base,f.family]},f.p).kind,'audit');assert.equal(valid(f).transitions[0].kind,'audit');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}));
test('both original91 test files and the complete hourly Python guard/function remain byte-identical',()=>{
 for(const p of ['tests/v3-release/lifecycle.test.mjs','tests/v3-release/github-proof.test.mjs','tests/v3-release/collector-append.py'])assert.deepEqual(fs.readFileSync(p),execFileSync('git',['show',H+':'+p]));
 const functionText=s=>s.split('export function verifyCollectorProof(')[1].split('\n}\n')[0];assert.equal(functionText(fs.readFileSync('tests/v3-release/lifecycle.mjs','utf8')),functionText(execFileSync('git',['show',H+':tests/v3-release/lifecycle.mjs'],{encoding:'utf8'})));
});
test('checked audit is the actual pure producer output and does not advance source observations',()=>using(f=>{const before=f.r.blob('HEAD',f.p.data[1]),u=f.appendAudit();valid(f);assert.equal(u.document.state,'checked');assert.equal(u.document.cadence.intendedSlotsKnown,false);assert.deepEqual(f.r.blob(u.sha,f.p.data[1]),before);}));
for(const now of ['2026-10-28T13:17:00.500Z','2026-10-28T13:32:00.500Z'])test('actual producer subsecond cadence boundary retains honest serialized clocks '+now,()=>using(f=>{f.appendAudit({now});valid(f);}));
for(const options of [{available:false},{partial:true},{incomplete:true}])test('actual unavailable/partial/incomplete producer output stays explicitly degraded '+JSON.stringify(options),()=>using(f=>{const u=f.appendAudit(options);valid(f);if(options.incomplete)assert.equal(u.document.cadence.matureSlotsWithoutRunCreation,null);else assert.equal(u.document.state,'unavailable');}));
test('snapshot counts may decrease without rewriting history or claiming zero provider execution',()=>using(f=>{const a=f.appendAudit({scheduledCount:100});const b=f.appendAudit();valid(f);assert.equal(a.document.scheduledRunCount,100);assert.equal(b.document.scheduledRunCount,0);assert.ok(Date.parse(b.document.checkedAt)>Date.parse(a.document.checkedAt));assert.deepEqual(f.r.blob(a.sha,f.p.audit),Buffer.from(JSON.stringify(a.document,null,2)+'\n'));}));
test('SDK binds exact daily schedule, parent, attempt, required steps, ZIP and Git bytes',()=>using(async f=>{const u=f.appendAudit(),c=client(f,[u]),out=await acquire(f,c);assert.equal(out.calls,6);assert.equal(out.packet.collectors[0].kind,'audit');assert.ok(c.calls.every(c=>c.route.startsWith('GET ')));valid(f,out.packet);}));
test('seven-day retention is measured from artifact creation, including a slow legitimate audit job',()=>using(f=>{const u=f.appendAudit();u.proof.run.run_started_at=new Date(Date.parse(u.proof.artifact.created_at)-4*60000).toISOString();u.proof.artifact.expires_at=new Date(Date.parse(u.proof.artifact.created_at)+7*86400000).toISOString();valid(f);}));
test('hourly/daily/hourly/daily catchup shares original8-transition and64-read budgets',()=>using(async f=>{const a=f.append(),b=f.appendAudit(),c=f.append(),d=f.appendAudit(),sdk=client(f,[a,b,c,d]),out=await acquire(f,sdk);assert.equal(out.packet.collectors.length,4);assert.ok(out.calls<=f.p.maxApiCalls);valid(f,out.packet);}));
test('a future daily audit can follow a successful exact-parent same-code checkpoint',()=>using(f=>{const a=f.appendAudit(),b=f.append(),c=f.appendAudit();const packet=f.packet(f.checkpoint(a.sha),[c.proof,b.proof]);assert.equal(valid(f,packet).transitions.length,2);}));
test('nine interleaved unverified commits cannot multiply budgets per producer',()=>using(f=>{for(let n=0;n<9;n++){if(n%2)f.append();else f.appendAudit();}assert.throws(()=>valid(f),/budget/);}));
test('daily workflow completion is a supported trigger; manual/unrelated/fork completion is not',()=>using(async f=>{const u=f.appendAudit(),sdk=client(f,[u]),binding={...f.binding(u.sha),event:'workflow_run',triggerRunId:String(u.proof.run.id)};const out=await acquire(f,sdk,binding);valid(f,out.packet);
 const event={action:'completed',repository:{id:f.p.repositoryId,full_name:f.p.repository},workflow_run:{id:u.proof.run.id,event:'schedule',head_branch:'main',head_repository:{id:f.p.repositoryId},path:f.p.auditWorkflow}};
 const env={head:u.sha,runId:'999999',runAttempt:'1',ref:'refs/heads/main'};assert.equal(bindingFor('workflow_run',event,env,f.p).triggerRunId,String(u.proof.run.id));
 for(const changed of [{...event,workflow_run:{...event.workflow_run,event:'workflow_dispatch'}},{...event,workflow_run:{...event.workflow_run,path:'unreviewed.yml'}},{...event,workflow_run:{...event.workflow_run,head_repository:{id:1}}}])assert.throws(()=>bindingFor('workflow_run',changed,env,f.p));
}));
for(const [name,change] of [
 ['bad version',d=>{d.version=2;}],['unknown field',d=>{d.sourceGo=true;}],['reason mismatch',d=>{d.reason='healthy';}],
 ['bad state',d=>{d.state='healthy';}],['invented zero count',d=>{d.scheduledRunCount=null;}],['boolean count',d=>{d.scheduledRunCount=true;}],['negative count',d=>{d.scheduledRunCount=-1;}],['unsafe count',d=>{d.scheduledRunCount=2**53;}],
 ['missing clock',d=>{delete d.checkedAt;}],['future clock',d=>{d.checkedAt='2030-01-01T00:00:00Z';}],['stale clock',d=>{d.checkedAt='2026-10-26T00:00:00Z';}],
 ['wrong dataset',d=>{d.latestDatasetCommit.sha='f'.repeat(40);}],['wrong revision',d=>{d.latestDatasetCommit.revision='sha256:'+'0'.repeat(64);}],['wrong source commit time',d=>{d.latestDatasetCommit.committedAt='2026-01-01T00:00:00Z';}],
 ['cadence claims intended slots',d=>{d.cadence.intendedSlotsKnown=true;}],['false grace',d=>{d.cadence.graceSeconds=0;}],['false window',d=>{d.cadence.windowEnd='2030-01-01T00:00:00Z';}],['invented missed slots',d=>{d.cadence.matureSlotsWithoutRunCreation=999;}],
 ['extra row fields',d=>{d.runs=[{mint:'fabricated'}];}],['nonfinite number',d=>{d.scheduledRunCount=Infinity;}],
])test('authenticated artifact cannot authorize '+name,()=>using(f=>{f.appendAudit({change});assert.throws(()=>valid(f));}));
test('incomplete cadence cannot be converted to zero missing opportunities',()=>using(f=>{f.appendAudit({incomplete:true,change:d=>{d.cadence.matureSlotsWithoutRunCreation=0;}});assert.throws(()=>valid(f));}));
test('degraded snapshot cannot be upgraded to checked by inventing a missing count',()=>using(f=>{f.appendAudit({available:false,change:d=>{d.state='checked';d.reason=null;}});assert.throws(()=>valid(f));}));
for(const [name,change] of [
 ['hourly proof substituted',p=>{delete p.kind;}],['wrong parent',p=>{p.run.head_sha='a'.repeat(40);}],['wrong workflow',p=>{p.run.path='.github/workflows/reward-snapshots.yml';}],['wrong repo',p=>{p.run.repository.id=0;}],['manual audit',p=>{p.run.event='workflow_dispatch';}],
 ['unfinished run',p=>{p.run.status='in_progress';}],['expired artifact',p=>{p.artifact.expired=true;}],['wrong attempt',p=>{p.run.run_attempt=2;}],['wrong artifact run',p=>{p.artifact.workflow_run.id=3;}],['wrong artifact head',p=>{p.artifact.workflow_run.head_sha='a'.repeat(40);}],
 ['wrong artifact name',p=>{p.artifact.name='collector-evidence-200-1';}],['missing hash',p=>{delete p.hashes['collector-audit.json'];}],['wrong content hash',p=>{p.hashes['collector-audit.json']='a'.repeat(64);}],['wrong source hash',p=>{p.sources[Object.keys(p.sources)[0]]='a'.repeat(64);}],
 ['audit failure',p=>{p.steps['Bounded read-only audit']='failure';}],['push failure',p=>{p.steps['Publish audit evidence']='failure';}],['upload failure',p=>{p.steps['Preserve audit evidence']='failure';}],
 ['wrong run clock',p=>{p.run.run_started_at='2030-01-01T00:00:00Z';}],
 ['excess retention',p=>{p.artifact.expires_at='2030-01-01T00:00:00Z';}],['artifact before publication',p=>{p.artifact.created_at='2026-01-01T00:00:00Z';}],['invalid artifact clocks',p=>{p.artifact.expires_at=p.artifact.created_at;}],
])test('daily proof rejects '+name,()=>using(f=>{f.appendAudit();const packet=f.packet();change(packet.collectors[0]);assert.throws(()=>valid(f,packet));}));
for(const [name,mutate] of [
 ['zero candidates',(route,d)=>{if(route.includes('/workflows/')&&d.total_count!==undefined){d.total_count=0;d.workflow_runs=[];}return d;}],
 ['ambiguous candidates',(route,d)=>{if(route.includes('/workflows/')&&d.total_count!==undefined){d.total_count=2;d.workflow_runs.push(copy(d.workflow_runs[0]));}return d;}],
 ['truncated candidate page',(route,d)=>{if(route.includes('/workflows/')&&d.total_count!==undefined)d.total_count=6;return d;}],
 ['new run attempt during read',(route,d)=>{if(route.endsWith('/runs/{run_id}'))d.run_attempt++;return d;}],
 ['wrong job',(route,d)=>{if(route.endsWith('/jobs'))d.jobs[0].name='collect';return d;}],
 ['job from another run',(route,d)=>{if(route.endsWith('/jobs'))d.jobs[0].run_id++;return d;}],
 ['missing artifact',(route,d)=>{if(route.endsWith('/artifacts'))d.artifacts=[];return d;}],
 ['duplicate artifact',(route,d)=>{if(route.endsWith('/artifacts'))d.artifacts.push(copy(d.artifacts[0]));return d;}],
 ['truncated artifact page',(route,d)=>{if(route.endsWith('/artifacts'))d.total_count++;return d;}],
 ['oversized artifact',(route,d)=>{if(route.endsWith('/artifacts'))d.artifacts[0].size_in_bytes=99999999;return d;}],
 ['bad downloaded ZIP',(route,d)=>route.includes('/actions/artifacts/')?Buffer.from('invalid'):d],
])test('bounded SDK path rejects '+name,()=>using(async f=>{const u=f.appendAudit(),c=client(f,[u],{mutate});await assert.rejects(()=>acquire(f,c));assert.ok(c.calls.length<=f.p.maxApiCalls);}));
for(const status of [401,403,404,410,429,503])test('daily GitHub '+status+' remains terminal without retry or alternate source',()=>using(async f=>{const u=f.appendAudit(),c=client(f,[u],{fail:Object.assign(Error('DO_NOT_ECHO_TOKEN'),{status})});await assert.rejects(()=>acquire(f,c));assert.equal(c.calls.length,1);}));
test('daily request budget is charged before SDK even for run discovery',()=>using(async f=>{const u=f.appendAudit(),c=client(f,[u]);f.p.maxApiCalls=2;await assert.rejects(()=>acquire(f,c),/budget/);assert.equal(c.calls.length,2);}));
test('audit mixed with an hourly file, protected path, allowlist or workflow is never one allowed transition',()=>using(f=>{f.appendAudit();f.write(f.p.audit,f.r.blob('HEAD',f.p.audit).toString()+' ');f.write(f.p.data[0],'{}');const bad=f.commit('OFFLINE forbidden mixed edit');assert.throws(()=>valid(f));assert.throws(()=>segment(f.r,bad,{merge:f.merge,parents:[f.base,f.family]},f.p));}));
for(const file of ['scripts/audit_collector.py','.github/workflows/data-health.yml','data/tracked-mints.json','protected.txt'])test('changed '+file+' is not excused by audit evidence',()=>using(f=>{f.write(file,'UNREVIEWED');f.commit('OFFLINE source change');assert.throws(()=>{f.appendAudit();valid(f);});}));
test('fresh main with an hourly and daily commit is preserved by normal merge, then a future audit still verifies',()=>using(f=>{
 f.command(['checkout','--detach','-q',f.base]);const h=f.append(),a=f.appendAudit();const fresh=a.sha;
 f.command(['checkout','--detach','-q',f.family]);for(const file of [...f.p.data,f.p.audit])f.write(file,f.r.blob(fresh,file));f.command(['add','.']);const m=f.objCommit(f.command(['write-tree']),[fresh,f.family]);f.command(['checkout','--detach','-q',m]);
 assert.deepEqual(inspectRelease(f.r,m,f.p).parents,[fresh,f.family]);assert.equal(valid(f).transitions.length,2);const future=f.appendAudit();assert.equal(valid(f).transitions.length,3);
 for(const file of f.p.data)assert.deepEqual(f.r.blob(future.sha,file),f.r.blob(h.sha,file));
}));
test('fresh-main merge cannot reset the audit snapshot to old candidate bytes',()=>using(f=>{f.command(['checkout','--detach','-q',f.base]);const a=f.appendAudit();const m=f.objCommit(f.r.git('rev-parse',f.family+'^{tree}'),[a.sha,f.family]);assert.throws(()=>inspectRelease(f.r,m,f.p),/overwrites_main_data/);}));
for(const kind of ['audit','hourly'])test('normal merge preserves main data file mode as well as content '+kind,()=>using(f=>{const file=kind==='audit'?f.p.audit:f.p.data[1];f.command(['checkout','--detach','-q',f.family]);f.command(['update-index','--chmod=+x',file]);const m=f.objCommit(f.command(['write-tree']),[f.base,f.family]);assert.throws(()=>inspectRelease(f.r,m,f.p),/overwrites_main_data/);}));
test('daily replacement cannot change the audit file to executable mode',()=>using(f=>{f.appendAudit();fs.chmodSync(path.join(f.root,f.p.audit),0o755);const bad=f.commit('OFFLINE audit mode change');assert.throws(()=>segment(f.r,bad,{merge:f.merge,parents:[f.base,f.family]},f.p),/audit_file_mode/);}));
test('audit rollback to a previous snapshot fails even if a new artifact attests the stale bytes',()=>using(f=>{const a=f.appendAudit();f.appendAudit();f.appendAudit({change:d=>Object.assign(d,a.document)});assert.throws(()=>valid(f));}));
test('reviewed code rollback preserves later hourly and audit data without source/counter reset',()=>using(f=>{f.append();f.appendAudit();const head=f.r.git('rev-parse','HEAD'),files=[...f.p.data,f.p.audit],before=files.map(p=>f.r.blob(head,p));f.command(['revert','--no-commit','--mainline','1',f.merge]);for(let i=0;i<files.length;i++)assert.deepEqual(fs.readFileSync(path.join(f.root,files[i])),before[i]);}));
function withMain(f,fn){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'audit204-ci-')),file=path.join(temp,'unfarmd-v3-main-evidence.json'),eventPath=path.join(temp,'event.json'),head=f.r.git('rev-parse','HEAD');
 const names=['GITHUB_ACTIONS','GITHUB_EVENT_NAME','GITHUB_EVENT_PATH','GITHUB_SHA','GITHUB_REF','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','RUNNER_TEMP','V3_RELEASE_EVIDENCE'],old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 fs.writeFileSync(file,JSON.stringify(f.packet()),{mode:0o600});fs.writeFileSync(eventPath,JSON.stringify({repository:{id:f.p.repositoryId,full_name:f.p.repository},ref:'refs/heads/main',after:head}));
 Object.assign(process.env,{GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',GITHUB_EVENT_PATH:eventPath,GITHUB_SHA:head,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ID:'999999',GITHUB_RUN_ATTEMPT:'1',RUNNER_TEMP:temp,V3_RELEASE_EVIDENCE:file});
 try{return fn();}finally{for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}fs.rmSync(temp,{recursive:true,force:true});}
}
test('actual main file loader accepts daily evidence; PR context cannot borrow it to change the audit',()=>using(f=>{f.appendAudit();withMain(f,()=>{assert.equal(runtimeState(f.r,f.p).transitions[0].kind,'audit');process.env.GITHUB_EVENT_NAME='pull_request';assert.throws(()=>runtimeState(f.r,f.p),/feature_branch_data_change/);});}));
test('actual unchanged runner step binds evidence path outside checkout with a real newline',()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'audit204-env-'));try{const w=fs.readFileSync('.github/workflows/desk-integration.yml','utf8'),line=w.split('\n').find(l=>l.includes("run: printf 'V3_RELEASE_EVIDENCE=")).trim().slice(5),file=path.join(tmp,'env');execFileSync('bash',['-euc',line],{env:{PATH:process.env.PATH,RUNNER_TEMP:tmp,GITHUB_ENV:file}});assert.equal(fs.readFileSync(file,'utf8'),`V3_RELEASE_EVIDENCE=${tmp}/unfarmd-v3-main-evidence.json\n`);}finally{fs.rmSync(tmp,{recursive:true,force:true});}});
function decode(zip){return execFileSync('python3',['tests/v3-release/audit-snapshot.py','zip'],{input:zip,encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'}});}
test('one-file daily ZIP reports only its hash',()=>{assert.deepEqual(JSON.parse(decode(zipFiles({'collector-audit.json':'SYNTHETIC_NOT_A_CREDENTIAL'}))),{'collector-audit.json':digest('SYNTHETIC_NOT_A_CREDENTIAL')});});
for(const [name,files] of [['traversal',{'../collector-audit.json':'x'}],['hourly substitution',{'reward-snapshots.json':'x'}],['extra file',{'collector-audit.json':'{}','collection-summary.json':'{}'}],['oversized',{'collector-audit.json':'x'.repeat(256*1024+1)}]])test('daily ZIP rejects '+name,()=>assert.throws(()=>decode(zipFiles(files))));
test('duplicate/invalid JSON fails categorically without echoing input',()=>{assert.throws(()=>execFileSync('python3',['tests/v3-release/audit-snapshot.py'],{input:'{"SENSITIVE_SYNTHETIC":1,"SENSITIVE_SYNTHETIC":2}',encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'}}),e=>e.stderr.trim()==='audit_transition_rejected'&&!e.message.includes('SENSITIVE_SYNTHETIC'));});
test('public route, auth, STOP, producers/workflows, source hashes and root security runner unchanged',()=>{
 assertAggregate(); // Data may change ONLY after the independently verified main proof.
 assert.equal(execFileSync('git',['diff',H,'--','app','lib','scripts','scheduler','ops','.github/workflows/reward-snapshots.yml','.github/workflows/data-health.yml','.github/workflows/ci.yml','tests/run.sh','tests/v3-release/source-manifest.json'],{encoding:'utf8'}),'');
 assert.equal(POLICY.maxTransitions,8);assert.equal(POLICY.maxApiCalls,64);assert.equal(POLICY.timeoutMs,5000);assert.equal(POLICY.maxBytes,4*1024*1024);
});
