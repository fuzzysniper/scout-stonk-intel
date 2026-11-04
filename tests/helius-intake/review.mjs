import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='905f5e68a2d53a3d1e54747e0b4a9632e96b0f8a',INTERFACE='62992d1630c0f6f261c3d594b1609262d0c935ae';
const MANIFEST_SHA='5fec845ed6b2d76cc68456ee4072b8d22753ee6624c9f84e36efa79ebdec3b0d';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const manifest=read('tests/helius-intake/review.json');assert.equal(sha(manifest),MANIFEST_SHA);const m=JSON.parse(manifest);assert.equal(m.base,BASE);
 assert.equal(git('rev-parse',BASE+'^{tree}'),'4aa53abb86b8168a03aa34356e52716b8a963834');
 for(const ref of [BASE,INTERFACE])assert.equal(git('merge-base','--is-ancestor',ref,'HEAD'),'');
 assert.deepEqual(Object.keys(m.modified).sort(),['lib/native-evidence/engine.ts','lib/native-evidence/index.ts','vercel.json']);
 for(const line of git('ls-tree','-r',BASE).split('\n')){
  const[meta,f]=line.split('\t'),[mode,kind,blob]=meta.split(' '),s=fs.lstatSync(path.join(root,f));assert.equal(kind,'blob');assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);
  const b=read(f);
  if(m.modified[f]){assert.equal(sha(b),m.modified[f].sha256,f+' reviewed corrective bytes');assert.equal(sha(raw('diff','--no-ext-diff','--no-textconv','--binary','--full-index','--no-renames',BASE,'--',f)),m.modified[f].patchSha256,f+' exact patch');}
  else assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen original284');
 }
 const expected=JSON.parse(raw('show',BASE+':vercel.json'));expected.git.deploymentEnabled['fix/284-helius-evidence-intake']=false;assert.equal(read('vercel.json').toString(),JSON.stringify(expected,null,2)+'\n');
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();
 assert.deepEqual(changed,[...Object.keys(m.added),...Object.keys(m.modified)].sort(),'finite paths');
 assert.deepEqual(Object.entries(m.added).filter(([,h])=>h===null).map(([f])=>f).sort(),['tests/helius-intake/review.json','tests/helius-intake/review.mjs','tests/helius-intake/scope.test.mjs']);
 for(const[f,h]of Object.entries(m.added)){assert.equal(git('ls-tree',BASE,'--',f),'');assert.ok(f.startsWith('lib/native-evidence/helius-')||f.startsWith('tests/helius-intake/')||f.startsWith('docs/helius-intake/')||f==='.github/workflows/helius-intake.yml');const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111,0);if(h)assert.equal(sha(read(f)),h,f);}
 assert.deepEqual(read('lib/native-evidence/helius-contract.ts'),raw('show',INTERFACE+':lib/native-evidence/helius-contract.ts'),'published additive interface unchanged');
 for(const line of git('log','--format=%P',BASE+'..HEAD').split('\n'))assert.equal(line.split(' ').length,1,'corrective history linear over exact284');
 return m;
}
