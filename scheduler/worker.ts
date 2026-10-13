/** INACTIVE adapter. No public fetch handler or deployment manifest is supplied.
 * Activation and GitHub-side claim-before-collect wiring require human review.
 * The singleton Durable Object is the sole coordinator; no KV/in-memory lock.
 */
export const TARGET = "fuzzysniper/scout-stonk-intel|reward-snapshots.yml|main";
const API = "https://api.github.com";
const REPO = "/repos/fuzzysniper/scout-stonk-intel";
const WINDOW = 15 * 60_000;
const RETENTION = 8 * 24 * 60 * 60_000;
type Scalar = string | number | null;
interface Sql {
  exec<T extends Record<string, Scalar> = Record<string, Scalar>>(query: string, ...bindings: Scalar[]): Iterable<T>;
}
interface Storage {
  sql: Sql;
  transactionSync<T>(fn: () => T): T;
  setAlarm(time: number): Promise<void>;
}
interface State { storage: Storage }
interface Namespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}
export interface Env {
  SLOTS: Namespace;
  ACTIVATION?: string;
  APP_ID?: string;
  INSTALLATION_ID?: string;
  REPOSITORY_ID?: string;
  APP_PRIVATE_KEY?: string;
}
type Row = {
  slot: string; scheduled: number; state: string; nonce: string; attempt: number;
  claimed: number; updated: number; retry: number | null; run_id: number | null;
};
type Outcome = { state: "accepted" | "uncertain" | "denied" | "retry_wait"; run?: number; retry?: number; pause?: boolean;
  reason: "auth_or_scope_rejected" | "deadline_exceeded" | "accepted_with_run_id" | "accepted_without_run_id" | "dispatch_rate_rejected" | "dispatch_rejected" | "dispatch_response_ambiguous" };
function json(value: unknown, status = 200) { return Response.json(value, { status }); }
function id(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
function configuredId(value: string | undefined): number {
  if (!value || !/^[1-9]\d{0,15}$/.test(value) || !id(Number(value))) throw new Error("configuration_rejected");
  return Number(value);
}
export function slotKey(time: number): string {
  if (!Number.isSafeInteger(time)) throw new Error("invalid_slot");
  const date = new Date(time);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 || date.getUTCMinutes() !== 17 || date.getUTCSeconds() || date.getUTCMilliseconds()) throw new Error("invalid_slot");
  return `${TARGET}|${date.toISOString().replace(".000Z", "Z")}`;
}
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
export async function appJwt(pem: string, appId: number, now: number): Promise<string> {
  if (!id(appId) || !Number.isSafeInteger(now)) throw new Error("configuration_rejected");
  const match = /^-----BEGIN PRIVATE KEY-----\s+([A-Za-z0-9+/=\s]+)\s+-----END PRIVATE KEY-----\s*$/.exec(pem);
  if (!match || pem.length > 8192) throw new Error("configuration_rejected");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(match[1].replace(/\s/g, "")), c => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const encode = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));
  const seconds = Math.floor(now / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: seconds - 60, exp: seconds + 300, iss: String(appId) })}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64url(new Uint8Array(signature))}`;
}
// All network reads/posts are bounded; redirects, arbitrary origins and raw error logging are forbidden.
async function request(path: string, token: string, method = "GET", body?: unknown): Promise<Response> {
  // workerd supports manual/follow, not redirect:error. Manual never follows 3xx.
  return fetch(API + path, { method, redirect: "manual", signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10",
      Authorization: `Bearer ${token}`, "User-Agent": "scout-collection-trigger", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body) });
}
async function boundedJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.body) throw new Error("invalid_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 32768) throw new Error("invalid_response");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const all = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  const value: unknown = JSON.parse(new TextDecoder().decode(all));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_response");
  return value as Record<string, unknown>;
}
async function installationToken(env: Env, now: number): Promise<string> {
  const app = configuredId(env.APP_ID), installation = configuredId(env.INSTALLATION_ID), repo = configuredId(env.REPOSITORY_ID);
  const jwt = await appJwt(env.APP_PRIVATE_KEY || "", app, now);
  // Verify App/account and selected-repository mode. Human must separately verify
  // the installation has ONLY SCOUT; narrowed token cannot prove the full grant.
  const installationResponse = await request(`/app/installations/${installation}`, jwt);
  if (installationResponse.status !== 200) throw new Error("authentication_rejected");
  const details = await boundedJson(installationResponse);
  const account = details.account as Record<string, unknown> | undefined;
  const grants = details.permissions as Record<string, unknown> | undefined;
  if (details.id !== installation || details.app_id !== app || account?.login !== "fuzzysniper" || details.repository_selection !== "selected" || details.suspended_at !== null ||
      !grants || grants.actions !== "write" || Object.entries(grants).some(([k, v]) => k !== "actions" && !(k === "metadata" && v === "read"))) throw new Error("scope_rejected");
  const response = await request(`/app/installations/${installation}/access_tokens`, jwt, "POST", { repository_ids: [repo], permissions: { actions: "write" } });
  if (response.status !== 201) throw new Error("authentication_rejected");
  const value = await boundedJson(response);
  const permissions = value.permissions as Record<string, unknown> | undefined;
  const expires = typeof value.expires_at === "string" ? Date.parse(value.expires_at) : NaN;
  if (typeof value.token !== "string" || !value.token || value.token.length > 8192 || !Number.isFinite(expires) || expires < now + 60_000 || expires > now + 65 * 60_000 ||
      !permissions || permissions.actions !== "write" || Object.entries(permissions).some(([k, v]) => k !== "actions" && !(k === "metadata" && v === "read"))) throw new Error("scope_rejected");
  const repositories = await request("/installation/repositories?per_page=2", value.token);
  if (repositories.status !== 200) throw new Error("scope_rejected");
  const scope = await boundedJson(repositories);
  const list = scope.repositories as Record<string, unknown>[] | undefined;
  if (scope.total_count !== 1 || !Array.isArray(list) || list.length !== 1 || list[0].id !== repo || list[0].full_name !== "fuzzysniper/scout-stonk-intel") throw new Error("scope_rejected");
  return value.token;
}
async function dispatch(env: Env, row: Row, clock: () => number): Promise<Outcome> {
  let token: string;
  try { token = await installationToken(env, clock()); }
  catch { return { state: "denied", pause: true, reason: "auth_or_scope_rejected" }; }
  if (clock() < row.claimed || clock() > row.scheduled + WINDOW || clock() - row.claimed >= 60_000) return { state: "denied", reason: "deadline_exceeded" };
  try {
    const response = await request(`${REPO}/actions/workflows/reward-snapshots.yml/dispatches`, token, "POST", {
      ref: "main", return_run_details: true, inputs: { collection_slot: row.slot, trigger_source: "external" },
    });
    if (response.status === 204) return { state: "accepted", reason: "accepted_without_run_id" };
    if (response.status === 200) {
      // Acceptance is terminal even when optional run details are malformed/unreadable.
      let run: number | undefined;
      try { const body = await boundedJson(response); if (id(body.workflow_run_id)) run = body.workflow_run_id; } catch { /* no redispatch */ }
      return { state: "accepted", run, reason: run ? "accepted_with_run_id" : "accepted_without_run_id" };
    }
    // Only explicit 429 is treated as a confirmed no-dispatch rejection. Ambiguous 403/5xx never retry.
    const now = clock();
    const delay = response.headers.get("Retry-After");
    if (response.status === 429 && delay && /^[1-9]\d{0,2}$/.test(delay) && Number(delay) <= 300 && row.attempt < 2 && now + Number(delay) * 1000 <= row.scheduled + WINDOW)
      return { state: "retry_wait", retry: now + Number(delay) * 1000, reason: "dispatch_rate_rejected" };
    if ([400, 401, 403, 404, 422].includes(response.status)) return { state: "denied", pause: true, reason: "dispatch_rejected" };
    if (response.status === 429) return { state: "denied", reason: "dispatch_rate_rejected" };
    return { state: "uncertain", reason: "dispatch_response_ambiguous" };
  } catch { return { state: "uncertain", reason: "dispatch_response_ambiguous" }; }
}

export class SlotCoordinator {
  protected readonly storage: Storage;
  protected readonly env: Env;
  constructor(state: State, env: Env) {
    this.storage = state.storage; this.env = env;
    this.storage.sql.exec("CREATE TABLE IF NOT EXISTS circuit(id INTEGER PRIMARY KEY CHECK(id=1), paused INTEGER NOT NULL)");
    this.storage.sql.exec("INSERT OR IGNORE INTO circuit VALUES(1,0)");
    this.storage.sql.exec("CREATE TABLE IF NOT EXISTS slots(slot TEXT PRIMARY KEY, scheduled INTEGER NOT NULL, state TEXT NOT NULL, nonce TEXT NOT NULL, attempt INTEGER NOT NULL, claimed INTEGER NOT NULL, updated INTEGER NOT NULL, retry INTEGER, run_id INTEGER)");
    this.storage.sql.exec("CREATE TABLE IF NOT EXISTS attempts(slot TEXT NOT NULL REFERENCES slots(slot) ON DELETE CASCADE, attempt INTEGER NOT NULL, claimed INTEGER NOT NULL, updated INTEGER NOT NULL, state TEXT NOT NULL, retry INTEGER, run_id INTEGER, reason TEXT NOT NULL, PRIMARY KEY(slot,attempt))");
  }
  protected clock(): number { return Date.now(); }
  private get(slot: string): Row | undefined { return [...this.storage.sql.exec<Row>("SELECT * FROM slots WHERE slot=?", slot)][0]; }
  private reserve(time: number, now: number): Row | string {
    const slot = slotKey(time);
    if (now < time || now - time > WINDOW) return "outside_window";
    return this.storage.transactionSync(() => {
      if ([...this.storage.sql.exec("SELECT paused FROM circuit WHERE id=1")][0].paused) return "circuit_paused";
      this.storage.sql.exec("DELETE FROM slots WHERE scheduled<?", now - RETENTION);
      const old = this.get(slot);
      if (old) {
        if (now < old.updated) return "clock_regression";
        if (old.state === "reserved") {
          if (now - old.claimed < 60_000) return "in_flight";
          this.storage.sql.exec("UPDATE slots SET state='uncertain',updated=? WHERE slot=?", now, slot);
          this.storage.sql.exec("UPDATE attempts SET state='uncertain',reason='lease_expired',updated=? WHERE slot=? AND attempt=?", now, slot, old.attempt);
          return "uncertain";
        }
        if (old.state !== "retry_wait") return old.state;
        if (old.retry === null || now < old.retry || old.attempt >= 2) return "retry_not_due";
      } else if ([...this.storage.sql.exec("SELECT COUNT(*) AS n FROM slots")][0].n as number >= 193) return "capacity_exhausted";
      const row: Row = { slot, scheduled: time, state: "reserved", nonce: crypto.randomUUID(), attempt: (old?.attempt || 0) + 1, claimed: now, updated: now, retry: null, run_id: null };
      this.storage.sql.exec("INSERT INTO slots VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(slot) DO UPDATE SET state=excluded.state,nonce=excluded.nonce,attempt=excluded.attempt,claimed=excluded.claimed,updated=excluded.updated,retry=NULL,run_id=NULL",
        slot, time, row.state, row.nonce, row.attempt, now, now, null, null);
      this.storage.sql.exec("INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?)", slot, row.attempt, now, now, row.state, null, null, "reserved");
      return row;
    });
  }
  private async tick(time: number): Promise<Response> {
    if (this.env.ACTIVATION !== "human-approved") return json({ action: "disabled" });
    const decision = this.reserve(time, this.clock());
    if (typeof decision === "string") return json({ action: decision });
    const outcome = await dispatch(this.env, decision, () => this.clock());
    const recorded = this.storage.transactionSync(() => {
      const row = this.get(decision.slot);
      // A concurrent lease expiry may hold uncertainty; late acceptance can resolve it.
      if (!row || row.nonce !== decision.nonce || !["reserved", "uncertain"].includes(row.state)) throw new Error("stale_claim");
      if (outcome.pause) this.storage.sql.exec("UPDATE circuit SET paused=1 WHERE id=1");
      if (row.state === "uncertain" && outcome.state !== "accepted") return row.state;
      const updated = Math.max(row.updated, this.clock());
      this.storage.sql.exec("UPDATE slots SET state=?,updated=?,retry=?,run_id=? WHERE slot=?", outcome.state, updated, outcome.retry ?? null, outcome.run ?? null, decision.slot);
      this.storage.sql.exec("UPDATE attempts SET state=?,updated=?,retry=?,run_id=?,reason=? WHERE slot=? AND attempt=?", outcome.state, updated, outcome.retry ?? null, outcome.run ?? null, outcome.reason, decision.slot, decision.attempt);
      return outcome.state;
    });
    if (recorded === "retry_wait" && outcome.retry !== undefined) await this.storage.setAlarm(outcome.retry);
    return json({ action: recorded });
  }
  async alarm(): Promise<void> {
    if (this.env.ACTIVATION !== "human-approved") return;
    this.storage.transactionSync(() => {
      this.storage.sql.exec("UPDATE attempts SET state='denied',reason='retry_window_expired',retry=NULL,updated=? WHERE state='retry_wait' AND slot IN (SELECT slot FROM slots WHERE scheduled<?)", this.clock(), this.clock() - WINDOW);
      this.storage.sql.exec("UPDATE slots SET state='denied',retry=NULL,updated=? WHERE state='retry_wait' AND scheduled<?", this.clock(), this.clock() - WINDOW);
    });
    const rows = [...this.storage.sql.exec<Row>("SELECT * FROM slots WHERE state='retry_wait' ORDER BY scheduled LIMIT 1")];
    if (rows[0]) {
      const now = this.clock();
      if (rows[0].retry !== null && now < rows[0].retry) { await this.storage.setAlarm(rows[0].retry); return; }
      await this.tick(rows[0].scheduled);
    }
    // No automatic alarm loop, catch-up, third attempt or ambiguous POST retry.
  }
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST" || Number(request.headers.get("Content-Length")) > 2048) return json({ action: "invalid_request" }, 400);
      const text = await request.text();
      if (text.length > 2048) return json({ action: "invalid_request" }, 400);
      const body = JSON.parse(text) as { operation: string; scheduledTime: number };
      if (body.operation === "tick") return await this.tick(body.scheduledTime);
      if (body.operation === "receipt") {
        const row = this.get(slotKey(body.scheduledTime));
        if (!row) return json(null);
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(row.nonce));
        const { nonce: _private, ...safe } = row;
        void _private;
        const attempts = [...this.storage.sql.exec("SELECT attempt,claimed,updated,state,retry,run_id,reason FROM attempts WHERE slot=? ORDER BY attempt", row.slot)];
        return json({ ...safe, attempts, run_url: row.run_id ? `https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/${row.run_id}` : null,
          claim_hash: [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("") });
      }
      return json({ action: "invalid_request" }, 400);
    } catch { return json({ action: "coordinator_unavailable" }, 503); } // Never expose keys, tokens, raw response or exceptions.
  }
}

const worker = {
  async scheduled(event: { scheduledTime: number; cron: string }, env: Env): Promise<void> {
    if (env.ACTIVATION !== "human-approved" || event.cron !== "17 * * * *") return;
    slotKey(event.scheduledTime);
    const coordinator = env.SLOTS.get(env.SLOTS.idFromName(TARGET));
    const response = await coordinator.fetch(new Request("https://internal.invalid/", { method: "POST", body: JSON.stringify({ operation: "tick", scheduledTime: event.scheduledTime }) }));
    if (!response.ok) throw new Error("coordinator_unavailable");
  },
};
export default worker;
