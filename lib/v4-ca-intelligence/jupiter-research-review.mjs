// Public-only consumption adapter. No installed authority/MAC, signer, SQL or transport.
import {verifyV3} from '../../experiments/jupiter-beta-approval/integration/verifier.mjs';
import {researchBoundary} from '../../experiments/jupiter-beta-approval/integration/consumer.mjs';
import {context} from '../../experiments/jupiter-beta-approval/integration/contract.mjs';
import {denied,fields,snapshot} from '../../experiments/jupiter-beta-approval/integration/json.mjs';
/** Dependency injection is for labeled offline tests ONLY. Runtime installs no
 * consumption credential or authority. Every possible result remains SOURCE OFF. */
export function researchReview({publicTrust,nativeIdentity,clock,authority=null,consumerAuth=null}){
 let t=null,last=0,terminal=false;try{t=context(publicTrust);}catch{}
 const checkedClock=()=>{const n=clock();if(terminal||!Number.isSafeInteger(n)||n<last){terminal=true;throw Error('held');}last=n;return n;};
 const inspect=(envelope,mint)=>{try{if(!t)return denied();const v=verifyV3(envelope,t,checkedClock(),nativeIdentity());return v.status==='verified_source_off_contract'&&v.record.scope.mints.includes(mint)?v:denied();}catch{return denied();}};
 return Object.freeze({inspect,async reserve(envelope,mint){try{
  if(inspect(envelope,mint).status!=='verified_source_off_contract'||!authority||!consumerAuth)return denied();
  const boundary=researchBoundary({publicTrust:t,nativeIdentity,clock:checkedClock,consumerAuth,authority:async(path,body)=>{
   const r=snapshot(await authority(path,body));
   if(!fields(r,['status','stopped','activate','sourceCalls','receipt'])||r.status!=='reservation_source_off'||r.stopped!==false||r.activate!==false||r.sourceCalls!==false||!fields(r.receipt,['seq','head'])||!/^[1-9][0-9]{0,19}$/.test(r.receipt.seq)||!/^[a-f0-9]{64}$/.test(r.receipt.head))throw Error('held');return r;
  }});
  const r=await boundary.reserve(envelope,mint);return inspect(envelope,mint).status==='verified_source_off_contract'?r:denied();
 }catch{return denied();}}});
}
