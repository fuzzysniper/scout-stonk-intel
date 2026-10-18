const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function isExactPublicKey(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return false;
  let n = 0n;
  for (const c of value) { const digit = BASE58.indexOf(c); if (digit < 0) return false; n = n * 58n + BigInt(digit); }
  let bytes = 0; while (n > 0n) { bytes++; n >>= 8n; }
  for (const c of value) { if (c !== "1") break; bytes++; }
  return bytes === 32;
}
export function utcMicros(value: unknown): bigint | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/.exec(value);
  if (!m) return null;
  const canonical = `${m[1]}.000Z`, ms = Date.parse(canonical);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== canonical) return null;
  return BigInt(ms) * 1000n + BigInt((m[2] ?? "").padEnd(6, "0"));
}
export function freeze<T>(value: T): T {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, "0")).join("");
}

/** Duplicate keys, depth/size explosions and non-finite JSON are rejected before projection. */
export function strictJson(text: string): unknown {
  let pos = 0, nodes = 0;
  const unsignedFields = new Set(["/id", "/result/context/slot", "/result/value/space", "/result/value/lamports", "/result/value/rentEpoch", "/result/value/data/space", "/result/value/data/parsed/info/decimals"]);
  const fail = (): never => { throw new Error("invalid_response"); };
  const space = () => { while (/[\x20\t\r\n]/.test(text[pos] ?? "!")) pos++; };
  function string(): string {
    const start = pos++;
    while (pos < text.length) {
      const c = text[pos++]; if (c === "\\") { pos++; continue; }
      if (c === '"') { try { return JSON.parse(text.slice(start, pos)); } catch { return fail(); } }
    }
    return fail();
  }
  function value(depth: number, path: string): unknown {
    if (depth > 16 || ++nodes > 5000) return fail(); space();
    if (text[pos] === '"') return string();
    if (text[pos] === "{") {
      pos++; space(); const out: Record<string, unknown> = Object.create(null), keys = new Set<string>();
      if (text[pos] === "}") { pos++; return out; }
      while (pos < text.length) {
        space(); if (text[pos] !== '"') return fail(); const key = string();
        if (keys.has(key)) return fail(); keys.add(key); space(); if (text[pos++] !== ":") return fail();
        out[key] = value(depth + 1, path + "/" + key); space(); const separator = text[pos++];
        if (separator === "}") return out; if (separator !== ",") return fail();
      }
      return fail();
    }
    if (text[pos] === "[") {
      pos++; space(); const out: unknown[] = []; if (text[pos] === "]") { pos++; return out; }
      while (pos < text.length) { out.push(value(depth + 1, path + "/[]")); space(); const separator = text[pos++]; if (separator === "]") return out; if (separator !== ",") return fail(); }
      return fail();
    }
    const token = /^(?:null|true|false|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(pos));
    if (!token) return fail();
    // Validate known integer lexemes BEFORE JS rounding can turn a fraction into an integer.
    if (unsignedFields.has(path) && token[0] !== "null" && token[0] !== "true" && token[0] !== "false") {
      if (!/^(?:0|[1-9]\d{0,19})$/.test(token[0]) || BigInt(token[0]) > 18446744073709551615n) return fail();
    }
    pos += token[0].length; const out: unknown = JSON.parse(token[0]);
    if (typeof out === "number" && !Number.isFinite(out)) return fail(); return out;
  }
  const out = value(0, ""); space(); if (pos !== text.length) return fail(); return out;
}
