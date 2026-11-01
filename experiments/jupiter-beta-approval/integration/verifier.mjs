// Public-only v3 verification for C. No Turnkey SDK, signing credential or database.
import {createPublicKey,verify} from 'node:crypto';
import {context,readRaw,record,message,ownerStamp,validatorStamp,ENVELOPE} from './contract.mjs';
import {json,need,fields,hash,denied} from './json.mjs';
import {activity,completed,reportedClock} from './sdk/schema.mjs';
export function verifyV3(text,input,now,actualIdentity){
 try{const t=context(input),e=json(text);need(actualIdentity);need(fields(e,['version','raw','ownerStamp','approval','validatorStamp','receipt'])&&e.version===ENVELOPE);const q=json(e.raw),d=readRaw(q,t,now);record(d.text,t,now,actualIdentity);
 need(ownerStamp({body:e.raw,stamp:e.ownerStamp},t)&&validatorStamp({body:e.approval,stamp:e.validatorStamp},t));const b=json(e.approval);need(fields(b,['type','organizationId','timestampMs','parameters'])&&b.type==='ACTIVITY_TYPE_APPROVE_ACTIVITY'&&b.organizationId===t.organizationId&&fields(b.parameters,['fingerprint'])&&Number(b.timestampMs)>=Number(q.timestampMs)&&Number(b.timestampMs)<=now&&Number(b.timestampMs)-Number(q.timestampMs)<=60000);
 need(fields(e.receipt,['activity','sourceClocks','rawResponseSha256'])&&fields(e.receipt.activity,['id','organizationId','status','type','intent','result','votes','fingerprint']));const clocks=e.receipt.sourceClocks;need(fields(clocks,['createdAt','updatedAt','receivedAt'])&&Number.isSafeInteger(clocks.receivedAt)&&clocks.receivedAt>=Number(q.timestampMs)&&clocks.receivedAt<=now);for(const k of ['createdAt','updatedAt'])if(clocks[k]!==null)need(clocks[k].qualifier==='provider-reported'&&JSON.stringify(reportedClock(clocks[k]))===JSON.stringify(clocks[k]));const a=activity(e.receipt,q,t,null,'ACTIVITY_STATUS_COMPLETED');need(b.parameters.fingerprint===a.fingerprint&&/^[a-f0-9]{64}$/.test(e.receipt.rawResponseSha256));
 need(verify(null,message(d.text),createPublicKey({key:Buffer.from(t.beta.publicKey,'base64url'),type:'spki',format:'der'}),completed(a,t)));
 return Object.freeze({status:'verified_source_off_contract',activate:false,sourceCalls:false,record:d.r,envelopeHash:hash(text)});
 }catch{return denied();}
}
