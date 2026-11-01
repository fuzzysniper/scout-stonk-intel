// Additions only. Every original278 blob/mode/guard and reviewed head is immutable.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
export const BASE='7e13f73d8e8a5db8c274577c9d72f096b1ee50d2';
const MANIFEST_SHA='7dbbfdb0603b4fe92448cf87c36f8314b6458d015edb78f00e27d4184ea22e00';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/jupiter-approval-integration/review.json');assert.equal(sha(bytes),MANIFEST_SHA);const m=JSON.parse(bytes);assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'e093fb1a12ed3269aeb7927407d7585ad9c85fcf');assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 const original=new Map();for(const line of git('ls-tree','-r',BASE).split('\n')){const[meta,f]=line.split('\t'),[mode,type,id]=meta.split(' ');assert.equal(type,'blob');original.set(f,{mode,id});const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);assert.equal(blob(read(f)),id,f+' immutable277');}
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,Object.keys(m.added).sort(),'finite additions only; original app/lib/SQL/collector/guards unchanged');
 assert.deepEqual(Object.entries(m.added).filter(([,e])=>e.sha256===null).map(([f])=>f).sort(),['tests/jupiter-approval-integration/review.json','tests/jupiter-approval-integration/review.mjs','tests/jupiter-approval-integration/scope.test.mjs']);
 for(const[f,e]of Object.entries(m.added)){assert.equal(original.has(f),false);const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',e.mode,f);if(e.sha256)assert.equal(sha(read(f)),e.sha256,f);}
 if(git('rev-parse','HEAD')!==BASE){assert.equal(git('show','-s','--format=%P','HEAD'),BASE,'single isolated dependent commit');const head=git('ls-tree','-r','HEAD').split('\n');assert.deepEqual(head.map(l=>l.split('\t')[1]).sort(),[...original.keys(),...Object.keys(m.added)].sort());for(const line of head){const[meta,f]=line.split('\t'),[mode,,id]=meta.split(' ');assert.equal(blob(read(f)),id,f+' exact committed bytes');assert.equal(fs.lstatSync(path.join(root,f)).mode&0o111?'100755':'100644',mode,f);}}
 return m;
}
