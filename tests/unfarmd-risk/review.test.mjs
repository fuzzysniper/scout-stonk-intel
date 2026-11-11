import {test} from 'node:test';
import assert from 'node:assert/strict';
import {risk,AT,copy,plan,events,reviewContext} from './fixtures.mjs';
test('recordDecision returns a detached frozen in-memory snapshot, no storage',()=>{
 const p=plan(),r=risk.recordDecision(p,{id:'decision-1',recordedAt:AT});assert.equal(r.ok,true);p.thesis='changed later';assert.notEqual(r.event.plan.thesis,p.thesis);assert.ok(Object.isFrozen(r.event));assert.ok(Object.isFrozen(r.event.plan.assumptions.entry.price));assert.throws(()=>r.event.plan.assumptions.entry.price.amount='1');
});
test('an incomplete PLAN cannot become a decision event',()=>{const p=plan();delete p.counterThesis;assert.equal(risk.recordDecision(p,{id:'decision-1',recordedAt:AT}).event,null);});
test('event identifiers reject trailing line terminators rather than silently matching regex prefixes',()=>{for(const suffix of ['\n','\r','\u2028'])assert.equal(risk.recordDecision(plan(),{id:'decision'+suffix,recordedAt:AT}).ok,false);const e=events();e.execution.id+='\n';assert.equal(risk.reviewDecision(e,reviewContext).status,'invalid');});
for(const decision of ['PASS','WATCH'])test(decision+' records no-entry process success without financial values',()=>{
 const e=events();e.decision=risk.recordDecision({version:'unfarmd-risk/1',decision,reason:'Deliberately do not enter'},{id:'decision-1',recordedAt:AT}).event;e.execution=null;e.review.outcome='no_entry';const r=risk.reviewDecision(e,reviewContext);assert.equal(r.status,'reviewed');assert.equal(r.adherence,'no_reported_entry');assert.equal(r.actualLoss,null);assert.equal(r.storage,'none');
});
test('losing outcome with reported precommitment intact remains a compliant-process report',()=>{
 const e=events();e.review.outcome='loss';const r=risk.reviewDecision(e,reviewContext);assert.equal(r.adherence,'reported_inputs_within_plan');assert.equal(r.reportedOutcome,'loss');assert.equal(r.executionVerified,false);assert.equal(r.actualLoss,null);
});
test('winning outcome after exceeding chosen size remains outside plan',()=>{
 const e=events();e.review.outcome='gain';e.execution.units='6';const r=risk.reviewDecision(e,reviewContext);assert.equal(r.adherence,'outside_plan');assert.ok(r.checks.some(c=>c.rule==='units_within_precommitment'&&c.status==='breached'));assert.equal(r.reportedOutcome,'gain');
});
test('gain/loss/flat/unknown cannot change process classification for identical reported actions',()=>{
 const e=events(),results=[];for(const outcome of ['gain','loss','flat','unknown']){e.review.outcome=outcome;const r=risk.reviewDecision(e,reviewContext);results.push({checks:r.checks,adherence:r.adherence});}for(const r of results)assert.deepEqual(r,results[0]);
});
test('profitable retrospective decision is late, never decision-before-entry',()=>{const e=events();e.execution.occurredAt='2026-10-27T11:59:30.000Z';e.review.outcome='gain';const r=risk.reviewDecision(e,reviewContext);assert.equal(r.chronology,'late_or_unknown');assert.equal(r.adherence,'outside_plan');});
test('same-millisecond decision and entry are not proven precommitment',()=>{const e=events();e.execution.occurredAt=AT;const r=risk.reviewDecision(e,reviewContext);assert.equal(r.adherence,'outside_plan');});
test('higher entry, lowered stop and larger units cannot be approved by hindsight',()=>{const e=events();e.execution.entryPrice='101';e.execution.stopPrice='80';e.execution.units='20';const r=risk.reviewDecision(e,reviewContext);assert.equal(r.adherence,'outside_plan');assert.ok(r.checks.filter(c=>c.status==='breached').length>=3);});
test('original reference window ages through entry, never refreshed by review',()=>{const e=events();e.execution.occurredAt='2026-10-27T13:00:01.000Z';e.execution.recordedAt='2026-10-27T13:01:00.000Z';e.review.recordedAt='2026-10-27T13:02:00.000Z';const r=risk.reviewDecision(e,{evaluatedAt:'2026-10-27T13:03:00.000Z'});assert.equal(r.adherence,'outside_plan');assert.ok(r.checks.some(c=>c.rule==='reference_window_at_reported_entry'&&c.status==='breached'));});
test('an unreported stop stays unknown even after reported gain',()=>{const e=events();e.execution.stopPrice=null;e.review.outcome='gain';const r=risk.reviewDecision(e,reviewContext);assert.equal(r.adherence,'not_assessable');assert.equal(r.actualLoss,null);});
test('exact asset key mismatch is visible without ticker guessing',()=>{const e=events();e.execution.asset.assetKey='solana:mainnet:OTHER';const r=risk.reviewDecision(e,reviewContext);assert.equal(r.adherence,'outside_plan');});
test('a PASS followed by user-reported entry remains outside precommitment',()=>{const e=events();e.decision=risk.recordDecision({version:'unfarmd-risk/1',decision:'PASS',reason:'No entry intended'},{id:'decision-1',recordedAt:AT}).event;e.execution.mode='user_reported';const r=risk.reviewDecision(e,reviewContext);assert.equal(r.adherence,'outside_plan');});
for(const mode of ['paper','simulated','user_reported'])test('execution mode '+mode+' remains explicitly unverified',()=>{const e=events();e.execution.mode=mode;const r=risk.reviewDecision(e,reviewContext);assert.equal(r.executionMode,mode);assert.equal(r.executionVerified,false);});
for(const [name,mutate] of [
 ['wrong decision ID',e=>e.execution.decisionId='different'],
 ['wrong review ID',e=>e.review.decisionId='different'],
 ['duplicate event ID',e=>e.execution.id=e.decision.id],
 ['unknown live execution mode',e=>e.execution.mode='verified_live'],
 ['recorded before reported occurrence',e=>e.execution.recordedAt='2026-10-27T12:00:00.000Z'],
 ['review before report',e=>e.review.recordedAt='2026-10-27T12:01:00.000Z'],
 ['future review',e=>e.review.recordedAt='2027-10-27T12:04:00.000Z'],
 ['invalid calendar',e=>e.execution.occurredAt='2026-02-30T12:01:00.000Z'],
 ['nonpositive units',e=>e.execution.units='0'],
 ['negative price',e=>e.execution.entryPrice='-1'],
 ['nonUSD execution',e=>e.execution.currency='USDC'],
 ['short execution',e=>e.execution.instrument='short'],
 ['profit without entry',e=>{e.execution=null;e.review.outcome='gain';}],
 ['no_entry with execution',e=>e.review.outcome='no_entry'],
 ['empty lesson',e=>e.review.lessons=[]],
 ['unexpected secret field',e=>e.review.raw='SYNTHETIC_DO_NOT_ECHO'],
 ['incomplete historical PLAN',e=>{e.decision=copy(e.decision);delete e.decision.plan.thesis;}]
])test('review rejects '+name,()=>{const e=events();mutate(e);const r=risk.reviewDecision(e,reviewContext);assert.equal(r.status,'invalid');assert.ok(!JSON.stringify(r).includes('SYNTHETIC_DO_NOT_ECHO'));});
test('review returns no free-text notes, raw identity, amounts or hidden user data',()=>{const e=events();e.review.lessons=['SYNTHETIC_PRIVATE_LESSON'];const r=risk.reviewDecision(e,reviewContext);const json=JSON.stringify(r);assert.ok(!json.includes('SYNTHETIC_PRIVATE_LESSON'));assert.ok(!json.includes('SYNTHETIC UNIT'));assert.ok(!json.includes('entryPrice'));assert.equal(r.actualLoss,null);});
test('reviews and events are deterministic without touching or revising original decisions',()=>{const e=events(),before=copy(e);assert.deepEqual(risk.reviewDecision(e,reviewContext),risk.reviewDecision(e,reviewContext));assert.deepEqual(e,before);});
