import {isExactPublicKey} from '../../lib/onchain-mint/validation';
export type PublicApproval=Readonly<{encoded:string;mints:readonly string[];windowActive:boolean}>;
const exact=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const ownerKeys=['version','identity','ownerSubject','journalOwnerId','issuer','authSecretSha256','migrationSha256','authSqlSha256','issuedAt','expiresAt','protectionReviewed','sourceGo'];
const reviewKeys=['version','source','host','method','encoding','commitment','ownerSubject','origin','commit','branch','mints','reviewedAt','decision','termsUrl','termsSha256','accountEvidenceSha256','keySha256','privateDisplay','rawRetention','derivedRetention','ledgerRetention','publicRedistribution','verifiedDebit','includedAllowance','overageProtectionReviewed'];
/** PUBLIC signed approval only, never a private signing key or an owner identity.
 * Syntax checks prevent accidental secret-file transmission. Server signatures,
 * exact deployment, real issuer and SQL remain the ONLY authorization boundary.
 */
export function parsePublicApproval(encoded:string):PublicApproval|null{
 try{
  if(encoded.length>12000||!/^[A-Za-z0-9_-]+$/.test(encoded))return null;
  const bytes=Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));if(bytes.length>8192)return null;
  const text=new TextDecoder('utf8',{fatal:true}).decode(bytes);if(/PRIVATE KEY|postgres(?:ql)?:\/\/|api-key=|Bearer /i.test(text))return null;
  const p:unknown=JSON.parse(text);if(!exact(p,['version','ownerRelease','sourceGrant','nativeReview'])||p.version!=='oracle-native-approval/1')return null;
  const envelope=(x:unknown)=>exact(x,['payload','signature'])&&typeof x.payload==='string'&&x.payload.length<=8192&&typeof x.signature==='string'&&/^[A-Za-z0-9_-]{86}$/.test(x.signature);
  if(!envelope(p.ownerRelease)||!envelope(p.sourceGrant))return null;
  const owner=JSON.parse((p.ownerRelease as {payload:string}).payload),grant=JSON.parse((p.sourceGrant as {payload:string}).payload),r=p.nativeReview;
  if(!exact(owner,ownerKeys)||owner.version!=='unfarmd-owner-preview/1'||owner.sourceGo!==false||!exact(owner.identity,['kind','commit','deployment','project','origin'])
   ||!exact(grant,['version','policy','releaseHash','sqlSha256'])||grant.version!=='unfarmd-ca-source-grant/1'||!exact(grant.policy,['id','ownerSubject','origin','startsAt','expiresAt','providers','jupiterAccess','maxLookups','maxAttempts','maxCredits','debit','rights'])
   ||!exact(grant.policy.debit,['jupiter','helius'])||!exact(grant.policy.rights,['jupiter','helius','combination'])||!exact(r,reviewKeys)||r.version!=='unfarmd-native-mint-review/1'
   ||!Array.isArray(r.mints)||r.mints.length<1||r.mints.length>3||!r.mints.every(isExactPublicKey)||new Set(r.mints).size!==r.mints.length)return null;
  for(const v of [owner.authSecretSha256,owner.migrationSha256,owner.authSqlSha256,grant.releaseHash,grant.sqlSha256,r.termsSha256,r.accountEvidenceSha256,r.keySha256,...Object.values(grant.policy.rights)])if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v))return null;
  return {encoded,mints:r.mints,windowActive:Number.isSafeInteger(grant.policy.startsAt)&&Number.isSafeInteger(grant.policy.expiresAt)&&Date.now()>=Number(grant.policy.startsAt)&&Date.now()<Number(grant.policy.expiresAt)};
 }catch{return null;}
}
