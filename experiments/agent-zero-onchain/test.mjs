// Portable offline-only test harness. No provider transport or approval enabled.
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),build=fs.mkdtempSync(path.join(os.tmpdir(),'scout-pump-tests-'));
try{
 const compiled=spawnSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'experiments/agent-zero-onchain/cli.ts','--resolveJsonModule','--target','ES2022','--module','commonjs','--moduleResolution','node','--strict','--skipLibCheck','--esModuleInterop','--rootDir','.','--outDir',build],{cwd:root,stdio:'inherit'});
 if(compiled.status!==0)process.exitCode=1;
 else{const files=fs.readdirSync(path.join(here,'tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>path.join(here,'tests',f));process.exitCode=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit',env:{...process.env,PUMPSWAP_TEST_BUILD:build}}).status??1;}
}finally{fs.rmSync(build,{recursive:true,force:true});}
