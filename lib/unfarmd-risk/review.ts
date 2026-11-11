import {VERSION,type DecisionEvent,type ExecutionEvent,type Issue,type ReviewEvent,type ReviewResult,type RiskPlan} from './contract';
import {decimal} from './decimal';
import {evaluateRiskPlan,planAssumptions} from './engine';
import {asset,clock,id,keys,list,plainData,record} from './validation';

/** In-memory precommitment snapshot only. Caller clocks/claims are NOT signed evidence. */
export function recordDecision(plan:unknown,context:unknown):{ok:boolean;event:DecisionEvent|null;issues:Issue[]} {
 try{
  if(!plainData(context)||!keys(context,['id','recordedAt'])||!id(context.id)||!clock(context.recordedAt))return {ok:false,event:null,issues:[{field:'context',code:'invalid_event_context',severity:'error'}]};
  const e=evaluateRiskPlan(plan,{evaluatedAt:context.recordedAt});
  if(e.status!=='recordable')return {ok:false,event:null,issues:e.issues};
  const snapshot:RiskPlan=JSON.parse(JSON.stringify(plan));
  function freeze(v:unknown):void {if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}}
  const event:DecisionEvent={version:VERSION,kind:'decision',id:context.id,recordedAt:context.recordedAt,plan:snapshot};freeze(event);
  return {ok:true,event,issues:e.issues};
 }catch{return {ok:false,event:null,issues:[{field:'input',code:'invalid_event_input',severity:'error'}]};}
}

export function reviewDecision(input:unknown,context:unknown):ReviewResult {
 const out:ReviewResult={version:VERSION,status:'invalid',issues:[],chronology:'late_or_unknown',adherence:'not_assessable',checks:[],reportedOutcome:null,executionMode:null,actualLoss:null,executionVerified:false,storage:'none'};
 const invalid=(code:string)=>{out.issues=[{field:'review',code,severity:'error'}];return out;};
 try{
  if(!plainData(input)||!plainData(context)||!keys(context,['evaluatedAt'])||!clock(context.evaluatedAt)||!keys(input,['decision','execution','review']))return invalid('invalid_review_input');
  const d=input.decision,r=input.review,x=input.execution;
  if(!keys(d,['version','kind','id','recordedAt','plan'])||d.version!==VERSION||d.kind!=='decision'||!id(d.id)||!clock(d.recordedAt)||Date.parse(d.recordedAt)>Date.parse(context.evaluatedAt))return invalid('invalid_decision_event');
  const planned=evaluateRiskPlan(d.plan,{evaluatedAt:d.recordedAt});
  if(planned.status!=='recordable')return invalid('decision_not_recordable');
  if(!keys(r,['version','kind','id','decisionId','recordedAt','outcome','evidenceChanged','lessons'])||r.version!==VERSION||r.kind!=='review'||!id(r.id)||r.id===d.id||r.decisionId!==d.id||!clock(r.recordedAt)||Date.parse(r.recordedAt)<Date.parse(d.recordedAt)||Date.parse(r.recordedAt)>Date.parse(context.evaluatedAt)||!['gain','loss','flat','unknown','no_entry'].includes(r.outcome as string)||typeof r.evidenceChanged!=='boolean'||!list(r.lessons)||r.lessons.length===0)return invalid('invalid_after_action_event');
  if(x===null){
   if(!['no_entry','unknown'].includes(r.outcome as string))return invalid('outcome_without_reported_entry');
   out.status='reviewed';out.reportedOutcome=r.outcome as ReviewEvent['outcome'];out.chronology='no_reported_entry';out.adherence='no_reported_entry';return out;
  }
  if(!keys(x,['version','kind','id','decisionId','occurredAt','recordedAt','mode','asset','instrument','currency','units','entryPrice','stopPrice'])||x.version!==VERSION||x.kind!=='execution'||!id(x.id)||[d.id,r.id].includes(x.id)||x.decisionId!==d.id||!clock(x.occurredAt)||!clock(x.recordedAt)||Date.parse(x.recordedAt)<Date.parse(x.occurredAt)||Date.parse(r.recordedAt)<Date.parse(x.recordedAt)||!['paper','simulated','user_reported'].includes(x.mode as string)||!asset(x.asset)||x.instrument!=='long_spot'||x.currency!=='USD')return invalid('invalid_execution_event');
  const units=decimal(x.units),entry=decimal(x.entryPrice),stop=x.stopPrice===null?null:decimal(x.stopPrice);
  if(units===null||units<=0n||entry===null||entry<=0n||(x.stopPrice!==null&&(stop===null||stop<=0n))||r.outcome==='no_entry')return invalid('invalid_execution_values_or_outcome');
  const before=Date.parse(d.recordedAt)<Date.parse(x.occurredAt);
  out.chronology=before?'reported_before_entry':'late_or_unknown';
  const check=(rule:string,status:'met'|'breached'|'unknown')=>out.checks.push({rule,status});
  check('decision_recorded_before_entry',before?'met':'breached');
  check('explicit_plan_before_entry',planned.decision==='PLAN'?'met':'breached');
  const p=d.plan as RiskPlan,a=planAssumptions(p);
  const sameAsset=record(p.asset)&&record(x.asset)&&(p.asset.assetKey!==null?p.asset.assetKey===x.asset.assetKey:x.asset.assetKey===null&&p.asset.label===x.asset.label);
  check('same_owner_asset_reference',p.asset?(sameAsset?'met':'breached'):'unknown');
  if(planned.decision==='PLAN'&&a&&planned.calculation){
   const limit=decimal(a.proposedUnits??planned.calculation.ceiling.units)!;
   check('units_within_precommitment',units<=limit?'met':'breached');
   check('entry_not_above_assumption',entry<=decimal(a.entry.price.amount)!?'met':'breached');
   check('priced_invalidation_preserved',stop===null?'unknown':stop===decimal(a.invalidation.price.amount)&&stop<entry?'met':'breached');
   const age=Date.parse(x.occurredAt)-Date.parse(a.entry.asOf);
   check('reference_window_at_reported_entry',age>=0&&age<=a.entry.validForSeconds*1000?'met':'breached');
   // Re-use the same model and ORIGINAL source-free capital/cost/clock assumptions.
   // This is not actual fill-cost, account, stop-execution, P&L or ROI verification.
   const replay=evaluateRiskPlan({...p,assumptions:{...a,entry:{...a.entry,price:{currency:'USD',amount:x.entryPrice}},proposedUnits:x.units}},{evaluatedAt:x.occurredAt});
   check('modeled_budget_under_original_assumptions',replay.calculation?(replay.issues.some(i=>i.severity==='error')?'breached':'met'):'unknown');
  }else check('precommitted_risk_limits','unknown');
  out.status='reviewed';out.reportedOutcome=r.outcome as ReviewEvent['outcome'];out.executionMode=x.mode as ExecutionEvent['mode'];
  out.adherence=out.checks.some(c=>c.status==='breached')?'outside_plan':out.checks.some(c=>c.status==='unknown')?'not_assessable':'reported_inputs_within_plan';
  out.issues.push({field:'execution',code:'user_reported_chronology_and_assumptions_not_independent_proof',severity:'warning'});
  return out;
 }catch{return invalid('invalid_review_input');}
}
