import "server-only";
import { prepareIsolatedHeliusTarget, type IsolatedHeliusTarget } from "./helius";
import { demand } from "./rpc";
import { PRODUCTION_RPC_ENABLED } from "./policy";
import { USDC_CANARY } from "./canary-policy";
import type { RequiredChannelBindingClient } from "./required-channel-binding";
export const PRODUCTION_PROFILE = Object.freeze({ policy: "scout-helius-mint/production-v1", acquisition: "production_rpc" as const, leaseMs: 15000, storeTimeoutMs: 2000 });
/** CODE REVIEW GATE: credentials, env/query flags or redeployment cannot enable this object. */
export const LIVE_APPROVAL: Readonly<{ enabled: boolean; storeHost: string | null; vercelProjectId: string | null }> = Object.freeze({
  enabled: PRODUCTION_RPC_ENABLED,
  storeHost: "ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech",
  vercelProjectId: "prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q",
});
export const CANARY_PROFILE = Object.freeze({ ...PRODUCTION_PROFILE, canary: USDC_CANARY });
export type SecretReader = (name: string) => string | undefined;
export type ProductionConfig = Readonly<{ target: IsolatedHeliusTarget; hmacKey: string; database: DatabaseHandle }>;
export type DatabaseHandle = Readonly<{ host: string; provider: "neon-postgres" }>;
type DatabaseFields = Readonly<{ host: string; user: string; password: string; database: string }>;
const databaseSecrets = new WeakMap<object, DatabaseFields>();
const requiredBinding = new WeakSet<object>();
const REQUIRED_BINDING_SEARCH = ["?channel_binding=require", "?sslmode=require&channel_binding=require", "?channel_binding=require&sslmode=require"];
/** Pure, private shared validation. Never opens a connection or returns a URL to a caller. */
function databaseFields(value: unknown, pinnedHost: string, identity?: Readonly<{ role: string; database: string }>):
  Readonly<{ secret: DatabaseFields; search: string }> | null {
  // Neon also uses a c-N routing label, e.g. ep-example.c-7.us-east-2.aws.neon.tech.
  // This validates only provider syntax; the complete host must still equal the reviewed pin.
  if (!/^ep-[a-z0-9-]+\.(?:c-[0-9]+\.)?[a-z0-9-]+\.(?:aws|azure)\.neon\.tech$/.test(pinnedHost) || pinnedHost.includes('-ro.')) return null;
  if (typeof value !== "string" || value.length > 2048 || /[\x00-\x20\x7f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "postgresql:" || url.hostname !== pinnedHost || url.port && url.port !== "5432" || url.hash) return null;
    const user = decodeURIComponent(url.username), password = decodeURIComponent(url.password), database = decodeURIComponent(url.pathname.slice(1));
    if (!/^scout_[a-z0-9_]{1,48}$/.test(user) || password.length < 16 || password.length > 256 || /[\x00-\x1f\x7f]/.test(password) || !/^[a-zA-Z0-9_]{1,63}$/.test(database)) return null;
    if (identity && (user !== identity.role || database !== identity.database)) return null;
    return { secret: { host: pinnedHost, user, password, database }, search: url.search };
  } catch { return null; }
}
/** Explicit fields avoid pg connection-string sslmode overrides and ambient PG* credential fallback.
 * Required binding is retained out of band, never stripped into a preference-only pg config.
 */
export function prepareDatabase(value: unknown, pinnedHost: string, identity?: Readonly<{ role: string; database: string }>): DatabaseHandle | null {
  const parsed=databaseFields(value,pinnedHost,identity);
  if(!parsed || parsed.search && parsed.search!=="?sslmode=require" && !REQUIRED_BINDING_SEARCH.includes(parsed.search))return null;
  const handle=Object.freeze({host:pinnedHost,provider:"neon-postgres" as const});
  if(REQUIRED_BINDING_SEARCH.includes(parsed.search))requiredBinding.add(handle);
  databaseSecrets.set(handle,Object.freeze(parsed.secret));return handle;
}
export type DatabaseCompatibility = "dsn_missing" | "dsn_invalid_or_unapproved" |
  "format_compatible_binding_unproven" | "blocked_required_channel_binding";
/** Configuration classification ONLY. No credential handle, rewritten DSN, fingerprint or secret output.
 * No category proves authentication, negotiated binding, TLS connectivity or authorization for traffic.
 */
export function databaseCompatibility(value: unknown, pinnedHost: string, identity: Readonly<{role:string;database:string}>): DatabaseCompatibility {
  if(value===undefined || value==="")return "dsn_missing";
  const parsed=databaseFields(value,pinnedHost,identity);
  if(!parsed)return "dsn_invalid_or_unapproved";
  if(!parsed.search || parsed.search==="?sslmode=require")return "format_compatible_binding_unproven";
  // Preserve #138's conservative categorical protocol: a format-only preflight cannot
  // clear this requirement. The separately reviewed strict adapter still needs hosted proof.
  if(REQUIRED_BINDING_SEARCH.includes(parsed.search))
    return "blocked_required_channel_binding";
  return "dsn_invalid_or_unapproved";
}
export function databaseParameters(handle: DatabaseHandle, strictClient?: typeof RequiredChannelBindingClient) {
  const secret = databaseSecrets.get(handle); demand(secret, "access_denied");
  // A caller cannot accidentally pass a required DSN to vanilla pg's preference-only client.
  demand(!requiredBinding.has(handle) || strictClient, "upstream_unavailable");
  return { ...secret, port: 5432, ssl: { rejectUnauthorized: true, servername: secret.host, minVersion: "TLSv1.2" as const }, enableChannelBinding: true,
    ...(requiredBinding.has(handle) ? { Client: strictClient } : {}),
    max: 1, idleTimeoutMillis: 10000, connectionTimeoutMillis: 1000, query_timeout: 1000, statement_timeout: 500,
    lock_timeout: 100, idle_in_transaction_session_timeout: 1000, client_encoding: "UTF8", sslnegotiation: "postgres" as const,
    options: "-c synchronous_commit=on",
    application_name: "scout_mint", allowExitOnIdle: true };
}
/** Called ONLY after code approval + hosting identity validation. Never falls back to old bot names. */
export function loadProductionConfig(read: SecretReader, storeHost: string): ProductionConfig {
  const target = prepareIsolatedHeliusTarget(read("SCOUT_MINT_HELIUS_API_KEY"));
  const hmacKey = read("SCOUT_MINT_ADMISSION_HMAC_KEY"), database = prepareDatabase(read("SCOUT_MINT_STORE_DATABASE_URL"), storeHost, USDC_CANARY);
  demand(target && hmacKey && /^[A-Za-z0-9_-]{32,128}$/.test(hmacKey) && database, "access_denied");
  // Secret is available only to server construction, never enumerable in logs/JSON/spreads.
  return Object.freeze(Object.defineProperty({ target, database }, "hmacKey", { value: hmacKey })) as ProductionConfig;
}
