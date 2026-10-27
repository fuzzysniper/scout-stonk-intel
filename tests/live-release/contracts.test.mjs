// Release composition checks, not hosted identity or provider evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {assertReviewedTree,verifyReviewedInputs} from '../integration181/reviewed-scope.mjs';
import {SCOPE,POLICY} from '../../lib/live-ledger/policy.mjs';
const inputs=JSON.parse(readFileSync('docs/live-beta/inputs.json','utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const paths=['data','lib/onchain-mint','app/api/mint-facts','scheduler','neon.ts'];
test('released snapshot and main remain ancestors; original reviewed component bytes stay inspectable',()=>{
 // #171 was owner-squashed into production: feature commits are source evidence,
 // not ancestors of that merge. The separate tests below compare their exact bytes.
 for(const sha of [inputs.baseMain,'9eab75d9a4e72be01cb0a0942decb497c4cb8130'])assert.equal(execFileSync('git',['merge-base','--is-ancestor',sha,'HEAD']).length,0,sha);
 for(const key of ['workerReviewed','workerOfflineFollowup','ledger','consumerReviewed','consumerLiveFeed'])assert.equal(git('cat-file','-t',inputs[key]),'commit',key);
 assert.equal(git('diff','--name-only',inputs.baseMain,'HEAD','--',...paths.filter(p=>p!=='data')),'');
 // Later scheduled collector commits are permitted through main, never rewritten by a feature.
 const currentMain=git('merge-base','origin/main','HEAD');
 assert.equal(git('diff','--name-only',currentMain,'HEAD','--','data'),'');
});
test('all reviewed ledger production bytes preserved through composition',()=>{
 const reviewed=git('ls-tree','-r','--name-only',inputs.ledger,'--','lib/live-ledger','lib/scout-live','app/api/live-events').split('\n');
 assert.equal(git('diff','--name-only',inputs.ledger,'HEAD','--',...reviewed),'');
});
test('A published follow-up does not alter reviewed source/runtime/dependencies',()=>{
 const runtime=['worker.ts','creation.ts','policy.ts','ports.ts','native.mjs','run.mjs','store-adapter.mjs','build.mjs','render-build.sh','package.json','package-lock.json'].map(p=>'experiments/live-stream/'+p);
 assert.equal(git('diff','--name-only',inputs.workerReviewed,'HEAD','--',...runtime),'');
});
test('C checkpoint is preserved except its exact reviewed178 presentation delta',()=>{
 verifyReviewedInputs();
 assertReviewedTree(inputs.consumerLiveFeed,['app/consumer','app/page.tsx','app/opengraph-image.tsx']);
});
test('source approval example and release remain unarmed; shared scope and caps agree',()=>{
 const example=JSON.parse(readFileSync('experiments/live-stream/approval.example.json','utf8'));
 const worker=JSON.parse(readFileSync('experiments/live-stream/scope.json','utf8'));
 assert.equal(example.sourceGo,false);assert.equal(example.deploymentGo,false);assert.equal(inputs.productionSourceApproved,false);
 assert.equal(example.scopeHash,SCOPE);assert.equal(worker.scopeHash,SCOPE);
 assert.equal(worker.scope.maxSessionMs,POLICY.maxSessionSeconds*1000);assert.equal(worker.scope.leaseMs,POLICY.leaseSeconds*1000);
 assert.equal(worker.scope.maxConnectionAttempts,POLICY.connections);assert.equal(worker.scope.maxRpcAttempts,POLICY.rpc);
 assert.equal(worker.scope.maxBytesPerConnection,POLICY.bytesPerConnection);assert.equal(worker.scope.maxFramesPerConnection,POLICY.framesPerConnection);
});
test('Render template uses actual A entry, separate DATA namespace and disabled gates',()=>{
 const text=readFileSync('ops/render/scout-live.render.yaml','utf8');
 assert.match(text,/buildCommand: bash experiments\/live-stream\/render-build.sh/);assert.match(text,/startCommand: node experiments\/live-stream\/run.mjs/);
 assert.match(text,/SCOUT_LIVE_STORE_ENABLED\s+value: "false"/);assert.match(text,/UNFARMD_DATA_ACTIVATION\s+value: "disabled"/);
 assert.match(text,/numInstances: 1/);assert.match(text,/autoDeploy: false/);
 for(const forbidden of ['SCOUT_MINT_','SCOUT_LIVE_READER_DATABASE_URL','SCOUT_LIVE_STOP_DATABASE_URL','SCOUT_LIVE_OWNER_TOKEN'])assert.ok(!text.includes('key: '+forbidden),forbidden);
});
test('reported subscription snapshot is not a grant, live meter, key value or continuous coverage',()=>{
 const account=inputs.accountEvidence;assert.equal(account.monthlyCredits-account.usedCreditsAtCapture,account.remainingAtCapture);
 assert.equal(account.autoscaling,'Off');assert.equal(account.displayedMonthlyAutoscalingLimitUsd,0);assert.equal(account.actualStreamMetering,'not observed');
 assert.equal(inputs.productionSourceApproved,false);assert.equal(POLICY.maxSessionSeconds,3600);
});
