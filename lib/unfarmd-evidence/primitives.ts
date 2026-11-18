import type { Reference, ValidationIssue, ValidationResult } from "./contract";
export class Invalid extends Error {
  constructor(readonly path: string, readonly code: string) { super(code); }
}
export function fail(path: string, code: string): never { throw new Invalid(path, code); }
export function attempt<T>(fn: () => T): ValidationResult<T> {
  try { return { ok: true, value: fn() }; }
  catch (error) {
    const issue: ValidationIssue = error instanceof Invalid ? { path: error.path, code: error.code } : { path: "$", code: "invalid_input" };
    return { ok: false, issues: [issue] };
  }
}
export function object(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "expected_object");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !keys.includes(key))) fail(path, "unexpected_field");
  return record;
}
export function text(value: unknown, path: string, max = 280): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) fail(path, "invalid_text");
  if (/[a-z][a-z0-9+.-]*:\/\/|\b(?:bearer\s+\S+|(?:api[_-]?key|password|secret|authorization|access_token)\s*[:=])/i.test(value)) fail(path, "credential_or_url_not_allowed");
  return value;
}
export function token(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/.test(value)) fail(path, "invalid_identifier");
  return value;
}
export function enumeration<T extends string>(value: unknown, path: string, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T)) fail(path, "unsupported_value");
  return value as T;
}
export function array<T>(value: unknown, path: string, read: (v: unknown, p: string) => T, max = 100): T[] {
  if (!Array.isArray(value) || value.length > max) fail(path, "invalid_array");
  return value.map((v, i) => read(v, `${path}[${i}]`));
}
export function unique<T>(items: T[], path: string): T[] {
  if (new Set(items).size !== items.length) fail(path, "duplicate");
  return items;
}
export function age(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 604800) fail(path, "invalid_freshness_bound");
  return value as number;
}
/** Strict UTC, real calendar dates, nanosecond ordering. No ambient clock or normalization. */
export function clock(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^(?:19[7-9][0-9]|[2-9][0-9]{3})-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(value)) fail(path, "invalid_clock");
  const base = value.slice(0, 19);
  const ms = Date.parse(`${base}Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) !== base) fail(path, "invalid_clock");
  return value;
}
export function nanos(time: string): bigint {
  return BigInt(Date.parse(`${time.slice(0, 19)}Z`)) * 1000000n + BigInt((time.split(".")[1]?.slice(0, -1) ?? "").padEnd(9, "0"));
}
export function optionalClock(value: unknown, path: string): string | null { return value === null ? null : clock(value, path); }
export function reference(value: unknown, path: string): Reference | null {
  if (value === null) return null;
  const r = object(value, path, ["id", "sha256"]);
  const id = r.id === null ? null : token(r.id, `${path}.id`);
  const hash = r.sha256;
  if (hash !== null && (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))) fail(path, "invalid_sha256");
  if (!id && !hash) fail(path, "empty_reference");
  return { id, sha256: hash as string | null };
}
