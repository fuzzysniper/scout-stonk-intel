import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {BASE,hash,review} from './review.mjs';import {legacyToolModules} from './legacy-tools.mjs';
const REVIEWER='845e075b11901b74d31a0d661af0b9bc48ec6a77d8732076b12e4bea4d2dda64',MANIFEST='cf548379c6f33f2d8db2979ea3ee895a41ce2cc8c4f13a6be3b2277c2792e871';
test('exact finite descendant freezes app/lib/API, SQL, collector, credentials, policies, locks, owner key, publisher and original reviewers',()=>{assert.equal(hash(fs.readFileSync('tests/preview-inspection/review.mjs')),REVIEWER);assert.equal(hash(fs.readFileSync('tests/preview-inspection/review.json')),MANIFEST);review();});
test('the original recovered correction and its immutable baseline guards execute unchanged, not skipped or relaxed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'inspection-original-'));
 try{
  execFileSync('git',['worktree','add','--quiet','--detach',root,BASE]);fs.symlinkSync(path.resolve('node_modules'),root+'/node_modules');fs.symlinkSync(legacyToolModules(),root+'/ops/native-beta-output/toolchain/node_modules');
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const log=execFileSync(process.execPath,['--test','--test-reporter=tap','tests/preview-preflight-diagnostics/contracts.test.mjs','tests/preview-preflight-diagnostics/transport.test.mjs','tests/preview-preflight-diagnostics/tar-reachability.test.mjs','tests/preview-preflight-diagnostics/scope.test.mjs','tests/native-beta-output/output.test.mjs','tests/native-beta-output/verify.test.mjs','tests/native-beta-output/upload.test.mjs','tests/native-beta-output/workflow.test.mjs'],{cwd:root,env,timeout:180000,maxBuffer:4*1024*1024}).toString();
  assert.match(log,/# tests 32\b/);assert.match(log,/# pass 32\b/);assert.match(log,/# fail 0\b/);assert.match(log,/# skipped 0\b/);
 }finally{execFileSync('git',['worktree','remove','--force',root],{stdio:'ignore'});}
});
test('review rejects runtime, STOP, SQL, publisher, lock, policy, environment and out-of-scope changes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'inspection-tamper-'));
 try{
  execFileSync('git',['clone','--quiet','--shared','--no-checkout',process.cwd(),root]);execFileSync('git',['checkout','--quiet','--detach','HEAD'],{cwd:root});review(root);
  for(const p of ['lib/native-pilot/auth.ts','lib/native-pilot/engine.ts','lib/native-pilot/postgres/schema.sql','ops/native-pilot-admission/publisher.mjs','ops/native-beta-output/upload.mjs','ops/native-beta-output/policy.json','ops/native-beta-output/toolchain/package-lock.json','.github/workflows/native-pilot-admission.yml','vercel.json']){
   const file=path.join(root,p),bytes=fs.readFileSync(file);fs.appendFileSync(file,'\nSYNTHETIC_UNAPPROVED');assert.throws(()=>review(root,false),p);fs.writeFileSync(file,bytes);
  }
  fs.writeFileSync(path.join(root,'UNAPPROVED'),'SYNTHETIC');assert.throws(()=>review(root,false));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
