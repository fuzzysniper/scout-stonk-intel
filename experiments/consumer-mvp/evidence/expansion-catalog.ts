import { freeze } from "./guards";
import { IDENTITIES, QUOTE_PROGRAM, REGISTRY_PATH, CATALOG_PATH } from "./catalog";
import type { ReviewIdentity } from "./expansion-contract";

/** Candidate-only selection. This module is NEVER imported by the production entry point. */
export const EXPANSION_CANDIDATES: readonly ReviewIdentity[] = freeze([
  {
    mint: "8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS", symbol: "KNOTS", name: "KNOTS",
    poolMint: "GeNDy5afAWz7S9w2tMLgpK3xQqXjeDaCvYV9h8joEmjo",
    quoteMint: "6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx", quoteSymbol: "STONK", quoteName: "STONK", quoteDecimals: 9,
    quoteTokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", quoteCategory: "custom", quoteSymbolAmbiguous: true,
    catalogPacket: 6, rewardsPacket: 20,
  },
  {
    mint: "68AGsjomsgTtiTaDhF6XGCeVJDnFeh415ngYYgVxGzns", symbol: "OWL", name: "Superintelligence Owl",
    poolMint: "7KVCC9iQfEH93p9kXAguuuZ6TU2GwwhCdzUUvEK9dteP",
    quoteMint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8", quoteSymbol: "SPCXX", quoteName: "SPACEX", quoteDecimals: 8,
    quoteTokenProgram: QUOTE_PROGRAM, quoteCategory: "xstock", quoteSymbolAmbiguous: false,
    catalogPacket: 5, rewardsPacket: 16,
  },
  {
    mint: "CgBR5onYw5Z37YdCq2t77oxzQu4wVpof8GngowGzsHnL", symbol: "SHOGGOTH", name: "SHOGGOTH",
    poolMint: "DVRW4Yubp3ZKbm45BNtSAJdbCfWZwKgp39WtbNGHEYCi",
    quoteMint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh", quoteSymbol: "NVDAX", quoteName: "NVIDIA", quoteDecimals: 8,
    quoteTokenProgram: QUOTE_PROGRAM, quoteCategory: "xstock", quoteSymbolAmbiguous: false,
    catalogPacket: 3, rewardsPacket: 10,
  },
]);

export const REVIEW_SUBJECTS: readonly ReviewIdentity[] = freeze([
  ...IDENTITIES.map(i => ({ ...i, quoteTokenProgram: QUOTE_PROGRAM, quoteCategory: "xstock" as const, quoteSymbolAmbiguous: false })),
  ...EXPANSION_CANDIDATES,
]);

export const OFFLINE_LIMITS = freeze({
  requests: 3, registryBytes: 524288, catalogBytes: 131072, rewardBytes: 32768,
  totalBytes: 688128, requestMilliseconds: 3000, batchMilliseconds: 9000,
  maxAgeSeconds: 600, futureSkewSeconds: 0, retries: 0, concurrency: 1,
  liveRequests: 0, persistentRetentionBytes: 0,
});

export const RIGHTS_BLOCKERS = freeze([
  "retention_permission_unverified", "metadata_publication_permission_unverified",
  "commercial_reuse_permission_unverified", "owner_enrollment_not_approved",
  "current_identity_and_mechanism_not_verified",
]);

export function subjectPaths(i: ReviewIdentity): readonly string[] {
  return [REGISTRY_PATH, CATALOG_PATH + i.quoteMint, `/api/v2/tokens/${i.mint}/rewards`];
}
