import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { HELIUS_HOST } from "./policy";

const targets = new WeakMap<object, string>();
export type IsolatedHeliusTarget = Readonly<{ provider: "helius"; host: typeof HELIUS_HOST }>;
/** Pure future configuration adapter. Does not read env, connect, validate an account/plan or enable a route. */
export function prepareIsolatedHeliusTarget(scopedKey: unknown): IsolatedHeliusTarget | null {
  if (typeof scopedKey !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(scopedKey)) return null;
  const target = Object.freeze({ provider: "helius" as const, host: HELIUS_HOST });
  targets.set(target, `https://${HELIUS_HOST}/?api-key=${scopedKey}`);
  return target;
}
/** Not re-exported by a public/browser entry. Opaque configuration prevents accidental JSON serialization. */
export function targetUrl(target: IsolatedHeliusTarget): string {
  const url = targets.get(target); if (!url) throw new Error("invalid_helius_configuration"); return url;
}
export function sign(secret: string, value: string): string { return createHmac("sha256", secret).update(value).digest("hex"); }
export function authentic(secret: string, value: string, mac: unknown): boolean {
  return typeof mac === "string" && /^[a-f0-9]{64}$/.test(mac) && timingSafeEqual(Buffer.from(sign(secret, value), "hex"), Buffer.from(mac, "hex"));
}
/** Input MUST come from a separately authenticated hosting identity resolver, never a request header. */
export function privateClientKey(ip: unknown, secret: string): string | null {
  if (typeof ip !== "string" || ip.length > 45 || ip.includes("%")) return null;
  const version = isIP(ip); if (!version) return null;
  let canonical = version === 6 ? new URL(`http://[${ip}]/`).hostname.slice(1, -1) : ip;
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(canonical);
  if (mapped) { const hi = Number.parseInt(mapped[1], 16), lo = Number.parseInt(mapped[2], 16); canonical = [hi >> 8, hi & 255, lo >> 8, lo & 255].join("."); }
  return sign(secret, `scout-mint-client-v1:${canonical}`);
}
