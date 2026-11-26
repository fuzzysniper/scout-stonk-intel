import {hash} from '../launch-intel/identity';
import {PROGRAM,record} from '../launch-intel/decode';
import {utcMicros} from '../consumer-mvp/evidence/guards';
import {strictJson} from '../consumer-mvp/evidence/strict-json';
export const SCOPE=Object.freeze({version:'owner-pc-launch-pilot/1',program:PROGRAM,
 websocket:'wss://api.mainnet-beta.solana.com/',rpc:'https://api.mainnet-beta.solana.com/',
 maxConnections:1,seconds:120,maxFrames:2000,maxStreamBytes:4194304,maxFrameBytes:65536,
 maxRpcReads:6,maxRpcResponseBytes:262144,timeoutMs:5000,verificationDelayMs:0,
 maxCandidates:64,maxVerifications:3,maxCostUsd:0,retries:0,reconnects:0,
 methods:['logsSubscribe','getTransaction','getSignatureStatuses'],commitment:'finalized',publication:false});
export const SCOPE_HASH=hash(JSON.stringify(SCOPE));
export const subscribe=()=>JSON.stringify({jsonrpc:'2.0',id:1,method:'logsSubscribe',params:[{mentions:[PROGRAM]},{commitment:'finalized'}]});
export function utc(s:unknown){const t=utcMicros(s);if(t===null)throw Error('invalid_utc');return t;}
export function approve(raw:unknown,head:string,now:string){
 const a=record(typeof raw==='string'?strictJson(raw):raw),fields=['version','head','scopeHash','pilotId','notBefore','expiresAt','sourceGo','rpcGo','privateResearchPermitted','termsEvidence','retentionHours','publicOrCommercialPublication','maxCostUsd','approval'];
 if(Object.keys(a).sort().join()!==fields.sort().join()||a.version!==SCOPE.version||a.head!==head||!/^[a-f0-9]{40}$/.test(head)||a.scopeHash!==SCOPE_HASH||typeof a.pilotId!=='string'||!/^pilot-[a-z0-9-]{12,60}$/.test(a.pilotId))throw Error('approval_scope');
 if(a.sourceGo!==true||a.rpcGo!==true||a.privateResearchPermitted!==true||a.publicOrCommercialPublication!==false||a.maxCostUsd!==0||a.retentionHours!==24||a.approval!=='OWNER APPROVES THIS EXACT HEAD AND ONE PRIVATE ZERO-COST PILOT')throw Error('approval_required');
 if(typeof a.termsEvidence!=='string'||!(/^[a-f0-9]{64}$/).test(a.termsEvidence)||/^0+$/.test(a.termsEvidence))throw Error('rights_evidence_hash_required');
 const start=utc(a.notBefore),end=utc(a.expiresAt),t=utc(now);
 if(start>t||end<=t||end-start>900000000n||end-t<BigInt(SCOPE.seconds)*1000000n)throw Error('approval_window');
 return a as typeof a&{pilotId:string;expiresAt:string};
}
