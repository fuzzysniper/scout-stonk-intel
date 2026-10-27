import {VERSION,type Assumptions,type Calculation,type Decision,type Evaluation,type Issue,type Sizing} from './contract';
import {CENT,MAX_INPUT,SCALE,ceilDiv,decimal,format,min,money} from './decimal';
import {asset,bps,clock,keys,list,plainData,record,text} from './validation';
const planKeys=['version','decision','reason'];
const planOptional=['asset','purpose','horizon','thesis','counterThesis','unknowns','affirmation','evidenceRef','assumptions','notes'];
function amount(v:unknown,places=2):bigint|null {
 return keys(v,['currency','amount'])&&v.currency==='USD'?decimal(v.amount,places):null;
}
const issue=(issues:Issue[],field:string,code:string,severity:Issue['severity']='error')=>issues.push({field,code,severity});
function draftShape(v:unknown):boolean {
 const all=['instrument','currency','entry','invalidation','capital','limits','costs','costsAcknowledged','proposedUnits'];
 if(!keys(v,[],all))return false;
 for(const name of ['instrument','currency','proposedUnits'])if(v[name]!==undefined&&typeof v[name]!=='string')return false;
 if(v.costsAcknowledged!==undefined&&typeof v.costsAcknowledged!=='boolean')return false;
 const nested:Record<string,string[]>={entry:['price','asOf','validForSeconds'],invalidation:['kind','price','rationale','description'],capital:['reference','availableCash','existingExposure'],limits:['maxPlannedLoss','maxAllocationBps'],costs:['entryFeeBps','exitFeeBps','entrySlippageBps','exitSlippageBps','fixedRoundTrip']};
 const moneyFields=new Set(['price','reference','availableCash','existingExposure','maxPlannedLoss','fixedRoundTrip']);
 for(const [name,fields] of Object.entries(nested)){
  if(v[name]===undefined)continue;if(!keys(v[name],[],fields))return false;
  for(const [field,value] of Object.entries(v[name])){
   if(moneyFields.has(field)){
    if(!keys(value,[],['currency','amount'])||(value.currency!==undefined&&typeof value.currency!=='string')||(value.amount!==undefined&&value.amount!==null&&typeof value.amount!=='string'))return false;
   }else if(['validForSeconds','maxAllocationBps','entryFeeBps','exitFeeBps','entrySlippageBps','exitSlippageBps'].includes(field)){
    if(typeof value!=='number'||!Number.isSafeInteger(value))return false;
   }else if(typeof value!=='string')return false;
  }
 }
 return true;
}

function calculate(input:unknown,evaluatedAt:string,issues:Issue[]):Calculation|null {
 const fail=(field:string,code:string)=>{issue(issues,field,code);return null;};
 if(!keys(input,['instrument','currency','entry','invalidation','capital','limits','costsAcknowledged'],['costs','proposedUnits']))return fail('assumptions','missing_or_unknown_fields');
 if(input.instrument!=='long_spot'||input.currency!=='USD')return fail('assumptions','unsupported_instrument_or_currency');
 const a=input;
 if(!keys(a.entry,['price','asOf','validForSeconds']))return fail('entry','entry_required');
 const entry=amount(a.entry.price,9);
 if(entry===null||entry<=0n)return fail('entry.price','positive_usd_price_required');
 if(!clock(a.entry.asOf)||typeof a.entry.validForSeconds!=='number'||!Number.isSafeInteger(a.entry.validForSeconds)||a.entry.validForSeconds<1||a.entry.validForSeconds>604800)return fail('entry','invalid_reference_clock_or_window');
 const age=Date.parse(evaluatedAt)-Date.parse(a.entry.asOf);
 if(age<0)return fail('entry.asOf','future_reference');
 if(age>a.entry.validForSeconds*1000)return fail('entry.asOf','stale_hypothetical_reference');
 if(!keys(a.invalidation,['kind','price','rationale'])||a.invalidation.kind!=='price'||!text(a.invalidation.rationale))return fail('invalidation','priced_invalidation_required');
 const stop=amount(a.invalidation.price,9);
 if(stop===null||stop<=0n||stop>=entry)return fail('invalidation.price','positive_stop_below_entry_required');
 if(!keys(a.capital,['reference','availableCash','existingExposure']))return fail('capital','explicit_capital_required');
 const capital=amount(a.capital.reference),cash=amount(a.capital.availableCash),existing=amount(a.capital.existingExposure);
 if(capital===null||capital<=0n||cash===null||existing===null)return fail('capital','invalid_usd_capital');
 if(cash>capital||existing>capital||cash+existing>capital)return fail('capital','capital_exposure_mismatch');
 if(!keys(a.limits,['maxPlannedLoss','maxAllocationBps'])||!bps(a.limits.maxAllocationBps))return fail('limits','explicit_limits_required');
 const risk=amount(a.limits.maxPlannedLoss);
 if(risk===null||risk<=0n)return fail('limits.maxPlannedLoss','positive_usd_loss_budget_required');
 if(risk>capital)return fail('limits.maxPlannedLoss','risk_capital_mismatch');
 if(a.costsAcknowledged!==true)return fail('costsAcknowledged','cost_assumptions_must_be_acknowledged');
 const omitted=a.costs===undefined;
 let ef=0n,xf=0n,es=0n,xs=0n,fixed=0n;
 if(!omitted){
  if(!keys(a.costs,['entryFeeBps','exitFeeBps','entrySlippageBps','exitSlippageBps','fixedRoundTrip'])||![a.costs.entryFeeBps,a.costs.exitFeeBps,a.costs.entrySlippageBps,a.costs.exitSlippageBps].every(bps))return fail('costs','invalid_cost_assumptions');
  const f=amount(a.costs.fixedRoundTrip);if(f===null)return fail('costs.fixedRoundTrip','invalid_usd_cost');
  ef=BigInt(a.costs.entryFeeBps as number);xf=BigInt(a.costs.exitFeeBps as number);es=BigInt(a.costs.entrySlippageBps as number);xs=BigInt(a.costs.exitSlippageBps as number);fixed=f;
 }else issue(issues,'costs','costs_omitted_not_estimated','warning');
 // Round entry outlay UP, exit proceeds DOWN at each assumed step.
 const perEntry=ceilDiv(ceilDiv(entry*(10000n+es),10000n)*(10000n+ef),10000n);
 const perExit=(stop*(10000n-xs)/10000n)*(10000n-xf)/10000n;
 const perLoss=perEntry-perExit;
 const allocationCap=(capital*BigInt(a.limits.maxAllocationBps)/10000n)/CENT*CENT;
 if(existing>=allocationCap)return fail('limits.maxAllocationBps','no_remaining_exposure');
 const remaining=allocationCap-existing;
 if(cash<=fixed)return fail('capital.availableCash','insufficient_cash_after_fixed_cost');
 if(risk<=fixed)return fail('limits.maxPlannedLoss','fixed_cost_exhausts_loss_budget');
 if(remaining<=fixed)return fail('limits.maxAllocationBps','allocation_exhausted_by_fixed_cost');
 const limits={planned_loss:(risk-fixed)*SCALE/perLoss,allocation:(remaining-fixed)*SCALE/perEntry,cash:(cash-fixed)*SCALE/perEntry,unit_domain:MAX_INPUT};
 const units=min(...Object.values(limits));
 if(units<=0n)return fail('assumptions','no_positive_units_within_constraints');
 const size=(q:bigint):Sizing=>({units:format(q),entryNotional:money(ceilDiv(q*entry,SCALE)),entryCashWithCosts:money(ceilDiv(q*perEntry,SCALE)+fixed),plannedLoss:money(ceilDiv(q*perLoss,SCALE)+fixed)});
 let proposed:Sizing|null=null;
 if(a.proposedUnits!==undefined){
  const q=decimal(a.proposedUnits);
  if(q===null||q<=0n)return fail('proposedUnits','positive_supported_units_required');
  proposed=size(q);
  if(ceilDiv(q*perLoss,SCALE)+fixed>risk)issue(issues,'proposedUnits','proposed_exceeds_planned_loss');
  if(ceilDiv(q*perEntry,SCALE)+fixed>remaining)issue(issues,'proposedUnits','proposed_exceeds_allocation');
  if(ceilDiv(q*perEntry,SCALE)+fixed>cash)issue(issues,'proposedUnits','proposed_exceeds_cash');
 }
 if(units===MAX_INPUT)issue(issues,'units','bounded_unit_domain','warning');
 issue(issues,'calculation','gaps_liquidity_and_unmodelled_costs_can_exceed_plan','warning');
 return {basis:'manual_hypothetical',currency:'USD',perUnitEntryCash:format(perEntry),perUnitPlannedDownside:format(perLoss),fixedRoundTrip:money(fixed),remainingAllocation:money(remaining),lossBudget:money(risk),cashBudget:money(cash),ceiling:size(units),proposed,bindingConstraints:(Object.keys(limits) as Calculation['bindingConstraints']).filter(k=>limits[k]===units),omittedCosts:omitted,worstCaseLoss:null};
}

export function evaluateRiskPlan(input:unknown,context:unknown):Evaluation {
 const result:Evaluation={version:VERSION,evaluatedAt:null,decision:null,status:'blocked',issues:[],calculation:null,executionAuthorized:false,source:'owner_entered',worstCaseLoss:null};
 try{
  if(!plainData(input)||!plainData(context)||!keys(context,['evaluatedAt'])||!clock(context.evaluatedAt)){issue(result.issues,'input','invalid_plain_data_or_clock');return result;}
  result.evaluatedAt=context.evaluatedAt;
  if(!keys(input,planKeys,planOptional)||input.version!==VERSION||!['PLAN','WATCH','PASS'].includes(input.decision as string)){issue(result.issues,'plan','invalid_version_decision_or_fields');return result;}
  const p=input;result.decision=p.decision as Decision;
  const add=(field:string,code:string)=>issue(result.issues,field,code);
  if(!text(p.reason))add('reason','written_reason_required');
  if(p.asset!==undefined&&!asset(p.asset))add('asset','invalid_manual_asset_reference');
  if(p.purpose!==undefined&&!['invest','swing','speculative'].includes(p.purpose as string))add('purpose','invalid_purpose');
  for(const f of ['horizon','thesis','counterThesis','notes'])if(p[f]!==undefined&&!text(p[f]))add(f,'invalid_text');
  if(p.unknowns!==undefined&&!list(p.unknowns))add('unknowns','invalid_unknowns');
  if(p.assumptions!==undefined&&!draftShape(p.assumptions))add('assumptions','unknown_or_malformed_assumption_fields');
  if(p.affirmation!==undefined&&(!keys(p.affirmation,['ownerEntered','lossMayExceedPlan','noExecution'])||Object.values(p.affirmation).some(v=>v!==true)))add('affirmation','explicit_affirmation_required');
  if(p.evidenceRef!==undefined){
   const e=p.evidenceRef;
   if(!keys(e,['version','assetKey','evidenceIds'])||e.version!=='unfarmd-evidence/1'||!(e.assetKey===null||text(e.assetKey,240))||!Array.isArray(e.evidenceIds)||e.evidenceIds.length>20||e.evidenceIds.some(v=>!text(v,80))||new Set(e.evidenceIds).size!==e.evidenceIds.length)add('evidenceRef','invalid_evidence_link');
   else if(!record(p.asset)||p.asset.assetKey!==e.assetKey)add('evidenceRef.assetKey','asset_link_mismatch');
   else issue(result.issues,'evidenceRef','link_only_not_admitted_evidence','warning');
  }
  if(result.decision==='PLAN'){
   if(!asset(p.asset))add('asset','manual_asset_required');
   if(p.purpose===undefined)add('purpose','purpose_required');
   for(const f of ['horizon','thesis','counterThesis'])if(!text(p[f]))add(f,'plan_text_required');
   if(!list(p.unknowns)||p.unknowns.length===0)add('unknowns','explicit_unknowns_required');
   if(p.affirmation===undefined)add('affirmation','explicit_affirmation_required');
   if(p.assumptions===undefined)add('assumptions','plan_assumptions_required');
  }
  if(p.assumptions!==undefined){
   // WATCH/PASS can record incomplete assumptions, but no invalid model is calculated.
   const calculationIssues:Issue[]=[];result.calculation=calculate(p.assumptions,context.evaluatedAt,calculationIssues);
   result.issues.push(...calculationIssues.map(i=>result.decision==='PLAN'?i:{...i,severity:'warning' as const}));
  }
  if(!result.issues.some(i=>i.severity==='error')&&(result.decision!=='PLAN'||result.calculation!==null))result.status='recordable';
  return result;
 }catch{result.status='blocked';result.calculation=null;result.issues=[{field:'input',code:'invalid_input',severity:'error'}];return result;}
}

/** Internal typed helper only; public callers must use evaluateRiskPlan. */
export function planAssumptions(plan:unknown):Assumptions|null {
 return record(plan)&&record(plan.assumptions)?plan.assumptions as unknown as Assumptions:null;
}
