import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {AT,validDraft,api as original} from '../desk-integration/fixtures.mjs';
const api=createRequire(import.meta.url)(process.env.DESK_INTEGRATION_BUILD+'/app/desk/journey/model.js');
const percentages=()=>({allocationBps:'10',entryFee:'0',exitFee:'0',entrySlip:'0',exitSlip:'0'});
test('exact percent conversion covers every supported BPS without float or rounding',()=>{
 for(let bps=0;bps<=10000;bps++){
  const raw=`${Math.floor(bps/100)}.${String(bps%100).padStart(2,'0')}`;
  assert.equal(api.percentToBps(raw),String(bps));
 }
 for(const [raw,bps] of [['0','0'],['0.01','1'],['0.1','10'],['1.23','123'],['100','10000']])assert.equal(api.percentToBps(raw),bps);
});
for(const raw of ['','.5','01','1e2','-1','+1','1.001','100.01','101','Infinity','NaN',' 1','1 ','1\n','1,5','0x10','1.','100.000'])test('percent rejects '+JSON.stringify(raw),()=>assert.equal(api.percentToBps(raw),null));
test('no entered default capital/cash/exposure/prices/time/percentages or acknowledgements',()=>{
 const d=api.emptyDraft(),p=api.emptyPercentages(),r=api.evaluateJourney(d,p,AT);
 for(const field of ['entry','stop','capital','cash','existing','loss','asOfUtc','validSeconds','currency','instrument'])assert.equal(d[field],'');
 assert.ok(Object.values(p).every(v=>v===''));assert.equal(d.confirmed,false);assert.equal(d.costConfirmed,false);assert.equal(r.recordable,false);
});
test('real B manual PLAN/recordDecision, exact math and actual A sourceGo false',()=>{
 const d=validDraft(),p=percentages(),r=api.recordJourney(d,p,'PLAN',AT,'journey-1');
 assert.ok(r.event);assert.equal(r.evaluation.risk.status,'recordable');assert.equal(r.evaluation.risk.calculation.proposed.plannedLoss.amount,'50');
 assert.equal(r.evaluation.risk.calculation.proposed.entryCashWithCosts.amount,'500');assert.equal(r.event.plan.assumptions.limits.maxAllocationBps,1000);
 assert.equal(r.evaluation.source.sourceGo,false);assert.deepEqual(r.evaluation.source.admissibleFactIds,[]);assert.equal(r.evaluation.identity.verification,'not_verified');assert.equal(r.evaluation.risk.worstCaseLoss,null);assert.equal(r.evaluation.risk.executionAuthorized,false);assert.ok(Object.isFrozen(r.event.plan));
 assert.deepEqual(r.evaluation,original.evaluateDraft(api.manualDraft(d,p),'PLAN',AT));
});
test('PASS reason only remains possible after malformed unfinished research/risk, WATCH retains only research',()=>{
 const d=validDraft();d.entry='bad';d.cash='-1';d.kind='solana_mint';d.asset='bad address';d.thesis='';const p=percentages();p.entryFee='1e5';
 for(const choice of ['PASS','WATCH']){const r=api.recordJourney(d,p,choice,AT,choice);assert.ok(r.event);assert.equal(r.event.plan.assumptions,undefined);assert.equal(r.event.plan.affirmation,undefined);assert.equal(r.evaluation.risk.calculation,null);assert.equal(r.evaluation.risk.executionAuthorized,false);}
 d.reason=' ';assert.equal(api.recordJourney(d,p,'PASS',AT,'none').event,null);
});
for(const [name,field,value] of [['entry-stop','stop','100'],['future','asOfUtc','2026-10-28T21:30:00'],['stale','asOfUtc','2026-10-26T21:30:00'],['calendar','asOfUtc','2026-02-30T21:30:00'],['currency','currency','USDC'],['leveraged','instrument','leveraged_long'],['missing cash','cash',''],['cash vs capital','cash','10001'],['negative','existing','-1'],['loss vs capital','loss','10001'],['over-budget','units','11'],['price precision','entry','100.0000000001'],['money precision','capital','10000.001'],['unknown time','validSeconds','1e3'],['missing fees','fixed','']])test('unchanged engine still denies '+name,()=>{const d=validDraft();d[field]=value;const r=api.recordJourney(d,percentages(),'PLAN',AT,name);assert.equal(r.event,null);assert.equal(r.evaluation.recordable,false);});
for(const field of ['allocationBps','entryFee','exitFee','entrySlip','exitSlip'])test(field+' percent error cannot be coerced into a successful PLAN',()=>{
 const p=percentages();p[field]='1.001';assert.equal(api.recordJourney(validDraft(),p,'PLAN',AT,'precision').event,null);
});
for(const field of ['confirmed','costConfirmed'])test('requires '+field,()=>{const d=validDraft();d[field]=false;assert.equal(api.recordJourney(d,percentages(),'PLAN',AT,'ack').event,null);});
test('expired at recording is not silently refreshed; source-free data not mutated',()=>{
 const d=validDraft(),p=percentages(),before=JSON.stringify([d,p]);assert.equal(api.evaluateJourney(d,p,AT).recordable,true);
 assert.equal(api.recordJourney(d,p,'PLAN','2026-10-27T22:30:00.001Z','expired').event,null);assert.equal(JSON.stringify([d,p]),before);
});
test('omitted costs remain explicit uncertainty; missing explicit percent is not zero',()=>{
 const d=validDraft();d.costMode='omitted';let r=api.recordJourney(d,api.emptyPercentages(),'PLAN',AT,'omit');assert.equal(r.event,null,'allocation still required');
 const p=percentages();r=api.recordJourney(d,p,'PLAN',AT,'omit');assert.ok(r.event);assert.equal(r.evaluation.risk.calculation.omittedCosts,true);
 d.costMode='explicit';p.entryFee='';assert.equal(api.recordJourney(d,p,'PLAN',AT,'missing').event,null);
});

const feedbackApi=createRequire(import.meta.url)(process.env.DESK_INTEGRATION_BUILD+'/app/desk/journey/feedback.js');
test('incomplete feedback groups actual errors, deduplicates fields and selects actual first requirement',()=>{
 const d=api.emptyDraft(),p=api.emptyPercentages(),evaluation=api.evaluateJourney(d,p,AT),before=JSON.stringify(evaluation),f=feedbackApi.planFeedback(evaluation,d,p);
 assert.equal(f.next.field,'asset');assert.equal(f.errors.length,evaluation.issues.filter(i=>i.severity==='error').length);assert.equal(f.fieldCount,new Set(f.items.map(i=>i.field)).size);assert.equal(f.groups.reduce((sum,g)=>sum+g.count,0),f.fieldCount);assert.ok(f.groups.length<=4);assert.equal(JSON.stringify(evaluation),before);
 d.asset='TEST';assert.equal(feedbackApi.planFeedback(api.evaluateJourney(d,p,AT),d,p).next.field,'thesis');
});
test('valid manual plan has no blockers but source remains false and actual risk calculation is required',()=>{
 const d=validDraft(),p=percentages(),r=api.evaluateJourney(d,p,AT),f=feedbackApi.planFeedback(r,d,p);assert.deepEqual(f.groups,[]);assert.equal(f.fieldCount,0);assert.equal(f.next,null);assert.equal(r.recordable,true);assert.ok(r.risk.calculation);assert.equal(r.source.sourceGo,false);
});
test('cost group targets a truly missing fee rather than the already chosen cost mode',()=>{
 const d=validDraft(),p=percentages();p.entryFee='';const r=api.evaluateJourney(d,p,AT),f=feedbackApi.planFeedback(r,d,p);assert.equal(r.recordable,false);assert.equal(f.next.field,'entryFee');assert.equal(f.next.issue.code,'invalid_cost_assumptions');assert.equal(d.costMode,'explicit');
});
test('next step reflects repaired data, not remembered error order',()=>{
 const d=validDraft(),p=percentages();d.thesis='';d.confirmed=false;
 assert.equal(feedbackApi.planFeedback(api.evaluateJourney(d,p,AT),d,p).next.field,'thesis');d.thesis='Owner assumption';assert.equal(feedbackApi.planFeedback(api.evaluateJourney(d,p,AT),d,p).next.field,'confirmed');
});
test('unknown validator issue has disclosure fallback instead of a fake field or completion count',()=>{
 const d=validDraft(),p=percentages(),r=api.evaluateJourney(d,p,AT);r.recordable=false;r.issues=[{field:'future_contract',code:'unknown_requirement',severity:'error'}];const f=feedbackApi.planFeedback(r,d,p);assert.equal(f.next,null);assert.equal(f.fieldCount,1);assert.deepEqual(f.groups,[{label:'Review validation details',count:1}]);
});
test('warning-only omitted costs do not become blockers or fake positive risk claims',()=>{
 const d=validDraft();d.costMode='omitted';const p=percentages(),r=api.evaluateJourney(d,p,AT),f=feedbackApi.planFeedback(r,d,p);assert.equal(f.errors.length,0);assert.equal(r.recordable,true);assert.equal(r.risk.calculation.omittedCosts,true);assert.equal(r.risk.worstCaseLoss,null);
});
test('freshness expiry is still an actual B blocker, with the correct next time field',()=>{
 const d=validDraft(),p=percentages(),r=api.evaluateJourney(d,p,'2026-10-27T22:30:00.001Z'),f=feedbackApi.planFeedback(r,d,p);assert.equal(r.recordable,false);assert.equal(f.next.field,'asOfUtc');assert.equal(f.next.issue.code,'stale_hypothetical_reference');
});
for(const [field,value] of [['entry',''],['cash',''],['allocationBps','1.001']])test('precise '+field+' error wins over enclosing B group; no correction to already-entered field',()=>{
 const d=validDraft(),p=percentages();if(field==='allocationBps')p[field]=value;else d[field]=value;
 const r=api.evaluateJourney(d,p,AT),f=feedbackApi.planFeedback(r,d,p);assert.equal(r.recordable,false);assert.equal(f.next.field,field);assert.ok(f.errors.length>=f.items.length);if(field==='entry')assert.equal(feedbackApi.feedbackMessage(f.next.issue),'Enter your assumed entry price.');
});
