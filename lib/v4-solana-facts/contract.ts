import type { MintFactsCore, MintFailure } from "../onchain-mint/contract";

export type FactState = "observed" | "unknown" | "unavailable" | "unsupported";
export type FactColor = "green" | "yellow" | "red" | "grey";
export type ProjectionReason = MintFailure | "invalid_capture" | "unreviewed_extensions";
export type Check = Readonly<{
  state: FactState;
  color: FactColor;
  code: string;
  explanation: string;
  /** Paths into observations; empty when no admitted fact supports the interpretation. */
  evidenceFields: readonly string[];
}>;
export type SolanaMintObservation = Omit<MintFactsCore, "interpretation">;
export type SolanaProvenance = Readonly<{
  provider: "helius-solana-rpc";
  endpointHost: "mainnet.helius-rpc.com";
  method: "getAccountInfo";
  encoding: "jsonParsed";
  requestedCommitment: "finalized";
  contextSlot: string;
  slotTime: null;
  requestStartedAt: string;
  responseReceivedAt: string;
  evaluatedAt: string;
  httpDate: string | null;
  responseSha256: string;
  freshness: "bounded_acquisition_age_only";
  maxAgeMs: 60000;
  captureKind: "synthetic_fixture" | "recorded_response";
  providerAuthentication: "not_verified_offline";
  assurance: "rpc_reported_not_independently_replayed";
  identityBinding: "captured_request_not_echoed_by_account_response";
}>;
export type SolanaFactProjectionV1 = Readonly<{
  version: "unfarmd-solana-facts/1";
  sourceGo: false;
  network: "solana-mainnet";
  requestedMint: string | null;
  state: FactState;
  reason: ProjectionReason | null;
  /** Parsed source fields, NOT a safety opinion. Unsupported extensions may retain base fields for audit. */
  observations: SolanaMintObservation | null;
  providerError: Readonly<{ httpStatus: number; rpcCode: number | null }> | null;
  provenance: SolanaProvenance | null;
  /** Classifications are separate from source observations; never an aggregate safety/buy score. */
  checks: Readonly<{
    account: Check; supply: Check; mintAuthority: Check; freezeAuthority: Check; extensions: Check;
  }>;
  unknowns: readonly Check[];
  limitations: readonly string[];
}>;

/** Offline capture, never a URL, API key, native transport, production response or activation option. */
export type HeliusCapture = Readonly<{
  kind: "synthetic_fixture" | "recorded_response";
  request: Readonly<{
    network: "solana-mainnet";
    endpointHost: "mainnet.helius-rpc.com";
    method: "getAccountInfo";
    encoding: "jsonParsed";
    commitment: "finalized";
    mint: string;
    id: number;
  }>;
  requestStartedAt: string;
  responseReceivedAt: string;
  evaluatedAt: string;
  httpDate?: string | null;
  httpStatus: number;
  /** Raw error messages/bodies never appear in the projection. */
  text: string;
}>;
