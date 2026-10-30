import 'server-only';
import {SOURCE_SQL_SHA} from './sql-pins';
import {createHash,verify,type KeyObject} from 'node:crypto';
import {parsePacket} from '../trader-pulse/validation';
import {preparePolicy,type DynamicPolicy} from '../v4-ca-intelligence/admission';
import {OwnerReleaseAuthority,type OwnerRelease} from './release';
export const sourceHash=(s:string)=>createHash('sha256').update(s).digest('hex');
declare const sourceApproval:unique symbol;
export type SourceApproval=Readonly<{[sourceApproval]:true}>;
export type ApprovedSource=Readonly<{policy:DynamicPolicy;hash:string;recordText:string;releaseHash:string;runtimeKind:'private_preview'|'local_fixture'}>;
/** Separate signed source permission. Does not select A's irreversibly OFF native binding. */
export class SourcePolicyAuthority{
 private readonly caps=new WeakMap<object,ApprovedSource>();
 constructor(private readonly publicKey:KeyObject,private readonly owner:OwnerReleaseAuthority,private readonly release:OwnerRelease,private readonly sqlSha256:string){if(publicKey.type!=='public'||publicKey.asymmetricKeyType!=='ed25519'||sqlSha256!==SOURCE_SQL_SHA)throw Error('invalid_source_trust');}
 admit(envelope:unknown):SourceApproval|null{try{
  const r=this.owner.inspect(this.release);if(!r||!envelope||typeof envelope!=='object'||Object.keys(envelope).sort().join(',')!=='payload,signature')return null;
  const ds=Object.getOwnPropertyDescriptors(envelope);if(!('value'in ds.payload)||!('value'in ds.signature))return null;const payload=ds.payload.value,signature=ds.signature.value;
  if(typeof payload!=='string'||Buffer.byteLength(payload)>8192||typeof signature!=='string')return null;const bytes=Buffer.from(signature,'base64url');if(bytes.length!==64||bytes.toString('base64url')!==signature||!verify(null,Buffer.from(payload),this.publicKey,bytes))return null;
  const p=parsePacket(payload) as Record<string,unknown>;if(!p||typeof p!=='object'||Object.keys(p).sort().join(',')!=='policy,releaseHash,sqlSha256,version'||p.version!=='unfarmd-ca-source-grant/1'||p.sqlSha256!==this.sqlSha256||p.releaseHash!==sourceHash(JSON.stringify(r)))return null;
  const result=preparePolicy(p.policy);if(!result)return null;const d=result.policy,now=Date.now();
  if(d.ownerSubject!==r.ownerSubject||d.origin!==r.identity.origin||d.startsAt<r.issuedAt||d.expiresAt>r.expiresAt||now<d.startsAt||now>=d.expiresAt||d.maxLookups>3||d.maxAttempts>6||Object.values(d.rights).some(v=>v==='0'.repeat(64)))return null;
  const cap=Object.freeze({}) as SourceApproval;this.caps.set(cap,Object.freeze({policy:d,hash:result.hash,recordText:JSON.stringify(d),releaseHash:p.releaseHash as string,runtimeKind:r.identity.kind}));return cap;
 }catch{return null;}}
 inspect(cap:unknown,forStop=false):ApprovedSource|null{const r=this.owner.inspect(this.release),value=cap&&typeof cap==='object'?this.caps.get(cap):null;return r&&value&&(forStop||Date.now()>=value.policy.startsAt&&Date.now()<value.policy.expiresAt)?value:null;}
}
