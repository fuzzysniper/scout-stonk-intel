import 'server-only';
import {createPublicKey} from 'node:crypto';
import {OwnerReleaseAuthority,type OwnerRelease,type ReleaseRecord,type DeploymentIdentity} from '../../v4-owner-preview/release';
import {SourcePolicyAuthority,sourceHash,type SourceApproval,type ApprovedSource} from '../../v4-owner-preview/source-policy';
import {AUTH_SQL_SHA,SOURCE_SQL_SHA} from '../../v4-owner-preview/sql-pins';
import {OWNER_RELEASE_PUBLIC_KEY_PEM,VERCEL_PROJECT_ID} from '../../v4-owner-preview/trust';
import {data,time} from '../../v4-helius-pilot/server/profile';
import {isExactPublicKey} from '../../onchain-mint/validation';
import {parsePacket} from '../../trader-pulse/validation';
import type {Review,Config} from '../native-mint/contract';
export const NATIVE_BRANCH='feat/266-native-oracle-mount';
export const PUBLIC_PACKETS=['UNFARMD_ORACLE_OWNER_RELEASE','UNFARMD_ORACLE_SOURCE_GRANT','UNFARMD_ORACLE_NATIVE_REVIEW']as const;
declare const brand:unique symbol;
export type MountPlan=Readonly<{[brand]:true}>;
export type PlanDetails=Readonly<{ownerAuthority:OwnerReleaseAuthority;release:OwnerRelease;authority:SourcePolicyAuthority;approval:SourceApproval;record:ReleaseRecord;source:ApprovedSource;review:Review}>;
const plans=new WeakMap<object,{details:PlanDetails;current:(forStop?:boolean)=>boolean}>();
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)&&v!=='0'.repeat(64);
/** Light duplicate preflight; original A qualify() remains authoritative after assembly.
 * No Pool, issuer, provider, secret or environment credential is imported/read here.
 */
function review(value:unknown,r:ReleaseRecord,s:ApprovedSource):Review|null{
 if(!data(value,['version','source','host','method','encoding','commitment','ownerSubject','origin','commit','branch','mints','reviewedAt','decision','termsUrl','termsSha256','accountEvidenceSha256','keySha256','privateDisplay','rawRetention','derivedRetention','ledgerRetention','publicRedistribution','verifiedDebit','includedAllowance','overageProtectionReviewed']))return null;
 const p=s.policy,v=value;
 if(v.version!=='unfarmd-native-mint-review/1'||v.source!=='helius_standard_rpc'||v.host!=='mainnet.helius-rpc.com'||v.method!=='getAccountInfo'||v.encoding!=='base64'||v.commitment!=='finalized'
 ||v.decision!=='approved_protected_private_beta'||v.termsUrl!=='https://www.helius.dev/terms'||![v.termsSha256,v.accountEvidenceSha256,v.keySha256].every(hash)
 ||v.ownerSubject!==p.ownerSubject||v.origin!==p.origin||v.commit!==r.identity.commit||typeof v.branch!=='string'||v.branch==='main'
 ||v.privateDisplay!==true||v.rawRetention!=='request_memory_only'||v.derivedRetention!=='60_seconds'||v.ledgerRetention!=='owner_mint_provider_utc_hash_counters_immutable'||v.publicRedistribution!==false||v.overageProtectionReviewed!==true
 ||!time(v.reviewedAt)||v.reviewedAt>Date.now()||Date.now()-v.reviewedAt>86400000||!Number.isSafeInteger(v.includedAllowance)||Number(v.includedAllowance)<p.maxCredits||v.verifiedDebit!==p.debit.helius
 ||p.providers.length!==1||p.providers[0]!=='helius'||p.maxAttempts>3||p.maxLookups>3||p.maxCredits>3*p.debit.helius
 ||!Array.isArray(v.mints)||v.mints.length<1||v.mints.length>3||!v.mints.every(isExactPublicKey)||new Set(v.mints).size!==v.mints.length
 ||sourceHash(JSON.stringify(v))!==p.rights.helius)return null;
 return Object.freeze({...v,mints:Object.freeze([...v.mints])})as Review;
}
function seal(details:PlanDetails,current:(forStop?:boolean)=>boolean):MountPlan{const cap=Object.freeze({})as MountPlan;plans.set(cap,{details,current});return cap;}
export function inspectMountPlan(cap:unknown,forStop=false):PlanDetails|null{
 try{const p=cap&&typeof cap==='object'?plans.get(cap):null;if(!p||!p.current(forStop)||!p.details.ownerAuthority.inspect(p.details.release)||!p.details.authority.inspect(p.details.approval,forStop))return null;return p.details;}catch{return null;}
}
function metadata():DeploymentIdentity|null{
 const e=process.env,commit=e.VERCEL_GIT_COMMIT_SHA,deployment=e.VERCEL_DEPLOYMENT_ID,host=e.VERCEL_URL;
 if(e.VERCEL_ENV!=='preview'||e.VERCEL_PROJECT_ID!==VERCEL_PROJECT_ID||e.VERCEL_GIT_COMMIT_REF!==NATIVE_BRANCH||!commit||!/^[a-f0-9]{40}$/.test(commit)||!deployment||!/^dpl_[A-Za-z0-9]{8,100}$/.test(deployment)||!host||!/^scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(host))return null;
 return {kind:'private_preview',commit,deployment,project:VERCEL_PROJECT_ID,origin:'https://'+host};
}
let installed:MountPlan|null=null,installedKey:string|null=null;
export const APPROVAL_HEADER='x-unfarmd-native-approval';
function carrier(request?:Request):{texts:string[];key:string;environment:boolean}|null{
 const env=PUBLIC_PACKETS.map(k=>process.env[k]);
 if(env.some(v=>v!==undefined)){if(env.some(v=>typeof v!=='string'))return null;return {texts:env as string[],key:sourceHash(env.join('\0')),environment:true};}
 const encoded=request?.headers.get(APPROVAL_HEADER);if(!encoded||encoded.length>12000||!/^[A-Za-z0-9_-]+$/.test(encoded))return null;
 const bytes=Buffer.from(encoded,'base64url');if(bytes.length>8192||bytes.toString('base64url')!==encoded)return null;
 const packet=parsePacket(new TextDecoder('utf8',{fatal:true}).decode(bytes));
 if(!data(packet,['version','ownerRelease','sourceGrant','nativeReview'])||packet.version!=='oracle-native-approval/1')return null;
 const texts=[JSON.stringify(packet.ownerRelease),JSON.stringify(packet.sourceGrant),JSON.stringify(packet.nativeReview)];return {texts,key:sourceHash(texts.join('\0')),environment:false};
}
/** Signed public metadata only. Actual credentials are a later, separately approved installation. */
export function configuredMountPlan(forStop=false,request?:Request):MountPlan|null{
 try{
  const identity=metadata();if(!identity||!OWNER_RELEASE_PUBLIC_KEY_PEM)return null;
  if(installed&&forStop&&request?.headers.get('x-unfarmd-native-intent')==='stop'&&inspectMountPlan(installed,true))return installed;
  const supplied=carrier(request);if(!supplied)return null;
  if(installed)return installedKey===supplied.key&&inspectMountPlan(installed,forStop)?installed:null;
  const {texts}=supplied;if(texts.some(t=>Buffer.byteLength(t)>16384))return null;
  const key=createPublicKey(OWNER_RELEASE_PUBLIC_KEY_PEM),ownerAuthority=new OwnerReleaseAuthority(key,identity,AUTH_SQL_SHA),release=ownerAuthority.admit(parsePacket(texts[0]));if(!release)return null;
  const authority=new SourcePolicyAuthority(key,ownerAuthority,release,SOURCE_SQL_SHA),approval=authority.admit(parsePacket(texts[1]));if(!approval)return null;
  const record=ownerAuthority.inspect(release)!,source=authority.inspect(approval)!,checked=review(parsePacket(texts[2]),record,source);if(!checked||checked.branch!==NATIVE_BRANCH)return null;
  const current=(stop=false)=>JSON.stringify(metadata())===JSON.stringify(identity)&&(stop||(supplied.environment?PUBLIC_PACKETS.every((k,i)=>process.env[k]===texts[i]):PUBLIC_PACKETS.every(k=>process.env[k]===undefined)));
  installedKey=supplied.key;installed=seal({ownerAuthority,release,authority,approval,record,source,review:checked},current);
  return inspectMountPlan(installed,forStop)?installed:null;
 }catch{return null;}
}
export function nativeMountHint(){const cap=configuredMountPlan(true),p=inspectMountPlan(cap,true);return p?{available:true,mints:[...p.review.mints],windowActive:!!inspectMountPlan(cap)}:{available:false,mints:[],windowActive:false};}
/** Internal test-only capability. No production entry re-exports or calls this. */
export function localMountPlan(config:Config):MountPlan{
 if(process.env.NODE_ENV!=='test')throw Error('local_fixture_only');
 const record=config.ownerAuthority.inspect(config.release),source=config.authority.inspect(config.approval);if(!record||record.identity.kind!=='local_fixture'||!source)throw Error('local_fixture_only');
 const checked=review(config.review,record,source);if(!checked)throw Error('local_review_denied');
 return seal({ownerAuthority:config.ownerAuthority,release:config.release,authority:config.authority,approval:config.approval,record,source,review:checked},()=>process.env.NODE_ENV==='test');
}
