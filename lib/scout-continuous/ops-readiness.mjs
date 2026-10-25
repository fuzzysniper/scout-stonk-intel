// Offline validation only: declarations/signatures do not prove physical placement.
import {createPublicKey,verify} from 'node:crypto';
import {clock,digest,hash,integer,keys,uuid} from './policy.mjs';
import {RENDER_SERVICE} from './ops-transport.mjs';
export const WATCHDOG_INTERVAL_MS=10000;
export const CYCLE_DEADLINE_MS=8000;
export const PEER_MAX_AGE_MS=20000;
const id=v=>typeof v==='string'&&/^owner-[a-z0-9-]{4,80}$/.test(v);
export function checkPlacement(c,env,at){
 const t=c.topology;
 if(c.sourceService!==RENDER_SERVICE||env.RENDER_SERVICE_ID||env.VERCEL==='1'||!['watchdog','health'].includes(c.mode)||!uuid(c.journalId)||!keys(c.journalFloor,['ticket','credits'])||!integer(c.journalFloor.ticket)||!integer(c.journalFloor.credits))throw Error('independent_placement_required');
 if(!keys(t,['watchdog','health','approvalHash','expiresAt'])||!digest(t.approvalHash)||!clock(t.expiresAt)||Date.parse(t.expiresAt)<Date.parse(c.approval.maintenanceUntil)||Date.parse(t.expiresAt)<=Date.parse(at))throw Error('second_monitor_required');
 const publicKeys=[];
 for(const mode of ['watchdog','health']){
  const h=t[mode];
  if(!keys(h,['id','failureDomain','kind','durableJournal','acceptanceHash','peerEpoch','publicKey'])||!id(h.id)||!['owner_pc','existing_vm'].includes(h.kind)||!id(h.failureDomain)||h.durableJournal!==true||!digest(h.acceptanceHash)||!uuid(h.peerEpoch)||typeof h.publicKey!=='string'||h.publicKey.length>128)throw Error('second_monitor_required');
  try{const key=createPublicKey({key:Buffer.from(h.publicKey,'base64'),format:'der',type:'spki'});if(key.asymmetricKeyType!=='ed25519')throw 0;publicKeys.push(key.export({format:'der',type:'spki'}).toString('base64'));}catch{throw Error('invalid_monitor_public_key');}
 }
 if(t.watchdog.id===t.health.id||t.watchdog.failureDomain===t.health.failureDomain||publicKeys[0]===publicKeys[1]||c.monitorId!==t[c.mode].id||env.UNFARMD_MONITOR_HOST_ID!==c.monitorId)throw Error('independent_placement_required');
 return {self:t[c.mode],peer:t[c.mode==='watchdog'?'health':'watchdog'],peerMode:c.mode==='watchdog'?'health':'watchdog'};
}
/** Signed liveness from the other approved host, never a billing/retention/GO assertion.
 * No private key or peer transport is discovered/created here. Original clocks survive reads.
 */
export function verifyPeerReceipt(r,c,placement,at){
 const fields=['version','parent','grantHash','monitorId','mode','epoch','sequence','observedAt','signature'];
 if(!keys(r,fields)||r.version!=='unfarmd-monitor-liveness/1'||r.parent!==c.scope.parent||r.grantHash!==c.scope.grantHash||r.monitorId!==placement.peer.id||r.mode!==placement.peerMode||r.epoch!==placement.peer.peerEpoch||!integer(r.sequence)||!clock(r.observedAt)||Date.parse(r.observedAt)>Date.parse(at)||Date.parse(at)-Date.parse(r.observedAt)>PEER_MAX_AGE_MS||typeof r.signature!=='string'||! /^[A-Za-z0-9_-]{86}$/.test(r.signature))throw Error('peer_liveness_unproven');
 const {signature,...body}=r;
 if(Buffer.from(signature,'base64url').length!==64||Buffer.from(signature,'base64url').toString('base64url')!==signature)throw Error('peer_liveness_unproven');
 try{const key=createPublicKey({key:Buffer.from(placement.peer.publicKey,'base64'),format:'der',type:'spki'});if(!verify(null,Buffer.from(hash(body)),key,Buffer.from(signature,'base64url')))throw 0;}catch{throw Error('peer_liveness_unproven');}
 return {sequence:r.sequence,observedAt:r.observedAt,receiptHash:hash(r)};
}
