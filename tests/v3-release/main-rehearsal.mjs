// Fully offline, disposable NORMAL-MERGE + real C/B scope regression.
// All CI IDs/clocks/SDK responses are synthetic. No financial observation is added.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {POLICY,repository,digest,inspectRelease} from './lifecycle.mjs';
import {writeCurrentMainEvidence} from './github-proof.mjs';
import {assertAggregate} from './assertions.mjs';
import {zipFiles} from './lifecycle-fixtures.mjs';
const source=process.cwd(),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const root=fs.mkdtempSync(path.join(os.tmpdir(),'v3-full-main-')),temp=fs.mkdtempSync(path.join(os.tmpdir(),'v3-full-evidence-'));
const names=['GITHUB_ACTIONS','GITHUB_EVENT_NAME','GITHUB_EVENT_PATH','GITHUB_SHA','GITHUB_REF','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','RUNNER_TEMP','V3_RELEASE_EVIDENCE'],old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
const git=(args,input,date='2027-01-01T12:00:01Z')=>execFileSync('git',args,{cwd:root,input,encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,GIT_AUTHOR_DATE:date,GIT_COMMITTER_DATE:date}}).trim();
const commit=(name,date)=>{git(['add','.']);return git(['-c','user.name=OFFLINE_FIXTURE','-c','user.email=offline@example.invalid','commit','-qm',name],undefined,date)&&git(['rev-parse','HEAD']);};
try{
 execFileSync('git',['clone','--local','--shared','--no-checkout',source,root],{stdio:['ignore','pipe','pipe']});git(['checkout','--detach',POLICY.base]);fs.symlinkSync(path.join(source,'node_modules'),path.join(root,'node_modules'),'dir');
 const r=repository(root),tokens=JSON.parse(r.blob(POLICY.base,POLICY.tracked)),reward=r.blob(POLICY.base,POLICY.data[1]);
 const summary={version:1,startedAt:'2027-01-01T12:00:00Z',finishedAt:'2027-01-01T12:00:01Z',event:'schedule',runId:900000001,overall:'failed',expectedDatasetRevision:'sha256:'+digest(reward),results:tokens.map(t=>({mint:t.mint,status:'failed',reason:'network_error',observedAt:null}))};
 fs.writeFileSync(path.join(root,POLICY.data[0]),JSON.stringify(summary,null,2)+'\n');const hourly=commit('OFFLINE synthetic failed hourly summary');
 const doc=execFileSync('python3',['-c',"import sys,datetime as d,json; sys.path.insert(0,'scripts'); import audit_collector as a; fail=lambda *args: (_ for _ in ()).throw(ValueError('OFFLINE')); print(json.dumps(a.audit(fetcher=fail,now=d.datetime(2027,1,1,12,1,tzinfo=d.timezone.utc)),indent=2))"],{cwd:root,env:{PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'}});
 fs.writeFileSync(path.join(root,POLICY.audit),doc);const fresh=commit('OFFLINE synthetic unavailable daily audit','2027-01-01T12:01:01Z');
 git(['checkout','--detach',head]);for(const file of [...POLICY.data,POLICY.audit])git(['checkout',fresh,'--',file]);
 const merge=git(['-c','user.name=OFFLINE_FIXTURE','-c','user.email=offline@example.invalid','commit-tree',git(['write-tree']),'-p',fresh,'-p',head],'OFFLINE synthetic normal release\n');git(['checkout','--detach',merge]);process.chdir(root);
 assert.deepEqual(inspectRelease(r,merge).parents,[fresh,head]);assert.deepEqual(r.blob(merge,POLICY.data[1]),reward);
 const run=(id,parent,workflow,start,end)=>({id,run_attempt:1,event:'schedule',path:workflow,head_branch:'main',head_sha:parent,status:'completed',conclusion:'failure',run_started_at:start,updated_at:end,repository:{id:POLICY.repositoryId},head_repository:{id:POLICY.repositoryId}});
 const rows=[{run:run(900000001,POLICY.base,POLICY.collector,'2027-01-01T11:59:59Z','2027-01-01T12:00:10Z'),commit:hourly,files:POLICY.data,job:'collect',steps:['Collect observations','Persist observations and summary','Preserve diagnostic evidence'],prefix:'collector-evidence'},
 {run:run(900000002,hourly,POLICY.auditWorkflow,'2027-01-01T12:00:59Z','2027-01-01T12:01:10Z'),commit:fresh,files:[POLICY.audit],job:'audit',steps:['Bounded read-only audit','Publish audit evidence','Preserve audit evidence'],prefix:'data-health-audit'}];
 for(const row of rows){row.zip=zipFiles(Object.fromEntries(row.files.map(file=>[path.basename(file),r.blob(row.commit,file).toString()])));row.artifact={id:row.run.id+100,name:`${row.prefix}-${row.run.id}-1`,expired:false,size_in_bytes:row.zip.length,digest:'sha256:'+digest(row.zip),workflow_run:{id:row.run.id,head_sha:row.run.head_sha},created_at:row.job==='audit'?'2027-01-01T12:01:03Z':'2027-01-01T12:00:03Z',expires_at:row.job==='audit'?'2027-01-08T12:01:03Z':'2027-01-08T12:00:03Z'};}
 let reads=0;const github={request:async(route,args)=>{reads++;assert.ok(route.startsWith('GET '));let data;
  if(route.includes('/workflows/'))data=args.workflow_id==='data-health.yml'?{total_count:1,workflow_runs:[rows[1].run]}:{workflow_runs:[]};
  else if(route.endsWith('/jobs')){const row=rows.find(r=>r.run.id===args.run_id);data={total_count:1,jobs:[{id:row.run.id+200,run_id:row.run.id,name:row.job,status:'completed',steps:row.steps.map((name,i)=>({name,conclusion:row.job==='collect'&&i===0?'failure':'success'}))}]};}
  else if(route.endsWith('/artifacts'))data={total_count:1,artifacts:[rows.find(r=>r.run.id===args.run_id).artifact]};
  else if(route.includes('/actions/artifacts/'))data=rows.find(r=>r.artifact.id===args.artifact_id).zip;
  else data=rows.find(r=>r.run.id===args.run_id).run;
  return {status:200,data};
 }};
 const event={repository:{id:POLICY.repositoryId,full_name:POLICY.repository},ref:'refs/heads/main',after:merge},eventPath=path.join(temp,'event.json');fs.writeFileSync(eventPath,JSON.stringify(event),{mode:0o600});
 const env={PATH:process.env.PATH,GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',GITHUB_EVENT_PATH:eventPath,GITHUB_SHA:merge,GITHUB_REF:event.ref,GITHUB_RUN_ID:'900000003',GITHUB_RUN_ATTEMPT:'1',RUNNER_TEMP:temp,V3_RELEASE_EVIDENCE:path.join(temp,'unfarmd-v3-main-evidence.json')};Object.assign(process.env,env);
 await writeCurrentMainEvidence({github,context:{eventName:'push',payload:event},env});assert.equal(reads,10);assertAggregate();
 for(const file of ['tests/desk-journey/scope.test.mjs','tests/unfarmd-journal/scope.test.mjs','tests/v3-release/scope.test.mjs']){
  const output=execFileSync(process.execPath,['--test',file],{cwd:root,env:{...env,NODE_OPTIONS:'--import='+path.join(root,'tests/security114/local-only.mjs')},encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:1024*1024});assert.match(output,/fail 0\b/);assert.match(output,/skipped 0\b/);
 }
 assert.deepEqual(r.blob(merge,POLICY.data[1]),reward);
 console.log('PASS full synthetic fresh-main rehearsal: normal2-parent merge, exact3-file preservation, actual evidence writer/109 source pins/C5/B3/release4;10 MOCKED GitHub reads; zero new financial observations.');
}finally{
 for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
 process.chdir(source);fs.rmSync(root,{recursive:true,force:true});fs.rmSync(temp,{recursive:true,force:true});
}
