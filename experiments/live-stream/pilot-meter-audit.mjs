// OFFLINE REPORT ONLY. Never imported by worker/admission/watchdog. No I/O or commands.
// Inputs are normalized owner-recorded evidence, NOT a claimed provider API schema.
import {reconcileMeter} from '../../lib/scout-continuous/meter-reconciliation.mjs';
import {clock,integer,hash,digest} from '../../lib/scout-continuous/policy.mjs';
// Retain original sub-millisecond clocks; Date.parse alone truncates them.
function utc(v){
  if(!clock(v))throw Error('CLOCK');const seconds=v.slice(0,19),ms=Date.parse(seconds+'.000Z');
  if(new Date(ms).toISOString().slice(0,19)!==seconds)throw Error('CALENDAR');
  const fraction=/\.(\d+)Z$/.exec(v)?.[1]??'';return BigInt(ms)*1000n+BigInt(fraction.padEnd(6,'0'));
}
const blocked=reason=>({mode:'offline_review',ok:false,sourceGo:false,command:null,reason,measuredCredits:null,reservedCredits:null,reservedLessMeasuredCredits:null});
/** Compare a CLOSED first pilot with its immutable pre-reservation origin.
 * `previous` is only the last chronologically accepted receipt, never a replacement
 * funding origin. A successful arithmetic audit grants NO operational permission.
 */
export function auditClosedPilot(receipt,context){
  try{
    const {baseline,previous,startedAt,closedAt,...shared}=context??{};
    if(!clock(startedAt)||!clock(closedAt)||!clock(shared.now)||utc(closedAt)<utc(startedAt)||utc(closedAt)>utc(shared.now))return blocked('closed_pilot_window_unproven');
    if(!baseline||baseline.throughTicket!==0||baseline.throughCredits!==0||!clock(baseline.observedAt)||!clock(baseline.settledThrough)||utc(baseline.observedAt)>utc(startedAt)||utc(startedAt)-utc(baseline.observedAt)>300000000n||utc(baseline.settledThrough)>utc(baseline.observedAt)||!digest(baseline.rawHash)||baseline.attribution!=='data_key'||!['provider_export','provider_api'].includes(baseline.source))return blocked('pre_reservation_baseline_required');
    if(!previous||!clock(previous.observedAt)||!clock(previous.settledThrough)||!integer(previous.usedCredits)||!integer(previous.throughTicket)||!integer(previous.throughCredits)||previous.keyFingerprint!==baseline.keyFingerprint||previous.periodStart!==baseline.periodStart||previous.periodEnd!==baseline.periodEnd||utc(previous.observedAt)<utc(baseline.observedAt)||utc(previous.settledThrough)<utc(baseline.settledThrough)||utc(previous.settledThrough)>utc(previous.observedAt)||!digest(previous.rawHash)||previous.attribution!=='data_key'||!['provider_export','provider_api'].includes(previous.source)||previous.usedCredits<baseline.usedCredits)return blocked('chronological_checkpoint_required');
    const checked=reconcileMeter(receipt,{...shared,scope:{},previous:baseline});
    if(!checked.ok)return blocked(checked.reason);
    if(utc(receipt.observedAt)<=utc(previous.observedAt)||utc(receipt.settledThrough)<utc(previous.settledThrough)||receipt.usedCredits<previous.usedCredits||receipt.throughTicket<previous.throughTicket||receipt.throughCredits<previous.throughCredits)return blocked('receipt_replay_or_rollback');
    // Shared maintenance validation covers the reservation anchor. A final pilot
    // report additionally needs the provider's original settlement watermark to
    // cover confirmed socket closure, not merely the earlier reservation.
    if(utc(receipt.settledThrough)<utc(closedAt))return blocked('pilot_tail_not_settled');
    if(utc(receipt.hardCapUntil)<utc(closedAt))return blocked('cutoff_does_not_cover_actual_closure');
    const measuredCredits=receipt.usedCredits-baseline.usedCredits;
    const reservedCredits=receipt.throughCredits-baseline.throughCredits;
    return {mode:'offline_review',ok:true,sourceGo:false,command:null,reason:null,measuredCredits,reservedCredits,
      reservedLessMeasuredCredits:reservedCredits-measuredCredits,receiptHash:hash(receipt)};
  }catch{return blocked('invalid_evidence');}
}
