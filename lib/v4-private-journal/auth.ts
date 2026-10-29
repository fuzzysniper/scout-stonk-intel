import 'server-only';
import {verify,type KeyObject} from 'node:crypto';
import {parsePacket} from '../trader-pulse/validation';
import {fields,uuid,fail} from './validation';
/** Opaque process capability. A parsed JWT, client header/email or wallet is not a principal. */
declare const ownerBrand:unique symbol;
export type VerifiedOwner=Readonly<{[ownerBrand]:true}>;
export type OwnerTrust=Readonly<{issuer:string;audience:'unfarmd-private-journal';keys:ReadonlyMap<string,KeyObject>}>;
export class OwnerAuthority {
 #principals=new WeakMap<object,{ownerId:string;expiresMs:number;verifiedMs:number}>();
 #trust:OwnerTrust;
 constructor(trust:OwnerTrust){this.#trust=Object.freeze({issuer:trust.issuer,audience:trust.audience,keys:new Map(trust.keys)});}
 verify(token:unknown,nowMs:number):VerifiedOwner{
 const trust=this.#trust;
 try{
  if(typeof token!=='string'||token.length>4096||!Number.isSafeInteger(nowMs)||nowMs<0)throw 0;
  const parts=token.split('.');if(parts.length!==3||parts.some(p=>!p||!/^[A-Za-z0-9_-]+$/.test(p)))throw 0;
  const decode=(s:string)=>{const b=Buffer.from(s,'base64url');if(b.toString('base64url')!==s)throw 0;return b;};
  const header=fields(parsePacket(decode(parts[0]).toString('utf8')),['alg','typ','kid']);
  if(header.alg!=='EdDSA'||header.typ!=='JWT'||typeof header.kid!=='string'||!/^[A-Za-z0-9_-]{1,32}$/.test(header.kid))throw 0;
  const key=trust.keys.get(header.kid);if(!key||key.type!=='public'||key.asymmetricKeyType!=='ed25519')throw 0;
  if(!verify(null,Buffer.from(parts[0]+'.'+parts[1]),key,decode(parts[2])))throw 0;
  const p=fields(parsePacket(decode(parts[1]).toString('utf8')),['iss','aud','sub','iat','nbf','exp','jti']);
  if(typeof trust.issuer!=='string'||!trust.issuer.startsWith('https://')||p.iss!==trust.issuer||p.aud!==trust.audience||
    !uuid(p.sub)||!uuid(p.jti)||![p.iat,p.nbf,p.exp].every(Number.isSafeInteger))throw 0;
  const i=Number(p.iat)*1000,n=Number(p.nbf)*1000,e=Number(p.exp)*1000;
  if(![i,n,e].every(Number.isSafeInteger)||i<0||n<i||e<=n||e-i>300000||i>nowMs||n>nowMs||nowMs>=e)throw 0;
  const principal=Object.freeze({}) as VerifiedOwner;this.#principals.set(principal,{ownerId:p.sub,expiresMs:e,verifiedMs:nowMs});return principal;
 }catch{return fail('unauthenticated');}
}
 ownerId(principal:unknown,nowMs:number):string{
 const p=principal&&typeof principal==='object'?this.#principals.get(principal):undefined;
 if(!p||!Number.isSafeInteger(nowMs)||nowMs<p.verifiedMs||nowMs>=p.expiresMs)return fail('unauthenticated');return p.ownerId;
}
}
