import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectFailureMessage as message} from '../../app/lens/inspect-errors.ts';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const parent='412ba2bdacb4dbcff8c11eda3a751edc1b758d32';

test('finite source diff: only dedicated error diagnostics and exact Preview branch',()=>{
 const files=execFileSync('git',['diff','--name-only',parent,'HEAD'],{encoding:'utf8'}).trim().split('\n').sort();
 assert.deepEqual(files,[
  'app/lens/ca-view.tsx','app/lens/inspect-errors.ts',
  'app/api/v4/ca-intelligence/route.ts',
  'app/api/v4/ca-intelligence/compose-preview.ts',
  'lib/v4-ca-intelligence/private-development-gate.ts',
  'tests/oracle-inspect-265/inspect.test.mjs'
 ].sort());
 const before=execFileSync('git',['show',parent+':lib/v4-ca-intelligence/private-development-gate.ts'],{encoding:'utf8'});
 const actual=readFileSync('lib/v4-ca-intelligence/private-development-gate.ts','utf8');
 assert.equal(actual,before.replace("const BRANCH='feat/261-decision-first-oracle';","const BRANCH='feat/265-oracle-inspect-diagnostics';"));
 for(const s of ["process.env.VERCEL_ENV==='preview'","process.env.VERCEL_PROJECT_ID===PROJECT","process.env.VERCEL_GIT_COMMIT_REF===BRANCH","!(process.env.UNFARMD_OWNER_RELEASE||'').trim()"])assert.ok(actual.includes(s));
 const ui=readFileSync('app/lens/ca-view.tsx','utf8');
 assert.ok(ui.includes('setError(inspectFailureMessage(e,controller.signal.aborted))'));
 assert.ok(ui.includes('r.status===503&&!previewAvailable&&!marketPreviewAvailable'));
 assert.ok(ui.includes("redirect:'error'"));
 assert.ok(ui.includes("response.headers.get('x-unfarmd-inspect-stage')"));
 assert.ok(ui.includes("response.headers.get('x-vercel-id')"));
 const route=readFileSync('app/api/v4/ca-intelligence/route.ts','utf8');
 assert.ok(route.includes('if(!internalMarketPreview())return off()'));
 assert.ok(route.includes("unavailable('source_module')"));
 assert.ok(route.includes("unavailable('oracle_module')"));
 assert.ok(!route.includes('import {inspectPrivateDevelopment}'));
 assert.ok(route.includes("import('./compose-preview')"));
 assert.ok(!route.includes("import('./compose-oracle')"));
 const preview=readFileSync('app/api/v4/ca-intelligence/compose-preview.ts','utf8');
 assert.ok(preview.includes('projectOnchainRisk({mint:view.mint,evaluatedAt,onchain:null,jupiter:null})'));
 assert.ok(preview.includes("nativeMint:{state:'unavailable',reason:'not_selected'}"));
 assert.ok(preview.includes("holders:{state:'unavailable',reason:'receipt_bridge_not_admitted'"));
 for(const forbidden of ["from '../../../../lib/v4-oracle/native-mint'","from '../../../../lib/v4-owner-preview/auth'","from 'pg'","from './qualified-inputs'","from './compose-oracle'"])
  assert.ok(!preview.includes(forbidden),'no heavy native source import: '+forbidden);
});

test('classify Vercel HTTP, auth, source and validation denials without copying private payloads',()=>{
 const matrix=[
  [{status:401},'HTTP 401'],
  [{status:403},'HTTP 403'],
  [{status:429},'HTTP 429'],
  [{status:503},'HTTP 503'],
  [{status:500},'HTTP 500'],
  [{message:'invalid_inspection'},'INVALID_RESPONSE'],
  [{message:'response_too_large'},'size limit'],
  [{name:'AbortError'},'timed out'],
  [{name:'TimeoutError'},'timed out'],
  [new TypeError('PRIVATE_SECRET_in_error'),'session expired']
 ];
 for(const [e,expected] of matrix){const m=message(e,false);assert.ok(m.includes(expected),expected+': '+m);assert.ok(!m.includes('PRIVATE_SECRET'));}
 assert.ok(message({},true).includes('interrupted'));
 assert.ok(message({status:503,stage:'oracle_module'},false).includes('ORACLE_MODULE'));
 const id='iad1::very_safe_request_123';
 assert.ok(message({status:500,requestId:id},false).includes(id));
 assert.ok(!message({status:500,requestId:'PRIVATE SECRET / injected'},false).includes('PRIVATE SECRET'));
 assert.ok(!message({status:503,stage:'../../private_password'},false).includes('private_password'));

});
