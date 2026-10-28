import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {Lexer,Parser} from '@actions/expressions';
import {assertAggregate,aggregateAllowance,BASE,SOURCES,EXCEPTIONS,ADDED,git,raw,hash} from './assertions.mjs';
test('109 reviewed inputs,106 unchanged bytes/modes and exactly3 independently pinned integration exceptions',()=>{
 const manifest=assertAggregate();assert.equal(Object.keys(manifest.files).length-EXCEPTIONS.length,106);
 for(const path of ADDED){const s=lstatSync(path);assert.ok(s.isFile()&&!s.isSymbolicLink(),path);}
 assert.equal(aggregateAllowance().size,44);
});
test('each original full guard remains in immutable source history and all original test cases stay executable',()=>{
 for(const [source,path] of [['C','tests/desk-journey/scope.test.mjs'],['B','tests/unfarmd-journal/scope.test.mjs']]){
  const original=raw('show',SOURCES[source].head+':'+path).toString(),current=readFileSync(path,'utf8');
  const names=text=>[...text.matchAll(/test\('([^']+)'/g)].map(m=>m[1]);assert.deepEqual(names(current),names(original),path);
  assert.doesNotMatch(current,/test\.(?:skip|todo|only)\b/);
 }
 const runner=readFileSync('tests/v3-release/source-history.sh','utf8');for(const pin of [SOURCES.C.head,SOURCES.B.head])assert.ok(runner.includes(pin));
});
test('CI retains all root/current C/mobile/backend/STOP suites and adds A47/B149 and typed actual-head journal linkage',()=>{
 assert.equal(git('diff',BASE,'--','.github/workflows/ci.yml','tests/run.sh'),'');
 const old=raw('show',SOURCES.C.head+':.github/workflows/desk-integration.yml').toString();
 const next=readFileSync('.github/workflows/desk-integration.yml','utf8');
 for(const literal of ['bash tests/desk-journey/run.sh','bash tests/desk-journey/historical.sh focused','bash tests/desk-journey/historical.sh browser','tests/consumer-homepage/playwright.config.mjs','tests/continuous-ledger/mobile.test.mjs','tests/live-ledger/built-api.mjs','tests/continuous-ledger/built-api.mjs'])assert.ok(old.includes(literal)&&next.includes(literal),literal);
 assert.ok(readFileSync('tests/v3-release/snapshots.sh','utf8').includes('tests/desk-journey/playwright.config.mjs'));
 for(const flag of ['PRODUCTION_RPC_ENABLED','SCOUT_LIVE_API_ENABLED','SCOUT_LIVE_STORE_ENABLED','SCOUT_CONTINUOUS_API_ENABLED','SCOUT_CONTINUOUS_CONTROL_ENABLED','SCOUT_CONTINUOUS_STORE_ENABLED','SCOUT_CONTINUOUS_MAINTENANCE_ENABLED'])assert.ok(next.includes(flag+": 'false'"),flag);
 assert.doesNotMatch(next,/\bsecrets\.|environment:|workflow_dispatch|schedule:|contents:\s*write|vercel deploy|curl\s/);
 assert.ok(next.includes('workflow_run:')&&next.includes('post-merge-current-main:'));
 assert.ok(next.includes('workflows: [Collect reward snapshots, SCOUT data health audit]'));
 assert.ok(next.includes("github.event.workflow_run.event == 'schedule'"));
 assert.ok(next.includes('actions: read')&&next.includes('retries: 0'));
 const post=next.split('\n  post-merge-current-main:\n')[1],job=post.split('\n    steps:\n')[0];
 const expression=job.split('    if: >-\n')[1].split('\n    runs-on:')[0].trim();
 assert.doesNotThrow(()=>new Parser(new Lexer(expression).lex().tokens,['github','needs','vars','inputs'],[]).parse());
 assert.doesNotMatch(job,/^    env:/m,'runner context is unavailable in job-level env; use the runner-bound step');
 assert.throws(()=>new Parser(new Lexer('runner.temp').lex().tokens,['github','needs','strategy','matrix','vars','secrets','inputs'],[]).parse(),/Unrecognized named-value/);
 assert.ok(post.includes('run: printf \'V3_RELEASE_EVIDENCE=%s/unfarmd-v3-main-evidence.json\\n\' "$RUNNER_TEMP" >> "$GITHUB_ENV"'));
 assert.equal(next.split('ref: ${{ github.event.pull_request.head.sha }}').length-1,3,'existing focused/mobile and dependent root jobs test the actual immutable head');
 assert.ok(next.includes('branches: [main, integration/199-source-disabled-v3]'));
 assert.ok(next.includes("github.event.pull_request.base.ref == 'integration/199-source-disabled-v3'"));
 assert.ok(next.includes('REVIEWED_BASE_SHA: ${{ github.event.pull_request.base.sha }}'));
 assert.ok(next.includes('bash scripts/archive-tool.sh check "$REVIEWED_BASE_SHA"'));
 assert.ok(next.includes('NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm test'));
 assert.ok(next.includes('git restore -- docs/live-feed-167/screenshots/{locked,disabled}-{320,390,1280}.png docs/live-feed-167/disabled-{320,390,1280}.json'),'restore exactly the9 known outputs of unchanged legacy browser39, not a directory or safety guard');
 const run=readFileSync('tests/v3-release/run.sh','utf8');for(const source of ['tests/unfarmd-source-selection/run.sh','tests/unfarmd-journal/run.sh'])assert.ok(run.includes(source));
});
test('app, actual A/B math/controls and SEC/journal modules byte-match source; no new runtime caller is added',()=>{
 const manifest=assertAggregate();
 for(const [path,pin] of Object.entries(manifest.files))if(path.startsWith('app/')||path.startsWith('lib/'))assert.equal(hash(readFileSync(path)),pin.sha256,path);
 for(const path of git('ls-tree','-r','--name-only','HEAD','--','app').split('\n').filter(Boolean))assert.doesNotMatch(readFileSync(path,'utf8'),/from\s+['"][^'"]*unfarmd-(?:journal|source-selection)/,path);
});
