// LOCAL/SYNTHETIC only. These tests load actual installed uploader dependencies.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';
import {tools} from '../../ops/native-beta-output/build.mjs';import {verifyUploaderGraph} from '../../ops/native-beta-output/toolchain-security.mjs';
const root=path.resolve('ops/native-beta-output/toolchain'),req=createRequire(path.join(root,'package.json'));
test('actual full installed graph and aliases match exact lock and all consumer resolution edges',()=>{
 tools(root);const report=verifyUploaderGraph(root);const tree=JSON.parse(execFileSync('npm',['ls','--prefix',root,'--all','--json'],{encoding:'utf8',maxBuffer:8*1024*1024}));// npm ls exits zero, but npm 11.9 retains six locked optional WASM children on Linux.
 // Prove the entire finite diagnostic closure, including peer edges; no audit or
 // invalid/missing/unlocked package error is exempted. verifyUploaderGraph checks each installed copy.
 const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'))),base=JSON.parse(execFileSync('git',['show','c4cecb3ae8370713d78d08ff308a65632c7719d3:ops/native-beta-output/toolchain/package-lock.json']));
 const roots=['@oxc-parser/binding-wasm32-wasi','@oxc-transform/binding-wasm32-wasi','@rolldown/binding-wasm32-wasi'],closure=new Set(),queue=[];
 for(const name of roots){const p='node_modules/'+name,v=lock.packages[p];assert.equal(v.optional,true);assert.deepEqual(v.cpu,['wasm32']);assert.notEqual(process.arch,'wasm32');assert.equal(fs.existsSync(path.join(root,p)),false);queue.push(...Object.keys(v.dependencies));}
 for(let i=0;i<queue.length;i++){const name=queue[i];if(closure.has(name))continue;closure.add(name);const p='node_modules/'+name,v=lock.packages[p];assert.equal(v.optional,true);assert.deepEqual(v,base.packages[p],'unchanged baseline optional record');queue.push(...Object.keys({...v.dependencies,...v.peerDependencies}));}
 assert.deepEqual([...closure].sort(),['@emnapi/core','@emnapi/runtime','@emnapi/wasi-threads','@napi-rs/wasm-runtime','@tybys/wasm-util','tslib']);
 const expected=[...closure].map(name=>'extraneous: '+name+'@'+lock.packages['node_modules/'+name].version+' '+path.join(root,'node_modules',name)).sort();
 assert.deepEqual(tree.problems.slice().sort(),expected,'only the exact locked platform-optional closure; all other diagnostics fail');
 console.log('NPM_LS_ZERO_EXIT_OPTIONAL_WASM_DIAGNOSTICS '+JSON.stringify({problems:tree.problems,uninstalledPlatformRoots:roots,allInstalledCopiesVerified:true,auditExemption:false}));
 assert.ok(report.edges.length>=25);assert.equal(Object.values(report.copies).filter(x=>x.name==='undici').every(x=>['6.29.1','7.30.1'].includes(x.version)),true);
 assert.equal(Object.values(report.copies).some(x=>x.name==='@fastify/busboy'),false);console.log('EXACT_RESOLVED_UPLOADER_GRAPH '+JSON.stringify(report));
});
test('all real builder modules and their actual parser schemas initialize with the pinned graph',async()=>{
 for(const name of ['@vercel/next','@vercel/node','@vercel/backends','@vercel/express','@vercel/hono','@vercel/python-analysis','@vercel/nft']){
  const mod=await import(pathToFileURL(req.resolve(name)).href);assert.ok(Object.keys(mod).length>0);console.log('REAL_CONSUMER_INITIALIZED '+JSON.stringify({name,exportCount:Object.keys(mod).length}));
 }
 const proxy=await import(pathToFileURL(path.join(root,'node_modules/vercel/dist/chunks/fetch-proxy-OC6B22AW.js')).href);console.log('REAL_PROXY_EXPORTS '+JSON.stringify(Object.keys(proxy)));
 const python=req('@vercel/python-analysis'),schemas=Object.entries(python).filter(([,x])=>x&&typeof x.safeParse==='function');assert.ok(schemas.length>=20);
 assert.equal(python.PipfileLikeSchema.safeParse({packages:{requests:'*'},source:[{name:'SYNTHETIC',url:'https://example.invalid/simple',verify_ssl:true}]}).success,true);
 assert.equal(python.PipfileLikeSchema.safeParse({packages:{requests:17}}).success,false);
 assert.equal(python.PyProjectTomlSchema.safeParse({project:{name:'synthetic',version:'0.0.0',dependencies:['synthetic>=1']}}).success,true);
 assert.equal(python.PyProjectTomlSchema.safeParse({project:{name:'synthetic',dependencies:[17]}}).success,false);
 console.log('REAL_PYTHON_SCHEMAS '+JSON.stringify({count:schemas.length,pipfileAndPyprojectPositiveAndNegative:true}));
});
test('actual AJV YAML TOML route parsers and Zod preserve valid/invalid boundaries',()=>{
 const Ajv=req('ajv'),ajv=new Ajv({$data:true});const check=ajv.compile({type:'object',properties:{label:{type:'string',minLength:1}},required:['label'],additionalProperties:false});assert.equal(check({label:'SYNTHETIC'}),true);assert.equal(check({label:1}),false);
 const yaml=req('js-yaml');assert.deepEqual(yaml.load('name: SYNTHETIC\ncount: 3\n'),{name:'SYNTHETIC',count:3});assert.throws(()=>yaml.load('name: [\n'));
 const toml=req('smol-toml');assert.equal(toml.parse('name = "SYNTHETIC"\ncount = 3').count,3);assert.throws(()=>toml.parse('name = ['));
 for(const p of ['node_modules/@vercel/node','node_modules/@vercel/remix-builder','node_modules/@vercel/backends','node_modules/@vercel/fun']){
  const r=createRequire(path.join(root,p,'package.json'))('path-to-regexp');const match=r.match('/SYNTHETIC/:id');assert.equal(match('/SYNTHETIC/one').params.id,'one');assert.equal(match('/OTHER/one'),false);
 }
 for(const p of ['vercel','@vercel/backends','@vercel/express','@vercel/hono','@vercel/python-analysis','@vercel/cli-auth','@vercel/cli-config']){
  const z=createRequire(path.join(root,'node_modules',p,'package.json'))('zod').z;
  const s=z.object({label:z.string(),map:z.record(z.string()),values:z.array(z.string()).max(2)}).strict();
  assert.equal(s.safeParse({label:'SYNTHETIC',map:{k:'v'},values:['one']}).success,true,p);
  for(const bad of [{label:1,map:{k:'v'},values:[]},{label:'SYNTHETIC',map:{k:1},values:[]},{label:'SYNTHETIC',map:{},values:['a','b','c']},{label:'SYNTHETIC',map:{},values:[],extra:true}])assert.equal(s.safeParse(bad).success,false,p);
 }
});
test('actual NFT traces bounded dynamic assets through upgraded glob; glob cancellation and minimatch API remain usable',async()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-uploader-nft-'));
 try{
  fs.mkdirSync(path.join(d,'data'));fs.writeFileSync(path.join(d,'data/one.json'),'{"SYNTHETIC":true}');fs.writeFileSync(path.join(d,'index.js'),"const fs=require('fs'),path=require('path');module.exports=n=>fs.readFileSync(path.join(__dirname,'data',n+'.json'));\n");
  const {nodeFileTrace}=req('@vercel/nft'),result=await nodeFileTrace([path.join(d,'index.js')],{base:d,processCwd:d});assert.ok(result.fileList.has('index.js'));assert.ok(result.fileList.has('data/one.json'));
  const glob=createRequire(req.resolve('@vercel/nft'))('glob');assert.deepEqual(await glob.glob('data/*.json',{cwd:d}),['data/one.json']);
  const controller=new AbortController();controller.abort(new Error('SYNTHETIC_STOP'));await assert.rejects(()=>glob.glob('**/*',{cwd:d,signal:controller.signal}),/SYNTHETIC_STOP/);
  const mm=createRequire(req.resolve('@vercel/python-analysis'))('minimatch');assert.deepEqual(mm.match(['a.py','b.js'],'*.py'),['a.py']);assert.equal(mm.minimatch('a.py','*.js'),false);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('positive installed graph rejects removed, extra nested and alias-version drift before any credential path',()=>{
 const target=path.join(root,'node_modules/path-to-regexp-updated/package.json'),original=fs.readFileSync(target);
 try{verifyUploaderGraph(root);const x=JSON.parse(original);x.version='6.1.0';fs.writeFileSync(target,JSON.stringify(x));assert.throws(()=>verifyUploaderGraph(root),/NATIVE_BUILD_HOLD/);}finally{fs.writeFileSync(target,original);}
 const parent=path.join(root,'node_modules/undici/node_modules/SYNTHETIC-unlocked');try{fs.mkdirSync(parent,{recursive:true});fs.writeFileSync(path.join(parent,'package.json'),'{"name":"SYNTHETIC-unlocked","version":"1.0.0"}');assert.throws(()=>verifyUploaderGraph(root),/NATIVE_BUILD_HOLD/);}finally{fs.rmSync(parent,{recursive:true,force:true});}
});
