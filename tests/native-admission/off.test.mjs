import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createPublicKey} from 'node:crypto';
import {fixture,load,require,canonical,setupCandidate} from './fixtures.mjs';
const installed=load('installed'),{loadApprovedNativeConfiguration}=load('configuration');
test('compiled setup/build pins absent: environment toggles and request bodies cannot read credentials or mint authority',async()=>{
 assert.equal(installed.NATIVE_ADMISSION_PLAN,null);assert.equal(installed.NATIVE_ADMISSION_BUILD,null);
 const old=process.env;let reads=0;process.env=new Proxy({...old,NATIVE_SETUP_RUNTIME_ENABLED:'true',NATIVE_ADMISSION_PLAN:'APPROVE'},{get(t,k){if(String(k).startsWith('UNFARMD_NATIVE_')){reads++;throw Error('SECRET_READ');}return Reflect.get(t,k);}});
 try{assert.equal(await installed.loadNativeAdmissions(false),null);assert.equal(await installed.loadNativeAdmissions(true),null);assert.equal(await loadApprovedNativeConfiguration(),null);assert.equal(reads,0);}finally{process.env=old;}
});
test('candidate/copy/deserialized manifests never become native setup/source capabilities; no legacy conversion',()=>{
 const f=fixture(),s=setupCandidate(canonical(f.setup),f.context,f.now),capCandidates=[s,{},JSON.parse(canonical(s)),{approved:true},f.evidence('setup',s)];
 const {openPostgresLedger}=require(process.env.ADMISSION_BUILD+'/lib/native-pilot/postgres/connection.js');
 for(const cap of capCandidates){assert.throws(()=>installed.nativeSetupRecord(cap,f.p));assert.equal(installed.nativeSourcePermitted(cap,cap,f.p),false);assert.throws(()=>openPostgresLedger(f.p,{admission:cap,get dsn(){throw Error('DSN_READ');}}),e=>e.message==='native_pilot_held');}
 const key=fs.readFileSync('lib/v4-owner-preview/trust.ts','utf8').match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/)[0];
 const old=require(process.env.ADMISSION_BUILD+'/lib/v4-owner-ledger/neon-durability.js');assert.equal(old.verifyNeonAdmission(s,createPublicKey(key)),null);assert.equal(old.verifyNeonAdmission({payload:canonical(s),signature:'SYNTHETIC_NOT_A_SIGNATURE'},createPublicKey(key)),null);
});
test('source factory and setup-only STOP remain HARD-OFF before config getters; original native GET remains off',async()=>{
 const b=require(process.env.ADMISSION_BUILD+'/lib/native-pilot/index.js'),config=new Proxy({},{get(){throw Error('CONFIG_READ');}});assert.equal((await b.createNativePilot(config).inspect(new Request('https://example.invalid'))).status,'held');assert.equal((await b.createNativeStopper(config).stop(new Request('https://example.invalid'))).status,'held');
 const route=require(process.env.ADMISSION_BUILD+'/app/api/native-pilot/route.js');for(const method of ['GET','POST']){const r=await route[method](new Request('https://example.invalid/api/native-pilot',{method,headers:{'x-unfarmd-native-intent':'stop'}}));assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'native_pilot_off'});}
});
test('new physical proof cannot be replaced with a caller Boolean/hash, missing/false/custom GUC shape denies',()=>{const {checkPhysicalProof}=require(process.env.ADMISSION_BUILD+'/lib/native-pilot/postgres/connection.js');for(const x of [null,{},true,{physical_ok:false},{hash:'a'.repeat(64)}])assert.throws(()=>checkPhysicalProof(x));checkPhysicalProof({physical_ok:true});});
