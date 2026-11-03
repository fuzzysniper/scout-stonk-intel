// LOCAL/SYNTHETIC compatibility tests, actual A + actual B + actual C adapter.
// Invented raw account bytes, simulated owner/identity/wire, actual fsync ledger.
// No TLS/owner/provider/live positive acceptance is claimed or substituted.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
import {setup,policy,ports,request,fixture,MINT} from '../native-pilot/fixtures.mjs';
const require=createRequire(import.meta.url),root=process.env.NATIVE_LENS_BUILD;
const api=require(root+'/lib/native-evidence/index.js'),bridge=require(root+'/lib/native-lens/boundary.js'),b=require(root+'/lib/native-pilot/index.js'),{acquire}=require(root+'/lib/native-pilot/engine.js'),{openLedger}=require(root+'/lib/native-pilot/ledger.js'),model=require(root+'/app/lens/native-evidence-model.js');
function rawFixture(){const f=fixture(20);return {kind:f.kind,mint:f.mint,evaluatedAt:f.evaluatedAt,rightsReviewSha256:f.rights.reviewSha256,selection:f.selection,snapshot:f.snapshot,clock:f.clock};}
test('exact A/B public contract is byte-identical; public-RPC synthetic positive exercises actual qualification -> analytics -> C',()=>{
 assert.equal(fs.readFileSync('lib/native-pilot/evidence-contract.ts','utf8'),fs.readFileSync('lib/native-evidence/contract.ts','utf8'));
 const raw=rawFixture(),before=raw.selection.endpointHost,input=bridge.nativeIntake(raw);assert.ok(input,'positive qualification is required, not an earlier unrelated denial');
 const evidence=api.analyzeNativeEvidence(input);assert.equal(evidence.state,'candidate');assert.ok(evidence.controls);assert.equal(evidence.concentration.state,'candidate');assert.equal(evidence.origin.label,'SYNTHETIC OFFLINE');assert.equal(evidence.origin.providerAuthenticated,false);assert.equal(raw.selection.endpointHost,before);assert.equal(model.isNativeEvidence(evidence,MINT),true);assert.equal(model.nativeCandidateView(evidence).riskFindings.length,24);
});
test('actual A rejects an honestly Helius-named synthetic batch; no host substitution or fourth read',()=>{
 const raw=rawFixture();for(const c of [raw.selection,raw.snapshot,raw.clock])c.endpointHost='mainnet.helius-rpc.com';assert.equal(bridge.nativeIntake(raw),null);assert.ok([raw.selection,raw.snapshot,raw.clock].every(c=>c.endpointHost==='mainnet.helius-rpc.com'));
});
test('actual B three-read state machine -> actual A intake is HOLD; all3 attempts spent, durable STOP survives reopen, no fake positive',async()=>{
 const p=policy(),f=await setup(p);try{const wire=ports(f,p);let intakes=0,analyses=0,observedHosts=[];
 const result=await acquire(p,request(p),{...wire,clock:()=>wire.now,intake:raw=>{intakes++;observedHosts=[raw.selection,raw.snapshot,raw.clock].map(x=>x.endpointHost);return bridge.nativeIntake(raw);},analyze:input=>{analyses++;return api.analyzeNativeEvidence(input);}});
 assert.deepEqual(result,{status:'held',activate:false,providerAuthenticated:false});assert.equal(wire.calls,3);assert.equal(intakes,1,'actual intake reached after all recipe/budget gates');assert.equal(analyses,0,'rejected bytes cannot reach positive analytics');assert.deepEqual(observedHosts,Array(3).fill('mainnet.helius-rpc.com'));
 const state=await openLedger(f.options).inspect();assert.equal(state.attempts,3);assert.equal(state.completed,3);assert.equal(state.credits,3);assert.equal(state.stopped,true);assert.equal(state.lease,null);
 const before=wire.calls;await acquire(p,request(p),{...wire,clock:()=>wire.now,intake:bridge.nativeIntake,analyze:api.analyzeNativeEvidence});assert.equal(wire.calls,before,'no retry/refund after compatibility failure');
 }finally{await f.cleanup();}
});
test('real B constructor and C assembly remain OFF before any configuration/key/DB read; STOP is not ACK',async()=>{
 let reads=0;const config=new Proxy({},{get(){reads++;throw Error('NO_CONFIGURATION_ACCESS');}}),pilot=bridge.createIntegratedNativePilot(config),req=request();
 assert.equal((await pilot.inspect(req)).status,'held');assert.equal((await pilot.stop(req)).status,'held');assert.equal(reads,0);assert.equal(b.NATIVE_PILOT_ENABLED,false);assert.equal(b.NATIVE_PILOT_BUILD,null);
 const stop=new Request(new URL(req.url),{method:'POST',headers:{'x-unfarmd-native-intent':'stop'}});const response=await bridge.nativePilotResponse(stop,config);assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'native_pilot_held'});assert.equal(reads,0);
 assert.equal((await bridge.nativePilotResponse(req)).status,503);
});
test('actual B origin verifier refuses actual A candidate, JSON, caller booleans and stale copies',async()=>{
 const candidate=api.analyzeNativeEvidence(bridge.nativeIntake(rawFixture()));for(const v of [candidate,JSON.parse(JSON.stringify(candidate)),{},null,{status:'observation',providerAuthenticated:true,expiresAt:Date.now()+60000}])assert.equal(await b.verifiedNativeObservation(v),null);
});
