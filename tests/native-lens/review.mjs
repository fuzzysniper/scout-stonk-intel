// C finite integration delta; exact A/B history and every inherited byte frozen.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5';
const MANIFEST_SHA='f1a903e72170ec5f3958b4f5393a7b8b7cd79a18d25816936d3e9b65bbf85a53';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd(),checkHead=true){
 const raw=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024}),git=(...args)=>raw(...args).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/native-lens/review.json');assert.equal(sha(bytes),MANIFEST_SHA);const m=JSON.parse(bytes),inputs=JSON.parse(read('tests/native-lens/inputs.json'));assert.equal(m.base,BASE);assert.equal(inputs.base.sha,BASE);assert.equal(inputs.base.tree,'59603d673d96ee75f469a8611f1fd983f324dfba');assert.equal(git('rev-parse',BASE+'^{tree}'),inputs.base.tree);
 assert.equal(inputs.A.sha,'b7168f754ad83b6539b59106933b127c964515c1');assert.equal(inputs.A.tree,'2e40a4ba16e6c683909c69993d95eda3f563673f');assert.equal(inputs.B.sha,'255b82014544b8d7c2d7d8219b64e810e8c030fe');assert.equal(inputs.B.tree,'26e7094ac8c4a31bd6498ea3e0e3f604df6d8341');assert.equal(inputs.finalUnion,Boolean(inputs.B),'never claim final union without B');
 const imported=new Map(),entry=line=>{const[meta,f]=line.split('\t'),[mode,type,id]=meta.split(' ');assert.equal(type,'blob');return {f,mode,id};};
 for(const role of ['A','B'])if(inputs[role]){const i=inputs[role];assert.equal(git('rev-parse',i.sha+'^{tree}'),i.tree);assert.equal(git('merge-base','--is-ancestor',BASE,i.sha),'');if(checkHead)assert.equal(git('merge-base','--is-ancestor',i.sha,'HEAD'),'');
  for(const f of git('diff','--name-only',BASE,i.sha).split('\n').filter(f=>f&&f!=='vercel.json')){
   assert.match(f,role==='A'?/^(?:lib\/native-evidence\/|tests\/native-evidence\/|docs\/native-evidence\/|\.github\/workflows\/native-evidence\.yml$)/:/^(?:lib\/native-pilot\/|tests\/native-pilot\/|docs\/native-pilot\/|\.github\/workflows\/native-pilot[^/]*\.yml$)/);
   const e=entry(git('ls-tree',i.sha,'--',f));if(imported.has(f))assert.deepEqual(imported.get(f),e);imported.set(f,e);
  }
 }
 const original=new Map();for(const line of git('ls-tree','-r',BASE).split('\n')){const e=entry(line);original.set(e.f,e);const s=fs.lstatSync(path.join(root,e.f));assert.ok(s.isFile()&&!s.isSymbolicLink(),e.f);assert.equal(s.mode&0o111?'100755':'100644',e.mode,e.f);
  if(m.modified[e.f]){assert.equal(sha(read(e.f)),m.modified[e.f].sha256,e.f+' exact C bytes');assert.equal(sha(raw('diff','--no-ext-diff','--no-textconv','--binary','--full-index','--no-renames',BASE,'--',e.f)),m.modified[e.f].patchSha256,e.f+' finite patch');}else assert.equal(blob(read(e.f)),e.id,e.f+' inherited immutable');
 }
 assert.deepEqual(Object.keys(m.modified).sort(),['app/lens/intelligence-desk.tsx','app/lens/page.tsx','vercel.json']);
 for(const[f,e]of imported){assert.equal(original.has(f),false,f+' additive input only');const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111?'100755':'100644',e.mode,f);assert.equal(blob(read(f)),e.id,f+' exact reviewed '+e.id);}
 for(const[f,e]of Object.entries(m.added)){assert.equal(original.has(f)||imported.has(f),false,f);const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',e.mode,f);if(e.sha256)assert.equal(sha(read(f)),e.sha256,f);}
 assert.deepEqual(Object.entries(m.added).filter(([,v])=>v.sha256===null).map(([f])=>f).sort(),['tests/native-lens/review.json','tests/native-lens/review.mjs','tests/native-lens/scope.test.mjs']);
 const actual=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(actual,[...imported.keys(),...Object.keys(m.modified),...Object.keys(m.added)].sort(),'finite union paths');
 const expected=JSON.parse(raw('show',BASE+':vercel.json'));for(const role of ['A','B'])if(inputs[role])Object.assign(expected.git.deploymentEnabled,JSON.parse(raw('show',inputs[role].sha+':vercel.json')).git.deploymentEnabled);expected.git.deploymentEnabled['integration/281-native-first']=false;assert.deepEqual(JSON.parse(read('vercel.json')),expected,'preserve every suppression entry');
 assert.match(read('lib/native-lens/policy.ts').toString(),/export const NATIVE_LENS_SOURCE_ENABLED=false;/);
 if(checkHead){assert.deepEqual(git('show','-s','--format=%P','HEAD').split(' '),inputs.expectedParents);const head=git('ls-tree','-r','HEAD').split('\n').map(entry);assert.deepEqual(head.map(e=>e.f).sort(),[...original.keys(),...imported.keys(),...Object.keys(m.added)].sort());for(const e of head)assert.equal(blob(read(e.f)),e.id,e.f+' exact committed union');}
 return {manifest:m,inputs};
}
