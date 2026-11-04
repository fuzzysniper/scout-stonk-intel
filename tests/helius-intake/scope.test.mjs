import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {review} from './review.mjs';
test('all original284 decoders/provenance/shared types/B/C/source/SQL/security/collector bytes and modes frozen except exact A hook/export/suppression',()=>review());
test('negative controls reject decoder/host/parser/contract/SQL/auth/C/mode/extra-file or qualifier drift',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'helius-intake-scope-')),root=process.cwd(),git=(...a)=>execFileSync('git',a,{cwd:root,stdio:'pipe'});
 try{
  git('worktree','add','--detach',dir,'HEAD');const m=review();
  for(const f of [...Object.keys(m.modified),...Object.keys(m.added)]){fs.mkdirSync(path.dirname(path.join(dir,f)),{recursive:true});fs.copyFileSync(f,path.join(dir,f));}
  review(dir);
  for(const f of ['lib/v4-oracle/holders/decode.ts','lib/v4-oracle/holders/accounts.ts','lib/v4-oracle/onchain/bytes.ts','lib/native-evidence/contract.ts','lib/native-evidence/holder.ts','lib/native-pilot/engine.ts','lib/native-pilot/ledger.ts','lib/native-pilot/auth.ts','app/api/native-pilot/route.ts','app/lens/native-evidence-model.ts','ops/v4-owner-auth/source-admission.sql','lib/native-evidence/helius-qualification.ts','lib/native-evidence/engine.ts']){
   const p=path.join(dir,f),b=fs.readFileSync(p);try{fs.appendFileSync(p,'\n// mutation control\n');assert.throws(()=>review(dir),f);}finally{fs.writeFileSync(p,b);}
  }
  const p=path.join(dir,'lib/native-evidence/helius-qualification.ts');fs.chmodSync(p,0o755);assert.throws(()=>review(dir));fs.chmodSync(p,0o644);
  const extra=path.join(dir,'lib/native-evidence/unreviewed.ts');fs.writeFileSync(extra,'export const bad=true;');assert.throws(()=>review(dir));fs.unlinkSync(extra);review(dir);
 }finally{try{git('worktree','remove','--force',dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
});
