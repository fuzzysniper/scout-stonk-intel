// Finite integration, not an allowance for arbitrary future source changes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {BASE,B,C,branch} from './inputs.mjs';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd(),committed=true){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=p=>fs.readFileSync(path.join(root,p));
 const m=JSON.parse(read('tests/preview-union/review.json'));assert.deepEqual(m.inputs,{BASE,B,C});
 for(const sha of [B,C])raw('merge-base','--is-ancestor',sha,'HEAD');
 assert.equal(git('rev-parse',BASE+'^{tree}'),'9c5be2c6e1117aecb4a7e6e3690b3b57cea53ac0');
 for(const line of git('ls-tree','-r',BASE).split('\n')){const[a,p]=line.split('\t'),[mode,,id]=a.split(' '),s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',mode,p);if(!m.modified[p])assert.equal(blob(read(p)),id,p+' frozen input');}
 const holes=['tests/preview-union/review.json','tests/preview-union/review.mjs','tests/preview-union/scope.test.mjs'];
 for(const[p,x]of Object.entries({...m.modified,...m.added})){const s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',x.mode,p);if(x.sha256)assert.equal(hash(read(p)),x.sha256,p);}
 assert.deepEqual(Object.entries({...m.modified,...m.added}).filter(([,x])=>x.sha256===null).map(([p])=>p).sort(),holes);
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(m.modified),...Object.keys(m.added)].sort());
 // Preserve both reviewers and all actual reviewed runtime changes, not just SHAs.
 for(const sha of [B,C]){const files=git('diff','--name-only',BASE,sha).split('\n');for(const p of files){if(p==='vercel.json'||p.startsWith('.github/workflows/'))continue;if(p==='tests/preview-preflight-diagnostics/contracts.test.mjs'){assert.equal(read(p).toString().replaceAll(C+':ops/native-beta-output/','37e4a39caf2976f4575c2b8c4358e30b1e1b51d8:ops/native-beta-output/'),raw('show',B+':'+p).toString());continue;}assert.deepEqual(read(p),raw('show',sha+':'+p),p+' exact reviewed bytes');}}
 const v=JSON.parse(raw('show',BASE+':vercel.json'));for(const ref of ['fix/preview-alias-completeness','fix/uploader-security-remediation',branch])v.git.deploymentEnabled[ref]=false;assert.deepEqual(JSON.parse(read('vercel.json')),v);
 if(committed)assert.equal(git('status','--porcelain','--untracked-files=normal'),'');return m;
}
