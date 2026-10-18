import "server-only";
export const HELIUS_HOST = "mainnet.helius-rpc.com";
export const POLICY_ID = "scout-helius-mint/offline-v1";
/** Hard-disabled in the shipped route. These ceilings are a conservative review proposal, not purchased quota. */
export const API_LIMITS = Object.freeze({
  timeoutMs: 5000, storeTimeoutMs: 250, leaseMs: 7000,
  cacheMs: 30000, cacheEntries: 8, cacheBytes: 16384,
  globalReadsPerMinute: 30, clientReadsPerMinute: 6, clients: 128, clientRetentionMs: 120000,
  rpcPerMinute: 3, rpcPerUtcDay: 120, minimumRpcIntervalMs: 10000,
  maxRequestUrlBytes: 256, maxRequestHeadersBytes: 16384,
});
export const PRODUCTION_RPC_ENABLED = false as const;
export const APPROVED_SITE_ORIGIN = "https://scout.storkcoin.xyz";
