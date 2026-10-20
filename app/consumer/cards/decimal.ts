/** Bounded exact decimal arithmetic. Never round source values through Number. */
export const DECIMAL_SCALE = 10n ** 18n;
export function decimalAtomic(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,29})(\.\d{1,18})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * DECIMAL_SCALE + BigInt(fraction.padEnd(18, '0'));
}
/** JSON number lexeme -> canonical nonnegative decimal, without changing precision. */
export function canonicalDecimal(raw: string): string | null {
  if (raw.length > 100 || !/^(0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d{1,3})?$/.test(raw)) return null;
  const [mantissa, exponent = '0'] = raw.toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  const shift = Number(exponent);
  if (Math.abs(shift) > 60) return null;
  const digits = whole + fraction, position = whole.length + shift;
  let w: string, f: string;
  if (position <= 0) { w = '0'; f = '0'.repeat(-position) + digits; }
  else if (position >= digits.length) { w = digits + '0'.repeat(position - digits.length); f = ''; }
  else { w = digits.slice(0, position); f = digits.slice(position); }
  w = w.replace(/^0+(?=\d)/, ''); f = f.replace(/0+$/, '');
  const result = w + (f ? '.' + f : '');
  return /^(0|[1-9]\d{0,29})(\.\d{1,60})?$/.test(result) ? result : null;
}
/** Percent scaled to six places, truncated toward zero, only for presentation. */
export const percentRatio = (first: bigint, last: bigint) => (last - first) * 100000000n / first;
export function percentText(value: bigint): string {
  const negative = value < 0n, digits = (negative ? -value : value).toString().padStart(7, '0');
  return (negative ? '-' : '') + digits.slice(0, -6) + '.' + digits.slice(-6);
}
export function compareRatios(aFirst: bigint, aLast: bigint, bFirst: bigint, bLast: bigint): number {
  const left = aLast * bFirst, right = bLast * aFirst;
  return left > right ? 1 : left < right ? -1 : 0;
}
