import { freeze } from "./validation";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
/** Development only. Never configurable through a mint, URL, query, browser or environment key. */
export const PUBLIC_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com/";
export const PUBLIC_RPC_HOST = "api.mainnet-beta.solana.com";
export const LIMITS = freeze({ bytes: 65536, headerBytes: 16384, timeoutMs: 5000,
  maxSourceAgeMs: 60000, cacheMs: 30000, minimumIntervalMs: 10000,
  requestsPerDevelopmentProcess: 3, cacheEntries: 3, extensions: 32 });
export const BASE_WARNINGS = freeze([
  "RPC-reported finalized account state; not independently replayed consensus or project verification.",
  "Authority presence or absence is a technical fact, not a safety grade or proof of signer control.",
  "Name, ticker, backing, stock ownership, pair, rewards, market value and holder returns are not established.",
  "The slot is a snapshot context, not the account's last-change time; block time is unavailable.",
]);
