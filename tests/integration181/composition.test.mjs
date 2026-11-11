// Deterministic repository audit. No SQL, network, secrets or operational grants.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import ts from 'typescript';
import {BASE,SOURCES,INTEGRATION_FILES,bytes,git,manifest,sha256,working,verifyDelta,verifyReviewedInputs} from './reviewed-scope.mjs';
const text=path=>readFileSync(path,'utf8');
const old=path=>bytes('show',BASE+':'+path).toString();
const parse=(name,body)=>ts.createSourceFile(name,body,ts.ScriptTarget.Latest,true,name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
const walk=(n,visit)=>{visit(n);ts.forEachChild(n,c=>walk(c,visit));};

test('181: all three exact source diffs/parents, 32 source files and six integration paths are independently pinned',()=>{
 verifyReviewedInputs();assert.equal(Object.keys(manifest.files).length,32);
 const changed=git('diff','--no-renames','--name-only',BASE).split('\n');
 assert.deepEqual(changed.sort(),[...Object.keys(manifest.files),...INTEGRATION_FILES].sort());
 assert.equal(git('ls-files','--others','--exclude-standard'),'','no unintended untracked files');
 for(const [path,entry] of Object.entries(manifest.files))assert.deepEqual(working(path),entry.after,path);
});
const original={mode:'100644',sha256:'a'.repeat(64)},reviewed={mode:'100644',sha256:'b'.repeat(64)};
const p='app/consumer/live-home.tsx',allowed={[p]:{before:original,after:reviewed}};
test('181: allowance accepts exact reviewed before/after only',()=>verifyDelta([{path:p,before:original,after:reviewed}],allowed));
for(const [name,change] of [
 ['same file with altered auth/STOP bytes',{path:p,before:original,after:{...reviewed,sha256:'c'.repeat(64)}}],
 ['moved historical checkpoint',{path:p,before:{...original,sha256:'c'.repeat(64)},after:reviewed}],
 ['executable-mode drift',{path:p,before:original,after:{...reviewed,mode:'100755'}}],
 ['unexpected worker source',{path:'experiments/live-stream/native.mjs',before:original,after:reviewed}],
 ['new UI credential helper',{path:'app/consumer/new-client.ts',before:null,after:reviewed}],
 ['deleted allowed file',{path:p,before:original,after:null}],
 ['new API/source bypass',{path:'app/api/live-events/continuous/bypass.ts',before:null,after:reviewed}]
])test('181: rejects '+name,()=>assert.throws(()=>verifyDelta([change],allowed)));

test('181: C preserves every non-render LiveHome statement, callback, token, polling and STOP transition',()=>{
 const path='app/consumer/live-home.tsx',before=parse(path,old(path)),after=parse(path,text(path));
 const prefix=sf=>sf.statements.filter(n=>!(ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./operations-guide')).map(n=>{
  if(ts.isFunctionDeclaration(n)&&n.name?.text==='LiveHome'){
   assert.ok(ts.isReturnStatement(n.body.statements.at(-1)));
   return n.body.statements.slice(0,-1).map(s=>s.getText(sf)).join('\n');
  }
  return n.getText(sf);
 });
 assert.deepEqual(prefix(after),prefix(before));
 const added=after.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./operations-guide');
 assert.equal(added.length,1);assert.equal(added[0].getText(after),"import {BOUNDED_STOP_LABEL,OperationsGuide} from './operations-guide';");
 assert.ok(text('app/consumer/live.css').startsWith(old('app/consumer/live.css')),'existing CSS retained');
});

test('181: C guide is inert JSX with one explicit same-origin, no-referrer native link and no capabilities',()=>{
 const sf=parse('operations-guide.tsx',text('app/consumer/operations-guide.tsx')),links=[];
 assert.equal(sf.statements.length,3);
 assert.equal(sf.statements[1].declarationList.declarations[0].initializer.text,'/api/live-events/continuous/control');
 walk(sf,n=>{
  assert.ok(!ts.isImportDeclaration(n)&&!ts.isCallExpression(n)&&!ts.isNewExpression(n)&&!ts.isAwaitExpression(n),'no executable I/O/hooks/imports');
  if(ts.isJsxAttribute(n))assert.ok(!/^on[A-Z]/.test(n.name.getText(sf)),'no event callbacks');
  if(ts.isIdentifier(n))assert.ok(!/^(fetch|process|window|document|localStorage|sessionStorage|eval|Function)$/.test(n.text));
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   assert.ok(['section','h2','p','strong','a','details','summary'].includes(n.tagName.getText(sf)));
   if(n.tagName.getText(sf)==='a')links.push(n);
  }
 });
 assert.equal(links.length,1);const attrs=links[0].attributes.properties;
 assert.deepEqual(attrs.map(n=>n.name.text),['className','href','referrerPolicy','aria-describedby']);
 assert.equal(attrs[1].initializer.expression.getText(sf),'PARENT_CONTROL_PATH');assert.equal(attrs[2].initializer.text,'no-referrer');
});

test('181: A audit is report-only, static trusted imports and unreachable from worker/controller/runtime graph',()=>{
 const path='experiments/live-stream/pilot-meter-audit.mjs',sf=parse(path,text(path));
 const imports=sf.statements.filter(ts.isImportDeclaration).map(n=>n.moduleSpecifier.text);
 assert.deepEqual(imports,['../../lib/scout-continuous/meter-reconciliation.mjs','../../lib/scout-continuous/policy.mjs']);
 walk(sf,n=>{
  if(ts.isIdentifier(n))assert.ok(!/^(fetch|process|require|eval|Function|globalThis|WebSocket)$/.test(n.text));
  if(ts.isCallExpression(n))assert.notEqual(n.expression.kind,ts.SyntaxKind.ImportKeyword,'no dynamic imports');
 });
 const roots=['experiments/live-stream','experiments/continuous-stream','lib','app','scripts'];
 for(const path of git('ls-files','--',...roots).split('\n')){
  if(!/\.(mjs|ts|tsx)$/.test(path)||path.includes('/tests/')||path.includes('/test/')||path.endsWith('/pilot-meter-audit.mjs'))continue;
  const sf=parse(path,text(path));
  walk(sf,n=>{
   if(ts.isImportDeclaration(n)||ts.isExportDeclaration(n)){
    const spec=n.moduleSpecifier?.text;if(spec?.startsWith('.'))assert.notEqual(posix.normalize(posix.join(posix.dirname(path),spec)),'experiments/live-stream/pilot-meter-audit.mjs',path);
   }
  });
  assert.ok(!text(path).includes('pilot-meter-audit'),path+' runtime graph');
 }
});

test('181: all SQL, fingerprints, TLS, host/auth/CSP/STOP APIs, old mint gates, controller, collectors and workflows freeze to base',()=>{
 const paths=['lib/live-ledger','lib/onchain-mint','lib/scout-live','lib/scout-continuous/postgres','lib/scout-continuous/database.mjs','lib/scout-continuous/fingerprints.json','lib/scout-continuous/policy.mjs','lib/scout-continuous/contract.ts','lib/scout-continuous/http.mjs','lib/scout-continuous/control.mjs','lib/scout-continuous/meter-reconciliation.mjs','app/api','app/page.tsx','app/layout.tsx','next.config.ts','experiments/continuous-stream','scheduler','data','ops','.github/workflows','package.json','package-lock.json','neon.ts'];
 assert.equal(git('diff',BASE,'--',...paths),'');
 // Entire worker tree, including less obvious adapters, is frozen except five enumerated files.
 const delta=git('diff','--no-renames','--name-only',BASE,'--','experiments/live-stream').split('\n');
 assert.deepEqual(delta.sort(),['PAID_PLAN.md','RUNBOOK.md','SOURCES.md','pilot-meter-audit.mjs','tests/pilot-meter.test.mjs'].map(n=>'experiments/live-stream/'+n).sort());
 for(const name of ['pilot-meter-audit.mjs','tests/pilot-meter.test.mjs'])assert.equal(manifest.files['experiments/live-stream/'+name].before,null,'new, not replacing runtime');
 for(const path of git('ls-files','--','app/consumer').split('\n'))if(!['app/consumer/live-home.tsx','app/consumer/live.css','app/consumer/operations-guide.tsx'].includes(path))assert.equal(git('diff',BASE,'--',path),'',path);
});

test('181: recorded screenshot evidence is exact C input, not a claim about a real device or source',()=>{
 for(const [path,entry] of Object.entries(manifest.files).filter(([p])=>p.endsWith('.png'))){
  assert.equal(entry.source,'C');assert.equal(sha256(readFileSync(path)),entry.after.sha256);
 }
 assert.equal(git('rev-parse',SOURCES.C.sha),SOURCES.C.sha);
});
