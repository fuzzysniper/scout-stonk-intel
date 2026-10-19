import "server-only";
import { prepareIsolatedHeliusTarget, type IsolatedHeliusTarget } from "./helius";
import { demand } from "./rpc";
import { PRODUCTION_RPC_ENABLED } from "./policy";
export const PRODUCTION_PROFILE = Object.freeze({ policy: "scout-helius-mint/production-v1", acquisition: "production_rpc" as const, leaseMs: 15000, storeTimeoutMs: 2000 });
/** CODE REVIEW GATE: credentials, env/query flags or redeployment cannot enable this object. */
export const LIVE_APPROVAL: Readonly<{ enabled: boolean; storeHost: string | null; vercelProjectId: string | null }> = Object.freeze({ enabled: PRODUCTION_RPC_ENABLED, storeHost: null, vercelProjectId: null });
export type SecretReader = (name: string) => string | undefined;
export type ProductionConfig = Readonly<{ target: IsolatedHeliusTarget; hmacKey: string; database: DatabaseHandle }>;
export type DatabaseHandle = Readonly<{ host: string; provider: "neon-postgres" }>;
const databaseSecrets = new WeakMap<object, Readonly<{ host: string; user: string; password: string; database: string }>>();
/** Explicit fields avoid pg connection-string sslmode overrides and ambient PG* credential fallback. */
export function prepareDatabase(value: unknown, pinnedHost: string): DatabaseHandle | null {
  // Neon also uses a c-N routing label, e.g. ep-example.c-7.us-east-2.aws.neon.tech.
  // This validates only provider syntax; the complete host must still equal the reviewed pin.
  if (!/^ep-[a-z0-9-]+\.(?:c-[0-9]+\.)?[a-z0-9-]+\.(?:aws|azure)\.neon\.tech$/.test(pinnedHost) || pinnedHost.includes('-ro.')) return null;
  if (typeof value !== "string" || value.length > 2048 || /[\x00-\x20\x7f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "postgresql:" || url.hostname !== pinnedHost || url.port && url.port !== "5432" || url.hash || url.search && url.search !== "?sslmode=require") return null;
    const user = decodeURIComponent(url.username), password = decodeURIComponent(url.password), database = decodeURIComponent(url.pathname.slice(1));
    if (!/^scout_[a-z0-9_]{1,48}$/.test(user) || password.length < 16 || password.length > 256 || /[\x00-\x1f\x7f]/.test(password) || !/^[a-zA-Z0-9_]{1,63}$/.test(database)) return null;
    const handle = Object.freeze({ host: pinnedHost, provider: "neon-postgres" as const });
    databaseSecrets.set(handle, Object.freeze({ host: pinnedHost, user, password, database })); return handle;
  } catch { return null; }
}
export function databaseParameters(handle: DatabaseHandle) {
  const secret = databaseSecrets.get(handle); demand(secret, "access_denied");
  return { ...secret, port: 5432, ssl: { rejectUnauthorized: true, servername: secret.host }, enableChannelBinding: true,
    max: 1, idleTimeoutMillis: 10000, connectionTimeoutMillis: 1000, query_timeout: 1000, statement_timeout: 500,
    lock_timeout: 100, idle_in_transaction_session_timeout: 1000, client_encoding: "UTF8", sslnegotiation: "postgres" as const,
    options: "-c synchronous_commit=on",
    application_name: "scout_mint", allowExitOnIdle: true };
}
/** Called ONLY after code approval + hosting identity validation. Never falls back to old bot names. */
export function loadProductionConfig(read: SecretReader, storeHost: string): ProductionConfig {
  const target = prepareIsolatedHeliusTarget(read("SCOUT_MINT_HELIUS_API_KEY"));
  const hmacKey = read("SCOUT_MINT_ADMISSION_HMAC_KEY"), database = prepareDatabase(read("SCOUT_MINT_STORE_DATABASE_URL"), storeHost);
  demand(target && hmacKey && /^[A-Za-z0-9_-]{32,128}$/.test(hmacKey) && database, "access_denied");
  // Secret is available only to server construction, never enumerable in logs/JSON/spreads.
  return Object.freeze(Object.defineProperty({ target, database }, "hmacKey", { value: hmacKey })) as ProductionConfig;
}
