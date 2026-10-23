// Independent control-plane executor. No scheduler/provider/channel URL, keys or paid dependency.
// Observers/delivery transport must be separately approved and genuinely independent of the source.
import {validMaintenance} from './policy.mjs';
export async function independentCycle({enabled=false,port,scope,observe,deliver,signal}){
 if(enabled!==true)return {status:'disabled'}; // Does not call observers, store or delivery.
 if(typeof observe!=='function'||typeof deliver!=='function'||signal?.aborted)throw Error('independent_prerequisites_missing');
 const call=body=>{
  const command={...body,...scope};if(!validMaintenance(command))throw Error('invalid_independent_evidence');
  return port.transact(command,{signal});
 };
 let deliveryStarted=false;
 try{
  const state=await call({op:'tick'});
  // No new time is manufactured here: all original clocks/attribution/receipts
  // come from the approved observer, which must reconcile the external high-water anchor.
  const evidence=await observe(state,{signal});
  for(const op of ['meter','retention','watchdog'])await call({...evidence[op],op});
  const notice=await call({op:'leaseNotice'});
  if(notice.status==='leased'){
   deliveryStarted=true;
   const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});let timer;
   try{
    const receipt=await Promise.race([deliver(notice,{signal:abort.signal}),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('notification_uncertain'));},8000);})]);
    await call({op:'ackNotice',id:notice.id,lease:notice.lease,deliveredAt:receipt.deliveredAt,receiptHash:receipt.receiptHash});
   }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);abort.abort();}
  }
  return await call({op:'tick'});
 }catch{
  // Never retry a possibly delivered notice or report a source socket closed.
  // If DB is unavailable, no STOP ack is fabricated; external suspension is still required.
  const stopped=await call({op:'incident',reason:deliveryStarted?'notification_uncertain':'observer_unavailable'}).catch(()=>null);
  return {status:'unavailable',durableStopConfirmed:stopped?.stopped===true,notificationRetried:false};
 }
}
