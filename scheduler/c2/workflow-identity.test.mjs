// No live workflow is installed or dispatched. Expressions run against inert text.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,cp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {proposal,assertProposal} from './policy.mjs';
const run=promisify(execFile),root=fileURLToPath(new URL('../..',import.meta.url));
const {Lexer,Parser,Evaluator,data}=await import('@actions/expressions');
const source=await readFile(new URL('../../docs/proposals/76-workflow-identity.yml.txt',import.meta.url),'utf8');
const condition=source.match(/    if: >-\n([\s\S]*?)    permissions:/)[1].trim();
const convert=value=>typeof value==='object' && value!==null?new data.Dictionary(...Object.entries(value).map(([k,v])=>({key:k,value:convert(v)}))):typeof value==='string'?new data.StringData(value):typeof value==='number'?new data.NumberData(value):new data.BooleanData(value);
const evaluate=(github,vars)=>{const lexed=new Lexer(condition).lex();return new Evaluator(new Parser(lexed.tokens,['github','vars'],[]).parse(),convert({github,vars})).evaluate().coerceString()==='true';};
test('inert isolated job proposes Actions-read/Contents-read only; no collector, token write scope or secret/action surface',()=>{
 assert.match(source,/permissions: \{\}/);assert.match(source,/    permissions:\n      actions: read\n      contents: read/);
 assert.match(source,/persist-credentials: false/);assert.match(source,/actions\/checkout@[a-f0-9]{40}/);
 const actual=source.split('\n').filter(l=>!l.trim().startsWith('#')).join('\n');
 assert.doesNotMatch(actual,/workflow_dispatch|schedule:|pull_request_target|write|APP_PRIVATE_KEY|CLOUDFLARE|collect_rewards|collection_gate|upload-artifact|git push|secrets\./);
 assert.match(source,/python3 scheduler\/c2\/workflow_identity.py --approved-identity-only/);
 const github={repository:'fuzzysniper/scout-stonk-intel',repository_id:'1415026436',ref:'refs/heads/security/c2-workflow-proof',actor:'fuzzysniper',actor_id:'58099771',run_attempt:1,sha:'a'.repeat(40)};
 const vars={SCOUT_C2_PROOF_ENABLED:'true',SCOUT_C2_APPROVED_SHA:github.sha,SCOUT_COLLECTION_GATE_ENABLED:'false',SCOUT_COLLECTION_APP_ACTOR_ID:'900000001',SCOUT_C2_EXPECTED_APP_ACTOR_ID:'900000001'};
 assert.equal(evaluate(github,vars),true);
 for(const changes of [{actor_id:'1'},{ref:'refs/heads/main'},{run_attempt:2},{repository_id:'1'},{sha:'b'.repeat(40)}])assert.equal(evaluate({...github,...changes},vars),false);
 for(const changes of [{SCOUT_C2_PROOF_ENABLED:''},{SCOUT_COLLECTION_GATE_ENABLED:'true'},{SCOUT_COLLECTION_APP_ACTOR_ID:''},{SCOUT_C2_EXPECTED_APP_ACTOR_ID:'other'}])assert.equal(evaluate(github,{...vars,...changes}),false);
});
test('hosted proposal applies only to a disposable tree and equals strict unarmed policy',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'scout-c2-patch-'));try{
  await mkdir(join(dir,'scheduler'));
  await cp(join(root,'scheduler/wrangler.json'),join(dir,'scheduler/wrangler.json'));
  await run('git',['apply','--unsafe-paths',join(root,'docs/proposals/76-hosted-auth-only.patch')],{cwd:dir});
  const value=JSON.parse(await readFile(join(dir,'scheduler/wrangler.json'),'utf8'));assertProposal(value);assert.deepEqual(value,proposal);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('offline Python transport/identity suite and CLI unapproved path perform no credentialed network',async()=>{
 const env={PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'};
 const result=await run('python3',['-m','unittest','scheduler.c2.workflow_identity_test'],{cwd:root,env,timeout:60000,maxBuffer:1024*1024});assert.match(result.stderr,/OK/);
 for(const args of [[],['--approved-identity-only'],['--deploy']]){
  await assert.rejects(run('python3',['scheduler/c2/workflow_identity.py',...args],{cwd:root,env,timeout:5000,maxBuffer:4096}),e=>{assert.equal(e.code,1);const out=JSON.parse(e.stdout);assert.equal(out.passed,false);assert.equal(out.pilotReady,false);assert.equal(e.stderr,'');return true;});
 }
});
