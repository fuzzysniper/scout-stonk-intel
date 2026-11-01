// Human-reviewed signer/storage enrollment only, not acquisition or old-global trust.
import {ownerStamp,validatorStamp,policyBinding} from './contract.mjs';
import {canonical,hash,json,fields,need,digest} from './json.mjs';
export const setupDigest=setup=>hash(canonical({publicTrust:setup.publicTrust,resources:setup.resources,neonDirectHost:setup.neonDirectHost,validatorOrigin:setup.validatorOrigin,authorityOrigin:setup.authorityOrigin,anchorDirectory:setup.anchorDirectory,anchorBootstrap:setup.anchorBootstrap,durabilityEvidenceHash:setup.durabilityEvidenceHash,retentionEvidenceHash:setup.retentionEvidenceHash,recoveryAdmission:setup.recoveryAdmission}));
export function setupAdmission(setup,t,now){
 const a=setup.admission;need(a&&ownerStamp(a.owner,t)&&validatorStamp(a.validator,t)&&a.owner.body===a.validator.body);const b=json(a.owner.body);
 need(fields(b,['version','decision','sourceActivation','resourceHash','policyHash','nonce','issuedAt','expiresAt'])&&b.version==='unfarmd-beta-setup-approval/1'&&b.decision==='ENROLL_SIGNER_ONLY'&&b.sourceActivation===false&&b.resourceHash===setupDigest(setup)&&b.policyHash===policyBinding(t)&&digest(b.nonce));
 need(Number.isSafeInteger(b.issuedAt)&&Number.isSafeInteger(b.expiresAt)&&b.issuedAt<=now&&now<b.expiresAt&&b.expiresAt-b.issuedAt<=604800000&&digest(setup.durabilityEvidenceHash)&&digest(setup.retentionEvidenceHash));return true;
}
