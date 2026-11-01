// Independently deployable semantic workflow over real SDK requests and durable ports.
import {context,ownerStamp,validatorStamp,readRaw,ecKey} from './contract.mjs';
import {reviewPolicySet,API,PATHS} from './sdk/requests.mjs';
import {activity,envelope} from './sdk/receipts.mjs';
import {json,need,hash,snapshot,uuid,publicHash,denied} from './json.mjs';
export function organization(response,t){
 const d=response.organizationData;need(d?.organizationId===t.organizationId&&Array.isArray(d.rootQuorum?.userIds)&&d.rootQuorum.userIds.length>0&&d.rootQuorum.threshold>0);
 need(!d.rootQuorum.userIds.includes(t.owner.userId)&&!d.rootQuorum.userIds.includes(t.validator.userId));reviewPolicySet({policies:d.policies},t);
 for(const [role,id,credentialId,pub] of [['owner',t.owner.userId,t.owner.authenticatorId,t.owner.publicKey],['validator',t.validator.userId,t.validator.apiKeyId,t.validator.publicKey]]){
  const matches=d.users?.filter(u=>u.userId===id);need(matches?.length===1);const u=matches[0];need(u.oauthProviders?.length===0&&u.mfaPolicies?.length===0);
  if(role==='owner'){need(u.apiKeys?.length===0&&u.authenticators?.length===1);const a=u.authenticators[0];need(a.authenticatorId===credentialId&&a.credentialId===t.owner.credentialId&&a.credential?.type==='CREDENTIAL_TYPE_WEBAUTHN_AUTHENTICATOR'&&publicHash(ecKey(a.credential.publicKey))===publicHash(ecKey(pub)));}
  else{need(u.authenticators?.length===0&&u.apiKeys?.length===1);const a=u.apiKeys[0];need(a.apiKeyId===credentialId&&a.credential?.type==='CREDENTIAL_TYPE_API_KEY_P256'&&publicHash(ecKey(a.credential.publicKey))===publicHash(ecKey(pub)));}
 }
 const keys=d.privateKeys?.filter(k=>k.privateKeyId===t.beta.keyId);need(keys?.length===1&&d.privateKeys.length===1&&keys[0].curve==='CURVE_ED25519'&&keys[0].exported===false&&keys[0].imported===false);need(keys[0].publicKey===Buffer.from(t.beta.publicKey,'base64url').subarray(-32).toString('hex'));return true;
}
export function validatorComponent({publicTrust,sdk,transport,ledger,clock,authorized=()=>true}){
 const t=context(publicTrust);
 return Object.freeze({async submit(input){
  let grant=null,token=null;
  try{
   need(authorized());const owner=snapshot(input);need(owner.url===API+PATHS.raw&&ownerStamp(owner,t));const now=clock(),d=readRaw(json(owner.body),t,now);need(now-Number(d.q.timestampMs)<=60000);grant=d.r.grantId;
   const reserved=await ledger.prepare(d.r,hash(owner.body));need(reserved.status==='prepared');token=reserved.fence;
   const send=async(signed,kind)=>{need(authorized()&&clock()<d.r.expiresAt&&clock()-Number(d.q.timestampMs)<=60000);need((await ledger.beforeCall(grant,token))===true);need(signed.stamp.stampHeaderName==='X-Stamp-Webauthn'?ownerStamp(signed,t):validatorStamp(signed,t));const out=await transport.send(signed,kind);need(authorized()&&clock()<d.r.expiresAt&&clock()-Number(d.q.timestampMs)<=60000);return out;};
   organization((await send(await sdk.organization(),'organization')).value,t);
   const initial=await send(owner,'raw'),pending=activity(initial.value,d.q,t,null,'ACTIVITY_STATUS_CONSENSUS_NEEDED');need(pending.votes?.length===1&&pending.votes[0].userId===t.owner.userId&&pending.votes[0].selection==='VOTE_SELECTION_APPROVED');
   const observed=await send(await sdk.activity(pending.id),'activity');activity(observed.value,d.q,t,pending,'ACTIVITY_STATUS_CONSENSUS_NEEDED');
   const approval=await sdk.approve(pending.fingerprint,clock());need(validatorStamp(approval,t));const ack=(await send(approval,'approve')).value.activity;
   need(ack&&uuid(ack.id)&&ack.organizationId===t.organizationId&&ack.status==='ACTIVITY_STATUS_COMPLETED');
   if(ack.type==='ACTIVITY_TYPE_APPROVE_ACTIVITY')need(ack.intent?.approveActivityIntent?.fingerprint===pending.fingerprint);else activity({activity:ack},d.q,t,pending,'ACTIVITY_STATUS_COMPLETED');
   const receipt=await send(await sdk.activity(pending.id),'activity');activity(receipt.value,d.q,t,pending,'ACTIVITY_STATUS_COMPLETED');
   const packet=envelope({raw:owner.body,owner,approval,receipt},t,clock());need((await ledger.publish(grant,token,packet)).status==='published');
   return {status:'approval_prepared_source_off',activate:false,sourceCalls:false,envelope:packet};
  }catch{if(token)await ledger.uncertain(grant,token).catch(()=>{});return denied();}
 }});
}
