import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
import {aggregateAllowance} from '../v3-release/assertions.mjs';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const base='ba4b2e494f768350ec285e26791b61a90c50220b';
test('only additive journal engine/tests and one proposal; no C/runtime/collector/config/dependency changes',()=>{
 const paths=git('diff','--name-only',base).split('\n').filter(Boolean);
 const untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
 const integration=aggregateAllowance('B');
 for(const p of [...paths,...untracked])assert.ok(p.startsWith('lib/unfarmd-journal/')||p.startsWith('tests/unfarmd-journal/')||p==='docs/v3/journal-storage-proposal.md'||integration.has(p),p);
 for(const line of git('diff','--name-status',base).split('\n').filter(Boolean))assert.ok(/^A\t/.test(line)||(line==='M\tapp/site-chrome.tsx'&&integration.has('app/site-chrome.tsx')),'existing bytes cannot change outside exact C source: '+line);
});
test('risk dependency is exact Git source and real executable implementation, never copied/edited',()=>{
 const sha='36ede0e45046d8dba5a5163cc57ebc94434e2513';
 assert.equal(git('rev-parse',sha),sha);
 const runner=readFileSync('tests/unfarmd-journal/run.sh','utf8');assert.ok(runner.includes(sha));assert.ok(runner.includes('git archive'));
 aggregateAllowance('B');
 assert.equal(git('diff',sha,'--','lib/unfarmd-risk'),'');
});
test('portable production library contains no network/storage/SQL/crypto/eval/ambient clock capability',()=>{
 for(const file of readdirSync('lib/unfarmd-journal')){
  const code=readFileSync('lib/unfarmd-journal/'+file,'utf8');
  assert.doesNotMatch(code,/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|eval|setTimeout|setInterval)\s*[.(]|Date\.now\s*\(|new Date\s*\(\s*\)|process\.env|node:|from\s+['"](?:pg|https?|fs|crypto)['"]/);
 }
});
