import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Response} from 'miniflare';
import {harness} from './scheduler-harness.mjs';
const run=promisify(execFile);
test('owner auth proof reuses actual adapter checks but never dispatches, claims or exposes credentials',async()=>{
 const h=await harness({activation:'disabled'});
 try {
  const r=await h.mf.dispatchFetch('https://test.invalid/auth-readiness');assert.equal(r.status,200);const body=await r.json();
  assert.equal(body.dispatches,0);assert.equal(body.temporaryTokenRevoked,true);assert.equal(body.hostedBindingVerified,false);assert.equal(body.workflowTokenVerified,false);assert.equal(body.workflowId,44);
  assert.equal(h.dispatchCount(),0);assert.equal((await h.send('receipt')).body,null);
  assert.deepEqual(h.calls.map(c=>[c.method,c.path]),[['GET','/app/installations/22'],['POST','/app/installations/22/access_tokens'],['GET','/installation/repositories'],['GET','/repos/fuzzysniper/scout-stonk-intel/actions/workflows/reward-snapshots.yml'],['DELETE','/installation/token']]);
  assert.equal('token' in body,false);assert.equal('jwt' in body,false);assert.doesNotMatch(JSON.stringify(body),/synthetic-opaque|PRIVATE KEY|nonce|Bearer/i);
 }finally{await h.close();}
});
test('auth-only proof fails closed on activation, workflow and permission drift without dispatch',async()=>{
 for(const options of [{activation:'human-approved'},{activation:'disabled',revokeResponse:new Response('sensitive-revoke-body',{status:500})},{activation:'disabled',workflowResponse:new Response('private-provider-body',{status:403})},{activation:'disabled',workflowResponse:Response.json({id:44,path:'.github/workflows/other.yml',state:'active'})}]){
  const h=await harness(options);
  try{const r=await h.mf.dispatchFetch('https://test.invalid/auth-readiness');assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'auth_readiness_unavailable'});assert.equal(h.dispatchCount(),0);assert.equal((await h.send('receipt')).body,null);if(options.activation==='human-approved')assert.equal(h.calls.length,0);}finally{await h.close();}
 }
});
test('actual Worker dispatch inputs interoperate with Python authenticated gate and confirmed Git CAS across all sources',async()=>{
 let payload;
 const h=await harness({dispatch:async(_n,_request,body)=>{payload=body;return Response.json({workflow_run_id:123456789});}});
 try {
  assert.equal((await h.send('tick')).body.action,'accepted');assert.equal(h.dispatchCount(),1);
  const {stdout}=await run('python3',['tests/scheduler-pilot-bridge.py',JSON.stringify(payload)],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},timeout:30000,maxBuffer:128*1024});
  const result=JSON.parse(stdout);assert.equal(result.liveRequests,0);assert.equal(result.results.length,4);
  for(const r of result.results){assert.equal(r.duplicateQueries,0);if(r.winner!=='uncertain'){assert.equal(r.confirmedBeforeQueries,true);assert.equal(r.dataCommitConfirmed,true);}else assert.equal(r.consumedAfterUncertainty,true);}
  assert.equal(result.results.find(r=>r.winner==='uncertain').sameSlotQueries,0);
  await h.send('tick');assert.equal(h.dispatchCount(),1);
 }finally{await h.close();}
});
