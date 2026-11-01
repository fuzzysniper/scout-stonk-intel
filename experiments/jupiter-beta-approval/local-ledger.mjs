// IN-PROCESS TEST MODEL ONLY. No persistence/distributed/durable-store claim.
import {canonical,hash,integer,need} from './protocol.mjs';
const result=(status,extra={})=>Object.freeze({status,activate:false,sourceCalls:false,...extra});
export function localLedger(){
 const grants=new Map(),nonces=new Set(),operations=new Set(),revoked=new Set(),history=[];let stopped=false,last=0;
 const clock=now=>{if(!integer(now)||now<last){stopped=true;return false;}last=now;return !stopped;};
 const log=(kind,id)=>{if(history.length>=256){stopped=true;return false;}history.push(Object.freeze({seq:history.length+1,kind,id}));return true;};
 const issuer=Object.freeze({
  prepare(r,requestHash,now){try{need(clock(now)&&!revoked.has(r.keyId+':'+r.epoch)&&!grants.has(r.grantId)&&!nonces.has(r.nonce)&&grants.size<32);need(log('prepare',r.grantId));nonces.add(r.nonce);grants.set(r.grantId,{record:JSON.parse(canonical(r)),recordHash:hash(canonical(r)),requestHash,state:'pending',uses:0,perMint:new Map(),envelopeHash:null});return result('prepared_simulation_only');}catch{return result('denied');}},
  publish(id,envelopeHash,now){try{need(clock(now));const g=grants.get(id);need(g&&g.state==='pending'&&!revoked.has(g.record.keyId+':'+g.record.epoch)&&now<g.record.expiresAt);need(log('publish',id));g.state='active';g.envelopeHash=envelopeHash;return result('published_simulation_only');}catch{return result('denied');}},
  uncertain(id){const g=grants.get(id);if(g){g.state='uncertain';log('uncertain',id);}return result('uncertain');},
 });
 const admin=Object.freeze({
  revoke(id){const g=grants.get(id);if(!g)return result('denied');g.state='revoked';log('revoke',id);return result('revoked');},
  revokeKey(keyId,epoch){revoked.add(keyId+':'+epoch);log('revoke-key',keyId+':'+epoch);return result('revoked');},
 });
 const consumer=Object.freeze({
  check(verified,now){try{need(clock(now)&&verified?.status==='verified_simulation_only');const r=verified.record,g=grants.get(r.grantId);need(g&&g.state==='active'&&g.envelopeHash===verified.envelopeHash&&g.requestHash===verified.requestHash&&g.recordHash===hash(canonical(r))&&!revoked.has(r.keyId+':'+r.epoch)&&now>=r.startsAt&&now<r.expiresAt&&g.uses<r.scope.maxUses);return result('current_simulation_only');}catch{return result('denied');}},
  reserve(verified,mint,operationId,now){try{
   need(clock(now)&&verified?.status==='verified_simulation_only'&&/^test_[a-z0-9_-]{1,60}$/.test(operationId)&&!operations.has(operationId));const r=verified.record,g=grants.get(r.grantId);
   need(g&&g.state==='active'&&g.envelopeHash===verified.envelopeHash&&g.requestHash===verified.requestHash&&g.recordHash===hash(canonical(r))&&!revoked.has(r.keyId+':'+r.epoch)&&now>=r.startsAt&&now<r.expiresAt&&r.scope.mints.includes(mint)&&g.uses<r.scope.maxUses&&(g.perMint.get(mint)??0)<r.scope.perMintLimit);
   need(log('reserve',r.grantId));operations.add(operationId);g.uses++;g.perMint.set(mint,(g.perMint.get(mint)??0)+1);return result('reserved_simulation_only',{uses:g.uses});
  }catch{return result('denied');}},
  stop(){stopped=true;log('stop','global');return result('stopped');},
 });
 const inspect=()=>Object.freeze({mode:'synthetic-only',durable:false,stopped,history:history.map(x=>({...x})),grants:[...grants].map(([id,g])=>({id,state:g.state,uses:g.uses,maxUses:g.record.scope.maxUses,perMint:Object.fromEntries(g.perMint)}))});
 return Object.freeze({issuer,consumer,admin,inspect});
}
