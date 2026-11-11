/** Source-free A/B adapter. UTC assumption digits are owner input, never provider time. */
import {evaluateEvidence,resolveAssetIdentity,VERSION as EVIDENCE_VERSION,type AssetResolution,type EvidenceReport} from '../../../lib/unfarmd-evidence';
import {evaluateRiskPlan,recordDecision,VERSION as RISK_VERSION,type Decision,type DecisionEvent,type Evaluation,type Issue,type RiskPlan} from '../../../lib/unfarmd-risk';
export const stringFields=['kind','asset','chain','mic','purpose','horizon','thesis','counterThesis','unknowns','notes','reason','instrument','currency','entry','asOfUtc','validSeconds','stop','invalidation','capital','cash','existing','loss','allocationBps','costMode','entryFee','exitFee','entrySlip','exitSlip','fixed','units'] as const;
export type Field=typeof stringFields[number];
export type Draft=Record<Field,string>&{confirmed:boolean;costConfirmed:boolean};
export const emptyDraft=():Draft=>({...Object.fromEntries(stringFields.map(k=>[k,''])),kind:'unknown',confirmed:false,costConfirmed:false}) as Draft;
export type DeskEvaluation={identity:AssetResolution;source:EvidenceReport|null;risk:Evaluation;plan:RiskPlan|null;issues:Issue[];recordable:boolean};
const labels:Record<string,string>={asset:'Enter an asset reference for a manual PLAN.',purpose:'Choose a purpose.',horizon:'Enter your horizon.',thesis:'Write a thesis.',counterThesis:'Write the case against it.',unknowns:'List what remains unknown.',instrument:'Explicitly choose the supported long spot context.',currency:'Explicitly choose USD assumptions.',entry:'Enter your assumed entry price.',asOfUtc:'Enter the assumption time in UTC.',validSeconds:'Choose a reference validity window in seconds.',stop:'Enter a lower priced invalidation.',invalidation:'Write your invalidation and exit rationale.',capital:'Enter reference capital.',cash:'Enter available cash, including explicit zero if none.',existing:'Enter existing same-asset exposure, including explicit zero.',loss:'Enter your planned-loss budget.',allocationBps:'Choose your maximum allocation in BPS.',costMode:'Choose explicit costs or consciously omitted costs.'};
const parseDraft=(v:unknown):Draft|null=>{
 try{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)return null;
 const ds=Object.getOwnPropertyDescriptors(v),allowed=[...stringFields,'confirmed','costConfirmed'];
 const valid=Reflect.ownKeys(ds).length===allowed.length&&allowed.every(k=>Object.hasOwn(ds,k)&&'value' in ds[k]&&(k==='confirmed'||k==='costConfirmed'?typeof ds[k].value==='boolean':typeof ds[k].value==='string'&&ds[k].value.length<=2000))&&['unknown','solana_mint','evm_token','listed_equity'].includes(ds.kind.value)&&['','omitted','explicit'].includes(ds.costMode.value);
 return valid?Object.fromEntries(allowed.map(k=>[k,ds[k].value])) as Draft:null;
 }catch{return null;}
};
export function resolveDraftIdentity(d:Draft):AssetResolution {
 if(d.kind==='solana_mint')return resolveAssetIdentity({kind:d.kind,chain:d.chain,address:d.asset});
 if(d.kind==='evm_token')return resolveAssetIdentity({kind:d.kind,chain:'eip155:'+d.chain,address:d.asset});
 if(d.kind==='listed_equity')return resolveAssetIdentity({kind:d.kind,ticker:d.asset,...(d.mic?{mic:d.mic}:{})});
 return resolveAssetIdentity({kind:d.kind,ticker:d.asset.trim()||null});
}
export function utcAssumption(raw:string):string {
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw))return raw+':00.000Z';
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw))return raw+'.000Z';
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(raw))return raw+'Z';
 return raw; // Calendar validity/future/staleness is B's responsibility; never repair it.
}
const integer=(raw:string):number|string=>/^(0|[1-9]\d{0,5})$/.test(raw)&&raw.trim()===raw?Number(raw):raw;
export function linkMatches(plan:RiskPlan,identity:AssetResolution,report:EvidenceReport):boolean {
 const key=identity.asset.assetKey;
 if(report.version!==EVIDENCE_VERSION||report.assetKey!==key||report.sourceGo!==false||plan.asset?.assetKey!==key)return false;
 const ref=plan.evidenceRef;
 return !!ref&&ref.version===EVIDENCE_VERSION&&ref.assetKey===key&&Array.isArray(ref.evidenceIds)&&Array.isArray(report.admissibleFactIds)&&ref.evidenceIds.every(id=>report.admissibleFactIds.includes(id))&&new Set(ref.evidenceIds).size===ref.evidenceIds.length;
}
export function evaluateDraft(input:unknown,decision:Decision,evaluatedAt:string):DeskEvaluation {
 const parsed=parseDraft(input),identity=parsed?resolveDraftIdentity(parsed):resolveAssetIdentity({kind:'unknown'});
 const bad=(field:string,code:string):Issue=>({field,code,severity:'error'});
 if(!parsed)return {identity,source:null,plan:null,risk:evaluateRiskPlan(null,{evaluatedAt}),issues:[bad('draft','invalid_draft')],recordable:false};
 const d=parsed,issues:Issue[]=[];
 for(const name of ['validSeconds','allocationBps',...(d.costMode==='explicit'?['entryFee','exitFee','entrySlip','exitSlip']:[])] as Field[]){
  const value=integer(d[name]);if(d[name]!==''&&(typeof value!=='number'||value>(name==='validSeconds'?604800:10000)||(name==='validSeconds'&&value<1)))issues.push(bad(name,name==='validSeconds'?'whole_seconds_required':'whole_bps_required'));
 }
 // No record-supplied policies, live adapters, fake entries, facts or source clocks.
 const source=evaluateEvidence({version:EVIDENCE_VERSION,asset:identity,entries:[]},{evaluatedAt,mode:'record_review',intendedUse:'private_research',sourcePolicies:[]});
 const report=source.ok?source.value:null;
 const usd=(amount:string)=>({...(d.currency?{currency:d.currency}:{}),amount});
 const entered=(values:Record<string,unknown>)=>Object.fromEntries(Object.entries(values).filter(([,v])=>v!==''));
 const moneyGroup=(values:Record<string,string>)=>Object.fromEntries(Object.entries(values).filter(([,v])=>v!=='').map(([k,v])=>[k,usd(v)]));
 const p:Record<string,unknown>={version:RISK_VERSION,decision,reason:d.reason};
 if(d.asset.trim()){
  p.asset={label:d.asset.trim(),assetKey:identity.asset.assetKey};
  if(report)p.evidenceRef={version:EVIDENCE_VERSION,assetKey:report.assetKey,evidenceIds:[]};
 }
 for(const f of ['purpose','horizon','thesis','counterThesis','notes'] as const)if(d[f])p[f]=d[f];
 if(d.unknowns)p.unknowns=d.unknowns.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(d.confirmed||decision==='PLAN')p.affirmation={ownerEntered:d.confirmed,lossMayExceedPlan:d.confirmed,noExecution:d.confirmed};
 const financial=['instrument','currency','entry','asOfUtc','validSeconds','stop','capital','cash','existing','loss','allocationBps','costMode','units'] as const;
 if(decision==='PLAN'||financial.some(f=>d[f]!=='')){
  p.assumptions={
   ...entered({instrument:d.instrument,currency:d.currency}),
   entry:{...moneyGroup({price:d.entry}),...entered({asOf:utcAssumption(d.asOfUtc),validForSeconds:integer(d.validSeconds)})},
   invalidation:{...moneyGroup({price:d.stop}),...entered({kind:'price',rationale:d.invalidation})},
   capital:moneyGroup({reference:d.capital,availableCash:d.cash,existingExposure:d.existing}),
   limits:{...moneyGroup({maxPlannedLoss:d.loss}),...entered({maxAllocationBps:integer(d.allocationBps)})},costsAcknowledged:d.costConfirmed,
   ...(d.units?{proposedUnits:d.units}:{}),
   ...(d.costMode==='explicit'?{costs:{...entered({entryFeeBps:integer(d.entryFee),exitFeeBps:integer(d.exitFee),entrySlippageBps:integer(d.entrySlip),exitSlippageBps:integer(d.exitSlip)}),...moneyGroup({fixedRoundTrip:d.fixed})}}:{})};
 }
 if(decision==='PLAN'){
  for(const [field] of Object.entries(labels))if(!d[field as Field].trim())issues.push(bad(field,'required'));
  if(['invalid','conflicting_hints'].includes(identity.state))issues.push(bad('asset','identity_format_invalid_or_conflicting'));
  if(!['omitted','explicit'].includes(d.costMode))issues.push(bad('costMode','cost_choice_required'));
  if(!report)issues.push(bad('asset','identity_evaluation_unavailable'));
 }
 const risk=evaluateRiskPlan(p,{evaluatedAt});
 const plan=p as unknown as RiskPlan;
 if(plan.asset&&report&&!linkMatches(plan,identity,report))issues.push(bad('asset','evidence_link_mismatch'));
 issues.push(...risk.issues);
 return {identity,source:report,plan,risk,issues,recordable:!issues.some(i=>i.severity==='error')&&risk.status==='recordable'&&(decision!=='PLAN'||risk.calculation!==null)};
}
export function recordDraft(draft:unknown,decision:Decision,recordedAt:string,id:string):{evaluation:DeskEvaluation;event:DecisionEvent|null} {
 const evaluation=evaluateDraft(draft,decision,recordedAt);
 if(!evaluation.recordable||!evaluation.plan)return {evaluation,event:null};
 const result=recordDecision(evaluation.plan,{id,recordedAt});
 return {evaluation,event:result.ok?result.event:null};
}
export const requiredMessage=(field:string)=>labels[field]??'Enter this required field.';
export const issueMessage=(i:Issue):string=>{
 if(i.code==='required')return requiredMessage(i.field);
 const known:Record<string,string>={whole_seconds_required:'Enter whole seconds from 1 to 604800; no exponent, fraction or whitespace.',whole_bps_required:'Enter whole BPS from 0 to 10000; no exponent, fraction or whitespace.',written_reason_required:'Write a decision reason.',explicit_affirmation_required:'Confirm your manual assumptions, possible excess loss and no execution.',cost_assumptions_must_be_acknowledged:'Acknowledge your explicit or omitted cost assumptions.',stale_hypothetical_reference:'The hypothetical price reference has expired. Review your assumption; it has not been refreshed.',future_reference:'The hypothetical assumption time is in the future.',positive_stop_below_entry_required:'Invalidation must be a positive USD price below entry.',proposed_exceeds_planned_loss:'Proposed units exceed your planned-loss budget.',proposed_exceeds_allocation:'Proposed units exceed remaining allocation.',proposed_exceeds_cash:'Proposed units exceed available cash.',capital_exposure_mismatch:'Cash plus existing exposure exceeds entered reference capital.',no_remaining_exposure:'No allocation remains for a new position.',risk_capital_mismatch:'Planned-loss budget exceeds entered reference capital.',costs_omitted_not_estimated:'Costs are consciously omitted, not estimated.',gaps_liquidity_and_unmodelled_costs_can_exceed_plan:'Gaps, liquidity, unmodeled costs and failed exits can exceed planned loss.',link_only_not_admitted_evidence:'Identity linkage only; no verified source evidence.',identity_format_invalid_or_conflicting:'Correct the invalid or conflicting identity reference; no asset existence has been verified.',invalid_draft:'Malformed draft; no decision recorded.'};
 return known[i.code]??`${i.field}: ${i.code.replaceAll('_',' ')}.`;
};
