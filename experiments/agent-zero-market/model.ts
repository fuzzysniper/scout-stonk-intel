import { createHash } from 'node:crypto';
import { freeze, isExactSolanaMint, utcMicros } from '../consumer-mvp/evidence/guards';
export { freeze };
export const WSOL = 'So11111111111111111111111111111111111111112';
export const MINUTE = 60_000_000n;
export const LIMITS = Object.freeze({ bytes: 262144, barsPerCapture: 32, captures: 2048, rows: 12000, aggregateBytes: 16 * 1024 * 1024, subjects: 6 });
export const POLICY = Object.freeze({ version: 'offline-awareness/1', checkpointOffsetUs: 1_810_000_000n, lookbackMinutes: 20, referenceDelayUs: MINUTE, horizonMinutes: 10, frontierMaxAgeUs: 90_000_000n, maxReportedPoolAgeUs: 3_600_000_000n });
export function record(x: unknown): Record<string, unknown> { if (!x || typeof x !== 'object' || Array.isArray(x)) throw Error('object_required'); return x as Record<string, unknown>; }
export function keys(x: Record<string, unknown>, expected: readonly string[]) { if (Object.keys(x).length !== expected.length || expected.some(k => !Object.hasOwn(x, k))) throw Error('unexpected_fields'); }
export function text(x: unknown, max = 200): string { if (typeof x !== 'string' || !x.trim() || x.length > max || /[\p{Cc}\p{Cs}]/u.test(x)) throw Error('invalid_text'); return x; }
export function mint(x: unknown): string { if (!isExactSolanaMint(x)) throw Error('exact_mint_required'); return x; }
export function time(x: unknown): string { if (typeof x !== 'string' || utcMicros(x) === null) throw Error('invalid_utc'); return x; }
export const micros = (x: string) => utcMicros(time(x))!;
export const floor = (x: bigint, step: bigint) => x - ((x % step + step) % step);
export const iso = (x: bigint) => { const base = floor(x, 1000n), tail = x - base, stamp = new Date(Number(base / 1000n)).toISOString(); return tail === 0n ? stamp : stamp.slice(0, -1) + tail.toString().padStart(3, '0') + 'Z'; };
export const hash = (x: string | Uint8Array) => createHash('sha256').update(x).digest('hex');
export function canonical(x: unknown): string {
 if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
 if (typeof x === 'number' && Number.isSafeInteger(x)) return String(x);
 if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
 if (x && typeof x === 'object') return '{' + Object.entries(x).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
 throw Error('unsupported_json');
}
export type Decimal = Readonly<{ original: string; coefficient: string; scale: number }>;
export function decimal(x: unknown): Decimal {
 if (typeof x !== 'string' || !/^(0|[1-9]\d{0,29})(?:\.\d{1,18})?$/.test(x)) throw Error('exact_decimal_string_required');
 const [a, b = ''] = x.split('.'); return freeze({ original: x, coefficient: BigInt(a + b).toString(), scale: b.length });
}
export const units = (x: Decimal, scale = 18) => BigInt(x.coefficient) * 10n ** BigInt(scale - x.scale);
export const compare = (a: Decimal, b: Decimal) => units(a) < units(b) ? -1 : units(a) > units(b) ? 1 : 0;
export type Identity = Readonly<{ network: 'solana-mainnet'; tokenMint: string; baseMint: string; quoteMint: typeof WSOL; pool: string; baseDecimals: number; quoteDecimals: 9 }>;
export function identity(raw: unknown): Identity {
 const x = record(raw); keys(x, ['network', 'tokenMint', 'baseMint', 'quoteMint', 'pool', 'baseDecimals', 'quoteDecimals']);
 const tokenMint = mint(x.tokenMint), baseMint = mint(x.baseMint), pool = mint(x.pool);
 if (x.network !== 'solana-mainnet' || tokenMint !== baseMint || x.quoteMint !== WSOL || tokenMint === WSOL || pool === tokenMint || pool === WSOL || x.quoteDecimals !== 9 || !Number.isInteger(x.baseDecimals) || Number(x.baseDecimals) < 0 || Number(x.baseDecimals) > 255) throw Error('identity_or_quote_mismatch');
 return freeze({ network: 'solana-mainnet', tokenMint, baseMint, quoteMint: WSOL, pool, baseDecimals: x.baseDecimals as number, quoteDecimals: 9 });
}
export type Bar = Readonly<{ start: string; end: string; complete: boolean; containsTrades: boolean | 'unknown'; open: Decimal | null; high: Decimal | null; low: Decimal | null; close: Decimal | null; baseVolume: Decimal | null; quoteVolume: Decimal | null; contentHash: string }>;
export type Capture = Readonly<{ identity: Identity; assurance: 'SYNTHETIC_OFFLINE'; label: string; source: { id: string; clock: 'fixture_defined' | 'unverified'; latency: 'fixture_bounded' | 'unknown'; generatedAt: string | null }; requestedAt: string; receivedAt: string; availableAt: string; poolCreatedAt: string | null; bars: readonly Bar[]; packetHash: string; bytes: number }>;
export type Subject = Readonly<{ identity: Identity; disposition: 'observe' | 'reject'; reason: string }>;
export type Plan = Readonly<{ version: 'offline-cohort/1'; assurance: 'SYNTHETIC_OFFLINE'; label: string; registeredAt: string; subjects: readonly Subject[] }>;
export function plan(raw: unknown): Plan {
 const p = record(raw); keys(p, ['version', 'assurance', 'label', 'registeredAt', 'subjects']);
 if (p.version !== 'offline-cohort/1' || p.assurance !== 'SYNTHETIC_OFFLINE' || !Array.isArray(p.subjects) || !p.subjects.length || p.subjects.length > LIMITS.subjects) throw Error('synthetic_plan_required');
 const seen = new Set<string>(); const subjects = p.subjects.map(raw => {
  const s = record(raw); keys(s, ['identity', 'disposition', 'reason']); const id = identity(s.identity);
  if (seen.has(id.tokenMint) || typeof s.disposition !== 'string' || !['observe', 'reject'].includes(s.disposition)) throw Error('duplicate_candidate_or_disposition'); seen.add(id.tokenMint);
  return { identity: id, disposition: s.disposition as Subject['disposition'], reason: text(s.reason, 600) };
 });
 return freeze({ version: 'offline-cohort/1', assurance: 'SYNTHETIC_OFFLINE', label: text(p.label), registeredAt: time(p.registeredAt), subjects });
}
