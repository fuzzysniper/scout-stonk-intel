// Exact corrective full-file/patch pins; all earlier guards and protected bytes frozen.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
export const BASE='0ba7b2355acb72386f0d4f810f3601290cacb0cb';
const MANIFEST_SHA='5f2c0e51d70b96b49e36714aee591a678aa66339764786965ed6ff4df39ad926';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024}),git=(...args)=>raw(...args).toString().trim(),read=f=>fs.readFileSync(path.join(root,f));
 const bytes=read('tests/jupiter-stop-correction/review.json');assert.equal(sha(bytes),MANIFEST_SHA);const m=JSON.parse(bytes);assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'a75c2cdd5dcea74c1c9c2767335018d81fc29fc1');assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 const original=new Map();
 for(const line of git('ls-tree','-r',BASE).split('\n')){
  const[meta,f]=line.split('\t'),[mode,type,id]=meta.split(' ');assert.equal(type,'blob');original.set(f,{mode,id});
  const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);
  if(m.modified[f]){assert.equal(sha(read(f)),m.modified[f].sha256,f+' corrective final bytes');assert.equal(sha(raw('diff','--no-ext-diff','--no-textconv','--binary','--full-index','--no-renames',BASE,'--',f)),m.modified[f].patchSha256,f+' exact corrective patch');}
  else assert.equal(blob(read(f)),id,f+' immutable279');
 }
 assert.ok(Object.keys(m.modified).every(f=>f.startsWith('experiments/jupiter-beta-approval/integration/')||f==='vercel.json'));
 assert.ok(Object.keys(m.modified).every(f=>!f.includes('scope.test')&&!f.includes('/review.')));
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();
 assert.deepEqual(changed,[...Object.keys(m.modified),...Object.keys(m.added)].sort(),'finite reviewed additions/patches only');
 assert.deepEqual(Object.entries(m.added).filter(([,e])=>e.sha256===null).map(([f])=>f).sort(),['tests/jupiter-stop-correction/review.json','tests/jupiter-stop-correction/review.mjs','tests/jupiter-stop-correction/scope.test.mjs']);
 for(const[f,e]of Object.entries(m.added)){assert.equal(original.has(f),false);const s=fs.lstatSync(path.join(root,f));assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',e.mode,f);if(e.sha256)assert.equal(sha(read(f)),e.sha256,f);}
 const release=JSON.parse(read('experiments/jupiter-beta-approval/integration/release.json'));for(const f of ['externalCallsEnabled','databaseEnabled','trustEnrolled','acquisitionEnabled'])assert.equal(release[f],false);for(const f of ['ownerOrigin','validatorOrigin','authorityOrigin','neonDirectHost','publicTrust'])assert.equal(release[f],null);
 const pinsPath='experiments/jupiter-beta-approval/integration/durable/function-pins.json',oldPins=JSON.parse(raw('show',BASE+':'+pinsPath)),newPins=JSON.parse(read(pinsPath));assert.deepEqual(Object.keys(newPins).sort(),Object.keys(oldPins).sort());for(const k of Object.keys(oldPins))if(k==='transition')assert.notEqual(newPins[k],oldPins[k]);else assert.equal(newPins[k],oldPins[k],k+' original function unchanged');
 assert.deepEqual(JSON.parse(read('vercel.json')).git.deploymentEnabled,{'feat/278-turnkey-integration':false,'fix/279-clock-stop':false});
 if(git('rev-parse','HEAD')!==BASE){assert.equal(git('show','-s','--format=%P','HEAD'),BASE,'ONE dependent corrective commit');const head=git('ls-tree','-r','HEAD').split('\n');assert.deepEqual(head.map(l=>l.split('\t')[1]).sort(),[...original.keys(),...Object.keys(m.added)].sort());for(const line of head){const[meta,f]=line.split('\t'),[mode,,id]=meta.split(' ');assert.equal(blob(read(f)),id,f+' exact committed bytes');assert.equal(fs.lstatSync(path.join(root,f)).mode&0o111?'100755':'100644',mode,f);}}
 return m;
}
