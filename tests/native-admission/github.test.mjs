import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,clone,load,canonical,setupCandidate,sourceCandidate} from './fixtures.mjs';
const {publication,verifyEvidence,evidencePaths,listingPath,allowedPath,configurationPath,privateManifest}=load('github');
for(const stage of ['setup','source'])test('SYNTHETIC documented GitHub '+stage+' evidence gives candidate only, with an exact owner environment review',()=>{
 const f=fixture(),s=setupCandidate(canonical(f.setup),f.context,f.now),r=stage==='setup'?s:sourceCandidate(canonical(f.source),s,f.context,f.now),p=publication([f.publication(stage,r)],stage,f.context),candidate=verifyEvidence(f.evidence(stage,r),r,stage,f.context,f.now);
 assert.deepEqual(Object.keys(candidate),['kind','stage','manifestSha256','sourceCalls']);assert.equal(privateManifest(f.configuration(stage,r),p,stage,f.context),canonical(r));assert.ok(allowedPath(configurationPath(stage,f.context)));assert.equal(candidate.kind,'candidate');assert.equal(candidate.sourceCalls,false);assert.ok(allowedPath(listingPath(stage,f.context)));for(const path of Object.values(evidencePaths(r,stage,p)))assert.ok(allowedPath(path),path);
});
const attacks={
 'bot or label is not owner approval':e=>e.reviews[0].user={id:41898282,type:'Bot',login:'github-actions[bot]'},
 'issue-comment substitute':e=>{e.reviews=[{...e.reviews[0],state:'commented'}];},'wrong review hash':e=>e.reviews[0].comment='APPROVE_NATIVE_SETUP wrong',
 'extra reviewer':e=>e.environment.protection_rules[0].reviewers.push({type:'User',reviewer:{id:999}}),
 'team reviewer':e=>e.environment.protection_rules[0].reviewers[0].type='Team','admin bypass':e=>e.environment.can_admins_bypass=true,
 'unknown rules':e=>e.environment.protection_rules.push({type:'unknown'}),'missing reviewer protection':e=>e.environment.protection_rules=e.environment.protection_rules.filter(x=>x.type!=='required_reviewers'),
 'wrong environment':e=>e.environment.id=999,'wrong review environment':e=>e.reviews[0].environments[0].name='production',
 'review rejection':e=>e.reviews[0].state='rejected','multiple approvals':e=>e.reviews.push(clone(e.reviews[0])),
 'branch wildcard':e=>e.branches.branch_policies[0].name='*','tag substitution':e=>e.branches.branch_policies[0].type='tag','extra branch':e=>e.branches.total_count=2,
 'unfinished workflow':e=>e.run.status='in_progress','failed workflow':e=>e.run.conclusion='failure','wrong code SHA':e=>e.run.head_sha='a'.repeat(40),
 'wrong workflow id':e=>e.run.workflow_id=999,'foreign repository':e=>e.run.repository.id=999,'unreviewed workflow':e=>e.run.path='.github/workflows/other.yml',
 'future API timestamp':e=>e.run.updated_at='2099-01-01T00:00:00Z','stale approval':e=>{e.run.created_at='2020-01-01T00:00:00Z';e.run.updated_at=e.run.created_at;},
 'artifact substitution':e=>e.artifact.digest='sha256:'+'a'.repeat(64),'expired artifact':e=>e.artifact.expired=true,'foreign artifact':e=>e.artifact.workflow_run.repository_id=999,
 'wrong artifact source':e=>e.artifact.workflow_run.head_sha='a'.repeat(40),'wrong artifact deployment':e=>e.artifact.name='native-pilot-build-dpl_OTHER',
 'workflow content substitution':e=>e.workflow.content=Buffer.from('OTHER').toString('base64'),'invalid base64':e=>e.workflow.content+='!',
 'inactive/revoked release':e=>e.statuses[0].state='inactive','forged release creator':e=>e.statuses[0].creator.id=999,
 'review from another run':e=>e.statuses[0].log_url+='other'
};
for(const[label,mutate]of Object.entries(attacks))test('control-plane candidate denies '+label,()=>{const f=fixture(),e=clone(f.evidence('setup',f.setup));mutate(e);assert.throws(()=>verifyEvidence(e,f.setup,'setup',f.context,f.now));});
test('source requires its independent review; setup approval cannot be replayed as live permission',()=>{const f=fixture();assert.throws(()=>verifyEvidence(f.evidence('setup',f.setup),f.source,'source',f.context,f.now));});
test('duplicate publications, unsigned old envelopes and wrong bot/target deny without selecting a convenient record',()=>{const f=fixture(),p=f.publication('setup',f.setup);for(const value of [[],[p,p],[{...p,payload:{payload:'x',signature:'x'}}],[{...p,sha:'a'.repeat(40)}],[{...p,creator:{id:58099771,login:'fuzzysniper',type:'User'}}],[{...p,production_environment:true}]])assert.throws(()=>publication(value,'setup',f.context));});
for(const path of ['/repos/evil/other/deployments','/repos/fuzzysniper/scout-stonk-intel/issues/1/comments','/repos/fuzzysniper/scout-stonk-intel/actions/secrets','https://evil.invalid','/repos/fuzzysniper/scout-stonk-intel/deployments\r\nAuthorization: x','/repos/fuzzysniper/scout-stonk-intel/contents/.github/workflows/native-pilot-admission.yml?ref=main'])test('fixed GET endpoint allowlist denies '+path.replace(/[\r\n]/g,''),()=>assert.equal(allowedPath(path),false));

test('private configuration substitution/wrong deployment fails and public publication contains no mint/owner scope',()=>{const f=fixture(),p=publication([f.publication('setup',f.setup)],'setup',f.context),v=f.configuration('setup',f.setup);assert.equal(JSON.stringify(p).includes(f.p.mint),false);assert.equal(JSON.stringify(p).includes(f.p.ownerSubject),false);for(const bad of [{...v,value:v.value+' '},{...v,name:v.name+'OTHER'},{...v,value:canonical(f.source)}])assert.throws(()=>privateManifest(bad,p,'setup',f.context));});
