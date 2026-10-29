import 'server-only';
import { data, time } from '../v4-helius-pilot/server/profile';
import { isExactPublicKey } from '../onchain-mint/validation';
import type { LedgerCommand, LedgerReply, Permit, Lease, Report } from '../v4-helius-pilot/server/contract';
import { unavailable } from './postgres';
const hex=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const integer=(n:unknown,max:number)=>Number.isSafeInteger(n)&&Number(n)>=1&&Number(n)<=max;
const permit=(v:unknown):v is Permit=>data(v,['policyHash','id','ownerSubject','mint','admittedAt'])&&hex(v.policyHash)&&typeof v.id==='string'&&/^read-(?:[1-9]|[12][0-9]|30)$/.test(v.id)&&typeof v.ownerSubject==='string'&&isExactPublicKey(v.mint)&&time(v.admittedAt);
const lease=(v:unknown):v is Lease=>data(v,['policyHash','permitId','id','mint','issuedAt','expiresAt','attemptsReserved','creditsReserved'])&&hex(v.policyHash)&&typeof v.permitId==='string'&&integer(v.id,10)&&isExactPublicKey(v.mint)&&time(v.issuedAt)&&time(v.expiresAt)&&integer(v.attemptsReserved,10)&&integer(v.creditsReserved,10000000);
const report=(v:unknown):v is Report=>data(v,['responseSha256','contextSlot','receivedAt'])&&hex(v.responseSha256)&&typeof v.contextSlot==='string'&&/^[1-9][0-9]{0,15}$/.test(v.contextSlot)&&time(v.receivedAt);
export function snapshotCommand(value:unknown): LedgerCommand {
  if(!data(value,['kind','now'],['policyHash','ownerSubject','mint','permit','lease','report','reason'])||!time(value.now))throw unavailable();
  const k=value.kind;
  if(k==='admit'||k==='stop'){
    if(!data(value,k==='admit'?['kind','now','policyHash','ownerSubject','mint']:['kind','now','policyHash','ownerSubject','reason'])||!hex(value.policyHash)||typeof value.ownerSubject!=='string'||value.ownerSubject.length>128)throw unavailable();
    if(k==='admit'?!isExactPublicKey(value.mint):value.reason!=='owner_stop'&&value.reason!=='uncertain')throw unavailable();
  }else if(k==='reserve'||k==='finish'){
    if(!data(value,k==='reserve'?['kind','now','permit']:['kind','now','permit','lease','report'])||!permit(value.permit))throw unavailable();
    if(k==='finish'&&(!(value.lease===null||lease(value.lease))||!report(value.report)))throw unavailable();
  }else throw unavailable();
  return JSON.parse(JSON.stringify(value)) as LedgerCommand;
}
/** A native ACK must be a closed, correlated receipt. Never pass arbitrary DB data to callers. */
export function validateReply(r:unknown,c:LedgerCommand): asserts r is LedgerReply {
  let valid=false;
  if(data(r,['kind','reason'])&&r.kind==='denied'&&['stopped','busy','exhausted','read_limited','expired','invalid_clock'].includes(String(r.reason)))valid=true;
  if(c.kind==='admit'&&data(r,['kind','permit'])&&r.kind==='permit'&&permit(r.permit)&&r.permit.policyHash===c.policyHash&&r.permit.mint===c.mint&&r.permit.ownerSubject===c.ownerSubject&&r.permit.admittedAt===c.now)valid=true;
  if(c.kind==='reserve'&&data(r,['kind','lease'])&&r.kind==='lease'&&lease(r.lease)&&r.lease.policyHash===c.permit.policyHash&&r.lease.permitId===c.permit.id&&r.lease.mint===c.permit.mint&&r.lease.issuedAt===c.now)valid=true;
  if(c.kind==='stop'&&data(r,['kind','policyHash'])&&r.kind==='stopped'&&r.policyHash===c.policyHash)valid=true;
  // jsonb canonical key order is deliberately NOT treated as evidence identity.
  if(c.kind==='finish'&&data(r,['kind','policyHash','permitId','leaseId','report','committedAt'])&&r.kind==='published'&&r.policyHash===c.permit.policyHash&&r.permitId===c.permit.id&&r.leaseId===(c.lease?.id??null)&&report(r.report)&&r.report.responseSha256===c.report.responseSha256&&r.report.contextSlot===c.report.contextSlot&&r.report.receivedAt===c.report.receivedAt&&r.committedAt===c.now)valid=true;
  if(!valid)throw unavailable();
}
