/** SYNTHETIC OFFLINE OWNER INPUTS ONLY. No real asset, source fact or execution.
 * This test-only composition is never imported by the app. */
import {emptyDraft,emptyPercentages,recordJourney,evaluateJourney} from '../../app/desk/journey/model';
import type {Draft} from '../../app/desk/integration/model';
import * as risk from '../../lib/unfarmd-risk';
import {createJournalEngine,VERSION,type Journal,type Receipt,type RiskEngine} from '../../lib/unfarmd-journal';
import {previewSecFilingFixture} from '../../lib/unfarmd-source-selection/sec-fixture';
export const AT='2026-10-27T21:31:00.000Z';
export const context={evaluatedAt:'2026-10-27T22:00:00.000Z',expectedJournalId:'offline-integration'};
// Structural compile proof for the ACTUAL composed functions and payloads.
const originalRisk:RiskEngine=risk;
export const journalEngine=createJournalEngine(originalRisk);
export const sourceDisabled=()=>previewSecFilingFixture(null,AT);
export function draft():Draft {
 return {...emptyDraft(),asset:'SYNTH',purpose:'swing',horizon:'One hypothetical week',thesis:'Entered hypothesis',counterThesis:'The hypothesis may fail',unknowns:'No provider observations or reliable exits',reason:'Owner-entered offline research exercise',instrument:'long_spot',currency:'USD',entry:'100',stop:'90',asOfUtc:'2026-10-27T21:30',validSeconds:'3600',invalidation:'Hypothetical reassessment, not an order',capital:'10000',cash:'10000',existing:'0',loss:'100',costMode:'explicit',fixed:'0',units:'5',costConfirmed:true,confirmed:true};
}
export const percentages=()=>({...emptyPercentages(),allocationBps:'10',entryFee:'0',exitFee:'0',entrySlip:'0',exitSlip:'0'});
export const record=(choice:risk.Decision='PLAN',changes:Partial<Draft>={},id='d1',at=AT)=>recordJourney({...draft(),...changes},percentages(),choice,at,id);
export const evaluate=(changes:Partial<Draft>={})=>evaluateJourney({...draft(),...changes},percentages(),AT);
export const empty=():Journal=>({version:VERSION,journalId:'offline-integration',clockBasis:'owner_reported',tail:{sequence:0,receiptId:null},receipts:[]});
export function decisionReceipt(event:risk.DecisionEvent,journal:Journal,supersedesDecisionId:string|null=null,editReason:string|null=null):Extract<Receipt,{type:'decision'}> {
 const sequence=journal.receipts.length+1;
 return {version:VERSION,receiptId:'receipt-'+sequence,sequence,previousReceiptId:journal.tail.receiptId,receivedAt:event.recordedAt,type:'decision',event,supersedesDecisionId,editReason};
}
export function append(journal:Journal,receipt:Receipt):Journal {
 return {...journal,tail:{sequence:receipt.sequence,receiptId:receipt.receiptId},receipts:[...journal.receipts,receipt]};
}
export function executionReceipt(event:risk.ExecutionEvent,journal:Journal,receivedAt=event.recordedAt):Extract<Receipt,{type:'execution'}> {
 const sequence=journal.receipts.length+1;return {version:VERSION,receiptId:'receipt-'+sequence,sequence,previousReceiptId:journal.tail.receiptId,receivedAt,type:'execution',event};
}
export function reviewReceipt(event:risk.ReviewEvent,journal:Journal,executionId:string|null=null):Extract<Receipt,{type:'review'}> {
 const sequence=journal.receipts.length+1;return {version:VERSION,receiptId:'receipt-'+sequence,sequence,previousReceiptId:journal.tail.receiptId,receivedAt:event.recordedAt,type:'review',event,executionId,supersedesReviewId:null,editReason:null};
}
