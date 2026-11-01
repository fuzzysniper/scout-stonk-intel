import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {execFileSync} from 'node:child_process';import {review,sha} from './review.mjs';
const REVIEWER_SHA='194f56aade0d13e2539403e5788b4e4ed8149d9d14e6c1c809c72ffbe83e1ec5';
test('actual union full HEAD and working tree preserve three exact independent parents and every reviewed source blob/mode',()=>{assert.equal(sha(fs.readFileSync('tests/oracle-union-274/review.mjs')),REVIEWER_SHA);const m=review();assert.equal(m.sources.length,3);assert.equal(m.sources[1].changes.length,10);assert.equal(m.sources[2].changes.length,3);assert.equal(Object.keys(m.added).length,7);});
test('passing control rejects source/auth/STOP/SQL/pins/collector/recovery/preparation/claims/TAKE/original guard changes, omissions, symlinks, modes and extra paths',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'oracle274-union-guard-'));
 try{execFileSync('git',['worktree','add','--detach',dir,'HEAD'],{stdio:'ignore'});review(dir);
  for(const[f,kind]of [
   ['lib/v4-ca-intelligence/private-development-gate.ts','append'],['lib/v4-oracle/mount/admission.ts','append'],['lib/v4-oracle/mount/bootstrap.ts','append'],['lib/v4-owner-preview/sql-pins.ts','append'],['ops/v4-owner-auth/source-admission.sql','append'],['lib/v4-owner-preview/view-contract.ts','append'],['data/reward-snapshots.json','append'],['ops/v4-journal/recovery.mjs','append'],['ops/v4-journal/recovery-v2.mjs','append'],['ops/v4-journal/recovery-v2-extraction.mjs','append'],['tests/oracle-integration-274/preflight.mjs','append'],['tests/oracle-integration-274/preflight.test.mjs','append'],['app/lens/claim-check.ts','append'],['app/lens/take-model.ts','append'],['app/lens/ca-view.tsx','append'],['app/lens/intelligence-desk.tsx','append'],['tests/oracle-ca-recovery-v2/scope.test.mjs','append'],['tests/oracle-claim-266/scope.test.mjs','append'],['tests/oracle-take-274/scope.test.mjs','append'],['tests/oracle-native-259/security.test.mjs','remove'],['app/lens/intelligence-model.ts','mode'],['ops/v4-journal/recovery-v2.d.mts','symlink'],['tests/oracle-union-274/UNREVIEWED','append'],['tests/oracle-union-274/replay.sh','append'],
  ]){const p=path.join(dir,f),present=fs.existsSync(p),before=present?fs.readFileSync(p):null,mode=present?fs.statSync(p).mode:0;
   try{if(kind==='remove')fs.unlinkSync(p);else if(kind==='mode')fs.chmodSync(p,0o755);else if(kind==='symlink'){fs.unlinkSync(p);fs.symlinkSync(path.resolve(f),p);}else fs.writeFileSync(p,Buffer.concat([before??Buffer.alloc(0),Buffer.from('\nUNREVIEWED\n')]));assert.throws(()=>review(dir),undefined,f);}
   finally{fs.rmSync(p,{force:true});if(present){fs.writeFileSync(p,before);fs.chmodSync(p,mode);}}
  }
 }finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}
});
test('read-only exact-head CI executes immutable original inputs plus actual union behavior without guard weakening or source activation',()=>{
 const s=fs.readFileSync('.github/workflows/oracle-union-274.yml','utf8');
 for(const v of ['contents: read','persist-credentials: false','ref: ${{ github.event.pull_request.head.sha }}','feat/274-the-take','integration/274-take-recovery-off','npm ci --ignore-scripts','replay.sh inputs','replay.sh reviews','replay.sh native-root','replay.sh history','tests/oracle-ca-recovery-v2/postgres.test.mjs','tests/oracle-claim-266/run.sh','tests/oracle-take-274/run.sh','npx tsc --noEmit','npm run lint','npm run build','artifact.mjs','archive-tool.sh check'])assert.ok(s.includes(v),v);
 assert.doesNotMatch(s,/secrets\.|workflow_dispatch|pull_request_target|continue-on-error|test\.skip|test\.only|--grep/);
});
