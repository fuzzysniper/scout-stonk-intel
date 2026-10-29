import 'server-only';
import type {OwnerAuthority,VerifiedOwner} from '../v4-private-journal/auth';
import type {VerifiedOwnerContext,VerifiedOwnerContextPort} from './owner-context';
/** Structural match for A#229's exact type-only verify/inspect contract. No copy
 * of A's opaque brand, issuer implementation or unauthenticated identity cast. */
export type OwnerClaims=Readonly<{ownerSubject:string;journalOwnerId:string;issuer:string;audience:string;sessionId:string;authenticatedAt:number;verifiedAt:number;expiresAt:number}>;
export type OwnerPort<C extends object>=Readonly<{verify(request:Request):Promise<C|null>;inspect(context:unknown):OwnerClaims|null}>;
type Binding<C extends object>=Readonly<{
 source:OwnerPort<C>;authority:OwnerAuthority;
 /** Must return a genuine capability of this authority AFTER A inspects context.
  * A real mapping/issuer is deliberately not installed by B. */
 principal(context:C,claims:OwnerClaims):Promise<VerifiedOwner>;
 csrf(request:Request,context:C,claims:OwnerClaims):Promise<boolean>;
}>;
export function adaptVerifiedOwnerPort<C extends object>(binding:Binding<C>):VerifiedOwnerContextPort{
 const admitted=new WeakMap<object,{request:Request;claims:OwnerClaims}>();
 const same=(a:OwnerClaims,b:OwnerClaims)=>['ownerSubject','journalOwnerId','issuer','audience','sessionId','authenticatedAt','expiresAt'].every(k=>a[k as keyof OwnerClaims]===b[k as keyof OwnerClaims]);
 const fresh=async(request:Request)=>{
  const opaque=await binding.source.verify(request);if(!opaque)return null;const claims=binding.source.inspect(opaque),now=Date.now();
  if(!claims||!Number.isSafeInteger(claims.verifiedAt)||claims.verifiedAt>now||now-claims.verifiedAt>1000||!Number.isSafeInteger(claims.expiresAt)||now>=claims.expiresAt||claims.audience!==new URL(request.url).origin)return null;
  return {opaque,claims:Object.freeze({...claims})};
 };
 return Object.freeze({
  async resolve(request:Request){try{
   const checked=await fresh(request);if(!checked)return null;
   const principal=await binding.principal(checked.opaque,checked.claims);
   if(binding.authority.ownerId(principal,Date.now())!==checked.claims.journalOwnerId)return null;
   const context=Object.freeze({principal,sessionTag:checked.claims.sessionId,expiresAtMs:checked.claims.expiresAt});admitted.set(context,{request,claims:checked.claims});return context;
  }catch{return null;}},
  async verifyCsrf(request:Request,context:VerifiedOwnerContext){try{
   const prior=admitted.get(context);if(!prior||prior.request!==request)return false;const checked=await fresh(request);
   return !!checked&&same(prior.claims,checked.claims)&&await binding.csrf(request,checked.opaque,checked.claims);
  }catch{return false;}},
  async isCurrent(context:VerifiedOwnerContext){try{
   const prior=admitted.get(context);if(!prior)return false;const checked=await fresh(prior.request);
   return !!checked&&same(prior.claims,checked.claims)&&binding.authority.ownerId(context.principal,Date.now())===checked.claims.journalOwnerId;
  }catch{return false;}},
 });
}
