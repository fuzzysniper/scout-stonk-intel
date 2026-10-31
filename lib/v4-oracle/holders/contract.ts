import type { FarmAnalysis, Observation, HolderData } from '../farming/contract';
import type { RiskFinding } from '../../v4-owner-preview/view-contract';

export type CaptureKind = 'synthetic_fixture' | 'recorded_response';
export type RpcCapture = Readonly<{
  endpointHost: 'api.mainnet.solana.com' | 'api.mainnet-beta.solana.com';
  requestBody: string; responseBytes: Uint8Array;
  httpStatus: number; requestStartedAt: string; receivedAt: string;
}>;
export type HolderCapture = Readonly<{
  kind: CaptureKind; network: 'solana-mainnet-beta'; mint: string; evaluatedAt: string;
  rights: Readonly<{ analysis: 'approved_private' | 'unreviewed' | 'restricted'; reviewSha256: string | null }>;
  selection: RpcCapture; snapshot: RpcCapture; clock: RpcCapture;
}>;
export type SourceRef = Readonly<{
  endpointHost: RpcCapture['endpointHost']; method: 'getTokenLargestAccounts' | 'getMultipleAccounts' | 'getBlockTime';
  requestBody: string; requestSha256: string; responseSha256: string;
  requestStartedAt: string; receivedAt: string;
  contextSlot: string | null; fieldPath: string;
}>;
export type SampleAccount = Readonly<{
  account: string; tokenOwner: string; mint: string; program: string;
  amountRaw: string; selectionAmountRaw: string;
  state: 'initialized' | 'frozen'; native: boolean;
  extensionTypes: readonly number[]; unsupportedExtensions: readonly number[];
  accountDataSha256: string; fieldPath: string;
}>;
export type HolderSample = Readonly<{
  mint: string; kind: CaptureKind; providerAuthenticated: false;
  assurance: 'captured_request_binding_not_authenticated_native';
  coverage: 'selected_token_accounts_only'; fullHolderCoverage: false; beneficialOwnership: 'unknown';
  supplyRaw: string; decimals: number; mintProgram: string; mintAccountDataSha256: string;
  mintExtensionTypes: readonly number[]; supportedBalanceSemantics: boolean;
  selectionSlot: string; snapshotSlot: string; sourceAt: string;
  clockKind: 'finalized_block_time_estimate'; atomicAcrossCalls: false;
  minContextSlotIsLowerBoundOnly: true; selectionAmountsChanged: number;
  accounts: readonly SampleAccount[];
  /** Empty by design: this source set cannot establish independent pool/CEX classifications. */
  exclusions: readonly never[];
  source: readonly SourceRef[];
  candidate: Observation<HolderData> | null;
  analysis: FarmAnalysis | null;
}>;
declare const holderEvidenceBrand: unique symbol;
/** Process-local decoded record. Cannot be made native by JSON/cast/copy or caller flags. */
export type HolderEvidence = Readonly<{ [holderEvidenceBrand]: true }>;
export type HolderResult = Readonly<{
  state: 'candidate_sample' | 'unavailable';
  reason: string; sample: HolderSample | null;
}>;
export type HolderRiskInput = Readonly<{ mint: unknown; evaluatedAt: string; evidence?: HolderEvidence | null }>;
export type HolderProjection = Readonly<{
  state: 'sources_off' | 'captured_sample' | 'unavailable';
  findings: readonly RiskFinding[]; sample: HolderSample | null;
}>;
