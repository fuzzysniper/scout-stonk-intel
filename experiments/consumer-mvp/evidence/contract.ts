/** Portable v1 boundary shared with #88. No raw provider bodies or financial amounts. */
export type SupportedMint = Readonly<{
  mint: string; symbol: string; name: string; quoteMint: string; quoteSymbol: string;
}>;

export type Fact = Readonly<{
  text: string;
  basis: "provider_report" | "interpretation" | "limitation";
  sourceIds: readonly string[];
}>;

export type WithheldQuantity = Readonly<{
  state: "withheld_rights" | "not_observed" | "unsupported";
  value: null;
  reason: string;
}>;

export type SourceReceipt = Readonly<{
  id: string;
  kind: "quote_registry" | "pair_catalog" | "reward_settings";
  provider: "StonkFun";
  url: string;
  capturedAt: string;
  generatedAt: string | null;
  bodySha256: string;
  evidence: "retained_capture";
  verification: "provider_identity_at_capture";
  rights: Readonly<{
    publication: "metadata_only";
    financialQuantities: "withheld";
    permission: "unverified";
  }>;
  /** Auditable retained-byte identity; not a provider signature or a rights grant. */
  retained?: Readonly<{
    commit: string; path: string; documentSha256: string; packetIndex: number;
  }>;
}>;

export type MintExplanation = Readonly<{
  network: "solana";
  token: Readonly<{ mint: string; symbol: string; name: string }>;
  quote: Readonly<{ mint: string; symbol: string; name: string; decimals: number }>;
  freshness: Readonly<{
    state: "captured" | "stale";
    evaluatedAt: string;
    oldestCapturedAt: string;
    maxAgeSeconds: number;
    currentValueClaim: false;
  }>;
  whatItIs: Fact;
  whatUserOwns: Fact;
  pairRelationship: Fact;
  economicMechanism: Readonly<{
    conclusion: Fact;
    settings: "verified_at_capture";
    scope: "provider_token_configuration";
    lifetimeDistribution: WithheldQuantity;
    coveredIntervalFlow: WithheldQuantity;
    settlement: "not_verified";
    holderEntitlement: "unknown";
    holderReturns: WithheldQuantity;
  }>;
  marketContext: Readonly<{
    state: "withheld";
    liquidityUsd: WithheldQuantity;
    volume24hUsd: WithheldQuantity;
    reason: string;
  }>;
  sources: readonly SourceReceipt[];
  risksAndUnknowns: readonly Fact[];
}>;

export type ExplainMintResult =
  | Readonly<{ schemaVersion: "1"; status: "supported"; explanation: MintExplanation }>
  | Readonly<{
      schemaVersion: "1"; status: "unsupported";
      reason: "invalid_mint" | "not_in_supported_set"; message: string;
    }>
  | Readonly<{
      schemaVersion: "1"; status: "unavailable";
      reason: "invalid_clock" | "evidence_integrity"; message: string;
    }>;
