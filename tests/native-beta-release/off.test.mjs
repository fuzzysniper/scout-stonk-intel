import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=process.env.ADMISSION_BUILD;
test('new owner routes remain OFF before body, binding, credential, database and provider access',async()=>{
 const route=require(root+'/app/api/native-pilot/owner/[...all]/route.js'),before=process.env,reads=[];
 process.env=new Proxy({...before,NATIVE_RUNTIME_INSTALLED:'true',NATIVE_SETUP_RUNTIME_ENABLED:'true',UNFARMD_NATIVE_SOURCE_GO:'true'},{get(t,k){if(String(k).startsWith('UNFARMD_NATIVE_')){reads.push(k);throw Error('NO_CREDENTIAL_ACCESS');}return Reflect.get(t,k);}});
 try{for(const verb of ['GET','POST'])for(const path of ['status','sign-in/email','sign-out','sign-up/email']){const request=new Request('https://synthetic.invalid/api/native-pilot/owner/'+path,{method:verb,headers:{'x-unfarmd-owner-intent':'login'}});Object.defineProperty(request,'body',{get(){throw Error('NO_BODY_READ');}});const r=await route[verb](request);assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'native_pilot_off'});}assert.deepEqual(reads,[]);}finally{process.env=before;}
});
test('native issuer parser pins original restricted role/direct host/full verification/PLUS with no secret-bearing failures',()=>{
 const {nativeIssuerConfiguration}=require(root+'/lib/native-pilot/runtime/owner.js'),host='ep-tiny-truth-b4bx6xt9.c-6.us-east-2.aws.neon.tech',ca='-----BEGIN CERTIFICATE-----\nSYNTHETIC\n-----END CERTIFICATE-----';const dsn=`postgresql://unfarmd_v4_issuer_login:SYNTHETIC_PASSWORD@${host}/unfarmd_v4_pilot?sslmode=verify-full&channel_binding=require`;
 assert.equal(nativeIssuerConfiguration(dsn,ca).user,'unfarmd_v4_issuer_login');assert.equal(nativeIssuerConfiguration(dsn.replace('issuer_login','enroll_login'),ca,true).user,'unfarmd_v4_enroll_login');
 for(const s of [dsn.replace('issuer_login','auth_login'),dsn.replace('issuer_login','enroll_login'),dsn.replace(host,'evil.invalid'),dsn.replace('verify-full','require'),dsn.replace('channel_binding=require','channel_binding=prefer'),dsn+'&options=override',dsn.replace('/unfarmd_v4_pilot','/neondb')])assert.throws(()=>nativeIssuerConfiguration(s,ca),e=>e.message==='native_owner_unavailable'&&!e.message.includes('SYNTHETIC_PASSWORD'));
});
test('forged native owner and STOP caps cannot reach private DSNs or create legacy authority',async()=>{
 const {createNativeOwnerAccess}=require(root+'/lib/native-pilot/runtime/owner.js'),{openPostgresStopper}=require(root+'/lib/native-pilot/postgres/connection.js'),p=(await import('../native-pilot/fixtures.mjs')).policy();
 for(const cap of [{},{approved:true},{version:'native-pilot-setup/1'}]){
  assert.throws(()=>createNativeOwnerAccess({admission:cap,policy:p,get secret(){throw Error('NO_SECRET_READ');}}),e=>e.message==='native_pilot_held');
  assert.throws(()=>openPostgresStopper(p,{admission:cap,get dsn(){throw Error('NO_DSN_READ');}}),e=>e.message==='native_pilot_held');
 }
});
