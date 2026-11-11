/** Presentation adapter only. Financial validation/calculation/recording stays in the reviewed A/B adapter. */
import {emptyDraft,evaluateDraft,recordDraft,type Draft,type Field} from '../integration/model';
import type {Decision,Issue} from '../../../lib/unfarmd-risk';
export {emptyDraft};
export const percentFields=['allocationBps','entryFee','exitFee','entrySlip','exitSlip'] as const;
export type PercentField=typeof percentFields[number];
export type Percentages=Record<PercentField,string>;
export const emptyPercentages=():Percentages=>({allocationBps:'',entryFee:'',exitFee:'',entrySlip:'',exitSlip:''});
/** Exact decimal percent -> integer BPS. No floating point, rounding, clamping or fallback zero. */
export function percentToBps(raw:string):string|null {
 if(!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(raw))return null;
 const [whole,fraction='']=raw.split('.'),bps=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 return bps<=10000n?bps.toString():null;
}
export function manualDraft(draft:Draft,percentages:Percentages):Draft {
 const next={...draft};
 for(const field of percentFields)next[field]=percentages[field]===''?'':percentToBps(percentages[field])??'invalid-percent';
 return next;
}
/** PASS is reason-only. WATCH records research, not an approval of unfinished risk inputs. */
export function decisionDraft(draft:Draft,percentages:Percentages,decision:Decision):Draft {
 if(decision==='PLAN')return manualDraft(draft,percentages);
 const next=emptyDraft();next.reason=draft.reason;
 if(decision==='WATCH')for(const field of ['asset','kind','chain','mic','purpose','horizon','thesis','counterThesis','unknowns','notes'] as const)next[field]=draft[field];
 return next;
}
export const evaluateJourney=(draft:Draft,percentages:Percentages,at:string)=>evaluateDraft(manualDraft(draft,percentages),'PLAN',at);
export const recordJourney=(draft:Draft,percentages:Percentages,decision:Decision,at:string,id:string)=>recordDraft(decisionDraft(draft,percentages,decision),decision,at,id);
export const steps=['CONSIDER','THESIS','RISK','DECIDE'] as const;
export const riskGroups=[['instrument','currency','entry','stop'],['asOfUtc','validSeconds','invalidation'],['capital','cash','existing','loss','allocationBps','units'],['costMode','entryFee','exitFee','entrySlip','exitSlip','fixed','costConfirmed']] as const;
const aliases:Record<string,Field|'confirmed'|'costConfirmed'>={
 'entry.price':'entry','entry.asOf':'asOfUtc','entry':'asOfUtc','invalidation.price':'stop','invalidation':'invalidation',
 'capital.reference':'capital','capital.availableCash':'cash','capital.existingExposure':'existing','capital':'capital',
 'limits.maxPlannedLoss':'loss','limits.maxAllocationBps':'allocationBps','limits':'loss','proposedUnits':'units',
 'affirmation':'confirmed','costsAcknowledged':'costConfirmed','costs':'costMode','costs.fixedRoundTrip':'fixed',
 'costs.entryFeeBps':'entryFee','costs.exitFeeBps':'exitFee','costs.entrySlippageBps':'entrySlip','costs.exitSlippageBps':'exitSlip','assumptions':'instrument',
};
export const issueField=(i:Issue):string=>aliases[i.field]??i.field;
export function fieldLocation(field:string):{stage:number;riskStep:number} {
 if(['reason','confirmed','costConfirmed'].includes(field))return {stage:3,riskStep:0};
 const group=riskGroups.findIndex(keys=>(keys as readonly string[]).includes(field));
 if(group>=0)return {stage:2,riskStep:group};
 if(['purpose','horizon','thesis','counterThesis','unknowns','notes'].includes(field))return {stage:1,riskStep:0};
 return {stage:0,riskStep:0};
}
const messages:Record<string,string>={
 asset:'Add what you are considering.',purpose:'Choose why you are considering it.',horizon:'Add how long you would hold it.',thesis:'Write why this might work.',counterThesis:'Write what could go wrong.',unknowns:'Write what you still do not know.',instrument:'Choose the type of holding.',currency:'Choose the currency of your assumptions.',entry:'Enter your assumed entry price.',stop:'Enter a lower exit price.',asOfUtc:'Enter when you made your price assumption.',validSeconds:'Choose how long your assumption remains usable.',invalidation:'Explain what would make you walk away.',capital:'Enter your total reference capital.',cash:'Enter available cash; use 0 only if you mean none.',existing:'Enter current exposure; use 0 only if you mean none.',loss:'Enter the loss you are willing to plan for.',allocationBps:'Enter your maximum allocation as a percentage.',costMode:'Choose how to handle costs.',reason:'Write a reason for your decision.',confirmed:'Confirm your assumptions before recording a plan.',costConfirmed:'Confirm your chosen cost assumptions.',
};
const codes:Record<string,string>={
 whole_bps_required:'Use a percentage from 0 to 100, with at most 2 decimal places. No rounding is applied.',whole_seconds_required:'Use whole seconds from 1 to 604800.',
 future_reference:'Your assumption time is in the future. Review the UTC time.',stale_hypothetical_reference:'Your price assumption has expired. Review it and enter an honest new assumption time.',
 positive_stop_below_entry_required:'Your exit price must be positive and below your entry price.',positive_usd_price_required:'Enter a positive USD price with at most 9 decimal places.',
 proposed_exceeds_planned_loss:'Your proposed amount exceeds your planned-loss budget.',proposed_exceeds_allocation:'Your proposed amount exceeds your remaining allocation.',proposed_exceeds_cash:'Your proposed amount exceeds your available cash.',
 capital_exposure_mismatch:'Cash plus existing exposure exceeds the total capital you entered.',invalid_usd_capital:'Capital and cash must be valid USD amounts with at most 2 decimal places; negative amounts are not supported.',
 unsupported_instrument_or_currency:'This model supports unleveraged long holdings in USD only. No currency conversion is assumed.',
 invalid_reference_clock_or_window:'Use a real UTC date/time and a whole-second validity window from 1 to 604800.',
 no_remaining_exposure:'Your allocation leaves no room for a new holding.',risk_capital_mismatch:'Your loss budget exceeds the total capital you entered.',
 positive_supported_units_required:'Enter a positive quantity with at most 9 decimal places.',invalid_cost_assumptions:'Enter every fee and slippage percentage explicitly, including genuine zero.',
 invalid_usd_cost:'Enter a fixed USD cost with at most 2 decimal places.',identity_format_invalid_or_conflicting:'Review the asset details or return to an unresolved ticker.',
 fixed_cost_exhausts_loss_budget:'Your fixed cost uses the entire planned-loss budget.',insufficient_cash_after_fixed_cost:'Available cash does not cover the fixed cost.',allocation_exhausted_by_fixed_cost:'Your fixed cost uses the remaining allocation.',
 explicit_affirmation_required:messages.confirmed,cost_assumptions_must_be_acknowledged:messages.costConfirmed,written_reason_required:messages.reason,
};
export function friendlyIssue(i:Issue):string {
 return codes[i.code]??messages[issueField(i)]??'Review this input; the plan could not be validated.';
}
