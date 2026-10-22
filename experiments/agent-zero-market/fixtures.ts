/** Every token, pool, value and chronology in this file is INVENTED OFFLINE data. */
import { hash, iso, MINUTE, WSOL, type Identity, type Plan } from './model';
import { normalizeSynthetic } from './normalize';
function address(label: string) {
 const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', bytes = Buffer.from(hash('AGENT0 INVENTED ' + label), 'hex');
 let n = BigInt('0x' + bytes.toString('hex')), s = ''; while (n) { s = alphabet[Number(n % 58n)] + s; n /= 58n; }
 for (const b of bytes) { if (b) break; s = '1' + s; } return s;
}
export const IDENTITIES: readonly Identity[] = ['favorable', 'declining', 'rejected-unpriced'].map(label => ({ network: 'solana-mainnet', tokenMint: address(label), baseMint: address(label), pool: address(label + ' pool'), quoteMint: WSOL, baseDecimals: 6, quoteDecimals: 9 }));
const start = BigInt(Date.parse('2026-10-20T10:00:00Z')) * 1000n;
export function packet(id: Identity, minute: number | null) {
 const end = minute === null ? start : start + BigInt(minute + 1) * MINUTE;
 const at = minute === null ? start : end + 2_000_000n;
 const isUnpriced = id.tokenMint === IDENTITIES[2].tokenMint;
 let close = minute !== null && minute >= 20 && minute < 30 ? '1.' + String((minute - 19) * 2).padStart(2, '0') : '1.000000';
 if (minute !== null && minute >= 30) close = '1.200000';
 if (minute !== null && minute >= 32) {
  const rising = ['1.200000', '1.500000', '2.400000', '2.600000', '6.000000', '6.300000', '12.000000', '12.600000', '12.100000', '12.300000', '12.000000'];
  const falling = ['1.200000', '1.100000', '0.900000', '0.800000', '0.700000', '0.500000', '0.400000', '0.300000', '0.250000', '0.200000', '0.100000'];
  close = (id.tokenMint === IDENTITIES[1].tokenMint ? falling : rising)[Math.min(minute - 32, 10)];
 }
 const accelerated = minute !== null && minute >= 20 && minute < 30, quoteCents = accelerated ? 303n + BigInt(minute! - 20) * 3n : null;
 // Invented two-trade bars: 1.5 base at open + 1.5 at close during acceleration.
 // Single-price bars elsewhere have quote volume = base volume * price.
 const quoteVolume = quoteCents === null ? close : (quoteCents / 100n).toString() + '.' + (quoteCents % 100n).toString().padStart(2, '0');
 const bar = minute === null ? null : { start: iso(end - MINUTE), end: iso(end), complete: true, containsTrades: true, open: minute < 30 ? '1.000000' : close, high: minute < 30 ? close : close, low: minute < 30 ? '1.000000' : close, close: isUnpriced && minute === 19 ? null : close, baseVolume: accelerated ? '3.000000' : '1.000000', quoteVolume };
 return { version: 'invented-market-packet/1', assurance: 'SYNTHETIC_OFFLINE', label: 'INVENTED OFFLINE FIXTURE — ' + id.tokenMint, identity: id, source: { id: 'offline:invented-market', clock: isUnpriced ? 'unverified' : 'fixture_defined', latency: isUnpriced ? 'unknown' : 'fixture_bounded', generatedAt: isUnpriced ? null : iso(at) }, requestedAt: iso(at - 500_000n), receivedAt: iso(at), availableAt: iso(at), poolCreatedAt: isUnpriced ? null : '2026-10-20T09:55:00Z', units: { price: 'wSOL_per_whole_base_token', baseVolume: id.baseMint, quoteVolume: WSOL }, bars: bar ? [bar] : [] };
}
export function encode(x: unknown) { return Buffer.from(JSON.stringify(x)); }
export function demoInput() {
 const plan: Plan = { version: 'offline-cohort/1', assurance: 'SYNTHETIC_OFFLINE', label: 'INVENTED OFFLINE COHORT — no real tokens/decisions', registeredAt: '2026-10-20T09:54:00Z', subjects: IDENTITIES.map((identity, index) => ({ identity, disposition: index === 2 ? 'reject' : 'observe', reason: index === 2 ? 'Invented rejection control: source clock, age and prices unknown.' : 'Invented observation only. Controls/depth/costs/holders are NOT OBSERVED; WAIT.' })) };
 const captures = IDENTITIES.flatMap((id, index) => [normalizeSynthetic(encode(packet(id, null)), id), ...Array.from({ length: 43 }, (_, minute) => minute).filter(m => index !== 2 || ![18, 39, 40, 41, 42].includes(m)).map(minute => normalizeSynthetic(encode(packet(id, minute)), id))]);
 return { plan, captures, asOf: '2026-10-20T10:44:00Z' };
}
