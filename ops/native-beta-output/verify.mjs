// Pure deployment/protection/binding verification. Does not call an endpoint or confer source authority.
import {policy,need,hash,canonical} from './output.mjs';
export function approval(x,context,now){
 need(context.repositoryId===policy.repositoryId&&context.actorId===policy.ownerId&&context.attempt===1&&context.branch===policy.branch&&context.sha===x.commit&&Number.isSafeInteger(context.runId)&&context.runId>0);
 need(x.version==='native-preview-go/1'&&x.project===policy.projectId&&x.branch===policy.branch&&x.runId===context.runId&&/^[a-f0-9]{40}$/.test(x.commit)&&Number.isSafeInteger(now)&&Number.isSafeInteger(x.startsAt)&&Number.isSafeInteger(x.expiresAt)&&x.startsAt<=now&&now<x.expiresAt&&x.expiresAt-x.startsAt>0&&x.expiresAt-x.startsAt<=1800000&&x.maxPreviews===1&&x.sourceGo===false&&x.sql===false&&x.noNativePreviewBindings===true&&x.externalHandlersReviewed===true);
 return 'APPROVE_NATIVE_PREVIEW_ONCE '+x.runId+' '+x.commit+' '+policy.projectId+' '+x.expiresAt;
}
export function ownerGate(env,branches,reviews,comment){
 need(env.id===policy.environmentId&&env.name===policy.environment&&env.can_admins_bypass===false&&env.deployment_branch_policy?.protected_branches===false&&env.deployment_branch_policy.custom_branch_policies===true);
 const rules=env.protection_rules;need(Array.isArray(rules)&&rules.length>=1&&rules.length<=2&&rules.every(r=>['required_reviewers','branch_policy'].includes(r.type)));
 const r=rules.filter(x=>x.type==='required_reviewers');need(r.length===1&&r[0].prevent_self_review===false&&r[0].reviewers?.length===1&&r[0].reviewers[0].type==='User'&&r[0].reviewers[0].reviewer?.id===policy.ownerId);
 need(branches.total_count===1&&branches.branch_policies?.length===1&&branches.branch_policies[0].type==='branch'&&branches.branch_policies[0].name===policy.branch);
 need(reviews.length===1&&reviews[0].state==='approved'&&reviews[0].user?.id===policy.ownerId&&reviews[0].user.type==='User'&&reviews[0].comment===comment&&reviews[0].environments?.length===1&&reviews[0].environments[0].id===policy.environmentId);return true;
}
export function project(p){need(p.id===policy.projectId&&p.accountId===policy.teamId&&p.name==='scout-stonk-intel'&&p.nodeVersion==='24.x'&&p.link?.type==='github'&&p.link.org==='fuzzysniper'&&p.link.repo==='scout-stonk-intel');need(p.ssoProtection?.enabled!==false&&['all','preview','all_except_custom_domains','prod_deployment_urls_and_all_previews'].includes(p.ssoProtection?.deploymentType));return {id:p.id,team:p.accountId,name:p.name,nodeVersion:p.nodeVersion,authentication:p.ssoProtection.deploymentType};}
export function aliases(rows){need(Array.isArray(rows)&&rows.length<=1000);const out={};for(const x of rows){need(x.projectId===policy.projectId&&typeof x.alias==='string'&&/^[a-z0-9.-]+$/.test(x.alias)&&/^dpl_[A-Za-z0-9]+$/.test(x.deploymentId)&&!Object.hasOwn(out,x.alias));out[x.alias]=x.deploymentId;}for(const n of ['unfarmd.com','scout.storkcoin.xyz','scout-stonk-intel.vercel.app','scout-stonk-intel-git-main-riskledgerapp.vercel.app'])need(Object.hasOwn(out,n));return out;}
export function unchanged(before,after){for(const [name,id]of Object.entries(before))need(after[name]===id);return true;}
export function deployment(d,receipt){need(d.projectId===policy.projectId&&(d.target==='preview'||Object.hasOwn(d,'target')&&d.target===null)&&!d.customEnvironment&&!d.customEnvironmentSlugOrId&&d.readyState==='READY'&&/^dpl_[A-Za-z0-9]{8,100}$/.test(d.id)&&/^scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(d.url)&&!d.url.includes('-git-'));need(d.meta?.githubCommitSha===receipt.source.commit&&d.meta.githubCommitRef===policy.branch&&d.meta.githubOrg==='fuzzysniper'&&d.meta.githubRepo==='scout-stonk-intel');return {id:d.id,origin:'https://'+d.url,commit:receipt.source.commit,tree:receipt.source.tree,branch:policy.branch,project:policy.projectId};}
export function edgeProtected(r){
 need(r.credentials==='omit'&&r.redirected!==true);const u=r.location?new URL(r.location):null;
 const redirect=[302,303,307,308].includes(r.status)&&u?.protocol==='https:'&&u.hostname==='vercel.com'&&/^\/(?:login|sso-api)(?:\/|$)/.test(u.pathname);
 const challenge=[401,403].includes(r.status)&&r.authenticationMarker===true&&r.applicationJson!==true;
 need(redirect||challenge);return true;
}
export function authenticated(r){need(r.credentials==='owner-browser-session'&&r.redirected===false);if(r.path==='/lens')need(r.status===200&&r.html===true);else if(r.path==='/api/native-pilot')need(r.status===503&&r.error==='native_pilot_off');else{need(r.path==='/api/native-pilot/owner/status'&&r.status===503&&r.error==='native_owner_unavailable');}return true;}
export function bind(receipt,d,before,after,artifactRun){
 need(receipt.source.verificationOnly===false&&receipt.source.branch===policy.branch&&artifactRun.head_sha===receipt.source.commit&&artifactRun.head_branch===policy.branch&&artifactRun.repository_id===policy.repositoryId&&Number.isSafeInteger(artifactRun.id)&&artifactRun.id>0);unchanged(before,after);
 const identity=deployment(d,receipt);return {version:'native-preview-binding/1',identity,inventorySha256:receipt.inventorySha256,plainBundleSha256:receipt.plainBundleSha256,artifactName:'native-pilot-build-'+identity.id,artifactRunId:artifactRun.id,sourceGo:false,setupAdmission:false,productionAliasesUnchanged:true,bindingSha256:hash(canonical(identity))};
}
