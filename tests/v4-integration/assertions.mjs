// Review-only exact source composition, never a directory-wide/safety exemption.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PILOT_ADDED} from '../v4-helius-pilot/review.mjs';
import {assertComposition,COMPOSITION_ADDED} from '../v4-private-integration/review.mjs';
import {ADDITIONS as JOURNAL_ADDITIONS} from '../v4-private-journal/dependency.mjs';
export const SOURCE_BASE='5c6e36fef0fc15acb07c954566a3975cb77fc102';
export const BASE='222ccf29de01b6bf05fae6d4fa332c26b2acc2de';
export const SOURCES={C:{head:'ec527f8b4e3fb7f0c0df7b77c459ec6502267100',count:15},A:{head:'d6af31935f6202a3c8ee243735fc86d13f601a58',count:9},B:{head:'6ed24c97146a39599ad0855a809735f08c83f2b8',count:19}};
export const EXCEPTIONS=['app/lens/view.tsx','tests/lens/security.test.mjs','lib/unfarmd-intelligence/source-off.ts','tests/unfarmd-intelligence/scope.test.mjs','lib/v4-solana-facts/projection.ts'];
export const ADDED=['lib/unfarmd-intelligence/unavailable-cards.ts','lib/v4-alpha-lens/source-off-model.ts','lib/v4-alpha-lens/captured-bridge.ts',
 'tests/v4-integration/assertions.mjs','tests/v4-integration/source-manifest.json','tests/v4-integration/exceptions.json',
 'tests/v4-integration/fixtures.mjs','tests/v4-integration/bridge.test.mjs','tests/v4-integration/scope.test.mjs',
 'tests/v4-integration/run.sh','tests/v4-integration/source-history.sh','tests/v4-integration/snapshots.sh',
 'tests/v4-integration/browser.spec.mjs','tests/v4-integration/playwright.config.mjs','tests/v4-integration/__init__.py','tests/v4-integration/engine_test.py',
 'docs/v4/integration-218.md','docs/v4/integration-218-qa.json','.github/workflows/v4-integration.yml',
 ...['before-390','after-320','after-390','after-1280'].map(n=>'tests/v4-integration/screenshots/'+n+'.png'),...PILOT_ADDED];
export const digest=b=>createHash('sha256').update(b).digest('hex');
export function assertV4(root=process.cwd()){
 assertComposition(root);
 const dependent=[...JOURNAL_ADDITIONS,...COMPOSITION_ADDED];
 const raw=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:16*1024*1024}),git=(...args)=>raw(...args).toString().trim();
 const read=p=>fs.readFileSync(path.join(root,p));
 const manifest=JSON.parse(read('tests/v4-integration/source-manifest.json')),deltas=JSON.parse(read('tests/v4-integration/exceptions.json'));
 assert.equal(manifest.base,BASE);assert.equal(manifest.sourceBase,SOURCE_BASE);assert.equal(git('merge-base',SOURCE_BASE,BASE),SOURCE_BASE);assert.deepEqual(manifest.sources,SOURCES);assert.equal(git('merge-base','--is-ancestor',BASE,'HEAD'),'');
 assert.deepEqual(Object.keys(deltas).sort(),[...EXCEPTIONS].sort());
 const originals=[];
 for(const [name,s] of Object.entries(SOURCES)){
  assert.equal(git('merge-base',SOURCE_BASE,s.head),SOURCE_BASE);assert.equal(git('merge-base','--is-ancestor',s.head,'HEAD'),'');
  const files=git('diff','--name-only','--no-renames',SOURCE_BASE,s.head).split('\n');assert.equal(files.length,s.count);
  for(const file of files){
   assert.ok(!originals.includes(file),'overlapping_source_file:'+file);originals.push(file);
   const [mode,type,blob]=git('ls-tree',s.head,'--',file).split('\t')[0].split(' ');assert.equal(type,'blob');
   const original={source:name,mode,blob,sha256:digest(raw('show',s.head+':'+file))};assert.deepEqual(manifest.files[file],original);
   const stat=fs.lstatSync(path.join(root,file));assert.ok(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.mode&0o111?'100755':'100644',mode,file);
   if(EXCEPTIONS.includes(file)){
    const d=deltas[file];assert.equal(d.sourceHead,s.head);assert.equal(d.originalSha256,original.sha256);assert.equal(d.reviewedSha256,digest(read(file)),file+' reviewed_exception_bytes');
    assert.equal(d.patchSha256,digest(raw('diff','--binary','--full-index','--no-renames','--no-ext-diff','--no-textconv',s.head,'--',file)),file+' complete_exception_patch');
   }else assert.equal(digest(read(file)),original.sha256,file+' source_bytes');
  }
 }
 assert.equal(originals.length,43);assert.deepEqual(Object.keys(manifest.files).sort(),originals.sort());
 const allowed=new Set([...originals,...ADDED]);assert.equal(ADDED.length,43);assert.equal(allowed.size,86);
 for(const file of ADDED){const stat=fs.lstatSync(path.join(root,file));assert.ok(stat.isFile()&&!stat.isSymbolicLink(),file);assert.equal(stat.mode&0o111,0,file);}
 for(const file of [...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))assert.ok(allowed.has(file)||dependent.includes(file),'unreviewed_integration_path:'+file);
 for(const line of git('diff','--name-status','--no-renames',BASE).split('\n').filter(Boolean)){
  const [status,file]=line.split('\t');assert.ok(status==='A'||(status==='M'&&['app/site-chrome.tsx','tests/run.sh'].includes(file)),line);
 }
 // Freeze every old code/config/data/workflow, admitting ONLY exact C chrome + A test hook.
 assert.equal(git('diff',BASE,'--','.',...originals.concat(ADDED,dependent).map(f=>':(exclude)'+f)),'');
 for(const file of ['data/collection-summary.json','data/reward-snapshots.json','data/collector-audit.json']){
  const [mode,type,blob]=git('ls-tree',BASE,'--',file).split('\t')[0].split(' ');
  assert.deepEqual(manifest.data[file],{mode,blob,sha256:digest(raw('show',BASE+':'+file))});assert.equal(type,'blob');assert.equal(digest(read(file)),manifest.data[file].sha256,file);
  assert.equal(git('ls-files','-s','--',file).split(' ')[0],mode,file);
 }
 assert.equal(git('diff',BASE,'--','app/api','app/consumer','app/page.tsx','app/layout.tsx','app/globals.css','lib/onchain-mint','lib/trader-pulse','lib/live-ledger','lib/scout-live','lib/scout-continuous','data','scripts','scheduler','ops','package.json','package-lock.json','next.config.ts','neon.ts'),'');
 return manifest;
}
