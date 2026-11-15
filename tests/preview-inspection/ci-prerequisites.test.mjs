// CI-only regression. Synthetic local worktrees; no provider, hosted database or authority.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
import {Lexer,Parser,Evaluator,data} from '@actions/expressions';
import {policy} from '../../ops/native-beta-output/identity.mjs';
const installed='27bf59b6ace8f24bf113564b5aa0eb0558110fc4',branch='fix/294-release-ci-prerequisites';
const prereq=`      - name: Pinned replay prerequisites; no credentials or install scripts
        run: |
          npm install --global npm@11.9.0 --ignore-scripts --no-audit --no-fund
          test "$(npm --version)" = '11.9.0'
          npm ci --prefix ops/native-beta-output/toolchain --ignore-scripts --no-audit --no-fund
          node --input-type=module -e "import {tools} from './ops/native-beta-output/build.mjs'; tools('ops/native-beta-output/toolchain');"
`;
const source=fs.readFileSync('.github/workflows/native-beta-release.yml','utf8');
function jobs(text){return [...text.matchAll(/^  ([A-Za-z][A-Za-z0-9-]*):\n/gm)].map((m,i,a)=>({name:m[1],body:text.slice(m.index,a[i+1]?.index??text.length)}));}
function convert(x){if(typeof x==='string')return new data.StringData(x);if(typeof x==='boolean')return new data.BooleanData(x);return new data.Dictionary(...Object.entries(x).map(([key,value])=>({key,value:convert(value)})));}
function evaluate(expression,head,repo='fuzzysniper/scout-stonk-intel'){const tree=new Parser(new Lexer(expression).lex().tokens,['github'],[]).parse();return new Evaluator(tree,convert({github:{head_ref:head,repository:'fuzzysniper/scout-stonk-intel',event:{pull_request:{head:{repo:{full_name:repo}}}}}})).evaluate().coerceString()==='true';}
test('all seven complete release jobs execute on correction and installed branches at the exact event head',()=>{
 const list=jobs(source);assert.equal(list.length,7);
 for(const job of list){
  const condition=job.body.match(/^    if: (.*)$/m)[1];
  for(const ref of [branch,'native-pilot/private-beta-rc','ops/291-build-output-packet'])assert.equal(evaluate(condition,ref),true,job.name+' '+ref);
  for(const ref of ['main','unreviewed-branch','ops/293-get-only-inspection'])assert.equal(evaluate(condition,ref),false,job.name+' '+ref);
  assert.match(job.body,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(job.body,/fetch-depth: 0/);assert.match(job.body,/persist-credentials: false/);
  assert.equal(job.body.split(prereq).length-1,1,job.name);assert.ok(job.body.indexOf(prereq)<job.body.indexOf('      - run: npm ci --ignore-scripts'),job.name);
  assert.ok(job.body.indexOf(prereq)<job.body.indexOf('node --test tests/preview-inspection/scope.test.mjs'),job.name);
  assert.doesNotMatch(job.body,/secrets\.|environment:|workflow_dispatch|continue-on-error|\|\| true/);
 }
});
test('every original release test, command, permission, source-OFF flag and timeout is unchanged after removing only the added prerequisites and named branch',()=>{
 const normalized=source.replace('          bash tests/native-union-284/pg18-isolated.sh clock-diagnose\n','').replace('            node_modules/.cache/native-union-pg18-results/\n            node_modules/.cache/native-clock-diagnosis/\n','').replaceAll(prereq,'').replaceAll(" || github.head_ref == '"+branch+"'",'');
 assert.equal(normalized,execFileSync('git',['show',installed+':.github/workflows/native-beta-release.yml']).toString());
});
test('focused inspection and publisher regressions run on correction AND post-install release; fork denial and original commands remain',()=>{
 const text=fs.readFileSync('.github/workflows/preview-preflight-diagnostics.yml','utf8'),condition=text.match(/^    if: (.*)$/m)[1];
 for(const ref of [branch,'native-pilot/private-beta-rc','ops/293-get-only-inspection'])assert.equal(evaluate(condition,ref),true);
 assert.equal(evaluate(condition,branch,'SYNTHETIC/fork'),false);assert.equal(evaluate(condition,'main'),false);
 assert.match(text,/tests\/preview-inspection\/\*\.test\.mjs/);assert.match(text,/tests\/native-publisher-diagnostics\/run.sh/);assert.match(text,/no-database.mjs/);assert.doesNotMatch(text,/secrets\.|environment:|deployments: write|workflow_dispatch/);
 const check=`          test "$(npm --version)" = '11.9.0'\n`,tool=`          node --input-type=module -e "import {tools} from './ops/native-beta-output/build.mjs'; tools('ops/native-beta-output/toolchain');"\n`;
 const normalized=text.replace(condition,"github.head_ref == 'ops/293-get-only-inspection' && github.event.pull_request.head.repo.full_name == github.repository").replace(check,'').replace(tool,'').replace('npm ci --prefix ops/native-beta-output/toolchain --ignore-scripts --no-audit --no-fund','npm ci --prefix ops/native-beta-output/toolchain --ignore-scripts');
 assert.equal(normalized,execFileSync('git',['show',installed+':.github/workflows/preview-preflight-diagnostics.yml']).toString());
});
test('all locks, strict toolchain validator and actual manual owner workflow are byte-identical; only the new topic gets false deployment suppression',()=>{
 for(const p of ['package.json','package-lock.json','ops/native-beta-output/policy.json','ops/native-beta-output/toolchain/package.json','ops/native-beta-output/toolchain/package-lock.json','ops/native-beta-output/build.mjs','.github/workflows/native-pilot-admission.yml'])assert.deepEqual(p==='.github/workflows/native-pilot-admission.yml'?Buffer.from(fs.readFileSync(p,'utf8').replace('Non-authorizing 30-minute GET-only approval card','Non-authorizing five-minute GET-only approval card').replace('        run: |\n          set -o pipefail\n          node ops/native-beta-output/inspection-step.mjs | tee -a "$GITHUB_STEP_SUMMARY"','        run: node ops/native-beta-output/inspection-step.mjs >> "$GITHUB_STEP_SUMMARY"')):fs.readFileSync(p),execFileSync('git',['show',installed+':'+p]),p);
 const before=JSON.parse(execFileSync('git',['show',installed+':vercel.json'])),after=JSON.parse(fs.readFileSync('vercel.json'));assert.equal(after.git.deploymentEnabled[branch],false);assert.equal(after.git.deploymentEnabled[policy.branch],false);delete after.git.deploymentEnabled[branch];assert.deepEqual(after,before);
});
test('original replay tests and their assertions remain exact; only the finite reviewer and manifest pins change',()=>{
 const file='tests/preview-inspection/scope.test.mjs',normalize=s=>s.replace(/const REVIEWER='[a-f0-9]{64}',MANIFEST='[a-f0-9]{64}';/,"const REVIEWER='PIN',MANIFEST='PIN';");
 assert.equal(normalize(fs.readFileSync(file,'utf8')),normalize(execFileSync('git',['show',installed+':'+file]).toString()));
 for(const file of ['tests/preview-preflight-diagnostics/scope.test.mjs','tests/preview-preflight-diagnostics/review.mjs','tests/preview-preflight-diagnostics/review.json','tests/native-beta-output/scope.test.mjs'])assert.deepEqual(fs.readFileSync(file),execFileSync('git',['show',installed+':'+file]),file);
});
test('both historical worktree generations resolve the SAME pinned toolchain and root dependencies and pass the unchanged validator',()=>{
 const root=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ci-nested-replay-')),children=[];
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 try{
  let parent=root;
  for(const [i,sha]of ['653f3dd4a636a2781b50d3c2891d71a84a7289e7','972dc257f75c3f88087c49feda803af9e3bc7b7c'].entries()){
   const child=path.join(temp,String(i));execFileSync('git',['worktree','add','--quiet','--detach',child,sha]);children.push(child);
   fs.symlinkSync(path.join(parent,'node_modules'),path.join(child,'node_modules'));fs.symlinkSync(path.join(parent,'ops/native-beta-output/toolchain/node_modules'),path.join(child,'ops/native-beta-output/toolchain/node_modules'));
   assert.equal(fs.realpathSync(path.join(child,'node_modules')),fs.realpathSync(path.join(root,'node_modules')));
   assert.equal(fs.realpathSync(path.join(child,'ops/native-beta-output/toolchain/node_modules')),fs.realpathSync(path.join(root,'ops/native-beta-output/toolchain/node_modules')));
   assert.deepEqual(fs.readFileSync(path.join(child,'ops/native-beta-output/toolchain/package-lock.json')),fs.readFileSync(path.join(root,'ops/native-beta-output/toolchain/package-lock.json')));
   const result=execFileSync(process.execPath,['--input-type=module','-e',"import {tools} from './ops/native-beta-output/build.mjs'; tools('ops/native-beta-output/toolchain'); console.log('PINNED_NESTED_REPLAY_VALIDATED');"],{cwd:child,env}).toString();assert.equal(result.trim(),'PINNED_NESTED_REPLAY_VALIDATED');parent=child;
  }
 }finally{for(const child of children.reverse())execFileSync('git',['worktree','remove','--force',child],{stdio:'ignore'});fs.rmSync(temp,{recursive:true,force:true});}
});
