import { createHash } from 'node:crypto';
import type { Counts, Pool, Snapshot, WindowName } from './contract';
import { LIMITS } from './contract';
import { deepFreeze, isExactMint, parsePacket, validTime } from './validation';

const validated = new WeakSet<object>();
declare const brand: unique symbol;
export type ValidatedSnapshot = Snapshot & { readonly [brand]: true };
export function isValidated(value: unknown): value is ValidatedSnapshot {
  return !!value && typeof value === 'object' && validated.has(value);
}
export const endpointFor = (mint: string): string => {
  if (!isExactMint(mint)) throw new Error('invalid_mint');
  return `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`;
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_schema');
  return value as Record<string, unknown>;
}
function optionalObject(value: unknown): Record<string, unknown> { return value == null ? {} : record(value); }
function number(value: unknown, max = Number.MAX_SAFE_INTEGER): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || Object.is(value, -0) || value < 0 || value > max) throw new Error('invalid_number');
  return value;
}
function label(value: unknown, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || value.length > max || /[\p{Cc}\p{Cf}<>]/u.test(value)) throw new Error('invalid_label');
  return value || null;
}
function token(value: unknown): Pool['base'] {
  const t = record(value); if (!isExactMint(t.address)) throw new Error('invalid_identity');
  return { mint: t.address, name: label(t.name, 128), symbol: label(t.symbol, 32) };
}
const WINDOWS: WindowName[] = ['m5', 'h1', 'h6', 'h24'];
function windows<T>(input: unknown, read: (value: unknown) => T): Record<WindowName, T> {
  const r = optionalObject(input);
  return Object.fromEntries(WINDOWS.map(w => [w, read(r[w])])) as Record<WindowName, T>;
}
function counts(value: unknown): Counts | null {
  if (value == null) return null; const t = record(value);
  const buys = number(t.buys, 1e9), sells = number(t.sells, 1e9);
  for (const n of [buys, sells]) if (n !== null && !Number.isSafeInteger(n)) throw new Error('invalid_count');
  return buys === null || sells === null ? null : { buys, sells };
}
function pool(value: unknown, mint: string): Pool {
  const p = record(value);
  if (p.chainId !== 'solana' || !isExactMint(p.pairAddress) ||
    typeof p.dexId !== 'string' || !/^[a-z0-9-]{1,48}$/.test(p.dexId)) throw new Error('invalid_pool');
  const base = token(p.baseToken), quote = token(p.quoteToken);
  if (base.mint === quote.mint || (base.mint !== mint && quote.mint !== mint)) throw new Error('identity_mismatch');
  const sourceUrl = `https://dexscreener.com/solana/${p.pairAddress}`;
  // Reconstruct links; never follow or return an upstream-controlled host/path.
  if (p.url != null && p.url !== sourceUrl) throw new Error('source_url_mismatch');
  let priceUsd: string | null = null;
  if (p.priceUsd != null) {
    if (typeof p.priceUsd !== 'string' || !/^(?:0|[1-9]\d{0,15})(?:\.\d{1,24})?$/.test(p.priceUsd) ||
      !Number.isFinite(Number(p.priceUsd)) || Number(p.priceUsd) > Number.MAX_SAFE_INTEGER) throw new Error('invalid_price');
    priceUsd = p.priceUsd;
  }
  const pairCreatedAt = number(p.pairCreatedAt, 8640000000000000);
  if (pairCreatedAt !== null && !Number.isSafeInteger(pairCreatedAt)) throw new Error('invalid_created_at');
  return {
    chainId: 'solana', dexId: p.dexId, pairAddress: p.pairAddress, sourceUrl, base, quote,
    liquidityUsd: number(optionalObject(p.liquidity).usd),
    volumeUsd: windows(p.volume, n => number(n)), txns: windows(p.txns, counts), priceUsd,
    priceChangePercent: windows(p.priceChange, n => {
      if (n == null) return null;
      if (typeof n !== 'number' || !Number.isFinite(n) || n < -100 || n > 1e9 || Object.is(n, -0)) throw new Error('invalid_change');
      return n;
    }), pairCreatedAt,
  };
}
/** Decode ORIGINAL bounded bytes, not a lossy pre-parsed object. No invalid-row skipping. */
export function decodeObservation(input: {
  mint: string; quoteMint?: string; bytes: Uint8Array; requestStartedMs: number; retrievedMs: number;
}): ValidatedSnapshot {
  if (!isExactMint(input.mint) || (input.quoteMint !== undefined && (!isExactMint(input.quoteMint) || input.quoteMint === input.mint))) throw new Error('invalid_mint');
  if (!validTime(input.requestStartedMs) || !validTime(input.retrievedMs) || input.retrievedMs < input.requestStartedMs ||
    input.retrievedMs - input.requestStartedMs > LIMITS.deadlineMs) throw new Error('invalid_clock');
  if (!(input.bytes instanceof Uint8Array) || input.bytes.length > LIMITS.bytes) throw new Error('invalid_packet');
  const data = parsePacket(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input.bytes));
  if (!Array.isArray(data) || data.length > LIMITS.pairs) throw new Error('invalid_catalog');
  const pools = data.map(p => pool(p, input.mint));
  const seen = new Set<string>();
  for (const p of pools) { if (seen.has(p.pairAddress)) throw new Error('duplicate_pool'); seen.add(p.pairAddress); }
  // Never substitute a quote-side pool's base-token figures or select across an exact quote pin.
  const eligible = pools.filter(p => p.base.mint === input.mint && (!input.quoteMint || p.quote.mint === input.quoteMint));
  eligible.sort((a, b) => {
    if (a.liquidityUsd === null && b.liquidityUsd !== null) return 1;
    if (b.liquidityUsd === null && a.liquidityUsd !== null) return -1;
    const delta = (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0);
    return delta || (a.pairAddress < b.pairAddress ? -1 : a.pairAddress > b.pairAddress ? 1 : 0);
  });
  const baseMatches = pools.filter(p => p.base.mint === input.mint).length;
  const quoteMatches = pools.filter(p => p.quote.mint === input.mint).length;
  const snapshot: Snapshot = {
    schemaVersion: 1, requestedMint: input.mint, requestedQuoteMint: input.quoteMint ?? null,
    source: { provider: 'dexscreener', endpoint: endpointFor(input.mint),
      responseSha256: createHash('sha256').update(input.bytes).digest('hex'),
      clock: { requestStartedAt: new Date(input.requestStartedMs).toISOString(), retrievedAt: new Date(input.retrievedMs).toISOString(),
        providerObservedAt: null, underlyingTradeAt: null, windowEndAt: null, semantic: 'retrieval_only_market_time_unknown' },
      assurance: 'provider_report_not_onchain_verified' },
    scope: { kind: 'bounded_returned_pools', complete: false, returned: pools.length, baseMatches, quoteMatches, eligibleBasePools: eligible.length },
    pools, selectedPool: eligible[0] ?? null,
    identity: eligible.length ? 'base_match' : baseMatches ? 'no_eligible_base_pool' : quoteMatches ? 'quote_side_only' : 'no_returned_pools',
  };
  deepFreeze(snapshot); validated.add(snapshot); return snapshot as ValidatedSnapshot;
}
