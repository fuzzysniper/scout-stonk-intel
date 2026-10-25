import {setTimeout as delay} from 'node:timers/promises';
import {CYCLE_DEADLINE_MS,WATCHDOG_INTERVAL_MS} from './ops-readiness.mjs';
/** One bounded cycle, absolute start-to-start schedule. No catch-up/retry burst.
 * A wedged dependency cannot manufacture a successful runtime check. Its late
 * result is ignored and the caller must gate every I/O on the passed signal.
 */
export async function runCadenced({cycle,until,signal,loop=false,mono=()=>performance.now(),now=()=>Date.now(),sleep=(ms,s)=>delay(ms,undefined,{signal:s}),setTimer=setTimeout,clearTimer=clearTimeout}){
 let next=mono(),last=next;
 while(!signal?.aborted&&now()<until){
  const start=mono();
  if(!Number.isFinite(start)||start<last||start>next+250)return {status:'cadence_missed',durableStopConfirmed:false};
  last=start;
  const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});let timer;
  try{
   const timed=new Promise(resolve=>{timer=setTimer(()=>{abort.abort();resolve({status:'cycle_deadline_missed',durableStopConfirmed:false});},CYCLE_DEADLINE_MS);});
   const result=await Promise.race([Promise.resolve().then(()=>cycle(abort.signal)).catch(()=>({status:'blocked',durableStopConfirmed:false})),timed]);
   const ended=mono();
   clearTimer(timer);abort.abort();
   if(ended<start||ended-start>CYCLE_DEADLINE_MS)return {status:'cycle_deadline_missed',durableStopConfirmed:false};
   if(!loop||['blocked','cycle_deadline_missed'].includes(result.status))return result;
   next+=WATCHDOG_INTERVAL_MS;
   if(ended>next)return {status:'cadence_missed',durableStopConfirmed:false};
   if(now()>=until)return {status:'maintenance_expired'};
   await sleep(Math.max(0,next-ended),signal);
  }catch{return {status:signal?.aborted?'monitor_stopped':'blocked',durableStopConfirmed:false};}
  finally{clearTimer(timer);abort.abort();signal?.removeEventListener('abort',cancel);}
 }
 return {status:signal?.aborted?'monitor_stopped':'maintenance_expired'};
}
