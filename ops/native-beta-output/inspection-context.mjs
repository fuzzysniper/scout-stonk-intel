// Fixed manual-only context. This module has no network or credential access.
import {policy,canonical,hash} from './identity.mjs';
import {all} from './diagnostics.mjs';
import {inspectionAuthority} from './inspect-only.mjs';
export function inspectionContext(env){
 all([
  ['DIAGNOSTIC_CONTEXT',()=>env.MODE==='preview-inspect'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REPOSITORY===policy.repository&&env.GITHUB_REF==='refs/heads/'+policy.branch&&env.APPROVED_SHA===env.GITHUB_SHA&&env.DEPLOYMENT===''&&env.PREVIEW_STARTS_AT===''&&env.PREVIEW_EXPIRES_AT==='']
 ]);
 const ctx={repositoryId:Number(env.GITHUB_REPOSITORY_ID),actorId:Number(env.GITHUB_ACTOR_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),branch:policy.branch,sha:env.GITHUB_SHA,runId:Number(env.GITHUB_RUN_ID)};
 all([['DIAGNOSTIC_CONTEXT',()=>ctx.repositoryId===policy.repositoryId&&ctx.actorId===policy.ownerId&&ctx.attempt===1&&/^[a-f0-9]{40}$/.test(ctx.sha)&&Number.isSafeInteger(ctx.runId)&&ctx.runId>0]]);
 return ctx;
}
export function inspectionCard(ctx,now){
 const manifest={version:'native-preview-inspection/1',commit:ctx.sha,runId:ctx.runId,project:policy.projectId,branch:policy.branch,maxRequests:9,startsAt:now,expiresAt:now+300000,deploy:false,sourceGo:false,sql:false,archiveKey:false};
 const comment=inspectionAuthority(ctx,manifest,now);
 return {manifest,manifestSha256:hash(canonical(manifest)),comment,expiresUTC:new Date(manifest.expiresAt).toISOString()};
}
export function readManifest(ctx,text,now){
 all([['DIAGNOSTIC_AUTHORITY',()=>typeof text==='string'&&text.length>0&&text.length<=4096]]);
 let manifest;all([['DIAGNOSTIC_AUTHORITY',()=>{manifest=JSON.parse(text);return canonical(manifest)===text;}]]);
 inspectionAuthority(ctx,manifest,now);return manifest;
}
