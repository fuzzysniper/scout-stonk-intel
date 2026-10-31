import 'server-only';
import {createHash} from 'node:crypto';
import {data,time} from '../../v4-helius-pilot/server/profile';
import {TARGET,OwnerReleaseAuthority} from '../../v4-owner-preview/release';
import {SourcePolicyAuthority,sourceHash} from '../../v4-owner-preview/source-policy';
import {VERCEL_PROJECT_ID} from '../../v4-owner-preview/trust';
import type {Config,Review} from './contract';
export const digest=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
const nonzero=(s:unknown)=>typeof s==='string'&&HEX.test(s)&&s!=='0'.repeat(64);
/** A rights record is NOT a licence. Its exact bytes must be authorized by the existing signed source grant.
 * No installed record, signature, owner identity, source selection or runtime activation is provided here.
 */
export function qualify(config:Config,fixture=false){
 try{
  if(!data(config,['ownerAuthority','release','authority','approval','issuerPool','authSecret','pool','tlsHost','review','readKey'])
   ||!(config.ownerAuthority instanceof OwnerReleaseAuthority)||!(config.authority instanceof SourcePolicyAuthority))return null;
  const release=OwnerReleaseAuthority.prototype.inspect.call(config.ownerAuthority,config.release);
  const approved=SourcePolicyAuthority.prototype.inspect.call(config.authority,config.approval);
  if(!release||!approved||approved.releaseHash!==sourceHash(JSON.stringify(release)))return null;
  const r=config.review;
  if(!data(r,['version','source','host','method','encoding','commitment','ownerSubject','origin','commit','branch','reviewedAt','decision','termsUrl','termsSha256','accountEvidenceSha256','keySha256','privateDisplay','rawRetention','derivedRetention','hashRetention','publicRedistribution','verifiedDebit','includedAllowance','overageProtectionReviewed']))return null;
  const review=Object.freeze({...r}) as Review,now=Date.now(),p=approved.policy;
  if(review.version!=='unfarmd-native-mint-review/1'||review.source!=='helius_standard_rpc'||review.host!=='mainnet.helius-rpc.com'
   ||review.method!=='getAccountInfo'||review.encoding!=='base64'||review.commitment!=='finalized'
   ||review.decision!=='approved_protected_private_beta'||review.termsUrl!=='https://www.helius.dev/terms'
   ||!nonzero(review.termsSha256)||!nonzero(review.accountEvidenceSha256)||!nonzero(review.keySha256)||review.privateDisplay!==true||review.publicRedistribution!==false
   ||review.rawRetention!=='request_memory_only'||review.derivedRetention!=='60_seconds'||review.hashRetention!=='existing_immutable_budget_history'||review.overageProtectionReviewed!==true
   ||!time(review.reviewedAt)||review.reviewedAt>now||now-review.reviewedAt>86400000
   ||review.ownerSubject!==p.ownerSubject||review.origin!==p.origin||review.commit!==release.identity.commit
   ||typeof review.branch!=='string'||!/^[-a-zA-Z0-9_/]{8,120}$/.test(review.branch)||review.branch==='main'
   ||p.providers.length!==1||p.providers[0]!=='helius'||p.maxLookups>3||p.maxAttempts>3||p.maxCredits>p.debit.helius*3
   ||review.verifiedDebit!==p.debit.helius||!Number.isSafeInteger(review.includedAllowance)||review.includedAllowance<p.maxCredits
   ||digest(JSON.stringify(review))!==p.rights.helius||approved.runtimeKind!==release.identity.kind)return null;
  if(typeof config.readKey!=='function')return null;
  if(fixture){if(release.identity.kind!=='local_fixture'||config.tlsHost!=='localhost')return null;}
  else if(config.tlsHost!==TARGET.host||release.identity.kind!=='private_preview'||process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!==VERCEL_PROJECT_ID
   ||release.identity.project!==VERCEL_PROJECT_ID||process.env.VERCEL_GIT_COMMIT_SHA!==review.commit||process.env.VERCEL_GIT_COMMIT_REF!==review.branch
   ||process.env.VERCEL_DEPLOYMENT_ID!==release.identity.deployment||'https://'+process.env.VERCEL_URL!==p.origin)return null;
  return Object.freeze({review,approved,release});
 }catch{return null;}
}
