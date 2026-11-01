// Data-only enrollment package for a separately approved owner-admin bootstrap.
// NOT mounted by daily owner service; no request dispatch, account or key creation.
import {getWebAuthnAttestation} from '@turnkey/http';
export async function enrollmentAttestation({rpId,userId,userName,challenge}){
 // Caller requires a separately approved genuine enrollment interaction. Offline
 // tests inspect the descriptor; this function is never invoked by held entrypoints.
 if(!rpId||!userId||!userName||!(challenge instanceof Uint8Array)||challenge.length!==32)throw Error('enrollment_configuration');
 return getWebAuthnAttestation({publicKey:{rp:{name:'UNFARMD beta owner',id:rpId},user:{id:new TextEncoder().encode(userId),name:userName,displayName:userName},challenge,pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{residentKey:'required',requireResidentKey:true,userVerification:'required'},attestation:'none'}});
}
export function enrollmentRequest({organizationId,userId,challenge,attestation,timestampMs}){
 return {type:'ACTIVITY_TYPE_CREATE_AUTHENTICATORS_V2',organizationId,timestampMs,parameters:{userId,authenticators:[{authenticatorName:'UNFARMD daily non-root owner',challenge,attestation}]}};
}
