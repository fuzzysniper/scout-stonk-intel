import 'server-only';
import {verify,type KeyObject} from 'node:crypto';
export const BASE_MIGRATION='3416da1b71a2ece227bffc4343a5ea910c61252c246707ded6a1892aed634105';
export const TARGET=Object.freeze({project:'twilight-hall-57571802',branch:'br-sweet-voice-b4x4et5q',database:'unfarmd_v4_pilot',host:'ep-tiny-truth-b4bx6xt9.c-6.us-east-2.aws.neon.tech'});
export type DeploymentIdentity=Readonly<{kind:'private_preview'|'local_fixture';commit:string;deployment:string;project:string;origin:string}>;
export type ReleaseRecord=Readonly<{version:'unfarmd-owner-preview/1';identity:DeploymentIdentity;ownerSubject:string;journalOwnerId:string;issuer:string;authSecretSha256:string;migrationSha256:string;authSqlSha256:string;issuedAt:number;expiresAt:number;protectionReviewed:true;sourceGo:false}>;
declare const admitted:unique symbol;
export type OwnerRelease=Readonly<{[admitted]:true}>;
const keys=(v:object,names:string[])=>Object.keys(v).sort().join(',')===[...names].sort().join(',');
const hex=(v:unknown,n:number)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
/** Server-pinned authority, never selected by query/body/header/public env boolean. */
export class OwnerReleaseAuthority{
 private readonly caps=new WeakMap<object,ReleaseRecord>();private last=0;private terminal=false;
 constructor(private readonly publicKey:KeyObject,private readonly identity:DeploymentIdentity,private readonly authSqlSha:string){if(publicKey.type!=='public'||publicKey.asymmetricKeyType!=='ed25519'||!hex(authSqlSha,64))throw Error('invalid_release_trust');}
 admit(envelope:unknown,now=Date.now()):OwnerRelease|null{try{
  if(this.terminal||!Number.isSafeInteger(now)||now<this.last){this.terminal=true;return null;}this.last=now;
  if(!envelope||typeof envelope!=='object'||!keys(envelope,['payload','signature']))return null;
  const e=envelope as {payload:unknown;signature:unknown};if(typeof e.payload!=='string'||Buffer.byteLength(e.payload)>4096||typeof e.signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(e.signature))return null;
  const signature=Buffer.from(e.signature,'base64url');if(signature.length!==64||signature.toString('base64url')!==e.signature||!verify(null,Buffer.from(e.payload),this.publicKey,signature))return null;
  const r=JSON.parse(e.payload) as ReleaseRecord;
  if(!keys(r,['version','identity','ownerSubject','journalOwnerId','issuer','authSecretSha256','migrationSha256','authSqlSha256','issuedAt','expiresAt','protectionReviewed','sourceGo'])||r.version!=='unfarmd-owner-preview/1'||r.sourceGo!==false||r.protectionReviewed!==true||!uuid(r.ownerSubject)||!uuid(r.journalOwnerId)||!/^[A-Za-z0-9:_-]{8,128}$/.test(r.issuer)||!hex(r.authSecretSha256,64)||r.migrationSha256!==BASE_MIGRATION||r.authSqlSha256!==this.authSqlSha)return null;
  if(!r.identity||!keys(r.identity,['kind','commit','deployment','project','origin'])||!['private_preview','local_fixture'].includes(r.identity.kind)||!hex(r.identity.commit,40)||!r.identity.project||!r.identity.deployment)return null;
  const u=new URL(r.identity.origin);if(u.protocol!=='https:'||u.origin!==r.identity.origin||u.port||u.username||u.password||r.identity.kind==='private_preview'&&u.hostname==='localhost')return null;
  for(const k of ['kind','commit','deployment','project','origin'] as const)if(r.identity[k]!==this.identity[k])return null;
  if(!Number.isSafeInteger(r.issuedAt)||!Number.isSafeInteger(r.expiresAt)||r.issuedAt>now||r.expiresAt<=now||r.expiresAt-r.issuedAt>86400000||r.expiresAt<=r.issuedAt)return null;
  const cap=Object.freeze({}) as OwnerRelease;this.caps.set(cap,Object.freeze({...r,identity:Object.freeze({...r.identity})}));return cap;
 }catch{return null;}}
 inspect(cap:unknown,now=Date.now()):ReleaseRecord|null{if(this.terminal||!Number.isSafeInteger(now)||now<this.last){this.terminal=true;return null;}this.last=now;const r=cap&&typeof cap==='object'?this.caps.get(cap):null;return r&&now>=r.issuedAt&&now<r.expiresAt?r:null;}
}
