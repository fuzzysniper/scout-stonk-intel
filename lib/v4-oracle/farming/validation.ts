import { isSolanaMint } from '../../solana';
import type { Evidence, Observation, Transaction, Window } from './contract';

export const MAX_RECORDS = 512;
export const MAX_AGE_MS = 120_000;
const U64 = (1n << 64n) - 1n;
const HASH = /^[a-f0-9]{64}$/;
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function need(ok: unknown, reason: string): asserts ok { if (!ok) throw new Error(reason); }
export function obj(v: unknown, required: readonly string[], optional: readonly string[] = []): asserts v is Record<string, unknown> {
  need(v !== null && typeof v === 'object' && !Array.isArray(v), 'invalid_record');
  const r = v as Record<string, unknown>;
  need(required.every(k => Object.hasOwn(r, k)) && Object.keys(r).every(k => required.includes(k) || optional.includes(k)), 'invalid_fields');
}
/** Reject accessors, exotic prototypes, cycles, non-JSON values and excessive work before reading fields. */
export function plain(v: unknown): void {
  const seen = new Set<object>(); let nodes = 0, chars = 0;
  const visit = (x: unknown, depth: number): void => {
    need(++nodes <= 40_000 && depth <= 16, 'input_budget');
    if (typeof x === 'string') { chars += x.length; need(chars <= 1_000_000 && x.length <= 1024, 'input_budget'); return; }
    if (x === null || typeof x === 'boolean' || typeof x === 'number' && Number.isFinite(x)) return;
    need(typeof x === 'object' && x !== null && !seen.has(x), 'non_json_input');
    const o = x as object; seen.add(o);
    need(Array.isArray(x) ? x.length <= MAX_RECORDS : [Object.prototype, null].includes(Object.getPrototypeOf(x)), 'non_json_input');
    const props = Object.getOwnPropertyDescriptors(o);
    need(Reflect.ownKeys(o).every(k => typeof k === 'string'), 'non_json_input');
    for (const [key, p] of Object.entries(props)) {
      if (Array.isArray(x) && key === 'length') continue;
      need(p.enumerable && 'value' in p && key.length <= 100, 'non_json_input'); visit(p.value, depth + 1);
    }
    if (Array.isArray(x)) need(Object.keys(props).length === x.length + 1, 'sparse_array');
    seen.delete(o);
  };
  visit(v, 0);
}
export function address(v: unknown): asserts v is string { need(typeof v === 'string' && v === v.trim() && isSolanaMint(v), 'invalid_address'); }
export function slot(v: unknown): asserts v is number { need(Number.isSafeInteger(v) && Number(v) > 0, 'invalid_slot'); }
export function decimals(v: unknown): asserts v is number { need(Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 18, 'unsupported_decimals'); }
export function clock(v: unknown): number {
  need(typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v), 'invalid_clock');
  const t = Date.parse(v); need(Number.isSafeInteger(t) && t >= 0 && new Date(t).toISOString() === v, 'invalid_clock'); return t;
}
export function raw(v: unknown): bigint { need(typeof v === 'string' && /^(0|[1-9]\d{0,19})$/.test(v), 'invalid_raw'); const n = BigInt(v); need(n <= U64, 'raw_overflow'); return n; }
export function list<T>(v: readonly T[], min = 0): void { need(Array.isArray(v) && v.length >= min && v.length <= MAX_RECORDS, 'record_budget'); }
export function unique(v: readonly string[]): void { need(new Set(v).size === v.length, 'duplicate_record'); }
export function evidence(e: Evidence, asOf: number, fresh = false): void {
  obj(e, ['provider','captureKind','network','commitment','responseSha256','fieldPath','clockKind','sourceAt','receivedAt','contextSlot','rights']);
  need(['solana_rpc','helius_indexer'].includes(e.provider) && ['synthetic_fixture','recorded_response','native_https'].includes(e.captureKind), 'unsupported_source');
  need(e.network === 'solana-mainnet-beta' && e.commitment === 'finalized', 'unfinalized_source');
  need(typeof e.responseSha256 === 'string' && HASH.test(e.responseSha256), 'missing_hash');
  need(typeof e.fieldPath === 'string' && /^\$(?:\.[A-Za-z0-9_]+|\[\d{1,6}\]){1,16}$/.test(e.fieldPath) && e.fieldPath.length <= 128, 'invalid_path');
  obj(e.rights, ['analysis','reviewSha256']);
  need(e.rights.analysis === 'approved_private' && typeof e.rights.reviewSha256 === 'string' && HASH.test(e.rights.reviewSha256), 'rights_hold');
  need(['provider_as_of','finalized_block_time'].includes(e.clockKind), 'unknown_source_clock');
  slot(e.contextSlot); const source = clock(e.sourceAt), received = clock(e.receivedAt);
  need(source <= received && received <= asOf, 'source_clock_order');
  if (fresh) need(asOf - source <= MAX_AGE_MS && received - source <= MAX_AGE_MS, 'stale_source');
}
export function observation<T>(o: Observation<T>, mint: string, asOf: number): void {
  obj(o, ['mint','evidence','window','data']); need(o.mint === mint, 'mint_mismatch');
  evidence(o.evidence, asOf, true); const w = o.window;
  obj(w, ['from','to','firstSlot','lastSlot','status']);
  need(w.status === 'complete', 'incomplete_coverage'); slot(w.firstSlot); slot(w.lastSlot);
  const from = clock(w.from), to = clock(w.to);
  need(from <= to && to <= clock(o.evidence.sourceAt) && clock(o.evidence.sourceAt) - to <= MAX_AGE_MS && to - from <= 86_400_000, 'invalid_window');
  need(w.firstSlot <= w.lastSlot && w.lastSlot <= o.evidence.contextSlot, 'slot_order');
}
export function transaction(t: Transaction, w: Window, asOf: number, signatures: Set<string>, captureKind: Evidence['captureKind']): void {
  need(t.status === 'succeeded', 'failed_or_unknown_transaction');
  need(typeof t.signature === 'string' && t.signature.length >= 64 && t.signature.length <= 88 && [...t.signature].every(c => ALPHABET.includes(c)), 'invalid_signature');
  let n = 0n; for (const c of t.signature) n = n * 58n + BigInt(ALPHABET.indexOf(c));
  let size = 0; for (let b = n; b > 0n; b >>= 8n) size++;
  for (const c of t.signature) { if (c !== '1') break; size++; } need(size === 64, 'invalid_signature');
  need(Number.isSafeInteger(t.instructionIndex) && t.instructionIndex >= 0 && t.instructionIndex <= 255, 'invalid_instruction');
  const id = `${t.signature}:${t.instructionIndex}`; need(!signatures.has(id), 'duplicate_transaction'); signatures.add(id);
  slot(t.slot); evidence(t.evidence, asOf);
  need(t.evidence.captureKind === captureKind, 'mixed_capture_kind');
  const time = clock(t.blockTime);
  need(t.slot >= w.firstSlot && t.slot <= w.lastSlot && t.slot <= t.evidence.contextSlot, 'transaction_slot');
  need(time >= clock(w.from) && time <= clock(w.to) && time <= clock(t.evidence.sourceAt), 'transaction_clock');
}
export function snapshot(e: Evidence, o: Observation<unknown>, asOf: number, at: 'from' | 'to'): void {
  evidence(e, asOf); need(e.captureKind === o.evidence.captureKind, 'mixed_capture_kind');
  need(e.sourceAt === o.window[at] && e.contextSlot === o.window[at === 'from' ? 'firstSlot' : 'lastSlot'], 'snapshot_boundary');
}
