import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {review} from './review.mjs';
test('every original281 byte/mode frozen; only finite A paths and exact suppression; shared contract unchanged',()=>review());
test('independent negative controls reject source, B/C, SQL, analytics, mode and added-file drift',()=>{
 const root=process.cwd(),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'native-scope-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
 try{
  git('worktree','add','--detach',scratch,'HEAD');
  const m=review();for(const f of ['vercel.json',...Object.keys(m.added)]){const dest=path.join(scratch,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}
  review(scratch);
  for(const f of ['app/api/v4/ca-intelligence/route.ts','lib/v4-owner-preview/source-policy.ts','ops/v4-owner-auth/source-admission.sql','lib/v4-oracle/holders/decode.ts','lib/native-evidence/engine.ts','lib/native-evidence/contract.ts']){
   const p=path.join(scratch,f),b=fs.readFileSync(p);try{fs.appendFileSync(p,'\n// negative control\n');assert.throws(()=>review(scratch),f);}finally{fs.writeFileSync(p,b);}
  }
  const f=path.join(scratch,'lib/native-evidence/engine.ts');fs.chmodSync(f,0o755);assert.throws(()=>review(scratch));fs.chmodSync(f,0o644);
  const p=path.join(scratch,'lib/native-evidence/extra.ts');fs.writeFileSync(p,'export const unauthorized=true;');assert.throws(()=>review(scratch));fs.unlinkSync(p);review(scratch);
 }finally{try{git('worktree','remove','--force',scratch);}finally{fs.rmSync(scratch,{recursive:true,force:true});}}
});
