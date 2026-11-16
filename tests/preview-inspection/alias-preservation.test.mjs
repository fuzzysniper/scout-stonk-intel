// Current finite delta plus unchanged prior guards at the immutable installed head.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
import {Lexer,Parser,Evaluator,data} from '@actions/expressions';
const prior='c4cecb3ae8370713d78d08ff308a65632c7719d3';
test('all installed inspection/source/CI preservation assertions execute unchanged at exact prior input',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-alias-prior-'));
 try{
  execFileSync('git',['worktree','add','--quiet','--detach',dir,prior]);fs.symlinkSync(path.resolve('node_modules'),dir+'/node_modules');fs.symlinkSync(path.resolve('ops/native-beta-output/toolchain/node_modules'),dir+'/ops/native-beta-output/toolchain/node_modules');
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const files=['ci-prerequisites','clock-probe','inspection','mobile-card','owner-approval-v2','scope','security-union','workflow'].map(n=>'tests/preview-inspection/'+n+'.test.mjs');
  const log=execFileSync(process.execPath,['--test','--test-reporter=tap',...files,'tests/preview-preflight-diagnostics/contracts.test.mjs'],{cwd:dir,env,timeout:180000,maxBuffer:4*1024*1024}).toString();
  assert.match(log,/# fail 0\b/);assert.match(log,/# skipped 0\b/);assert.match(log,/# tests 63\b/); // original test count, checked against actual execution
 }finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}
});
test('unchanged auth/approval/publication/source/locks and finite named-branch CI only',()=>{
 for(const file of ['ops/native-beta-output/verify.mjs','ops/native-beta-output/step.mjs','ops/native-beta-output/policy.json','ops/native-beta-output/toolchain/package.json','ops/native-beta-output/toolchain/package-lock.json','ops/native-beta-output/toolchain-security.mjs','.github/workflows/native-pilot-admission.yml','ops/native-pilot-admission/publisher.mjs'])assert.deepEqual(fs.readFileSync(file),execFileSync('git',['show',prior+':'+file]),file);
 const convert=x=>typeof x==='string'?new data.StringData(x):new data.Dictionary(...Object.entries(x).map(([key,value])=>({key,value:convert(value)})));
 for(const file of ['native-beta-release.yml','preview-preflight-diagnostics.yml','uploader-toolchain-security.yml']){
  const text=fs.readFileSync('.github/workflows/'+file,'utf8');assert.doesNotMatch(text,/secrets\.|environment:|workflow_dispatch|continue-on-error/);
  for(const m of text.matchAll(/^    if: (.+)$/gm)){
   const expr=new Parser(new Lexer(m[1]).lex().tokens,['github'],[]).parse();
   for(const branch of ['fix/preview-alias-completeness','UNKNOWN']){const ctx=convert({github:{head_ref:branch,repository:'fuzzysniper/scout-stonk-intel',event:{pull_request:{head:{repo:{full_name:'fuzzysniper/scout-stonk-intel'}}}}}});assert.equal(new Evaluator(expr,ctx).evaluate().coerceString(),branch==='UNKNOWN'?'false':'true');}
  }
 }
});
