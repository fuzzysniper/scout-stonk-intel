// Backend's explicit binding to A #172 a860f725. No production activation/default allowance.
import {createHash} from 'node:crypto';
import {exactBase58,validEvent} from '../live-ledger/policy.mjs';
export const VERSION='unfarmd-continuous/1';
export const POLICY_HASH='a3707b38dbe3cc89aa1aa9f239e0cc7f28df8dbb98d119658c9ee75b90152a86';
export const SOURCE_HASH='e39733b2703536cfbae9381c19cafc016a38c2dff907b71af359b5c6aa534202';
export const ENVELOPE=Object.freeze({bytes:16777216,frames:20000});
export const LIMIT_KEYS=['credits','bytes','frames','rpc','connections','children','auditRecords'];
export const USAGE_KEYS=[...LIMIT_KEYS,'framesReceived','bytesReceived'];
export const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,canonical(x)])):v;
export const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export const keys=(v,names)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...names].sort().join(',');
export const integer=v=>Number.isSafeInteger(v)&&v>=0;
export const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
export const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)&&!/^0+$/.test(v);
export const clock=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3,6})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
export const reason=v=>typeof v==='string'&&/^[A-Za-z0-9_:-]{1,100}$/.test(v);
const GRANT_KEYS=['version','parent','head','service','policyHash','sourcePolicyHash','startsAt','endsAt','resetAt','allowanceCredits','otherReserveCredits','incidentReserveCredits','limits','connectionCredits','rpcCredits','rightsHash','accountHash','retentionHash','notificationHash','mobileHash','sourceGo','hostingGo','rightsGo','spendGo','retentionGo','notificationGo','mobileGo'];
export function validGrant(g){
 if(!keys(g,GRANT_KEYS)||g.version!==VERSION||!uuid(g.parent)||!/^[a-f0-9]{40}$/.test(g.head)||!/^srv-[a-z0-9]+$/.test(g.service)||g.policyHash!==POLICY_HASH||g.sourcePolicyHash!==SOURCE_HASH)return false;
 if(!['sourceGo','hostingGo','rightsGo','spendGo','retentionGo','notificationGo','mobileGo'].every(k=>g[k]===true)||!['rightsHash','accountHash','retentionHash','notificationHash','mobileHash'].every(k=>digest(g[k])))return false;
 if(!['startsAt','endsAt','resetAt'].every(k=>clock(g[k]))||Date.parse(g.endsAt)<=Date.parse(g.startsAt)||Date.parse(g.endsAt)-Date.parse(g.startsAt)>7*86400000||Date.parse(g.endsAt)>Date.parse(g.resetAt))return false;
 return keys(g.limits,LIMIT_KEYS)&&Object.values(g.limits).every(v=>integer(v)&&v>0)&&['allowanceCredits','otherReserveCredits','incidentReserveCredits','connectionCredits','rpcCredits'].every(k=>integer(g[k]))&&g.connectionCredits>0&&g.rpcCredits>0&&g.limits.credits<=g.allowanceCredits-g.otherReserveCredits-g.incidentReserveCredits&&g.connectionCredits<=g.limits.credits&&g.limits.bytes>=ENVELOPE.bytes&&g.limits.frames>=ENVELOPE.frames&&g.limits.children<=100000&&g.limits.auditRecords<=10000000;
}
export function eventOf(r){return {signature:r.signature,slot:r.slot,receivedAt:r.receivedAt,source:'helius_standard',program:'6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',notificationHash:r.notificationHash,finality:r.finality==='finalized'?'rpc_reported_finalized':'provisional',mint:r.mint,quoteMint:r.quoteMint,tokenProgram:r.tokenProgram,transactionHash:r.transactionHash,verificationHash:r.statusHash,checkedAt:r.checkedAt,blockTime:r.blockTime};}
export function validRecord(r){
 const fields=['version','signature','slot','receivedAt','finality','verification','mint','quoteMint','curve','tokenProgram','eventAt','blockTime','checkedAt','finalizedContextSlot','sourceClockVerified','notificationHash','identityHash','transactionHash','statusHash','reason'];
 if(!keys(r,fields)||r.version!=='scout-creation/1'||r.sourceClockVerified!==false||!digest(r.identityHash)||!reason(r.reason)||!['provisional','finalized'].includes(r.finality)||!validEvent(eventOf(r)))return false;
 if(r.finality==='provisional')return r.verification==='notification_only'&&['curve','eventAt','finalizedContextSlot'].every(k=>r[k]===null);
 return r.verification==='rpc_reported_finalized_same_provider'&&exactBase58(r.curve,32)&&integer(r.finalizedContextSlot)&&r.finalizedContextSlot>=r.slot&&clock(r.eventAt)&&Date.parse(r.receivedAt)>=Date.parse(r.eventAt)&&Date.parse(r.receivedAt)-Date.parse(r.eventAt)<=120000;
}
export function validHealth(h){
 const fields=['state','sourceState','reason','frames','bytes','ignored','duplicates','provisional','finalized','withheld','rpcAttempts','rpcBytes','connections','lastFrameAt','lastPongAt','lastRpcRoundTripMs'];
 return keys(h,fields)&&reason(h.state)&&reason(h.reason)&&['connecting','open','closed'].includes(h.sourceState)&&['frames','bytes','ignored','duplicates','provisional','finalized','withheld','rpcAttempts','rpcBytes','connections'].every(k=>integer(h[k]))&&['lastFrameAt','lastPongAt'].every(k=>h[k]===null||clock(h[k]))&&(h.lastRpcRoundTripMs===null||integer(h.lastRpcRoundTripMs)&&h.lastRpcRoundTripMs<=5000);
}
export function validCommand(c){
 const base=['v','op','parent','head','scope','grantHash','worker'];
 if(!c||c.v!==2||!uuid(c.parent)||!uuid(c.worker)||!/^[a-f0-9]{40}$/.test(c.head)||c.scope!==POLICY_HASH||!digest(c.grantHash))return false;
 if(c.op==='claim')return keys(c,base);
 base.push('fence');if(!uuid(c.fence))return false;
 const shape=extra=>keys(c,[...base,...extra.split(',')]);
 switch(c.op){
 case 'beginChild':return shape('child,endsAt')&&uuid(c.child)&&clock(c.endsAt);
 case 'reserve':return shape('child,resource')&&uuid(c.child)&&['connection','rpc'].includes(c.resource);
 case 'append':return shape('child,record')&&uuid(c.child)&&validRecord(c.record);
 case 'heartbeat':return shape('child,health')&&(c.child===null||uuid(c.child))&&validHealth(c.health);
 case 'gap':return shape('child,phase,reason,observedAt,lastPersistedAt')&&(c.child===null||uuid(c.child))&&['begin','end'].includes(c.phase)&&reason(c.reason)&&clock(c.observedAt)&&(c.lastPersistedAt===null||clock(c.lastPersistedAt)&&Date.parse(c.lastPersistedAt)<=Date.parse(c.observedAt));
 case 'closeChild':case 'connectionClosed':return shape('child,connectionClosed')&&uuid(c.child)&&c.connectionClosed===true;
 case 'stop':case 'notify':return shape('reason')&&reason(c.reason);
 case 'release':return shape('connectionClosed')&&c.connectionClosed===true;
 default:return false;
 }
}
export function validMaintenance(c){
 if(!c||!uuid(c.parent)||!digest(c.grantHash))return false;
 const shape=fields=>keys(c,['op','parent','grantHash',...fields]);
 switch(c.op){
 case 'tick':return shape([]);
 case 'meter':return shape(['observedAt','balance','attributed','mismatch','hardCapUntil','receiptHash','throughTicket','throughCredits'])&&clock(c.observedAt)&&clock(c.hardCapUntil)&&integer(c.balance)&&integer(c.throughTicket)&&integer(c.throughCredits)&&typeof c.attributed==='boolean'&&typeof c.mismatch==='boolean'&&digest(c.receiptHash);
 case 'retention':return shape(['observedAt','physicalThrough','backupsExcluded','receiptHash'])&&clock(c.observedAt)&&clock(c.physicalThrough)&&typeof c.backupsExcluded==='boolean'&&digest(c.receiptHash);
 case 'watchdog':return shape(['observedAt','independent','shutdownCapable','receiptHash','throughTicket','throughCredits'])&&clock(c.observedAt)&&typeof c.independent==='boolean'&&typeof c.shutdownCapable==='boolean'&&digest(c.receiptHash)&&integer(c.throughTicket)&&integer(c.throughCredits);
 case 'leaseNotice':return shape([]);
 case 'incident':return shape(['reason'])&&['notification_uncertain','observer_unavailable','retention_failed','meter_mismatch','shutdown_unconfirmed'].includes(c.reason);
 case 'ackNotice':return shape(['id','lease','deliveredAt','receiptHash'])&&uuid(c.id)&&uuid(c.lease)&&clock(c.deliveredAt)&&digest(c.receiptHash);
 default:return false;
 }
}
