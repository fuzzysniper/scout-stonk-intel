// SYNTHETIC OFFLINE GitHub responses and TEST-ONLY token. No hosted evidence is fabricated.
import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const before=https.request;let importCalls=0;
https.request=()=>{importCalls++;throw Error('NO NETWORK');};
const inspectionModule=await import('../../ops/native-pilot-admission/inspect.mjs');https.request=before;
const {ORIGINAL,BASE,BRANCH,ROOT,LIMITS,hash,originalManifest,allowed,nextPage,deploymentsPath,inspectionReader,inspectionContext,inspect}=inspectionModule;
const clone=structuredClone,bot={id:41898282,login:'github-actions[bot]',type:'Bot'},owner={id:58099771,login:'fuzzysniper',type:'User'};
const names=['native-pilot-review-rehearsal','native-pilot-setup','native-pilot-source'];
const task=names[0]+':'+ORIGINAL.run,runURL='https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/'+ORIGINAL.run;
const payload={protocol:'native-pilot-approval-rehearsal/1',manifestSha256:ORIGINAL.manifestSha256,admissionEligible:false};
const context={inspectionRun:999999,commit:'a'.repeat(40)};
function fixtures(){
 const map=new Map();names.forEach((name,i)=>{
  map.set('/environments/'+name,{id:i===0?ORIGINAL.environmentId:60000+i,name,can_admins_bypass:false,protection_rules:[{type:'required_reviewers',prevent_self_review:false,reviewers:[{type:'User',reviewer:owner}]}],deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}});
  map.set('/environments/'+name+'/deployment-branch-policies?per_page=20&page=1',{total_count:1,branch_policies:[{type:'branch',name:i===0?BRANCH:'native-pilot/private-beta-rc'}]});
 });
 map.set('/actions/runs/'+ORIGINAL.run,{id:ORIGINAL.run,head_sha:ORIGINAL.sha,head_branch:BRANCH,path:'.github/workflows/native-pilot-admission.yml',workflow_id:409607134,event:'workflow_dispatch',status:'completed',conclusion:'failure',run_attempt:1,repository:{id:1415026436},head_repository:{id:1415026436}});
 map.set('/actions/runs/'+ORIGINAL.run+'/jobs?per_page=20&page=1',{total_count:1,jobs:[{id:ORIGINAL.job,run_id:ORIGINAL.run,head_sha:ORIGINAL.sha,status:'completed',conclusion:'failure'}]});
 map.set('/actions/runs/'+ORIGINAL.run+'/approvals',[{state:'approved',user:owner,comment:'REHEARSE_NATIVE_REVIEW_ONCE '+ORIGINAL.manifestSha256+' '+ORIGINAL.run,environments:[{id:ORIGINAL.environmentId,name:names[0]}]}]);
 map.set('/actions/variables/UNFARMD_NATIVE_REHEARSAL_'+ORIGINAL.run,{name:'UNFARMD_NATIVE_REHEARSAL_'+ORIGINAL.run,value:originalManifest()});
 map.set(deploymentsPath(1),[]);return clone(map);
}
function deployment(id=111,overrides={}){return {id,sha:ORIGINAL.sha,ref:ORIGINAL.sha,environment:names[0],task,creator:bot,production_environment:false,transient_environment:true,payload,...overrides};}
function status(id=222,overrides={}){return {id,state:'success',creator:bot,environment:names[0],log_url:runURL,...overrides};}
function fakeApi(map,changes={}){
 const calls=[];
 const read=async suffix=>{calls.push(suffix);assert.ok(allowed(suffix,new Set([111,112,...Array.from({length:12},(_,i)=>i+200)])),suffix);const v=map.get(suffix);assert.notEqual(v,undefined,'No SYNTHETIC response '+suffix);return {data:clone(v),nextPage:null};};
 return {get:read,statuses:(d,p)=>read('/deployments/'+d.id+'/statuses?per_page=20&page='+p),count:()=>calls.length,calls,...changes};
}
test('import performs no I/O; original canonical manifest reconstructs exact independently reviewed digest',()=>{assert.equal(importCalls,0);assert.equal(hash(originalManifest()),ORIGINAL.manifestSha256);assert.equal(JSON.parse(originalManifest()).sourceGo,false);});
test('actual historical Git blobs independently confirm original source/tree pins (no secret or SQL)',()=>{
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8'});
 assert.equal(git('rev-parse',ORIGINAL.sha+'^{tree}').trim(),ORIGINAL.tree);
 assert.equal(hash(git('show',ORIGINAL.sha+':.github/workflows/native-pilot-admission.yml')),ORIGINAL.workflowSha256);
 assert.equal(hash(git('show',ORIGINAL.sha+':ops/native-pilot-admission/publisher.mjs')),ORIGINAL.scriptSha256);
});
test('fixed endpoints reject writer verbs, arbitrary runs, secrets, setup variables, providers, traversal and unknown status IDs',()=>{
 for(const suffix of ['POST','PUT','DELETE','https://api.github.com'+ROOT+'/deployments','/deployments','/actions/runs/1','/actions/artifacts/'+ORIGINAL.artifact,'/actions/secrets','/actions/variables/UNFARMD_NATIVE_SETUP_DPL_X','/environments/production','/deployments/111/statuses?per_page=20&page=1','/../deployments','/actions/runs/'+ORIGINAL.run+'?token=x','https://mainnet.helius-rpc.com'])assert.equal(allowed(suffix),false,suffix);
 assert.equal(allowed(deploymentsPath(1)),true);assert.equal(allowed(deploymentsPath(4)),false);
});
function localEnv(){return {GITHUB_REPOSITORY:'fuzzysniper/scout-stonk-intel',GITHUB_REPOSITORY_ID:'1415026436',GITHUB_ACTOR_ID:'58099771',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_REF:'refs/heads/'+BRANCH,MODE:'inspection',DEPLOYMENT:'',NATIVE_INSPECTION_OPERATION:'github-read-only-owner-approved',APPROVED_SHA:'a'.repeat(40),GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'999999'};}
function git(...a){
 if(a[0]==='show')return execFileSync('git',a,{encoding:'utf8'}).trim();
 if(a[0]==='status')return '';
 if(a[0]==='merge-base'){assert.deepEqual(a,['merge-base','--is-ancestor',BASE,'HEAD']);return '';}
 return a[1]==='HEAD'?'a'.repeat(40):ORIGINAL.tree;
}
test('context binds owner/manual/first-attempt/empty deployment/exact branch and SHA before token access',()=>assert.deepEqual(inspectionContext(localEnv(),git),context));
for(const [key,value]of Object.entries({GITHUB_ACTOR_ID:'1',GITHUB_EVENT_NAME:'push',GITHUB_RUN_ATTEMPT:'2',GITHUB_REF:'refs/heads/main',MODE:'rehearsal',DEPLOYMENT:'dpl_x',NATIVE_INSPECTION_OPERATION:'metadata-only-owner-approved',APPROVED_SHA:'b'.repeat(40),GITHUB_RUN_ID:String(ORIGINAL.run),GITHUB_REPOSITORY_ID:'1'}))test('context rejects '+key,()=>assert.throws(()=>inspectionContext({...localEnv(),[key]:value},git),/NATIVE_INSPECTION_HOLD/));
test('context rejects dirty checkout, incorrect historical pin and missing ancestor',()=>{
 assert.throws(()=>inspectionContext(localEnv(),(...a)=>a[0]==='status'?'M x':git(...a)));
 assert.throws(()=>inspectionContext(localEnv(),(...a)=>a[0]==='show'?'OTHER':git(...a)));
 assert.throws(()=>inspectionContext(localEnv(),(...a)=>{if(a[0]==='merge-base')throw Error('not ancestor');return git(...a);}));
});
for(const n of [0,1,2])test('0/1/2 prior explicit POST outcomes remain observations, not invented attempt counts: '+n,async()=>{
 const map=fixtures();if(n){map.set(deploymentsPath(1),[deployment()]);map.set('/deployments/111/statuses?per_page=20&page=1',n===2?[status()]:[]);}
 const r=await inspect(fakeApi(map),context);assert.equal(r.outcome,'COMPLETE_READ_ONLY');assert.equal(r.explicitWritesThisInspection,0);assert.equal(r.incident.explicitRecordsObserved,n?1:0);assert.equal(r.incident.historicalPostAttempts,'UNKNOWN');assert.equal(r.incident.rootCause,'UNKNOWN');assert.equal(r.incident.variable.matchesOriginalCanonical,true);assert.equal(Object.hasOwn(r.incident.variable,'value'),false);assert.equal(r.sourceCalls,false);
 if(n)assert.equal(r.incident.records[0].expectedSuccessStatusObserved,n===2);
});
test('server-accepted write with lost acknowledgement stays a retained record; original failed run is never retried',async()=>{
 const map=fixtures();map.set(deploymentsPath(1),[deployment()]);map.set('/deployments/111/statuses?per_page=20&page=1',[]);
 const api=fakeApi(map);const r=await inspect(api,context);assert.equal(r.incident.records[0].classification,'explicit_publisher_record');assert.equal(r.incident.historicalPostAttempts,'UNKNOWN');assert.equal(api.calls.some(p=>p.includes('rerun')),false);
});
test('job-linked automatic environment metadata is distinguished from an exact publisher record',async()=>{
 const map=fixtures();map.set(deploymentsPath(1),[deployment(112,{task:'deploy',payload:{}}),deployment()]);map.set('/deployments/111/statuses?per_page=20&page=1',[status()]);map.set('/deployments/112/statuses?per_page=20&page=1',[status(223,{log_url:runURL+'/job/'+ORIGINAL.job})]);
 const r=await inspect(fakeApi(map),context);assert.equal(r.outcome,'COMPLETE_READ_ONLY');assert.deepEqual(r.incident.records.map(x=>x.classification),['environment_job_linked_nonpublisher','explicit_publisher_record']);
});
for(const kind of ['run-link-only','task-only','wrong explicit payload','duplicate explicit'])test('ambiguous metadata is preserved under HOLD: '+kind,async()=>{
 const map=fixtures();map.set(deploymentsPath(1),[deployment(111,kind==='wrong explicit payload'?{payload:{...payload,admissionEligible:true}}:kind==='duplicate explicit'?{}:{task:'deploy',payload:{}})]);
 map.set('/deployments/111/statuses?per_page=20&page=1',kind==='run-link-only'?[status()]:[]);
 if(kind==='duplicate explicit'){map.get(deploymentsPath(1)).push(deployment(112));map.set('/deployments/112/statuses?per_page=20&page=1',[]);}
 const r=await inspect(fakeApi(map),context);assert.equal(r.outcome,'HOLD');assert.ok(r.incident.records.length);assert.equal(r.incident.historicalPostAttempts,'UNKNOWN');
});
for(const [label,modify]of Object.entries({bypass:e=>e.can_admins_bypass=true,reviewer:e=>e.protection_rules[0].reviewers[0].reviewer.id++,selfReview:e=>e.protection_rules[0].prevent_self_review=true,extraRule:e=>e.protection_rules.push({type:'wait_timer'}),type:e=>e.protection_rules[0].reviewers[0].type='Team'}))test('saved environment mismatch HOLD: '+label,async()=>{const map=fixtures();modify(map.get('/environments/'+names[1]));const r=await inspect(fakeApi(map),context);assert.equal(r.outcome,'HOLD');assert.equal(r.environments[1].controls,'mismatch');});
test('setup/source exact branch mismatch is reported without changing the saved rule',async()=>{const map=fixtures();const b=map.get('/environments/'+names[2]+'/deployment-branch-policies?per_page=20&page=1');b.branch_policies[0].name='native-pilot/owner-approved-run';const r=await inspect(fakeApi(map),context);assert.equal(r.outcome,'HOLD');assert.equal(r.environments[2].exactBranchMatches,false);assert.equal(b.branch_policies[0].name,'native-pilot/owner-approved-run');});
for(const value of [originalManifest()+'\n','{}','PRIVATE_SENTINEL'])test('variable byte mismatch reports only digest and match, never body: '+hash(value).slice(0,8),async()=>{const map=fixtures();map.get('/actions/variables/UNFARMD_NATIVE_REHEARSAL_'+ORIGINAL.run).value=value;const r=await inspect(fakeApi(map),context);assert.equal(r.outcome,'HOLD');assert.equal(r.incident.variable.matchesOriginalCanonical,false);assert.equal(r.incident.variable.sha256,hash(value));assert.equal(JSON.stringify(r).includes('PRIVATE_SENTINEL'),false);});
for(const route of ['/actions/runs/'+ORIGINAL.run,'/actions/runs/'+ORIGINAL.run+'/approvals','/actions/variables/UNFARMD_NATIVE_REHEARSAL_'+ORIGINAL.run,deploymentsPath(1)])test('denied/timeout read stops, preserves partial results, does not retry '+route,async()=>{const map=fixtures(),base=fakeApi(map);let failures=0;const get=base.get;base.get=async p=>{if(p===route){failures++;throw Error('PRIVATE_CREDENTIAL_SENTINEL');}return get(p);};const r=await inspect(base,context);assert.equal(r.outcome,'HOLD');assert.equal(failures,1);assert.equal(JSON.stringify(r).includes('PRIVATE_CREDENTIAL_SENTINEL'),false);assert.equal(r.incident.historicalPostAttempts,'UNKNOWN');});
test('bounded forward pages for all tasks/statuses; previous links do not become requests',async()=>{
 const map=fixtures();map.set(deploymentsPath(1),[deployment()]);map.set(deploymentsPath(2),[]);map.set('/deployments/111/statuses?per_page=20&page=1',[status()]);map.set('/deployments/111/statuses?per_page=20&page=2',[]);
 const api=fakeApi(map);const get=api.get,sts=api.statuses;api.get=async p=>({...await get(p),nextPage:p===deploymentsPath(1)?2:null});api.statuses=async(d,p)=>({...await sts(d,p),nextPage:p===1?2:null});
 const r=await inspect(api,context);assert.equal(r.outcome,'COMPLETE_READ_ONLY');assert.equal(api.calls.filter(p=>p===deploymentsPath(1)).length,1);
});
for(const kind of ['truncated','duplicate','too many deployments','wrong sha'])test('incomplete/invalid histories are HOLD: '+kind,async()=>{
 const map=fixtures(),api=fakeApi(map);if(kind==='truncated'){api.get=async p=>p.startsWith('/deployments?')?{data:[],nextPage:Number(new URL('https://x'+p).searchParams.get('page'))+1}:fakeApi(map).get(p);}
 if(kind==='duplicate')map.set(deploymentsPath(1),[deployment(),deployment()]);
 if(kind==='too many deployments')map.set(deploymentsPath(1),Array.from({length:13},(_,i)=>deployment(200+i)));
 if(kind==='wrong sha')map.set(deploymentsPath(1),[deployment(111,{sha:'f'.repeat(40)})]);
 const r=await inspect(api,context);assert.equal(r.outcome,'HOLD');assert.equal(r.incident.historicalPostAttempts,'UNKNOWN');
});
test('only same-origin exact-query forward Link metadata is accepted; arbitrary URLs are never followed',()=>{
 const p=deploymentsPath(1),url='https://api.github.com'+ROOT+deploymentsPath(2);
 assert.equal(nextPage('<'+url+'>; rel="next"',p),2);
 const last='https://api.github.com'+ROOT+deploymentsPath(3);
 assert.equal(nextPage('<'+url+'>; rel="next", <'+last+'>; rel="last"',p),2);
 for(const link of ['<https://evil.test/>; rel="next"','<'+url.replace('page=2','page=4')+'>; rel="next"','<'+url.replace(ORIGINAL.sha,'f'.repeat(40))+'>; rel="next"','<'+url+'&token=SECRET>; rel="next"','<'+last+'>; rel="last"','garbage'])assert.throws(()=>nextPage(link,p));
 assert.equal(nextPage('<https://api.github.com'+ROOT+deploymentsPath(1)+'>; rel="prev"',deploymentsPath(2)),null);
});
async function withTransport(mode,fn){
 const old=https.request;let attempts=0;
 https.request=(options,callback)=>{
  attempts++;assert.equal(options.method,'GET');assert.equal(options.hostname,'api.github.com');assert.equal(options.servername,'api.github.com');assert.equal(options.agent,false);assert.equal(options.rejectUnauthorized,true);assert.equal(options.minVersion,'TLSv1.2');assert.equal(options.checkServerIdentity.name,'checkServerIdentity');assert.ok(options.path.startsWith(ROOT+'/'));
  if(mode==='construction')throw Error('PRIVATE_SENTINEL');
  const req=new EventEmitter();req.destroy=()=>req.destroyed=true;
  req.end=(...args)=>{assert.equal(args.length,0);queueMicrotask(()=>{
   if(mode==='network'){req.emit('error',Error('PRIVATE_SENTINEL'));return;}
   const socket=new EventEmitter();Object.assign(socket,{encrypted:true,authorized:mode!=='tls',servername:'api.github.com',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:api.github.com',subject:{CN:'api.github.com'}})});req.emit('socket',socket);socket.emit('secureConnect');if(req.destroyed)return;
   if(mode==='timeout')return;
   const res=new EventEmitter();Object.assign(res,{statusCode:/^http/.test(mode)?Number(mode.slice(4)):mode==='redirect'?302:200,headers:{'content-type':mode==='headers'?'text/plain':'application/json'},complete:mode!=='framing',destroy(){this.destroyed=true;}});
   if(mode==='encoding')res.headers['content-encoding']='gzip';if(mode==='pagination')res.headers.link='<https://evil.test/>; rel="next"';
   callback(res);if(res.destroyed)return;
   if(mode==='aborted'){res.emit('aborted');return;}
   const bytes=mode==='oversized'?Buffer.alloc(LIMITS.responseBytes+1):mode==='malformed'?Buffer.from('PRIVATE_SENTINEL'):mode==='utf8'?Buffer.from([0xff]):Buffer.from('[]');
   if(mode==='chunks'){for(let i=0;i<=LIMITS.chunks&&!res.destroyed;i++)res.emit('data',Buffer.from(' '));}
   else res.emit('data',bytes);if(!res.destroyed)res.emit('end');
  });};return req;
 };
 try{return await fn(()=>attempts);}finally{https.request=old;}
}
for(const mode of ['ok','http403','http404','http429','http503','redirect','tls','network','timeout','headers','encoding','pagination','oversized','chunks','malformed','utf8','framing','aborted','construction'])test('fixed GET transport, redacted failure, no retry: '+mode,async()=>{
 await withTransport(mode,async count=>{
  const api=inspectionReader('SYNTHETIC_ONLY_NOT_A_CREDENTIAL');
  if(mode==='ok'){const r=await api.get(deploymentsPath(1));assert.deepEqual(r,{data:[],nextPage:null});}
  else {
   await assert.rejects(()=>api.get(deploymentsPath(1)),e=>e.message==='NATIVE_INSPECTION_HOLD'&&!e.stack.includes('PRIVATE_SENTINEL'));
   const report=await inspect(inspectionReader('SYNTHETIC_ONLY_NOT_A_CREDENTIAL'),context);assert.equal(report.outcome,'HOLD');assert.equal(JSON.stringify(report).includes('PRIVATE_SENTINEL'),false);
  }
  assert.equal(count(),mode==='ok'?1:2); // Two distinct synthetic readers; neither retries.
 });
});
test('binding and out-of-scope paths fail before I/O; status reads require exact old SHA/environment',async()=>{
 await withTransport('ok',async count=>{for(const token of [undefined,'short','x\n'.repeat(30)])assert.throws(()=>inspectionReader(token));const api=inspectionReader('SYNTHETIC_ONLY_NOT_A_CREDENTIAL');await assert.rejects(()=>api.get('/deployments/111/statuses?per_page=20&page=1'));assert.throws(()=>api.statuses(deployment(111,{sha:'f'.repeat(40)}),1));assert.equal(count(),0);await api.statuses(deployment(),1);assert.equal(count(),1);});
});
test('global request and monotonic time budgets fail closed without extra request',async()=>{
 await withTransport('ok',async count=>{const api=inspectionReader('SYNTHETIC_ONLY_NOT_A_CREDENTIAL');for(let i=0;i<LIMITS.requests;i++)await api.get(deploymentsPath(1));await assert.rejects(()=>api.get(deploymentsPath(1)));assert.equal(count(),LIMITS.requests);let now=100;const timed=inspectionReader('SYNTHETIC_ONLY_NOT_A_CREDENTIAL',undefined,()=>now);now+=LIMITS.totalMs;await assert.rejects(()=>timed.get(deploymentsPath(1)));now=99;await assert.rejects(()=>timed.get(deploymentsPath(1)));assert.equal(count(),LIMITS.requests);});
});
test('publisher is unreachable in inspection workflow; no write permission/binding/artifact/variable operations',()=>{
 const wf=fs.readFileSync('.github/workflows/native-pilot-admission.yml','utf8');
 assert.ok(wf.includes("context:\n    if: inputs.mode != 'inspection' &&"));assert.ok(wf.includes("publish:\n    if: inputs.mode != 'inspection'\n    needs: context"));
 const job=wf.slice(wf.indexOf('\n  inspection:\n'));assert.ok(job.includes("github.ref == 'refs/heads/"+BRANCH+"'"));assert.ok(job.includes("inputs.approved_sha == github.sha"));assert.ok(job.includes("github.run_attempt == 1"));assert.ok(job.includes('name: native-pilot-review-rehearsal'));
 assert.ok(job.includes('deployments: read'));assert.ok(job.includes('persist-credentials: false'));assert.equal(/write|publisher\.mjs|GITHUB_TOKEN|npm |upload-artifact|variables\./i.test(job.replace('READ-ONLY lane. No publisher dependency, writer token or npm lifecycle.','')),false);
 const code=fs.readFileSync('ops/native-pilot-admission/inspect.mjs','utf8');assert.equal(/from ['"].*publisher|method:['"](?:POST|PUT|PATCH|DELETE)|req\.write|fetch\(/.test(code),false);
});
test('failed later status page retains observed deployment and earlier status page without claiming completion',async()=>{
 const map=fixtures();map.set(deploymentsPath(1),[deployment()]);map.set('/deployments/111/statuses?per_page=20&page=1',[status()]);const api=fakeApi(map),sts=api.statuses;
 api.statuses=async(d,p)=>{if(p===2)throw Error('PRIVATE_LOST_READ_ACK');return {...await sts(d,p),nextPage:2};};
 const r=await inspect(api,context);assert.equal(r.outcome,'HOLD');assert.equal(r.incident.records[0].id,111);assert.equal(r.incident.records[0].statusHistory,'PARTIAL');assert.equal(r.incident.records[0].statuses.length,1);assert.equal(r.incident.historicalPostAttempts,'UNKNOWN');assert.equal(JSON.stringify(r).includes('PRIVATE_LOST_READ_ACK'),false);
});
test('ordered complete status history retains latest inactive plus earlier success across pages',async()=>{
 const map=fixtures();map.set(deploymentsPath(1),[deployment()]);map.set('/deployments/111/statuses?per_page=20&page=1',[status(223,{state:'inactive'})]);map.set('/deployments/111/statuses?per_page=20&page=2',[status(222)]);const api=fakeApi(map),sts=api.statuses;api.statuses=async(d,p)=>({...await sts(d,p),nextPage:p===1?2:null});
 const r=await inspect(api,context);assert.equal(r.outcome,'COMPLETE_READ_ONLY');assert.deepEqual(r.incident.records[0].statuses.map(s=>s.id),[223,222]);assert.equal(r.incident.records[0].statusHistory,'COMPLETE');assert.equal(r.incident.records[0].expectedSuccessStatusObserved,true);assert.equal(r.incident.historicalPostAttempts,'UNKNOWN');
});
