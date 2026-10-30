// Strict additive review: EVERY existing #242 byte/mode/guard is unchanged. No exception or future-prefix waiver.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='9aff67c14d0feb5597a7bca8fd20fbb101d3640f';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const REVIEW_SHA='21626cf7c72ff6a0a41c039a9ea3cf71915fdc51c273049684b3273b43f1db6f';
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/v4-ca-intelligence/review.json');assert.equal(sha(bytes),REVIEW_SHA,'immutable #244 manifest');const m=JSON.parse(bytes);assert.equal(m.base,BASE);assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen #242');}
 const files=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(files,m.added);
 for(const f of m.added){assert.equal(git('ls-tree',BASE,'--',f),'');const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111,0,f);}
 assert.deepEqual(Object.keys(m.newFiles).sort(),m.added.filter(f=>!['review.mjs','review.json','scope.test.mjs'].some(n=>f==='tests/v4-ca-intelligence/'+n)).sort());for(const [f,h]of Object.entries(m.newFiles))assert.equal(sha(read(f)),h,f+' exact addition');return m;
}
