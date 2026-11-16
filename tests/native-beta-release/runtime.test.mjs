// SYNTHETIC configured-code regressions. Honest unit evidence, NOT hosted/live acceptance.
import test from 'node:test';import assert from 'node:assert/strict';
import {synthetic,installSyntheticBindings,load,require,request,hash} from './fixture.mjs';
test('SYNTHETIC actual selected runtime emits opaque setup/source caps after18 fixed reads; copy/expiry/rollback deny',async()=>{
 const f=synthetic(),h=installSyntheticBindings(f),clock=Date.now;
 try{const x=load('installed'),caps=await x.loadNativeAdmissions(true);assert.ok(caps?.setup&&caps.source);assert.equal(h.reads.length,18);const p=x.approvedNativePolicy(caps.setup);assert.equal(x.nativeSourcePermitted(caps.source,caps.setup,p),true);assert.throws(()=>x.nativeSetupRecord({...caps.setup},p));assert.equal(x.nativeSourcePermitted({...caps.source},caps.setup,p),false);
  Date.now=()=>f.now+31000;assert.equal(x.nativeSourcePermitted(caps.source,caps.setup,p),false);assert.ok(x.nativeSetupRecord(caps.setup,p));Date.now=()=>f.now-1;assert.throws(()=>x.nativeSetupRecord(caps.setup,p));
 }finally{Date.now=clock;h.restore();}
});
for(const which of ['source','stop','owner'])test('SYNTHETIC actual configuration loader '+which+' has bounded role separation, lazy provider key, no connection',async()=>{
 const f=synthetic(),h=installSyntheticBindings(f);let config;
 try{const loader=load('configuration');if(which==='owner'){
   config=await loader.loadApprovedNativeOwnerAccess();assert.ok(config);assert.deepEqual(Object.keys(config).sort(),['close','handler']);assert.equal(h.reads.length,9);for(const key of ['UNFARMD_NATIVE_PG_DSN','UNFARMD_NATIVE_STOPPER_DSN','UNFARMD_NATIVE_AUTH_READER_DSN','UNFARMD_NATIVE_CHECKPOINT_KEY','UNFARMD_NATIVE_HELIUS_KEY'])assert.ok(!h.credentialReads.includes(key));
  }else{config=await loader.loadApprovedNativeConfiguration(which==='source');assert.ok(config);assert.equal(h.reads.length,which==='source'?18:9);assert.equal(config.issuerPool.options.user,'unfarmd_v4_auth_login');assert.equal(config.issuerPool.options.max,1);assert.equal(config.store.custody.policyHash,hash(JSON.stringify(config.policy)));assert.equal(config.sourceAdmission!==null,which==='source');assert.ok(config.store.dsn.includes(which==='source'?'unfarmd_native_login':'unfarmd_native_stopper_login'));assert.ok(!h.credentialReads.includes('UNFARMD_NATIVE_HELIUS_KEY'));assert.ok(!h.credentialReads.includes(which==='source'?'UNFARMD_NATIVE_STOPPER_DSN':'UNFARMD_NATIVE_PG_DSN'));
   if(which==='source'){const {createIntegratedNativePilot}=require(process.env.ADMISSION_BUILD+'/lib/native-lens/boundary.js');assert.equal(typeof createIntegratedNativePilot(config).inspect,'function');}
  }
 }finally{await config?.issuerPool?.end();await config?.close?.();h.restore();}
});
test('SYNTHETIC wrong source review gives no configuration/native credential access; setup-only STOP still resolves',async()=>{
 const f=synthetic(),h=installSyntheticBindings(f,{breakSource:true});let stop;
 try{const loader=load('configuration');assert.equal(await loader.loadApprovedNativeConfiguration(true),null);assert.ok(h.credentialReads.every(x=>x==='UNFARMD_NATIVE_GITHUB_READ_TOKEN'));stop=await loader.loadApprovedNativeConfiguration(false);assert.ok(stop);assert.equal(stop.sourceAdmission,null);}finally{await stop?.issuerPool?.end();h.restore();}
});
test('SYNTHETIC selected HTTP route denies missing owner before native ledger/bootstrap/key or STOP',async()=>{
 const f=synthetic(),h=installSyntheticBindings(f);
 try{const route=require(process.env.ADMISSION_BUILD+'/app/api/native-pilot/route.js'),r=await route.POST(request(f));assert.equal(r.status,401);assert.deepEqual(await r.json(),{error:'owner_session_required'});assert.equal(h.reads.length,18);assert.ok(!h.credentialReads.includes('UNFARMD_NATIVE_HELIUS_KEY'));}finally{h.restore();}
});
for(const change of ['origin','host','intent','legacy','branch','deployment','commit','project','GET','body-token'])test('SYNTHETIC early '+change+' denial precedes metadata/secret/body/SQL',async()=>{
 const f=synthetic(),h=installSyntheticBindings(f);
 try{let req=request(f);if(change==='origin')req=request(f,'inspect',{origin:'https://evil.invalid'});if(change==='host')req=request(f,'inspect',{'x-forwarded-host':'evil.invalid'});if(change==='intent')req=request(f,'activate');if(change==='legacy')req=request(f,'inspect',{authorization:'SYNTHETIC_OLD_SIGNED_LANE'});if(change==='GET')req=new Request(f.p.origin+'/api/native-pilot');
  const keys={branch:'VERCEL_GIT_COMMIT_REF',deployment:'VERCEL_DEPLOYMENT_ID',commit:'VERCEL_GIT_COMMIT_SHA',project:'VERCEL_PROJECT_ID'};if(keys[change])h.values[keys[change]]='wrong';if(change==='body-token')req=new Request(f.p.origin+'/api/native-pilot?token=SYNTHETIC',{method:'POST',headers:Object.fromEntries(req.headers),body:'NOT_AUTHORITY'});
  Object.defineProperty(req,'body',{get(){throw Error('NO_BODY_READ');}});const {nativeRequestAllowed}=require(process.env.ADMISSION_BUILD+'/lib/native-pilot/runtime/request.js');assert.equal(nativeRequestAllowed(req),false);assert.equal(h.reads.length,0);assert.deepEqual(h.credentialReads,[]);
 }finally{h.restore();}
});
