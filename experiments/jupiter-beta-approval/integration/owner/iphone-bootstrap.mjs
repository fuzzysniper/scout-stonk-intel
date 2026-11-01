// Unmounted browser-only preparation. NO dispatch, storage, enrollment or real key
// generation by any shipped entrypoint. Tests supply synthetic WebCrypto keys.
import {TurnkeyClient} from '@turnkey/http';
const API='https://api.turnkey.com',PATH='/public/v1/submit/create_authenticators';
const need=x=>{if(!x)throw Error('bootstrap_held');};
const hex=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
const fields=(x,names)=>x&&Object.keys(x).sort().join()===names.sort().join();
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
// WebCrypto ECDSA is P1363. Turnkey's TK_API_P256 stamp uses strict ASN.1 DER.
function der(raw){
 const b=new Uint8Array(raw);need(b.length===64);
 const part=b=>{let i=0;while(i<b.length-1&&b[i]===0)i++;const value=Array.from(b.subarray(i));if(value[0]&128)value.unshift(0);return [2,value.length,...value];};
 const both=[...part(b.subarray(0,32)),...part(b.subarray(32))];return new Uint8Array([48,both.length,...both]);
}
export async function iphoneBootstrap({origin,actualOrigin,organizationId,userId,reviewedBody,expiresAt,clock=Date.now,crypto=globalThis.crypto}){
 need(new URL(origin).origin===origin&&origin.startsWith('https://')&&actualOrigin===origin);
 need(uuid(organizationId)&&uuid(userId)&&typeof reviewedBody==='string'&&reviewedBody.length<=20000);
 const q=JSON.parse(reviewedBody);need(JSON.stringify(q)===reviewedBody&&fields(q,['type','timestampMs','organizationId','parameters']));
 need(q.type==='ACTIVITY_TYPE_CREATE_AUTHENTICATORS_V2'&&q.organizationId===organizationId&&fields(q.parameters,['userId','authenticators'])&&q.parameters.userId===userId);
 need(q.parameters.authenticators?.length===1);const a=q.parameters.authenticators[0];
 need(fields(a,['authenticatorName','challenge','attestation'])&&a.authenticatorName==='UNFARMD daily non-root owner'&&/^[A-Za-z0-9_-]{43}$/.test(a.challenge));
 need(fields(a.attestation,['credentialId','clientDataJson','attestationObject','transports']));
 need(typeof a.attestation.credentialId==='string'&&typeof a.attestation.attestationObject==='string'&&Array.isArray(a.attestation.transports));
 const c=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(a.attestation.clientDataJson.replace(/-/g,'+').replace(/_/g,'/')),s=>s.charCodeAt(0))));
 need(c.type==='webauthn.create'&&c.origin===origin&&c.crossOrigin!==true&&c.challenge===a.challenge);
 const now=clock();need(Number.isSafeInteger(expiresAt)&&expiresAt>now&&expiresAt-now<=600000&&/^[0-9]{13}$/.test(q.timestampMs)&&Number(q.timestampMs)<=now&&now-Number(q.timestampMs)<=60000);
 // Only this NEW temporary key; never an existing/global/root private key import.
 let pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),used=false,expectedBody=null;
 need(pair.privateKey.extractable===false);const publicBytes=await crypto.subtle.exportKey('raw',pair.publicKey),publicKey=hex(publicBytes);
 const publicKeySha256=hex(await crypto.subtle.digest('SHA-256',publicBytes));
 const stamper={async stamp(body){
  need(!used&&pair&&clock()<expiresAt&&clock()>=now&&body===expectedBody);used=true;
  try{const signature=hex(der(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(body))));
   need(clock()<expiresAt&&clock()>=now);const value=JSON.stringify({publicKey,scheme:'SIGNATURE_SCHEME_TK_API_P256',signature});
   return {stampHeaderName:'X-Stamp',stampHeaderValue:btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
  }finally{pair=null;}
 }};
 const sdk=new TurnkeyClient({baseUrl:API},stamper);
 return Object.freeze({publicKey,publicKeySha256,expiresAt,
  review(){need(!used&&pair&&clock()<expiresAt&&clock()>=now);return JSON.stringify({...q,timestampMs:String(clock())});},
  async prepare(freshReviewedBody){
   need(!used&&typeof freshReviewedBody==='string'&&freshReviewedBody.length<=20000);const fresh=JSON.parse(freshReviewedBody);
   need(JSON.stringify({...q,timestampMs:fresh.timestampMs})===freshReviewedBody&&/^[0-9]{13}$/.test(fresh.timestampMs)&&Number(fresh.timestampMs)>=now&&Number(fresh.timestampMs)<=clock()&&clock()-Number(fresh.timestampMs)<=60000);
   expectedBody=freshReviewedBody;const result=await sdk.stampCreateAuthenticators(fresh);need(result.url===API+PATH&&result.body===expectedBody);return result;
  },
  discard(){used=true;pair=null;}
 });
}
