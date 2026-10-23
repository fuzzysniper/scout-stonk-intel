// Actual published B v1 imports only. NO SQL, DSN lookup, key access or nativeStore invocation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {requireExtension} from '../entry.mjs';
const root=process.env.CONTINUOUS_B_TREE;
if(!root||!resolve(root).startsWith('/tmp/'))throw Error('EXPLICIT_LOCAL_REVIEWED_B_TREE_REQUIRED');
const b=await import(pathToFileURL(join(root,'lib/scout-live/worker-store.mjs')));
const policy=await import(pathToFileURL(join(root,'lib/live-ledger/policy.mjs')));
test('current real B worker module has no continuous export; integration is BLOCKED, never downgraded',()=>{
  assert.equal(typeof b.createWorkerStore,'function');assert.equal(b.createContinuousStore,undefined);
  assert.throws(()=>requireExtension(b),/CONTINUOUS_LEDGER_EXTENSION_REQUIRED/);
});
test('actual B canonical validator rejects parent v2 commands without touching SQL',()=>{
  assert.equal(policy.validCommand({v:2,op:'claim',parent:'11111111-1111-4111-8111-111111111111',scope:policy.SCOPE,head:'a'.repeat(40),worker:'22222222-2222-4222-8222-222222222222',grantHash:'b'.repeat(64)}),false);
});
