# Issue #130 — proven compatibility defect; production attribution unproven

Reviewed deployed source `8df27bda59d29901d8996920fbe5f0cd6892ad3d`; work starts at main `c0ea6bc` (only collector data differs). No production request, credential/log retrieval, hosted SQL, Helius call, cookie use, reset, deployment or merge. PRs #118/#128/#129 untouched.

**Proven locally:** the SQL compatibility guard confuses PostgreSQL's backend hop with the client's actual TLS hop. A real local TLS-terminating proxy gives node-postgres a CA/hostname/SNI-verified TLS1.2/1.3 socket and forwards to disposable PostgreSQL over a local Unix socket. The backend correctly reports `pg_stat_ssl.ssl=false`. The original code returns **503/upstream_unavailable, zero stub calls, synthetic sequence0**. Removing only that backend predicate permits the same request and preserves all other compatibility gates. [Before/after evidence](VALIDATION.md).

**Not proven:** that SCOUT's specific Neon connection had this topology or reached this guard. The reported sanitized response is compatible with multiple failure phases. Prior real RPC usage remains **unknown**, including the possibility that RPC succeeded but completion acknowledgement failed. This fix is not a retry authorization or proof of hosted connectivity.

## Small correction and security tradeoff

Only production logic change: remove the backend `pg_stat_ssl` predicate from `POSTGRES_COMPATIBILITY_SQL`. The mandatory actual native client socket proof in `postgres-store.ts` stays unchanged: encrypted/authorized, exact pinned SNI, TLS1.2/1.3. `databaseParameters` retains verified CA/hostname, TLS minimum, scoped native driver, channel-binding preference and original deadlines. Role/DB/privilege/function owner/settings/body-hash checks and policy id stay exact. No schema/function/bootstrap/migration or quota changes.

This explicitly stops treating backend TLS as a required surrogate for frontend TLS. **Provider-internal hop encryption is unobserved**, rather than certified by this app; owner security review must accept that boundary before release. Negotiated SCRAM/PLUS remains unobserved; `enableChannelBinding=true` is not `require-PLUS`. Do not weaken the actual client TLS proof or silently strip a DSN's `channel_binding=require` to make it pass.

Primary references: [PostgreSQL pg_stat_ssl](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW) describes a backend connection; [Neon security overview](https://neon.com/docs/security/security-overview) documents a proxy and TLS-protected Internet connections. These support the layer distinction, **not this incident's backend state**. [node-postgres SSL](https://node-postgres.com/features/ssl) documents explicit TLS options/channel-binding support. No community report is treated as SCOUT evidence.

## Complete 503 path trace at the reviewed commit

The public JSON mapper in `handler.ts` uses503 for failure reasons not explicitly mapped to400/404/429/502/504. The incident's **specific reason** was `upstream_unavailable`, not merely an HTTP503. All source sites producing that reason on this production route are below; the offline-only handler is not deployed.

| Stage / code | Possible matching failure | RPC implication |
| --- | --- | --- |
| `productionCanaryRuntime` outer catch | URL/GET-translation/header operations throw; clock/hosting resolver throws; empty-body reader fails/times out/nonempty; selected-origin invariant; response header mutation throws | Before runtime normally zero; after runtime response mutation could follow source work. If the unmodified reviewed helper returned its structured object, it validated the exact nonnull mint: failures before assigning parsed mint would instead make that helper throw. |
| Normal Vercel/request identity guards | Wrong project/env/host/IP/origin are403/access_denied; invalid query/body framing400; wrong methods405; expiry/public GET disabled or denied | These ordinary rejections do **not** explain the reported reason. A throwing resolver is covered above. Empty POST→GET with content-length0 passes locally. No real ingress/header evidence was read. |
| `productionRuntime` initialization/catch | Missing/malformed scoped config or strict DSN/pins, lazy pg import/pool/service construction, platform resolver exceptions, result serialization | Config/startup failures authorize zero RPC; result serialization can be later. Three configured variables do not prove accepted values, scope or runtime availability. Initialization rejection stays failed per isolate. |
| `postgresStore.transact` / native deadline | Pool/DNS/connect/TLS/SCRAM rejection, actual socket proof, BEGIN/SET, compatibility false/error/missing function, step SQL exception, query/commit failure or2s outer deadline | Admission failure can be before reservation or an unacknowledged committed reservation; completion failure can follow RPC. Destroy uncertain client; no retry. Pool wait/admission exceptions also sanitize through service. |
| `scout_mint.step` | Missing production policy row returns denied/upstream_unavailable | No RPC; no bootstrap/repair/reset follows. Policy remains exactly `scout-helius-mint/production-v1`. |
| `mintService` transaction wrapper | Missing store, thrown/timed-out admit/complete/fail/stop transaction; denied completion with this reason | Completion case can hide an actual provider observation. Failed cleanup does not replace the original source reason. Lost acknowledgements remain charged/fenced. |
| `heliusRead` | Any non200 source HTTP status except401/403/429, including500/502/503/redirect status | An outbound attempt occurred. Native TLS/network failure is `network_unavailable`; timeout504/timeout;401/403 access_denied;429 rate_limited; invalid packets502/invalid_response — distinct from this reason. |

Other503 reasons (disabled, server_only, development_budget, circuit_open, access_denied, network_unavailable, stale_source, invalid_clock and supported failure reasons carried by a denied reply) do not become `upstream_unavailable` just because they share503. Native source/decoder failures retain their reason in service; unsupported mint-account negatives are gated/rejected for this canary. Public GET refreshes do not acquire facts or touch admission.

## Ranked hypotheses / shortest next action

Ranked by offline evidence/testability, **not estimated probability**:

1. Backend TLS predicate: exact matching503 reproduced with native TLS verified; actual Neon backend state unknown. Small fix provided.
2. Strict configuration shape: missing values or, for example, a DSN with `?sslmode=require&channel_binding=require` reproduces the same reason before SQL. Current parser intentionally refuses that extra parameter; no claim that production uses it and no credential was inspected. Do not remove a required security option casually.
3. Actual role/grants/schema/function fingerprint/bootstrap mismatch, or native connect/query deadline/TLS/SCRAM failure: real local negative controls reproduce503. No hosted compatibility or elapsed-time evidence is available to Agent B.
4. Helius HTTP5xx or fenced completion/commit failure: reproduced with stubs, including zero facts after a successful stub read. These prevent claiming zero prior usage. Ordinary identity/GET translation are lower-ranked because represented valid inputs pass and ordinary mismatches have another status/reason.

**Next action without new traffic:** founder/Agent A inspect the *existing* original invocation in Vercel's dashboard for deployment `dpl_FzWBCqsJomc5z1j7ZnW55vuFvxEZ`, path `/api/mint-facts`, around the original attempt. Retain only nonsecret timestamp, duration, status, request identifier and any existing error category — no cookies, client headers, key-bearing URLs or raw logs. Agent B has not accessed runtime logs. The application catches intentionally omit messages/stacks, so logs may not resolve the phase; lack of logged errors is not evidence of success. No probe/retry is needed to inspect existing records.

Any future live test requires **separate founder approval** after review: exact immutable release/deployment, non-reused approved policy/session with fresh bounded accounting (designed separately by Agent A), allowed database operations, one exact USDC finalized/jsonParsed observation at most, cost/quota acceptance, no retries, timing/hash retention, stop/rollback. Current SQL hardcodes the original policy id; a new session is **not** an env switch/new row supported by this PR. No such mechanism is enabled here. Never clear/reuse the original sequence, circuit, counters or lease. Original expiry remains **October20,7:00p.m.CDT (October21,00:00UTC)**; no extension/rearm is included. Code review/merge alone is not invocation authorization.

Rollback: reviewed revert of the one compatibility change; preserve all durable admission state. No deployment, alias, credential, SQL or policy reset is part of this PR.
