// Exact finite alias-pagination descendant. Original cumulative guards replay at c4.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='653f3dd4a636a2781b50d3c2891d71a84a7289e7'; // original replay input, unchanged
export const PARENT='c4cecb3ae8370713d78d08ff308a65632c7719d3';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd(),committed=true){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=p=>fs.readFileSync(path.join(root,p));
 assert.equal(git('rev-parse',PARENT+'^{tree}'),'9c5be2c6e1117aecb4a7e6e3690b3b57cea53ac0');
 const manifest=JSON.parse(read('tests/preview-inspection/review.json'));assert.equal(manifest.base,PARENT);
 for(const line of git('ls-tree','-r',PARENT).split('\n')){
  const [a,p]=line.split('\t'),[mode,,id]=a.split(' '),s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',mode,p);
  if(!Object.hasOwn(manifest.modified,p))assert.equal(blob(read(p)),id,p+' unchanged installed input');
 }
 for(const [p,x]of Object.entries({...manifest.modified,...manifest.added})){
  const s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',x.mode,p);if(x.sha256)assert.equal(hash(read(p)),x.sha256,p);
 }
 const changed=[...new Set([...git('diff','--name-only','--no-renames',PARENT).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(manifest.modified),...Object.keys(manifest.added)].sort());
 assert.deepEqual(Object.entries({...manifest.modified,...manifest.added}).filter(([,x])=>x.sha256===null).map(([p])=>p).sort(),['tests/preview-inspection/review.json','tests/preview-inspection/review.mjs','tests/preview-inspection/scope.test.mjs']);
 // No operational workflow change. Existing authorization, secrets and all source lanes frozen by full-tree check.
 const before=JSON.parse(raw('show',PARENT+':vercel.json')),after=JSON.parse(read('vercel.json'));assert.equal(after.git.deploymentEnabled['fix/preview-alias-completeness'],false);delete after.git.deploymentEnabled['fix/preview-alias-completeness'];assert.deepEqual(after,before);
 for(const file of ['native-beta-release.yml','preview-preflight-diagnostics.yml','uploader-toolchain-security.yml']){
  const p='.github/workflows/'+file;assert.equal(read(p).toString().replaceAll(" || github.head_ref == 'fix/preview-alias-completeness'",''),raw('show',PARENT+':'+p).toString(),'only a finite CI selector may change');
 }
 if(committed){assert.equal(git('show','-s','--format=%P','HEAD'),PARENT);assert.equal(git('status','--porcelain','--untracked-files=normal'),'');}
 return manifest;
}
