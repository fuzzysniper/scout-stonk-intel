// Owner-approved GitHub metadata inspection ONLY. Importing this module does no I/O.
// Deliberately independent of publisher.mjs: no writer, publication or admission capability.
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import {checkServerIdentity} from 'node:tls';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const ROOT='/repos/fuzzysniper/scout-stonk-intel';
export const BASE='370f15cc29901e3d1d267273d09993a3283d7dd4';
export const BRANCH='native-pilot/review-rehearsal';
export const ORIGINAL=Object.freeze({run:42293408658,job:128152513109,sha:'0a5abd56faa4fbb7aa0049f0207d139a23c051f6',tree:'b06e9a479c07acb8d484c01eb840ccde8ce32d82',workflowSha256:'1bf53bd8e6609fdd03cb862cb0d37caae02605e0295c7beadd8ec1adae20ed11',scriptSha256:'6f342a4a7b4e73e41c7ebb4b6fcc2b9e74f00b3f702cb22f1db5e487f3605f60',artifact:13541200379,artifactSha256:'5b2552bdb08748cc08dd72310f2c288cba31c47e61babbefc488bab8be2a2747',manifestSha256:'a7da74bfb34d14c04de8412053ca5d26f308785511188115a292268efb331032',environmentId:26506985994});
export const LIMITS=Object.freeze({pageSize:20,pages:3,deployments:12,requests:50,totalMs:60000,requestMs:2500,responseBytes:262144,chunks:256});
const WF='.github/workflows/native-pilot-admission.yml',VARIABLE='UNFARMD_NATIVE_REHEARSAL_'+ORIGINAL.run;
const TASK='native-pilot-review-rehearsal:'+ORIGINAL.run;
const names=['native-pilot-review-rehearsal','native-pilot-setup','native-pilot-source'];
const details=new WeakMap();
const categories=new Set(['guard','binding','http_status','tls','network','timeout','pagination','headers','size','framing','json','request','budget']);
const phases=new Set(['context','environment','branch_policy','original_run','original_jobs','original_approval','original_artifact','original_variable','deployments','statuses','complete']);
export const hash=x=>createHash('sha256').update(x).digest('hex');
const positive=x=>Number.isSafeInteger(x)&&x>0;
function hold(category='guard',status){const e=Error('NATIVE_INSPECTION_HOLD');details.set(e,{category:categories.has(category)?category:'guard',...(Number.isInteger(status)&&status>=100&&status<=599?{httpStatus:status}:{})});return e;}
function need(x,category='guard'){if(!x)throw hold(category);}
export function canonical(x){
 if(x===null||typeof x==='string'||typeof x==='boolean')return JSON.stringify(x);
 if(typeof x==='number'){need(Number.isSafeInteger(x));return String(x);}
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 need(x&&Object.getPrototypeOf(x)===Object.prototype);
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
export function originalManifest(){
 const r={version:'native-pilot-approval-rehearsal/1',admissionEligible:false,sourceGo:false,repository:'fuzzysniper/scout-stonk-intel',repositoryId:1415026436,commit:ORIGINAL.sha,tree:ORIGINAL.tree,branch:BRANCH,runId:ORIGINAL.run,workflowSha256:ORIGINAL.workflowSha256,scriptSha256:ORIGINAL.scriptSha256,artifactId:ORIGINAL.artifact,artifactSha256:ORIGINAL.artifactSha256};
 const text=canonical(r);need(hash(text)===ORIGINAL.manifestSha256);return text;
}
const environmentPath=name=>'/environments/'+name;
const branchPath=name=>environmentPath(name)+'/deployment-branch-policies?per_page=20&page=1';
export const deploymentsPath=page=>'/deployments?sha='+ORIGINAL.sha+'&environment=native-pilot-review-rehearsal&per_page=20&page='+page;
const statusesPath=(id,page)=>'/deployments/'+id+'/statuses?per_page=20&page='+page;
const pageOk=p=>Number.isInteger(p)&&p>=1&&p<=LIMITS.pages;
export function allowed(suffix,ids=new Set()){
 if(typeof suffix!=='string')return false;
 if(names.some(n=>suffix===environmentPath(n)||suffix===branchPath(n)))return true;
 if(['/actions/runs/'+ORIGINAL.run,'/actions/runs/'+ORIGINAL.run+'/approvals','/actions/runs/'+ORIGINAL.run+'/jobs?per_page=20&page=1','/actions/variables/'+VARIABLE].includes(suffix))return true;
 for(let p=1;p<=LIMITS.pages;p++){
  if(suffix===deploymentsPath(p))return true;
  for(const id of ids)if(suffix===statusesPath(id,p))return true;
 }
 return false;
}
/** Validate pagination destinations but NEVER follow a returned URL. Generate fixed paths instead. */
export function nextPage(link,suffix){
 if(link===undefined)return null;need(typeof link==='string'&&link.length<=4096,'pagination');
 const current=new URL('https://api.github.com'+ROOT+suffix);
 const paged=suffix.startsWith('/deployments?')||/^\/deployments\/\d+\/statuses\?/.test(suffix);
 need(paged,'pagination');let next=null,last=null;const seen=new Set();
 for(const part of link.split(',')){
  const match=part.trim().match(/^<([^<>]+)>; rel="(next|prev|first|last)"$/);need(match&&!seen.has(match[2]),'pagination');seen.add(match[2]);
  let u;try{u=new URL(match[1]);}catch{throw hold('pagination');}
  need(u.origin===current.origin&&u.pathname===current.pathname&&!u.hash&&!u.username&&!u.password,'pagination');
  const entries=[...u.searchParams.keys()];need(new Set(entries).size===entries.length,'pagination');
  need(entries.length===[...current.searchParams.keys()].length&&entries.every(k=>current.searchParams.has(k)),'pagination');
  for(const [k,v]of current.searchParams)if(k!=='page')need(u.searchParams.get(k)===v,'pagination');
  const p=u.searchParams.get('page');need(/^[1-9][0-9]{0,5}$/.test(p??''),'pagination');
  const n=Number(p),at=Number(current.searchParams.get('page'));
  if(match[2]==='next'){need(n===at+1&&pageOk(n),'pagination');next=n;}
  if(match[2]==='prev')need(n===at-1,'pagination');
  if(match[2]==='first')need(n===1,'pagination');
  if(match[2]==='last'){need(n>=at,'pagination');last=n;}
 }
 need(last===null||last===Number(current.searchParams.get('page'))||next!==null,'pagination');
 return next;
}
/** No method/body/host parameter; no redirects/retries. Dynamic statuses require scoped records. */
export function inspectionReader(token,signal,clock=()=>performance.now()){
 need(typeof token==='string'&&/^[A-Za-z0-9_]{20,512}$/.test(token),'binding');
 const start=clock(),ids=new Set();let requests=0;
 const get=suffix=>new Promise((resolve,reject)=>{
  try{need(allowed(suffix,ids));need(++requests<=LIMITS.requests&&clock()>=start&&clock()-start<LIMITS.totalMs,'budget');}catch(e){reject(e);return;}
  let req,timer,settled=false,authenticated=false,bytes=0;const chunks=[];
  const fail=(category,status)=>{if(settled)return;settled=true;clearTimeout(timer);req?.destroy();chunks.forEach(b=>b.fill(0));reject(hold(category,status));};
  try{
   req=https.request({hostname:'api.github.com',servername:'api.github.com',port:443,path:ROOT+suffix,method:'GET',agent:false,signal,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity,maxHeaderSize:16384,headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','accept-encoding':'identity','user-agent':'unfarmd-native-read-only-inspection','x-github-api-version':'2022-11-28'}},res=>{
    const deny=(c,s)=>{res.destroy();fail(c,s);};
    if(!authenticated){deny('tls');return;}
    if(res.statusCode!==200){deny('http_status',res.statusCode);return;}
    if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'||!/^application\/json(?:;|$)/i.test(res.headers['content-type']??'')){deny('headers');return;}
    let next;try{next=nextPage(res.headers.link,suffix);}catch{deny('pagination');return;}
    res.on('data',b=>{bytes+=b.length;if(bytes>LIMITS.responseBytes||chunks.length>=LIMITS.chunks){deny('size');return;}chunks.push(Buffer.from(b));});
    res.on('aborted',()=>fail('network'));res.on('error',()=>fail('network'));
    res.on('end',()=>{
     if(settled)return;
     if(!res.complete||bytes===0){fail('framing');return;}
     let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail('json');return;}
     settled=true;clearTimeout(timer);chunks.forEach(b=>b.fill(0));resolve({data,nextPage:next});
    });
   });
   timer=setTimeout(()=>fail('timeout'),Math.max(1,Math.min(LIMITS.requestMs,LIMITS.totalMs-(clock()-start))));
   req.on('error',()=>fail(signal?.aborted?'timeout':'network'));req.on('socket',socket=>socket.once('secureConnect',()=>{
    try{authenticated=socket.encrypted&&socket.authorized&&socket.servername==='api.github.com'&&['TLSv1.2','TLSv1.3'].includes(socket.getProtocol())&&!checkServerIdentity('api.github.com',socket.getPeerCertificate());}catch{authenticated=false;}
    if(!authenticated)fail('tls');
   }));req.end();
  }catch{fail('request');}
 });
 return Object.freeze({get,statuses(d,page){need(positive(d?.id)&&d.sha===ORIGINAL.sha&&d.environment===names[0]&&pageOk(page));ids.add(d.id);need(ids.size<=LIMITS.deployments,'budget');return get(statusesPath(d.id,page));},count:()=>requests});
}
export function inspectionContext(env,git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()){
 need(env.GITHUB_REPOSITORY==='fuzzysniper/scout-stonk-intel'&&env.GITHUB_REPOSITORY_ID==='1415026436'&&env.GITHUB_ACTOR_ID==='58099771'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_RUN_ATTEMPT==='1');
 need(env.GITHUB_REF==='refs/heads/'+BRANCH&&env.MODE==='inspection'&&!env.DEPLOYMENT&&env.NATIVE_INSPECTION_OPERATION==='github-read-only-owner-approved');
 need(/^[a-f0-9]{40}$/.test(env.APPROVED_SHA??'')&&env.APPROVED_SHA===env.GITHUB_SHA&&git('rev-parse','HEAD')===env.GITHUB_SHA&&positive(Number(env.GITHUB_RUN_ID))&&Number(env.GITHUB_RUN_ID)!==ORIGINAL.run);
 git('merge-base','--is-ancestor',BASE,'HEAD');need(!git('status','--porcelain','--untracked-files=normal'));
 need(git('rev-parse',ORIGINAL.sha+'^{tree}')===ORIGINAL.tree);
 need(hash(git('show',ORIGINAL.sha+':'+WF)+'\n')===ORIGINAL.workflowSha256&&hash(git('show',ORIGINAL.sha+':ops/native-pilot-admission/publisher.mjs')+'\n')===ORIGINAL.scriptSha256);
 originalManifest();return {inspectionRun:Number(env.GITHUB_RUN_ID),commit:env.GITHUB_SHA};
}
function environmentReport(e,b,name){
 need(positive(e?.id)&&e.name===name&&Array.isArray(e.protection_rules)&&Array.isArray(b?.branch_policies)&&Number.isSafeInteger(b.total_count)&&b.total_count>=0);
 const r=e.protection_rules.filter(x=>x.type==='required_reviewers'),rule=r[0];
 const branch=name===names[0]?BRANCH:'native-pilot/private-beta-rc';
 const matched=e.can_admins_bypass===false&&e.deployment_branch_policy?.protected_branches===false&&e.deployment_branch_policy.custom_branch_policies===true&&e.protection_rules.length>=1&&e.protection_rules.length<=2&&e.protection_rules.every(x=>['required_reviewers','branch_policy'].includes(x.type))&&r.length===1&&rule.prevent_self_review===false&&rule.reviewers?.length===1&&rule.reviewers[0].type==='User'&&rule.reviewers[0].reviewer?.id===58099771&&rule.reviewers[0].reviewer?.login==='fuzzysniper'&&rule.reviewers[0].reviewer?.type==='User'&&b.total_count===1&&b.branch_policies.length===1&&b.branch_policies[0].type==='branch'&&b.branch_policies[0].name===branch;
 return {name,id:e.id,controls:matched?'match':'mismatch',adminBypass:e.can_admins_bypass===true?'enabled':e.can_admins_bypass===false?'disabled':'unknown',requiredReviewerRules:r.length,reviewerIds:Array.isArray(rule?.reviewers)?rule.reviewers.slice(0,20).map(x=>positive(x.reviewer?.id)?x.reviewer.id:null):[],preventSelfReview:rule?.prevent_self_review===false?'disabled':rule?.prevent_self_review===true?'enabled':'unknown',branchPolicyCount:b.total_count,expectedBranch:branch,exactBranchMatches:b.total_count===1&&b.branch_policies.length===1&&b.branch_policies[0].name===branch&&b.branch_policies[0].type==='branch'};
}
const actor=x=>x?.id===41898282&&x.login==='github-actions[bot]'&&x.type==='Bot'?'actions_bot':x?.id===58099771&&x.login==='fuzzysniper'&&x.type==='User'?'owner':'other';
const runURL='https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/'+ORIGINAL.run;
function statusReport(s){need(positive(s?.id));return {id:s.id,state:['error','failure','inactive','in_progress','queued','pending','success'].includes(s.state)?s.state:'other',creator:actor(s.creator),originalRunLink:s.log_url===runURL,originalPublishJobLink:s.log_url===runURL+'/job/'+ORIGINAL.job,environmentMatches:s.environment===names[0],parsedRecordSha256:hash(JSON.stringify(s))};}
async function pages(fetchPage,onPage=()=>{}){const result=[];const seen=new Set();for(let page=1;page<=LIMITS.pages;page++){
 const r=await fetchPage(page);need(Array.isArray(r.data)&&r.data.length<=LIMITS.pageSize&&(!r.nextPage||r.nextPage===page+1),'pagination');
 for(const x of r.data){need(positive(x?.id)&&!seen.has(x.id),'pagination');seen.add(x.id);result.push(x);}
 onPage(result);
 if(r.nextPage===null)return result;
 }throw hold('pagination');}
/** A read transcript is never setup/source authority. Unknown/partial histories are retained as HOLD. */
export async function inspect(api,context){
 const report={kind:'NATIVE_READ_ONLY_INSPECTION/1',...context,outcome:'HOLD',activate:false,sourceCalls:false,setupAdmission:false,explicitWritesThisInspection:0,environments:[],incident:{run:ORIGINAL.run,commit:ORIGINAL.sha,rootCause:'UNKNOWN',historicalPostAttempts:'UNKNOWN',records:[]}};
 let phase='environment';
 try{
  for(const name of names){phase='environment';const e=await api.get(environmentPath(name));need(e.nextPage===null);phase='branch_policy';const b=await api.get(branchPath(name));need(b.nextPage===null,'pagination');report.environments.push(environmentReport(e.data,b.data,name));}
  need(new Set(report.environments.map(e=>e.id)).size===3&&report.environments[0].id===ORIGINAL.environmentId);
  phase='original_run';const r=(await api.get('/actions/runs/'+ORIGINAL.run)).data;
  need(r?.id===ORIGINAL.run&&r.head_sha===ORIGINAL.sha&&r.head_branch===BRANCH&&r.path===WF&&r.workflow_id===409607134&&r.event==='workflow_dispatch'&&r.status==='completed'&&r.conclusion==='failure'&&r.run_attempt===1&&r.repository?.id===1415026436&&r.head_repository?.id===1415026436);
  report.workflowId=r.workflow_id;report.incident.runConclusion='failure';
  phase='original_jobs';const jobs=await api.get('/actions/runs/'+ORIGINAL.run+'/jobs?per_page=20&page=1');
  need(jobs.nextPage===null&&Number.isSafeInteger(jobs.data?.total_count)&&jobs.data.total_count<=20&&jobs.data.total_count>=1&&Array.isArray(jobs.data.jobs)&&jobs.data.jobs.length===jobs.data.total_count);
  const job=jobs.data.jobs.find(x=>x.id===ORIGINAL.job);need(job&&job.run_id===ORIGINAL.run&&job.head_sha===ORIGINAL.sha&&job.status==='completed'&&job.conclusion==='failure');
  report.incident.publishJobVerified=true;
  phase='original_approval';const reviews=(await api.get('/actions/runs/'+ORIGINAL.run+'/approvals')).data;
  need(Array.isArray(reviews)&&reviews.length===1);const review=reviews[0];need(review.state==='approved'&&actor(review.user)==='owner'&&review.comment==='REHEARSE_NATIVE_REVIEW_ONCE '+ORIGINAL.manifestSha256+' '+ORIGINAL.run&&review.environments?.length===1&&review.environments[0].id===ORIGINAL.environmentId&&review.environments[0].name===names[0]);report.incident.ownerApproval='match';
  // Its one-day artifact has expired. Git-verified original pins reconstruct the canonical
  // record; do not turn an expired artifact into a prerequisite for incident inspection.
  report.incident.originalArtifact={id:ORIGINAL.artifact,sha256:ORIGINAL.artifactSha256,evidence:'previously_verified_metadata_not_requeried'};
  phase='original_variable';const v=(await api.get('/actions/variables/'+VARIABLE)).data;need(v?.name===VARIABLE&&typeof v.value==='string'&&Buffer.byteLength(v.value)<=12288);
  report.incident.variable={name:VARIABLE,sha256:hash(v.value),matchesOriginalCanonical:v.value===originalManifest()};
  phase='deployments';
  const remember=items=>{need(items.length<=LIMITS.deployments,'budget');report.incident.records=items.map(d=>{need(d.sha===ORIGINAL.sha&&d.environment===names[0]);return {id:d.id,classification:'unclassified_preserved',task:d.task===TASK?'expected_explicit':d.task==='deploy'?'deploy':'other',creator:actor(d.creator),parsedRecordSha256:hash(JSON.stringify(d)),statusHistory:'UNREAD',statuses:[]};});};
  const deployments=await pages(p=>api.get(deploymentsPath(p)),remember);
  let explicit=0,ambiguous=false;
  const expectedPayload={protocol:'native-pilot-approval-rehearsal/1',manifestSha256:ORIGINAL.manifestSha256,admissionEligible:false};
  for(const [index,d]of deployments.entries()){
   need(d.sha===ORIGINAL.sha&&d.environment===names[0]);phase='statuses';
   const record=report.incident.records[index];
   const statuses=(await pages(p=>api.statuses(d,p),items=>{record.statuses=items.map(statusReport);record.statusHistory='PARTIAL';})).map(statusReport);
   const payloadMatches=d.payload&&JSON.stringify(Object.keys(d.payload).sort())===JSON.stringify(Object.keys(expectedPayload).sort())&&Object.keys(expectedPayload).every(k=>d.payload[k]===expectedPayload[k]);
   const exact=d.task===TASK&&payloadMatches&&d.ref===ORIGINAL.sha&&d.production_environment===false&&d.transient_environment===true&&actor(d.creator)==='actions_bot';
   let classification='unclassified_preserved';
   if(d.task===TASK){explicit++;classification=exact?'explicit_publisher_record':'explicit_task_mismatch_preserved';if(!exact)ambiguous=true;}
   else if(d.task==='deploy'&&statuses.some(s=>s.originalPublishJobLink&&s.environmentMatches&&s.creator!=='other')&&actor(d.creator)!=='other')classification='environment_job_linked_nonpublisher';
   else if(d.task==='deploy'&&statuses.some(s=>s.originalRunLink))classification='environment_run_linked_not_job_proven';
   if(classification==='unclassified_preserved'||classification==='environment_run_linked_not_job_proven')ambiguous=true;
   Object.assign(record,{classification,payloadMatches:!!payloadMatches,statusHistory:'COMPLETE',expectedSuccessStatusObserved:statuses.some(s=>s.state==='success'&&s.creator==='actions_bot'&&s.originalRunLink&&s.environmentMatches),statuses});
  }
  report.incident.history='bounded_history_observed';report.incident.explicitRecordsObserved=explicit;
  report.incident.disposition=explicit===0?'no_explicit_record_observed':explicit===1?'explicit_record_observed':'multiple_explicit_records_preserved';
  if(explicit>1)ambiguous=true;
  const controls=report.environments.every(e=>e.controls==='match');
  if(controls&&report.incident.variable.matchesOriginalCanonical&&!ambiguous)report.outcome='COMPLETE_READ_ONLY';
  else report.reason='observed_control_or_record_mismatch';
  phase='complete';
 }catch(e){const d=details.get(e)??{category:'guard'};report.failure={phase:phases.has(phase)?phase:'context',category:d.category,...(d.httpStatus?{httpStatus:d.httpStatus}:{})};}
 report.reads=api.count();return report;
}
async function main(){
 let context;try{context=inspectionContext(process.env);}catch{console.log(JSON.stringify({kind:'NATIVE_READ_ONLY_INSPECTION/1',outcome:'HOLD',failure:{phase:'context',category:'guard'},activate:false,sourceCalls:false,explicitWritesThisInspection:0}));process.exitCode=1;return;}
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),LIMITS.totalMs);
 try{
  const report=await inspect(inspectionReader(process.env.NATIVE_ADMISSION_READ_TOKEN,abort.signal),context);
  const output=JSON.stringify(report);console.log(output);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'GET-only native inspection; no setup/source authority.\n\n\x60\x60\x60json\n'+output+'\n\x60\x60\x60\n');
  if(report.outcome!=='COMPLETE_READ_ONLY')process.exitCode=1;
 }catch(e){const d=details.get(e)??{category:'guard'};console.log(JSON.stringify({kind:'NATIVE_READ_ONLY_INSPECTION/1',outcome:'HOLD',failure:{phase:'context',category:d.category},activate:false,sourceCalls:false,explicitWritesThisInspection:0}));process.exitCode=1;}
 finally{clearTimeout(timer);abort.abort();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
