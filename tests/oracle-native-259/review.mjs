// Strict additive native259 review: every exact258 A/B/C/SQL/data byte and mode is frozen.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='34d6a59763d62399cdcd94f7bccb7ea89e579a18';

export const sha=b=>createHash('sha256').update(b).digest('hex');
const MANIFEST_SHA='d1e461265b9d3da8854d499c99b338e70bb6c063fbee8affd6cb8f479bbe1ce8';
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/oracle-native-259/review.json');assert.equal(sha(bytes),MANIFEST_SHA,'immutable onchain review');const m=JSON.parse(bytes);assert.equal(m.base,BASE);for(const ref of [BASE])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,f]=line.split('\t'),[mode,type,blob]=meta.split(' '),st=fs.lstatSync(path.join(root,f));assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),f);assert.equal(st.mode&0o111?'100755':'100644',mode,f);const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen #258');}
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,m.added);
 for(const f of m.added){assert.equal(git('ls-tree',BASE,'--',f),'');assert.ok(f.startsWith('lib/v4-oracle/native-mint/')||f.startsWith('tests/oracle-native-259/')||f==='.github/workflows/oracle-native-259.yml');const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111,0,f);}
 const self=['review.json','review.mjs','scope.test.mjs'].map(f=>'tests/oracle-native-259/'+f);assert.deepEqual(Object.keys(m.newFiles).sort(),m.added.filter(f=>!self.includes(f)).sort());for(const [f,h]of Object.entries(m.newFiles))assert.equal(sha(read(f)),h,f+' exact new bytes');return m;
}
