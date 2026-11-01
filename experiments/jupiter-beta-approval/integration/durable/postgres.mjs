// Real function-only native PostgreSQL adapter. No environment read or automatic connect.
import {context} from '../contract.mjs';
import {hash,need,uuid} from '../json.mjs';
import {serial} from './serial.mjs';
import {handshake,strictBindingEstablished} from './tls.mjs';
export function postgresLedger({open,publicTrust,role,anchor,verifyConnection=strictBindingEstablished,attest=handshake,withLock=serial(),authorized=()=>true}){
 const t=context(publicTrust);need(['validator','consumer','stopper'].includes(role));
 const query=role==='validator'?'SELECT unfarmd_beta.issue($1::text,$2::jsonb) AS result':role==='consumer'?'SELECT unfarmd_beta.consume($1::text,$2::jsonb) AS result':'SELECT unfarmd_beta.stop() AS result';
 let failed=false;
 const step=(op,input={})=>withLock(async()=>{
  if(failed||!authorized())throw Error('beta_store_held');let c;try{
   c=await open();need(verifyConnection(c));await attest(c,role);
   let prior;try{prior=await anchor.current();}catch{if(op!=='stop')throw Error('beta_anchor_held');}
   if(prior)need(prior.policyHash===(await import('../contract.mjs')).policyBinding(t));
   const data={...input,anchorSeq:prior?.seq,anchorHead:prior?.head,anchorStateHash:prior?.stateHash,epoch:t.beta.epoch,policyHash:(await import('../contract.mjs')).policyBinding(t)};
   const r=await c.query(query,role==='stopper'?[]:[op,JSON.stringify(data)]);need(r.rows?.length===1);const x=r.rows[0].result;
   need(authorized());need(x&&/^[0-9]{1,16}$/.test(x.seq)&&/^[a-f0-9]{64}$/.test(x.head)&&/^[a-f0-9]{64}$/.test(x.stateHash));need(prior);if(op==='check')need(x.seq===prior.seq&&x.head===prior.head&&x.stateHash===prior.stateHash);else if(x.seq!==prior.seq||x.head!==prior.head)await anchor.advance(prior,x);return x;
  }catch{failed=true;throw Error('beta_store_held');}finally{if(c){let timer;await Promise.race([c.end().catch(()=>{}),new Promise(resolve=>{timer=setTimeout(()=>{c.connection?.stream?.destroy();resolve();},250);})]);clearTimeout(timer);}}
 });
 const issuer=Object.freeze({
  async prepare(r,requestHash){need(uuid(r.grantId));const x=await step('prepare',{grantId:r.grantId,record:r,requestHash});need(x.status==='prepared'&&/^[1-9][0-9]{0,15}$/.test(x.fence));return x;},
  async beforeCall(grantId,fence){return (await step('call',{grantId,fence})).status==='ok';},
  async publish(grantId,fence,envelope){return step('publish',{grantId,fence,envelope,envelopeHash:hash(envelope)});},
  async uncertain(grantId,fence){return step('uncertain',{grantId,fence});},
  async revoke(grantId){return step('revoke',{grantId});},
 });
 const consumer=Object.freeze({async check(verified){need(verified?.status==='verified_source_off_contract');return step('check',{grantId:verified.record.grantId,envelopeHash:verified.envelopeHash});},async reserve(verified,mint,operationId){need(verified?.status==='verified_source_off_contract'&&uuid(operationId)&&verified.record.scope.mints.includes(mint));return step('reserve',{grantId:verified.record.grantId,envelopeHash:verified.envelopeHash,mint,operationId});}});
 return role==='validator'?issuer:role==='consumer'?consumer:Object.freeze({stop:()=>step('stop')});
}
