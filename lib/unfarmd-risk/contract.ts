/** Source-free, owner-entered assumptions. No order, quote, custody or storage API. */
export const VERSION = 'unfarmd-risk/1' as const;
export type Decision = 'PLAN' | 'WATCH' | 'PASS';
export type Money = {currency:'USD';amount:string};
export type AssetRef = {label:string;assetKey:string|null};
export type EvidenceRef = {version:'unfarmd-evidence/1';assetKey:string|null;evidenceIds:string[]};
export type Assumptions = {
 instrument:'long_spot';currency:'USD';
 entry:{price:Money;asOf:string;validForSeconds:number};
 invalidation:{kind:'price';price:Money;rationale:string};
 capital:{reference:Money;availableCash:Money;existingExposure:Money};
 limits:{maxPlannedLoss:Money;maxAllocationBps:number};
 costs?:{entryFeeBps:number;exitFeeBps:number;entrySlippageBps:number;exitSlippageBps:number;fixedRoundTrip:Money};
 costsAcknowledged:boolean;
 proposedUnits?:string;
};
export type RiskPlan = {
 version:typeof VERSION;decision:Decision;reason:string;
 asset?:AssetRef;purpose?:'invest'|'swing'|'speculative';horizon?:string;
 thesis?:string;counterThesis?:string;unknowns?:string[];
 affirmation?:{ownerEntered:true;lossMayExceedPlan:true;noExecution:true};
 // WATCH/PASS can retain bounded, known-field incomplete drafts. Only a fully
 // validated PLAN has complete Assumptions; this type is not an approval stamp.
 evidenceRef?:EvidenceRef;assumptions?:Assumptions|Record<string,unknown>;notes?:string;
};
export type Issue = {field:string;code:string;severity:'error'|'warning'};
export type Sizing = {
 units:string;entryNotional:Money;entryCashWithCosts:Money;plannedLoss:Money;
};
export type Calculation = {
 basis:'manual_hypothetical';currency:'USD';
 // These are conservative modeled values, not an observed quote or a hard loss cap.
 perUnitEntryCash:string;perUnitPlannedDownside:string;fixedRoundTrip:Money;
 remainingAllocation:Money;lossBudget:Money;cashBudget:Money;
 ceiling:Sizing;proposed:Sizing|null;
 bindingConstraints:('planned_loss'|'allocation'|'cash'|'unit_domain')[];
 omittedCosts:boolean;worstCaseLoss:null;
};
export type Evaluation = {
 version:typeof VERSION;evaluatedAt:string|null;decision:Decision|null;
 status:'recordable'|'blocked';issues:Issue[];calculation:Calculation|null;
 executionAuthorized:false;source:'owner_entered';worstCaseLoss:null;
};
export type DecisionEvent = {version:typeof VERSION;kind:'decision';id:string;recordedAt:string;plan:RiskPlan};
export type ExecutionEvent = {
 version:typeof VERSION;kind:'execution';id:string;decisionId:string;
 occurredAt:string;recordedAt:string;mode:'paper'|'simulated'|'user_reported';
 asset:AssetRef;instrument:'long_spot';currency:'USD';units:string;entryPrice:string;stopPrice:string|null;
};
export type ReviewEvent = {
 version:typeof VERSION;kind:'review';id:string;decisionId:string;recordedAt:string;
 outcome:'gain'|'loss'|'flat'|'unknown'|'no_entry';evidenceChanged:boolean;lessons:string[];
};
export type ReviewResult = {
 version:typeof VERSION;status:'reviewed'|'invalid';issues:Issue[];
 chronology:'reported_before_entry'|'late_or_unknown'|'no_reported_entry';
 adherence:'reported_inputs_within_plan'|'outside_plan'|'not_assessable'|'no_reported_entry';
 checks:{rule:string;status:'met'|'breached'|'unknown'}[];
 reportedOutcome:ReviewEvent['outcome']|null;executionMode:ExecutionEvent['mode']|null;
 actualLoss:null;executionVerified:false;storage:'none';
};
