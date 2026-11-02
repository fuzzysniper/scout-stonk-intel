// Finite NEW delta over immutable280. Every other tracked byte and mode is frozen.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
export const BASE='e19a7ded18b0cd63b9e06c6b5efce35447719fa0';
const MANIFEST_SHA='df7eb41d7cfd8df739d45f6a4c710e1373228f32d403bf4fc286e56db9b833da';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024}),git=(...args)=>raw(...args).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/jupiter-research-v3/review.json');assert.equal(sha(bytes),MANIFEST_SHA);const m=JSON.parse(bytes);assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'3ea4a7222dd038050e306752f5d15dad5eb3d697');assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 assert.deepEqual(Object.keys(m.modified).sort(),['app/api/v4/ca-intelligence/route.ts','app/lens/ca-view.tsx','app/lens/page.tsx','vercel.json']);
 const original=new Map();for(const line of git('ls-tree','-r',BASE).split('\n')){
  const[meta,f]=line.split('\t'),[mode,type,id]=meta.split(' ');assert.equal(type,'blob');original.set(f,{mode,id});const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);
  if(m.modified[f]){assert.equal(sha(read(f)),m.modified[f].sha256,f+' finite final bytes');assert.equal(sha(raw('diff','--no-ext-diff','--no-textconv','--binary','--full-index','--no-renames',BASE,'--',f)),m.modified[f].patchSha256,f+' exact patch');}
  else assert.equal(blob(read(f)),id,f+' immutable280');
 }
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(m.modified),...Object.keys(m.added)].sort(),'only enumerated changes');
 assert.deepEqual(Object.entries(m.added).filter(([,v])=>v.sha256===null).map(([f])=>f).sort(),['tests/jupiter-research-v3/review.json','tests/jupiter-research-v3/review.mjs','tests/jupiter-research-v3/scope.test.mjs']);
 for(const[f,v]of Object.entries(m.added)){assert.equal(original.has(f),false);const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',v.mode,f);if(v.sha256)assert.equal(sha(read(f)),v.sha256,f);}
 assert.match(read('lib/v4-ca-intelligence/jupiter-research-admission.ts').toString(),/export const JUPITER_RESEARCH_SOURCE_ENABLED=false;/);assert.match(read('lib/v4-ca-intelligence/jupiter-research-admission.ts').toString(),/export const JUPITER_RESEARCH_PUBLIC_TRUST:PublicTrust\|null=null;/);
 const expected=JSON.parse(raw('show',BASE+':vercel.json'));expected.git.deploymentEnabled['feat/280-lens-v3-public']=false;assert.deepEqual(JSON.parse(read('vercel.json')),expected,'only suppress NEW branch');
 if(git('rev-parse','HEAD')!==BASE){assert.equal(git('show','-s','--format=%P','HEAD'),BASE,'one dependent commit');const head=git('ls-tree','-r','HEAD').split('\n');assert.deepEqual(head.map(l=>l.split('\t')[1]).sort(),[...original.keys(),...Object.keys(m.added)].sort());for(const line of head){const[meta,f]=line.split('\t'),[mode,,id]=meta.split(' ');assert.equal(blob(read(f)),id,f+' committed bytes');assert.equal(fs.lstatSync(path.join(root,f)).mode&0o111?'100755':'100644',mode,f);}}
 return m;
}
