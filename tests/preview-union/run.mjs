// Scope guards run unchanged on their exact reviewed inputs. Current behavioral
// tests run on the actual union; a new whole-tree guard pins the finite delta.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {B,C} from './inputs.mjs';import {historicalTools} from './historical-tools.mjs';
const env={...process.env};delete env.NODE_TEST_CONTEXT;
const run=(args,cwd=process.cwd())=>execFileSync(process.execPath,args,{cwd,env,stdio:'inherit',timeout:300000});
function replay(sha,files,graph){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-union-review-'));try{execFileSync('git',['worktree','add','--quiet','--detach',dir,sha]);fs.symlinkSync(path.resolve('node_modules'),dir+'/node_modules');if(graph)fs.symlinkSync(graph,dir+'/ops/native-beta-output/toolchain/node_modules');run(['--test',...files],dir);}finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}}
const mode=process.argv[2];
if(mode==='historical'){
 replay(B,fs.readdirSync('tests/preview-inspection').filter(p=>p.endsWith('.test.mjs')).map(p=>'tests/preview-inspection/'+p).concat('tests/preview-preflight-diagnostics/contracts.test.mjs'),historicalTools());
 replay(C,['tests/uploader-remediation/scope.test.mjs']);
}else if(mode==='focused'){
 const legacy=new Set(['alias-preservation.test.mjs','ci-prerequisites.test.mjs','scope.test.mjs','security-union.test.mjs']);
 run(['--test',...fs.readdirSync('tests/preview-inspection').filter(p=>p.endsWith('.test.mjs')&&!legacy.has(p)).map(p=>'tests/preview-inspection/'+p),...process.argv.slice(3)]);
}else if(mode!=='scope')throw Error('UNKNOWN_TEST_MODE');
run(['--test','tests/preview-union/scope.test.mjs','tests/preview-union/focus-evidence.test.mjs']);
