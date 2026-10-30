// Finite #243 composition review. No runtime/source prefix exceptions or edits to original reviewers.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='9aff67c14d0feb5597a7bca8fd20fbb101d3640f',SOURCE='2f1eca1976d0bda04c94b6b1ce099494d804d779';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const MANIFEST_SHA='a023dbbc43f532f16552555ed59b221bd42a805ea7d72cfd8780c825fe1b744c';
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/v4-owner-preview/review.json');assert.equal(sha(bytes),MANIFEST_SHA,'independently pinned finite manifest');const m=JSON.parse(bytes);assert.equal(m.base,BASE);assert.equal(m.source,SOURCE);
 for(const ref of [BASE,SOURCE,'1133d6813e6913a6846cd08f11117f2a0635d6b1','add2a47a3707cca0d380325b09552b0aff0613ad'])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 for(const [f,e]of Object.entries(m.changed)){assert.equal(e.before,sha(raw('show',BASE+':'+f)));assert.equal(e.after,sha(read(f)),f);assert.equal(e.patch,sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',BASE,'--',f)),f+' entire patch');}
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);if(!Object.hasOwn(m.changed,f)){const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen #242');}}
 const files=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(files,[...Object.keys(m.changed),...Object.keys(m.added)].sort());
 for(const [f,e]of Object.entries(m.added)){assert.equal(git('ls-tree',BASE,'--',f),'');const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',e.mode,f);if(e.sha256)assert.equal(sha(read(f)),e.sha256,f+' exact addition');}
 // Agent A source/contracts/tests/docs remain EXACT; only its finite CI assembly file is reviewed above.
 for(const f of git('diff','--name-only',BASE,SOURCE).split('\n').filter(f=>f!=='.github/workflows/ca-intelligence-off.yml'))assert.deepEqual(read(f),raw('show',SOURCE+':'+f),f+' immutable A handoff');
 return m;
}
