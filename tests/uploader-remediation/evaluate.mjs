// Public-package evaluation only. No operational uploader/credentials/source/deployment.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
for(const n of ['VERCEL_TOKEN','NATIVE_ADMISSION_READ_TOKEN','UNFARMD_NATIVE_BUILD_ARCHIVE_KEY','UNFARMD_NATIVE_PREVIEW_DEPLOY_TOKEN','DATABASE_URL'])assert.ok(!process.env[n]);
const sha=b=>createHash('sha256').update(b).digest('hex');
const out=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'uploader-public-evaluation');fs.mkdirSync(out,{recursive:true});
const run=(args,cwd)=>spawnSync('npm',args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024,timeout:240000,env:{PATH:process.env.PATH,HOME:process.env.HOME,CI:'1',npm_config_registry:'https://registry.npmjs.org/',npm_config_ignore_scripts:'true'}});
const response=await fetch('https://registry.npmjs.org/vercel',{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);const registry=await response.json();
const stable=Object.keys(registry.versions).filter(v=>/^(64|65)\.\d+\.\d+$/.test(v)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const relevant=stable.filter(v=>v.localeCompare('64.5.0',undefined,{numeric:true})>=0);
const metadata=relevant.map(v=>({version:v,time:registry.time[v],engines:registry.versions[v].engines,dependencies:registry.versions[v].dependencies}));
fs.writeFileSync(path.join(out,'release-metadata.json'),JSON.stringify(metadata,null,2));
console.log('PUBLIC_RELEASE_METADATA '+JSON.stringify(metadata));
const last64=stable.filter(v=>v.startsWith('64.')).at(-1),latest=stable.at(-1);
const firstTransport=relevant.find(v=>/^[\^~]?(6|7|8)\./.test(registry.versions[v].dependencies?.undici||''));
const firstCleanLine=relevant.find(v=>v.localeCompare('65.12.0',undefined,{numeric:true})>=0);
const versions=[...new Set(['64.5.0',last64,firstTransport,firstCleanLine,latest].filter(Boolean))];
for(const version of versions){
 const d=path.join(out,version);fs.mkdirSync(d);const pkg={dependencies:{vercel:version},overrides:{'@vercel/container@19.1.3':{tar:'7.5.22'}}};fs.writeFileSync(path.join(d,'package.json'),JSON.stringify(pkg,null,2)+'\n');
 const install=run(['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],d);assert.equal(install.status,0,install.stderr);
 const audit=run(['audit','--json'],d);assert.ok(audit.status===0||audit.status===1,audit.stderr);const report=JSON.parse(audit.stdout);assert.ok(report.metadata&&!report.error);
 fs.writeFileSync(path.join(d,'audit.json'),audit.stdout);const lock=fs.readFileSync(path.join(d,'package-lock.json'));
 console.log('PUBLIC_CANDIDATE '+JSON.stringify({version,lockSha256:sha(lock),exit:audit.status,audit:report,lock:JSON.parse(lock)}));
}
console.log('PUBLIC_EVALUATION_ONLY_NO_SECURITY_CLEARANCE');
