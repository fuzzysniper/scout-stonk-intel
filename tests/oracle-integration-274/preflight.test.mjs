import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {reviewPreparation,PAIR} from './preflight.mjs';

test('actual exact-parent pair preserves every source tree byte but cannot pass without next C head',()=>{
 const r=reviewPreparation();assert.equal(r.status,'HOLD_AWAITING_TAKE_HEAD');
 assert.equal(r.activate,false);assert.equal(r.take,null);
 assert.equal(r.changedPaths.recovery.length,10);assert.equal(r.changedPaths.claims.length,23);
});
test('CLI fails closed with exit 2 for missing next C input, never reports completed union acceptance',()=>{
 const r=execFileSync(process.execPath,['--input-type=module','-e',"import {spawnSync} from 'node:child_process';const r=spawnSync(process.execPath,['tests/oracle-integration-274/preflight.mjs'],{encoding:'utf8'});process.stdout.write(JSON.stringify({status:r.status,stdout:r.stdout}));"],{encoding:'utf8'});
 const x=JSON.parse(r);assert.equal(x.status,2);assert.equal(JSON.parse(x.stdout).status,'HOLD_AWAITING_TAKE_HEAD');assert.equal(JSON.parse(x.stdout).activate,false);
});
test('negative controls reject source, auth, STOP, collector, recovery, UI, guard, mode, symlink, omission and extra-path changes',()=>{
 const root=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'oracle274-guard-'));
 try{
  execFileSync('git',['worktree','add','--detach',dir,PAIR],{stdio:'ignore'});
  for(const f of reviewPreparation().changedPaths.preparation){fs.mkdirSync(path.dirname(path.join(dir,f)),{recursive:true});fs.copyFileSync(path.join(root,f),path.join(dir,f));}
  reviewPreparation(dir);
  for(const [f,kind]of [
   ['lib/v4-ca-intelligence/private-development-gate.ts','append'],
   ['lib/v4-owner-preview/sql-pins.ts','append'],
   ['lib/v4-oracle/mount/admission.ts','append'],
   ['lib/v4-oracle/mount/bootstrap.ts','append'],
   ['ops/v4-owner-auth/source-admission.sql','append'],
   ['ops/v4-journal/recovery.mjs','append'],
   ['ops/v4-journal/recovery-v2.mjs','append'],
   ['ops/v4-journal/recovery-v2-extraction.mjs','append'],
   ['data/reward-snapshots.json','append'],
   ['app/lens/intelligence-desk.tsx','append'],
   ['app/lens/claim-check.ts','append'],
   ['tests/oracle-claim-266/scope.test.mjs','append'],
   ['tests/oracle-ca-recovery-v2/scope.test.mjs','append'],
   ['tests/oracle-native-259/security.test.mjs','remove'],
   ['app/lens/intelligence-model.ts','mode'],
   ['ops/v4-journal/recovery-v2.d.mts','symlink'],
   ['tests/oracle-integration-274/UNREVIEWED','append'],
  ]){
   const p=path.join(dir,f),present=fs.existsSync(p),before=present?fs.readFileSync(p):null,mode=present?fs.statSync(p).mode:0;
   try{
    if(kind==='remove')fs.unlinkSync(p);
    else if(kind==='mode')fs.chmodSync(p,0o755);
    else if(kind==='symlink'){fs.unlinkSync(p);fs.symlinkSync(path.join(root,f),p);}
    else fs.writeFileSync(p,Buffer.concat([before??Buffer.alloc(0),Buffer.from('\nUNREVIEWED\n')]));
    assert.throws(()=>reviewPreparation(dir),undefined,f);
   }finally{fs.rmSync(p,{force:true});if(present){fs.writeFileSync(p,before);fs.chmodSync(p,mode);}}
  }
 }finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}
});
