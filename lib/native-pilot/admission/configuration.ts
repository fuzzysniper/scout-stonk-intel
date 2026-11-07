import 'server-only';
import type {Pool} from 'pg';
import {need,hash} from '../plan';
import {loadNativeAdmissions,nativeSetupRecord,approvedNativePolicy} from './installed';
import {NATIVE_ADMISSION_PLAN,NATIVE_ADMISSION_BUILD} from './installed';
import type {Configuration} from '../index';
import {NATIVE_SETUP_RUNTIME_ENABLED} from './gates';
import type {NativeSourceAdmission} from './installed';
declare const __UNFARMD_NATIVE_INSTALLED__:boolean;
export type InstalledConfiguration=Omit<Configuration,'intake'|'analyze'|'sourceAdmission'>&Readonly<{sourceAdmission:NativeSourceAdmission|null}>;
/** Real server-only loader. No bindings/credential reads while public compiled setup pins are absent.
 * Actual owner enrollment/issuer availability is still required; this never forges a session or enrolls. */
export async function loadApprovedNativeConfiguration(requireSource=true):Promise<InstalledConfiguration|null>{
 if(!NATIVE_SETUP_RUNTIME_ENABLED||!NATIVE_ADMISSION_PLAN||!NATIVE_ADMISSION_BUILD)return null;
 let pool:Pool|undefined;
 try{
  const admissions=await loadNativeAdmissions(requireSource);need(admissions&&(!requireSource||admissions.source));
  // Build-only DefinePlugin constant: OFF eliminates pg from Next's trace.
  // Selected only by a clean code-reviewed installation file, never an env/runtime toggle.
  const resources=typeof __UNFARMD_NATIVE_INSTALLED__!=='undefined'&&__UNFARMD_NATIVE_INSTALLED__===true ? await Promise.all([import('pg'),import('../../../ops/v4-journal/native-tls.mjs')]) : null;
  if(!resources)return null;
  const [{Pool},{StrictJournalClient,pinnedNeonConfiguration}]=resources;
  // No public record getter without a native capability. Policy is carried by its immutable approved record.
  const p=approvedNativePolicy(admissions.setup),s=nativeSetupRecord(admissions.setup,p).record;
  const secret=(name:string)=>{const v=process.env[name];need(v);return v;};
  const ca=secret('UNFARMD_NATIVE_PG_CA');need(hash(ca)===s.database.caSha256);
  const authSecret=secret('UNFARMD_NATIVE_AUTH_SECRET');need(hash(authSecret)===s.owner.authSecretSha256);
  const reader=pinnedNeonConfiguration(secret('UNFARMD_NATIVE_AUTH_READER_DSN'),ca);need(reader.user==='unfarmd_v4_auth_login');
  pool=new Pool({...reader,Client:StrictJournalClient,max:1});pool.on('error',()=>{});
  const checkpointKey=Buffer.from(secret('UNFARMD_NATIVE_CHECKPOINT_KEY'),'base64url');need(checkpointKey.length===32&&hash(checkpointKey)===s.checkpoint.keySha256);
  const dsn=secret(requireSource?'UNFARMD_NATIVE_PG_DSN':'UNFARMD_NATIVE_STOPPER_DSN');
  const {nativeConfiguration}=await import('../postgres/connection');nativeConfiguration(dsn,s.database.host,ca,!requireSource);
  return Object.freeze({policy:p,sourceAdmission:admissions.source,store:{admission:admissions.setup,dsn,ca,host:s.database.host,
   custody:{origin:s.checkpoint.origin,keySha256:s.checkpoint.keySha256,reviewSha256:s.checkpoint.reviewSha256,policyHash:hash(JSON.stringify(p))},checkpointKey},
   issuerPool:pool,tlsHost:s.database.host,authSecret,readKey:()=>secret('UNFARMD_NATIVE_HELIUS_KEY')});
 }catch{await pool?.end().catch(()=>{});return null;}
}
/** Setup-only owner access. No native-app/STOP/checkpoint/provider binding read. */
export async function loadApprovedNativeOwnerAccess(){
 if(!NATIVE_SETUP_RUNTIME_ENABLED||!NATIVE_ADMISSION_PLAN||!NATIVE_ADMISSION_BUILD)return null;
 let pool:Pool|undefined;
 try{
  const admissions=await loadNativeAdmissions(false);need(admissions);const p=approvedNativePolicy(admissions.setup),s=nativeSetupRecord(admissions.setup,p).record;
  const resources=typeof __UNFARMD_NATIVE_INSTALLED__!=='undefined'&&__UNFARMD_NATIVE_INSTALLED__===true?await Promise.all([import('pg'),import('../../../ops/v4-journal/native-tls.mjs'),import('../runtime/owner')]):null;need(resources);
  const [{Pool},{StrictJournalClient},{nativeIssuerConfiguration,createNativeOwnerAccess}]=resources;
  const ca=process.env.UNFARMD_NATIVE_PG_CA,secret=process.env.UNFARMD_NATIVE_AUTH_SECRET,dsn=process.env.UNFARMD_NATIVE_AUTH_ISSUER_DSN;need(ca&&secret&&dsn&&hash(ca)===s.database.caSha256&&hash(secret)===s.owner.authSecretSha256);
  pool=new Pool({...nativeIssuerConfiguration(dsn,ca),Client:StrictJournalClient,max:1});pool.on('error',()=>{});
  const owner=createNativeOwnerAccess({policy:p,admission:admissions.setup,pool,secret,tlsHost:s.database.host});
  return Object.freeze({handler:owner.handler,close:()=>pool!.end()});
 }catch{await pool?.end().catch(()=>{});return null;}
}
