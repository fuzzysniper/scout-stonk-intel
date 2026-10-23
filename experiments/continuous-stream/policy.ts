import {createHash} from 'node:crypto';
import {strictJson} from '../consumer-mvp/evidence/strict-json';
import {millis,UUID,WORKER_POLICY_HASH,SCOPE} from '../live-stream/policy';
import type {Grant} from './contract';
export const POLICY=Object.freeze({version:'unfarmd-continuous/1',maxParentMs:7*86400000,maxChildMs:3600000,
  leaseMs:12000,storeTimeoutMs:1500,rolloverMarginMs:15000,minChildMs:30000,rolloverRecords:180,
  maxQueue:16,meterFreshMs:300000,purgeFreshMs:60000,notificationFreshMs:300000,
  normalizedRecords:200,normalizedTtlMs:3600000,sourcePolicyHash:WORKER_POLICY_HASH,
  frameEnvelope:SCOPE.maxFramesPerConnection,byteEnvelope:SCOPE.maxBytesPerConnection});
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,canonical(x)])):v;
export const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const POLICY_HASH=hash(POLICY);
export const GRANT_KEYS=['version','parent','head','service','policyHash','sourcePolicyHash','startsAt','endsAt','resetAt','allowanceCredits','otherReserveCredits','incidentReserveCredits','limits','connectionCredits','rpcCredits','rightsHash','accountHash','retentionHash','notificationHash','mobileHash','sourceGo','hostingGo','rightsGo','spendGo','retentionGo','notificationGo','mobileGo'].sort();
export const integer=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
export function parseGrant(raw:string,head:string,service:string,now:number):Readonly<Grant>{
  if(raw.length>8192)throw Error('GRANT_SIZE');const g=strictJson(raw) as Grant;
  if(!g||Object.keys(g).sort().join()!==GRANT_KEYS.join()||g.version!==POLICY.version||g.head!==head||!(/^[a-f0-9]{40}$/).test(head)||g.service!==service||!(/^srv-[a-z0-9]+$/).test(service)||!UUID.test(g.parent)||g.policyHash!==POLICY_HASH||g.sourcePolicyHash!==WORKER_POLICY_HASH)throw Error('GRANT_IDENTITY');
  for(const k of ['sourceGo','hostingGo','rightsGo','spendGo','retentionGo','notificationGo','mobileGo'] as const)if(g[k]!==true)throw Error('OWNER_GO_REQUIRED');
  for(const k of ['rightsHash','accountHash','retentionHash','notificationHash','mobileHash'] as const)if(!(/^[a-f0-9]{64}$/).test(g[k])||/^0+$/.test(g[k]))throw Error('OWNER_EVIDENCE_REQUIRED');
  const start=millis(g.startsAt),end=millis(g.endsAt);
  if(start>now||end-now<POLICY.minChildMs||end<=start||end-start>POLICY.maxParentMs||end>millis(g.resetAt))throw Error('PARENT_TIME');
  if(!g.limits||Object.keys(g.limits).sort().join()!==['credits','bytes','frames','rpc','connections','children','auditRecords'].sort().join()||!Object.values(g.limits).every(v=>integer(v)&&v>0))throw Error('LIMITS_REQUIRED');
  for(const v of [g.allowanceCredits,g.otherReserveCredits,g.incidentReserveCredits,g.connectionCredits,g.rpcCredits])if(!integer(v))throw Error('CREDIT_INTEGER');
  if(!g.connectionCredits||!g.rpcCredits||g.limits.credits>g.allowanceCredits-g.otherReserveCredits-g.incidentReserveCredits||g.connectionCredits>g.limits.credits||g.limits.bytes<POLICY.byteEnvelope||g.limits.frames<POLICY.frameEnvelope||g.limits.children>100000||g.limits.auditRecords>10000000)throw Error('CREDIT_ALLOCATION');
  return Object.freeze({...g,limits:Object.freeze({...g.limits})});
}
