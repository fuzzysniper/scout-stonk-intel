// Executable OFFLINE policy intent, NOT a Turnkey create-policy API request.
// A future adapter must compile AND independently review the effective provider policy.
import {canonical,trust,approvalPolicyHash} from './protocol.mjs';
export function policyIntent(input){
 const t=trust(input);
 return Object.freeze({version:'unfarmd-turnkey-policy-intent/1',mode:'synthetic-only',deployed:false,
  activity:'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',keyId:t.beta.keyId,
  encoding:'PAYLOAD_ENCODING_HEXADECIMAL',hashFunction:'HASH_FUNCTION_NOT_APPLICABLE',
  consensus:{allOf:[{nonRootUserId:t.owner.userId,credentialId:t.owner.credentialId},{nonRootUserId:t.validator.userId,credentialId:t.validator.credentialId}]},
  policyHash:approvalPolicyHash(t),rootQuorumBypassesProviderPolicy:true});
}
export function matchesPolicy(candidate,input){try{return canonical(candidate)===canonical(policyIntent(input));}catch{return false;}}
