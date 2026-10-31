// Finite #258 composition. Original A/B/C reviewers and workflow stay byte-exact.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
const PARENT='9d0cb2d9f3130ae95a175161e38ce155e05de22d';
const GATE='lib/v4-ca-intelligence/private-development-gate.ts';
const SELF='tests/oracle-preview-258/review.test.mjs';
const FINITE={
 '.github/workflows/oracle-preview-258.yml':'693af00d87aa63ffef216afaf25a0c31fa94a71e3dde66fde2e757fcb1d3c171',
 'tests/oracle-preview-258/run.sh':'ab6a2ce145519418f113d58d71d839214628da57ec4fd55d311a03afc6d66014',
 'tests/oracle-preview-258/gate.test.mjs':'5a5056c80f3caa95c66a0ab72f62ac978ec0ec5a1ff21493a16d547ebf173938'
};
const sha=b=>createHash('sha256').update(b).digest('hex');
function review(root=process.cwd()){
 const raw=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024}),git=(...args)=>raw(...args).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 assert.equal(git('merge-base','--is-ancestor',PARENT,'HEAD'),'');
 const changed=[...new Set([...git('diff','--name-only','--no-renames',PARENT).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();
 assert.deepEqual(changed,[GATE,SELF,...Object.keys(FINITE)].sort(),'exact five finite paths, no prefix waiver');
 const before=raw('show',PARENT+':'+GATE).toString(),previous="const BRANCH='feat/251-evidence-risk-readout';",current="const BRANCH='feat/258-oracle-integrated-preview';";
 assert.equal(before.split(previous).length,2);assert.equal(read(GATE).toString(),before.replace(previous,current),'only exact owner-approved branch pin');
 for(const line of git('ls-tree','-r',PARENT).split('\n')){
  const [metadata,f]=line.split('\t'),[mode,type,blob]=metadata.split(' '),st=fs.lstatSync(path.join(root,f));
  assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);
  if(f!==GATE){const bytes=read(f);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,f+' immutable A/B/C/collector/auth/STOP');}
 }
 for(const f of [SELF,...Object.keys(FINITE)]){assert.equal(git('ls-tree',PARENT,'--',f),'');const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111,0,f);if(f!==SELF)assert.equal(sha(read(f)),FINITE[f],f+' finite complete hash');}
}
test('exact five reviewed paths; original A B C source security workflow SQL auth STOP and data frozen',()=>review());
test('passing reviewer rejects gate widening, peer edits, security-test omission, extra files, modes, symlinks and CI skipping',()=>{
 const root=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'oracle258-negative-'));
 try{
  execFileSync('git',['worktree','add','--detach',dir,'HEAD'],{cwd:root,stdio:'ignore'});review(dir);
  for(const [f,kind] of [[GATE,'append'],['lib/v4-oracle/onchain/project.ts','append'],['lib/v4-oracle/farming/index.ts','append'],['tests/v4-oracle-onchain/security.test.mjs','remove'],['.github/workflows/oracle-onchain-off.yml','append'],['app/lens/journal-controls.tsx','append'],['data/reward-snapshots.json','append'],['.github/workflows/oracle-preview-258.yml','append'],['tests/oracle-preview-258/run.sh','mode'],['tests/oracle-preview-258/gate.test.mjs','symlink'],['tests/oracle-preview-258/UNREVIEWED','append']]){
   const p=path.join(dir,f),bytes=fs.existsSync(p)?fs.readFileSync(p):null,mode=bytes?fs.statSync(p).mode:0;
   try{if(kind==='remove')fs.unlinkSync(p);else if(kind==='mode')fs.chmodSync(p,0o755);else if(kind==='symlink'){fs.unlinkSync(p);fs.symlinkSync('review.test.mjs',p);}else fs.writeFileSync(p,Buffer.concat([bytes??Buffer.alloc(0),Buffer.from('\nUNREVIEWED\n')]));assert.throws(()=>review(dir),f);}
   finally{if(fs.existsSync(p)||kind==='symlink')fs.rmSync(p,{force:true});if(bytes){fs.writeFileSync(p,bytes);fs.chmodSync(p,mode);}}
  }
 }finally{try{execFileSync('git',['worktree','remove','--force',dir],{cwd:root,stdio:'ignore'});}catch{fs.rmSync(dir,{recursive:true,force:true});}}
});
