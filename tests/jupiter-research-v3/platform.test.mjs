// LOCAL/SYNTHETIC platform variables; real Git-derived build proof controls.
import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {researchReview} from '../../lib/v4-ca-intelligence/jupiter-research-review.mjs';
import {researchBuildProof} from '../../next.config.mjs';import {identity,scopedEnv,env,fixture,MINTS} from './fixtures.mjs';
const require=createRequire(import.meta.url),{researchPlatformIdentity}=require(process.env.RESEARCH_BUILD+'/lib/v4-ca-intelligence/jupiter-research-platform.js');
test('only platform-supplied identity matching injected commit-bound tree succeeds, never a request/configured target',()=>scopedEnv({},()=>{
 const original=globalThis.__UNFARMD_RESEARCH_BUILD__;try{delete globalThis.__UNFARMD_RESEARCH_BUILD__;assert.equal(researchPlatformIdentity(),null);globalThis.__UNFARMD_RESEARCH_BUILD__={commit:identity().commit,tree:identity().tree};assert.deepEqual(researchPlatformIdentity(),identity());
 for(const patch of [{VERCEL_GIT_COMMIT_SHA:'c'.repeat(40)},{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'prj_OTHER'},{VERCEL_GIT_COMMIT_REF:'beta/276-jupiter-founder-only'},{VERCEL_GIT_PROVIDER:'gitlab'},{VERCEL_GIT_REPO_OWNER:'other'},{VERCEL_GIT_REPO_SLUG:'other'},{VERCEL_DEPLOYMENT_ID:''},{VERCEL_URL:'scout-stonk-intel-git-branch-riskledgerapp.vercel.app'},{VERCEL_URL:env().VERCEL_URL+':443'},{UNFARMD_OWNER_RELEASE:'SYNTHETIC_OLD_GLOBAL_RELEASE'}]){const old=process.env;process.env={...old,...patch};try{assert.equal(researchPlatformIdentity(),null);}finally{process.env=old;}}
 for(const proof of [null,{commit:'c'.repeat(40),tree:identity().tree},{commit:identity().commit,tree:'0'.repeat(40)}]){globalThis.__UNFARMD_RESEARCH_BUILD__=proof;assert.equal(researchPlatformIdentity(),null);}
 }finally{if(original===undefined)delete globalThis.__UNFARMD_RESEARCH_BUILD__;else globalThis.__UNFARMD_RESEARCH_BUILD__=original;}
}));
test('build proof derives full commit/tree from an actual clean Git checkout and refuses dirty/untracked/missing metadata',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'research-build-proof-'));const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 try{assert.equal(researchBuildProof(dir),null);git('init');git('config','user.email','synthetic@example.invalid');git('config','user.name','LOCAL SYNTHETIC');fs.writeFileSync(path.join(dir,'input'),'PUBLIC TEST');git('add','input');git('commit','-m','LOCAL SYNTHETIC build control');assert.deepEqual(researchBuildProof(dir),{commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}')});fs.appendFileSync(path.join(dir,'input'),'dirty');assert.equal(researchBuildProof(dir),null);git('restore','input');fs.writeFileSync(path.join(dir,'UNREVIEWED'),'TEST');assert.equal(researchBuildProof(dir),null);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('actual platform getter is rechecked across the synthetic reserve await; a MAC cannot attest deployment drift',()=>scopedEnv({},async()=>{
 globalThis.__UNFARMD_RESEARCH_BUILD__={commit:identity().commit,tree:identity().tree};const f=fixture();let calls=0;const original=process.env.VERCEL_DEPLOYMENT_ID;
 try{const b=researchReview({publicTrust:f.t,nativeIdentity:researchPlatformIdentity,clock:()=>f.now,consumerAuth:{stamp:()=>({role:'LOCAL_TEST_ONLY'})},authority:async()=>{calls++;process.env.VERCEL_DEPLOYMENT_ID='dpl_DRIFTEDAFTERAWAIT';return {status:'reservation_source_off',stopped:false,activate:false,sourceCalls:false,receipt:{seq:'1',head:'a'.repeat(64)}};}});assert.equal(b.inspect(f.text,MINTS[0]).status,'verified_source_off_contract');assert.equal((await b.reserve(f.text,MINTS[0])).status,'held');assert.equal(calls,1);}finally{process.env.VERCEL_DEPLOYMENT_ID=original;delete globalThis.__UNFARMD_RESEARCH_BUILD__;}
}));
