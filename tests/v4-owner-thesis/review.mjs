// Finite A#229+B#230 composition; exact input snapshots, no prefix/flag waiver.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='4af9532709c3a9bca9efe71356124328955a2877';
export const INPUTS={A:'6efb0eb66a79087b9c7a59b9a06ad584e9130ee9',B:'76dea8aab3f26eef39c2fcbc1b0b37d13180388f'};
export const RESOLUTIONS=['app/lens/view.tsx','tests/v4-integration/assertions.mjs','tests/v4-private-integration/review.mjs','tests/v4-private-integration/scope.test.mjs','tests/v4-private-journal/scope.test.mjs','tests/v4-owner-ledger/review.mjs','tests/v4-owner-ledger/scope.test.mjs','tests/v4-thesis/review.mjs'];
export const ADDED=['lib/v4-owner-thesis/index.ts','lib/v4-owner-thesis/bridge.ts',...['review.mjs','review.json','scope.test.mjs','fixture.mjs','bridge.test.mjs','browser-server.mjs','browser.spec.mjs','playwright.config.mjs','run.sh','source-history.sh','__init__.py','engine_test.py'].map(f=>'tests/v4-owner-thesis/'+f),...['320','390','1280'].map(n=>'tests/v4-owner-thesis/screenshots/local-bridge-'+n+'.png'),'docs/v4/owner-thesis-231.md','.github/workflows/v4-owner-thesis.yml'];
const REVIEW_SHA='31fdb21092fca40e140d158197bc6b24a643c700a6870818531c4e43b2b8db3d';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertUnified(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/v4-owner-thesis/review.json');assert.equal(sha(bytes),REVIEW_SHA,'independent immutable joint review');const r=JSON.parse(bytes);assert.equal(r.base,BASE);assert.deepEqual(r.inputs,INPUTS);assert.deepEqual(r.added,ADDED);assert.deepEqual(Object.keys(r.resolutions).sort(),[...RESOLUTIONS].sort());
 assert.equal(git('merge-base',INPUTS.A,INPUTS.B),BASE);for(const ref of [BASE,...Object.values(INPUTS)])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 const inventory=new Set();
 for(const [name,ref]of Object.entries(INPUTS)){
  const files=git('diff','--name-only','--no-renames',BASE,ref).split('\n');assert.equal(files.length,name==='A'?26:35);assert.deepEqual(Object.keys(r.sources[name]).sort(),files.sort());
  const tree=new Map(git('ls-tree','-r',ref).split('\n').map(line=>{const [v,f]=line.split('\t');return [f,v.split(' ')];}));
  for(const f of files){inventory.add(f);const [mode,type,blob]=tree.get(f);assert.equal(type,'blob');assert.deepEqual(r.sources[name][f],{mode,blob,sha256:sha(raw('show',ref+':'+f))});}
 }
 for(const f of inventory){
  if(r.resolutions[f]){const pin=r.resolutions[f];assert.equal(sha(read(f)),pin.reviewedSha256,f+' reviewed replacement');for(const [name,ref]of Object.entries({BASE,...INPUTS})){
    if(name!=='BASE'&&!r.sources[name][f])continue;if(!git('ls-tree',ref,'--',f))continue;
    assert.deepEqual(pin.from[name],{originalSha256:sha(raw('show',ref+':'+f)),patchSha256:sha(raw('diff','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',ref,'--',':(literal)'+f))},f+' original/full '+name+' patch');}
  }else for(const source of Object.values(r.sources))if(source[f])assert.equal(sha(read(f)),source[f].sha256,f+' immutable input');
 }
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [v,f]=line.split('\t'),[mode,type,blob]=v.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);if(!inventory.has(f)){const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen226');}}
 const allowed=new Set([...inventory,...ADDED]);for(const f of allowed){const st=fs.lstatSync(path.join(root,f));assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111,0,f);}
 for(const f of [...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(f),'unreviewed joint path:'+f);
 for(const [f,digest] of Object.entries(r.newFiles))assert.equal(sha(read(f)),digest,f+' exact joint bytes');
 assert.deepEqual(Object.keys(r.newFiles).sort(),ADDED.filter(f=>!['tests/v4-owner-thesis/review.json','tests/v4-owner-thesis/review.mjs','tests/v4-owner-thesis/scope.test.mjs'].includes(f)).sort());
 return r;
}
