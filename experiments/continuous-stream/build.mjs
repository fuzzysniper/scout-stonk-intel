import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
execFileSync(process.execPath,[root+'node_modules/typescript/bin/tsc','experiments/continuous-stream/controller.ts','--target','ES2023','--module','commonjs','--strict','--skipLibCheck','--resolveJsonModule','--esModuleInterop','--rootDir','.','--outDir','out/continuous-stream'],{cwd:root,stdio:'inherit'});
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(head))throw Error('HEAD');
fs.writeFileSync(new URL('../../out/continuous-stream/head.json',import.meta.url),JSON.stringify({head})+'\n');
