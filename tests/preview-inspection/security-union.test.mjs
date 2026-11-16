// Exact B/C source union, original reviewer replays and CI routing. Synthetic/OFF only.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
import {Lexer,Parser,Evaluator,data} from '@actions/expressions';
import {legacyToolModules} from './legacy-tools.mjs';
import {tools} from '../../ops/native-beta-output/build.mjs';
const B='b47d7efa58131a28d8c836fd8fd55ab669b08754',C='37e4a39caf2976f4575c2b8c4358e30b1e1b51d8';
const original=(sha,p)=>execFileSync('git',['show',sha+':'+p]),read=p=>fs.readFileSync(p);
test('both exact reviewed histories survive; B inspection and C tool/runtime/security bytes stay exact',()=>{
 for(const sha of [B,C])execFileSync('git',['merge-base','--is-ancestor',sha,'HEAD']);
 for(const p of ['verify.mjs','step.mjs'])assert.deepEqual(read('ops/native-beta-output/'+p),original(B,'ops/native-beta-output/'+p),p);
 for(const p of ['ops/native-beta-output/build.mjs','ops/native-beta-output/policy.json','ops/native-beta-output/toolchain/package.json','ops/native-beta-output/toolchain/package-lock.json','ops/native-beta-output/toolchain-security.mjs','tests/uploader-security/graph.test.mjs','tests/uploader-security/tar-worker.mjs','tests/uploader-security/review.json','tests/uploader-security/review.mjs','tests/uploader-security/scope.test.mjs','tests/preview-preflight-diagnostics/tar-reachability.test.mjs'])assert.deepEqual(read(p),original(C,p),p);
});
test('C immutable scope and adversarial guards execute unchanged on C; current union has its own pinned full-tree guard',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-C-immutable-review-'));
 try{
  execFileSync('git',['worktree','add','--quiet','--detach',dir,C]);const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const log=execFileSync(process.execPath,['--test','--test-reporter=tap','tests/uploader-security/scope.test.mjs'],{cwd:dir,env,timeout:60000,maxBuffer:1024*1024}).toString();
  for(const marker of ['# tests 2','# pass 2','# fail 0','# skipped 0'])assert.ok(log.includes(marker),marker);
 }finally{execFileSync('git',['worktree','remove','--force',dir],{stdio:'ignore'});}
});
test('only known CI source selectors/replay routing change; audit failures, build/source-OFF and all original commands remain',()=>{
 const p='.github/workflows/uploader-toolchain-security.yml',source=read(p).toString().replaceAll(" || github.head_ref == 'fix/preview-alias-completeness'",'');
 const oldIf="github.head_ref == 'fix/uploader-tar-locked' &&",newIf="(github.head_ref == 'fix/uploader-tar-locked' || github.head_ref == 'fix/294-release-ci-prerequisites' || github.head_ref == 'native-pilot/private-beta-rc') &&";
 assert.equal(source.split(newIf).length-1,4);
 const normalize=source.replaceAll(newIf,oldIf).replaceAll('          node tests/preview-inspection/legacy-tools.mjs\n','').replace('          node --test tests/uploader-security/graph.test.mjs\n          node --test tests/preview-inspection/security-union.test.mjs','          node --test tests/uploader-security/*.test.mjs').replaceAll('          node --test tests/preview-inspection/scope.test.mjs','          node --test tests/uploader-security/scope.test.mjs').replace('git switch --create "$GITHUB_HEAD_REF" "$EXPECTED_HEAD"','git switch --create fix/uploader-tar-locked "$EXPECTED_HEAD"');
 assert.equal(normalize,original(C,p).toString());assert.match(source,/npm audit --prefix ops\/native-beta-output\/toolchain --json \| tee/);assert.doesNotMatch(source,/audit-level|continue-on-error|\|\| true|secrets\.|environment:|deployments: write|workflow_dispatch/);
 const convert=x=>typeof x==='string'?new data.StringData(x):new data.Dictionary(...Object.entries(x).map(([key,value])=>({key,value:convert(value)})));
 for(const m of source.matchAll(/^    if: (.+)$/gm))for(const branch of ['fix/uploader-tar-locked','fix/294-release-ci-prerequisites','native-pilot/private-beta-rc','main','UNKNOWN'])for(const repo of ['fuzzysniper/scout-stonk-intel','SYNTHETIC/fork']){
  const ast=new Parser(new Lexer(m[1]).lex().tokens,['github'],[]).parse(),ctx=convert({github:{head_ref:branch,repository:'fuzzysniper/scout-stonk-intel',event:{pull_request:{head:{repo:{full_name:repo}}}}}});
  const ok=new Evaluator(ast,ctx).evaluate().coerceString()==='true';assert.equal(ok,branch!=='main'&&branch!=='UNKNOWN'&&repo==='fuzzysniper/scout-stonk-intel');
 }
});
test('legacy dependency graph is original test-only input, never an uploader fallback or weakened validator',()=>{
 const modules=legacyToolModules(),root=path.dirname(modules),old='653f3dd4a636a2781b50d3c2891d71a84a7289e7';
 assert.ok(root.includes('LEGACY_TEST_ONLY_tools_653'));for(const p of ['package.json','package-lock.json'])assert.deepEqual(fs.readFileSync(path.join(root,p)),original(old,'ops/native-beta-output/toolchain/'+p));
 assert.equal(JSON.parse(fs.readFileSync(path.join(modules,'tar/package.json'))).version,'7.5.11');
 assert.equal(JSON.parse(fs.readFileSync('ops/native-beta-output/toolchain/node_modules/tar/package.json')).version,'7.5.22');
 assert.throws(()=>tools(root),e=>e.message==='NATIVE_BUILD_HOLD','current operational validator refuses the legacy test-only graph');
 for(const p of ['ops/native-beta-output/build.mjs','ops/native-beta-output/upload.mjs','ops/native-beta-output/inspect-only.mjs'])assert.doesNotMatch(read(p).toString(),/legacyTool|LEGACY_TEST_ONLY/);
 for(const workflow of ['native-beta-release.yml','preview-preflight-diagnostics.yml'])assert.ok(read('.github/workflows/'+workflow).toString().includes('node tests/preview-inspection/legacy-tools.mjs'));
});
