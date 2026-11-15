// C-owned finite dependency correction. B owns combined-head inspection/approval integration.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='d98316ca4bda7120eeff5882688ba1e3364c04d5';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function review(root=process.cwd(),committed=true){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=p=>fs.readFileSync(path.join(root,p));
 const m=JSON.parse(read('tests/uploader-security/review.json'));assert.equal(m.base,BASE);assert.equal(git('rev-parse',BASE+'^{tree}'),'4f0ab6748bc57f099dbfcf889b3a563c9558d7b0');
 const modified=['ops/native-beta-output/build.mjs','ops/native-beta-output/policy.json','ops/native-beta-output/toolchain/package-lock.json','ops/native-beta-output/toolchain/package.json','tests/preview-preflight-diagnostics/tar-reachability.test.mjs','vercel.json'];
 assert.deepEqual(Object.keys(m.modified).sort(),modified.sort());
 for(const line of git('ls-tree','-r',BASE).split('\n')){const[a,p]=line.split('\t'),[mode,,id]=a.split(' '),s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',mode,p);if(!m.modified[p])assert.equal(blob(read(p)),id,p+' frozen baseline bytes');}
 const holes=['tests/uploader-security/review.json','tests/uploader-security/review.mjs','tests/uploader-security/scope.test.mjs'];
 for(const[p,x]of Object.entries({...m.modified,...m.added})){const s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink());assert.equal(s.mode&0o111?'100755':'100644',x.mode,p);if(x.sha256)assert.equal(hash(read(p)),x.sha256,p);if(m.added[p])assert.match(p,/^(?:tests\/uploader-security\/|ops\/native-beta-output\/toolchain-security\.mjs$|\.github\/workflows\/uploader-toolchain-security\.yml$)/);}
 assert.deepEqual(Object.entries(m.added).filter(([,x])=>x.sha256===null).map(([p])=>p).sort(),holes);
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(m.modified),...Object.keys(m.added)].sort());
 const old=JSON.parse(raw('show',BASE+':ops/native-beta-output/toolchain/package-lock.json')),next=JSON.parse(read('ops/native-beta-output/toolchain/package-lock.json'));
 old.packages['node_modules/tar']=structuredClone(old.packages['node_modules/@vercel/fun/node_modules/tar']);assert.deepEqual(next,old,'only affected tar entry may change; 385 other entries untouched');
 assert.deepEqual(JSON.parse(read('ops/native-beta-output/toolchain/package.json')),{dependencies:{vercel:'64.5.0'},overrides:{'@vercel/container@19.1.3':{tar:'7.5.22'}}});
 const policy=JSON.parse(read('ops/native-beta-output/policy.json')),before=JSON.parse(raw('show',BASE+':ops/native-beta-output/policy.json'));assert.equal(policy.toolLockSha256,hash(read('ops/native-beta-output/toolchain/package-lock.json')));before.toolLockSha256=policy.toolLockSha256;assert.deepEqual(policy,before,'all CLI/builder/file pins and security/identity/budget policies retained');
 const build=read('ops/native-beta-output/build.mjs').toString().replace("import {verifyTarGraph} from './toolchain-security.mjs';\n",'').replace(' verifyTarGraph(root);\n','');assert.equal(build,raw('show',BASE+':ops/native-beta-output/build.mjs').toString(),'no existing tool/source/frozen-build guard change');
 const oldV=JSON.parse(raw('show',BASE+':vercel.json'));oldV.git.deploymentEnabled['fix/uploader-tar-locked']=false;assert.deepEqual(JSON.parse(read('vercel.json')),oldV,'only topic false deployment flag');
 const ci=read('.github/workflows/uploader-toolchain-security.yml').toString();assert.doesNotMatch(ci,/workflow_dispatch|pull_request_target|secrets\.|environment:|contents:\s*write|continue-on-error|\|\| true|vercel deploy|upload\.mjs execute/);assert.match(ci,/npm audit --prefix ops\/native-beta-output\/toolchain --json \| tee/);assert.match(ci,/build-isolated\.sh verify-build/);assert.match(ci,/archive-tool\.sh check/);
 if(committed){assert.equal(git('show','-s','--format=%P','HEAD'),m.parent);assert.equal(git('status','--porcelain','--untracked-files=normal'),'');}
 return m;
}
