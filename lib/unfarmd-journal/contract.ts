/** Offline receipts, not storage, signed chronology, execution or provider evidence. */
export const VERSION = 'unfarmd-journal/1' as const;
export const RISK_VERSION = 'unfarmd-risk/1' as const;
export const LIMITS = Object.freeze({receipts:128, bytes:524288, eventBytes:24576, depth:16, nodes:50000});
export type Decision = 'PLAN'|'WATCH'|'PASS';
export type DecisionEvent = {version:typeof RISK_VERSION;kind:'decision';id:string;recordedAt:string;plan:Record<string,unknown>};
export type ExecutionEvent = {
 version:typeof RISK_VERSION;kind:'execution';id:string;decisionId:string;occurredAt:string;recordedAt:string;
 mode:'paper'|'simulated'|'user_reported';asset:{label:string;assetKey:string|null};
 instrument:'long_spot';currency:'USD';units:string;entryPrice:string;stopPrice:string|null;
};
export type ReviewEvent = {
 version:typeof RISK_VERSION;kind:'review';id:string;decisionId:string;recordedAt:string;
 outcome:'gain'|'loss'|'flat'|'unknown'|'no_entry';evidenceChanged:boolean;lessons:string[];
};
export type OverrideEvent = {
 version:typeof VERSION;kind:'override';id:string;decisionId:string;executionId:string|null;recordedAt:string;
 rule:'risk_cap'|'allocation_cap'|'cash_cap'|'reference_window'|'invalidation'|'decision_before_entry'|'other';reason:string;
};
type Header = {version:typeof VERSION;receiptId:string;sequence:number;previousReceiptId:string|null;receivedAt:string};
export type Receipt = Header & (
 {type:'decision';event:DecisionEvent;supersedesDecisionId:string|null;editReason:string|null}|
 {type:'execution';event:ExecutionEvent}|
 {type:'review';event:ReviewEvent;executionId:string|null;supersedesReviewId:string|null;editReason:string|null}|
 {type:'override';event:OverrideEvent}
);
export type Journal = {
 version:typeof VERSION;journalId:string;clockBasis:'owner_reported';
 tail:{sequence:number;receiptId:string|null};receipts:Receipt[];
};
/** Trusted application code only. The actual B engine is structurally compatible.
 * No replacement arithmetic, default stub, plugin loading or untrusted callbacks.
 * B is not merged on main yet; this seam avoids copying/modifying its source. */
export interface RiskEngine {
 recordDecision(plan:unknown,context:unknown):{ok:boolean;event:unknown;issues:readonly {severity:string}[]};
 reviewDecision(input:unknown,context:unknown):{
  version:string;status:string;chronology:string;adherence:string;
  checks:readonly {rule:string;status:string}[];reportedOutcome:string|null;
  executionVerified:false;actualLoss:null;storage:'none';
 };
}
export type Context = {evaluatedAt:string;expectedJournalId:string};
export type Rate = {numerator:number;denominator:number;percentBps:number|null};
export type Metrics = {
 basis:'owner_reported_journal_only';executionVerified:false;outsideAccountExecution:'unknown';actualLoss:null;
 decisionChains:number;decisionRecords:number;decisionEdits:number;
 currentChoices:Record<Decision,number>;deliberatePassRecords:number;deliberateWatchRecords:number;
 reportedEntryModes:Record<ExecutionEvent['mode'],number>;
 preplannedReportedEntries:Rate;
 capAdherence:{within:number;breached:number;unknown:number;assessableRate:Rate};
 processAdherence:{within:number;breached:number;unknown:number};
 outcomes:{knownOwnerReported:number;missingOrUnknown:number;noEntryReported:number};
 overrides:{records:number;decisionChains:number;rate:Rate};
};
export type Issue = {code:string;sequence:number|null};
export type State = {journal:Journal;activeDecisionIds:string[];metrics:Metrics;warnings:string[]};
export type Result = {version:typeof VERSION;status:'valid'|'invalid';issues:Issue[];state:State|null;storage:'none'};
