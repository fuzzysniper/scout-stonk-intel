import 'server-only';
import { strictJson } from '../onchain-mint/validation';
/** Validates duplicate keys/depth/nodes first, then preserves every JSON number lexeme BEFORE any calculation.
 * Parallel original tree distinguishes number tokens from numeric strings, objects and null.
 */
export function numericJson(text: string): { value: unknown; lexemes: unknown } {
  if (Buffer.byteLength(text, 'utf8') > 131072) throw Error('invalid_response');
  const value = strictJson(text); let out = '', p = 0;
  while (p < text.length) {
    if (text[p] === '"') {
      const start = p++;
      while (p < text.length) { const c = text[p++]; if (c === '\\') p++; else if (c === '"') break; }
      out += text.slice(start, p);
    } else {
      const n = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(p));
      if (n) { out += JSON.stringify(n[0]); p += n[0].length; } else out += text[p++];
    }
  }
  return { value, lexemes: strictJson(out) };
}
export function decimal(raw: unknown, signed = false): string | null {
  if (typeof raw !== 'string' || raw.length > 100) return null;
  const m = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d{1,2}))?$/.exec(raw);
  if (!m || m[1] && !signed) return null;
  const exp = Number(m[4] ?? '0'); if (Math.abs(exp) > 30) return null;
  let digits = m[2] + (m[3] ?? ''), point = m[2].length + exp;
  if (point <= 0) { digits = '0'.repeat(1 - point) + digits; point = 1; }
  if (point >= digits.length) digits += '0'.repeat(point - digits.length + 1);
  let a = digits.slice(0, point).replace(/^0+(?=\d)/, ''); const b = digits.slice(point).replace(/0+$/, '');
  if (!a) a = '0'; if (a.length > 50 || b.length > 50) return null;
  const d = a + (b ? '.' + b : ''); return m[1] && d !== '0' ? '-' + d : d;
}
export function integer(raw: unknown, max = 9007199254740991n): string | null {
  if (typeof raw !== 'string' || !/^(?:0|[1-9]\d{0,19})$/.test(raw) || BigInt(raw) > max) return null;
  return raw;
}
export function share(buys: string, sells: string): string | null {
  const a = BigInt(buys), d = a + BigInt(sells); if (!d) return null;
  // Explicit 6-decimal truncation, never floating point or a predictive score.
  const q = a * 1000000n / d; return (q / 1000000n).toString() + '.' + (q % 1000000n).toString().padStart(6, '0');
}
