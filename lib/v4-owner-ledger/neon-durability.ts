import 'server-only';
import {createHash,verify,type KeyObject} from 'node:crypto';
import type {PoolClient,QueryResult} from 'pg';
import {parsePacket} from '../trader-pulse/validation';
import {canonical,deepFreeze} from '../unfarmd-intelligence/internal';
import {PROOF_SQL,STEP_SHA} from './sql-proof';
import {unavailable} from './postgres';

export const NEON_STEP_SHA='7901e92e0e19389d84044ab1da5f34062a4c0a71e3d79925a5c0cadb5de0f1b0';
export const NEON_ADMISSION_SHA='9c796ed1b6adae3f9934d75c68d0a921c26b55597eca59132de49798fcaa25f1';
export const NEON_MIGRATION_SHA='375173150e2d693d53cde08762f9032eae162fe471a5cf906f909eb3243e0471';
export const NEON_EVIDENCE_SHA='0756f3910bc125dec2ca0c8663fe966582c5a5b5c8f080677aa3fa8b071acb7d';
const conventional="current_setting('fsync')='on' AND current_setting('synchronous_commit')='on' AND NOT pg_is_in_recovery()";
/** The original role/function proof remains; only its durability predicate is provider-specific. */
export const NEON_PROOF_SQL=PROOF_SQL.replace(conventional,'unfarmd_v4_deploy.neon_durability_admitted($2)').replace(' AS durable',`
 AND EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
 WHERE p.oid='unfarmd_v4_deploy.neon_durability_admitted(text)'::regprocedure
 AND r.rolname='unfarmd_v4_deploy_owner' AND NOT(r.rolcanlogin OR r.rolsuper OR r.rolbypassrls)
 AND p.prosecdef AND p.proconfig=ARRAY['search_path=pg_catalog']
 AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')=$3
 AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))
 AND current_user='unfarmd_v4_pilot_login' AND session_user=current_user
 AND NOT has_database_privilege(current_user,current_database(),'CREATE,TEMP')
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname NOT IN(current_user,'unfarmd_v4_pilot_app') AND pg_has_role(current_user,r.oid,'MEMBER'))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.admin_option AND pg_has_role(current_user,m.member,'MEMBER'))
 AND NOT has_table_privilege(current_user,'unfarmd_v4_deploy.neon_durability_contract','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS durable`);

declare const brand:unique symbol;
export type NeonAdmission=Readonly<{readonly [brand]:true}>;
type RecordV1=Readonly<{version:'unfarmd-neon-durability/1';mode:'neon-safekeeper-quorum/v1';projectId:string;branchId:string;database:'unfarmd_v4_pilot';host:string;postgresMajor:18;tenantId:string;timelineId:string;evidenceSha256:string;migrationSqlSha256:string;nativeAcceptanceSha256:string;recoveryAnchorPolicySha256:string;ownerApprovalId:string}>;
const capabilities=new WeakMap<object,Readonly<{record:RecordV1;hash:string;payload:string}>>();
const hex=(s:unknown,n=64):s is string=>typeof s==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(s)&&s!=='0'.repeat(n);
/** Explicit trusted owner public key, never env/client identity. No installed selector or issuer. */
export function verifyNeonAdmission(envelope:unknown,ownerPublicKey:KeyObject):NeonAdmission|null{
 try{
  if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||![null,Object.prototype].includes(Object.getPrototypeOf(envelope))||Object.keys(envelope).sort().join(',')!=='payload,signature'||Object.values(Object.getOwnPropertyDescriptors(envelope)).some(d=>!('value' in d)))return null;
  const {payload,signature}=envelope as {payload:unknown;signature:unknown};
  if(typeof payload!=='string'||Buffer.byteLength(payload)>4096||typeof signature!=='string'||ownerPublicKey?.type!=='public'||ownerPublicKey.asymmetricKeyType!=='ed25519')return null;
  const bytes=Buffer.from(signature,'base64url');if(bytes.length!==64||bytes.toString('base64url')!==signature||!verify(null,Buffer.from(payload),ownerPublicKey,bytes))return null;
  const parsed=parsePacket(payload);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;const p={...parsed as Record<string,unknown>};
  const keys=['version','mode','projectId','branchId','database','host','postgresMajor','tenantId','timelineId','evidenceSha256','migrationSqlSha256','nativeAcceptanceSha256','recoveryAnchorPolicySha256','ownerApprovalId'];
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!==keys.sort().join(',')||canonical(p)!==payload)return null;
  if(p.version!=='unfarmd-neon-durability/1'||p.mode!=='neon-safekeeper-quorum/v1'||p.projectId!=='twilight-hall-57571802'||p.branchId!=='br-sweet-voice-b4x4et5q'||p.database!=='unfarmd_v4_pilot'||p.postgresMajor!==18||typeof p.host!=='string'||!/^ep-[a-z0-9-]+\.us-east-2\.aws\.neon\.tech$/.test(p.host)||p.host.includes('-pooler.')||!hex(p.tenantId,32)||!hex(p.timelineId,32)||p.evidenceSha256!==NEON_EVIDENCE_SHA||p.migrationSqlSha256!==NEON_MIGRATION_SHA||!hex(p.nativeAcceptanceSha256)||!hex(p.recoveryAnchorPolicySha256)||typeof p.ownerApprovalId!=='string'||!/^owner-go-[a-f0-9]{16,64}$/.test(p.ownerApprovalId))return null;
  const cap=Object.freeze({}) as NeonAdmission;
  capabilities.set(cap,{record:deepFreeze(p) as RecordV1,hash:createHash('sha256').update(payload).digest('hex'),payload});return cap;
 }catch{return null;}
}
export function assertNeonTarget(cap:NeonAdmission,host:string){const v=cap&&capabilities.get(cap);if(!v||v.record.host!==host)throw unavailable();return v;}
/** Caller still must separately approve/install the identical immutable record. No SQL writes here. */
export function neonAdmissionRecord(cap:NeonAdmission){const v=capabilities.get(cap);if(!v)throw unavailable();return Object.freeze({recordText:v.payload,sha256:v.hash});}
export async function pilotDurabilityProof(c:PoolClient,host:string,cap?:NeonAdmission):Promise<QueryResult<{durable:boolean}>>{
 if(cap===undefined)return c.query(PROOF_SQL,[STEP_SHA]);
 const v=assertNeonTarget(cap,host);
 // Loaded only for explicit Neon mode. Same opaque WeakSet as the actual strict pg client.
 const {strictBindingEstablished}=await import('../../ops/v4-journal/native-tls.mjs');
 if(!strictBindingEstablished(c))throw unavailable();
 return c.query(NEON_PROOF_SQL,[NEON_STEP_SHA,v.hash,NEON_ADMISSION_SHA]);
}
