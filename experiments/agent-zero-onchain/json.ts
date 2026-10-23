import { LIMITS, need } from './policy';
/** Strict bounded RPC JSON: integer tokens become BigInt, strings stay strings.
 * No floating conversion of u64 rentEpoch/lamports/slot. Duplicate keys fail. */
export function rpcJson(bytes: Uint8Array): unknown {
  need(bytes instanceof Uint8Array && bytes.length <= LIMITS.bodyBytes, 'BODY_LIMIT');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  let pos = 0, nodes = 0;
  const ws = () => { while (/[\x20\t\r\n]/.test(text[pos] ?? '!')) pos++; };
  function string(): string {
    const start = pos++;
    while (pos < text.length) { const c = text[pos++]; if (c === '\\') { pos++; continue; } if (c === '"') return JSON.parse(text.slice(start, pos)); }
    throw Error('JSON_STRING');
  }
  function value(depth: number): unknown {
    need(depth <= 16 && ++nodes <= 10_000, 'JSON_LIMIT'); ws();
    if (text[pos] === '"') return string();
    if (text[pos] === '{') {
      pos++; ws(); const out: Record<string, unknown> = Object.create(null);
      if (text[pos] === '}') { pos++; return out; }
      while (pos < text.length) {
        ws(); need(text[pos] === '"', 'JSON_KEY'); const key = string(); need(!Object.hasOwn(out, key), 'DUPLICATE_KEY');
        ws(); need(text[pos++] === ':', 'JSON_COLON'); out[key] = value(depth + 1); ws(); const sep = text[pos++];
        if (sep === '}') return out; need(sep === ',', 'JSON_SEPARATOR');
      }
      throw Error('JSON_OBJECT');
    }
    if (text[pos] === '[') {
      pos++; ws(); const out: unknown[] = []; if (text[pos] === ']') { pos++; return out; }
      while (pos < text.length) { out.push(value(depth + 1)); ws(); const sep = text[pos++]; if (sep === ']') return out; need(sep === ',', 'JSON_SEPARATOR'); }
      throw Error('JSON_ARRAY');
    }
    const token = /^(?:null|true|false|-?(?:0|[1-9]\d*))/.exec(text.slice(pos)); need(token, 'JSON_TOKEN'); pos += token[0].length;
    return token[0] === 'null' ? null : token[0] === 'true' ? true : token[0] === 'false' ? false : BigInt(token[0]);
  }
  const result = value(0); ws(); need(pos === text.length, 'JSON_TRAILING_OR_NONINTEGER'); return result;
}
