import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {assertV4} from '../v4-integration/assertions.mjs';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const files=[...['contract','internal','market','source-off','onchain','join','thesis','index'].map(n=>`lib/unfarmd-intelligence/${n}.ts`),
 ...['fixtures.mjs','market.test.mjs','join.test.mjs','thesis.test.mjs','scope.test.mjs','run.sh','__init__.py','engine_test.py'].map(n=>'tests/unfarmd-intelligence/'+n),
 'docs/v4/intelligence-contract.md','docs/v4/market-rights-and-legacy-audit.md','.github/workflows/intelligence-offline.yml'];
test('additive19-file evidence-only scope; every preexisting route/runtime/collector/V3 guard is unchanged',()=>{
 assertV4();assert.equal(git('merge-base','--is-ancestor','5c6e36fef0fc15acb07c954566a3975cb77fc102','HEAD'),'');
 const allowed=new Set(files);assert.equal(allowed.size,19);
 for(const file of files)assert.ok(fs.statSync(file).isFile(),file);
});
test('source/rights/storage gates are hard OFF; no runtime fetch/secrets/storage or new API',()=>{
 const runtime=files.filter(p=>p.startsWith('lib/')).map(p=>fs.readFileSync(p,'utf8')).join('\n');
 assert.doesNotMatch(runtime,/\bfetch\s*\(|process\.env|localStorage|sessionStorage|indexedDB|writeFile|readFile|WebSocket|from ['"](?:pg|node:fs)/);
 assert.match(fs.readFileSync('lib/unfarmd-intelligence/internal.ts','utf8'),/import 'server-only'/);
 assert.match(fs.readFileSync('lib/unfarmd-intelligence/contract.ts','utf8'),/acquisition: false, publicFinancialDisplay: false, storage: false/);
 assert.match(fs.readFileSync('lib/unfarmd-intelligence/thesis.ts','utf8'),/storage:false,encrypted:false,export:false,authenticated:false/);
 assert.match(fs.readFileSync('lib/unfarmd-intelligence/market.ts','utf8'),/decodeObservation/);
});
test('focused tests run in full existing Python discovery and dedicated read-only offline CI',()=>{
 const ci=fs.readFileSync('.github/workflows/intelligence-offline.yml','utf8');
 assert.match(ci,/contents: read/);assert.match(ci,/persist-credentials: false/);assert.match(ci,/tests\/unfarmd-intelligence\/run\.sh/);
 assert.doesNotMatch(ci,/secrets\.|workflow_dispatch|schedule:|vercel |neon |curl |api\.dexscreener|mainnet\.helius/);
 assert.match(fs.readFileSync('tests/unfarmd-intelligence/engine_test.py','utf8'),/tests\/unfarmd-intelligence\/run\.sh/);
});
