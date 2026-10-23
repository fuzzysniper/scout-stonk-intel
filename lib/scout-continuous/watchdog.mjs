import {randomUUID} from 'node:crypto';
import {clock,digest,hash,integer,uuid,validMaintenance} from './policy.mjs';
import {reconcileMeter} from './meter-reconciliation.mjs';
/** Independent STOP/purge/notification executor. No source key or source factory.
 * Execution requires separate approval; an OFF invocation touches nothing.
 * notify acceptance is not device delivery; require prior real mobile acceptance.
 */
export async function watchdogCycle({enabled=false,healthOnly=false,port,scope,journal,notify,suspend,approval,observations,previousMeter,signal,now=()=>new Date().toISOString()}){
 if(enabled!==true)return {status:'disabled'};
 if(!uuid(scope?.parent)||!digest(scope.grantHash)||!digest(approval?.mobileDeliveryHash)||!digest(approval?.shutdownHash)||!clock(approval?.endsAt)||!clock(approval?.maintenanceUntil)||Date.parse(approval.maintenanceUntil)<Date.parse(approval.endsAt)+3600000||Date.parse(approval.maintenanceUntil)>Date.parse(approval.endsAt)+86400000||Date.parse(approval.maintenanceUntil)<=Date.parse(now())||approval.independent!==true)throw Error('watchdog_approval_required');
 const call=command=>{const c={...command,...scope};if(!validMaintenance(c))throw Error('invalid_observation');return port.transact(c,{signal});};
 let state,receipt=null;
 const emergency=async reason=>{
  const stopped=await call({op:'incident',reason}).catch(()=>null);
  // Side effects reserved on separate fsynced disk BEFORE network; lost ACK or
  // restart never resends. An uncertain effect needs owner investigation.
  let shutdown={status:'previous_attempt_uncertain'},notification={status:'previous_attempt_uncertain'};
  if(journal.claim('suspend','parent'))shutdown=await suspend.suspend({signal}).catch(()=>({status:'unconfirmed'}));
  if(journal.claim('incident',reason))notification=await notify.deliver({parent:scope.parent,id:randomUUID(),reason},{signal}).catch(()=>({status:'uncertain'}));
  return {status:'stopped_or_uncertain',durableStopConfirmed:stopped?.stopped===true,shutdown,notification,noRetry:true};
 };
 try{
  state=await call({op:'tick'});
  if(!clock(state.observedAt)||!integer(state.ticket)||!integer(state.usage?.credits))throw 0;
  // The caller must compare the existing external high-water BEFORE appending.
  if(!previousMeter||state.ticket<previousMeter.throughTicket||state.usage.credits<previousMeter.throughCredits)return emergency('meter_mismatch');
  const anchor=journal.anchor({ticket:state.ticket,credits:state.usage.credits,observedAt:state.observedAt});
  if(state.stopped)return emergency('shutdown_unconfirmed');
  if(Date.parse(now())>=Date.parse(approval.endsAt))return emergency('observer_unavailable');
  // A SECOND runtime can check the first without manufacturing a fresh monitor
  // receipt. It never renews watchdog/meter/retention or delivers routine notices.
  if(healthOnly)return state.assurance?.independentWatchdog===true&&state.assurance?.notificationHealthy===true?{status:'checked',renewedAssurances:false}:emergency('observer_unavailable');
  if(observations?.meter){
   const checked=reconcileMeter(observations.meter,{now:now(),scope,snapshot:{...state,anchorObservedAt:anchor?.observedAt},previous:previousMeter,keyFingerprint:approval.keyFingerprint,endsAt:approval.endsAt,weightsHash:approval.weightsHash,hardCapHash:approval.hardCapHash});
   if(!checked.ok)return emergency('meter_mismatch');await call(checked.command);
  }
  // No translating rights acceptance into literal backup exclusion. Current
  // contract remains blocked on Neon PITR; stale/absent evidence stays absent.
  if(observations?.retention?.backupsExcluded===true)return emergency('retention_failed');
  if(observations?.retention)await call({...observations.retention,op:'retention'});
  await call({op:'watchdog',observedAt:now(),independent:true,shutdownCapable:true,receiptHash:hash({shutdown:approval.shutdownHash,mobile:approval.mobileDeliveryHash}),throughTicket:state.ticket,throughCredits:state.usage.credits});
  const n=await call({op:'leaseNotice'});
  if(n.status==='leased'){
   if(n.parent!==scope.parent||!journal.claim('notice',n.id))return emergency('notification_uncertain');
   receipt=await notify.deliver(n,{signal});
   if(receipt.status!=='provider_accepted'||!clock(receipt.deliveredAt)||!digest(receipt.receiptHash))return emergency('notification_uncertain');
   await call({op:'ackNotice',id:n.id,lease:n.lease,deliveredAt:receipt.deliveredAt,receiptHash:receipt.receiptHash});
  }
  const result=await call({op:'tick'});
  return result.stopped?emergency('shutdown_unconfirmed'):{status:'checked',state:result,notification:receipt,deviceDeliveryProven:false};
 }catch{return emergency('observer_unavailable');}
}
