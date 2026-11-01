// Actual passkey + Turnkey SDK owner UI. No API-key stamper/server credentials.
import {TurnkeyClient} from '@turnkey/http';
import {WebauthnStamper} from '@turnkey/webauthn-stamper';
export function ownerClient(publicTrust){
 const t=structuredClone(publicTrust);Object.freeze(t);const u=new URL(t.ownerOrigin);if(location.origin!==u.origin||window.top!==window.self)throw Error('owner_origin');
 const decode=x=>Uint8Array.from(atob(x.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 const sdk=new TurnkeyClient({baseUrl:'https://api.turnkey.com'},new WebauthnStamper({rpId:u.hostname,userVerification:'required',timeout:60000,allowCredentials:[{type:'public-key',id:decode(t.owner.credentialId)}]}));
 let consumed=false;
 return Object.freeze({async approve(body){if(consumed)throw Error('explicit_new_review_required');consumed=true;const original=JSON.stringify(body),frozen=JSON.parse(original);const signed=await sdk.stampSignRawPayload(frozen);if(signed.body!==original||signed.url!=='https://api.turnkey.com/public/v1/submit/sign_raw_payload')throw Error('request_changed');return signed;},async stop(body){return {body:JSON.stringify(body),stamp:await new WebauthnStamper({rpId:u.hostname,userVerification:'required',timeout:60000,allowCredentials:[{type:'public-key',id:decode(t.owner.credentialId)}]}).stamp(JSON.stringify(body))};}});
}
