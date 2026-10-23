import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {policy,grant,AT} from './fixtures.mjs';
test('exact-head/account/rights/host/session approval is mandatory; sample always rejects',()=>{
  const a=grant(),parse=v=>policy.approval(JSON.stringify(v),a.head,a.renderServiceId,Date.parse(AT));assert.equal(parse(a).runId,a.runId);
  for(const field of ['sourceGo','deploymentGo','planVerified','rightsConfirmed','retentionApproved','dedicatedDataKey','overageDisabled'])assert.throws(()=>parse({...a,[field]:false}));
  for(const change of [{head:'d'.repeat(40)},{scopeHash:'0'.repeat(64)},{workerPolicyHash:'0'.repeat(64)},{accountEvidenceHash:'0'.repeat(64)},{retentionSeconds:86400},{expiresAt:AT},{runId:'another-budget'},{extra:true}])assert.throws(()=>parse({...a,...change}));
  assert.throws(()=>parse(JSON.parse(fs.readFileSync(new URL('../approval.example.json',import.meta.url)))));
});
test('default entry is disabled and does not import missing B module, read a key or invoke a provider',()=>{
  const result=execFileSync(process.execPath,[new URL('../run.mjs',import.meta.url).pathname],{encoding:'utf8',env:{UNFARMD_DATA_ACTIVATION:'disabled',UNFARMD_HELIUS_DATA_KEY:'SYNTHETIC_SHOULD_NOT_PRINT'}});
  assert.equal(JSON.parse(result).state,'DISABLED');assert.equal(JSON.parse(result).counts,null);assert.doesNotMatch(result,/SYNTHETIC_SHOULD_NOT_PRINT/);
  const code=fs.readFileSync(new URL('../run.mjs',import.meta.url),'utf8');assert.doesNotMatch(code,/SCOUT_MINT_HELIUS_API_KEY|SCOUT_MINT_STORE_DATABASE_URL/);
});
