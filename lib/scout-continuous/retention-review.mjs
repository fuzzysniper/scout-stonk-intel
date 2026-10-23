import {digest,integer} from './policy.mjs';
/** An assessment for review, NEVER an A/B assurance or a source authorization. */
export function retentionReview(settings,permission){
 if(settings?.project!=='snowy-haze-83201847'||settings.branch!=='br-long-fog-b54099ej'||!integer(settings.historySeconds)||!integer(settings.snapshots)||!integer(settings.schedules))throw Error('invalid_retention_settings');
 const proposal=permission?.rightsApproved===true&&digest(permission.rightsHash)&&permission.logicalSeconds===3600&&integer(permission.recoverySeconds)&&permission.recoverySeconds>=settings.historySeconds+3600&&permission.auditRetentionApproved===true&&permission.providerDeletionRecoveryApproved===true&&permission.downstreamCopiesApproved===true;
 return Object.freeze({status:proposal?'requires_versioned_contract_review':'blocked_rights_and_physical_retention',logicalSeconds:3600,recoveryHistorySeconds:settings.historySeconds,
  // Current six hours is NOT a maximum physical erasure bound. Deleted-project
  // recovery, provider copies and downstream exports need their own agreement.
  physicalErasureProven:false,backupsExcluded:false,currentControllerCompatible:false,sourceGo:false,
  choices:['rights_cover_recovery_and_audit_then_version_contract','separate_encrypted_payload_store_and_verifiable_key_erasure']});
}
