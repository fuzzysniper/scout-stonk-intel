// SYNTHETIC DISPOSABLE GIT/CI FIXTURES. No observed asset, price, account or call.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {POLICY,repository,digest,auditSources} from './lifecycle.mjs';
export const ROOT=process.cwd();
export const copy=x=>JSON.parse(JSON.stringify(x));
const mint='1'.repeat(31)+'2',quote='1'.repeat(31)+'3';
const token={mint,quoteMint:quote,quoteSymbol:'SYNTHQ',source:`https://www.stonkfun.xyz/api/public/v1/tokens/${mint}/rewards`};
export function zipFiles(files){
 return execFileSync('python3',['-c',"import sys,json,io,zipfile; f=json.load(sys.stdin); b=io.BytesIO(); z=zipfile.ZipFile(b,'w'); [z.writestr(zipfile.ZipInfo(k,(2026,10,28,0,0,0)),v,compress_type=zipfile.ZIP_DEFLATED) for k,v in f.items()]; z.close(); sys.stdout.buffer.write(b.getvalue())"],{input:JSON.stringify(files),maxBuffer:8*1024*1024,env:{PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'}});
}
export function fixture({rows=2}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'v3-synthetic-git-'));
 const env={...process.env,GIT_AUTHOR_DATE:'2026-10-28T12:00:00Z',GIT_COMMITTER_DATE:'2026-10-28T12:00:00Z'};
 const command=(args,input)=>execFileSync('git',args,{cwd:root,env,input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 const write=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),value);};
 const json=(file,value)=>write(file,JSON.stringify(value,null,2)+'\n');
 const commit=message=>{command(['add','.']);command(['-c','user.name=OFFLINE_FIXTURE','-c','user.email=offline@example.invalid','commit','-qm',message]);return command(['rev-parse','HEAD']);};
 const objCommit=(tree,parents)=>command(['-c','user.name=OFFLINE_FIXTURE','-c','user.email=offline@example.invalid','commit-tree',tree,...parents.flatMap(p=>['-p',p])],'OFFLINE synthetic release\n');
 command(['init','-q','--initial-branch=main']);
 write('.gitignore','__pycache__/\n');write('protected.txt','UNCHANGED SECURITY BOUNDARY\n');
 write(POLICY.collector,'FROZEN SYNTHETIC COLLECTOR WORKFLOW\n');write(POLICY.workflow,'FROZEN SYNTHETIC READ-ONLY VERIFIER\n');
 write(POLICY.auditWorkflow,'FROZEN SYNTHETIC DAILY AUDIT WORKFLOW\n');
 write(POLICY.auditProducer,fs.readFileSync(path.join(ROOT,POLICY.auditProducer)));
 write('scripts/collect_rewards.py',fs.readFileSync(path.join(ROOT,'scripts/collect_rewards.py')));
 write('tests/v3-release/collector-append.py',fs.readFileSync(path.join(ROOT,'tests/v3-release/collector-append.py')));
 write('tests/v3-release/audit-snapshot.py',fs.readFileSync(path.join(ROOT,'tests/v3-release/audit-snapshot.py')));
 json(POLICY.audit,{version:1,checkedAt:'2026-10-27T00:00:00+00:00',state:'unavailable',reason:'api_unavailable',workflowState:'unknown',scheduledRunCount:null,runs:[],latestDatasetCommit:null,cadence:{state:'unavailable'}});
 const row=(at,total)=>({observedAt:at,providerGeneratedAt:at,mode:'reward',distributedTokens:total,payoutCount:total,holderCount:null,lastPayoutAt:null,quoteMint:quote,quoteSymbol:'SYNTHQ',source:token.source});
 const last=Date.parse('2026-10-28T11:00:00.000Z');
 json(POLICY.tracked,[token]);json(POLICY.data[1],{[mint]:Array.from({length:rows},(_,i)=>row(new Date(last-(rows-1-i)*3600000).toISOString(),i+1))});
 json(POLICY.data[0],{version:1,event:'schedule',runId:1,startedAt:'2026-10-28T11:00:00.000Z',finishedAt:'2026-10-28T11:00:00.000Z',overall:'complete',expectedDatasetRevision:'sha256:'+digest(fs.readFileSync(path.join(root,POLICY.data[1]))),results:[{mint,status:'collected',reason:'collected',observedAt:'2026-10-28T11:00:00.000Z'}]});
 const base=commit('OFFLINE synthetic baseline');
 write('reviewed-source.txt','ORIGINAL SOURCE HASH MUST STAY\n');const source=commit('OFFLINE source input');
 write(POLICY.marker,'OFFLINE synthetic marker, no runnable provider code\n');const family=commit('OFFLINE reviewed candidate');
 const p={...POLICY,repository:'fixture/offline',repositoryId:12345,base,family,sources:[source]};
 const merge=objCommit(command(['rev-parse',family+'^{tree}']),[base,family]);command(['checkout','--detach','-q',merge]);
 const r=repository(root),proofs=[];
 const runView=(id,head,event='schedule',workflow=p.collector)=>({id,run_attempt:1,event,path:workflow,head_branch:'main',head_sha:head,status:'completed',conclusion:'success',run_started_at:'2026-10-28T11:59:00.000Z',updated_at:'2026-10-28T12:01:00.000Z',repository:{id:p.repositoryId},head_repository:{id:p.repositoryId}});
 const binding=head=>({event:'push',repositoryId:p.repositoryId,head,runId:'999999',runAttempt:'1',triggerRunId:null});
 const checkpoint=(sha,id=900)=>({sha,proof:sha===base?null:{run:runView(id,sha,'push',p.workflow),job:{id:1000+id,name:'post-merge-current-main',run_id:id,status:'completed',conclusion:'success'}}});
 function append({failed=false,change=null}={}){
  const parent=r.git('rev-parse','HEAD'),before=JSON.parse(r.blob(parent,p.data[1])),after=copy(before),old=after[mint].at(-1);
  const at=new Date(Date.parse(old.observedAt)+3600000).toISOString(),id=100+proofs.length;
  const run=runView(id,parent);run.run_started_at=new Date(Date.parse(at)-60000).toISOString();run.updated_at=new Date(Date.parse(at)+60000).toISOString();
  if(!failed)after[mint]=[...after[mint],row(at,old.distributedTokens+1)].slice(-193);
  const summary={version:1,startedAt:at,finishedAt:at,event:'schedule',runId:id,overall:failed?'failed':'complete',expectedDatasetRevision:null,results:[{mint,status:failed?'failed':'collected',reason:failed?'network_error':'collected',observedAt:failed?null:at}]};
  if(change)change({before,after,summary});
  json(p.data[1],after);summary.expectedDatasetRevision='sha256:'+digest(fs.readFileSync(path.join(root,p.data[1])));json(p.data[0],summary);
  const sha=commit('OFFLINE synthetic collector update');
  const files={'collection-summary.json':r.blob(sha,p.data[0]).toString(),'reward-snapshots.json':r.blob(sha,p.data[1]).toString()},zip=zipFiles(files);
  const artifact={id:id+10000,name:`collector-evidence-${id}-1`,expired:false,size_in_bytes:zip.length,digest:'sha256:'+digest(zip),workflow_run:{id,head_sha:parent}};
  const proof={commit:sha,run,artifact,hashes:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,digest(v)])),steps:{'Collect observations':failed?'failure':'success','Persist observations and summary':'success','Preserve diagnostic evidence':'success'}};
  proofs.unshift(proof);return {sha,parent,proof,zip};
 }
 function appendAudit({change=null,available=true,incomplete=false,partial=false,scheduledCount=0,now=null}={}){
  const parent=r.git('rev-parse','HEAD'),before=JSON.parse(r.blob(parent,p.audit));
  const observations=Object.values(JSON.parse(r.blob(parent,p.data[1]))).flat().map(v=>Date.parse(v.observedAt));
  const datasetCommit=r.git('log','-1','--format=%H',parent,'--',p.data[1]);
  const at=now??new Date(Math.max(Date.parse(before.checkedAt),...observations,Date.parse(r.git('show','-s','--format=%cI',parent)),Date.parse(r.git('show','-s','--format=%cI',datasetCommit)))+1000).toISOString();
  const input={at,available,incomplete,partial,scheduledCount,datasetCommit,committedAt:r.git('show','-s','--format=%cI',datasetCommit),raw:r.blob(parent,p.data[1]).toString()};
  // Execute the ACTUAL frozen pure audit function with a fully offline fetcher.
  const code=`import sys,json,datetime as dt\nsys.path.insert(0,'scripts')\nimport audit_collector as a\np=json.load(sys.stdin)\ndef fetch(url,token=None,limit=None):\n if not p['available']: raise ValueError('OFFLINE_UNAVAILABLE')\n if url.endswith('/actions/workflows/reward-snapshots.yml'): return json.dumps({'state':'active','created_at':'2026-10-01T00:00:00Z'})\n if '&per_page=48' in url: return json.dumps({'workflow_runs':[],'total_count':1 if p['incomplete'] else 0})\n if '&event=schedule&per_page=1' in url: return json.dumps({'total_count':p['scheduledCount']})\n if '/commits?' in url:\n  if p['partial']: raise ValueError('OFFLINE_PARTIAL')\n  return json.dumps([{'sha':p['datasetCommit'],'commit':{'committer':{'date':p['committedAt']}}}])\n if url.startswith('https://raw.githubusercontent.com/'): return p['raw'].encode()\n raise AssertionError('unexpected offline API route')\nprint(json.dumps(a.audit(fetcher=fetch,now=dt.datetime.fromisoformat(p['at'].replace('Z','+00:00')))))`;
  const document=JSON.parse(execFileSync('python3',['-c',code],{cwd:root,input:JSON.stringify(input),encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'}}));
  if(change)change(document);json(p.audit,document);
  const oldDate=env.GIT_COMMITTER_DATE;env.GIT_COMMITTER_DATE=at;let sha;
  try{sha=commit('OFFLINE synthetic daily audit');}finally{env.GIT_COMMITTER_DATE=oldDate;}
  const id=200+proofs.length,run=runView(id,parent,'schedule',p.auditWorkflow);run.run_started_at=new Date(Date.parse(at)-1000).toISOString();run.updated_at=new Date(Date.parse(at)+60000).toISOString();if(!available||partial)run.conclusion='failure';
  const zip=zipFiles({'collector-audit.json':r.blob(sha,p.audit).toString()}),artifact={id:id+10000,name:`data-health-audit-${id}-1`,expired:false,size_in_bytes:zip.length,digest:'sha256:'+digest(zip),workflow_run:{id,head_sha:parent},created_at:at,expires_at:new Date(Date.parse(run.run_started_at)+7*86400000).toISOString()};
  const proof={kind:'audit',commit:sha,run,artifact,hashes:{'collector-audit.json':digest(r.blob(sha,p.audit))},steps:{'Bounded read-only audit':'success','Publish audit evidence':'success','Preserve audit evidence':'success'},sources:Object.fromEntries(auditSources(p).map(file=>[file,digest(r.blob(p.base,file))]))};
  proofs.unshift(proof);return {sha,parent,proof,zip,document};
 }
 const packet=(cp=checkpoint(base),selected=proofs)=>({version:'unfarmd-v3-main-proof/1',binding:binding(r.git('rev-parse','HEAD')),checkpoint:copy(cp),collectors:copy(selected),trigger:null});
 return {root,r,p,base,source,family,merge,mint,quote,write,json,commit,objCommit,command,append,appendAudit,proofs,binding,checkpoint,runView,packet,close:()=>fs.rmSync(root,{recursive:true,force:true})};
}
