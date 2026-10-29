import type { MintFactsV1, MintFailure } from '../onchain-mint/contract';
import type { PilotReason } from '../v4-helius-pilot/server/contract';
export type NativeReason = PilotReason | MintFailure | 'unreviewed_extensions';
export type NativeObservation = Readonly<{
  facts: MintFactsV1;
  acquisition: 'native_https_response' | 'synthetic_fixture';
  /** Local TLS fixtures MUST NOT claim authentication by Helius. */
  transportAuthentication: 'fixed_host_certificate_validated' | 'local_fixture_only';
  requestBinding: 'server_request_not_echoed_by_account_response';
  assurance: 'rpc_reported_not_independently_replayed';
  policyHash: string; permitId: string; leaseId: number;
  /** SHA-256 of exact UTF-8 response body; neither a signature nor durable signed receipt. */
  responseSha256: string;
  contextSlot: string;
  requestStartedAt: string; responseReceivedAt: string; evaluatedAt: string;
  httpDate: string | null;
  slotTime: null;
}>;
export type NativeResult = Readonly<{
  version: 'unfarmd-helius-native/1'; sourceGo: false;
  state: 'disabled' | 'grey' | 'offline_fixture' | 'observed';
  reason: NativeReason | null;
  observation: NativeObservation | null;
}>;
export type NativeProducer = (request: Request) => Promise<NativeResult>;
