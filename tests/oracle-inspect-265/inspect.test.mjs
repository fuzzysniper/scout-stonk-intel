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
});
