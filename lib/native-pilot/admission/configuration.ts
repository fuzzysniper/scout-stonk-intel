import 'server-only';
import type {Pool} from 'pg';
import {need,hash} from '../plan';
import {loadNativeAdmissions,nativeSetupRecord,approvedNativePolicy} from './installed';
import {NATIVE_ADMISSION_PLAN,NATIVE_ADMISSION_BUILD} from './installed';
import type {Configuration} from '../index';
import {NATIVE_SETUP_RUNTIME_ENABLED} from './gates';
import type {NativeSourceAdmission} from './installed';
export type InstalledConfiguration=Omit<Configuration,'intake'|'analyze'|'sourceAdmission'>&Readonly<{sourceAdmission:NativeSourceAdmission|null}>;
/** Real server-only loader. No bindings/credential reads while public compiled setup pins are absent.
 * Actual owner enrollment/issuer availability is still required; this never forges a session or enrolls. */
export async function loadApprovedNativeConfiguration(requireSource=true):Promise<InstalledConfiguration|null>{
 if(!NATIVE_SETUP_RUNTIME_ENABLED||!NATIVE_ADMISSION_PLAN||!NATIVE_ADMISSION_BUILD)return null;
 let pool:Pool|undefined;
 try{
  const admissions=await loadNativeAdmissions(requireSource);need(admissions&&(!requireSource||admissions.source));
  // Literal build-time resource gate: cross-module false exports retain inactive pg in Next's trace.
  // A separately reviewed setup release must explicitly select this branch; no env/runtime toggle.
  const resources=false /* NATIVE_CONFIGURATION_ENABLED */ ? await Promise.all([import('pg'),import('../../../ops/v4-journal/native-tls.mjs')]) : null;
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
  return Object.freeze({policy:p,sourceAdmission:admissions.source,store:{admission:admissions.setup,dsn:secret('UNFARMD_NATIVE_PG_DSN'),ca,host:s.database.host,
   custody:{origin:s.checkpoint.origin,keySha256:s.checkpoint.keySha256,reviewSha256:s.checkpoint.reviewSha256,policyHash:hash(JSON.stringify(p))},checkpointKey},
   issuerPool:pool,tlsHost:s.database.host,authSecret,readKey:()=>secret('UNFARMD_NATIVE_HELIUS_KEY')});
 }catch{await pool?.end().catch(()=>{});return null;}
}
