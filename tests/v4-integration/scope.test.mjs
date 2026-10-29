import test from 'node:test';
import {ADDITIONS as JOURNAL_ADDITIONS} from '../v4-private-journal/dependency.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assertV4,BASE,SOURCES,ADDED,EXCEPTIONS} from './assertions.mjs';
test('independent43 original paths/modes/hashes/ancestry +4 exact patches +23 additions',()=>{
 assert.equal(Object.keys(assertV4().files).length,43);assert.equal(EXCEPTIONS.length,4);assert.equal(ADDED.length,23);
});
test('original root/native runner and chrome are exactly source A and C; no broad exemptions',()=>{
 assert.deepEqual(fs.readFileSync('tests/run.sh'),execFileSync('git',['show',SOURCES.A.head+':tests/run.sh']));
 assert.deepEqual(fs.readFileSync('app/site-chrome.tsx'),execFileSync('git',['show',SOURCES.C.head+':app/site-chrome.tsx']));
 for(const file of ['tests/lens/security.test.mjs','tests/unfarmd-intelligence/scope.test.mjs'])assert.ok(fs.readFileSync(file,'utf8').includes('assertV4()'));
});
for(const file of ['app/api/mint-facts/route.ts','lib/onchain-mint/server/lookup-policy.ts','lib/v4-solana-facts/projection.ts','lib/unfarmd-intelligence/join.ts','app/lens/cards.tsx','tests/run.sh','data/collector-audit.json'])test('adversarial source/protected drift rejected: '+file,()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'v4-negative-'));try{
  execFileSync('git',['clone','--shared','--no-checkout',process.cwd(),root],{stdio:'ignore'});
  // Copy only the current reviewed working tree, including uncommitted integration.
  execFileSync('git',['checkout','--detach','HEAD'],{cwd:root,stdio:'ignore'});
  for(const p of [...Object.keys(assertV4().files),...ADDED,...JOURNAL_ADDITIONS]){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.copyFileSync(p,path.join(root,p));}
  assertV4(root);
  fs.appendFileSync(path.join(root,file),'\nUNREVIEWED DRIFT\n');assert.throws(()=>assertV4(root));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('current three collector data blobs/modes are exactly reviewed main, and legacy gates unchanged',()=>{
 for(const f of ['data/collection-summary.json','data/reward-snapshots.json','data/collector-audit.json'])assert.deepEqual(fs.readFileSync(f),execFileSync('git',['show',BASE+':'+f]));
 const lookup=fs.readFileSync('lib/onchain-mint/server/lookup-policy.ts','utf8'),preflight=fs.readFileSync('lib/onchain-mint/server/config-preflight.ts','utf8');
 assert.match(lookup,/phase: "disabled"/);assert.match(lookup,/notBeforeMs: null, expiresAtMs: null/);assert.match(preflight,/enabled:false,notBeforeMs:null,expiresAtMs:null/);
});
test('client runtime import has no captured bridge, source option, persistence or API',()=>{
 const source=fs.readFileSync('app/lens/view.tsx','utf8')+fs.readFileSync('lib/v4-alpha-lens/source-off-model.ts','utf8')+fs.readFileSync('lib/unfarmd-intelligence/unavailable-cards.ts','utf8');
 assert.doesNotMatch(source,/\b(?:fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b|process\.env|captured-bridge|projectHeliusCapture|document\.cookie|dangerouslySetInnerHTML/);
 assert.match(source,/sourceOffLens/);assert.match(source,/unavailableCards/);assert.match(source,/isExactPublicKey\(ca\)/);
});
