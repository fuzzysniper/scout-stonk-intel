// Public receipt projection validation; no vendor SDK, signer, network or store.
import {canonical,need,fields,uuid} from '../json.mjs';
export function activity(response,request,t,expected,status){
 const a=response.activity;need(a&&uuid(a.id)&&a.organizationId===t.organizationId&&a.type==='ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'&&a.status===status&&!a.failure);
 need(typeof a.fingerprint==='string'&&/^[\x21-\x7e]{1,256}$/.test(a.fingerprint)&&fields(a.intent,['signRawPayloadIntentV2'])&&canonical(a.intent.signRawPayloadIntentV2)===canonical(request.parameters));
 if(expected)need(a.id===expected.id&&a.fingerprint===expected.fingerprint);return a;
}
export function completed(a,t){
 need(a.status==='ACTIVITY_STATUS_COMPLETED'&&Array.isArray(a.votes)&&a.votes.length===2);
 const users=new Set(),ids=new Set();for(const v of a.votes){need(uuid(v.id)&&!ids.has(v.id)&&!users.has(v.userId)&&v.activityId===a.id&&v.selection==='VOTE_SELECTION_APPROVED'&&[t.owner.userId,t.validator.userId].includes(v.userId));ids.add(v.id);users.add(v.userId);}
 need(users.size===2);const s=a.result?.signRawPayloadResult;need((fields(s,['r','s','v'])||fields(s,['r','s']))&&/^[a-f0-9]{64}$/.test(s.r)&&/^[a-f0-9]{64}$/.test(s.s)&&(s.v===undefined||s.v===''||s.v==='00'));return Buffer.from(s.r+s.s,'hex');
}
export function reportedClock(value){
 if(value===undefined||value===null)return null;
 need(value&&typeof value.seconds==='string'&&/^[0-9]{1,13}$/.test(value.seconds)&&Number.isSafeInteger(Number(value.seconds)*1000));const nanos=value.nanos??'0';need((typeof nanos==='string'||typeof nanos==='number')&&/^[0-9]{1,9}$/.test(String(nanos))&&Number(nanos)<1000000000);return {seconds:value.seconds,nanos:String(nanos),qualifier:'provider-reported'};
}
