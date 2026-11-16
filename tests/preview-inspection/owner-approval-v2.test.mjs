// SYNTHETIC identities/clocks/replies/credentials only. No hosted inspection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectionAuthority,inspectionOwnerGate,evaluateInspection,inspectionPlan} from '../../ops/native-beta-output/inspect-only.mjs';
import {inspectionCard,readManifest} from '../../ops/native-beta-output/inspection-context.mjs';
import {ownerGate,approval} from '../../ops/native-beta-output/verify.mjs';
import {policy,canonical} from '../../ops/native-beta-output/identity.mjs';
import {context,time,controls,aliasRows,go} from '../native-beta-output/fixtures.mjs';
const base='d98316ca4bda7120eeff5882688ba1e3364c04d5';
function fixture(){
 const ctx=context(),manifest=inspectionCard(ctx,time).manifest,c=controls(''),plan=inspectionPlan(ctx),seen=[];
 c.reviews[0].user.login='fuzzysniper';
 const values=[{id:ctx.runId,head_sha:ctx.sha,head_branch:ctx.branch,workflow_id:policy.workflowId,path:'.github/workflows/native-pilot-admission.yml',status:'in_progress',event:'workflow_dispatch',repository:{id:policy.repositoryId},head_repository:{id:policy.repositoryId}},c.environment,c.branches,c.reviews,{id:policy.projectId,accountId:policy.teamId,name:'scout-stonk-intel',nodeVersion:'24.x',link:{type:'github',org:'fuzzysniper',repo:'scout-stonk-intel'},ssoProtection:{deploymentType:'all'}},{aliases:aliasRows(),pagination:{count:4,next:null,prev:null}},[],[],[]];
 const read=async p=>{seen.push(p);const i=plan.requests.findIndex(r=>r.path===p);assert.ok(i>=0);return values[i];};
 return {ctx,manifest,c,values,seen,gh:read,vc:read,clock:()=>time};
}
test('only genuine sole-owner approval authorizes v2 reads; comment is never inspected or logged',async()=>{
 for(const comment of ['',null,undefined,'SYNTHETIC_PRIVATE_UNTRUSTED_TEXT']){
  const f=fixture();f.c.reviews[0].comment=comment;const r=await evaluateInspection(f);
  assert.equal(r.checksPassed,true);assert.equal(r.calls,9);assert.equal(new Set(f.seen).size,9);assert.equal(r.version,'native-preview-inspection-result/3');
  assert.equal(r.approvalPolicy,'github-environment-owner/1');assert.equal(r.manifestSha256,inspectionAuthority(f.ctx,f.manifest,time));
  assert.equal(r.activate,false);assert.equal(r.sourceGo,false);assert.equal(r.decision,'HOLD_NO_DEPLOYMENT_AUTHORITY');assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC_PRIVATE/);
 }
 const f=fixture();Object.defineProperty(f.c.reviews[0],'comment',{get(){throw Error('SYNTHETIC_PRIVATE_COMMENT_GETTER');}});
 assert.equal((await evaluateInspection(f)).checksPassed,true);
});
test('every original owner control remains enforced, including bypass and exact single environment/branch',()=>{
 const mutations=[
  f=>f.c.environment.id++,f=>f.c.environment.name='wrong',f=>f.c.environment.can_admins_bypass=true,
  f=>f.c.environment.deployment_branch_policy.protected_branches=true,f=>f.c.environment.deployment_branch_policy.custom_branch_policies=false,
  f=>f.c.environment.protection_rules=[],f=>f.c.environment.protection_rules.push({type:'wait_timer'}),
  f=>f.c.environment.protection_rules[0].prevent_self_review=true,f=>f.c.environment.protection_rules[0].reviewers.push({type:'User',reviewer:{id:1}}),
  f=>f.c.environment.protection_rules[0].reviewers[0].type='Team',f=>f.c.environment.protection_rules[0].reviewers[0].reviewer.id=1,
  f=>f.c.branches.total_count=2,f=>f.c.branches.branch_policies[0].name='*',f=>f.c.branches.branch_policies[0].type='tag',
  f=>f.c.reviews=[],f=>f.c.reviews[0].state='rejected',f=>f.c.reviews[0].user.id=1,f=>f.c.reviews[0].user.login='other',f=>f.c.reviews[0].user.type='Bot',
  f=>f.c.reviews[0].environments=[],f=>f.c.reviews[0].environments[0].id++
 ];
 for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>inspectionOwnerGate(f.c.environment,f.c.branches,f.c.reviews));}
});
test('v1 cards cannot be upgraded by a blank comment; exact v2 policy/run/SHA/repository/environment and expiry are mandatory',()=>{
 const f=fixture();
 for(const patch of [{version:'native-preview-inspection/1'},{approvalPolicy:'comment/1'},{approvalPolicy:undefined},{repositoryId:1},{environmentId:1},{runId:f.ctx.runId+1},{commit:'b'.repeat(40)},{branch:'main'},{expiresAt:time+1800001},{expiresAt:time}]){
  assert.throws(()=>readManifest(f.ctx,canonical({...f.manifest,...patch}),time));
 }
 for(const patch of [{attempt:2},{actorId:1},{repositoryId:1},{sha:'b'.repeat(40)},{runId:f.ctx.runId+1}])assert.throws(()=>inspectionAuthority({...f.ctx,...patch},f.manifest,time));
});
test('shared publisher/upload gate still requires its exact phrase; v2 never calls or changes it',()=>{
 const f=fixture(),expected=approval(go(),context(),time);
 assert.throws(()=>ownerGate(f.c.environment,f.c.branches,f.c.reviews,expected));
 f.c.reviews[0].comment=expected;assert.equal(ownerGate(f.c.environment,f.c.branches,f.c.reviews,expected),true);
 for(const file of ['ops/native-beta-output/verify.mjs','ops/native-beta-output/step.mjs','ops/native-pilot-admission/publisher.mjs'])assert.equal(fs.readFileSync(file,'utf8'),execFileSync('git',['show',base+':'+file]).toString(),file);
 const gate=fs.readFileSync('ops/native-beta-output/inspect-only.mjs','utf8').split('export function inspectionOwnerGate(')[1].split('\nexport async function evaluateInspection')[0];
 const original=fs.readFileSync('ops/native-beta-output/verify.mjs','utf8').split('export function ownerGate(')[1].split('\nexport function project(')[0];
 const restored=gate.replace('env,branches,reviews)','env,branches,reviews,comment)').replace("&&reviews[0].user.login==='fuzzysniper'",'').replace("['OWNER_REVIEW_ONE_ENVIRONMENT'","['OWNER_REVIEW_EXACT_COMMENT',()=>reviews[0].comment===comment],['OWNER_REVIEW_ONE_ENVIRONMENT'").trimEnd();
 assert.equal(restored,original.trimEnd(),'all other predicates preserved in original order');

});
test('actual pipeline mirrors sanitized failures to logs and Summary and preserves failing exit status',()=>{
 const workflow=fs.readFileSync('.github/workflows/native-pilot-admission.yml','utf8'),block=workflow.split('\n  inspection-read-only:')[1];
 const script=block.match(/        run: \|\n((?:          .*\n)+)/)[1].split('\n').filter(Boolean).map(l=>l.slice(10)).join('\n');
 assert.match(script,/set -o pipefail/);assert.match(script,/inspection-step\.mjs \| tee -a "\$GITHUB_STEP_SUMMARY"/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-inspection-tee-'));
 try{
  for(const malformed of [true,false]){
   const summary=dir+'/'+String(malformed),c=context(),manifest=inspectionCard(c,Date.now()).manifest;
   const env={PATH:process.env.PATH,MODE:malformed?'WRONG':'preview-inspect',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:policy.repository,GITHUB_REPOSITORY_ID:String(c.repositoryId),GITHUB_ACTOR_ID:String(c.actorId),GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:String(c.runId),GITHUB_REF:'refs/heads/'+c.branch,GITHUB_SHA:c.sha,APPROVED_SHA:c.sha,DEPLOYMENT:'',PREVIEW_STARTS_AT:'',PREVIEW_EXPIRES_AT:'',INSPECTION_MANIFEST:canonical(manifest),GITHUB_STEP_SUMMARY:summary};
   let output;
   try{execFileSync('/bin/bash',['-e','-c',script],{env,stdio:['ignore','pipe','pipe']});assert.fail('must fail without credentials');}catch(e){assert.equal(e.status,1);assert.equal(e.stderr.toString(),'');output=e.stdout.toString();}
   assert.equal(fs.readFileSync(summary,'utf8'),output);const result=JSON.parse(output.replace(/^```json\n|\n```\n$/g,''));
   assert.equal(result.checksPassed,false);assert.equal(result.activate,false);assert.equal(result.sourceGo,false);assert.equal(result.failure.cliState,'not_started');
   assert.doesNotMatch(output,/Bearer|https:|stack|SYNTHETIC_PRIVATE/);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
