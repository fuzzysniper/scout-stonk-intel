// Real pinned SDK stamp-only methods. Never expose client.request / SDK polling.
import {TurnkeyClient} from '@turnkey/http';
import {WebauthnStamper} from '@turnkey/webauthn-stamper';
import {context,readRaw} from '../contract.mjs';
import {snapshot,need,uuid,canonical} from '../json.mjs';
export const API='https://api.turnkey.com';
export const PATHS=Object.freeze({raw:'/public/v1/submit/sign_raw_payload',approve:'/public/v1/submit/approve_activity',activity:'/public/v1/query/get_activity',policies:'/public/v1/query/list_policies',organization:'/public/v1/query/get_organization',owner:'/public/v1/query/get_user',key:'/public/v1/query/get_private_key'});
export function ownerSdk(t,stamper=new WebauthnStamper({rpId:new URL(t.ownerOrigin).hostname,userVerification:'required',timeout:60000,allowCredentials:[{type:'public-key',id:Uint8Array.from(Buffer.from(t.owner.credentialId,'base64url'))}]})){
 // Browser owner component supplies its browser-safe constructor; no validator key.
 const client=new TurnkeyClient({baseUrl:API},stamper);
 return Object.freeze({async stamp(body,now){context(t);const q=snapshot(body);readRaw(q,t,now);const r=await client.stampSignRawPayload(q);need(r.body===JSON.stringify(q)&&r.url===API+PATHS.raw);return Object.freeze(r);}});
}
export function validatorSdk(t,stamper){
 context(t);const c=new TurnkeyClient({baseUrl:API},stamper);
 return Object.freeze({
  activity:id=>{need(uuid(id));return c.stampGetActivity({organizationId:t.organizationId,activityId:id});},
  approve:(fingerprint,now)=>{need(typeof fingerprint==='string'&&/^[\x21-\x7e]{1,256}$/.test(fingerprint));return c.stampApproveActivity({type:'ACTIVITY_TYPE_APPROVE_ACTIVITY',organizationId:t.organizationId,timestampMs:String(now),parameters:{fingerprint}});},
  policies:()=>c.stampGetPolicies({organizationId:t.organizationId}),
  organization:()=>c.stampGetOrganization({organizationId:t.organizationId}),
  owner:()=>c.stampGetUser({organizationId:t.organizationId,userId:t.owner.userId}),
  key:()=>c.stampGetPrivateKey({organizationId:t.organizationId,privateKeyId:t.beta.keyId}),
 });
}
export async function apiKeySdk(t,credentials){
 // Credentials supplied only by a separately approved server composition; never env-read.
 need(credentials&&credentials.publicKey===t.validator.publicKey&&typeof credentials.privateKey==='string');
 const {ApiKeyStamper}=await import('@turnkey/api-key-stamper');
 return validatorSdk(t,new ApiKeyStamper({apiPublicKey:credentials.publicKey,apiPrivateKey:credentials.privateKey}));
}
export function policyParameters(input){
 const t=context(input),owner=t.owner.userId,validator=t.validator.userId;
 return Object.freeze({policyName:'UNFARMD Jupiter beta exact two-person raw authorization',notes:'Jupiter beta only; independent payload verifier required; root quorum bypass acknowledged.',effect:'EFFECT_ALLOW',
  consensus:`(approvers.any(user, user.id == '${owner}') && approvers.any(user, user.id == '${validator}')) && (credentials.any(credential, credential.id == '${t.owner.authenticatorId}') && credentials.any(credential, credential.id == '${t.validator.apiKeyId}'))`,
  condition:`(activity.type == 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2' && private_key.id == '${t.beta.keyId}') && (activity.params.hash_function == 'HASH_FUNCTION_NOT_APPLICABLE' && activity.params.encoding == 'PAYLOAD_ENCODING_HEXADECIMAL')`});
}
export function policyInstallation(t,now){return {type:'ACTIVITY_TYPE_CREATE_POLICY_V3',organizationId:t.organizationId,timestampMs:String(now),parameters:policyParameters(t)};}
export function reviewPolicySet(response,t){
 const p=policyParameters(t);need(Array.isArray(response.policies)&&response.policies.length===1);const actual=response.policies[0];need(actual.policyId===t.policyId);
 for(const k of ['policyName','notes','effect','consensus','condition'])need(actual[k]===p[k]);need(actual.time===undefined||actual.time==='');return canonical(p);
}
