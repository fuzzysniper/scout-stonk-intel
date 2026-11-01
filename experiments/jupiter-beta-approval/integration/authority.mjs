// Remote authority verifies the approved TARGET, not observed Vercel identity.
// C's nativeIdentity boundary is mandatory before/after this authenticated call.
import {ownerStamp,context} from './contract.mjs';
import {verifyV3} from './verifier.mjs';
import {json,need,fields,denied} from './json.mjs';
export function consumptionComponent({publicTrust,ledger,stopper,clock}){
 const t=context(publicTrust);
 return Object.freeze({async reserve({envelope,mint,operationId}){try{const v=verifyV3(envelope,t,clock(),t.identity);need(v.status==='verified_source_off_contract');const r=await ledger.reserve(v,mint,operationId);need(r.status==='ok');return {status:'reservation_source_off',activate:false,sourceCalls:false,receipt:{seq:r.seq,head:r.head}};}catch{return denied();}},async stop(signed){try{
  need(ownerStamp(signed,t));const b=json(signed.body);need(fields(b,['version','action','organizationId','epoch','timestampMs','nonce'])&&b.version==='unfarmd-beta-stop/1'&&b.action==='PERMANENT_STOP'&&b.organizationId===t.organizationId&&b.epoch===t.beta.epoch&&Number(b.timestampMs)<=clock()&&clock()-Number(b.timestampMs)<=60000&&/^[a-f0-9]{64}$/.test(b.nonce));await stopper.stop();return {status:'stopped',activate:false,sourceCalls:false};
 }catch{return denied();}}});
}
