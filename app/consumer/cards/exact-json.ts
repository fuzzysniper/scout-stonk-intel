/** Small strict JSON reader for offline source receipts. Numeric lexemes stay exact. */
class ExactNumber { constructor(readonly lexeme: string) {} }
export const numberLexeme = (value: unknown): string | null => value instanceof ExactNumber ? value.lexeme : null;
export function parseExactJson(body: string): unknown {
  if (body.length > 1024 * 1024) throw Error('receipt_too_large');
  let cursor = 0, nodes = 0;
  const whitespace = () => { while (/[\x20\t\r\n]/.test(body[cursor] ?? '\0')) cursor++; };
  const fail = (): never => { throw Error('invalid_source_json'); };
  function string(): string {
    const start = cursor++;
    while (cursor < body.length) {
      const c = body[cursor++];
      if (c === '\\') { cursor++; continue; }
      if (c === '"') {
        const value: unknown = JSON.parse(body.slice(start, cursor));
        if (typeof value !== 'string' || /\p{Cs}/u.test(value)) return fail();
        return value;
      }
    }
    return fail();
  }
  function value(depth: number): unknown {
    if (depth > 32 || ++nodes > 50000) return fail();
    whitespace(); const c = body[cursor];
    if (c === '"') return string();
    if (c === '{') {
      cursor++; whitespace(); const result: Record<string, unknown> = Object.create(null);
      if (body[cursor] === '}') { cursor++; return result; }
      for (;;) {
        whitespace(); if (body[cursor] !== '"') return fail(); const key = string();
        if (Object.hasOwn(result, key) || ['__proto__', 'prototype', 'constructor'].includes(key)) return fail();
        whitespace(); if (body[cursor++] !== ':') return fail();
        result[key] = value(depth + 1); whitespace();
        const separator = body[cursor++]; if (separator === '}') return result;
        if (separator !== ',') return fail();
      }
    }
    if (c === '[') {
      cursor++; whitespace(); const result: unknown[] = [];
      if (body[cursor] === ']') { cursor++; return result; }
      for (;;) {
        if (result.length >= 4000) return fail(); result.push(value(depth + 1)); whitespace();
        const separator = body[cursor++]; if (separator === ']') return result;
        if (separator !== ',') return fail();
      }
    }
    for (const [token, decoded] of [['true', true], ['false', false], ['null', null]] as const) {
      if (body.startsWith(token, cursor)) { cursor += token.length; return decoded; }
    }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(body.slice(cursor));
    if (!match || match[0].length > 100) return fail();
    cursor += match[0].length; return new ExactNumber(match[0]);
  }
  const result = value(0); whitespace(); if (cursor !== body.length) return fail(); return result;
}
