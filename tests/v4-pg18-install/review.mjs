// Finite #247 ownership-only dependent review. All original source guards are unchanged.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='334400a6535d198a36bc17433d7e2813d855e603';
export const INPUTS=["9aff67c14d0feb5597a7bca8fd20fbb101d3640f","2f1eca1976d0bda04c94b6b1ce099494d804d779","1133d6813e6913a6846cd08f11117f2a0635d6b1","add2a47a3707cca0d380325b09552b0aff0613ad"];
export const EXCEPTIONS=["docs/v4/journal-deployment-233.md","docs/v4/neon-direct-host-241.md","docs/v4/owner-preview-243.md","lib/v4-owner-ledger/neon-durability.ts","lib/v4-owner-preview/release.ts","lib/v4-owner-preview/sql-pins.ts","ops/v4-journal/hardening.sql","ops/v4-journal/package.mjs","ops/v4-neon-durability/admission.sql","ops/v4-neon-durability/render.mjs","ops/v4-owner-auth/issuer.sql"];
export const ADDED=[".github/workflows/pg18-non-superuser-install.yml","docs/v4/pg18-installer-247.md","ops/v4-journal/install-reviewed.sh","tests/v4-pg18-install/command.test.mjs","tests/v4-pg18-install/fixture.mjs","tests/v4-pg18-install/permissions.test.mjs","tests/v4-pg18-install/replay.sh","tests/v4-pg18-install/review.json","tests/v4-pg18-install/review.mjs","tests/v4-pg18-install/run.sh","tests/v4-pg18-install/scope.test.mjs"];
const MANIFEST_SHA='36f275baee7e1e038316368980410c0f12d4819b83baacca2c23ee83a31c7960';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const manifest=read('tests/v4-pg18-install/review.json');assert.equal(sha(manifest),MANIFEST_SHA,'independently pinned source manifest');const m=JSON.parse(manifest);assert.equal(m.base,BASE);assert.deepEqual(m.inputs,INPUTS);assert.deepEqual(m.added,ADDED);assert.equal(git('rev-parse',BASE+'^{tree}'),'937e43250e09f5c599566cf04605631ddf0bd4be');
 for(const ref of [BASE,...INPUTS])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 assert.deepEqual(Object.keys(m.exceptions),EXCEPTIONS);for(const f of EXCEPTIONS){const e=m.exceptions[f];assert.equal(e.originalSha256,sha(raw('show',BASE+':'+f)));assert.equal(e.reviewedSha256,sha(read(f)),f);assert.equal(e.patchSha256,sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',BASE,'--',f)),f+' complete reviewed patch');}
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);if(!EXCEPTIONS.includes(f)){const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen246');}}
 const files=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(files,[...EXCEPTIONS,...ADDED].sort());
 for(const f of ADDED){assert.equal(git('ls-tree',BASE,'--',f),'');const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink());assert.equal(st.mode&0o111,0,f);}
 assert.deepEqual(Object.keys(m.newFiles).sort(),ADDED.filter(f=>!['review.mjs','review.json','scope.test.mjs'].some(n=>f==='tests/v4-pg18-install/'+n)).sort());for(const [f,h]of Object.entries(m.newFiles))assert.equal(sha(read(f)),h,f+' reviewed new source');
 return m;
}
