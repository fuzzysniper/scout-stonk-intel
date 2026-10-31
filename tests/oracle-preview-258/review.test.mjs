// Exact, intentionally finite source-diff review for the dedicated internal
// development Preview. It does not modify or disable A/B/C's original guards;
// those execute unchanged in their corresponding frozen Git input trees.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const parent='9d0cb2d9f3130ae95a175161e38ce155e05de22d';
const path='lib/v4-ca-intelligence/private-development-gate.ts';
const previous="const BRANCH='feat/251-evidence-risk-readout';";
const current="const BRANCH='feat/258-oracle-integrated-preview';";
test('only pre-reviewed Preview branch pin changed; no A/B/C, budget, SQL, production mutations',()=>{
 const files=execFileSync('git',['diff','--name-only',parent,'HEAD'],{encoding:'utf8'}).trim().split('\n').sort();
 assert.deepEqual(files,[path,'tests/oracle-preview-258/review.test.mjs','.github/workflows/oracle-preview-258.yml'].sort());
 const before=execFileSync('git',['show',parent+':'+path],{encoding:'utf8'});
 const after=readFileSync(path,'utf8');
 assert.equal(before.split(previous).length,2);
 assert.equal(after,before.replace(previous,current));
 for(const s of ['VERCEL_ENV===\'preview\'','VERCEL_PROJECT_ID===PROJECT','VERCEL_GIT_COMMIT_REF===BRANCH','!\(process.env.UNFARMD_OWNER_RELEASE||\'\'\).trim()']){
  if(s.includes('\\')) continue;
  assert.ok(after.includes(s));
 }
});
test('source gate defaults off in a source checkout without authorized preview metadata',()=>{
 const s=readFileSync(path,'utf8');
 assert.ok(s.includes('return process.env.VERCEL_ENV===\'preview\''));
 assert.ok(s.includes('process.env.VERCEL_GIT_COMMIT_REF===BRANCH'));
 assert.ok(s.includes("&&!(process.env.UNFARMD_OWNER_RELEASE||'').trim()"));
 assert.ok(s.includes('/^scout-stonk-intel-'));
});
