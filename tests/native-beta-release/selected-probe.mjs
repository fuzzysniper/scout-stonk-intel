// Actual exact-head optimized SELECTED build. In-memory GitHub/TLS transcript only;
// no genuine review/deployment/credential, database or provider request is claimed.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {synthetic,installSyntheticBindings,request,hash} from './fixture.mjs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),f=synthetic(),git=(...a)=>execFileSync('git',a).toString().trim();
const current=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');assert.equal(current,process.env.NATIVE_RC_TESTED_HEAD);Object.assign(f.plan,JSON.parse(fs.readFileSync('ops/native-beta-release/installation.json')).controlPlan);Object.assign(f.p,{commit:current,tree});Object.assign(f.identity,{commit:current,tree});
const workflow=fs.readFileSync('.github/workflows/native-pilot-admission.yml','utf8');f.setup.review.workflowSha256=f.source.review.workflowSha256=hash(workflow);const originalEvidence=f.evidence;f.evidence=(stage,record)=>{const e=originalEvidence(stage,record);e.workflow.content=Buffer.from(workflow).toString('base64');return e;};f.rehash();
const h=installSyntheticBindings(f);
try{
 const file=path.resolve('.next/server/app/api/native-pilot/route.js'),built=require(file),handlers=built.routeModule?.userland;assert.equal(typeof handlers?.POST,'function','ACTUAL optimized native API module required');
 const token=h.values.UNFARMD_NATIVE_GITHUB_READ_TOKEN;h.values.UNFARMD_NATIVE_GITHUB_READ_TOKEN=undefined;
 const absent=request(f);Object.defineProperty(absent,'body',{get(){throw Error('NO_BODY_WITHOUT_ADMISSION');}});
 const missing=await handlers.POST(absent);assert.equal(missing.status,503);assert.ok(h.credentialReads.every(k=>k==='UNFARMD_NATIVE_GITHUB_READ_TOKEN'));assert.equal(h.reads.length,0);
 h.values.UNFARMD_NATIVE_GITHUB_READ_TOKEN=token;
 const response=await handlers.POST(request(f));assert.equal(response.status,401);assert.deepEqual(await response.json(),{error:'owner_session_required'});assert.equal(h.reads.length,18);assert.ok(!h.credentialReads.includes('UNFARMD_NATIVE_HELIUS_KEY'));
 const off=await handlers.GET();assert.equal(off.status,503);assert.deepEqual(await off.json(),{error:'native_pilot_off'});
 const trace=JSON.parse(fs.readFileSync('.next/server/app/api/native-pilot/route.js.nft.json')).files;for(const key of ['UNFARMD_NATIVE_PG_CA','UNFARMD_NATIVE_AUTH_SECRET','UNFARMD_NATIVE_AUTH_READER_DSN','UNFARMD_NATIVE_PG_DSN','UNFARMD_NATIVE_CHECKPOINT_KEY'])assert.ok(h.credentialReads.includes(key),'SELECTED assembly resolved its exact admitted binding');assert.ok(!trace.some(x=>/@turnkey|native-mint\/producer|recovery-v2/.test(x)));
 console.log(JSON.stringify({kind:'SYNTHETIC_SELECTED_OPTIMIZED_RUNTIME',testedCommit:current,testedTree:tree,callerHead:process.env.NATIVE_RC_TESTED_HEAD,metadataReads:18,ownerDenialBeforeNativeSql:true,providerKeyReads:0,sourceCalls:false,hostedAcceptance:false}));
}finally{h.restore();}

// A source grant is still mandatory on the actual selected build; owner-only assembly is not one.
const denied=installSyntheticBindings(f,{breakSource:true});
try{const built=require(path.resolve('.next/server/app/api/native-pilot/route.js')),handlers=built.routeModule.userland;const r=await handlers.POST(request(f));assert.equal(r.status,503);assert.ok(denied.credentialReads.every(k=>k==='UNFARMD_NATIVE_GITHUB_READ_TOKEN'));assert.ok(!denied.credentialReads.includes('UNFARMD_NATIVE_HELIUS_KEY'));console.log(JSON.stringify({kind:'ACTUAL_SELECTED_NO_VALID_SOURCE_GRANT',commit:current,tree,metadataReads:denied.reads.length,nativeBindingReads:0,sourceCalls:false,hostedAcceptance:false}));}finally{denied.restore();}
