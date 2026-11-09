// Final Actions archive receipt OUTSIDE the frozen application. Fixed GitHub GET only.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {policy,need,hash} from './output.mjs';import {getReader,context} from './upload.mjs';
export function verifyArtifact(a,b,ctx,digest){
 need(Number.isSafeInteger(a.id)&&a.id>0&&a.name===b.artifactName&&a.expired===false&&a.workflow_run?.id===ctx.runId&&a.workflow_run.repository_id===policy.repositoryId&&a.workflow_run.head_repository_id===policy.repositoryId&&a.workflow_run.head_branch===policy.branch&&a.workflow_run.head_sha===ctx.sha);
 need(/^sha256:[a-f0-9]{64}$/.test(a.digest)&&/^(?:sha256:)?[a-f0-9]{64}$/.test(digest)&&a.digest==='sha256:'+digest.replace(/^sha256:/,'')&&Number.isSafeInteger(a.size_in_bytes)&&a.size_in_bytes>0&&a.size_in_bytes<201330688&&Date.parse(a.expires_at)>Date.now());
 return {version:'native-preview-artifact-receipt/1',deployment:b.identity,run:ctx.runId,artifactId:a.id,artifactName:a.name,archiveSha256:a.digest.slice(7),inventorySha256:b.inventorySha256,plainBundleSha256:b.plainBundleSha256,bindingFileSha256:hash(JSON.stringify(b,null,2)+'\n'),expiresAt:a.expires_at,sourceGo:false,setupAdmission:false,ownerRuntimeVerification:b.ownerRuntimeVerification};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{
 const ctx=context(process.env),id=Number(process.env.FINAL_ARTIFACT_ID);need(Number.isSafeInteger(id)&&id>0);const p='/repos/'+policy.repository+'/actions/artifacts/'+id,read=getReader('api.github.com',process.env.NATIVE_ADMISSION_READ_TOKEN,new Set([p]));const b=JSON.parse(fs.readFileSync(process.argv[2]));const receipt=verifyArtifact(await read(p),b,ctx,process.env.FINAL_ARTIFACT_DIGEST);need(process.env.GITHUB_STEP_SUMMARY);fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\nFinal preserved artifact (not source/setup authorization):\n```json\n'+JSON.stringify(receipt,null,2)+'\n```\n');console.log(JSON.stringify(receipt));
}catch{console.error('NATIVE_PREVIEW_ARTIFACT_HOLD: preserve the original archive and run; no rebuild or re-upload.');process.exitCode=1;}
