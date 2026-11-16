// Finite C-owned dependency delta; all B/source/incident/approval bytes frozen.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='c4cecb3ae8370713d78d08ff308a65632c7719d3';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd(),committed=true){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=p=>fs.readFileSync(path.join(root,p));
 const m=JSON.parse(read('tests/uploader-remediation/review.json'));assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'9c5be2c6e1117aecb4a7e6e3690b3b57cea53ac0');raw('merge-base','--is-ancestor',BASE,'HEAD');
 const permitted=['ops/native-beta-output/build.mjs','ops/native-beta-output/policy.json','ops/native-beta-output/toolchain/package-lock.json','ops/native-beta-output/toolchain/package.json','ops/native-beta-output/toolchain-security.mjs','vercel.json'];assert.deepEqual(Object.keys(m.modified).sort(),permitted.sort());
 for(const line of git('ls-tree','-r',BASE).split('\n')){
  const[a,p]=line.split('\t'),[mode,,id]=a.split(' '),s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',mode,p);if(!m.modified[p])assert.equal(blob(read(p)),id,p+' frozen baseline bytes');
 }
 const holes=['tests/uploader-remediation/review.json','tests/uploader-remediation/review.mjs','tests/uploader-remediation/scope.test.mjs'];
 for(const[p,x]of Object.entries({...m.modified,...m.added})){const s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111?'100755':'100644',x.mode,p);if(x.sha256)assert.equal(hash(read(p)),x.sha256,p);if(m.added[p])assert.match(p,/^(?:tests\/uploader-remediation\/|\.github\/workflows\/uploader-remediation\.yml$)/);}
 assert.deepEqual(Object.entries(m.added).filter(([,x])=>x.sha256===null).map(([p])=>p).sort(),holes);
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(m.modified),...Object.keys(m.added)].sort());
 const policy=JSON.parse(read('ops/native-beta-output/policy.json')),before=JSON.parse(raw('show',BASE+':ops/native-beta-output/policy.json'));assert.equal(policy.toolLockSha256,hash(read('ops/native-beta-output/toolchain/package-lock.json')));before.toolLockSha256=policy.toolLockSha256;assert.deepEqual(policy,before,'unchanged CLI/builder hashes, identity, budget and production controls');
 const build=read('ops/native-beta-output/build.mjs').toString().replace('{verifyTarGraph,verifyUploaderGraph}','{verifyTarGraph}').replace(' verifyTarGraph(root);verifyUploaderGraph(root);',' verifyTarGraph(root);');assert.equal(build,raw('show',BASE+':ops/native-beta-output/build.mjs').toString(),'all existing build/security predicates intact');
 const old=JSON.parse(raw('show',BASE+':vercel.json'));old.git.deploymentEnabled['fix/uploader-security-remediation']=false;assert.deepEqual(JSON.parse(read('vercel.json')),old);
 const ci=read('.github/workflows/uploader-remediation.yml').toString();assert.doesNotMatch(ci,/workflow_dispatch|pull_request_target|secrets\.|environment:|contents:\s*write|continue-on-error|\|\| true|audit-level|npm audit fix|vercel deploy|upload\.mjs execute/);assert.match(ci,/npm audit --prefix ops\/native-beta-output\/toolchain --json \| tee/);assert.match(ci,/build-isolated\.sh verify-build/);assert.match(ci,/archive-tool\.sh check/);assert.match(ci,/persist-credentials: false/);
 if(committed){assert.equal(git('show','-s','--format=%P','HEAD'),m.parent);assert.equal(git('status','--porcelain','--untracked-files=normal'),'');}
 return m;
}
