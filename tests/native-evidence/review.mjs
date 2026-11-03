import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
export const BASE='ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5',CONTRACT='a1f9a9e0d5c3336098c5750b14b738acaec66372';
const MANIFEST_SHA='c20e46eeb53dd21b6d83b3748b878ff92f5234c25510aae66368231cbd598015';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const mBytes=read('tests/native-evidence/review.json');assert.equal(sha(mBytes),MANIFEST_SHA,'pinned manifest');const m=JSON.parse(mBytes);assert.equal(m.base,BASE);
 assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');assert.equal(git('merge-base','--is-ancestor',CONTRACT,'HEAD'),'');
 assert.equal(git('rev-parse',BASE+'^{tree}'),'59603d673d96ee75f469a8611f1fd983f324dfba');
 for(const line of git('ls-tree','-r',BASE).split('\n')){const[meta,f]=line.split('\t'),[mode,kind,blob]=meta.split(' '),s=fs.lstatSync(path.join(root,f));assert.equal(kind,'blob');assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);
  if(f==='vercel.json'){const expected=JSON.parse(raw('show',BASE+':'+f));expected.git.deploymentEnabled['feat/274-native-evidence']=false;assert.equal(read(f).toString(),JSON.stringify(expected,null,2)+'\n','only exact branch suppression');}
  else{const b=read(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),blob,f+' frozen #281');}
 }
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();
 assert.deepEqual(changed,['vercel.json',...Object.keys(m.added)].sort(),'finite exact paths');
 assert.deepEqual(Object.entries(m.added).filter(([,h])=>h===null).map(([f])=>f).sort(),['tests/native-evidence/review.json','tests/native-evidence/review.mjs','tests/native-evidence/scope.test.mjs']);
 for(const[f,h]of Object.entries(m.added)){assert.equal(git('ls-tree',BASE,'--',f),'');assert.ok(f.startsWith('lib/native-evidence/')||f.startsWith('tests/native-evidence/')||f.startsWith('docs/native-evidence/')||f==='.github/workflows/native-evidence.yml');const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111,0);if(h)assert.equal(sha(read(f)),h,f+' exact reviewed bytes');}
 assert.deepEqual(read('lib/native-evidence/contract.ts'),raw('show',CONTRACT+':lib/native-evidence/contract.ts'),'published shared contract unchanged');
 for(const line of git('log','--format=%P',BASE+'..HEAD').split('\n'))assert.equal(line.split(' ').length,1,'new A history is linear, old heads not merged/rewritten');
 return m;
}
