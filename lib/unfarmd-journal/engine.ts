import {VERSION,RISK_VERSION,LIMITS,type Context,type Decision,type DecisionEvent,type ExecutionEvent,type Journal,type Metrics,type Receipt,type Result,type ReviewEvent,type RiskEngine,type State} from './contract';
import {bytes,canonical,clock,freeze,id,keys,object,positiveDecimal,snapshot,text} from './safety';
import {decode} from './parse';

type Assessment=ReturnType<RiskEngine['reviewDecision']>;
type DecisionState={event:DecisionEvent;root:string;active:boolean;execution:ExecutionEvent|null};
type Reviewed={event:ReviewEvent;executionId:string|null;active:boolean;assessment:Assessment};
const errorCodes=new Set(['input_bounds','restricted_content','invalid_plain_data','duplicate_json_key','invalid_json']);
class JournalFailure extends Error {constructor(readonly code:string,readonly sequence:number|null){super('journal_validation_failed');}}
function deny(code:string,sequence:number|null=null):never {throw new JournalFailure(code,sequence);}
function safeIssue(e:unknown){
 try{
  if(e instanceof JournalFailure)return {code:e.code,sequence:e.sequence};
  if(e instanceof Error&&errorCodes.has(e.message))return {code:e.message,sequence:null};
 }catch{/* Even a hostile thrown proxy must not escape or disclose content. */}
 return {code:'invalid_input_or_risk_engine_failure',sequence:null};
}
const rate=(numerator:number,denominator:number)=>({numerator,denominator,percentBps:denominator===0?null:Math.floor(numerator*10000/denominator)});
const sameAsset=(a:unknown,b:unknown)=>{
 if(a===undefined&&b===undefined)return true;
 if(!object(a)||!object(b))return false;
 return a.assetKey===null?b.assetKey===null&&a.label===b.label:a.assetKey===b.assetKey;
};
const asset=(v:unknown)=>keys(v,['label','assetKey'])&&text(v.label,160)&&!/[\r\n\t\u2028\u2029]/.test(v.label)&&(v.assetKey===null||(text(v.assetKey,240)&&!/[\r\n\t\u2028\u2029]/.test(v.assetKey)));

/** Caller supplies ONLY the trusted, existing risk engine. No hidden dependency,
 * clock, network, randomness, crypto, persistence, auth or source activation. */
export function createJournalEngine(risk:RiskEngine) {
 function verify(input:unknown,context:Context):State {
  if(!keys(context,['evaluatedAt','expectedJournalId'])||!clock(context.evaluatedAt)||!id(context.expectedJournalId))deny('invalid_context');
  if(!keys(input,['version','journalId','clockBasis','tail','receipts'])||input.version!==VERSION||!id(input.journalId)||input.journalId!==context.expectedJournalId||input.clockBasis!=='owner_reported'||!Array.isArray(input.receipts)||input.receipts.length>LIMITS.receipts)deny('invalid_journal');
  if(!keys(input.tail,['sequence','receiptId'])||input.tail.sequence!==input.receipts.length||input.tail.receiptId!==(input.receipts.length?(input.receipts.at(-1) as Receipt)?.receiptId:null))deny('tail_mismatch');
  const decisions=new Map<string,DecisionState>(),executions=new Map<string,ExecutionEvent>(),reviews=new Map<string,Reviewed>();
  const seen=new Set<string>(),receiptIds=new Set<string>(),overrides:{decisionId:string}[]=[];
  let previousId:string|null=null,previousClock:string|null=null;
  const warnings=new Set(['owner_clocks_not_independent_chronology','outside_account_activity_unknown','no_cryptographic_immutability_or_source_verification']);
  for(let i=0;i<input.receipts.length;i++){
   const seq=i+1,r=input.receipts[i];
   const fail=(code:string)=>deny(code,seq);
   if(!object(r)||!['decision','execution','review','override'].includes(r.type as string))fail('invalid_receipt_type');
   const h=['version','receiptId','sequence','previousReceiptId','receivedAt','type','event'];
   const extras=r.type==='decision'?['supersedesDecisionId','editReason']:r.type==='review'?['executionId','supersedesReviewId','editReason']:[];
   if(!keys(r,[...h,...extras])||r.version!==VERSION||!id(r.receiptId)||receiptIds.has(r.receiptId)||r.sequence!==seq||r.previousReceiptId!==previousId||!clock(r.receivedAt)||r.receivedAt>context.evaluatedAt||(previousClock!==null&&r.receivedAt<previousClock))fail('invalid_receipt_chain_or_clock');
   const e=r.event;
   if(!object(e)||!id(e.id)||seen.has(e.id)||!clock(e.recordedAt)||e.recordedAt>r.receivedAt||bytes(e)>LIMITS.eventBytes)fail('invalid_event_identity_clock_or_size');
   if(e.version!==(r.type==='override'?VERSION:RISK_VERSION)||e.kind!==r.type)fail('invalid_event_version_or_kind');
   seen.add(e.id as string);receiptIds.add(r.receiptId as string);previousId=r.receiptId as string;previousClock=r.receivedAt as string;
   if(r.type==='decision'){
    if(!keys(e,['version','kind','id','recordedAt','plan']))fail('invalid_decision');
    const recorded=risk.recordDecision(e.plan,{id:e.id,recordedAt:e.recordedAt});
    if(recorded.ok!==true||recorded.event===null||canonical(recorded.event)!==canonical(e))fail('risk_decision_rejected');
    let root=e.id as string;
    if(r.supersedesDecisionId!==null){
     const old=decisions.get(r.supersedesDecisionId as string);
     if(!id(r.supersedesDecisionId)||!old?.active||!text(r.editReason)||e.recordedAt<old.event.recordedAt||!sameAsset(old.event.plan.asset,(e.plan as Record<string,unknown>).asset))fail('invalid_decision_supersession');
     old!.active=false;root=old!.root;
    }else if(r.editReason!==null)fail('edit_reason_without_supersession');
    const event=e as DecisionEvent;
    if(event.plan.evidenceRef!==undefined){
     // Preserve opaque original links, never embed/retrieve a licensed source body.
     if(!keys(event.plan.evidenceRef,['version','assetKey','evidenceIds'])||event.plan.evidenceRef.version!=='unfarmd-evidence/1'||!Array.isArray(event.plan.evidenceRef.evidenceIds)||event.plan.evidenceRef.evidenceIds.some(x=>typeof x!=='string'||x.length>80||!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(x)||/[\r\n\u2028\u2029]/.test(x)))fail('invalid_opaque_evidence_link');
     warnings.add('evidence_links_not_retrieved_rights_or_freshness_not_established');
    }
    decisions.set(event.id,{event,root,active:true,execution:null});
   }else if(r.type==='execution'){
    if(!keys(e,['version','kind','id','decisionId','occurredAt','recordedAt','mode','asset','instrument','currency','units','entryPrice','stopPrice']))fail('invalid_execution');
    const d=decisions.get(e.decisionId as string);
    if(!d?.active||d.execution!==null||!clock(e.occurredAt)||e.occurredAt>e.recordedAt||!['paper','simulated','user_reported'].includes(e.mode as string)||!asset(e.asset)||e.instrument!=='long_spot'||e.currency!=='USD'||!positiveDecimal(e.units)||!positiveDecimal(e.entryPrice)||(e.stopPrice!==null&&!positiveDecimal(e.stopPrice)))fail('invalid_execution_reference_or_values');
    if(e.recordedAt<d!.event.recordedAt)warnings.add('entry_originally_recorded_before_decision_late_import_not_precommitment');
    // One modeled entry per decision chain. Summing fills or mixing modes would
    // exceed the original single-entry risk contract and could hide cap breaches.
    if([...decisions.values()].some(x=>x.root===d!.root&&x.execution!==null))fail('multiple_entries_unsupported');
    d!.execution=e as ExecutionEvent;executions.set(e.id as string,e as ExecutionEvent);
   }else if(r.type==='review'){
    if(!keys(e,['version','kind','id','decisionId','recordedAt','outcome','evidenceChanged','lessons']))fail('invalid_review');
    const d=decisions.get(e.decisionId as string);
    if(!d)fail('orphan_review');
    const x=r.executionId===null?null:executions.get(r.executionId as string);
    if(r.executionId!==null&&(!id(r.executionId)||!x||x.decisionId!==e.decisionId))fail('review_execution_mismatch');
    if(x===null&&d!.execution!==null)fail('review_omits_known_entry');
    const assessment=risk.reviewDecision({decision:d!.event,execution:x,review:e},{evaluatedAt:context.evaluatedAt});
    if(assessment.version!==RISK_VERSION||assessment.status!=='reviewed'||assessment.executionVerified!==false||assessment.actualLoss!==null||assessment.storage!=='none')fail('risk_review_rejected');
    const prior=[...reviews.values()].find(v=>v.active&&v.event.decisionId===e.decisionId&&v.executionId===r.executionId);
    if(prior){
     if(r.supersedesReviewId!==prior.event.id||!text(r.editReason)||e.recordedAt<prior.event.recordedAt)fail('review_edit_requires_supersession');
     prior.active=false;
    }else if(r.supersedesReviewId!==null||r.editReason!==null)fail('invalid_review_supersession');
    reviews.set(e.id as string,{event:e as ReviewEvent,executionId:r.executionId as string|null,active:true,assessment});
   }else{
    if(!keys(e,['version','kind','id','decisionId','executionId','recordedAt','rule','reason'])||!text(e.reason)||!['risk_cap','allocation_cap','cash_cap','reference_window','invalidation','decision_before_entry','other'].includes(e.rule as string))fail('invalid_override');
    const d=decisions.get(e.decisionId as string),x=e.executionId===null?null:executions.get(e.executionId as string);
    if(!d||e.recordedAt<d.event.recordedAt||(e.executionId!==null&&(!x||x.decisionId!==e.decisionId||e.recordedAt<x.recordedAt)))fail('invalid_override_reference');
    overrides.push({decisionId:e.decisionId as string});warnings.add('reported_overrides_never_authorize_entry_or_change_original_caps');
   }
  }
  const active=[...decisions.values()].filter(d=>d.active),roots=new Set(active.map(d=>d.root));
  const metrics:Metrics={basis:'owner_reported_journal_only',executionVerified:false,outsideAccountExecution:'unknown',actualLoss:null,decisionChains:roots.size,decisionRecords:decisions.size,decisionEdits:decisions.size-roots.size,currentChoices:{PLAN:0,WATCH:0,PASS:0},deliberatePassRecords:0,deliberateWatchRecords:0,reportedEntryModes:{paper:0,simulated:0,user_reported:0},preplannedReportedEntries:rate(0,executions.size),capAdherence:{within:0,breached:0,unknown:0,assessableRate:rate(0,0)},processAdherence:{within:0,breached:0,unknown:0},outcomes:{knownOwnerReported:0,missingOrUnknown:0,noEntryReported:0},overrides:{records:overrides.length,decisionChains:0,rate:rate(0,roots.size)}};
  for(const d of decisions.values()){
   const choice=d.event.plan.decision as Decision;
   if(d.active)metrics.currentChoices[choice]++;
   if(choice==='PASS')metrics.deliberatePassRecords++;
   if(choice==='WATCH')metrics.deliberateWatchRecords++;
  }
  for(const d of active){
   const entry=[...decisions.values()].find(v=>v.root===d.root&&v.execution!==null);
   const x=entry?.execution??null;
   const review=[...reviews.values()].find(v=>v.active&&(x?v.executionId===x.id:v.executionId===null&&v.event.decisionId===d.event.id));
   if(x&&entry){
    metrics.reportedEntryModes[x.mode]++;
    if(entry.event.plan.decision==='PLAN'&&entry.event.recordedAt<x.occurredAt)metrics.preplannedReportedEntries.numerator++;
    if(!review){metrics.capAdherence.unknown++;metrics.processAdherence.unknown++;}
    else{
     const checks=review.assessment.checks;
     const cap=checks.find(c=>c.rule==='modeled_budget_under_original_assumptions');
     const units=checks.find(c=>c.rule==='units_within_precommitment');
     const outcome=cap?.status==='breached'||units?.status==='breached'?'breached':cap?.status==='met'&&units?.status==='met'?'within':'unknown';
     metrics.capAdherence[outcome]++;
     const adherence=review.assessment.adherence;
     metrics.processAdherence[adherence==='reported_inputs_within_plan'?'within':adherence==='outside_plan'?'breached':'unknown']++;
    }
    if([...reviews.values()].some(v=>v.event.decisionId===entry.event.id&&v.event.outcome==='no_entry'))warnings.add('earlier_no_entry_claim_does_not_prove_absence_of_later_or_outside_entry');
   }
   if(!review||review.event.outcome==='unknown')metrics.outcomes.missingOrUnknown++;
   else if(review.event.outcome==='no_entry')metrics.outcomes.noEntryReported++;
   else metrics.outcomes.knownOwnerReported++;
  }
  metrics.preplannedReportedEntries=rate(metrics.preplannedReportedEntries.numerator,executions.size);
  const caps=metrics.capAdherence;caps.assessableRate=rate(caps.within,caps.within+caps.breached);
  metrics.overrides.decisionChains=new Set(overrides.map(x=>decisions.get(x.decisionId)!.root)).size;
  metrics.overrides.rate=rate(metrics.overrides.decisionChains,roots.size);
  return {journal:input as Journal,activeDecisionIds:active.map(d=>d.event.id),metrics,warnings:[...warnings].sort()};
 }
 function replay(input:unknown,context:unknown,previous:unknown=null):Result {
  try{
   const data=snapshot(input),ctx=snapshot(context) as Context;
   const state=verify(data,ctx);
   if(previous!==null){
    const old=verify(snapshot(previous),ctx),a=state.journal.receipts,b=old.journal.receipts;
    if(a.length<b.length||b.some((r,i)=>canonical(r)!==canonical(a[i])))deny('restore_rewrites_or_truncates_trusted_prefix');
    state.warnings.push('prefix_checked_against_caller_supplied_trusted_copy_not_signed_history');
   }else state.warnings.push('without_trusted_previous_copy_rollback_or_complete_rewrite_is_undetectable');
   return freeze({version:VERSION,status:'valid',issues:[],state,storage:'none'});
  }catch(e){
   return freeze({version:VERSION,status:'invalid',issues:[safeIssue(e)],state:null,storage:'none'});
  }
 }
 function parse(raw:unknown,context:unknown,previous:unknown=null):Result {
  try{return replay(decode(raw),context,previous);}catch(e){return freeze({version:VERSION,status:'invalid',issues:[safeIssue(e)],state:null,storage:'none'});}
 }
 /** Aggregate-only redaction, recomputed from validated input. No raw text,
  * labels, asset keys, clocks, event IDs, evidence IDs or financial quantities. */
 function summary(input:unknown,context:unknown,previous:unknown=null):{status:Result['status'];metrics:Metrics|null;storage:'none'} {
  const result=replay(input,context,previous);return freeze({status:result.status,metrics:result.state?.metrics??null,storage:'none'});
 }
 return Object.freeze({replay,parse,summary});
}
