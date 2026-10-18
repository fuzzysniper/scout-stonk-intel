/** Independent primary-account facts. No branding, pair, rewards, price or holder inference. */
export type MintAuthority = Readonly<{ state: "present" | "absent"; address: string | null }>;
export type MintFactsCore = Readonly<{
  network: "solana-mainnet";
  mint: string;
  program: "spl_token" | "token_2022";
  ownerProgram: string;
  initialized: true;
  supply: Readonly<{ raw: string; decimals: number; decimalAmount: string }>;
  mintAuthority: MintAuthority;
  freezeAuthority: MintAuthority;
  extensions: Readonly<{
    assessment: "none" | "reviewed_metadata_pointer" | "unreviewed";
    names: readonly string[];
    metadataPointer: Readonly<{ authority: string | null; metadataAddress: string | null }> | null;
  }>;
  interpretation: Readonly<{
    minting: "authority_present" | "authority_absent" | "extension_review_required";
    freezing: "authority_present" | "authority_absent" | "extension_review_required";
  }>;
}>;

export type MintSourceV1 = Readonly<{
  endpointHost: string;
  method: "getAccountInfo";
  encoding: "jsonParsed";
  commitment: "finalized";
  assurance: "rpc_reported_not_independently_replayed";
  contextSlot: string;
  slotTime: null;
  requestStartedAt: string;
  responseReceivedAt: string;
  checkedAt: string;
  httpDate: string | null;
  responseSha256: string;
  evaluatedAt: string;
  freshness: "fresh" | "stale";
  /** Populated by all outputs; optional for initial #103 contract/mock compatibility. */
  /** Additive #111 production profile; only the gated, trusted Helius server adapter emits it. */
  acquisition?: "development_rpc" | "recorded_response" | "synthetic_fixture" | "production_rpc";
}>;

export type MintFailure =
  | "disabled" | "server_only" | "invalid_mint" | "admission_limited" | "development_budget"
  | "circuit_open" | "timeout" | "access_denied" | "rate_limited" | "upstream_unavailable"
  | "network_unavailable" | "invalid_response" | "response_too_large" | "rpc_error"
  | "stale_source" | "invalid_clock" | "not_found" | "wrong_owner" | "not_mint"
  | "uninitialized" | "unparsed_account";

export type MintFactsV1 =
  | Readonly<{
      version: "mint-facts/1";
      status: "verified_onchain_mint_at_slot" | "unsupported_extensions";
      mint: string; facts: MintFactsCore; source: MintSourceV1; warnings: readonly string[];
    }>
  | Readonly<{
      version: "mint-facts/1";
      status: "unavailable" | "not_a_supported_mint_account";
      mint: string | null; facts: null; source: null; reason: MintFailure; warnings: readonly string[];
    }>;

export type MintFactsReader = Readonly<{ readMint(mint: string): Promise<MintFactsV1> }>;
