import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
test('aggregate preserves exact A controller and offline CI bytes',()=>{
 assert.equal(git('diff','a860f7251c3e11daf6bbc133c07bd1b62251495a','--','experiments/continuous-stream','.github/workflows/continuous-offline.yml'),'');
});
test('B SQL, strict TLS/store, canonical wire and authorization are unchanged from reviewed173',()=>{
 assert.equal(git('diff','2d3322bae0a5db001ae63b32eff614e5cd733d5b','--','lib/scout-continuous/postgres','lib/scout-continuous/database.mjs','lib/scout-continuous/fingerprints.json','lib/scout-continuous/contract.ts','lib/scout-continuous/policy.mjs','lib/scout-live/continuous-store.mjs'),'');
});
test('original bounded beta, consumer, mint gates, collector and scheduler remain byte-identical to main ancestor',()=>{
 const main=git('merge-base','HEAD','origin/main');
 assert.equal(git('diff',main,'--','app/consumer','app/page.tsx','app/globals.css','experiments/live-stream','lib/live-ledger','lib/onchain-mint','app/api/mint-facts','app/api/live-events/route.ts','app/api/live-events/stop','data','scheduler','ops/render','.github/workflows/reward-snapshots.yml','.github/workflows/data-health.yml'),'');
 assert.equal(git('merge-base','--is-ancestor','08d21ef9a9de2ee0a22463564c5f45b0b92c3b70','HEAD'),'');
});
