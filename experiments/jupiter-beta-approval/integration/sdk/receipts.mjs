// Real pinned SDK receipt adapter; raw provider body is hashed, not called an attestation.
import {getSignatureFromActivity} from '@turnkey/http';
import {createPublicKey,verify} from 'node:crypto';
import {context,readRaw,message,ownerStamp,validatorStamp,ENVELOPE} from '../contract.mjs';
import {json,need,fields,hash} from '../json.mjs';
import {activity,completed,reportedClock} from './schema.mjs';
export {activity} from './schema.mjs';
export {verifyV3} from '../verifier.mjs';
export function envelope({raw,owner,approval,receipt},input,now){
 const t=context(input);need(owner.body===raw&&ownerStamp(owner,t)&&validatorStamp(approval,t));const q=json(raw),d=readRaw(q,t,now),a=activity(receipt.value,q,t,null,'ACTIVITY_STATUS_COMPLETED');
 getSignatureFromActivity(a);const approve=json(approval.body);need(fields(approve,['type','organizationId','timestampMs','parameters'])&&approve.type==='ACTIVITY_TYPE_APPROVE_ACTIVITY'&&approve.organizationId===t.organizationId&&fields(approve.parameters,['fingerprint'])&&approve.parameters.fingerprint===a.fingerprint&&Number(approve.timestampMs)>=Number(q.timestampMs)&&Number(approve.timestampMs)<=now&&Number(approve.timestampMs)-Number(q.timestampMs)<=60000);
 need(verify(null,message(d.text),createPublicKey({key:Buffer.from(t.beta.publicKey,'base64url'),type:'spki',format:'der'}),completed(a,t)));
 const out={version:ENVELOPE,raw,ownerStamp:owner.stamp,approval:approval.body,validatorStamp:approval.stamp,receipt:{activity:{id:a.id,organizationId:a.organizationId,status:a.status,type:a.type,intent:a.intent,result:{signRawPayloadResult:a.result.signRawPayloadResult},votes:a.votes.map(v=>({id:v.id,userId:v.userId,activityId:v.activityId,selection:v.selection})),fingerprint:a.fingerprint},sourceClocks:{createdAt:reportedClock(a.createdAt),updatedAt:reportedClock(a.updatedAt),receivedAt:now},rawResponseSha256:hash(receipt.raw)}};
 return JSON.stringify(out);
}
