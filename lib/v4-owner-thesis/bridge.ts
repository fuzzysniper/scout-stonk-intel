import 'server-only';
import {createHmac,randomBytes,randomUUID,sign,timingSafeEqual,type KeyObject} from 'node:crypto';
import type {OwnerBoundary,VerifiedOwnerContext as AContext,VerifiedOwnerClaims} from '../v4-owner-ledger/contract';
import type {OwnerAuthority} from '../v4-private-journal/auth';
import type {VerifiedOwnerContext,VerifiedOwnerContextPort} from '../v4-thesis-api/owner-context';
import type {ThesisRatePort} from '../v4-thesis-api/rate';
type Config=Readonly<{boundary:OwnerBoundary;authority:OwnerAuthority;delegationIssuer:string;kid:string;signingKey:KeyObject;csrfKey:Uint8Array;csrfRate:ThesisRatePort}>;
/** Explicit unselected server-only delegation. No authority cast, cookie issuer,
 * production selector, env loader or auth policy rewrite. J verifies every signature.
 */
export function createOwnerThesisBridge(config:Config){
 const source=config.boundary.journal(),authority=config.authority,issuer=config.delegationIssuer,kid=config.kid,key=config.signingKey,csrfKey=Buffer.from(config.csrfKey),rate=config.csrfRate;
 if(!issuer.startsWith('https://')||!/^[A-Za-z0-9_-]{1,32}$/.test(kid)||key.type!=='private'||key.asymmetricKeyType!=='ed25519'||csrfKey.length<32||csrfKey.length>64)throw Error('invalid_bridge_configuration');
 type Binding={request:Request;opaque:AContext;claims:VerifiedOwnerClaims};
 const admitted=new WeakMap<object,Binding>();
 const same=(a:VerifiedOwnerClaims,b:VerifiedOwnerClaims)=>['ownerSubject','journalOwnerId','issuer','audience','sessionId','authenticatedAt','expiresAt'].every(k=>a[k as keyof VerifiedOwnerClaims]===b[k as keyof VerifiedOwnerClaims]);
 const intent=(r:Request)=>!r.signal.aborted&&r.headers.get('x-unfarmd-v4-owner-intent')==='journal';
 const claims=(c:AContext|null)=>{const v=source.inspect(c),t=Date.now();return v&&v.audience&&Number.isSafeInteger(v.verifiedAt)&&v.verifiedAt<=t&&t-v.verifiedAt<=1000&&t<v.expiresAt?Object.freeze({...v}):null;};
 async function refresh(b:Binding){if(!intent(b.request))return null;const opaque=await source.reverify(b.request,b.opaque),c=claims(opaque);if(!opaque||!c||!same(b.claims,c))return null;b.opaque=opaque;return c;}
 const mac=(c:VerifiedOwnerClaims,expires:string,nonce:string)=>createHmac('sha256',csrfKey).update(JSON.stringify([c.ownerSubject,c.journalOwnerId,c.issuer,c.audience,c.sessionId,c.authenticatedAt,c.expiresAt,expires,nonce])).digest();
 const owners:VerifiedOwnerContextPort=Object.freeze({
  async resolve(request:Request){try{
   if(!intent(request))return null;const opaque=await source.verify(request),c=claims(opaque);if(!opaque||!c)return null;
   // A's immutable verified mapping becomes the subject of a short-lived signed
   // internal assertion; the SAME J authority must independently accept it.
   const now=Date.now(),exp=Math.min(Math.floor(c.expiresAt/1000),Math.floor(now/1000)+60),iat=Math.floor(now/1000);
   if(exp<=iat)return null;
   const h=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'JWT',kid})).toString('base64url'),p=Buffer.from(JSON.stringify({iss:issuer,aud:'unfarmd-private-journal',sub:c.journalOwnerId,iat,nbf:iat,exp,jti:randomUUID()})).toString('base64url');
   const token=h+'.'+p+'.'+sign(null,Buffer.from(h+'.'+p),key).toString('base64url');
   const principal=authority.verify(token,Date.now());if(authority.ownerId(principal,Date.now())!==c.journalOwnerId)return null;
   const binding={request,opaque,claims:c};if(!await refresh(binding))return null;
   const context=Object.freeze({principal,sessionTag:c.sessionId,expiresAtMs:exp*1000});admitted.set(context,binding);return context;
  }catch{return null;}},
  async isCurrent(context:VerifiedOwnerContext){try{const b=admitted.get(context);if(!b)return false;const c=await refresh(b);return !!c&&Date.now()<context.expiresAtMs&&authority.ownerId(context.principal,Date.now())===c.journalOwnerId;}catch{return false;}},
  async verifyCsrf(request:Request,context:VerifiedOwnerContext){try{
   const b=admitted.get(context);if(!b||b.request!==request||!['POST','PATCH'].includes(request.method)||request.headers.get('origin')!==b.claims.audience)return false;
   const c=await refresh(b),token=request.headers.get('x-csrf-token')??'',m=/^(\d{13})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(token),now=Date.now();
   if(!c||!m||Number(m[1])<=now||Number(m[1])>now+60000||Number(m[1])>c.expiresAt)return false;
   const supplied=Buffer.from(m[3],'base64url'),expected=mac(c,m[1],m[2]);return supplied.length===expected.length&&timingSafeEqual(supplied,expected)&&await owners.isCurrent(context);
  }catch{return false;}},
 });
 return Object.freeze({owners,
  /** CSRF issuance PROPOSAL only: no installed endpoint. Only a genuine journal
   * GET can obtain a session-bound token; SQL read budget charged before issuance.
   */
  async issueCsrf(request:Request){try{
   if(request.method!=='GET')return null;const context=await owners.resolve(request);if(!context||!await rate.reserve(context.principal,'read')||!await owners.isCurrent(context))return null;
   const b=admitted.get(context)!;const expiresAtMs=Math.min(Date.now()+60000,context.expiresAtMs),expiry=String(expiresAtMs),nonce=randomBytes(16).toString('base64url');
   return Object.freeze({csrfToken:expiry+'.'+nonce+'.'+mac(b.claims,expiry,nonce).toString('base64url'),expiresAtMs});
  }catch{return null;}},
 });
}
