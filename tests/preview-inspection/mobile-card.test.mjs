// Synthetic clocks, identities, replies and files only. Never a hosted inspection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectionCard,readManifest} from '../../ops/native-beta-output/inspection-context.mjs';
import {inspectionAuthority,evaluateInspection,inspectionPlan} from '../../ops/native-beta-output/inspect-only.mjs';
import {canonical,policy} from '../../ops/native-beta-output/identity.mjs';
import {context,time,controls} from '../native-beta-output/fixtures.mjs';
const installed='47a6a9ec4d506a9a9fbb47ac75ed1e1a93091758',duration=1800000;

test('30-minute card is inclusive at start, valid after five minutes and exclusive at expiry',()=>{
 const ctx=context(),card=inspectionCard(ctx,time);
 assert.equal(card.manifest.expiresAt-card.manifest.startsAt,duration);
 for(const now of [time,time+300000,time+duration-1]){
  assert.equal(inspectionAuthority(ctx,card.manifest,now),card.manifestSha256);
  assert.deepEqual(readManifest(ctx,canonical(card.manifest),now),card.manifest);
 }
 for(const now of [time-1,time+duration,time+duration+1,NaN,Infinity])assert.throws(()=>inspectionAuthority(ctx,card.manifest,now));
 for(const patch of [{expiresAt:time+duration+1},{expiresAt:time},{startsAt:time+1},{expiresAt:null},{expiresAt:time+duration+0.5}])assert.throws(()=>inspectionAuthority(ctx,{...card.manifest,...patch},time));
});

test('UTC and America/Chicago expiration remain explicit across standard and daylight time',()=>{
 for(const [start,utc,zone,hour]of [
  ['2030-01-01T00:00:00Z','2030-01-01T00:30:00.000Z','CST','6:30:00 PM'],
  ['2030-07-01T00:00:00Z','2030-07-01T00:30:00.000Z','CDT','7:30:00 PM']
 ]){
  const card=inspectionCard(context(),Date.parse(start));
  assert.equal(card.expiresUTC,utc);assert.ok(card.expiresChicago.includes(zone));assert.ok(card.expiresChicago.includes(hour));
 }
});

function fixture(){
 const ctx=context(),card=inspectionCard(ctx,time),c=controls(''),p=inspectionPlan(ctx).requests;
 const data=[{id:ctx.runId,head_sha:ctx.sha,head_branch:ctx.branch,workflow_id:policy.workflowId,path:'.github/workflows/native-pilot-admission.yml',status:'in_progress',event:'workflow_dispatch',repository:{id:policy.repositoryId},head_repository:{id:policy.repositoryId}},c.environment,c.branches,c.reviews];
 c.reviews[0].user.login='fuzzysniper';
 const seen=[];let vcCalls=0;
 return {ctx,manifest:card.manifest,card,clock:()=>time,data,seen,gh:async x=>{seen.push(x);return structuredClone(data[p.findIndex(r=>r.path===x)]);},vc:async()=>{vcCalls++;throw Error('SYNTHETIC_VERCEL_MUST_BE_UNREACHABLE');},vcCalls:()=>vcCalls};
}

test('genuine owner review is mandatory; v2 ignores comment while all other approval checks remain',async()=>{
 for(const kind of ['missing','wrong-owner','wrong-login','rejected','duplicate','wrong-environment','attempt-2','wrong-run']){
  const f=fixture();if(kind==='missing')f.data[3]=[];if(kind==='wrong-owner')f.data[3][0].user.id=1;
  if(kind==='wrong-login')f.data[3][0].user.login='other';if(kind==='rejected')f.data[3][0].state='rejected';
  if(kind==='duplicate')f.data[3].push(structuredClone(f.data[3][0]));if(kind==='wrong-environment')f.data[3][0].environments[0].id++;
  if(kind==='attempt-2')f.ctx.attempt=2;if(kind==='wrong-run')f.ctx.runId++;
  const r=await evaluateInspection(f);assert.equal(r.checksPassed,false);assert.equal(f.vcCalls(),0);assert.equal(r.activate,false);
 }
});

test('expiry before entry or between reads fails closed with no subsequent request or retry',async()=>{
 for(const midway of [false,true]){
  const f=fixture();let ticks=0;f.clock=()=>!midway||++ticks>=3?f.manifest.expiresAt:time;
  const r=await evaluateInspection(f);assert.equal(r.checksPassed,false);assert.equal(r.failure.check,'DIAGNOSTIC_AUTHORITY');
  assert.equal(f.seen.length,midway?1:0);assert.equal(f.vcCalls(),0);assert.equal(r.activate,false);
 }
});

test('actual generated v2 card requires owner review without an additional phrase',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-mobile-card-'));
 try{
  const ctx=context(),env={PATH:process.env.PATH,MODE:'preview-inspect',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:policy.repository,GITHUB_REPOSITORY_ID:String(ctx.repositoryId),GITHUB_ACTOR_ID:String(ctx.actorId),GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:String(ctx.runId),GITHUB_REF:'refs/heads/'+ctx.branch,GITHUB_SHA:ctx.sha,APPROVED_SHA:ctx.sha,DEPLOYMENT:'',PREVIEW_STARTS_AT:'',PREVIEW_EXPIRES_AT:'',GITHUB_OUTPUT:dir+'/output',GITHUB_STEP_SUMMARY:dir+'/summary'};
  execFileSync(process.execPath,['ops/native-beta-output/inspection-card.mjs'],{env});
  const manifest=JSON.parse(fs.readFileSync(env.GITHUB_OUTPUT,'utf8').trim().slice('manifest='.length)),digest=inspectionAuthority(ctx,manifest,manifest.startsAt),summary=fs.readFileSync(env.GITHUB_STEP_SUMMARY,'utf8');
  assert.ok(summary.includes('No free-text phrase is required'));assert.ok(summary.includes(digest));assert.doesNotMatch(summary,/APPROVE_NATIVE_PREFLIGHT|MANDATORY: copy/);assert.equal(manifest.version,'native-preview-inspection/2');
  assert.ok(summary.includes(new Date(manifest.expiresAt).toISOString()+' (UTC)'));assert.ok(summary.includes('(America/Chicago)'));
  assert.equal(manifest.expiresAt-manifest.startsAt,duration);assert.equal(manifest.deploy,false);assert.equal(manifest.sourceGo,false);assert.equal(manifest.archiveKey,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('shared lane files and fixed GET/time limits remain exact under the distinct inspection policy',()=>{
 const prior=p=>execFileSync('git',['show',installed+':'+p]).toString(),read=p=>fs.readFileSync(p,'utf8');
 const file='ops/native-beta-output/inspect-only.mjs';assert.match(read(file),/x.expiresAt-x.startsAt<=1800000/);
 const workflow='.github/workflows/native-pilot-admission.yml';assert.equal(read(workflow).replace('        run: |\n          set -o pipefail\n          node ops/native-beta-output/inspection-step.mjs | tee -a "$GITHUB_STEP_SUMMARY"','        run: node ops/native-beta-output/inspection-step.mjs >> "$GITHUB_STEP_SUMMARY"').replace('Non-authorizing 30-minute GET-only approval card','Non-authorizing five-minute GET-only approval card'),prior(workflow));
 for(const p of ['ops/native-beta-output/verify.mjs','ops/native-beta-output/preflight.mjs','ops/native-beta-output/step.mjs','ops/native-beta-output/upload.mjs','ops/native-pilot-admission/publisher.mjs','package.json','package-lock.json'])assert.equal(read(p),prior(p),p);
 const plan=inspectionPlan(context());assert.equal(plan.maxRequests,9);assert.equal(plan.timeoutMs,4000);assert.equal(plan.retries,0);assert.equal(plan.requests.length,9);assert.ok(plan.requests.every(r=>r.method==='GET'));
 const jobs=read(workflow).split('\n  inspection-context:')[1];assert.equal((jobs.match(/timeout-minutes: 5/g)||[]).length,2);
});
