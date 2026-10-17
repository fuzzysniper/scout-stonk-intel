// Apply the proposal to a disposable tree only, then evaluate its real Actions
// expressions. No workflow installation, runner, credentials or network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Lexer,Parser,Evaluator,data} from '@actions/expressions';
const run=promisify(execFile),root=fileURLToPath(new URL('../..',import.meta.url));
const path='.github/workflows/reward-snapshots.yml';
const original=await readFile(join(root,path),'utf8');
const dir=await mkdtemp(join(tmpdir(),'scout-c2-collector-patch-'));
let patched,withActionsRead;
try{
 await mkdir(join(dir,'.github/workflows'),{recursive:true});await writeFile(join(dir,path),original);
 await run('git',['apply',join(root,'docs/proposals/84-collector-token-proof.patch')],{cwd:dir});
 patched=await readFile(join(dir,path),'utf8');
 await run('git',['apply',join(root,'docs/proposals/68-collector-actions-read.patch')],{cwd:dir});
 withActionsRead=await readFile(join(dir,path),'utf8');
}finally{await rm(dir,{recursive:true,force:true});}
const convert=v=>v==null?new data.Null():typeof v==='object'?new data.Dictionary(...Object.entries(v).map(([key,value])=>({key,value:convert(value)}))):typeof v==='string'?new data.StringData(v):typeof v==='number'?new data.NumberData(v):new data.BooleanData(v);
function evaluate(expression,context,success=true){
 const functions=[{name:'success',minArgs:0,maxArgs:0,call:()=>new data.BooleanData(success)},{name:'always',minArgs:0,maxArgs:0,call:()=>new data.BooleanData(true)}];
 const actual=/\b(?:success|always)\s*\(/.test(expression)?expression:`success() && (${expression})`;
 const tree=new Parser(new Lexer(actual).lex().tokens,['vars','inputs','github','steps'],functions).parse();
 return new Evaluator(tree,convert(context),new Map(functions.map(f=>[f.name,f]))).evaluate().coerceString()==='true';
}
function condition(text,name){
 const step=text.split(`      - name: ${name}\n`)[1].split(/\n      - (?:name|uses):/)[0];
 const match=/        if: ([^\n]+)\n/.exec(step);assert.ok(match,name);
 return match[1]==='>-'?step.slice(match.index+match[0].length).split('\n').filter((s,i,all)=>/^          \S/.test(s)&&all.slice(0,i).every(l=>/^          \S/.test(l))).map(l=>l.trim()).join(' '):match[1];
}
const names=['Shared claim gate (default off)','Collect observations','Persist observations and summary','Preserve diagnostic evidence','Preserve gate claim evidence','Fail when collection failed'];
function context(proof,gate='',actor='58099771',inputs={},outcome='skipped',collect='skipped'){
 return {vars:{SCOUT_C2_COLLECTOR_PROOF:proof,SCOUT_COLLECTION_GATE_ENABLED:gate,SCOUT_COLLECTION_APP_ACTOR_ID:'342326617'},inputs,github:{actor_id:actor,sha:'a'.repeat(40)},steps:{gate:{outcome,outputs:{collect:outcome==='success'?'true':'false'}},collect:{outcome:collect}}};
}
test('inert proof preserves current token permissions; independent permission proposal adds only Actions-read',()=>{
 assert.equal(patched.split('permissions:')[0],original.split('permissions:')[0]);
 assert.match(patched,/permissions:\n  contents: write\nconcurrency:/);
 assert.equal(withActionsRead,patched.replace('  contents: write\n','  contents: write\n  actions: read\n'));
 assert.equal(patched.split('concurrency:')[1].split('    steps:')[0],original.split('concurrency:')[1].split('    steps:')[0]);
 assert.equal(patched.match(/GITHUB_TOKEN:/g).length,2);
 assert.doesNotMatch(patched,/secrets\.|APP_PRIVATE_KEY|CLOUDFLARE|continue-on-error: true\n.*collector_identity/);
 assert.match(patched,/run: python -m scheduler.c2.collector_identity --approved-collector-identity-only/);
 assert.match(patched,/ref: \$\{\{ vars.SCOUT_C2_COLLECTOR_PROOF != '' && github.sha \|\| 'main' \}\}/);
 assert.match(patched,/persist-credentials: \$\{\{ vars.SCOUT_C2_COLLECTOR_PROOF == '' \}\}/);
 assert.doesNotMatch(original,/SCOUT_C2_COLLECTOR|actions: read/);
});
test('any nonempty proof value suppresses claims/provider/write/artifacts even on failure and stray outputs',()=>{
 for(const proof of ['auth-only','AUTH-ONLY','false','true',' ','malformed'])for(const gate of ['', 'false','true','invalid'])
 for(const actor of ['58099771','342326617'])for(const input of [{},{trigger_source:'external',collection_slot:'slot'}])
 for(const outcome of ['success','failure','skipped'])for(const collected of ['success','failure','skipped']){
  const c=context(proof,gate,actor,input,outcome,collected);
  assert.equal(evaluate(condition(patched,'Read-only collector token proof'),c),true);
  for(const name of names)for(const successful of [true,false])assert.equal(evaluate(condition(patched,name),c,successful),false,name);
 }
});
test('absent proof control preserves every existing gate/collector/publish/artifact condition',()=>{
 for(const proof of [undefined,''])for(const gate of ['', 'false','true','invalid'])for(const actor of ['58099771','342326617'])
 for(const input of [{},{trigger_source:'external',collection_slot:'slot'}])for(const outcome of ['success','failure','skipped'])
 for(const collected of ['success','failure','skipped']){
  const c=context(proof,gate,actor,input,outcome,collected);
  assert.equal(evaluate(condition(patched,'Read-only collector token proof'),c),false);
  for(const name of names)for(const successful of [true,false])assert.equal(evaluate(condition(patched,name),c,successful),evaluate(condition(original,name),c,successful),name);
 }
});
test('offline actual-collector Python suite; unapproved CLI never enters credentialed context',async()=>{
 const env={PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1'};
 const result=await run('python3',['-m','unittest','scheduler.c2.collector_identity_test'],{cwd:root,env,timeout:60000,maxBuffer:1024*1024});assert.match(result.stderr,/OK/);
 for(const args of [[],['--approved-collector-identity-only'],['--deploy']])await assert.rejects(
  run('python3',['-m','scheduler.c2.collector_identity',...args],{cwd:root,env,timeout:5000,maxBuffer:4096}),
  e=>{assert.equal(e.code,1);assert.equal(e.stderr,'');const value=JSON.parse(e.stdout);assert.equal(value.passed,false);assert.equal(value.pilotReady,false);return true;});
});
