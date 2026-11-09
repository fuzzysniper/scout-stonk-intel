// Operational CLI only. No application import. Default plan performs no network/mutation.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import https from 'node:https';import {checkServerIdentity} from 'node:tls';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {policy,need,hash,inventory,canonical} from './output.mjs';
import {tools,source,cliGitMetadata} from './build.mjs';
import {approval,ownerGate,project,aliases,unchanged,deployment,edgeProtected,bind} from './verify.mjs';
export function context(env){need(env.MODE==='preview-output'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.APPROVED_SHA===env.GITHUB_SHA);return {repositoryId:Number(env.GITHUB_REPOSITORY_ID),actorId:Number(env.GITHUB_ACTOR_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),branch:(env.GITHUB_REF??'').replace(/^refs\/heads\//,''),sha:env.GITHUB_SHA,runId:Number(env.GITHUB_RUN_ID)};}
export function paths(ctx,id){const team='teamId='+policy.teamId,repo='/repos/'+policy.repository;return {
 run:repo+'/actions/runs/'+ctx.runId,reviews:repo+'/actions/runs/'+ctx.runId+'/approvals',environment:repo+'/environments/'+policy.environment,branches:repo+'/environments/'+policy.environment+'/deployment-branch-policies?per_page=2',
 project:'/v9/projects/'+policy.projectId+'?'+team,aliases:'/v4/aliases?projectId='+policy.projectId+'&'+team+'&limit=100',webhooks:'/v1/webhooks?projectId='+policy.projectId+'&'+team,integrations:'/v1/integrations/installations?'+team,
 ...(id?{deployment:'/v13/deployments/'+id+'?'+team}:{})};}
export function getReader(host,token,allowed){need(['api.github.com','api.vercel.com'].includes(host)&&typeof token==='string'&&/^[A-Za-z0-9_.-]{20,1024}$/.test(token));let calls=0;return suffix=>new Promise((resolve,reject)=>{
 need(allowed.has(suffix)&&++calls<=24);let q,timer,done=false,auth=false,size=0;const chunks=[];
 const fail=()=>{if(done)return;done=true;clearTimeout(timer);q?.destroy();reject(Error('NATIVE_BUILD_HOLD'));};
 try{q=https.request({hostname:host,servername:host,port:443,path:suffix,method:'GET',agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity,maxHeaderSize:16384,headers:{authorization:'Bearer '+token,accept:'application/json','accept-encoding':'identity','user-agent':'unfarmd-native-preview-owner-review','x-github-api-version':'2022-11-28'}},r=>{
  if(!auth||r.statusCode!==200||!/^application\/json(?:;|$)/i.test(r.headers['content-type']??'')||r.headers.link||r.headers['content-encoding']&&r.headers['content-encoding']!=='identity'){r.destroy();fail();return;}
  r.on('data',b=>{size+=b.length;if(size>1048576||chunks.length>=256){r.destroy();fail();}else chunks.push(Buffer.from(b));});r.on('error',fail);r.on('aborted',fail);r.on('end',()=>{if(done)return;try{need(r.complete&&size>0);const x=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));done=true;clearTimeout(timer);resolve(x);}catch{fail();}});
 });timer=setTimeout(fail,4000);q.on('error',fail);q.on('socket',s=>s.once('secureConnect',()=>{auth=s.authorized&&s.servername===host&&['TLSv1.2','TLSv1.3'].includes(s.getProtocol())&&!checkServerIdentity(host,s.getPeerCertificate());if(!auth)fail();}));q.end();}catch{fail();}
 });}
export function deployArgs(cli,emptyConfig){return [cli,'deploy','--prebuilt','--target','preview','--non-interactive','--json','--scope',policy.teamId,'--global-config',emptyConfig];}
export function plan(receipt,go,ctx,now){approval(go,ctx,now);need(receipt.version==='native-build-receipt/1'&&receipt.policySha256===hash(fs.readFileSync(new URL('./policy.json',import.meta.url)))&&['plainBundleSha256','inventorySha256','cipherSha256'].every(k=>/^[a-f0-9]{64}$/.test(receipt[k]))&&receipt.sourceCalls===false&&receipt.deployed===false);need(receipt.source.commit===go.commit&&receipt.source.project===policy.projectId&&receipt.source.branch===policy.branch&&receipt.source.verificationOnly===false);return {kind:'NATIVE_PREVIEW_UPLOAD_PLAN/1',commit:go.commit,tree:receipt.source.tree,project:policy.projectId,target:'preview',maxCliInvocations:1,plainBundleSha256:receipt.plainBundleSha256,inventorySha256:receipt.inventorySha256,sourceGo:false,sql:false,deploy:false};}
export async function inspectGate(ctx,go,gh,vc,now){
 const p=paths(ctx),comment=approval(go,ctx,now),run=await gh(p.run);need(run.id===ctx.runId&&run.head_sha===ctx.sha&&run.head_branch===policy.branch&&run.workflow_id===policy.workflowId&&run.path==='.github/workflows/native-pilot-admission.yml'&&run.status==='in_progress'&&run.event==='workflow_dispatch'&&run.repository?.id===policy.repositoryId&&run.head_repository?.id===policy.repositoryId);
 const env=await gh(p.environment),branches=await gh(p.branches),reviews=await gh(p.reviews);ownerGate(env,branches,reviews,comment);
 const pub=project(await vc(p.project)),a=await vc(p.aliases);need(!a.pagination?.next&&!a.pagination?.until);const before=aliases(a.aliases);
 const hooks=await vc(p.webhooks),hookList=Array.isArray(hooks)?hooks:hooks.webhooks;need(Array.isArray(hookList)&&hookList.length===0&&!hooks.pagination?.next);
 const configs=await vc(p.integrations);need(!configs.pagination?.next&&Array.isArray(configs.configurations));need(configs.configurations.every(c=>Array.isArray(c.projects)&&!c.projects.includes(policy.projectId))); // unknown/global installations HOLD
 return {project:pub,aliases:before};
}
export function publicGET(origin,suffix){need(/^https:\/\/scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(origin)&&['/lens','/api/native-pilot','/api/native-pilot/owner/status'].includes(suffix));return new Promise((resolve,reject)=>{
 let q,timer,done=false,size=0,auth=false;const chunks=[];const fail=()=>{if(done)return;done=true;clearTimeout(timer);q?.destroy();reject(Error('NATIVE_BUILD_HOLD'));};
 const host=new URL(origin).hostname;q=https.request({hostname:host,servername:host,path:suffix,method:'GET',agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity,headers:{'user-agent':'unfarmd-source-off-protection-check','accept-encoding':'identity'}},r=>{
  if(!auth||r.headers['content-encoding']&&r.headers['content-encoding']!=='identity'){r.destroy();fail();return;}r.on('data',b=>{size+=b.length;if(size>262144){r.destroy();fail();}else chunks.push(Buffer.from(b));});r.on('error',fail);r.on('aborted',fail);r.on('end',()=>{if(done)return;done=true;clearTimeout(timer);const text=Buffer.concat(chunks).toString('utf8');resolve({path:suffix,credentials:'omit',redirected:false,status:r.statusCode,location:r.headers.location,authenticationMarker:/Vercel Authentication|Authentication Required|vercel\.com\/(?:login|sso-api)/i.test(text),applicationJson:/^application\/json/.test(r.headers['content-type']??'')});});
 });timer=setTimeout(fail,4000);q.on('error',fail);q.on('socket',s=>s.once('secureConnect',()=>{auth=s.authorized&&!checkServerIdentity(host,s.getPeerCertificate());if(!auth)fail();}));q.end();
 });}
export async function once({root,toolRoot,receipt,go,ctx,journal,gh,vc,run,probe,clock=Date.now}){
 plan(receipt,go,ctx,clock());need(!fs.existsSync(journal));const gate=await inspectGate(ctx,go,gh,vc,clock());
 const proof=await source(root,go.commit);need(proof.tree===receipt.source.tree);await cliGitMetadata(toolRoot,root,proof);need(inventory(path.join(root,'.vercel/output')).sha256===receipt.inventorySha256);approval(go,ctx,clock());
 const fd=fs.openSync(journal,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify({version:'native-preview-attempt/1',run:ctx.runId,commit:proof.commit,plainBundleSha256:receipt.plainBundleSha256,state:'started_unconfirmed',activate:false}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 let raw;try{raw=await run();}catch{throw Error('NATIVE_PREVIEW_HOLD_STARTED_UNCONFIRMED');}
 let d;try{const value=JSON.parse(raw);d=value.deployment??value;need(/^dpl_[A-Za-z0-9]{8,100}$/.test(d.id));}catch{throw Error('NATIVE_PREVIEW_HOLD_STARTED_UNCONFIRMED');}
 fs.appendFileSync(journal,'\n'+JSON.stringify({version:'native-preview-attempt/1',run:ctx.runId,commit:proof.commit,deploymentId:d.id,state:'acknowledged',activate:false})+'\n',{mode:0o600});
 const p=paths(ctx,d.id),actual=await vc(p.deployment),identity=deployment(actual,receipt);const post=await vc(p.aliases);need(!post.pagination?.next&&!post.pagination?.until);const after=aliases(post.aliases);unchanged(gate.aliases,after);
 const edge=[];for(const route of ['/lens','/api/native-pilot','/api/native-pilot/owner/status']){const result=await probe(identity.origin,route);edgeProtected(result);edge.push({path:route,status:result.status,authenticationRestrictionObserved:true});}
 approval(go,ctx,clock());const binding=bind(receipt,actual,gate.aliases,after,{id:ctx.runId,head_sha:ctx.sha,head_branch:ctx.branch,repository_id:ctx.repositoryId});
 return {...binding,edge,ownerRuntimeVerification:'PENDING_AUTHENTICATED_OWNER_BROWSER',sourceGo:false,setupAdmission:false};
}
async function main(){
 try{
  const [mode,root,toolRoot,receiptFile,goFile,journal]=process.argv.slice(2),receipt=JSON.parse(fs.readFileSync(receiptFile)),go=JSON.parse(fs.readFileSync(goFile)),ctx=context(process.env);
  if(mode==='plan'){console.log(JSON.stringify(plan(receipt,go,ctx,Date.now())));return;}
  need(mode==='execute'&&process.env.NATIVE_PREVIEW_OPERATION==='ONE_OWNER_APPROVED_SOURCE_OFF_PREVIEW');
  plan(receipt,go,ctx,Date.now());const folder=path.dirname(receiptFile),plain=fs.readFileSync(path.join(folder,'output.private.json')),body=JSON.parse(plain);need(hash(plain)===receipt.plainBundleSha256&&canonical(body.source)===canonical(receipt.source)&&body.inventory.sha256===receipt.inventorySha256&&hash(fs.readFileSync(path.join(folder,'build.aesgcm')))===receipt.cipherSha256);const cli=tools(toolRoot),cfg=fs.mkdtempSync(path.join(os.tmpdir(),'native-empty-deploy-cli-'));
  const ghPaths=paths(ctx),gh=getReader('api.github.com',process.env.NATIVE_ADMISSION_READ_TOKEN,new Set([ghPaths.run,ghPaths.reviews,ghPaths.environment,ghPaths.branches]));
  const vcPaths=new Set([ghPaths.project,ghPaths.aliases,ghPaths.webhooks,ghPaths.integrations]);
  // Only this actual known deployment ID may be added after a parsed CLI acknowledgement.
  const vcBase=getReader('api.vercel.com',process.env.VERCEL_TOKEN,vcPaths),vc=p=>vcBase(p);
  const result=await once({root,toolRoot,receipt,go,ctx,journal,gh,vc,probe:publicGET,run:()=>{
   const env={PATH:process.env.PATH,HOME:process.env.HOME,NO_UPDATE_NOTIFIER:'1',VERCEL_TELEMETRY_DISABLED:'1',VERCEL_TOKEN:process.env.VERCEL_TOKEN};
   const stdout=execFileSync(process.execPath,deployArgs(cli,cfg),{cwd:root,env,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000,maxBuffer:1048576});
   try{const v=JSON.parse(stdout),d=v.deployment??v;if(/^dpl_[A-Za-z0-9]{8,100}$/.test(d.id))vcPaths.add(paths(ctx,d.id).deployment);}catch{/* The one-shot controller preserves uncertain acknowledgement. */}return stdout;
  }});
  const dest=process.env.GITHUB_OUTPUT;if(dest)fs.appendFileSync(dest,'artifact_name='+result.artifactName+'\n');fs.writeFileSync(path.join(path.dirname(receiptFile),'binding.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(result));
 }catch{console.error('NATIVE_PREVIEW_HOLD: preserve bundle and attempt journal; no retry, rebuild, cleanup or promotion.');process.exitCode=1;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
