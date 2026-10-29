// Immutable finite composition; no directory, env, collector or future-file waiver.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='11d97aab4823bdac797019322beeefe32a578003';
export const INPUTS={native:'696ca6c5698c75fc926bff4623a563f6994ce032',package:'698021ea716c390072872e3d482aae188375b186'};
export const PARENTS={native:'6efb0eb66a79087b9c7a59b9a06ad584e9130ee9',package:'76dea8aab3f26eef39c2fcbc1b0b37d13180388f'};
export const RESOLUTIONS=['tests/v4-owner-ledger/review.mjs','tests/v4-owner-ledger/scope.test.mjs','tests/v4-owner-thesis/review.mjs','tests/v4-owner-thesis/scope.test.mjs','tests/v4-helius-native/review.mjs','tests/v4-helius-native/scope.test.mjs','tests/v4-journal-deployment/review.mjs','tests/v4-private-journal/scope.test.mjs'];
export const ADDED=[...['review.mjs','review.json','scope.test.mjs','fixture.mjs','combined.test.mjs','run.sh','__init__.py','engine_test.py','browser-server.mjs','browser.spec.mjs','playwright.config.mjs','built-off.mjs','source-history.sh'].map(f=>'tests/v4-final/'+f),...['320','390','1280'].map(n=>'tests/v4-final/screenshots/combined-'+n+'.png'),'docs/v4/final-composition-237.md','.github/workflows/v4-final-offline.yml'];
const REVIEW_SHA='c45aef7b12f1d7908e95ec070e0d34a2ce5e85f87a2a7e63d9c26c69c56605e9';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertFinal(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/v4-final/review.json');assert.equal(sha(bytes),REVIEW_SHA,'immutable final review');const r=JSON.parse(bytes);assert.equal(r.base,BASE);assert.deepEqual(r.inputs,INPUTS);assert.deepEqual(r.parents,PARENTS);assert.deepEqual(r.added,ADDED);assert.deepEqual(Object.keys(r.resolutions).sort(),[...RESOLUTIONS].sort());
 for(const ref of [BASE,...Object.values(INPUTS)])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 const incoming=new Set();
 for(const [name,ref]of Object.entries(INPUTS)){
  const files=git('diff','--name-only','--no-renames',PARENTS[name],ref).split('\n').sort();assert.equal(files.length,name==='native'?20:19);assert.deepEqual(Object.keys(r.sources[name]).sort(),files);
  for(const f of files){incoming.add(f);const [mode,type,blob]=git('ls-tree',ref,'--',f).split('\t')[0].split(' ');assert.equal(type,'blob');assert.deepEqual(r.sources[name][f],{mode,blob,sha256:sha(raw('show',ref+':'+f))});if(!RESOLUTIONS.includes(f))assert.equal(sha(read(f)),r.sources[name][f].sha256,f+' immutable incoming');}
 }
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);if(!RESOLUTIONS.includes(f)){const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen235');}}
 for(const f of RESOLUTIONS){const pin=r.resolutions[f];assert.equal(sha(read(f)),pin.reviewedSha256,f+' reviewed');for(const [name,ref]of Object.entries({base:BASE,...INPUTS})){const entry=git('ls-tree',ref,'--',f),meta=entry?entry.split('\t')[0].split(' '):null;assert.deepEqual(pin.from[name],{original:meta?{mode:meta[0],blob:meta[2],sha256:sha(raw('show',ref+':'+f))}:null,patchSha256:sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',ref,'--',':(literal)'+f))},f+' complete '+name+' patch');}}
 const allowed=new Set([...incoming,...RESOLUTIONS,...ADDED]);for(const f of allowed){const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111,0,f);}
 for(const f of [...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(f),'unreviewed final path:'+f);
 assert.deepEqual(Object.keys(r.newFiles).sort(),ADDED.filter(f=>!['tests/v4-final/review.mjs','tests/v4-final/review.json','tests/v4-final/scope.test.mjs'].includes(f)).sort());for(const [f,h]of Object.entries(r.newFiles))assert.equal(sha(read(f)),h,f+' exact final addition');return r;
}
