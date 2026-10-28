// Reviewed #199 composition only. No directory-wide or environment bypasses.
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {repository,runtimeState,POLICY,dataFiles} from './lifecycle.mjs';
export const SOURCE_BASE='ba4b2e494f768350ec285e26791b61a90c50220b';
export const BASE='9ed40610eb34c34b56996d55a768f2eac9b43cdd';
export const UPSTREAM=['data/collection-summary.json','data/reward-snapshots.json'];
export const SCHEDULED=dataFiles(); // Eligible only after assertAggregate's full main proof.
export const SOURCES={C:{pr:196,head:'a1e461b9248d72396f038b641c7bc79d81130e7d',count:95},A:{pr:197,head:'4da9c8f39d815f2a8ee80283efbcfa808e09e352',count:4},B:{pr:198,head:'df36b54d09a6f5cec304a64a7d99d7a01176e872',count:10}};
export const EXCEPTIONS=['.github/workflows/desk-integration.yml','tests/desk-journey/scope.test.mjs','tests/unfarmd-journal/scope.test.mjs'];
export const ADDED=[
 'tests/v3-release/assertions.mjs','tests/v3-release/source-manifest.json','tests/v3-release/integration-exceptions.json',
 'tests/v3-release/scope.test.mjs','tests/v3-release/link-fixtures.ts','tests/v3-release/link.test.mjs',
 'tests/v3-release/run.sh','tests/v3-release/source-history.sh','tests/v3-release/snapshots.sh',
 'tests/v3-release/lifecycle.mjs','tests/v3-release/github-proof.mjs','tests/v3-release/collector-append.py',
 'tests/v3-release/lifecycle-fixtures.mjs','tests/v3-release/lifecycle.test.mjs','tests/v3-release/github-proof.test.mjs',
 'tests/v3-release/audit-snapshot.py','tests/v3-release/audit.test.mjs',
 'docs/v3/release-candidate-199.md',
 ...['incomplete','plan'].flatMap(state=>['320','390','1280'].map(size=>`tests/v3-release/screenshots/current-${state}-${size}.png`)),
];
export const raw=(...args)=>execFileSync('git',args,{maxBuffer:32*1024*1024});
export const git=(...args)=>raw(...args).toString().trim();
export const hash=v=>createHash('sha256').update(v).digest('hex');
const json=path=>JSON.parse(readFileSync(path,'utf8'));
export function assertAggregate(){
 assert.equal(BASE,POLICY.base);assert.deepEqual(UPSTREAM,POLICY.data);
 const lifecycle=runtimeState(repository());
 const manifest=json('tests/v3-release/source-manifest.json'),deltas=json('tests/v3-release/integration-exceptions.json');
 assert.equal(manifest.base,SOURCE_BASE);assert.equal(manifest.main,BASE);assert.deepEqual(manifest.sources,SOURCES);
 assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 assert.deepEqual(git('diff','--name-only','--no-renames',SOURCE_BASE,BASE).split('\n').sort(),[...UPSTREAM].sort());
 assert.deepEqual(Object.keys(manifest.upstream).sort(),[...UPSTREAM].sort());
 for(const path of UPSTREAM){
  const [mode,type,blob]=git('ls-tree',BASE,'--',path).split('\t')[0].split(' ');assert.equal(type,'blob');
  const sha256=hash(raw('show',BASE+':'+path));assert.deepEqual(manifest.upstream[path],{mode,blob,sha256});
  if(!lifecycle.dataAllowed)assert.equal(hash(readFileSync(path)),sha256,path+' exact proposal main data');
 }
 assert.deepEqual(Object.keys(deltas).sort(),[...EXCEPTIONS].sort());
 const expected=[];
 for(const [source,pin] of Object.entries(SOURCES)){
  assert.equal(git('merge-base',SOURCE_BASE,pin.head),SOURCE_BASE);
  assert.equal(git('merge-base','--is-ancestor',pin.head,'HEAD'),'');
  const paths=git('diff','--name-only','--no-renames',SOURCE_BASE,pin.head).split('\n');assert.equal(paths.length,pin.count);
  for(const path of paths){
   expected.push(path);
   const [mode,type,blob]=git('ls-tree',pin.head,'--',path).split('\t')[0].split(' ');assert.equal(type,'blob');
   const original={source,mode,blob,sha256:hash(raw('show',pin.head+':'+path))};
   assert.deepEqual(manifest.files[path],original,path+' original Git bytes');
   const stat=lstatSync(path);assert.ok(stat.isFile()&&!stat.isSymbolicLink(),path);assert.equal(stat.mode&0o111?'100755':'100644',mode,path+' mode');
   const current=hash(readFileSync(path));
   if(EXCEPTIONS.includes(path)){
    const delta=deltas[path];assert.equal(delta.sourceHead,pin.head);assert.equal(delta.originalSha256,original.sha256);
    assert.equal(current,delta.reviewedSha256,path+' reviewed exception bytes');
    const patch=raw('diff','--binary','--full-index','--no-renames','--no-ext-diff','--no-textconv',pin.head,'--',path);
    assert.equal(hash(patch),delta.patchSha256,path+' complete reviewed exception patch');
   }else assert.equal(current,original.sha256,path+' unchanged source bytes');
  }
 }
 assert.equal(expected.length,109);assert.equal(new Set(expected).size,109);
 assert.deepEqual(Object.keys(manifest.files).sort(),expected.sort());
 const scheduled=SCHEDULED;
 const allowed=new Set([...expected,...ADDED,...(lifecycle.dataAllowed?scheduled:[])]);
 for(const path of [...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(path),'unreviewed aggregate path: '+path);
 // Freeze every preexisting runtime/security/auth/SQL/data/config file, except
 // C's exact reviewed /desk-only chrome conditional, already hash-pinned above.
 for(const line of git('diff','--name-status','--no-renames',BASE).split('\n').filter(Boolean)){
  const [status,path]=line.split('\t');assert.ok(status==='A'||(status==='M'&&(path==='app/site-chrome.tsx'||(lifecycle.dataAllowed&&scheduled.includes(path)))),line);
 }
 assert.equal(git('diff',BASE,'--','app/api','app/consumer','app/page.tsx','app/layout.tsx','app/globals.css','lib/onchain-mint','lib/scout-live','lib/scout-continuous','lib/live-ledger','experiments','data',...(lifecycle.dataAllowed?scheduled.map(file=>':(exclude)'+file):[]),'scheduler','scripts','ops','neon.ts','next.config.ts','vercel.json','package.json','package-lock.json','tests/run.sh'),'');
 for(const path of git('ls-tree','-r','--name-only',BASE,'--','.github/workflows').split('\n'))assert.equal(git('diff',BASE,'--',path),'',path);
 assert.notEqual(git('merge-base','fb07947be8f10902fdba52ee7b148d11c32654ef','HEAD'),'fb07947be8f10902fdba52ee7b148d11c32654ef','#182 remains excluded');
 return manifest;
}
/** Historical source guards may admit only independently pinned additive files
 * from the OTHER exact inputs, plus this enumerated offline integration delta. */
export function aggregateAllowance(source='C'){
 assert.ok(['C','B'].includes(source));
 const manifest=assertAggregate();return new Set([...Object.keys(manifest.files).filter(p=>manifest.files[p].source!==source),...ADDED,...EXCEPTIONS,...dataFiles()]);
}
export function assertOnlyPinnedIntegrationDiff(from,paths){
 const allowed=aggregateAllowance();
 for(const path of git('diff','--name-only','--no-renames',from,'--',...paths).split('\n').filter(Boolean))assert.ok(allowed.has(path),'unexpected protected-path delta: '+path);
}
