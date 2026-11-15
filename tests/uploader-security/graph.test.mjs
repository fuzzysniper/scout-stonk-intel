import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {verifyTarGraph,TAR_PATHS,TAR_VERSION} from '../../ops/native-beta-output/toolchain-security.mjs';
import {tools} from '../../ops/native-beta-output/build.mjs';
const root=path.resolve('ops/native-beta-output/toolchain');
test('actual npm-ci uploader has exactly both patched tar copies and the original pinned CLI/builders',()=>{
 assert.ok(tools(root).endsWith('/vercel/dist/index.js'));const report=verifyTarGraph(root);assert.deepEqual(report.copies,TAR_PATHS);assert.equal(report.tar,'7.5.22');
 const tree=JSON.parse(execFileSync('npm',['ls','--prefix',root,'tar','--all','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));assert.ok(!tree.problems);console.log(JSON.stringify(report));
});
test('SYNTHETIC installed graph fixture rejects vulnerable/root/nested/extra/missing/symlink copies, integrity and override drift',()=>{
 const mutations=[
  d=>{const p=path.join(d,'node_modules/tar/package.json'),x=JSON.parse(fs.readFileSync(p));x.version='7.5.19';fs.writeFileSync(p,JSON.stringify(x));},
  d=>{const p=path.join(d,TAR_PATHS[0],'package.json'),x=JSON.parse(fs.readFileSync(p));x.version='7.5.11';fs.writeFileSync(p,JSON.stringify(x));},
  d=>{const p=path.join(d,'package-lock.json'),x=JSON.parse(fs.readFileSync(p));x.packages['node_modules/tar'].integrity='sha512-SYNTHETIC';fs.writeFileSync(p,JSON.stringify(x));},
  d=>{const p=path.join(d,'package-lock.json'),x=JSON.parse(fs.readFileSync(p));x.packages['node_modules/tar'].version='7.5.18';fs.writeFileSync(p,JSON.stringify(x));},
  d=>{fs.rmSync(path.join(d,TAR_PATHS[0]),{recursive:true});},
  d=>{const p=path.join(d,TAR_PATHS[0]);fs.rmSync(p,{recursive:true});fs.symlinkSync(path.join(d,'node_modules/tar'),p);},
  d=>{const p=path.join(d,'node_modules/@extra/parent/node_modules/tar');fs.mkdirSync(p,{recursive:true});fs.writeFileSync(path.join(p,'package.json'),JSON.stringify({name:'tar',version:TAR_VERSION}));},
  d=>{const p=path.join(d,'package.json'),x=JSON.parse(fs.readFileSync(p));x.overrides['@vercel/container@19.1.3'].tar='^7.5.22';fs.writeFileSync(p,JSON.stringify(x));},
  d=>{const p=path.join(d,'package.json'),x=JSON.parse(fs.readFileSync(p));x.overrides={tar:TAR_VERSION};fs.writeFileSync(p,JSON.stringify(x));},
 ];
 for(const mutate of mutations){const d=fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-uploader-graph-'));try{
  for(const f of ['package.json','package-lock.json'])fs.copyFileSync(path.join(root,f),path.join(d,f));
  for(const p of [...TAR_PATHS,'node_modules/@vercel/container','node_modules/@mapbox/node-pre-gyp','node_modules/@vercel/fun']){fs.mkdirSync(path.join(d,p),{recursive:true});fs.copyFileSync(path.join(root,p,'package.json'),path.join(d,p,'package.json'));}
  assert.equal(verifyTarGraph(d).tar,TAR_VERSION);mutate(d);assert.throws(()=>verifyTarGraph(d),e=>e.message==='NATIVE_BUILD_HOLD');
 }finally{fs.rmSync(d,{recursive:true,force:true});}}
});
for(const copy of TAR_PATHS)test('REAL resolved '+copy+' bounded synthetic API/DoS regressions',{timeout:15000},()=>{
 const env={PATH:process.env.PATH,NODE_OPTIONS:'--import='+path.resolve('tests/security114/local-only.mjs')};
 const report=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=96','tests/uploader-security/tar-worker.mjs',path.join(root,copy,'package.json')],{env,encoding:'utf8',timeout:10000,maxBuffer:65536}));
 assert.equal(report.version,TAR_VERSION);for(const p of ['roundTrip','boundedRatioControl','boundedRatioRejected','longPathControl','memberSelectionCompleted'])assert.equal(report[p],true);assert.equal(report.networkRequests,0);console.log(JSON.stringify({...report,copy}));
});
