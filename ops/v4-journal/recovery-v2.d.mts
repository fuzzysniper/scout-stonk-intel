import type {KeyObject} from 'node:crypto';
export type BlockedRecoveryV2=Readonly<{status:'blocked';activate:false}>;
export type RecoveryCurrentCheckpointV2=Readonly<{
 anchorSha256:string;databaseId:string;generation:number;sequence:number;
 quiescenceId:string;capturedAtMs:number;checkedAtMs:number;caPolicyHash:string|null;
}>;
/** Only an independently protected, latest checkpoint authority may supply this configuration. */
export type RecoveryTrustV2=Readonly<{
 publicKey:KeyObject;current:RecoveryCurrentCheckpointV2;nowMs:number;maxAgeMs:number;
}>;
export declare function recoveryManifestV2(extractionJson:string,identity:{databaseId:string;generation:number}):
 BlockedRecoveryV2|Readonly<{status:'manifest_offline_only';activate:false;manifestJson:string}>;
/** Exact signed current-anchor preservation; never restoration or source activation permission. */
export declare function reviewRecoveryV2(envelopeJson:string,restoredManifestJson:string,trust:RecoveryTrustV2):
 BlockedRecoveryV2|Readonly<{status:'preserved_offline_only';activate:false}>;
