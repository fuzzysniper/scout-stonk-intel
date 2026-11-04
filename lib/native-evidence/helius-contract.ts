/** Additive Helius standard-RPC candidate intake, not an old HolderEvidence or transport attestation.
 * NativeEvidenceV1 and original public-RPC Capture/HolderEvidence types remain unchanged.
 */
import type {Controls,NativeEvidenceInputV1} from './contract';
import type {HolderSample,SourceRef} from '../v4-oracle/holders/contract';
export type HeliusCaptureV1=Readonly<{
 endpointHost:'mainnet.helius-rpc.com';requestBody:string;responseBytes:Uint8Array;
 httpStatus:200;requestStartedAt:string;receivedAt:string;
}>;
/** Structurally compatible with B's actual RawBatch; no native/authentication/hash override field. */
export type HeliusRawBatchV1=Readonly<{
 kind:'synthetic_fixture'|'recorded_response';mint:string;evaluatedAt:string;
 selection:HeliusCaptureV1;snapshot:HeliusCaptureV1;clock:HeliusCaptureV1;rightsReviewSha256:string;
}>;
export type QualifiedHolderSourceV1=Omit<SourceRef,'endpointHost'>&Readonly<{
 endpointHost:SourceRef['endpointHost']|'mainnet.helius-rpc.com';
}>;
/** Existing analytics fields, with honestly widened source-host type; no forged legacy capability. */
export type QualifiedHolderSampleV1=Omit<HolderSample,'source'|'candidate'|'analysis'>&Readonly<{
 source:readonly QualifiedHolderSourceV1[];
}>;
declare const heliusHolderBrand:unique symbol;
export type HeliusHolderEvidenceV1=Readonly<{[heliusHolderBrand]:true}>;
export type HeliusHolderResultV1=Readonly<{
 state:'candidate_sample'|'unavailable';reason:string;sample:QualifiedHolderSampleV1|null;
 controls:Controls|null;rightsReviewSha256:string|null;
 providerAuthenticated:false;
}>;
export type HeliusIntakeV1=(raw:HeliusRawBatchV1|unknown)=>NativeEvidenceInputV1|null;
/** New exports: qualifyHeliusBatch(raw)->HeliusHolderEvidenceV1;
 * inspectHeliusEvidence(cap)->HeliusHolderResultV1|null;
 * intakeHeliusBatch(raw)->NativeEvidenceInputV1|null for B.acquire and C's future adapter.
 * analyzeNativeEvidence accepts the NEW cap via its existing unknown holderEvidence port.
 * ALL outputs remain candidate_only / providerAuthenticated:false.
 */
