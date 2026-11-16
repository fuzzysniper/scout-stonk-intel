// SYNTHETIC pagination only; no alias API, CLI, archive, hosted DB or provider calls.
import test from 'node:test';import assert from 'node:assert/strict';import https from 'node:https';import {EventEmitter} from 'node:events';
import {aliasPath,aliasRequestAllowed,aliasListing,aliasLimits} from '../../ops/native-beta-output/alias-pages.mjs';
import {evaluateInspection,inspectionAuthority,runReadOnlyInspection} from '../../ops/native-beta-output/inspect-only.mjs';
import {inspectionCard} from '../../ops/native-beta-output/inspection-context.mjs';
import {paths,inspectGate,getReader,webhookListing,integrationListing} from '../../ops/native-beta-output/preflight.mjs';
import {policy} from '../../ops/native-beta-output/identity.mjs';
import {safeFailure,fail} from '../../ops/native-beta-output/diagnostics.mjs';
import {approval} from '../../ops/native-beta-output/verify.mjs';
import {context,time,controls,go,aliasRows} from '../native-beta-output/fixtures.mjs';
const page=(rows,next=null)=>({aliases:rows,pagination:{count:rows.length,next,prev:null}});
const extra=i=>({alias:'synthetic-'+i+'.invalid',projectId:policy.projectId,deploymentId:'dpl_SYNTHETIC'});
function fixture(pages){const ctx=context(),c=controls(approval(go(),ctx,time)),p=paths(ctx);c.reviews[0].user.login='fuzzysniper';const data={
 [p.run]:{id:ctx.runId,head_sha:ctx.sha,head_branch:ctx.branch,workflow_id:policy.workflowId,path:'.github/workflows/native-pilot-admission.yml',status:'in_progress',event:'workflow_dispatch',repository:{id:policy.repositoryId},head_repository:{id:policy.repositoryId}},
 [p.environment]:c.environment,[p.branches]:c.branches,[p.reviews]:c.reviews,[p.project]:{id:policy.projectId,accountId:policy.teamId,name:'scout-stonk-intel',nodeVersion:'24.x',link:{type:'github',org:'fuzzysniper',repo:'scout-stonk-intel'},ssoProtection:{deploymentType:'all'}},[p.webhooks]:[],[p.integrations]:[],...pages};const seen=[];
 const read=async path=>{seen.push(path);if(!Object.hasOwn(data,path))fail('VC_LEGACY_INTEGRATIONS','http_status',404);return structuredClone(data[path]);};
 return {ctx,manifest:inspectionCard(ctx,time).manifest,clock:()=>time,gh:read,vc:read,seen,data,p};}
test('documented next -> until; single and multiple pages require explicit terminal null and full alias invariants',async()=>{
 for(const split of [false,true]){
  const rows=aliasRows(),pages=split?{[aliasPath()]:page(rows.slice(0,2),1000),[aliasPath(1000)]:page(rows.slice(2))}:{[aliasPath()]:page(rows)};
  const f=fixture(pages),result=await evaluateInspection(f);assert.equal(result.checksPassed,true);assert.equal(result.calls,split?10:9);assert.deepEqual(result.aliasEnumeration,{pagesRequested:split?2:1,pagesValidated:split?2:1,records:4,termination:'complete'});
  assert.equal(result.activate,false);assert.equal(result.cliState,'not_started');
  const uploader=fixture(pages),gate=await inspectGate(uploader.ctx,go(),uploader.gh,uploader.vc,time);assert.equal(Object.keys(gate.aliases).length,4);assert.equal(uploader.seen.filter(aliasRequestAllowed).length,split?2:1);
 }
 assert.throws(()=>aliasListing(page(aliasRows(),1000)),e=>safeFailure(e).check==='ALIAS_PAGE_COMPLETE');
});
test('required domains on page one never bypass continuation; malformed, conflicting and nonprogressing state remains HOLD',async()=>{
 const variants=[
 ['missing-pagination',{aliases:aliasRows()}],['missing-next',{aliases:aliasRows(),pagination:{count:4,prev:null}}],
 ['unknown-until',{...page(aliasRows()),pagination:{count:4,next:null,prev:null,until:1000}}],
 ['string-next',page(aliasRows(),'1000')],['zero',page(aliasRows(),0)],['negative',page(aliasRows(),-1)],['unsafe',page(aliasRows(),Number.MAX_SAFE_INTEGER+1)],['url',page(aliasRows(),'https://evil.invalid')],
 ['wrong-count',{...page(aliasRows()),pagination:{count:5,next:null,prev:null}}],['bad-prev',{...page(aliasRows()),pagination:{count:4,next:null,prev:'PRIVATE'}}],['empty-continuation',page([],900)],['over-page',page(Array.from({length:101},(_,i)=>extra(i)))],['wrong-project',page([{...extra(1),projectId:'prj_OTHER'}])]
 ];
 for(const [name,value]of variants){const f=fixture({[aliasPath()]:value}),r=await evaluateInspection(f);assert.equal(r.checksPassed,false,name);assert.equal(f.seen.length,6,name);assert.equal(r.aliasEnumeration.termination,'incomplete',name);}
 for(const [name,next]of [['same',1000],['increasing',1001],['duplicate',null],['conflict',null],['uid-conflict',null]]){
  const rows=aliasRows();if(name==='uid-conflict')rows[0].uid='SYNTHETIC_ID';
  const other=name==='duplicate'?rows[0]:name==='conflict'?{...rows[0],deploymentId:'dpl_OTHER'}:name==='uid-conflict'?{...extra(1),uid:'SYNTHETIC_ID'}:extra(1);
  const f=fixture({[aliasPath()]:page(rows,1000),[aliasPath(1000)]:page([other],next)}),r=await evaluateInspection(f);
  assert.equal(r.checksPassed,false,name);assert.equal(f.seen.length,7,name);assert.equal(r.aliasEnumeration.pagesRequested,2);
 }
 const missing=fixture({[aliasPath()]:page(aliasRows().slice(1))});assert.equal((await evaluateInspection(missing)).failure.check,'ALIASES_REQUIRED_PRESENT');
});
test('10 pages/1000 total and 18 total GETs succeed only on terminal tenth page; exhaustion never makes an eleventh request',async()=>{
 for(const terminal of [true,false]){
  const data={};for(let i=0;i<10;i++){const rows=Array.from({length:100},(_,n)=>extra(i*100+n));if(i===0)rows.splice(0,4,...aliasRows());data[aliasPath(i?11000-i*1000:undefined)]=page(rows,i===9&&terminal?null:10000-i*1000);}
  const f=fixture(data),r=await evaluateInspection(f);assert.equal(r.checksPassed,terminal);assert.equal(r.calls,terminal?18:15);assert.equal(r.aliasEnumeration.pagesRequested,10);assert.equal(r.aliasEnumeration.records,1000);assert.equal(r.aliasEnumeration.termination,terminal?'complete':'cap_exhausted');assert.equal(f.seen.filter(aliasRequestAllowed).length,10);
  if(!terminal)assert.equal(r.failure.check,'ALIAS_ENUMERATION_CAP');
 }
});
test('old cards/budgets cannot authorize expanded enumeration and limits are manifest-hash bound',()=>{
 const f=fixture({});assert.equal(f.manifest.version,'native-preview-inspection/3');assert.equal(f.manifest.maxRequests,18);
 for(const patch of [{version:'native-preview-inspection/2'},{version:'native-preview-inspection/1'},{maxRequests:9},{maxRequests:19},{aliasPolicy:undefined},{aliasPolicy:'unknown'},{maxAliasPages:11},{maxAliasRecords:1001},{aliasPageSize:101}])assert.throws(()=>inspectionAuthority(f.ctx,{...f.manifest,...patch},time));
 assert.deepEqual(aliasLimits,{policy:'vercel-alias-enumeration/1',pages:10,records:1000,pageSize:100});
});
test('denied/timeout/uncertain second page stops without retry and exposes counts only',async()=>{
 for(const reason of ['http_status','timeout','json','network']){
  const f=fixture({[aliasPath()]:page(aliasRows(),1000)}),r=await evaluateInspection({...f,vc:async p=>{if(p===aliasPath(1000))fail('VC_ALIASES',reason,reason==='http_status'?403:undefined);return f.vc(p);}});
  assert.equal(r.calls,7);assert.equal(r.failure.check,'VC_ALIASES');assert.equal(r.failure.reason,reason);assert.equal(r.aliasEnumeration.pagesRequested,2);assert.equal(r.aliasEnumeration.pagesValidated,1);assert.equal(r.aliasEnumeration.termination,'incomplete');assert.doesNotMatch(JSON.stringify(r),/unfarmd.com|SYNTHETIC|until=|Bearer|stack/);
 }
 const f=fixture({[aliasPath()]:page(aliasRows(),1000)});let now=time;const r=await evaluateInspection({...f,clock:()=>now,vc:async p=>{const x=await f.vc(p);if(p===aliasPath())now=f.manifest.expiresAt;return x;}});assert.equal(r.failure.check,'DIAGNOSTIC_AUTHORITY');assert.equal(f.seen.length,6);
});
test('fixed canonical cursor transport forbids alternative project/team/URL/filter and does not follow arbitrary response fields',async()=>{
 for(const p of [aliasPath(1000)+'&domain=x',aliasPath(1000).replace(policy.teamId,'team_OTHER'),aliasPath(1000).replace(policy.projectId,'prj_OTHER'),aliasPath()+'&until=1e3',aliasPath()+'&until=01000',aliasPath()+'&until=-1','https://api.vercel.com'+aliasPath()])assert.equal(aliasRequestAllowed(p),false,p);
 const read=getReader('api.vercel.com','SYNTHETIC_TOKEN_NO_REMOTE_ACCESS',new Set([aliasPath()]));await assert.rejects(read(aliasPath(1000)+'&domain=x')); // rejected before HTTPS
});
test('bound native HTTPS inspector reaches 18 GETs; pins filters on every alias page and no repeated path',async t=>{
 const pages={};for(let i=0;i<10;i++)pages[aliasPath(i?11000-i*1000:undefined)]=page(i? [extra(i)]:aliasRows(),i===9?null:10000-i*1000);
 const f=fixture(pages),card=inspectionCard(f.ctx,Date.now()),seen=[];
 const hook=t.mock.method(https,'request',(options,callback)=>{seen.push(options);assert.equal(options.method,'GET');const q=new EventEmitter();q.destroy=()=>{};q.end=()=>queueMicrotask(()=>{
  const s=new EventEmitter();Object.assign(s,{authorized:true,servername:options.hostname,getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:'+options.hostname})});q.emit('socket',s);s.emit('secureConnect');
  const r=new EventEmitter();Object.assign(r,{statusCode:Object.hasOwn(f.data,options.path)?200:404,headers:{'content-type':'application/json'},complete:true,destroy(){}});callback(r);r.emit('data',Buffer.from(JSON.stringify(f.data[options.path]??{})));r.emit('end');});return q;});
 try{const r=await runReadOnlyInspection(f.ctx,card.manifest,'SYNTHETIC_GITHUB_TOKEN_1234567','SYNTHETIC_VERCEL_TOKEN_1234567');assert.equal(r.checksPassed,true);assert.equal(seen.length,18);assert.equal(new Set(seen.map(x=>x.hostname+x.path)).size,18);for(const x of seen.filter(x=>aliasRequestAllowed(x.path)))assert.equal(x.hostname,'api.vercel.com');}finally{hook.mock.restore();}
});
test('remaining documented webhook/integration arrays and prior wrappers keep no-handler/project restrictions',()=>{
 for(const x of [[],{webhooks:[]}])assert.equal(webhookListing(x),true);
 for(const x of [null,{},[{id:'SYNTHETIC'}],{webhooks:[],pagination:{next:1000}}])assert.throws(()=>webhookListing(x));
 for(const x of [[],{configurations:[]},[{projects:['prj_OTHER'],projectSelection:'selected'}]])assert.equal(integrationListing(x),true);
 for(const x of [null,{},[{}],[{projects:[]}],[{projects:[policy.projectId]}],[{projects:['prj_OTHER'],projectSelection:'all'}],{configurations:[],pagination:{next:1}}])assert.throws(()=>integrationListing(x));
 const p=paths(context());assert.equal(p.webhooks,'/v1/webhooks?projectId='+policy.projectId+'&teamId='+policy.teamId);assert.equal(p.integrations,'/v1/integrations/configurations?view=account&teamId='+policy.teamId);
});
