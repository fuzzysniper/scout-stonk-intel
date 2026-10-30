import 'server-only';
import { createHash } from 'node:crypto';
import { data, time } from '../v4-helius-pilot/server/profile';
export type Provider = 'jupiter' | 'helius';
export type DynamicPolicy = Readonly<{
  id: string; ownerSubject: string; origin: string; startsAt: number; expiresAt: number;
  providers: readonly Provider[]; jupiterAccess: 'keyless' | 'server_key'; maxLookups: number; maxAttempts: number; maxCredits: number;
  debit: Readonly<Record<Provider,number>>;
  rights: Readonly<{ jupiter: string; helius: string; combination: string }>;
}>;
declare const grantBrand: unique symbol;
export type VerifiedSourceGrant = Readonly<{ [grantBrand]: true }>;
export type SourceAuthorization = Readonly<{
  /** C owns real signed release/owner verification. No implementation, issuer or bypass supplied here. */
  verify(request: Request,mint: string,policyHash: string): Promise<VerifiedSourceGrant | null>;
  reverify(request: Request,previous: VerifiedSourceGrant): Promise<VerifiedSourceGrant | null>;
  inspect(grant: VerifiedSourceGrant): Readonly<{ ownerSubject:string; policyHash:string; mint:string; sessionId:string; expiresAt:number }> | null;
}>;
export type Command =
 | Readonly<{kind:'admit';policyHash:string;ownerSubject:string;mint:string;now:number}>
 | Readonly<{kind:'reserve';policyHash:string;lookupId:string;mint:string;provider:Provider;debit:number;now:number}>
 | Readonly<{kind:'finish';policyHash:string;lookupId:string;leaseId:string;mint:string;provider:Provider;responseSha256:string;receivedAt:number;now:number}>
 | Readonly<{kind:'stop';policyHash:string;reason:'uncertain'|'owner_stop';now:number}>;
export type Reply =
 | Readonly<{kind:'admitted';policyHash:string;mint:string;lookupId:string;lookupsReserved:number;committedAt:number}>
 | Readonly<{kind:'reserved';policyHash:string;lookupId:string;mint:string;provider:Provider;leaseId:string;attemptsReserved:number;creditsReserved:number;expiresAt:number;nextAllowedAt:number;committedAt:number}>
 | Readonly<{kind:'published';policyHash:string;lookupId:string;leaseId:string;provider:Provider;responseSha256:string;receivedAt:number;committedAt:number}>
 | Readonly<{kind:'stopped';policyHash:string}>
 | Readonly<{kind:'denied';reason:'stopped'|'exhausted'|'busy'|'rate_limited'|'expired'}>;
export type DynamicLedger = Readonly<{
  scope:'global_atomic_durable_ca_policy_v1';
  /** New approved dynamic policy, SAME future durable infrastructure. NO runtime/memory SQL fallback here.
   * Reserve ACK requires atomic global rate/credit/attempt/one-lease check and durable irreversible COMMIT.
   * Permanent STOP/uncertain lease survives restart; no reset/refund/reclaim/cache/renew operation.
   */
  transact(command:Command):Promise<Reply>;
}>;
export function preparePolicy(value:unknown): { policy:DynamicPolicy; hash:string } | null {
  if (!data(value,['id','ownerSubject','origin','startsAt','expiresAt','providers','jupiterAccess','maxLookups','maxAttempts','maxCredits','debit','rights'])) return null;
  if (![value.id,value.ownerSubject].every(v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{8,128}$/.test(v))) return null;
  if (typeof value.origin!=='string') return null;
  try { const u=new URL(value.origin);if(u.protocol!=='https:'||u.origin!==value.origin||u.port||u.username||u.password)return null; } catch{return null;}
  if(!time(value.startsAt)||!time(value.expiresAt)||value.expiresAt<=value.startsAt||value.expiresAt-value.startsAt>900000)return null;
  if(!Array.isArray(value.providers)||!value.providers.length||value.providers.length>2||!value.providers.every(p=>p==='jupiter'||p==='helius')||new Set(value.providers).size!==value.providers.length)return null;
  if(value.jupiterAccess!=='keyless'&&value.jupiterAccess!=='server_key')return null;
  if(!data(value.debit,['jupiter','helius'])||!data(value.rights,['jupiter','helius','combination']))return null;
  if(!Object.values(value.debit).every(v=>Number.isSafeInteger(v)&&Number(v)>=1&&Number(v)<=1000000)||!Object.values(value.rights).every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)))return null;
  if(!Number.isSafeInteger(value.maxLookups)||Number(value.maxLookups)<1||Number(value.maxLookups)>6||!Number.isSafeInteger(value.maxAttempts)||Number(value.maxAttempts)<1||Number(value.maxAttempts)>12||!Number.isSafeInteger(value.maxCredits)||Number(value.maxCredits)<1||Number(value.maxCredits)>12000000)return null;
  const p=Object.freeze({...value,providers:Object.freeze([...value.providers]),debit:Object.freeze({...value.debit}),rights:Object.freeze({...value.rights})}) as DynamicPolicy;
  return {policy:p,hash:createHash('sha256').update(JSON.stringify(p)).digest('hex')};
}
