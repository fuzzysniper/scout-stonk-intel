import "server-only";
export const PILOT_GATE = Object.freeze({ enabled: false, sourceGo: false } as const);
export const BOUNDS = Object.freeze({
  attempts: 10, windowMs: 900000, mints: 3, owners: 1, outstanding: 1,
  timeoutMs: 5000, responseBytes: 65536, headerBytes: 16384, requestBytes: 256,
  cacheEntries: 3, cacheMs: 30000, sourceAgeMs: 60000, authenticatedReads: 30,
  retries: 0, host: "mainnet.helius-rpc.com",
} as const);
