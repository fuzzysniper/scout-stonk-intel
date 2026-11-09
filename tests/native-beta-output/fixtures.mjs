// All remote replies, keys, output files and deployment IDs here are SYNTHETIC.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
import {policy,hash,canonical,freeze} from '../../ops/native-beta-output/output.mjs';
export const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-native-output-'));
export const sha='a'.repeat(40),tree='b'.repeat(40),time=1893456000000;
export function output(root,source={commit:sha,tree,branch:policy.branch,repository:policy.repository,project:policy.projectId,verificationOnly:false}){
 const write=(p,x)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true,mode:0o755});fs.writeFileSync(path.join(root,p),typeof x==='string'?x:JSON.stringify(x),{mode:0o644});};
 write('config.json',{version:3,framework:{slug:'nextjs',version:'15.5.28'}});write('builds.json',{target:'preview',cliVersion:policy.cli});
 for(const route of ['api/native-pilot','api/native-pilot/owner/[...all]']){write('functions/'+route+'.func/.vc-config.json',{runtime:'nodejs24.x',handler:'___next_launcher.cjs'});write('functions/'+route+'.func/___next_launcher.cjs','// SYNTHETIC output '+source.commit+' '+source.tree+' 26516929095 26517047948');}
 return source;
}
export function frozen(root,source){const dir=path.join(root,'output'),s=output(dir,source),raw=path.join(root,'raw.private.json'),receipt=freeze(dir,s,raw);receipt.cipherSha256='c'.repeat(64);return {dir,source:s,raw,receipt};}
export const context=(commit=sha)=>({repositoryId:policy.repositoryId,actorId:policy.ownerId,attempt:1,branch:policy.branch,sha:commit,runId:123456789});
export const go=(commit=sha)=>({version:'native-preview-go/1',project:policy.projectId,branch:policy.branch,runId:123456789,commit,startsAt:time-1000,expiresAt:time+120000,maxPreviews:1,sourceGo:false,sql:false,noNativePreviewBindings:true,externalHandlersReviewed:true});
export const dpl=(commit=sha)=>({id:'dpl_SYNTHETIC12345',projectId:policy.projectId,target:null,readyState:'READY',url:'scout-stonk-intel-synthetic123-riskledgerapp.vercel.app',meta:{githubCommitSha:commit,githubCommitRef:policy.branch,githubOrg:'fuzzysniper',githubRepo:'scout-stonk-intel'}});
export const aliasRows=()=>['unfarmd.com','scout.storkcoin.xyz','scout-stonk-intel.vercel.app','scout-stonk-intel-git-main-riskledgerapp.vercel.app'].map(alias=>({alias,projectId:policy.projectId,deploymentId:'dpl_SYNTHETICPRODUCTION'}));
export function controls(comment){return {environment:{id:policy.environmentId,name:policy.environment,can_admins_bypass:false,deployment_branch_policy:{protected_branches:false,custom_branch_policies:true},protection_rules:[{type:'required_reviewers',prevent_self_review:false,reviewers:[{type:'User',reviewer:{id:policy.ownerId}}]},{type:'branch_policy'}]},branches:{total_count:1,branch_policies:[{type:'branch',name:policy.branch}]},reviews:[{state:'approved',user:{id:policy.ownerId,type:'User'},comment,environments:[{id:policy.environmentId}]}]};}
export function localSource(){const root=temp();execFileSync('git',['clone','--quiet','--shared','--no-checkout',process.cwd(),root]);execFileSync('git',['checkout','--quiet','-B',policy.branch,'HEAD'],{cwd:root});execFileSync('git',['remote','set-url','origin','https://github.com/'+policy.repository+'.git'],{cwd:root});fs.appendFileSync(path.join(root,'.git/info/exclude'),'\n.vercel/\n');const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim(),t=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root}).toString().trim();return {root,source:{commit,tree:t,branch:policy.branch,project:policy.projectId,repository:policy.repository,verificationOnly:false}};}
export {hash,canonical};
