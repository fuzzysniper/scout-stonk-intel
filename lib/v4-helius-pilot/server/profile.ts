import "server-only";
import { createHash } from "node:crypto";
import { isExactPublicKey } from "../../onchain-mint/validation";
import type { PilotProfile } from "./contract";
import { BOUNDS } from "./policy";
export const time = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 253402300799999;
export function data(value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return false;
  return required.every(k => Object.hasOwn(value, k)) && Reflect.ownKeys(value).every(k => typeof k === "string" && [...required, ...optional].includes(k) && "value" in Object.getOwnPropertyDescriptor(value, k)!);
}
export function prepareProfile(input: unknown): { profile: PilotProfile; hash: string } | null {
  if (!data(input, ["id", "origin", "ownerSubject", "identityIssuer", "startsAt", "expiresAt", "mints", "creditsPerAttempt", "maxCredits"])) return null;
  for (const k of ["id", "ownerSubject", "identityIssuer"]) if (typeof input[k] !== "string" || !/^[A-Za-z0-9:_-]{8,128}$/.test(input[k] as string)) return null;
  if (typeof input.origin !== "string" || input.origin.length > 200) return null;
  try { const u = new URL(input.origin); if (u.protocol !== "https:" || u.origin !== input.origin || u.username || u.password || u.port) return null; } catch { return null; }
  if (!time(input.startsAt) || !time(input.expiresAt) || input.expiresAt <= input.startsAt || input.expiresAt - input.startsAt > BOUNDS.windowMs) return null;
  if (!Array.isArray(input.mints) || input.mints.length !== BOUNDS.mints || !input.mints.every(isExactPublicKey) || new Set(input.mints).size !== BOUNDS.mints) return null;
  if (!Number.isSafeInteger(input.creditsPerAttempt) || (input.creditsPerAttempt as number) < 1 || (input.creditsPerAttempt as number) > 1000000
    || !Number.isSafeInteger(input.maxCredits) || (input.maxCredits as number) < (input.creditsPerAttempt as number) || (input.maxCredits as number) > BOUNDS.attempts * (input.creditsPerAttempt as number)) return null;
  const profile: PilotProfile = Object.freeze({ id: input.id as string, origin: input.origin, ownerSubject: input.ownerSubject as string,
    identityIssuer: input.identityIssuer as string, startsAt: input.startsAt, expiresAt: input.expiresAt,
    mints: Object.freeze([...input.mints]) as unknown as PilotProfile["mints"], creditsPerAttempt: input.creditsPerAttempt as number, maxCredits: input.maxCredits as number });
  return { profile, hash: createHash("sha256").update(JSON.stringify(profile)).digest("hex") };
}
