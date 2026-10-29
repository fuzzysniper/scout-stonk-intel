// Finite dependent review of exact #226; no source manifest rebaseline, directory or env waiver.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
export const PARENT='4af9532709c3a9bca9efe71356124328955a2877';
const REVIEW_SHA='3b31d162cddf41b49db6d574b5ea9e4da19e311ad4e19cb1945ac87cb25fb040';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertOwnerLedgerScope(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=p=>fs.readFileSync(path.join(root,p));
 const bytes=read('tests/v4-owner-ledger/review.json');assert.equal(sha(bytes),REVIEW_SHA,'immutable #227 review');const r=JSON.parse(bytes);assert.equal(r.parent,PARENT);assert.equal(git('merge-base','--is-ancestor',PARENT,'HEAD'),'');
 const allowed=new Set([...r.added,...Object.keys(r.modified)]);assert.equal(allowed.size,r.added.length+Object.keys(r.modified).length);
 assert.deepEqual(Object.keys(r.modified).sort(),['package.json','package-lock.json','tests/v4-integration/assertions.mjs','tests/v4-private-integration/review.mjs','tests/v4-private-integration/scope.test.mjs','tests/v4-private-journal/scope.test.mjs'].sort());
 for(const line of git('ls-tree','-r',PARENT).split('\n')){const [entry,file]=line.split('\t'),[mode,type,blob]=entry.split(' ');assert.equal(type,'blob');const stat=fs.lstatSync(path.join(root,file));assert.ok(stat.isFile()&&!stat.isSymbolicLink(),file);assert.equal(stat.mode&0o111?'100755':'100644',mode,file);
  if(r.modified[file]){const m=r.modified[file];assert.equal(m.originalSha256,sha(raw('show',PARENT+':'+file)),file+' original');assert.equal(m.reviewedSha256,sha(read(file)),file+' reviewed');assert.equal(m.patchSha256,sha(raw('diff','--binary','--full-index','--no-renames','--no-ext-diff','--no-textconv',PARENT,'--',file)),file+' full patch');}
  else {const b=read(file);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,file+' frozen #226');}
 }
 for(const f of r.added){const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111,0,f);}
 for(const [f,hash] of Object.entries(r.newFiles))assert.equal(sha(read(f)),hash,f+' exact new bytes');
 assert.deepEqual(Object.keys(r.newFiles).sort(),r.added.filter(f=>!['tests/v4-owner-ledger/review.json','tests/v4-owner-ledger/review.mjs','tests/v4-owner-ledger/scope.test.mjs'].includes(f)).sort());
 for(const f of [...git('diff','--name-only','--no-renames',PARENT).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(f),'unreviewed #227 path:'+f);
 // Existing dependency entries remain exact; only pinned Better Auth and its locked additions are admitted.
 const old=JSON.parse(raw('show',PARENT+':package.json')),pkg=JSON.parse(read('package.json'));assert.deepEqual(pkg,{...old,dependencies:{'better-auth':'1.7.14',...old.dependencies}});
 const lock=JSON.parse(read('package-lock.json')),before=JSON.parse(raw('show',PARENT+':package-lock.json'));
 for(const [f,v] of Object.entries(before.packages))if(f)assert.deepEqual(lock.packages[f],v,f+' old dependency');
 return JSON.parse(read('tests/v4-private-integration/review.json'));
}
