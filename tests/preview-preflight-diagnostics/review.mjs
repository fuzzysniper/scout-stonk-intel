// Finite unapplied correction; original baseline reviewers stay immutable and are replayed.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='972dc257f75c3f88087c49feda803af9e3bc7b7c';export const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd(),committed=true){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=p=>fs.readFileSync(path.join(root,p));
 assert.equal(git('rev-parse',BASE+'^{tree}'),'d4f046f798271d07e52c4b2503f31697c97e9042');const m=JSON.parse(read('tests/preview-preflight-diagnostics/review.json'));assert.equal(m.base,BASE);
 assert.deepEqual(Object.keys(m.modified).sort(),['.github/workflows/native-beta-release.yml','ops/native-beta-output/upload.mjs','ops/native-beta-output/verify.mjs']);
 for(const line of git('ls-tree','-r',BASE).split('\n')){const [a,p]=line.split('\t'),[mode,,id]=a.split(' '),s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',mode,p);if(!m.modified[p])assert.equal(blob(read(p)),id,p+' immutable original');}
 for(const [p,x]of Object.entries({...m.modified,...m.added})){assert.ok(m.modified[p]||p.startsWith('ops/native-beta-output/')||p.startsWith('tests/preview-preflight-diagnostics/')||p==='.github/workflows/preview-preflight-diagnostics.yml');const s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111?'100755':'100644',x.mode);if(x.sha256)assert.equal(hash(read(p)),x.sha256,p);}
 assert.deepEqual(Object.entries(m.added).filter(([,x])=>x.sha256===null).map(([p])=>p).sort(),['tests/preview-preflight-diagnostics/review.json','tests/preview-preflight-diagnostics/review.mjs','tests/preview-preflight-diagnostics/scope.test.mjs']);
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(m.modified),...Object.keys(m.added)].sort());
 const ci=read('.github/workflows/native-beta-release.yml').toString().replaceAll('tests/preview-preflight-diagnostics/scope.test.mjs','tests/native-beta-output/scope.test.mjs');assert.equal(ci,raw('show',BASE+':.github/workflows/native-beta-release.yml').toString(),'no original job/check removed or skipped');
 const workflow=read('.github/workflows/preview-preflight-diagnostics.yml').toString();assert.doesNotMatch(workflow,/workflow_dispatch|\$\{\{\s*secrets\.|environment:|deployments:\s*write|upload-artifact|vercel deploy/);assert.match(workflow,/no-database\.mjs/);
 if(committed){assert.equal(git('show','-s','--format=%P','HEAD'),BASE);for(const line of git('ls-tree','-r','HEAD').split('\n')){const [a,p]=line.split('\t');assert.equal(blob(read(p)),a.split(' ')[2],p+' committed bytes');}}
 return m;
}
