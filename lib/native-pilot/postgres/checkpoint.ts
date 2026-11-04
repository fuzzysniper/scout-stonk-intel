import 'server-only';
import {randomUUID} from 'node:crypto';
import {serviceAuth} from '../../../experiments/jupiter-beta-approval/integration/services/auth.mjs';
import {checkpointPeer} from './http';
import {fileAnchor} from '../../../experiments/jupiter-beta-approval/integration/durable/anchor.mjs';
import {data} from '../../v4-helius-pilot/server/profile';
import {freeze} from '../../onchain-mint/validation';
import {need,digest,hash} from '../plan';
import {checkpoint,canonical,type Checkpoints,type Checkpoint} from './protocol';
export const CHECKPOINT_VERSION='native-pilot-checkpoint/1';
export type Custody=Readonly<{origin:string;keySha256:string;reviewSha256:string;policyHash:string}>;
function auth(c:Custody,key:Buffer){need(digest(c.policyHash)&&digest(c.reviewSha256)&&digest(c.keySha256)&&hash(key)===c.keySha256);return serviceAuth(Buffer.from(key),'anchor');}
/** Concrete HTTPS/MAC client, no fallback/cache/retry. Construction has no network side effects. */
export function remoteCheckpoint(c:Custody,key:Buffer,dispatch:typeof fetch=fetch,now=Date.now):Checkpoints{
 const a=auth(c,key),call=checkpointPeer(c.origin,dispatch);
 const run=async(path:string,extra:Record<string,unknown>={})=>{
  const started=now(),request=freeze({protocol:CHECKPOINT_VERSION,direction:'request',policyHash:c.policyHash,custodySha256:c.reviewSha256,path,operationId:randomUUID(),timestamp:started,...extra});
  const raw=await call(path,{request,stamp:a.stamp(request)});
  need(data(raw,['reply','stamp','activate','sourceCalls'])&&raw.activate===false&&raw.sourceCalls===false);
  const r=raw.reply;need(data(r,['protocol','direction','policyHash','custodySha256','path','operationId','timestamp','value'])&&r.protocol===CHECKPOINT_VERSION&&r.direction==='reply'&&r.policyHash===c.policyHash&&r.custodySha256===c.reviewSha256&&r.path===path&&r.operationId===request.operationId);
  const at=now();need(at>=started&&at-started<=750&&typeof r.timestamp==='number'&&r.timestamp>=started&&a.verify(r,raw.stamp,at));return checkpoint(r.value,c.policyHash);
 };
 return Object.freeze({current:()=>run('/native-checkpoint/read'),advance:(expected:Checkpoint,next:Checkpoint)=>run('/native-checkpoint/advance',{expected,next})});
}
/** Exact protocol handler for an independently retained custodian. No signer/enrollment/provider role.
 * The lower-level boundary is exported for transcripts; it is NOT proof of storage custody. */
export function checkpointBoundary(c:Custody,key:Buffer,store:Checkpoints,now=Date.now){
 const a=auth(c,key);return async(path:string,body:unknown)=>{
  need(data(body,['request','stamp']));const r=body.request;
  const append=path==='/native-checkpoint/advance';need(path==='/native-checkpoint/read'||append);
  need(data(r,['protocol','direction','policyHash','custodySha256','path','operationId','timestamp',...(append?['expected','next']:[])])&&r.protocol===CHECKPOINT_VERSION&&r.direction==='request'&&r.policyHash===c.policyHash&&r.custodySha256===c.reviewSha256&&r.path===path&&a.verify(r,body.stamp,now()));
  const value=append?await store.advance(checkpoint(r.expected,c.policyHash),checkpoint(r.next,c.policyHash)):await store.current();
  const reply=freeze({protocol:CHECKPOINT_VERSION,direction:'reply',policyHash:c.policyHash,custodySha256:c.reviewSha256,path,operationId:r.operationId,timestamp:now(),value:checkpoint(value,c.policyHash)});
  return freeze({reply,stamp:a.stamp(reply),activate:false,sourceCalls:false});
 };
}
export const CHECKPOINT_SERVICE_ENABLED=false;
/** Unmounted existing-owner-runtime extension. Never put this directory in Vercel or Neon restore custody.
 * No file creation or bootstrap-from-database endpoint, no automatic repair/lock reclamation. */
export function createCheckpointCustodian(c:Custody,key:Buffer,directory:string,bootstrap:{seq:string;head:string;policyHash:string;stateHash:string}){
 if(!CHECKPOINT_SERVICE_ENABLED)return null;
 need(bootstrap.policyHash===c.policyHash&&bootstrap.seq==='0'&&bootstrap.head==='0'.repeat(64));
 const anchor=fileAnchor({directory,bootstrap});
 const store:Checkpoints={current:()=>anchor.current(),async advance(expected,next){await anchor.advance(expected,next);return anchor.current();}};
 return checkpointBoundary(c,key,store);
}
export const checkpointRecordHash=(value:unknown)=>hash(canonical(value));
