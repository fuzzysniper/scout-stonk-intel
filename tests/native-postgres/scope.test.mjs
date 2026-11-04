import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {BASE,review} from './review.mjs';
test('finite B storage-only successor preserves exact284 tree, A/C, old SQL/source/auth/STOP and every guard',()=>review());
test('finite reviewed allowance rejects schema/driver/checkpoint/gate tampering, old guards/UI, modes and unreviewed files',()=>{
 const m=review(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-remote-guard-'));
 try{execFileSync('git',['worktree','add','--detach',dir,BASE],{stdio:'ignore'});for(const f of [...Object.keys(m.modified),...Object.keys(m.added)]){const p=path.join(dir,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(f,p);fs.chmodSync(p,fs.statSync(f).mode);}review(dir);
 for(const f of ['lib/native-pilot/postgres/schema.sql','lib/native-pilot/postgres/connection.ts','lib/native-pilot/postgres/checkpoint.ts','tests/native-postgres/pg18-approval.mjs','lib/native-pilot/engine.ts','lib/native-pilot/auth.ts','lib/native-pilot/ledger.ts','lib/native-evidence/contract.ts','lib/v4-owner-preview/trust.ts','ops/v4-owner-auth/source-admission.sql','app/api/native-pilot/route.ts','.github/workflows/native-postgres.yml','data/reward-snapshots.json']){const p=path.join(dir,f),old=fs.readFileSync(p);try{fs.appendFileSync(p,'\nUNREVIEWED\n');assert.throws(()=>review(dir),Error,f);}finally{fs.writeFileSync(p,old);}}
 const extra=path.join(dir,'lib/native-pilot/postgres/UNREVIEWED');fs.writeFileSync(extra,'EXTRA');assert.throws(()=>review(dir));fs.unlinkSync(extra);
 }finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}
});
