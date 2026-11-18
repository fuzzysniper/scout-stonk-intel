import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
test('all engine imports remain inside its pure portable owned directory',()=>{
 for(const name of readdirSync('lib/unfarmd-risk')){
  const body=readFileSync('lib/unfarmd-risk/'+name,'utf8');const ast=ts.createSourceFile(name,body,ts.ScriptTarget.Latest,true);
  function visit(n){
   if(ts.isImportDeclaration(n)||ts.isExportDeclaration(n)){if(n.moduleSpecifier)assert.match(n.moduleSpecifier.text,/^\.\/[a-z-]+$/);}
   if(ts.isIdentifier(n))assert.ok(!/^(fetch|process|require|eval|Function|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document|window)$/.test(n.text),name+':'+n.text);
   if(ts.isNewExpression(n)){const name=n.expression.getText(ast);assert.ok(!['Function','WebSocket'].includes(name)&&!(name==='Date'&&n.arguments.length===0),'no hidden clocks or I/O');}
   if(ts.isCallExpression(n)){assert.notEqual(n.expression.kind,ts.SyntaxKind.ImportKeyword);assert.notEqual(n.expression.getText(ast),'Date.now');assert.notEqual(n.expression.getText(ast),'Math.random');}
   ts.forEachChild(n,visit);
  }visit(ast);
 }
});
test('only issue185 owned paths differ; legacy sources/UI/auth/STOP/SQL/data/CI remain unchanged',()=>{
 const base=git('merge-base','HEAD','origin/main');const paths=[...git('diff','--name-only',base).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean);
 for(const p of paths)assert.ok(p.startsWith('lib/unfarmd-risk/')||p.startsWith('tests/unfarmd-risk/')||p==='docs/v3/risk-contract.md',p);
 assert.equal(git('diff',base,'--','app','lib/onchain-mint','lib/scout-continuous','lib/scout-live','lib/live-ledger','experiments','data','scheduler','ops','.github','package.json','package-lock.json'),'');
});
