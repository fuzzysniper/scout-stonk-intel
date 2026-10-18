import type { SourceReceipt } from "./contract";

/** Review-only v1. Nothing in this contract grants support, source access or publication. */
export type ReviewIdentity = Readonly<{
  mint: string; symbol: string; name: string; poolMint: string;
  quoteMint: string; quoteSymbol: string; quoteName: string; quoteDecimals: number;
  quoteTokenProgram: string; quoteCategory: "xstock" | "custom";
  quoteSymbolAmbiguous: boolean; catalogPacket: number; rewardsPacket: number;
}>;

export type ReviewOptions = Readonly<{ offlineReview?: true; asOf: string }>;
export type Rejection =
  | "invalid_mint" | "not_a_reviewed_subject" | "invalid_clock" | "evidence_integrity"
  | "transcript_version" | "request_budget" | "body_budget" | "deadline"
  | "source_mismatch" | "source_unavailable" | "rate_limited" | "timeout"
  | "transport" | "source_json" | "schema_drift" | "source_clock"
  | "identity_mismatch" | "candidate_absent_from_sample" | "epoch_requires_review";

export type CandidateReview = Readonly<{
  schemaVersion: "consumer-expansion/1";
  activation: "disabled";
  state: "inactive" | "unsupported" | "blocked" | "rejected";
  reason: Rejection | null;
  requestsMade: 0;
  publicExplanation: null;
  financialQuantities: null;
  holderReturn: null;
  blockers: readonly string[];
  evidence: Readonly<{
    identity: ReviewIdentity;
    identityStatus: "provider_verified_at_capture";
    currentMechanism: "not_verified";
    publication: "not_authorized";
    evaluatedAt: string;
    freshness: "captured" | "stale";
    sources: readonly SourceReceipt[];
  }> | null;
}>;

/** Supplied transcript only. No transport implementation/callback, URL option or auth input. */
export type TranscriptReceipt = Readonly<{
  path: string; responsePath: string;
  startedAt: string; capturedAt: string;
  outcome: "response" | "timeout" | "network_error";
  status: number;
  headers: Readonly<Record<string, string>>;
  body: string;
}>;
export type FreshnessTranscript = Readonly<{
  version: "stonkfun-identity-transcript/1";
  kind: "offline_transcript";
  receipts: readonly TranscriptReceipt[];
}>;

export type TranscriptReview = Readonly<{
  schemaVersion: "consumer-expansion/1";
  activation: "disabled";
  state: "inactive" | "unsupported" | "rejected" | "offline_validated";
  reason: Rejection | null;
  requestsMade: 0;
  retryAllowed: false;
  publication: "not_authorized";
  currentMechanism: "not_live_verified";
  financialQuantities: null;
  holderReturn: null;
  economicEpoch: "unknown";
  continuity: "not_established";
  evidence: Readonly<{
    mint: string; quoteMint: string; poolMint: string;
    evaluatedAt: string;
    freshnessAtTranscriptClock: "within_budget";
    sourceAuthenticity: "not_attested";
    completeMarketCoverage: false;
    sources: readonly Readonly<{
      path: string; capturedAt: string; generatedAt: string;
    }>[];
  }> | null;
}>;
