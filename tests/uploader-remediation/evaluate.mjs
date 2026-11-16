// Public package experiment ONLY. Candidate bytes do not change operational pins.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
for(const n of ['VERCEL_TOKEN','NATIVE_ADMISSION_READ_TOKEN','UNFARMD_NATIVE_BUILD_ARCHIVE_KEY','UNFARMD_NATIVE_PREVIEW_DEPLOY_TOKEN','DATABASE_URL'])assert.ok(!process.env[n]);
const sha=b=>createHash('sha256').update(b).digest('hex'),out=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'uploader-public-evaluation');fs.mkdirSync(out,{recursive:true});
const run=(args,cwd)=>spawnSync('npm',args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024,timeout:240000,env:{PATH:process.env.PATH,HOME:process.env.HOME,CI:'1',npm_config_registry:'https://registry.npmjs.org/',npm_config_ignore_scripts:'true'}});
for(const name of ['smol-toml','undici','glob','minimatch','zod','@vercel/node','@vercel/backends','@vercel/python-analysis']){
 const r=await fetch('https://registry.npmjs.org/'+encodeURIComponent(name),{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const p=await r.json(),v=p['dist-tags'].latest;console.log('PUBLIC_PACKAGE_METADATA '+JSON.stringify({name,latest:v,meta:p.versions[v],recent:Object.keys(p.versions).filter(x=>/^\d+\.\d+\.\d+$/.test(x)).slice(-6)}));
}
const same={'@vercel/container@19.1.3':{tar:'7.5.22'},'ajv@8.6.3':'8.18.0','js-yaml@4.1.1':'4.3.2','smol-toml@1.5.2':'1.9.0','path-to-regexp@6.1.0':'6.3.0','path-to-regexp@8.3.0':'8.4.0','zod@4.1.11':'4.6.6','minimatch@10.1.1':'10.2.6'};
const transport={...same,'undici@5.28.4':'6.29.1','undici@5.29.0':'6.29.1'};
const all={...transport,'zod@3.22.4':'4.6.6','glob@13.0.6':'14.0.2','minimatch@10.1.1':'11.0.1','minimatch@10.2.6':'11.0.1'};
for(const [label,overrides] of Object.entries({majorCompatibilityExperiment:all})){
 const d=path.join(out,label);fs.mkdirSync(d);fs.copyFileSync('ops/native-beta-output/toolchain/package-lock.json',path.join(d,'package-lock.json'));const pkg={dependencies:{vercel:'64.5.0'},overrides};fs.writeFileSync(path.join(d,'package.json'),JSON.stringify(pkg,null,2)+'\n');
 const install=run(['install','--ignore-scripts','--no-audit','--no-fund'],d);if(install.status!==0){console.log('PUBLIC_INSTALL_FAILURE '+JSON.stringify({label,status:install.status,stderr:install.stderr}));throw Error('PUBLIC_CANDIDATE_INSTALL_FAILED');}
 const audit=run(['audit','--json'],d);assert.ok(audit.status===0||audit.status===1,audit.stderr);const report=JSON.parse(audit.stdout);assert.ok(report.metadata&&!report.error);fs.writeFileSync(path.join(d,'audit.json'),audit.stdout);
 const lock=fs.readFileSync(path.join(d,'package-lock.json'));console.log('PUBLIC_CANDIDATE '+JSON.stringify({label,pkg,lockSha256:sha(lock),exit:audit.status,audit:report,lock:JSON.parse(lock)}));
 if(label==='majorCompatibilityExperiment'){
  const consumers=['vercel','@vercel/node','@vercel/backends','@vercel/express','@vercel/hono','@vercel/python-analysis','@vercel/nft'];
  const rows=[];
  for(const name of consumers){const dir=path.join(d,'node_modules',name),pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json')));console.log('PUBLIC_CONSUMER_PACKAGE '+JSON.stringify({name,version:pkg.version,main:pkg.main,exports:pkg.exports,types:pkg.types}));
   const walk=(p)=>{for(const x of fs.readdirSync(p,{withFileTypes:true})){const file=path.join(p,x.name);if(x.isDirectory()&&x.name!=='node_modules')walk(file);else if(/\.(?:[cm]?js|ts)$/.test(x.name)&&!x.name.endsWith('.d.ts')){const text=fs.readFileSync(file,'utf8');const hits=[...text.matchAll(/(?:["'](?:undici|zod|glob|minimatch)["']|\.deepPartial\(|\.errors\b|\.record\()/g)].map(m=>({line:text.slice(0,m.index).split('\n').length,context:text.slice(Math.max(0,m.index-100),m.index+260)}));if(hits.length)rows.push({path:path.relative(d,file),sha256:sha(text),hits:hits.slice(0,30)});}}};walk(dir);
  }console.log('PUBLIC_CONSUMER_SOURCE '+JSON.stringify(rows));
 }
 if(label==='majorCompatibilityExperiment'){
  const probe=String.raw`const{createRequire}=require('node:module');const path=require('node:path');const q=createRequire(path.resolve('node_modules/@vercel/python-analysis/package.json'));const z=q('zod');console.log(JSON.stringify({zod:q('zod/package.json').version,recordOneArgument:z.record(z.string()).safeParse({valid:'SYNTHETIC'}),errorErrors:z.string().safeParse(1).error.errors}));`;
  const p=spawnSync(process.execPath,['-e',probe],{cwd:d,encoding:'utf8',timeout:15000});console.log('PUBLIC_MAJOR_PROBE '+JSON.stringify({status:p.status,stdout:p.stdout,stderr:p.stderr}));
 }
}
console.log('PUBLIC_EVALUATION_ONLY_NO_SECURITY_CLEARANCE');
