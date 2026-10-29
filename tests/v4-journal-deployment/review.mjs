// Additions-only package. Every #230 byte/mode remains frozen; no guard replacement.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='76dea8aab3f26eef39c2fcbc1b0b37d13180388f';
export const ADDITIONS=['ops/v4-journal/sources/owner-ledger.sql','ops/v4-journal/sources.json','ops/v4-journal/hardening.sql','ops/v4-journal/catalog.sql','ops/v4-journal/snapshot.sql','ops/v4-journal/package.mjs','ops/v4-journal/native-tls.mjs','ops/v4-journal/envelope.mjs','ops/v4-journal/recovery.mjs',
 'tests/v4-journal-deployment/fixture.mjs','tests/v4-journal-deployment/run.sh','tests/v4-journal-deployment/native.test.mjs','tests/v4-journal-deployment/operations.test.mjs','tests/v4-journal-deployment/protocol.test.mjs','tests/v4-journal-deployment/review.mjs','tests/v4-journal-deployment/scope.test.mjs','tests/v4-journal-deployment/parent-regression.sh',
 'docs/v4/journal-deployment-233.md','.github/workflows/journal-deployment-off.yml'];
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:32*1024*1024}),git=(...a)=>raw(...a).toString().trim();
 assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [meta,file]=line.split('\t'),[mode,type,blob]=meta.split(' '),p=path.join(root,file),st=fs.lstatSync(p);assert.equal(type,'blob');assert.ok(st.isFile()&&!st.isSymbolicLink(),file);assert.equal(st.mode&0o111?'100755':'100644',mode,file);const b=fs.readFileSync(p);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,file+' immutable230');}
 const actual=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(actual,[...ADDITIONS].sort());
 for(const file of ADDITIONS){assert.equal(git('ls-tree',BASE,'--',file),'');const st=fs.lstatSync(path.join(root,file));assert.ok(st.isFile()&&!st.isSymbolicLink(),file);assert.equal(st.mode&0o111,0,file);}
 return {base:BASE,additions:ADDITIONS.length};
}
