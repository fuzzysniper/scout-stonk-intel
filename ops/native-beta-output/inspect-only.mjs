// Protected GET-only diagnostic core. No uploader/archive/publisher/CLI imports.
// The distinct inspected workflow entry is inspection-step.mjs.
import {policy,hash,canonical} from './identity.mjs';
import {all,atAsync,reportFailure,safeFailure} from './diagnostics.mjs';
import {ownerGate,project} from './verify.mjs';
import {paths,legacyIntegrationsPath,getReader,runIdentity,aliasListing,webhookListing,integrationListing} from './preflight.mjs';
export function inspectionPlan(ctx){const p=paths(ctx);return Object.freeze({mode:'GET_ONLY',maxRequests:9,maxResponseBytes:1048576,timeoutMs:4000,retries:0,redirects:0,sourceGo:false,activate:false,requests:[
 ['GH_RUN','api.github.com',p.run],['GH_ENVIRONMENT','api.github.com',p.environment],['GH_BRANCHES','api.github.com',p.branches],['GH_APPROVALS','api.github.com',p.reviews],
 ['VC_PROJECT','api.vercel.com',p.project],['VC_ALIASES','api.vercel.com',p.aliases],['VC_WEBHOOKS','api.vercel.com',p.webhooks],['VC_INTEGRATIONS','api.vercel.com',p.integrations],['VC_LEGACY_INTEGRATIONS','api.vercel.com',legacyIntegrationsPath()]
 ].map(([label,host,path])=>Object.freeze({label,host,path,method:'GET'}))});}
export function inspectionAuthority(ctx,x,now){all([
 ['DIAGNOSTIC_CONTEXT',()=>ctx.repositoryId===policy.repositoryId&&ctx.actorId===policy.ownerId&&ctx.attempt===1&&ctx.branch===policy.branch&&/^[a-f0-9]{40}$/.test(ctx.sha)&&Number.isSafeInteger(ctx.runId)&&ctx.runId>0],
 ['DIAGNOSTIC_AUTHORITY',()=>x.version==='native-preview-inspection/1'&&x.commit===ctx.sha&&x.runId===ctx.runId&&x.project===policy.projectId&&x.branch===policy.branch&&x.maxRequests===9&&x.deploy===false&&x.sourceGo===false&&x.sql===false&&x.archiveKey===false&&Number.isSafeInteger(now)&&Number.isSafeInteger(x.startsAt)&&Number.isSafeInteger(x.expiresAt)&&x.startsAt<=now&&now<x.expiresAt&&x.expiresAt-x.startsAt>0&&x.expiresAt-x.startsAt<=1800000]
 ]);return 'APPROVE_NATIVE_PREFLIGHT_GET_ONLY '+ctx.runId+' '+ctx.sha+' '+policy.projectId+' '+x.expiresAt+' '+hash(canonical(x));}
export async function evaluateInspection({ctx,manifest,gh,vc,clock=Date.now}){
 let calls=0;const results=[],used=new Set(),p=paths(ctx),plan=inspectionPlan(ctx);
 async function read(host,path){const item=plan.requests.find(r=>r.host===host&&r.path===path);all([['DIAGNOSTIC_BUDGET',()=>item&&!used.has(item.label)&&++calls<=9]]);used.add(item.label);inspectionAuthority(ctx,manifest,clock());return atAsync(item.label,()=> (host==='api.github.com'?gh:vc)(path));}
 const pass=check=>results.push({check,outcome:'pass'});
 try{
  const comment=inspectionAuthority(ctx,manifest,clock());runIdentity(await read('api.github.com',p.run),ctx);pass('RUN_IDENTITY');
  const env=await read('api.github.com',p.environment),branches=await read('api.github.com',p.branches),reviews=await read('api.github.com',p.reviews);ownerGate(env,branches,reviews,comment);pass('OWNER_CONTROLS');
  project(await read('api.vercel.com',p.project));pass('PROJECT_AND_PROTECTION');
  aliasListing(await read('api.vercel.com',p.aliases));pass('ALIASES_COMPLETE');
  webhookListing(await read('api.vercel.com',p.webhooks));pass('WEBHOOKS_EMPTY');
  integrationListing(await read('api.vercel.com',p.integrations));pass('INTEGRATIONS_SAFE');
  // Comparison only, never authorization. Failure of the legacy route is evidence,
  // not permission for any upload. No retry or fallback request on an unknown path.
  try{const value=await read('api.vercel.com',legacyIntegrationsPath());results.push({check:'VC_LEGACY_INTEGRATIONS',outcome:'comparison_only',shape:Array.isArray(value)?'array':Array.isArray(value?.configurations)?'wrapper':'other'});}catch(e){results.push({check:'VC_LEGACY_INTEGRATIONS',outcome:'comparison_only',failure:safeFailure(e)});}
  inspectionAuthority(ctx,manifest,clock());return {version:'native-preview-inspection-result/1',decision:'HOLD_NO_DEPLOYMENT_AUTHORITY',checksPassed:true,calls,results,cliState:'not_started',sourceGo:false,activate:false};
 }catch(e){return {version:'native-preview-inspection-result/1',decision:'HOLD_NO_DEPLOYMENT_AUTHORITY',checksPassed:false,calls,results,failure:reportFailure(e,'not_started'),sourceGo:false,activate:false};}
}
/** Only production transport binding offered. Fixed catalog/hosts/GET and native TLS.
 * Caller supplies TWO approved read/deployment-token bindings; archive key is absent.
 * This function cannot invoke a deployment, create an artifact or publish a grant. */
export function runReadOnlyInspection(ctx,manifest,githubToken,vercelToken){
 inspectionAuthority(ctx,manifest,Date.now());const p=inspectionPlan(ctx);
 const gh=getReader('api.github.com',githubToken,new Set(p.requests.filter(r=>r.host==='api.github.com').map(r=>r.path))),vc=getReader('api.vercel.com',vercelToken,new Set(p.requests.filter(r=>r.host==='api.vercel.com').map(r=>r.path)));
 return evaluateInspection({ctx,manifest,gh,vc});
}
