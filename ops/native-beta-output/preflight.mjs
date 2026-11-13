// Shared fixed-host GET preflight. No child_process, CLI, archive key or deployment write.
import https from 'node:https';import {checkServerIdentity} from 'node:tls';
import fs from 'node:fs';
import {policy,hash} from './output.mjs';
import {all,fail,atAsync,responseLabel} from './diagnostics.mjs';
import {approval,ownerGate,project,aliases} from './verify.mjs';
export function context(env){all([
 ['CONTEXT_MODE',()=>env.MODE==='preview-output'],['CONTEXT_EVENT',()=>env.GITHUB_EVENT_NAME==='workflow_dispatch'],['CONTEXT_SHA',()=>env.APPROVED_SHA===env.GITHUB_SHA]
 ]);return {repositoryId:Number(env.GITHUB_REPOSITORY_ID),actorId:Number(env.GITHUB_ACTOR_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),branch:(env.GITHUB_REF??'').replace(/^refs\/heads\//,''),sha:env.GITHUB_SHA,runId:Number(env.GITHUB_RUN_ID)};}
export function paths(ctx,id){const team='teamId='+policy.teamId,repo='/repos/'+policy.repository;return {
 run:repo+'/actions/runs/'+ctx.runId,reviews:repo+'/actions/runs/'+ctx.runId+'/approvals',environment:repo+'/environments/'+policy.environment,branches:repo+'/environments/'+policy.environment+'/deployment-branch-policies?per_page=2',
 project:'/v9/projects/'+policy.projectId+'?'+team,aliases:'/v4/aliases?projectId='+policy.projectId+'&'+team+'&limit=100',webhooks:'/v1/webhooks?projectId='+policy.projectId+'&'+team,
 // Documented listing, account view: no integration-type filter hides relevant installations.
 integrations:'/v1/integrations/configurations?view=account&'+team,
 ...(id?{deployment:'/v13/deployments/'+id+'?'+team}:{})};}
export function legacyIntegrationsPath(){return '/v1/integrations/installations?teamId='+policy.teamId;}
export function getReader(host,token,allowed){all([[host==='api.github.com'?'GH_TOKEN':'VC_TOKEN',()=>['api.github.com','api.vercel.com'].includes(host)&&typeof token==='string'&&/^[A-Za-z0-9_.-]{20,1024}$/.test(token)]]);let calls=0;
 return suffix=>new Promise((resolve,reject)=>{
  all([['REQUEST_ALLOWED',()=>allowed.has(suffix)],['REQUEST_BUDGET',()=>++calls<=24]]);
  const label=responseLabel(host,suffix);let q,timer,done=false,auth=false,size=0;const chunks=[];
  const stop=(reason,status)=>{if(done)return;done=true;clearTimeout(timer);q?.destroy();try{fail(label,reason,status);}catch(e){reject(e);}};
  try{q=https.request({hostname:host,servername:host,port:443,path:suffix,method:'GET',agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity,maxHeaderSize:16384,headers:{authorization:'Bearer '+token,accept:'application/json','accept-encoding':'identity','user-agent':'unfarmd-native-preview-owner-review','x-github-api-version':'2022-11-28'}},r=>{
   if(!auth){r.destroy();stop('tls');return;}
   if(r.statusCode!==200){r.destroy();stop('http_status',r.statusCode);return;}
   if(!/^application\/json(?:;|$)/i.test(r.headers['content-type']??'')){r.destroy();stop('content_type');return;}
   if(r.headers.link){r.destroy();stop('pagination');return;}
   if(r.headers['content-encoding']&&r.headers['content-encoding']!=='identity'){r.destroy();stop('encoding');return;}
   r.on('data',b=>{size+=b.length;if(size>1048576||chunks.length>=256){r.destroy();stop('response_bound');}else chunks.push(Buffer.from(b));});r.on('error',()=>stop('network'));r.on('aborted',()=>stop('incomplete'));
   r.on('end',()=>{if(done)return;if(!r.complete||size===0){stop('incomplete');return;}try{const x=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));done=true;clearTimeout(timer);resolve(x);}catch{stop('json');}});
  });timer=setTimeout(()=>stop('timeout'),4000);q.on('error',()=>stop('network'));q.on('socket',s=>s.once('secureConnect',()=>{try{auth=s.authorized&&s.servername===host&&['TLSv1.2','TLSv1.3'].includes(s.getProtocol())&&!checkServerIdentity(host,s.getPeerCertificate());if(!auth)stop('tls');}catch{stop('tls');}}));q.end();}catch{stop('network');}
 });
}
export function plan(receipt,go,ctx,now){approval(go,ctx,now);all([
 ['RECEIPT_VERSION',()=>receipt.version==='native-build-receipt/1'],['RECEIPT_POLICY',()=>receipt.policySha256===hash(fs.readFileSync(new URL('./policy.json',import.meta.url)))],['RECEIPT_HASHES',()=>['plainBundleSha256','inventorySha256','cipherSha256'].every(k=>/^[a-f0-9]{64}$/.test(receipt[k]))],['RECEIPT_OFF',()=>receipt.sourceCalls===false&&receipt.deployed===false],
 ['RECEIPT_COMMIT',()=>receipt.source.commit===go.commit],['RECEIPT_PROJECT',()=>receipt.source.project===policy.projectId],['RECEIPT_BRANCH',()=>receipt.source.branch===policy.branch],['RECEIPT_NOT_VERIFICATION',()=>receipt.source.verificationOnly===false]
 ]);return {kind:'NATIVE_PREVIEW_UPLOAD_PLAN/1',commit:go.commit,tree:receipt.source.tree,project:policy.projectId,target:'preview',maxCliInvocations:1,plainBundleSha256:receipt.plainBundleSha256,inventorySha256:receipt.inventorySha256,sourceGo:false,sql:false,deploy:false};}
export function runIdentity(run,ctx){all([
 ['RUN_ID',()=>run.id===ctx.runId],['RUN_SHA',()=>run.head_sha===ctx.sha],['RUN_BRANCH',()=>run.head_branch===policy.branch],['RUN_WORKFLOW',()=>run.workflow_id===policy.workflowId],['RUN_PATH',()=>run.path==='.github/workflows/native-pilot-admission.yml'],['RUN_STATUS',()=>run.status==='in_progress'],['RUN_EVENT',()=>run.event==='workflow_dispatch'],['RUN_REPOSITORY',()=>run.repository?.id===policy.repositoryId],['RUN_HEAD_REPOSITORY',()=>run.head_repository?.id===policy.repositoryId]
 ]);return true;}
export function aliasListing(a){all([['ALIAS_PAGE_COMPLETE',()=>!a.pagination?.next&&!a.pagination?.until]]);return aliases(a.aliases);}
export function webhookListing(hooks){const list=Array.isArray(hooks)?hooks:hooks.webhooks;all([['WEBHOOKS_ARRAY',()=>Array.isArray(list)],['WEBHOOKS_EMPTY',()=>list.length===0],['WEBHOOKS_PAGE_COMPLETE',()=>!hooks.pagination?.next]]);return true;}
export function integrationListing(value){
 // The public API returns an array. Retain the old explicitly accepted wrapper too;
 // the SAME no-global/no-applicable-project test runs over either representation.
 const list=Array.isArray(value)?value:value.configurations;
 all([['INTEGRATIONS_PAGE_COMPLETE',()=>!value.pagination?.next],['INTEGRATIONS_ARRAY',()=>Array.isArray(list)],['INTEGRATIONS_BOUND',()=>list.length<=1000],['INTEGRATIONS_SCOPE',()=>list.every(c=>Array.isArray(c.projects)&&!c.projects.includes(policy.projectId)&&c.projects.length>0&&c.projects.every(p=>typeof p==='string'&&p.length>0)&&(!Object.hasOwn(c,'projectSelection')||c.projectSelection==='selected'))]]);return true;
}
export async function inspectGate(ctx,go,gh,vc,now){
 const p=paths(ctx),comment=approval(go,ctx,now);runIdentity(await gh(p.run),ctx);
 const env=await gh(p.environment),branches=await gh(p.branches),reviews=await gh(p.reviews);ownerGate(env,branches,reviews,comment);
 const pub=await atAsync('VC_PROJECT',async()=>project(await vc(p.project))),before=await atAsync('VC_ALIASES',async()=>aliasListing(await vc(p.aliases)));
 await atAsync('VC_WEBHOOKS',async()=>webhookListing(await vc(p.webhooks)));
 await atAsync('VC_INTEGRATIONS',async()=>integrationListing(await vc(p.integrations)));
 return {project:pub,aliases:before};
}
