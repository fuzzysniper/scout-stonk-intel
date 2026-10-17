const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Exact original string only. No trimming, case folding, ticker or URL aliases. */
export function isExactSolanaMint(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return false;
  let n = 0n;
  for (const c of value) {
    const digit = BASE58.indexOf(c);
    if (digit < 0) return false;
    n = n * 58n + BigInt(digit);
  }
  let bytes = 0;
  while (n > 0n) { bytes++; n >>= 8n; }
  for (const c of value) { if (c !== "1") break; bytes++; }
  return bytes === 32;
}

/** Validate UTC calendar and retain microseconds for comparisons, never rewrite receipts. */
export function utcMicros(value: unknown): bigint | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/.exec(value);
  if (!m) return null;
  const canonical = `${m[1]}.000Z`;
  const ms = Date.parse(canonical);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== canonical) return null;
  return BigInt(ms) * 1000n + BigInt((m[2] ?? "").padEnd(6, "0"));
}

export function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
