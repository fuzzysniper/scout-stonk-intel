// Entirely invented SYNTHETIC OFFLINE GitHub/hosted-acceptance claims, NOT real approval/evidence.
import fs from 'node:fs';import {createRequire} from 'node:module';
import {policy} from '../native-pilot/fixtures.mjs';
export const require=createRequire(import.meta.url),load=f=>require(process.env.ADMISSION_BUILD+'/lib/native-pilot/admission/'+f+'.js');
export const {canonical,reviewComment,setupCandidate,sourceCandidate,REPOSITORY,WORKFLOW_PATH}=load('contract');
export const {hash}=require(process.env.ADMISSION_BUILD+'/lib/native-pilot/plan.js');
export function fixture(){
 const now=Date.parse('2026-11-05T06:00:00Z'),p=policy();p.startsAt=now-1000;p.expiresAt=now+899000;p.branch='native-pilot/synthetic-approval';
 const identity=Object.fromEntries(['commit','tree','branch','project','deployment','origin'].map(k=>[k,p[k]]));
 const plan={workflowId:10001,setupEnvironmentId:20001,sourceEnvironmentId:20002,branch:p.branch},context={identity,plan};
 const pins=JSON.parse(fs.readFileSync('lib/native-pilot/postgres/pins.json')),review={runId:30001,artifactId:40001,artifactSha256:hash('SYNTHETIC ARTIFACT NOT DEPLOYED'),workflowSha256:hash('SYNTHETIC PUBLICATION WORKFLOW')};
 const setup={version:'native-pilot-setup/1',trust:'owner-reviewed-control-plane/1',sourceGo:false,identity,review,startsAt:now-5000,expiresAt:now+86400000-5000,controlPlaneAcceptanceSha256:hash('SYNTHETIC NO REAL REVIEWER ASSURANCE'),policy:p,
  database:{project:'twilight-hall-57571802',branch:'br-sweet-voice-b4x4et5q',database:'unfarmd_v4_pilot',host:'ep-tiny-truth-b4bx6xt9.c-6.us-east-2.aws.neon.tech',caSha256:hash('SYNTHETIC CA'),postgresMajor:18,tenantId:'a'.repeat(32),timelineId:'b'.repeat(32),installerSha256:pins.installerSha256,functions:pins.functions,physicalEvidenceSha256:'d7f94d6a5e39428430e97fbc108d6e63e46a63cb5f73e6a73ab9e6796f9fd122',acceptanceSha256:hash('SYNTHETIC PHYSICAL ACCEPTANCE'),recoveryPolicySha256:hash('SYNTHETIC RECOVERY POLICY'),observedAt:now-4000},
  checkpoint:{origin:'https://synthetic-native-checkpoint.onrender.com',resourceId:'SYNTHETIC_SERVICE',diskId:'SYNTHETIC_DISK',directory:'/var/data/synthetic-native-checkpoint',keySha256:hash('SYNTHETIC MAC'),reviewSha256:hash('SYNTHETIC CUSTODY'),acceptanceSha256:hash('SYNTHETIC CHECKPOINT ACCEPTANCE'),observedAt:now-3000},
  owner:{subject:p.ownerSubject,issuer:p.issuer,authSecretSha256:hash('SYNTHETIC SECRET'),authSqlSha256:require(process.env.ADMISSION_BUILD+'/lib/v4-owner-preview/sql-pins.js').AUTH_SQL_SHA,acceptanceSha256:hash('SYNTHETIC OWNER ENROLLMENT')}
 };
 const source={version:'native-pilot-source/1',trust:'owner-reviewed-control-plane/1',sourceGo:true,identity,review:{...review,runId:30002},setupSha256:hash(canonical(setup)),policySha256:hash(canonical(p)),startsAt:p.startsAt,expiresAt:p.expiresAt,methods:['getTokenLargestAccounts','getMultipleAccounts','getBlockTime'],maxAttempts:3,maxCredits:3,retries:0};
 const bot={id:41898282,login:'github-actions[bot]',type:'Bot'},user={id:58099771,login:'fuzzysniper',type:'User'};
 const publication=(stage,record)=>({id:50001,sha:p.commit,ref:p.commit,environment:'native-pilot-'+stage,task:'native-pilot-'+stage+':'+p.deployment,production_environment:false,transient_environment:true,creator:bot,payload:{protocol:'native-pilot-publication/1',manifestSha256:hash(canonical(record))}});
 const evidence=(stage,record)=>({
  statuses:[{state:'success',environment:'native-pilot-'+stage,creator:bot,log_url:'https://github.com/'+REPOSITORY+'/actions/runs/'+record.review.runId}],
  run:{id:record.review.runId,head_sha:p.commit,head_branch:p.branch,workflow_id:plan.workflowId,path:WORKFLOW_PATH,repository:{id:1415026436,full_name:REPOSITORY},head_repository:{id:1415026436},status:'completed',conclusion:'success',event:'workflow_dispatch',created_at:new Date(now-4000).toISOString(),updated_at:new Date(now-100).toISOString()},
  reviews:[{state:'approved',user,comment:reviewComment(stage,record),environments:[{id:stage==='setup'?plan.setupEnvironmentId:plan.sourceEnvironmentId,name:'native-pilot-'+stage}]}],
  artifact:{id:record.review.artifactId,name:'native-pilot-build-'+p.deployment,expired:false,digest:'sha256:'+record.review.artifactSha256,workflow_run:{head_sha:p.commit,head_branch:p.branch,head_repository_id:1415026436,repository_id:1415026436}},
  environment:{id:stage==='setup'?plan.setupEnvironmentId:plan.sourceEnvironmentId,name:'native-pilot-'+stage,can_admins_bypass:false,protection_rules:[{type:'required_reviewers',prevent_self_review:false,reviewers:[{type:'User',reviewer:user}]},{type:'branch_policy'}],deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}},
  branches:{total_count:1,branch_policies:[{name:p.branch,type:'branch'}]},
  workflow:{type:'file',path:WORKFLOW_PATH,encoding:'base64',content:Buffer.from('SYNTHETIC PUBLICATION WORKFLOW').toString('base64')}
 });
 const configuration=(stage,record)=>({name:'UNFARMD_NATIVE_'+stage.toUpperCase()+'_'+p.deployment.toUpperCase(),value:canonical(record)});
 return {now,p,identity,plan,context,setup,source,publication,evidence,configuration};
}
export const clone=x=>JSON.parse(JSON.stringify(x));
