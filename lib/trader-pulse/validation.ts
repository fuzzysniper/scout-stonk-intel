import { LIMITS } from './contract';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/** Exact case-sensitive 32-byte encoding; no trim, ticker, coercion or Unicode aliases. */
export function isExactMint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return false;
  let n = 0n;
  for (const c of value) { const d = ALPHABET.indexOf(c); if (d < 0) return false; n = n * 58n + BigInt(d); }
  let length = 0;
  while (n > 0n) { length++; n >>= 8n; }
  for (const c of value) { if (c !== '1') break; length++; }
  return length === 32;
}
export function validTime(ms: number): boolean {
  return Number.isSafeInteger(ms) && ms >= 0 && ms <= 8640000000000000;
}
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
/** Independent of the Helius parser. Reject duplicate (including escaped) JSON keys,
 * ambiguous integer lexemes, nonfinite numbers, deep/numerous nodes and trailing data. */
export function parsePacket(text: string): unknown {
  if (Buffer.byteLength(text, 'utf8') > LIMITS.bytes) throw new Error('invalid_packet');
  let pos = 0, nodes = 0;
  const fail = (): never => { throw new Error('invalid_packet'); };
  const space = () => { while (/[\x20\t\r\n]/.test(text[pos] ?? '!')) pos++; };
  function string(): string {
    const start = pos++;
    while (pos < text.length) {
      const c = text[pos++];
      if (c === '\\') { pos++; continue; }
      if (c === '"') { try { return JSON.parse(text.slice(start, pos)); } catch { return fail(); } }
    }
    return fail();
  }
  function value(depth: number, key = ''): unknown {
    if (depth > 12 || ++nodes > 12000) return fail();
    space();
    if (text[pos] === '"') return string();
    if (text[pos] === '{') {
      pos++; space(); const out: Record<string, unknown> = Object.create(null), keys = new Set<string>();
      if (text[pos] === '}') { pos++; return out; }
      while (pos < text.length) {
        space(); if (text[pos] !== '"') return fail(); const name = string();
        if (keys.has(name)) return fail(); keys.add(name); space();
        if (text[pos++] !== ':') return fail(); out[name] = value(depth + 1, name); space();
        const separator = text[pos++]; if (separator === '}') return out; if (separator !== ',') return fail();
      }
      return fail();
    }
    if (text[pos] === '[') {
      pos++; space(); const out: unknown[] = []; if (text[pos] === ']') { pos++; return out; }
      while (pos < text.length) {
        out.push(value(depth + 1)); space(); const separator = text[pos++];
        if (separator === ']') return out; if (separator !== ',') return fail();
      }
      return fail();
    }
    const token = /^(?:null|true|false|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(pos));
    if (!token) return fail();
    const out: unknown = JSON.parse(token[0]);
    if (typeof out === 'number') {
      if (!Number.isFinite(out) || Object.is(out, -0)) return fail();
      if (['buys', 'sells', 'pairCreatedAt'].includes(key) &&
        (!/^(?:0|[1-9]\d*)$/.test(token[0]) || !Number.isSafeInteger(out))) return fail();
    }
    pos += token[0].length; return out;
  }
  const out = value(0); space(); if (pos !== text.length) return fail(); return out;
}
