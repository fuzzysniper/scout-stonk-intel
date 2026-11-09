// Exact-parent code-only inspection allowance; all unrelated guards stay byte-identical.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const base='370f15cc29901e3d1d267273d09993a3283d7dd4';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'});
git('merge-base','--is-ancestor',base,'HEAD');
const changed=git('diff','--name-only',base,'HEAD').trim().split('\n').filter(Boolean);
const allowed=new Set(['.github/workflows/native-pilot-admission.yml','.github/workflows/native-publisher-inspection.yml','ops/native-pilot-admission/inspect.mjs','tests/native-publisher-inspection/inspection.test.mjs','tests/native-publisher-inspection/scope.mjs','tests/native-publisher-inspection/README.md','vercel.json']);
assert.equal(changed.length,allowed.size);for(const file of changed)assert.ok(allowed.has(file),file);
for(const file of ['ops/native-pilot-admission/publisher.mjs','tests/native-publisher-diagnostics/scope.sh','tests/native-publisher-diagnostics/diagnostics.test.mjs','lib/native-pilot/index.ts','lib/native-pilot/admission/gates.ts','lib/native-lens/policy.ts'])assert.equal(fs.readFileSync(file,'utf8'),git('show',base+':'+file),file);
const current=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.equal(current.git.deploymentEnabled['native-pilot/review-rehearsal'],false);assert.equal(current.git.deploymentEnabled['fix/native-read-only-inspection'],false);
delete current.git.deploymentEnabled['fix/native-read-only-inspection'];assert.deepEqual(current,JSON.parse(git('show',base+':vercel.json')));
const wf=fs.readFileSync('.github/workflows/native-pilot-admission.yml','utf8');
const legacy=wf.slice(0,wf.indexOf('\n  inspection:\n')).replace(/\n$/,'')+'\n';
assert.equal(legacy.replace('options: [inspection, rehearsal, setup, source]','options: [rehearsal, setup, source]').replace("if: inputs.mode != 'inspection' && github.repository_id ==","if: github.repository_id ==").replace("  publish:\n    if: inputs.mode != 'inspection'\n    needs: context","  publish:\n    needs: context"),git('show',base+':.github/workflows/native-pilot-admission.yml'));
console.log('PASS: seven exact paths; unchanged publisher/legacy guards/gates; exact branch deployment suppression; only additive inspection workflow lane.');
// Evaluate actual job expressions with GitHub's library, including case-insensitive semantics.
const {Lexer,Parser,Evaluator,data}=await import('@actions/expressions');
function convert(x){if(typeof x==='string')return new data.StringData(x);if(typeof x==='number')return new data.NumberData(x);if(typeof x==='boolean')return new data.BooleanData(x);if(x==null)return new data.Null();return new data.Dictionary(...Object.entries(x).map(([key,value])=>({key,value:convert(value)})));}
const expressions=Object.fromEntries(['context','publish','inspection'].map(name=>[name,wf.split('  '+name+':\n')[1].split('\n').find(line=>line.startsWith('    if: ')).replace(/^    if: /,'')]));
function evaluate(name,ctx){return new Evaluator(new Parser(new Lexer(expressions[name]).lex().tokens,['inputs','github'],[]).parse(),convert(ctx)).evaluate().coerceString()==='true';}
const ctx={inputs:{mode:'inspection',deployment:'',approved_sha:'a'.repeat(40)},github:{sha:'a'.repeat(40),repository_id:'1415026436',actor_id:'58099771',run_attempt:1,ref:'refs/heads/native-pilot/review-rehearsal'}};
for(const mode of ['inspection','INSPECTION']){const c=structuredClone(ctx);c.inputs.mode=mode;assert.equal(evaluate('context',c),false);assert.equal(evaluate('publish',c),false);assert.equal(evaluate('inspection',c),true);}
for(const [key,value]of [['actor_id','1'],['ref','refs/heads/main'],['run_attempt',2],['sha','b'.repeat(40)]]){const c=structuredClone(ctx);c.github[key]=value;assert.equal(evaluate('inspection',c),false);}
for(const mode of ['rehearsal','setup','source']){const c=structuredClone(ctx);c.inputs.mode=mode;assert.equal(evaluate('inspection',c),false);assert.equal(evaluate('publish',c),true);assert.equal(evaluate('context',c),true);}
console.log('PASS: real GitHub expression evaluation excludes both publisher jobs for inspection and retains legacy mode conditions.');
