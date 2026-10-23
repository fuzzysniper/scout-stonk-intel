import {clock,digest,integer,keys,hash} from './policy.mjs';
/** Validates an ACTUAL provider receipt supplied by a separately approved observer.
 * No provider requests, invented API schema or conversion of reservations to spend.
 * Project totals are useful diagnostics, never DATA-key attribution. */
export function reconcileMeter(receipt,{now,scope,snapshot,previous,keyFingerprint,endsAt,weightsHash,hardCapHash}){
 const fail=reason=>({ok:false,reason,command:null});
 const fields=['version','source','keyFingerprint','observedAt','settledThrough','periodStart','periodEnd','usedCredits','remainingCredits','attribution','rawHash','hardCapUntil','hardCapHash','weightsHash','throughTicket','throughCredits'];
 if(!keys(receipt,fields)||receipt.version!=='unfarmd-meter-observation/1'||!['provider_export','provider_api'].includes(receipt.source)||!['observedAt','settledThrough','periodStart','periodEnd','hardCapUntil'].every(k=>clock(receipt[k]))||!['rawHash','hardCapHash','weightsHash','keyFingerprint'].every(k=>digest(receipt[k]))||!['usedCredits','remainingCredits','throughTicket','throughCredits'].every(k=>integer(receipt[k])))return fail('invalid_receipt');
 if(!digest(keyFingerprint)||receipt.keyFingerprint!==keyFingerprint||receipt.attribution!=='data_key')return fail('data_key_attribution_unproven');
 if(!digest(weightsHash)||!digest(hardCapHash)||receipt.weightsHash!==weightsHash||receipt.hardCapHash!==hardCapHash)return fail('reviewed_weights_or_cutoff_mismatch');
 const t=Date.parse(now),at=Date.parse(receipt.observedAt),settled=Date.parse(receipt.settledThrough);
 if(!clock(snapshot.anchorObservedAt)||!clock(endsAt)||!Number.isFinite(t)||at>t||t-at>300000||settled>at||settled<Date.parse(snapshot.anchorObservedAt)||Date.parse(receipt.periodStart)>settled||Date.parse(receipt.periodEnd)<=t||Date.parse(receipt.hardCapUntil)<Date.parse(endsAt)||Date.parse(receipt.periodEnd)<Date.parse(endsAt))return fail('stale_unsettled_or_cutoff_unproven');
 if(!integer(snapshot.ticket)||!integer(snapshot.usage?.credits)||receipt.throughTicket!==snapshot.ticket||receipt.throughCredits!==snapshot.usage.credits)return fail('anchor_mismatch');
 if(!previous||!clock(previous.observedAt)||previous.keyFingerprint!==keyFingerprint||previous.periodStart!==receipt.periodStart||previous.periodEnd!==receipt.periodEnd||!['usedCredits','throughTicket','throughCredits'].every(k=>integer(previous[k])))return fail('baseline_required');
 if(receipt.usedCredits<previous.usedCredits||receipt.throughTicket<previous.throughTicket||receipt.throughCredits<previous.throughCredits||Date.parse(receipt.observedAt)<=Date.parse(previous.observedAt))return fail('rollback_or_replay');
 if(receipt.usedCredits-previous.usedCredits>receipt.throughCredits-previous.throughCredits)return fail('measured_spend_exceeds_reservation');
 return {ok:true,reason:null,command:{...scope,op:'meter',observedAt:receipt.observedAt,balance:receipt.remainingCredits,attributed:true,mismatch:false,hardCapUntil:receipt.hardCapUntil,receiptHash:hash(receipt),throughTicket:receipt.throughTicket,throughCredits:receipt.throughCredits},checkpoint:receipt};
}
