import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {review,sha} from './review.mjs';
const REVIEWER_SHA='1a2f434a811f50b4e0cf20e657ee2fc24c9218c9fcc668032b23c459f3ee2b7c';
test('exact reviewed corrective input union, unchanged original guards/data/UI/auth/STOP and modes',()=>{assert.equal(sha(fs.readFileSync('tests/native-union-284/review.mjs')),REVIEWER_SHA);review();});
test('passing control rejects implementation/UI/source/root/SQL/STOP/test/branch changes, symlink/mode and extra paths',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-union-guard-'));try{execFileSync('git',['worktree','add','--detach',dir,'HEAD'],{stdio:'ignore'});review(dir);
 for(const[f,kind]of [['lib/native-evidence/engine.ts','append'],['lib/native-pilot/index.ts','append'],['lib/native-pilot/auth.ts','append'],['lib/v4-oracle/holders/decode.ts','append'],['lib/v4-owner-preview/trust.ts','append'],['lib/native-lens/boundary.ts','append'],['lib/native-lens/policy.ts','append'],['app/lens/native-lens.tsx','append'],['app/lens/intelligence-desk.tsx','append'],['ops/v4-owner-auth/source-admission.sql','append'],['data/reward-snapshots.json','append'],['tests/native-lens/ab-integration.test.mjs','append'],['tests/native-lens/review.mjs','append'],['tests/native-union-284/inputs.json','append'],['tests/native-union-284/session.mjs','remove'],['vercel.json','append'],['app/lens/page.tsx','mode'],['app/api/native-pilot/route.ts','symlink'],['lib/native-pilot/UNREVIEWED','append']]){
  const p=path.join(dir,f),old=fs.existsSync(p)?fs.readFileSync(p):null,mode=old?fs.statSync(p).mode:0;
  try{fs.mkdirSync(path.dirname(p),{recursive:true});if(kind==='remove')fs.unlinkSync(p);else if(kind==='mode')fs.chmodSync(p,0o755);else if(kind==='symlink'){fs.unlinkSync(p);fs.symlinkSync('/dev/null',p);}else fs.writeFileSync(p,Buffer.concat([old??Buffer.alloc(0),Buffer.from('\nUNREVIEWED\n')]));assert.throws(()=>review(dir),e=>e instanceof Error,f);}
  finally{fs.rmSync(p,{force:true});if(old){fs.writeFileSync(p,old);fs.chmodSync(p,mode);}}
 }
 }finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}
});
