import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assertJournalScope,BASE,ADDITIONS,EXCEPTIONS} from './dependency.mjs';
test('exact dependent base +18 additions +two finite test-only patches, no old runtime/data/UI/source changes',()=>{assert.equal(assertJournalScope().length,18);});
test('production entry has no env/auth/key/storage/network dependency; no routes or consumer wiring',()=>{
 const s=fs.readFileSync('lib/v4-private-journal/index.ts','utf8');assertJournalScope();assert.doesNotMatch(s,/process|\bfetch\b|\bpg\b|require|from |repository|keys|OwnerAuthority/);
 // Nine exact uninstalled package paths are independently byte/mode pinned by the final umbrella.
 assert.equal(execFileSync('git',['diff',BASE,'--','app','lib/onchain-mint','lib/unfarmd-intelligence','data','scripts','scheduler','ops',':(exclude,literal)app/lens/view.tsx',':(exclude,literal)app/api/v4/theses/route.ts',':(exclude,literal)app/api/v4/theses/[journalId]/route.ts',':(exclude,literal)app/lens/journal-controls.tsx',':(exclude,literal)ops/v4-journal/catalog.sql',':(exclude,literal)ops/v4-journal/envelope.mjs',':(exclude,literal)ops/v4-journal/hardening.sql',':(exclude,literal)ops/v4-journal/native-tls.mjs',':(exclude,literal)ops/v4-journal/package.mjs',':(exclude,literal)ops/v4-journal/recovery.mjs',':(exclude,literal)ops/v4-journal/snapshot.sql',':(exclude,literal)ops/v4-journal/sources.json',':(exclude,literal)ops/v4-journal/sources/owner-ledger.sql']).toString(),'');
});
for(const file of ['app/lens/view.tsx','lib/onchain-mint/server/lookup-policy.ts','lib/v4-solana-facts/projection.ts','tests/run.sh','data/reward-snapshots.json',...EXCEPTIONS])test('dependent guard rejects tampered protected '+file,()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'j222-negative-'));try{
  execFileSync('git',['clone','--shared',process.cwd(),root],{stdio:'ignore'});
  for(const p of [...ADDITIONS,...EXCEPTIONS]){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.copyFileSync(p,path.join(root,p));}
  assertJournalScope(root);
  fs.appendFileSync(path.join(root,file),'\nUNREVIEWED\n');assert.throws(()=>assertJournalScope(root));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
