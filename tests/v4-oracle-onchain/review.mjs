// Strict additive onchain-only review. Every existing #251 byte/mode/guard remains exact, including peers' live-preview code.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='8c89c37a2d738ec1e9ab48b9a7a38510b7f30e2e';
export const AUDITED='aa58f76bcde6fef761683a6fbcd552c00ee34312';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const MANIFEST_SHA='2267a0063eae5a9643216beb1febfc4776aefd6319908d9a0c37d01c07b8c1a5';
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/v4-oracle-onchain/review.json');assert.equal(sha(bytes),MANIFEST_SHA,'immutable onchain review');const m=JSON.parse(bytes);assert.equal(m.base,BASE);assert.equal(m.audited,AUDITED);for(const ref of [BASE,AUDITED])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen #251');}
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,m.added);
 for(const f of m.added){assert.equal(git('ls-tree',BASE,'--',f),'');assert.ok(f.startsWith('lib/v4-oracle/onchain/')||f.startsWith('tests/v4-oracle-onchain/')||f==='.github/workflows/oracle-onchain-off.yml');const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111,0,f);}
 const self=['review.json','review.mjs','scope.test.mjs'].map(f=>'tests/v4-oracle-onchain/'+f);assert.deepEqual(Object.keys(m.newFiles).sort(),m.added.filter(f=>!self.includes(f)).sort());for(const [f,h]of Object.entries(m.newFiles))assert.equal(sha(read(f)),h,f+' exact new bytes');return m;
}
