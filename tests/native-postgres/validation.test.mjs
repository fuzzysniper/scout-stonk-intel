import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {review,INPUT} from './validation-review.mjs';
test('finite owner-approved test-only successor freezes runtime/source/trust/reviewers and admits only reproduced installer correction',()=>review());
test('unreviewed runtime/installer/auth/source/guard/harness changes or extra files fail closed',()=>{
 const m=review(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-validation-review-'));
 try{execFileSync('git',['worktree','add','--detach',dir,INPUT],{stdio:'ignore'});for(const f of Object.keys(m.files)){const p=path.join(dir,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(f,p);fs.chmodSync(p,fs.statSync(f).mode);}review(dir);
 for(const f of ['lib/native-pilot/postgres/schema.sql','lib/native-pilot/postgres/connection.ts','lib/native-pilot/postgres/protocol.ts','lib/native-pilot/index.ts','lib/native-pilot/auth.ts','lib/native-evidence/contract.ts','tests/native-postgres/review.mjs','tests/native-postgres/pg18-fixture.mjs','tests/native-postgres/pg18-approval.mjs','.github/workflows/native-postgres.yml','ops/v4-journal/native-tls.mjs','data/reward-snapshots.json']){const p=path.join(dir,f),b=fs.readFileSync(p);try{fs.appendFileSync(p,'\nUNREVIEWED\n');assert.throws(()=>review(dir),Error,f);}finally{fs.writeFileSync(p,b);}}
 const p=path.join(dir,'UNREVIEWED');fs.writeFileSync(p,'EXTRA');assert.throws(()=>review(dir));
 }finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}
});
