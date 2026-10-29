// Exact additive #239 dependency, with ONE complete source-pinned runtime patch.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='1133d6813e6913a6846cd08f11117f2a0635d6b1';
export const INPUTS=['696ca6c5698c75fc926bff4623a563f6994ce032','11d97aab4823bdac797019322beeefe32a578003','698021ea716c390072872e3d482aae188375b186'];
export const EXCEPTION='lib/v4-owner-ledger/ledger.ts';
export const ADDED=['lib/v4-owner-ledger/neon-durability.ts','ops/v4-journal/native-tls.d.mts','ops/v4-neon-durability/admission.sql','ops/v4-neon-durability/render.mjs','ops/v4-neon-durability/probe.mjs','ops/v4-neon-durability/evidence.json',
 'tests/v4-neon-durability/run.sh','tests/v4-neon-durability/contract.test.mjs','tests/v4-neon-durability/postgres18.test.mjs','tests/v4-neon-durability/signing.mjs','tests/v4-neon-durability/build-pg18.sh','tests/v4-neon-durability/replay.sh','tests/v4-neon-durability/browser.sh','tests/v4-neon-durability/built-off.sh','tests/v4-neon-durability/review.mjs','tests/v4-neon-durability/review.json','tests/v4-neon-durability/scope.test.mjs',
 'docs/v4/neon-durability-239.md','.github/workflows/neon-durability-off.yml'];
const MANIFEST_SHA='79ceef2d0758f21fb0801dd4a6daede7285488445d54746474356e5033d9920a';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const manifest=read('tests/v4-neon-durability/review.json');assert.equal(sha(manifest),MANIFEST_SHA,'independently pinned source manifest');const m=JSON.parse(manifest);assert.equal(m.base,BASE);assert.deepEqual(m.inputs,INPUTS);assert.deepEqual(m.added,ADDED);assert.equal(git('rev-parse',BASE+'^{tree}'),'5af0ebf9b34905513f127f1a74dac3e09bead0f4');
 for(const ref of [BASE,...INPUTS])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 assert.deepEqual(Object.keys(m.exceptions),[EXCEPTION]);const e=m.exceptions[EXCEPTION];assert.equal(e.originalSha256,sha(raw('show',BASE+':'+EXCEPTION)));assert.equal(e.reviewedSha256,sha(read(EXCEPTION)));assert.equal(e.patchSha256,sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',BASE,'--',EXCEPTION)));
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);if(f!==EXCEPTION){const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen238');}}
 const files=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(files,[EXCEPTION,...ADDED].sort());
 for(const f of ADDED){assert.equal(git('ls-tree',BASE,'--',f),'');const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink());assert.equal(st.mode&0o111,0,f);}
 assert.deepEqual(Object.keys(m.newFiles).sort(),ADDED.filter(f=>!['review.mjs','review.json','scope.test.mjs'].some(n=>f==='tests/v4-neon-durability/'+n)).sort());for(const [f,h]of Object.entries(m.newFiles))assert.equal(sha(read(f)),h,f+' reviewed new source');
 return m;
}
