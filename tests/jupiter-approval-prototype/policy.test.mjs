import test from 'node:test';import assert from 'node:assert/strict';
import {simulation} from '../../experiments/jupiter-beta-approval/test-only/harness.mjs';
import {policyIntent,matchesPolicy} from '../../experiments/jupiter-beta-approval/policy.mjs';
test('intended mock policy requires BOTH specified non-root users and credentials, with no OR/threshold fallback',async()=>{const h=simulation(),p=policyIntent(h.context);assert.equal(matchesPolicy(p,h.context),true);assert.equal(p.deployed,false);assert.equal(p.rootQuorumBypassesProviderPolicy,true);assert.deepEqual(p.consensus.allOf.map(x=>x.nonRootUserId),['test_owner','test_validator']);assert.equal((await h.issue()).status,'approved_simulation_only');});
for(const name of ['owner-only','validator-only','duplicate vote','unknown credential','any-one','other key','transaction','hash','root'])test('alternate permissive policy intent rejects: '+name,async()=>{
 const h=simulation(),p=JSON.parse(JSON.stringify(policyIntent(h.context)));
 if(name==='owner-only')p.consensus.allOf.pop();
 if(name==='validator-only')p.consensus.allOf.shift();
 if(name==='duplicate vote')p.consensus.allOf[1]={...p.consensus.allOf[0]};
 if(name==='unknown credential')p.consensus.allOf[0].credentialId='test_unknown';
 if(name==='any-one')p.consensus={anyOf:p.consensus.allOf};
 if(name==='other key')p.keyId='test_other';
 if(name==='transaction')p.activity='ACTIVITY_TYPE_SIGN_TRANSACTION_V2';
 if(name==='hash')p.hashFunction='HASH_FUNCTION_SHA256';
 if(name==='root')p.consensus.allOf[0]={rootUserId:'test_root'};
 assert.equal(matchesPolicy(p,h.context),false);
 const altered=simulation({policyIntent:p});assert.equal((await altered.issue()).status,'denied');assert.equal(altered.calls.source,0);
});
