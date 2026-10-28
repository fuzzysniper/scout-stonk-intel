import test from 'node:test';
import assert from 'node:assert/strict';
import {api,doc,context,entry,report,ref,mint} from './fixtures.mjs';
const reasons=(d,c)=>report(d,c).assessments[0].reasons;
const has=(d,c,reason)=>assert.ok(reasons(d,c).includes(reason),JSON.stringify(reasons(d,c)));
test('synthetic fixture has valid schema and clocks but cannot become sourced evidence or PLAN',()=>{
  const r=report();assert.deepEqual(r.assessments[0].reasons,['synthetic_not_live_evidence']);assert.deepEqual(r.admissibleFactIds,[]);assert.equal(r.decisionAdmissibility.PLAN,'withheld');assert.equal(r.sourceGo,false);assert.equal(r.assetVerification,'not_verified');
});
test('fixture mode independently prevents false source_record promotion',()=>{const d=doc(),c=context();d.entries[0].origin='source_record';c.sourcePolicies[0].origin='source_record';has(d,c,'synthetic_not_live_evidence');assert.deepEqual(report(d,c).admissibleFactIds,[]);});
test('review mode cannot launder synthetic source provenance',()=>{const c=context();c.mode='record_review';has(doc(),c,'synthetic_not_live_evidence');});
test('mislabeling a fixture as source_record conflicts with external fixture policy',()=>{const d=doc(),c=context();d.entries[0].origin='source_record';c.mode='record_review';has(d,c,'source_origin_mismatch');has(d,c,'synthetic_not_live_evidence');});
test('no registry means unknown source, never automatically supported',()=>{const c=context();delete c.sourcePolicies;has(doc(),c,'source_unknown');assert.deepEqual(report(doc(),c).admissibleFactIds,[]);});
test('known source disabled is distinct from unknown',()=>{const c=context();c.sourcePolicies[0].state='disabled';has(doc(),c,'source_disabled');assert.ok(!reasons(doc(),c).includes('source_unknown'));});
test('unknown source can be explicitly represented with source:null',()=>{const d=doc();d.entries[0].source=null;has(d,context(),'source_unknown');});
test('provider identity cannot be aliased through source ID',()=>{const d=doc();d.entries[0].source.providerId='another-provider';has(d,context(),'provider_identity_mismatch');});
test('a Pump-only policy cannot cover EVM or equity records',()=>{
  for(const identity of [{kind:'evm_token',chain:'eip155:1',address:'0x'+'a'.repeat(40)},{kind:'listed_equity',mic:'XNAS',ticker:'NVDA'}]){
    const d=doc();d.asset=api.resolveAssetIdentity(identity);d.entries[0].assetKey=d.asset.asset.assetKey;d.entries[0].coverage.chain=identity.chain??null;has(d,context(),'source_coverage_mismatch');
  }
});
test('two valid mints and clusters cannot share evidence',()=>{const d=doc();d.entries[0].assetKey=`solana:devnet:${mint}`;has(d,context(),'asset_identity_mismatch');d.entries[0].coverage.chain='solana:devnet';has(d,context(),'coverage_chain_mismatch');});
test('ambiguous identity cannot claim a known mint',()=>{const d=doc();d.asset=api.resolveAssetIdentity({kind:'unknown',ticker:'SOL'});has(d,context(),'identity_unresolved');assert.equal(report(d,context()).assetKey,null);});
test('retrieval method must be reviewed separately',()=>{const d=doc();d.entries[0].source.method='websocket';has(d,context(),'retrieval_method_not_reviewed');});
for(const [name,mutate,reason] of [
  ['unknown rights',d=>{d.entries[0].source.rights.status='unverified';},'record_rights_unconfirmed'],
  ['denied rights',d=>{d.entries[0].source.rights.status='denied';},'record_rights_unconfirmed'],
  ['restricted rights',d=>{d.entries[0].source.rights.status='restricted';},'record_rights_unconfirmed'],
  ['missing rights reference',d=>{d.entries[0].source.rights.reference=null;},'record_rights_unconfirmed'],
  ['retention unverified',d=>{d.entries[0].source.rights.retention='unverified';},'record_retention_unconfirmed'],
  ['retention prohibited',d=>{d.entries[0].source.rights.retention='prohibited';},'record_retention_unconfirmed'],
  ['entitlement unverified',d=>{d.entries[0].source.entitlement.status='unverified';},'record_entitlement_unconfirmed'],
  ['missing entitlement reference',d=>{d.entries[0].source.entitlement.reference=null;},'record_entitlement_unconfirmed'],
  ['unreviewed source clock',d=>{d.entries[0].clocks.observedClock='unknown';},'source_clock_unverified'],
  ['unknown finality',d=>{d.entries[0].verification.finality='unknown';},'finality_not_established'],
  ['provisional finality',d=>{d.entries[0].verification.finality='provisional';},'finality_not_established'],
  ['verification unverified',d=>{d.entries[0].verification.tier='unverified';},'verification_unverified'],
  ['missing raw reference',d=>{d.entries[0].reference=null;},'provenance_reference_missing'],
  ['missing observation clock',d=>{d.entries[0].clocks.observedAt=null;},'observation_clock_missing'],
  ['missing receipt clock',d=>{d.entries[0].clocks.receivedAt=null;},'observation_clock_missing'],
  ['unbounded freshness',d=>{d.entries[0].maxAgeSeconds=null;},'freshness_unknown'],
  ['unknown coverage',d=>{d.entries[0].coverage.kind='unknown';},'coverage_unknown'],
])test(`withhold ${name} without rewriting it`,()=>{const d=doc();mutate(d);const before=JSON.stringify(d);has(d,context(),reason);assert.equal(JSON.stringify(d),before);});
test('rights are independently checked at policy boundary',()=>{const c=context();c.sourcePolicies[0].rights.status='unverified';has(doc(),c,'policy_rights_unconfirmed');c.sourcePolicies[0].rights.retention='prohibited';has(doc(),c,'policy_retention_unconfirmed');c.sourcePolicies[0].entitlement.status='denied';has(doc(),c,'policy_entitlement_unconfirmed');});
test('private research rights do not imply public or commercial publication',()=>{for(const intendedUse of ['public_display','commercial_reporting']){const c=context();c.intendedUse=intendedUse;has(doc(),c,'policy_rights_unconfirmed');has(doc(),c,'record_rights_unconfirmed');}});
test('intended use survives both assessment and redacted export',()=>{const c=context();c.intendedUse='commercial_reporting';assert.equal(report(doc(),c).intendedUse,'commercial_reporting');assert.equal(JSON.parse(api.serializeRedacted(doc(),c)).intendedUse,'commercial_reporting');});
test('fresh received time does not refresh original observed time',()=>{const d=doc();d.entries[0].clocks.observedAt='2026-10-27T11:00:00Z';d.entries[0].clocks.receivedAt='2026-10-27T12:00:01Z';has(d,context(),'observation_stale');assert.equal(report(d,context()).assessments[0].freshness,'stale');});
test('stricter policy freshness wins; exact boundary and nanosecond overflow honored',()=>{
  const c=context();c.sourcePolicies[0].maxAgeSeconds=2;assert.equal(report(doc(),c).assessments[0].freshness,'fresh');
  c.evaluatedAt='2026-10-27T12:00:02.000000001Z';assert.equal(report(doc(),c).assessments[0].freshness,'stale');
});
test('original source clocks remain separate and unmodified',()=>{const d=doc();d.entries[0].clocks.reportedAt='2026-10-27T11:59:59.500000001Z';const r=api.validateEvidence(d);assert.equal(r.ok,true);assert.deepEqual(r.value.entries[0].clocks,d.entries[0].clocks);assert.notEqual(r.value.entries[0].clocks.reportedAt,r.value.entries[0].clocks.observedAt);});
for(const [name,mutate] of [
  ['future observed',e=>{e.clocks.observedAt='2026-10-27T12:00:03Z';}],
  ['future received',e=>{e.clocks.receivedAt='2026-10-27T12:00:03Z';}],
  ['reported after received',e=>{e.clocks.reportedAt='2026-10-27T12:00:01.000000001Z';}],
  ['observed after received',e=>{e.clocks.observedAt='2026-10-27T12:00:01.000000001Z';}],
])test(`withhold invalid chronology: ${name}`,()=>{const d=doc();mutate(d.entries[0]);has(d,context(),'invalid_clock_order_or_future');assert.equal(report(d,context()).assessments[0].freshness,'invalid_clock');});
test('interval coverage requires complete aligned original bounds',()=>{const d=doc();d.entries[0].coverage.kind='interval';has(d,context(),'interval_bounds_missing');d.entries[0].coverage.from='2026-10-27T11:59:00Z';d.entries[0].coverage.to='2026-10-27T12:00:01Z';has(d,context(),'invalid_clock_order_or_future');d.entries[0].coverage.to='2026-10-27T11:58:00Z';has(d,context(),'invalid_clock_order_or_future');});
test('a snapshot cannot be silently presented as interval history',()=>{const d=doc();d.entries[0].coverage.from='2026-10-27T11:59:00Z';has(d,context(),'interval_kind_mismatch');});
test('fresh retrieval of a historical interval does not make its observations current',()=>{const d=doc();d.entries[0].coverage={kind:'interval',chain:'solana:mainnet',from:'2026-10-26T11:59:00Z',to:'2026-10-26T12:00:00Z',exhaustive:false};has(d,context(),'observation_stale');});
test('contradiction blocks both facts and PLAN; no last-wins overwrite',()=>{
  const d=doc();const other={...entry(),id:'opposing-claim',category:'counterevidence',statement:'INVENTED OFFLINE opposing evidence.',contradicts:[d.entries[0].id]};d.entries.push(other);
  const r=report(d);assert.equal(r.assessments.length,2);for(const a of r.assessments)assert.ok(a.reasons.includes('contradictory_evidence'));assert.deepEqual(r.counterevidenceIds,['opposing-claim']);assert.equal(r.decisionAdmissibility.PLAN,'withheld');
});
test('facts, user assertions, hypotheses, counterevidence and unavailable are separate',()=>{
  const d=doc();d.entries=[];
  for(const category of ['user_assertion','hypothesis','counterevidence','unavailable'])d.entries.push({...entry(),id:category,category,origin:'user_entry',source:null,verification:{tier:'unverified',finality:'unknown',reference:null}});
  const r=report(d);assert.deepEqual(r.userAssertionIds,['user_assertion']);assert.deepEqual(r.hypothesisIds,['hypothesis']);assert.deepEqual(r.unavailableIds,['unavailable']);assert.deepEqual(r.admissibleFactIds,[]);
});
test('missing-data outcome never supplies a zero or quantity',()=>{const d=doc();d.entries[0].category='unavailable';d.entries[0].quantity={raw:'0',decimals:0,unitAssetKey:d.asset.asset.assetKey};assert.equal(api.validateEvidence(d).ok,false);});
test('user-entered facts cannot promote themselves to verified',()=>{const d=doc();d.entries[0].origin='user_entry';assert.equal(api.validateEvidence(d).ok,false);});
test('derived record retains dependencies and needs separate method review',()=>{const d=doc();d.entries.push({...entry(),id:'derived',representation:'derived',derivedFrom:[d.entries[0].id]});const r=report(d);assert.ok(r.assessments[1].reasons.includes('derivation_method_not_reviewed'));});
test('unresolved unknowns prevent PLAN independently of risk calculations',()=>{const d=doc();d.entries[0].unknowns=['holder_concentration_not_observed'];const r=report(d);assert.deepEqual(r.unknownIds,[d.entries[0].id]);assert.ok(r.decisionAdmissibility.reasons.includes('unresolved_evidence_unknowns'));});
test('empty evidence is honest and WATCH/PASS remain recordable',()=>{const d=doc();d.entries=[];const r=report(d);assert.deepEqual(r.admissibleFactIds,[]);assert.equal(r.decisionAdmissibility.PLAN,'withheld');assert.equal(r.decisionAdmissibility.WATCH,'recordable_without_source_evidence');assert.equal(r.decisionAdmissibility.PASS,'recordable_without_source_evidence');});
test('exact quantities preserve integer and scale beyond IEEE754 without calculation',()=>{const d=doc();d.entries[0].quantity={raw:'18446744073709551615',decimals:9,unitAssetKey:d.asset.asset.assetKey};const r=api.validateEvidence(d);assert.equal(r.ok,true);assert.deepEqual(r.value.entries[0].quantity,d.entries[0].quantity);});
test('a quote quantity must name an exact asset key, never a ticker',()=>{const d=doc();d.entries[0].quantity={raw:'100',decimals:2,unitAssetKey:'USDC'};assert.equal(api.validateEvidence(d).ok,false);});
test('null hash stays null; no content or RPC hash is invented',()=>{const d=doc();assert.equal(api.validateEvidence(d).value.entries[0].reference.sha256,null);const exp=JSON.parse(api.serializeRedacted(d,context()));assert.equal(exp.entries[0].rawSha256,null);});
test('finalized_reported cannot silently become independently verified',()=>{const d=doc();d.entries[0].verification.finality='finalized_independently_verified';assert.equal(api.validateEvidence(d).ok,false);d.entries[0].verification.tier='independently_replayed';assert.equal(api.validateEvidence(d).ok,false);d.entries[0].verification.reference=ref();assert.equal(api.validateEvidence(d).ok,true);assert.equal(report(d).sourceGo,false);});
test('deterministic evaluation is immutable and has no ambient clock',()=>{const d=doc(),c=context(),before=JSON.stringify({d,c});assert.deepEqual(report(d,c),report(d,c));assert.equal(JSON.stringify({d,c}),before);});
