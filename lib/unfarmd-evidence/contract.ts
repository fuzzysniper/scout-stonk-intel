/** Offline, read-only metadata contract. No source, rights, identity or trading authorization. */
export const VERSION = "unfarmd-evidence/1" as const;
export type AssetIdentity =
  | Readonly<{ kind: "solana_mint"; chain: "solana:mainnet" | "solana:devnet" | "solana:testnet"; address: string; assetKey: string }>
  | Readonly<{ kind: "evm_token"; chain: string; address: string; enteredAddress: string; assetKey: string }>
  | Readonly<{ kind: "listed_equity"; mic: string; ticker: string; assetKey: string; permanence: "listing_reference_not_permanent_security_id" }>
  | Readonly<{ kind: "unknown"; ticker: string | null; assetKey: null }>;
export type AssetResolution = Readonly<{
  state: "exact_identifier" | "ambiguous" | "unsupported" | "conflicting_hints" | "invalid";
  inputOrigin: "user_entered";
  verification: "not_verified";
  asset: AssetIdentity;
  reasons: readonly string[];
}>;
export type Use = "private_research" | "public_display" | "commercial_reporting";
export type Reference = Readonly<{ id: string | null; sha256: string | null }>;
export type Rights = Readonly<{
  status: "permitted" | "unverified" | "restricted" | "denied";
  uses: readonly Use[];
  retention: "permitted" | "unverified" | "prohibited";
  reference: Reference | null;
}>;
export type Entitlement = Readonly<{ status: "authorized" | "unverified" | "denied"; reference: Reference | null }>;
export type EvidenceSource = Readonly<{
  providerId: string;
  sourceId: string;
  method: "manual" | "http" | "rpc" | "websocket" | "archive";
  rights: Rights;
  entitlement: Entitlement;
}>;
export type EvidenceEntry = Readonly<{
  id: string;
  assetKey: string | null;
  category: "fact" | "user_assertion" | "hypothesis" | "counterevidence" | "unavailable";
  /** A scoped claim, never a token-wide safety verdict. */
  subject: string;
  statement: string;
  quantity: Readonly<{ raw: string; decimals: number; unitAssetKey: string }> | null;
  origin: "source_record" | "user_entry" | "synthetic_fixture";
  representation: "raw" | "derived";
  derivedFrom: readonly string[];
  contradicts: readonly string[];
  source: EvidenceSource | null;
  clocks: Readonly<{
    observedAt: string | null;
    receivedAt: string | null;
    reportedAt: string | null;
    observedClock: "unknown" | "provider_reported" | "corroborated";
  }>;
  coverage: Readonly<{
    kind: "point_in_time" | "interval" | "partial_sample" | "unknown";
    chain: string | null;
    from: string | null;
    to: string | null;
    exhaustive: false;
  }>;
  verification: Readonly<{
    tier: "unverified" | "provider_reported" | "corroborated" | "independently_replayed";
    finality: "unknown" | "provisional" | "finalized_reported" | "finalized_independently_verified" | "not_applicable";
    reference: Reference | null;
  }>;
  reference: Reference | null;
  /** Bounded by reviewed policy as well; null never means indefinitely fresh. */
  maxAgeSeconds: number | null;
  unknowns: readonly string[];
}>;
export type EvidenceDocument = Readonly<{
  version: typeof VERSION;
  asset: AssetResolution;
  entries: readonly EvidenceEntry[];
}>;
/** Separately reviewed adapter metadata, NOT accepted from the document. Empty by default. */
export type SourcePolicy = Readonly<{
  providerId: string;
  sourceId: string;
  state: "disabled" | "reviewed";
  origin: "source_record" | "synthetic_fixture";
  assetKinds: readonly Exclude<AssetIdentity["kind"], "unknown">[];
  chains: readonly string[];
  methods: readonly EvidenceSource["method"][];
  rights: Rights;
  entitlement: Entitlement;
  maxAgeSeconds: number;
}>;
export type EvaluationContext = Readonly<{
  evaluatedAt: string;
  mode: "offline_fixture" | "record_review";
  intendedUse: Use;
  sourcePolicies?: readonly SourcePolicy[];
}>;
export type ValidationIssue = Readonly<{ path: string; code: string }>;
export type ValidationResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; issues: readonly ValidationIssue[] }>;
export type EvidenceAssessment = Readonly<{
  id: string;
  category: EvidenceEntry["category"];
  state: "admissible_fact" | "withheld" | "user_assertion" | "hypothesis" | "counterevidence" | "unavailable";
  freshness: "fresh" | "stale" | "unknown" | "invalid_clock";
  reasons: readonly string[];
}>;
export type EvidenceReport = Readonly<{
  version: typeof VERSION;
  mode: EvaluationContext["mode"];
  intendedUse: Use;
  evaluatedAt: string;
  assetKey: string | null;
  assetVerification: "not_verified";
  sourceGo: false;
  assessments: readonly EvidenceAssessment[];
  admissibleFactIds: readonly string[];
  userAssertionIds: readonly string[];
  hypothesisIds: readonly string[];
  counterevidenceIds: readonly string[];
  unavailableIds: readonly string[];
  unknownIds: readonly string[];
  /** A checklist component only; risk-plan validation and owner affirmation are independent. */
  decisionAdmissibility: Readonly<{
    PLAN: "evidence_component_only" | "withheld";
    WATCH: "recordable_without_source_evidence";
    PASS: "recordable_without_source_evidence";
    reasons: readonly string[];
  }>;
}>;
