/** Future boundary only. This PR supplies no active adapter or verified permission. */
export type PilotField = "tokenIdentity" | "labels" | "pair" | "rewardMode" | "provenance";
export type PilotAdapterBoundaryV1 = Readonly<{
  version: "consumer-source-pilot/1";
  activation: "disabled";
  transport: null;
  liveRequests: 0;
}>;

/** Explicit simulation, never a permission receipt, license or enablement argument. */
export type PilotPolicyFixture = Readonly<{
  kind: "offline-policy-fixture/1";
  mint: string;
  validFrom: string;
  validUntil: string;
  access: true;
  transientProcessing: true;
  publicFields: readonly PilotField[];
  rawRetentionSeconds: 0;
  metadataCacheSeconds: number;
}>;

/** Body integrity can be checked offline; TLS/origin assertions here are simulated only. */
export type PilotAcquisitionFixture = Readonly<{
  kind: "offline-acquisition-fixture/1";
  requestedOrigin: "https://www.stonkfun.xyz";
  finalOrigin: "https://www.stonkfun.xyz";
  tlsVerified: true;
  redirects: 0;
  bodySha256: readonly string[];
}>;

export type PilotRehearsalResult = Readonly<{
  version: "consumer-source-pilot/1";
  activation: "disabled";
  state: "inactive" | "blocked" | "admitted" | "rejected" | "offline_checked" | "cache_hit";
  reason: string | null;
  requestsMade: 0;
  rightsVerified: false;
  sourceAuthenticity: "not_attested";
  providerSignatureVerified: false;
  publicExplanation: null;
  financialQuantities: null;
  holderReturn: null;
  /** Allowlisted private test projection only, never public authorization or live evidence. */
  preview: Readonly<{
    use: "offline_fixture_only";
    tokenIdentity: Readonly<{ network: "solana"; mint: string }> | null;
    labels: Readonly<{ name: string; symbol: string }> | null;
    pair: Readonly<{ quoteMint: string; quoteSymbol: string; quoteDecimals: number; poolMint: string }> | null;
    rewardMode: "provider_reported_reward_setting" | null;
    provenance: readonly Readonly<{ url: string; generatedAt: string; capturedAt: string; bodySha256: string }>[] | null;
    expiresAt: string;
  }> | null;
  lease: number | null;
}>;
