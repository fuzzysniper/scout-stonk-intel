import {hash} from '../launch-intel/identity';
import {PROGRAM} from '../launch-intel/decode';
import {strictJson} from '../consumer-mvp/evidence/strict-json';
import {utcMicros} from '../consumer-mvp/evidence/guards';

// A new Helius-only proposal. Never imports/reuses #161's scope, key or budget.
export const SCOPE = Object.freeze({
  version:'helius-creations/1', network:'solana-mainnet-beta', program:PROGRAM,
  host:'mainnet.helius-rpc.com', commitment:'finalized',
  maxSessionMs:3600000, leaseMs:12000, heartbeatMs:1000, storeTimeoutMs:1500,
  maxConnections:1, maxConnectionAttempts:3, reconnectDelaysMs:Object.freeze([1000,2000]),
  maxFramesPerConnection:20000, maxBytesPerConnection:16777216, maxFrameBytes:65536,
  maxControlFrames:512, maxControlBytes:65536, maxRpcAttempts:40,
  maxRpcResponseBytes:1048576, rpcTimeoutMs:5000, closeTimeoutMs:3000,
  pingMs:30000, pongTimeoutMs:10000, sampleSpacingMs:10000,
  maxRecords:200, maxQueue:8, maxSeen:60000, maxSourceAgeMs:120000,
  billingModel:'OWNER_AUTHORIZED_DURABLE_STORE_ONLY',
  maxIncrementalCostUsd:0, rawRetentionSeconds:0,
  methods:Object.freeze(['logsSubscribe','getTransaction','getSignatureStatuses']),
});
// B's canonical session policy; independently pinned worker transport policy below.
export const SCOPE_HASH='c9c56b944745f168b5a392afeedf38ebfc6a1eb4969a2c3f772718e56c4237e3';
export const WORKER_POLICY_HASH=hash(JSON.stringify(SCOPE));
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function millis(s:unknown):number {
  const t=utcMicros(s); if(t===null)throw Error('INVALID_UTC');
  const n=Number(t/1000n);if(!Number.isSafeInteger(n))throw Error('INVALID_UTC');return n;
}
export type Approval={version:string;head:string;runId:string;scopeHash:string;workerPolicyHash:string;renderServiceId:string;
  notBefore:string;expiresAt:string;rightsEvidenceHash:string;accountEvidenceHash:string;
  sourceGo:boolean;deploymentGo:boolean;planVerified:boolean;rightsConfirmed:boolean;
  retentionApproved:boolean;dedicatedDataKey:boolean;overageDisabled:boolean;retentionSeconds:number};
export function approval(raw:string,head:string,service:string,now:number):Approval {
  const a=strictJson(raw) as Approval;
  const keys=['version','head','runId','scopeHash','workerPolicyHash','renderServiceId','notBefore','expiresAt','rightsEvidenceHash','accountEvidenceHash','sourceGo','deploymentGo','planVerified','rightsConfirmed','retentionApproved','dedicatedDataKey','overageDisabled','retentionSeconds'];
  if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).sort().join()!==keys.sort().join())throw Error('APPROVAL_SHAPE');
  if(a.version!==SCOPE.version||a.head!==head||!/^[a-f0-9]{40}$/.test(head)||a.scopeHash!==SCOPE_HASH||a.workerPolicyHash!==WORKER_POLICY_HASH||a.renderServiceId!==service||!/^srv-[a-z0-9]+$/.test(service)||!UUID.test(a.runId))throw Error('APPROVAL_SCOPE');
  if(!['sourceGo','deploymentGo','planVerified','rightsConfirmed','retentionApproved','dedicatedDataKey','overageDisabled'].every(k=>a[k as keyof Approval]===true))throw Error('APPROVAL_REQUIRED');
  for(const v of [a.rightsEvidenceHash,a.accountEvidenceHash])if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v)||/^0+$/.test(v))throw Error('EVIDENCE_REQUIRED');
  if(a.retentionSeconds!==3600)throw Error('RETENTION_REQUIRED');
  const start=millis(a.notBefore),end=millis(a.expiresAt);
  if(start>now||end-now<30000||end-start>SCOPE.maxSessionMs)throw Error('APPROVAL_EXPIRED');
  return Object.freeze(a);
}
export const subscription=()=>JSON.stringify({jsonrpc:'2.0',id:1,method:'logsSubscribe',params:[{mentions:[SCOPE.program]},{commitment:'finalized'}]});
export function rpcRequest(signature:string,kind:'transaction'|'status'):string {
  return kind==='transaction'?JSON.stringify({jsonrpc:'2.0',id:10,method:'getTransaction',params:[signature,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]}):JSON.stringify({jsonrpc:'2.0',id:11,method:'getSignatureStatuses',params:[[signature],{searchTransactionHistory:true}]});
}
