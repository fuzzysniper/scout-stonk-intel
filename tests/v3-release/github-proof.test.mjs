// Authenticated GitHub service responses are mocked; NO network or source traffic.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {acquireProof} from './github-proof.mjs';
import {fixture,copy,zipFiles,ROOT} from './lifecycle-fixtures.mjs';
import {digest,verifyMainPacket} from './lifecycle.mjs';
const using=async fn=>{const f=fixture();try{await fn(f);}finally{f.close();}};
function client(f,updates,{mutate=(route,data)=>data,checkpoint=null,fail=null}={}){
 const calls=[];
 const github={request:async(route,args)=>{
  calls.push({route,args});assert.equal(args.owner,'fixture');assert.equal(args.repo,'offline');assert.equal(args.request.timeout,f.p.timeoutMs);
  if(fail)throw fail;
  let data;
  if(route.includes('/actions/workflows/'))data={workflow_runs:checkpoint&&args.head_sha===checkpoint.sha?[copy(checkpoint.proof.run)]:[]};
  else if(route.endsWith('/jobs')){
   if(checkpoint&&args.run_id===checkpoint.proof.run.id)data={jobs:[copy(checkpoint.proof.job)]};
   else{const u=updates.find(u=>u.proof.run.id===args.run_id);assert.ok(u);data={jobs:[{name:'collect',status:'completed',steps:Object.entries(u.proof.steps).map(([name,conclusion])=>({name,conclusion}))}]};}
  }else if(route.endsWith('/artifacts')){const u=updates.find(u=>u.proof.run.id===args.run_id);data={artifacts:[copy(u.proof.artifact)]};}
  else if(route.includes('/actions/artifacts/')){const u=updates.find(u=>u.proof.artifact.id===args.artifact_id);data=u.zip;}
  else{const u=updates.find(u=>u.proof.run.id===args.run_id);assert.ok(u);data=copy(u.proof.run);}
  return {status:200,data:mutate(route,data)};
 }};
 return {github,calls};
}
const acquire=(f,c,binding=f.binding(f.r.git('rev-parse','HEAD')))=>acquireProof({github:c.github,r:f.r,binding,p:f.p});
test('first normal release needs zero GitHub reads and does not invent collection proof',()=>using(async f=>{const c=client(f,[]),r=await acquire(f,c);assert.equal(r.calls,0);assert.equal(r.packet.collectors.length,0);assert.equal(r.packet.checkpoint.sha,f.base);}));
test('real Git append plus exact synthetic SDK artifact is independently bound to Git bytes',()=>using(async f=>{const u=f.append(),c=client(f,[u]),r=await acquire(f,c);assert.equal(r.packet.collectors.length,1);assert.equal(r.calls,5);assert.equal(c.calls.filter(x=>x.route.includes('/actions/artifacts/')).length,1);verifyMainPacket(f.r,u.sha,r.packet,r.packet.binding,f.p);}));
test('missed verification catches two source transitions in serial and without network fallback',()=>using(async f=>{const a=f.append(),b=f.append(),c=client(f,[a,b]),r=await acquire(f,c);assert.equal(r.packet.collectors.length,2);assert.ok(r.calls<=f.p.maxApiCalls);}));
test('actual same-code parent success is an inductive checkpoint, not a stale data hash',()=>using(async f=>{const a=f.append(),b=f.append(),cp=f.checkpoint(a.sha),c=client(f,[b],{checkpoint:cp}),r=await acquire(f,c);assert.equal(r.packet.checkpoint.sha,a.sha);assert.equal(r.packet.collectors.length,1);assert.equal(r.calls,7);}));
test('scheduled trigger binding cannot become a manual invocation or source dispatch',()=>using(async f=>{const u=f.append(),c=client(f,[u]),binding={...f.binding(u.sha),event:'workflow_run',triggerRunId:String(u.proof.run.id)},r=await acquire(f,c,binding);assert.equal(r.packet.trigger.id,u.proof.run.id);assert.ok(c.calls.every(x=>x.route.startsWith('GET ')));}));
for(const status of [401,403,404,410,429,503])test('GitHub '+status+' is terminal; no retries, alternate identity or provider',()=>using(async f=>{f.append();const c=client(f,[],{fail:Object.assign(Error('DO_NOT_ECHO_AUTH'),{status})});await assert.rejects(()=>acquire(f,c));assert.equal(c.calls.length,1);}));
test('timeout/uncertain GitHub read is terminal',()=>using(async f=>{f.append();const c=client(f,[],{fail:Error('SYNTHETIC_TIMEOUT')});await assert.rejects(()=>acquire(f,c));assert.equal(c.calls.length,1);}));
test('hard timeout aborts even an SDK request that never resolves',()=>using(async f=>{f.append();f.p.timeoutMs=10;let calls=0,signal;const github={request:(_route,args)=>{calls++;signal=args.request.signal;return new Promise(()=>{});}};await assert.rejects(()=>acquireProof({github,r:f.r,binding:f.binding(f.r.git('rev-parse','HEAD')),p:f.p}),/github_read_timeout/);assert.equal(calls,1);assert.equal(signal.aborted,true);}));
for(const [name,mutate] of [
 ['wrong repository',(route,d)=>{if(route.endsWith('/runs/{run_id}'))d.repository.id=999;return d;}],
 ['manual run',(route,d)=>{if(route.endsWith('/runs/{run_id}'))d.event='workflow_dispatch';return d;}],
 ['wrong workflow',(route,d)=>{if(route.endsWith('/runs/{run_id}'))d.path='other.yml';return d;}],
 ['missing artifact',(route,d)=>{if(route.endsWith('/artifacts'))d.artifacts=[];return d;}],
 ['duplicate artifacts',(route,d)=>{if(route.endsWith('/artifacts'))d.artifacts.push(copy(d.artifacts[0]));return d;}],
 ['expired artifact',(route,d)=>{if(route.endsWith('/artifacts'))d.artifacts[0].expired=true;return d;}],
 ['oversized artifact',(route,d)=>{if(route.endsWith('/artifacts'))d.artifacts[0].size_in_bytes=99999999;return d;}],
 ['artifact run mismatch',(route,d)=>{if(route.endsWith('/artifacts'))d.artifacts[0].workflow_run.id=0;return d;}],
 ['missing digest',(route,d)=>{if(route.endsWith('/artifacts'))delete d.artifacts[0].digest;return d;}],
 ['bad ZIP digest',(route,d)=>route.includes('/actions/artifacts/')?Buffer.from('corrupt'):d],
 ['persistence not proven',(route,d)=>{if(route.endsWith('/jobs'))d.jobs[0].steps.find(s=>s.name==='Persist observations and summary').conclusion='failure';return d;}],
])test('API/ZIP proof rejects '+name,()=>using(async f=>{const u=f.append(),c=client(f,[u],{mutate});await assert.rejects(()=>acquire(f,c));assert.ok(c.calls.length<=f.p.maxApiCalls);}));
test('request budget is charged before the SDK and cannot be bypassed by pagination',()=>using(async f=>{const u=f.append(),c=client(f,[u]);f.p.maxApiCalls=2;await assert.rejects(()=>acquire(f,c),/budget/);assert.equal(c.calls.length,2);}));
test('squash is rejected before any GitHub read',()=>using(async f=>{const squash=f.objCommit(f.r.git('rev-parse',f.family+'^{tree}'),[f.base]),c=client(f,[]);await assert.rejects(()=>acquire(f,c,f.binding(squash)),/ancestry/);assert.equal(c.calls.length,0);}));
function decode(zip){return execFileSync('python3',[path.join(ROOT,'tests/v3-release/collector-append.py'),'zip'],{input:zip,maxBuffer:65536,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'}});}
test('ZIP decoder reads only two bounded regular files and reports hashes, not contents',()=>{const zip=zipFiles({'collection-summary.json':'SYNTHETIC_PRIVATE_TEXT','reward-snapshots.json':'{}'}),out=JSON.parse(decode(zip));assert.equal(out['collection-summary.json'],digest('SYNTHETIC_PRIVATE_TEXT'));assert.equal(JSON.stringify(out).includes('PRIVATE_TEXT'),false);});
for(const [name,files] of [
 ['traversal',{'../collection-summary.json':'x','reward-snapshots.json':'{}'}],
 ['extra entry',{'collection-summary.json':'{}','reward-snapshots.json':'{}','unknown':'x'}],
 ['missing entry',{'collection-summary.json':'{}'}],
 ['oversized decoded entry',{'collection-summary.json':'x'.repeat(4*1024*1024+1),'reward-snapshots.json':'{}'}],
])test('ZIP '+name+' cannot escape or bypass byte limits',()=>assert.throws(()=>decode(zipFiles(files))));
test('ordinary unknown outcome data is not turned into a journal/ROI/license/activation proof',()=>using(async f=>{const c=client(f,[]),r=await acquire(f,c),text=JSON.stringify(r.packet);for(const word of ['sourceGo','roi','wallet','license','password','secret'])assert.equal(text.includes(word),false);assert.equal(r.packet.version,'unfarmd-v3-main-proof/1');}));
