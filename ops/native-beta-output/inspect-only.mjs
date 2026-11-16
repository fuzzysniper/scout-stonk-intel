// Protected GET-only diagnostic core. No uploader/archive/publisher/CLI imports.
// The distinct inspected workflow entry is inspection-step.mjs.
import {policy,hash,canonical} from './identity.mjs';
import {all,atAsync,reportFailure,safeFailure} from './diagnostics.mjs';
import {project} from './verify.mjs';
import {paths,legacyIntegrationsPath,getReader,runIdentity,webhookListing,integrationListing} from './preflight.mjs';
import {aliasLimits,aliasRequestAllowed,readAliases} from './alias-pages.mjs';
export function inspectionPlan(ctx){const p=paths(ctx);return Object.freeze({mode:'GET_ONLY',maxRequests:18,aliasLimits,maxResponseBytes:1048576,timeoutMs:4000,retries:0,redirects:0,sourceGo:false,activate:false,requests:[
 ['GH_RUN','api.github.com',p.run],['GH_ENVIRONMENT','api.github.com',p.environment],['GH_BRANCHES','api.github.com',p.branches],['GH_APPROVALS','api.github.com',p.reviews],
 ['VC_PROJECT','api.vercel.com',p.project],['VC_ALIASES','api.vercel.com',p.aliases],['VC_WEBHOOKS','api.vercel.com',p.webhooks],['VC_INTEGRATIONS','api.vercel.com',p.integrations],['VC_LEGACY_INTEGRATIONS','api.vercel.com',legacyIntegrationsPath()]
 ].map(([label,host,path])=>Object.freeze({label,host,path,method:'GET'}))});}
export function inspectionAuthority(ctx,x,now){all([
 ['DIAGNOSTIC_CONTEXT',()=>ctx.repositoryId===policy.repositoryId&&ctx.actorId===policy.ownerId&&ctx.attempt===1&&ctx.branch===policy.branch&&/^[a-f0-9]{40}$/.test(ctx.sha)&&Number.isSafeInteger(ctx.runId)&&ctx.runId>0],
 ['DIAGNOSTIC_AUTHORITY',()=>x.version==='native-preview-inspection/3'&&x.approvalPolicy==='github-environment-owner/1'&&x.repositoryId===policy.repositoryId&&x.environmentId===policy.environmentId&&x.commit===ctx.sha&&x.runId===ctx.runId&&x.project===policy.projectId&&x.branch===policy.branch&&x.maxRequests===18&&x.aliasPolicy===aliasLimits.policy&&x.maxAliasPages===10&&x.maxAliasRecords===1000&&x.aliasPageSize===100&&x.deploy===false&&x.sourceGo===false&&x.sql===false&&x.archiveKey===false&&Number.isSafeInteger(now)&&Number.isSafeInteger(x.startsAt)&&Number.isSafeInteger(x.expiresAt)&&x.startsAt<=now&&now<x.expiresAt&&x.expiresAt-x.startsAt>0&&x.expiresAt-x.startsAt<=1800000]
 ]);return hash(canonical(x));}
// Inspection v2 only: genuine run-bound environment approval; no comment predicate.
// Shared verify.ownerGate and every publisher/upload/setup/source lane stay untouched.
export function inspectionOwnerGate(env,branches,reviews){
 all([['OWNER_ENVIRONMENT_ID',()=>env.id===policy.environmentId],['OWNER_ENVIRONMENT_NAME',()=>env.name===policy.environment],['OWNER_ENVIRONMENT_NO_ADMIN_BYPASS',()=>env.can_admins_bypass===false],['OWNER_ENVIRONMENT_NO_PROTECTED_BRANCH_FALLBACK',()=>env.deployment_branch_policy?.protected_branches===false],['OWNER_ENVIRONMENT_CUSTOM_BRANCH_RULES',()=>env.deployment_branch_policy.custom_branch_policies===true]]);
 const rules=env.protection_rules;all([['OWNER_RULES_ARRAY',()=>Array.isArray(rules)],['OWNER_RULES_NONEMPTY',()=>rules.length>=1],['OWNER_RULES_BOUNDED',()=>rules.length<=2],['OWNER_RULES_KNOWN_TYPES',()=>rules.every(r=>['required_reviewers','branch_policy'].includes(r.type))]]);
 const r=rules.filter(x=>x.type==='required_reviewers');all([['OWNER_REVIEWER_SOLE_RULE',()=>r.length===1],['OWNER_REVIEWER_SELF_REVIEW_SETTING',()=>r[0].prevent_self_review===false],['OWNER_REVIEWER_SOLE_REVIEWER',()=>r[0].reviewers?.length===1],['OWNER_REVIEWER_USER_TYPE',()=>r[0].reviewers[0].type==='User'],['OWNER_REVIEWER_OWNER_ID',()=>r[0].reviewers[0].reviewer?.id===policy.ownerId]]);
 all([['OWNER_BRANCH_ONE_RULE',()=>branches.total_count===1],['OWNER_BRANCH_ONE_ENTRY',()=>branches.branch_policies?.length===1],['OWNER_BRANCH_BRANCH_TYPE',()=>branches.branch_policies[0].type==='branch'],['OWNER_BRANCH_EXACT_NAME',()=>branches.branch_policies[0].name===policy.branch]]);
 all([['OWNER_REVIEW_ONE_REVIEW',()=>reviews.length===1],['OWNER_REVIEW_APPROVED',()=>reviews[0].state==='approved'],['OWNER_REVIEW_OWNER_ID',()=>reviews[0].user?.id===policy.ownerId&&reviews[0].user.login==='fuzzysniper'],['OWNER_REVIEW_USER_TYPE',()=>reviews[0].user.type==='User'],['OWNER_REVIEW_ONE_ENVIRONMENT',()=>reviews[0].environments?.length===1],['OWNER_REVIEW_ENVIRONMENT_ID',()=>reviews[0].environments[0].id===policy.environmentId]]);return true;
}
export async function evaluateInspection({ctx,manifest,gh,vc,clock=Date.now}){
 let calls=0,aliasEnumeration;const results=[],used=new Set(),p=paths(ctx),plan=inspectionPlan(ctx);
 async function read(host,path){const item=plan.requests.find(r=>r.host===host&&r.path===path)??(host==='api.vercel.com'&&aliasRequestAllowed(path)?{label:'VC_ALIASES'}:undefined);all([['DIAGNOSTIC_BUDGET',()=>item&&!used.has(host+path)&&++calls<=18]]);used.add(host+path);inspectionAuthority(ctx,manifest,clock());return atAsync(item.label,()=> (host==='api.github.com'?gh:vc)(path));}
 const pass=check=>results.push({check,outcome:'pass'});
 try{
  inspectionAuthority(ctx,manifest,clock());runIdentity(await read('api.github.com',p.run),ctx);pass('RUN_IDENTITY');
  const env=await read('api.github.com',p.environment),branches=await read('api.github.com',p.branches),reviews=await read('api.github.com',p.reviews);inspectionOwnerGate(env,branches,reviews);pass('OWNER_CONTROLS');
  project(await read('api.vercel.com',p.project));pass('PROJECT_AND_PROTECTION');
  await readAliases(path=>read('api.vercel.com',path),value=>{aliasEnumeration=value;});pass('ALIASES_COMPLETE');
  webhookListing(await read('api.vercel.com',p.webhooks));pass('WEBHOOKS_EMPTY');
  integrationListing(await read('api.vercel.com',p.integrations));pass('INTEGRATIONS_SAFE');
  // Comparison only, never authorization. Failure of the legacy route is evidence,
  // not permission for any upload. No retry or fallback request on an unknown path.
  try{const value=await read('api.vercel.com',legacyIntegrationsPath());results.push({check:'VC_LEGACY_INTEGRATIONS',outcome:'comparison_only',shape:Array.isArray(value)?'array':Array.isArray(value?.configurations)?'wrapper':'other'});}catch(e){results.push({check:'VC_LEGACY_INTEGRATIONS',outcome:'comparison_only',failure:safeFailure(e)});}
  inspectionAuthority(ctx,manifest,clock());return {version:'native-preview-inspection-result/3',decision:'HOLD_NO_DEPLOYMENT_AUTHORITY',approvalPolicy:'github-environment-owner/1',manifestSha256:hash(canonical(manifest)),checksPassed:true,calls,results,aliasEnumeration,cliState:'not_started',sourceGo:false,activate:false};
 }catch(e){return {version:'native-preview-inspection-result/3',decision:'HOLD_NO_DEPLOYMENT_AUTHORITY',checksPassed:false,calls,results,...(aliasEnumeration?{aliasEnumeration}:{}),failure:reportFailure(e,'not_started'),sourceGo:false,activate:false};}
}
/** Only production transport binding offered. Fixed catalog/hosts/GET and native TLS.
 * Caller supplies TWO approved read/deployment-token bindings; archive key is absent.
 * This function cannot invoke a deployment, create an artifact or publish a grant. */
export function runReadOnlyInspection(ctx,manifest,githubToken,vercelToken){
 inspectionAuthority(ctx,manifest,Date.now());const p=inspectionPlan(ctx);
 const gh=getReader('api.github.com',githubToken,new Set(p.requests.filter(r=>r.host==='api.github.com').map(r=>r.path))),vc=getReader('api.vercel.com',vercelToken,new Set(p.requests.filter(r=>r.host==='api.vercel.com').map(r=>r.path)));
 return evaluateInspection({ctx,manifest,gh,vc});
}
