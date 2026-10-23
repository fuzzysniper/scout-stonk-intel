import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=fileURLToPath(new URL('../../',import.meta.url));
execFileSync(process.execPath,[root+'node_modules/typescript/bin/tsc','experiments/live-stream/worker.ts',
  '--target','ES2023','--module','commonjs','--strict','--skipLibCheck','--resolveJsonModule','--esModuleInterop',
  '--rootDir','.', '--outDir','out/live-stream'],{cwd:root,stdio:'inherit'});
const require=createRequire(import.meta.url),policy=require('../../out/live-stream/experiments/live-stream/policy.js');
const expected={scope:policy.SCOPE,scopeHash:policy.SCOPE_HASH,workerPolicyHash:policy.WORKER_POLICY_HASH};
if(JSON.stringify(JSON.parse(fs.readFileSync(new URL('./scope.json',import.meta.url),'utf8')))!==JSON.stringify(expected))throw Error('SCOPE_ARTIFACT_MISMATCH');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(head))throw Error('EXACT_BUILD_HEAD_REQUIRED');
fs.writeFileSync(new URL('../../out/live-stream/head.json',import.meta.url),JSON.stringify({head})+'\n');
