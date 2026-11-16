// Real Actions expression evaluation; no dispatch, external credential or write.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
import {Lexer,Parser,Evaluator,data} from '@actions/expressions';import ts from 'typescript';
import {policy,canonical} from '../../ops/native-beta-output/identity.mjs';
import {inspectionCard} from '../../ops/native-beta-output/inspection-context.mjs';
const text=fs.readFileSync('.github/workflows/native-pilot-admission.yml','utf8');
function job(name){return text.split('\n  '+name+':\n')[1].split(/\n  [a-z][a-z-]*:\n/)[0];}
function convert(x){if(x==null)return new data.Null();if(typeof x==='string')return new data.StringData(x);if(typeof x==='number')return new data.NumberData(x);if(typeof x==='boolean')return new data.BooleanData(x);return new data.Dictionary(...Object.entries(x).map(([key,v])=>({key,value:convert(v)})));}
function evaluate(condition,c){const f={name:'startsWith',minArgs:2,maxArgs:2,call:(a,b)=>new data.BooleanData(a.coerceString().startsWith(b.coerceString()))};const t=new Parser(new Lexer(condition).lex().tokens,['inputs','github'],[f]).parse();return new Evaluator(t,convert(c),new Map([[f.name,f]])).evaluate().coerceString()==='true';}
const sha='a'.repeat(40),valid={inputs:{mode:'preview-inspect',deployment:'',preview_starts_at:'',preview_expires_at:'',approved_sha:sha},github:{sha,repository_id:String(policy.repositoryId),actor_id:String(policy.ownerId),run_attempt:1,ref:'refs/heads/'+policy.branch}};
test('actual Actions evaluation: inspection isolates ALL four publisher/upload jobs and both inspection jobs require exact manual owner identity',()=>{
 const condition=n=>job(n).match(/    if: (.*)/)[1];
 for(const n of ['context','publish','preview-context','preview-output'])assert.equal(evaluate(condition(n),valid),false,n+' unreachable');
 for(const n of ['inspection-context','inspection-read-only']){
  assert.equal(evaluate(condition(n),valid),true,n);
  for(const patch of [{actor_id:'1'},{run_attempt:2},{sha:'b'.repeat(40)},{ref:'refs/heads/main'},{repository_id:'1'}])assert.equal(evaluate(condition(n),{...valid,github:{...valid.github,...patch}}),false,n);
  for(const patch of [{mode:'preview-output'},{mode:'rehearsal'},{mode:'setup'},{mode:'source'},{mode:'UNKNOWN'},{deployment:'dpl_SYNTHETIC'},{preview_starts_at:'2030'},{preview_expires_at:'2030'},{approved_sha:'b'.repeat(40)}])assert.equal(evaluate(condition(n),{...valid,inputs:{...valid.inputs,...patch}}),false,n);
 }
});
test('only two existing secrets in protected read job; zero key/archive/CLI/npm/publisher/upload or write permissions; no untrusted Actions interpolation into shell',()=>{
 const context=job('inspection-context'),read=job('inspection-read-only');
 assert.match(read,/needs: inspection-context/);assert.match(read,/name: native-pilot-setup/);assert.match(read,/deployments: read/);assert.match(read,/ref: \$\{\{ github.sha \}\}/);assert.match(read,/persist-credentials: false/);
 assert.deepEqual([...read.matchAll(/secrets\.([A-Z_]+)/g)].map(x=>x[1]).sort(),['NATIVE_ADMISSION_READ_TOKEN','UNFARMD_NATIVE_PREVIEW_DEPLOY_TOKEN']);
 assert.doesNotMatch(context,/secrets\.|environment:/);
 for(const block of [context,read]){assert.doesNotMatch(block,/deployments: write|GITHUB_TOKEN:|UNFARMD_NATIVE_BUILD_ARCHIVE_KEY|upload-artifact|publisher\.mjs|npm |build-isolated|upload\.mjs|--prod|--skip-domain|vercel deploy|vercel pull|VERCEL_GIT/i);for(const line of block.split('\n').filter(x=>/^\s+run:/.test(x)))assert.doesNotMatch(line,/\$\{\{/);}
 assert.match(read,/inspection-step\.mjs/);assert.match(context,/inspection-card\.mjs/);
});
function graph(entry){const visited=new Set();function visit(file){if(visited.has(file))return;visited.add(file);const source=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.doesNotMatch(source,/import\s*\(|\brequire\s*\(|node:child_process|createDecipheriv|createCipheriv|randomBytes|(?:write|append)File|UNFARMD_NATIVE_BUILD_ARCHIVE_KEY|\btar\b/);for(const node of sf.statements){if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){const spec=node.moduleSpecifier?.text;if(!spec)continue;if(spec.startsWith('.')){assert.doesNotMatch(spec,/output\.mjs|upload\.mjs|artifact\.mjs|build\.mjs|publisher\.mjs/);visit(path.resolve(path.dirname(file),spec));}else assert.ok(['node:fs','node:crypto','node:tls','node:https'].includes(spec),'unapproved import '+spec);}}}visit(path.resolve(entry));return visited;}
test('complete inspector import graph excludes CLI/SDK/archive cipher, decryption, build, artifact, publisher and subprocess; fixed native GET is the sole service primitive',()=>{
 const visited=graph('ops/native-beta-output/inspection-step.mjs');assert.ok(visited.size>=7);
 const preflight=fs.readFileSync('ops/native-beta-output/preflight.mjs','utf8');assert.equal((preflight.match(/https\.request\(/g)||[]).length,1);assert.match(preflight,/method:'GET'/);assert.doesNotMatch(preflight,/method:'(?:POST|PUT|PATCH|DELETE)'|fetch\(/);
});
test('runnable inspection entry fails safely before credential or network use on wrong mode, invalid manifest and missing credentials',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'inspection-entry-'));
 try{
  const hook=path.join(dir,'tripwire.mjs');fs.writeFileSync(hook,"import https from 'node:https';import {syncBuiltinESMExports} from 'node:module';https.request=()=>{throw Error('SYNTHETIC_NETWORK_REACHED')};syncBuiltinESMExports();");
  const base={PATH:process.env.PATH,MODE:'preview-inspect',APPROVED_SHA:sha,DEPLOYMENT:'',PREVIEW_STARTS_AT:'',PREVIEW_EXPIRES_AT:'',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:policy.repository,GITHUB_REPOSITORY_ID:String(policy.repositoryId),GITHUB_ACTOR_ID:String(policy.ownerId),GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123456789',GITHUB_REF:'refs/heads/'+policy.branch,GITHUB_SHA:sha};
  const card=inspectionCard({repositoryId:policy.repositoryId,actorId:policy.ownerId,attempt:1,branch:policy.branch,sha,runId:123456789},Date.now());
  for(const patch of [{MODE:'preview-output'},{INSPECTION_MANIFEST:'SYNTHETIC_PRIVATE_INVALID'},{INSPECTION_MANIFEST:'null'},{INSPECTION_MANIFEST:canonical(card.manifest)}]){
   let output;try{execFileSync(process.execPath,['--import',hook,'ops/native-beta-output/inspection-step.mjs'],{env:{...base,...patch},stdio:['ignore','pipe','pipe']});assert.fail('must HOLD');}catch(e){assert.equal(e.status,1);assert.equal(e.stderr.toString(),'');output=e.stdout.toString();}
   assert.match(output,/HOLD_NO_DEPLOYMENT_AUTHORITY/);assert.match(output,/"activate":false/);assert.doesNotMatch(output,/SYNTHETIC_PRIVATE|SYNTHETIC_NETWORK_REACHED|stack|https:/);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
