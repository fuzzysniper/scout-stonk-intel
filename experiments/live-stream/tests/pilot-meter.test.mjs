// Entirely INVENTED OFFLINE receipts. None are Helius observations, prices or source grants.
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditClosedPilot} from '../pilot-meter-audit.mjs';
import {reconcileMeter} from '../../../lib/scout-continuous/meter-reconciliation.mjs';
const h='b'.repeat(64),periodStart='2026-10-01T00:00:00.000Z',periodEnd='2026-11-01T00:00:00.000Z';
const startedAt='2026-10-24T14:00:10.000Z',closedAt='2026-10-24T14:10:10.000Z';
const baseline={version:'unfarmd-meter-observation/1',source:'provider_export',keyFingerprint:h,
 observedAt:'2026-10-24T14:00:00.000Z',settledThrough:'2026-10-24T14:00:00.000Z',periodStart,periodEnd,
 usedCredits:100,remainingCredits:99900,attribution:'data_key',rawHash:h,hardCapUntil:periodEnd,hardCapHash:h,weightsHash:h,throughTicket:0,throughCredits:0};
const first={...baseline,observedAt:'2026-10-24T14:01:00.000Z',settledThrough:'2026-10-24T14:01:00.000Z',usedCredits:110,remainingCredits:99890,throughTicket:1,throughCredits:200};
const receipt={...first,observedAt:'2026-10-24T14:11:00.000Z',settledThrough:closedAt,usedCredits:120,remainingCredits:99880};
const shared={now:receipt.observedAt,scope:{parent:'11111111-1111-4111-8111-111111111111',grantHash:h},snapshot:{anchorObservedAt:first.observedAt,ticket:1,usage:{credits:200}},keyFingerprint:h,endsAt:closedAt,weightsHash:h,hardCapHash:h};
const context={...shared,baseline,previous:first,startedAt,closedAt};

test('characterization: moving checkpoint rejects delayed WSS charge despite unused precharged envelope',()=>{
 const moving=reconcileMeter(receipt,{...shared,previous:first});
 assert.equal(moving.ok,false);assert.equal(moving.reason,'measured_spend_exceeds_reservation');assert.equal(moving.command,null);
 assert.equal(receipt.usedCredits-baseline.usedCredits,20);assert.equal(receipt.throughCredits-baseline.throughCredits,200);
 // This exposes an accounting-boundary decision for B, not permission to bypass it.
 assert.equal(reconcileMeter(receipt,{...shared,previous:baseline}).ok,true);
});
test('closed-pilot audit keeps fixed origin separate from chronological checkpoint; emits no command or GO',()=>{
 const before=JSON.stringify({receipt,context}),r=auditClosedPilot(receipt,context);
 assert.equal(r.ok,true);assert.equal(r.mode,'offline_review');assert.equal(r.measuredCredits,20);assert.equal(r.reservedCredits,200);assert.equal(r.reservedLessMeasuredCredits,180);
 assert.equal(r.sourceGo,false);assert.equal(r.command,null);assert.equal(JSON.stringify({receipt,context}),before);
 assert.notEqual(r.measuredCredits,receipt.throughCredits);assert.notEqual(r.measuredCredits,receipt.usedCredits);
});
test('reservation-anchor freshness alone cannot certify the final ten-minute activity window',()=>{
 const partial={...receipt,settledThrough:first.settledThrough};
 assert.equal(reconcileMeter(partial,{...shared,previous:baseline}).ok,true);
 const r=auditClosedPilot(partial,context);assert.equal(r.ok,false);assert.equal(r.reason,'pilot_tail_not_settled');assert.equal(r.measuredCredits,null);
});
for(const [name,patch,ctx] of [
 ['project totals',{attribution:'project'},{}],
 ['wrong DATA ID',{keyFingerprint:'c'.repeat(64)},{}],
 ['missing baseline',{}, {baseline:null}],
 ['post-reservation origin',{}, {baseline:first}],
 ['stale file reread',{}, {now:'2026-10-24T14:17:00.000Z'}],
 ['future collection',{observedAt:'2026-10-24T14:12:00.000Z'},{}],
 ['wrong watermark key',{weightsHash:'c'.repeat(64)},{}],
 ['cutoff ends before pilot',{hardCapUntil:first.observedAt},{}],
 ['wrong anchor ticket',{throughTicket:2},{}],
 ['wrong anchor credit',{throughCredits:201},{}],
 ['unreserved usage',{usedCredits:301},{}],
 ['fractional provider credits',{usedCredits:120.5},{}],
 ['unsafe integer credits',{usedCredits:Number.MAX_SAFE_INTEGER+1},{}],
 ['billing reset',{periodStart:'2026-10-24T00:00:00.000Z'},{}],
 ['repeat final receipt',{}, {previous:receipt}],
 ['settlement rollback',{settledThrough:'2026-10-24T14:00:30.000Z'},{}],
 ['used-credit rollback',{usedCredits:109},{}],
 ['unconfirmed closure',{}, {closedAt:null}],
 ['future closure',{}, {closedAt:'2026-10-24T14:12:00.000Z'}],
 ['stale origin',{}, {baseline:{...baseline,observedAt:'2026-10-24T13:00:00.000Z',settledThrough:'2026-10-24T13:00:00.000Z'}}],
 ['baseline without raw evidence',{}, {baseline:{...baseline,rawHash:'0'.repeat(64)}}],
 ['baseline after start',{}, {baseline:{...baseline,observedAt:first.observedAt}}],
 ['extra raw/secret field',{raw:'SYNTHETIC_DO_NOT_ECHO'},{}],
])test(`offline pilot report withholds ${name}`,()=>{
 const r=auditClosedPilot({...receipt,...patch},{...context,...ctx});assert.equal(r.ok,false);assert.equal(r.sourceGo,false);assert.equal(r.command,null);assert.equal(r.measuredCredits,null);assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC_DO_NOT_ECHO/);
});
test('shared-account remaining balance movement is not attributed DATA-key spend',()=>{
 const r=auditClosedPilot({...receipt,remainingCredits:70000},context);assert.equal(r.ok,true);assert.equal(r.measuredCredits,20);
});
test('early capped closure is auditable; a final report still cannot approve source use',()=>{
 const r=auditClosedPilot({...receipt,settledThrough:'2026-10-24T14:02:00.000Z'},{...context,closedAt:'2026-10-24T14:02:00.000Z'});
 assert.equal(r.ok,true);assert.equal(r.sourceGo,false);assert.equal(r.command,null);
});

test('original microsecond settlement before closure is withheld, not rounded into coverage',()=>{
 const r=auditClosedPilot({...receipt,settledThrough:'2026-10-24T14:10:10.000001Z'},{...context,closedAt:'2026-10-24T14:10:10.000999Z'});
 assert.equal(r.ok,false);assert.equal(r.reason,'pilot_tail_not_settled');
});
test('invalid calendar clocks cannot be normalized into evidence',()=>{
 const r=auditClosedPilot(receipt,{...context,startedAt:'2026-02-30T14:00:00.000Z'});assert.equal(r.ok,false);
});
test('observed charge is still auditable after a timing overrun; this is never acceptance or source GO',()=>{
 const r=auditClosedPilot({...receipt,settledThrough:'2026-10-24T14:10:11.000Z'},{...context,closedAt:'2026-10-24T14:10:11.000Z'});
 assert.equal(r.ok,true);assert.equal(r.measuredCredits,20);assert.equal(r.sourceGo,false);assert.equal(r.command,null);
});

test('bounded cost review requires no continuous parent or source grant',()=>{
 const {scope,...bounded}=context;assert.ok(scope);const r=auditClosedPilot(receipt,bounded);assert.equal(r.ok,true);assert.equal(r.command,null);assert.equal(r.sourceGo,false);
});
