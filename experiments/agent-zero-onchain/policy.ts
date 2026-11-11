import { createHash } from 'node:crypto';
import { freeze, utcMicros } from '../consumer-mvp/evidence/guards';
import sourceLayout from './official-layout.json';
export { freeze };
export const layout = freeze(sourceLayout);
export const PIN = freeze({
  network: 'solana-mainnet', endpoint: 'https://api.mainnet-beta.solana.com/',
  program: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
  tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  token2022Program: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  associatedProgram: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  pool: 'GseMAnNDvntR5uFePZ51yZBXzNSn7GdFPkfHwfr6d77J',
  creator: '9XDYTfQKwW8sHPqnFdUreMmtmffmkHVPGTNV2e3LKxNW', index: 0, poolBump: 254,
  baseMint: '7LSsEoJGhLeZzGvDofTdNg7M3JttxQqGWNLo6vWMpump',
  quoteMint: 'So11111111111111111111111111111111111111112',
  baseVault: '5jMpkf4JF4noHftLgNKyPNh6roVfPSGSjuEk3U4eLKRa',
  quoteVault: '43DVcZR4kQFjh4Xm2i3DcneRxNjZp7HMud8yDrJWrDr8',
  lpMint: '6dpnPD6UWDw5hbJEuPQwnCCMba1JYwHANKuL6GQ6otAH',
  baseAtaBump: 255, quoteAtaBump: 255, lpMintBump: 252,
});
export const ACCOUNTS = freeze([PIN.pool, PIN.baseVault, PIN.quoteVault, PIN.baseMint, PIN.quoteMint]);
export const LIMITS = freeze({ attempts: 2, timeoutMs: 10_000, bodyBytes: 65_536, maxBlockAgeSeconds: 120, futureSkewSeconds: 5, approvalBytes: 8192, approvalHours: 24 });
export const SCOPE = freeze({ version: 'pumpswap-development-probe/1', issue: 153, endpoint: PIN.endpoint, network: PIN.network, accounts: ACCOUNTS, methods: ['getMultipleAccounts', 'getBlockTime'], commitment: 'finalized', maxAttempts: LIMITS.attempts, timeoutMs: LIMITS.timeoutMs, retries: 0, limits: LIMITS, idlCommit: layout.sourceCommit, idlSha256: layout.idlSha256 });
export const sha = (b: string | Uint8Array) => createHash('sha256').update(b).digest('hex');
export const SCOPE_HASH = sha(JSON.stringify(SCOPE));
export class Stop extends Error { constructor(readonly code: string) { super(code); } }
export function need(ok: unknown, code: string): asserts ok { if (!ok) throw new Stop(code); }
export function object(x: unknown): Record<string, unknown> { need(x && typeof x === 'object' && !Array.isArray(x), 'OBJECT_REQUIRED'); return x as Record<string, unknown>; }
export function keys(x: Record<string, unknown>, required: string[], optional: string[] = []) { need(required.every(k => Object.hasOwn(x, k)) && Object.keys(x).every(k => [...required, ...optional].includes(k)), 'UNEXPECTED_FIELDS'); }
export function utc(x: unknown): bigint { const t = utcMicros(x); need(t !== null, 'INVALID_UTC'); return t; }
export const U64_MAX = (1n << 64n) - 1n;
export function integer(x: unknown, max = U64_MAX): bigint { need(typeof x === 'bigint' && x >= 0n && x <= max, 'INVALID_INTEGER'); return x; }
export const accountsRequest = () => JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getMultipleAccounts', params: [ACCOUNTS, { commitment: 'finalized', encoding: 'base64' }] });
export function timeRequest(slot: string) { need(/^[1-9]\d{0,19}$/.test(slot) && BigInt(slot) <= U64_MAX, 'INVALID_SLOT'); return '{"jsonrpc":"2.0","id":2,"method":"getBlockTime","params":[' + slot + ']}'; }
