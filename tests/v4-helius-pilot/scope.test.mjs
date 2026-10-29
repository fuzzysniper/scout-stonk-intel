import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {PARENT,PILOT_ADDED,assertPilotReview} from './review.mjs';
test('dependent scope is finite, exact parent/source manifest unchanged, four complete patches pinned',()=>{
 const r=assertPilotReview();assert.equal(r.parent,PARENT);assert.equal(Object.keys(r.files).length,4);
 const exceptions=JSON.parse(fs.readFileSync('tests/v4-integration/exceptions.json'));
 assert.equal(exceptions['lib/v4-solana-facts/projection.ts'].sourceHead,'d6af31935f6202a3c8ee243735fc86d13f601a58');
 for(const file of ['tests/v4-integration/source-manifest.json','tests/v4-integration/source-history.sh','tests/run.sh'])assert.deepEqual(fs.readFileSync(file),execFileSync('git',['show',PARENT+':'+file]));
});
for(const file of ['lib/v4-solana-facts/projection.ts','tests/v4-integration/exceptions.json','tests/v4-integration/assertions.mjs','tests/v4-helius-pilot/review-patches.json','app/api/mint-facts/route.ts'])test('review rejects unpinned mutation: '+file,()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'v4-pilot-negative-'));
 try{
  execFileSync('git',['clone','--shared','--no-checkout',process.cwd(),root],{stdio:'ignore'});execFileSync('git',['checkout','--detach','HEAD'],{cwd:root,stdio:'ignore'});
  const review=assertPilotReview();for(const p of [...Object.keys(review.files),...PILOT_ADDED]){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.copyFileSync(p,path.join(root,p));}
  assertPilotReview(root);
  fs.appendFileSync(path.join(root,file),'\nUNREVIEWED DRIFT\n');assert.throws(()=>assertPilotReview(root));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
