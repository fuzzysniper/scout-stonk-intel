import { strictJson } from '../consumer-mvp/evidence/strict-json';
import { LIMITS, canonical, compare, decimal, freeze, hash, identity, keys, micros, MINUTE, record, text, time, units, type Bar, type Capture, type Identity } from './model';
const admitted = new WeakSet<object>();
/** Only our invented wire format is admitted. This is NOT a GeckoTerminal decoder. */
export function normalizeSynthetic(bytes: Uint8Array, expected: Identity): Capture {
 identity(expected);
 if (!(bytes instanceof Uint8Array) || bytes.byteLength > LIMITS.bytes) throw Error('packet_size_or_type');
 const p = record(strictJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
 keys(p, ['version', 'assurance', 'label', 'identity', 'source', 'requestedAt', 'receivedAt', 'availableAt', 'poolCreatedAt', 'units', 'bars']);
 if (p.version !== 'invented-market-packet/1' || p.assurance !== 'SYNTHETIC_OFFLINE') throw Error('live_source_disconnected');
 const id = identity(p.identity); if (canonical(id) !== canonical(expected)) throw Error('unexpected_pool_identity');
 const source = record(p.source); keys(source, ['id', 'clock', 'latency', 'generatedAt']);
 if (typeof source.id !== 'string' || !/^offline:invented-[a-z0-9-]{1,80}$/.test(source.id) || typeof source.clock !== 'string' || !['fixture_defined', 'unverified'].includes(source.clock) || typeof source.latency !== 'string' || !['fixture_bounded', 'unknown'].includes(source.latency)) throw Error('synthetic_source_required');
 const requestedAt = time(p.requestedAt), receivedAt = time(p.receivedAt), availableAt = time(p.availableAt), generatedAt = source.generatedAt === null ? null : time(source.generatedAt), poolCreatedAt = p.poolCreatedAt === null ? null : time(p.poolCreatedAt);
 if (micros(requestedAt) > micros(receivedAt) || micros(receivedAt) > micros(availableAt) || (generatedAt && micros(generatedAt) > micros(receivedAt)) || (poolCreatedAt && micros(poolCreatedAt) > micros(receivedAt))) throw Error('invalid_capture_clock');
 const u = record(p.units); keys(u, ['price', 'baseVolume', 'quoteVolume']);
 if (u.price !== 'wSOL_per_whole_base_token' || u.baseVolume !== id.baseMint || u.quoteVolume !== id.quoteMint) throw Error('ambiguous_units');
 if (!Array.isArray(p.bars) || p.bars.length > LIMITS.barsPerCapture) throw Error('bar_limit');
 const seen = new Set<string>();
 const bars = p.bars.map(raw => {
  const b = record(raw); keys(b, ['start', 'end', 'complete', 'containsTrades', 'open', 'high', 'low', 'close', 'baseVolume', 'quoteVolume']);
  const start = time(b.start), end = time(b.end), stamp = micros(start).toString();
  if (micros(start) % MINUTE !== 0n || micros(end) - micros(start) !== MINUTE || typeof b.complete !== 'boolean' || ![true, false, 'unknown'].includes(b.containsTrades as boolean | string)) throw Error('invalid_candle_interval');
  if (micros(start) > micros(receivedAt)) throw Error('future_interval_start');
  if (poolCreatedAt && micros(end) <= micros(poolCreatedAt)) throw Error('bar_precedes_reported_pool');
  if (seen.has(stamp)) throw Error('duplicate_interval_in_packet'); seen.add(stamp);
  if (b.complete && (micros(end) > micros(receivedAt) || generatedAt && micros(end) > micros(generatedAt))) throw Error('future_complete_candle');
  const [open, high, low, close] = ['open', 'high', 'low', 'close'].map(k => b[k] === null ? null : decimal(b[k]));
  if ([open, high, low, close].some(x => x && units(x) === 0n)) throw Error('zero_price_is_not_a_loss');
  if (open && high && low && close && (compare(high, low) < 0 || compare(high, open) < 0 || compare(high, close) < 0 || compare(low, open) > 0 || compare(low, close) > 0)) throw Error('invalid_ohlc_order');
  const baseVolume = b.baseVolume === null ? null : decimal(b.baseVolume), quoteVolume = b.quoteVolume === null ? null : decimal(b.quoteVolume);
  if (b.containsTrades === true && [baseVolume, quoteVolume].some(x => x && units(x) === 0n) || b.containsTrades === false && [baseVolume, quoteVolume].some(x => x && units(x) > 0n)) throw Error('contradictory_trade_volume');
  const body = { start, end, complete: b.complete, containsTrades: b.containsTrades as Bar['containsTrades'], open, high, low, close, baseVolume, quoteVolume };
  return { ...body, contentHash: hash(canonical(body)) };
 });
 bars.sort((a, b) => micros(a.start) < micros(b.start) ? -1 : 1);
 const result: Capture = freeze({ identity: id, assurance: 'SYNTHETIC_OFFLINE', label: text(p.label), source: { id: source.id, clock: source.clock as Capture['source']['clock'], latency: source.latency as Capture['source']['latency'], generatedAt }, requestedAt, receivedAt, availableAt, poolCreatedAt, bars, packetHash: hash(bytes), bytes: bytes.byteLength });
 admitted.add(result); return result;
}
export function assertCapture(x: Capture): void { if (!admitted.has(x)) throw Error('normalized_synthetic_capture_required'); }
