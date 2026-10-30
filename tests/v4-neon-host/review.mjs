// Finite dependent #241 full-patch review; no old guard or future-path waiver.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='add2a47a3707cca0d380325b09552b0aff0613ad';
export const INPUTS=['1133d6813e6913a6846cd08f11117f2a0635d6b1','696ca6c5698c75fc926bff4623a563f6994ce032','11d97aab4823bdac797019322beeefe32a578003','698021ea716c390072872e3d482aae188375b186'];
export const EXCEPTIONS=['docs/v4/neon-durability-239.md','lib/v4-owner-ledger/neon-durability.ts','ops/v4-journal/native-tls.mjs','ops/v4-neon-durability/admission.sql','ops/v4-neon-durability/evidence.json','ops/v4-neon-durability/probe.mjs','ops/v4-neon-durability/render.mjs','tests/v4-neon-durability/postgres18.test.mjs','tests/v4-neon-durability/signing.mjs'];
export const ADDED=['.github/workflows/neon-direct-host-off.yml','docs/v4/neon-direct-host-241.md','tests/v4-neon-host/affected.sh','tests/v4-neon-host/browser.sh','tests/v4-neon-host/host.test.mjs','tests/v4-neon-host/postgres.test.mjs','tests/v4-neon-host/replay.sh','tests/v4-neon-host/review.json','tests/v4-neon-host/review.mjs','tests/v4-neon-host/scope.test.mjs'];
const MANIFEST_SHA='b1847d42fd32d2121b1b236fa48d2c34a97d9a52be7e3b6c2acec1f0b52f7d74';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const manifest=read('tests/v4-neon-host/review.json');assert.equal(sha(manifest),MANIFEST_SHA,'independently pinned source manifest');const m=JSON.parse(manifest);assert.equal(m.base,BASE);assert.deepEqual(m.inputs,INPUTS);assert.deepEqual(m.added,ADDED);assert.equal(git('rev-parse',BASE+'^{tree}'),'7c7b65de4e6d05918b5572fe7b8248e2b6eb754b');
 for(const ref of [BASE,...INPUTS])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 assert.deepEqual(Object.keys(m.exceptions),EXCEPTIONS);for(const f of EXCEPTIONS){const e=m.exceptions[f];assert.equal(e.originalSha256,sha(raw('show',BASE+':'+f)));assert.equal(e.reviewedSha256,sha(read(f)),f);assert.equal(e.patchSha256,sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',BASE,'--',f)),f+' complete reviewed patch');}
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);if(!EXCEPTIONS.includes(f)){const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen240');}}
 const files=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(files,[...EXCEPTIONS,...ADDED].sort());
 for(const f of ADDED){assert.equal(git('ls-tree',BASE,'--',f),'');const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink());assert.equal(st.mode&0o111,0,f);}
 assert.deepEqual(Object.keys(m.newFiles).sort(),ADDED.filter(f=>!['review.mjs','review.json','scope.test.mjs'].some(n=>f==='tests/v4-neon-host/'+n)).sort());for(const [f,h]of Object.entries(m.newFiles))assert.equal(sha(read(f)),h,f+' reviewed new source');
 return m;
}
