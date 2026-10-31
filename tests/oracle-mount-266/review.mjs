// Finite #266 review: every base byte/mode frozen except full-patch reviewed C files.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='f80ecba0d39ad854d189ff5b4c699f4310a45c1d';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const MANIFEST_SHA='76f8f19f9d30dcc7deb1898580b58644bf0395010140c91122a946a35a2c9ec0';
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/oracle-mount-266/review.json');assert.equal(sha(bytes),MANIFEST_SHA);const m=JSON.parse(bytes);assert.equal(m.base,BASE);assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 for(const [f,e]of Object.entries(m.changed)){assert.equal(e.before,sha(raw('show',BASE+':'+f)));assert.equal(e.after,sha(read(f)),f);assert.equal(e.patch,sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',BASE,'--',f)),f+' full patch');}
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);if(!Object.hasOwn(m.changed,f)){const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' immutable #265');}}
 const files=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(files,[...Object.keys(m.changed),...Object.keys(m.added)].sort());
 for(const [f,e]of Object.entries(m.added)){assert.equal(git('ls-tree',BASE,'--',f),'');const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',e.mode,f);if(e.sha256)assert.equal(sha(read(f)),e.sha256,f);}
 for(const peer of m.peers){assert.equal(git('merge-base','--is-ancestor',peer.sha,'HEAD'),'');assert.deepEqual(git('diff','--name-only',BASE,peer.sha).split('\n').filter(Boolean).sort(),peer.files);for(const f of peer.files)assert.deepEqual(read(f),raw('show',peer.sha+':'+f),f+' exact reviewed peer');}
 return m;
}
