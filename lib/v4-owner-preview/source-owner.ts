import 'server-only';
import {isExactPublicKey} from '../onchain-mint/validation';
import type {SourceAuthorization,VerifiedSourceGrant} from '../v4-ca-intelligence/admission';
import type {createOwnerIssuer} from './auth';
import {SourcePolicyAuthority,type SourceApproval} from './source-policy';
import type {createSourceLedger} from './source-ledger';
/** Trusted server constructor for A's opaque source port. A grant is never an input identity. */
export function createSourceOwner(issuer:ReturnType<typeof createOwnerIssuer>,authority:SourcePolicyAuthority,approval:SourceApproval,ledger:ReturnType<typeof createSourceLedger>):SourceAuthorization{
 type Session=NonNullable<Awaited<ReturnType<typeof issuer.session>>>;
 type Binding=Readonly<{request:Request;session:Session;ownerSubject:string;policyHash:string;mint:string;sessionId:string;expiresAt:number}>;
 const grants=new WeakMap<object,Binding>();
 async function verify(request:Request,mint:string,policyHash:string):Promise<VerifiedSourceGrant|null>{try{
  const b=authority.inspect(approval);if(!b||b.hash!==policyHash||!isExactPublicKey(mint))return null;
  const u=new URL(request.url);if(request.method!=='POST'||u.origin!==b.policy.origin||u.pathname!=='/api/v4/ca-intelligence'||u.search||u.hash||request.headers.get('origin')!==u.origin||request.headers.get('sec-fetch-site')!=='same-origin'||request.headers.get('x-unfarmd-ca-intent')!=='inspect')return null;
  const session=await issuer.session(request);if(!session||session.ownerSubject!==b.policy.ownerSubject||!await ledger.snapshot())return null;
  // This is the sole opaque capability constructor: identity comes only from real uncached issuer verification.
  const grant=Object.freeze({}) as VerifiedSourceGrant;grants.set(grant,Object.freeze({request,session,ownerSubject:session.ownerSubject,policyHash,mint,sessionId:session.sessionId,expiresAt:Math.min(session.expiresAt,b.policy.expiresAt)}));return grant;
 }catch{return null;}}
 return Object.freeze({verify,async reverify(request,previous){const old=grants.get(previous);if(!old||old.request!==request||old.expiresAt<=Date.now())return null;const next=await verify(request,old.mint,old.policyHash),fresh=next&&grants.get(next);return fresh&&JSON.stringify(fresh.session)===JSON.stringify(old.session)?next:null;},inspect(grant){const b=grants.get(grant);return b&&authority.inspect(approval)&&Date.now()<b.expiresAt?Object.freeze({ownerSubject:b.ownerSubject,policyHash:b.policyHash,mint:b.mint,sessionId:b.sessionId,expiresAt:b.expiresAt}):null;}});
}
