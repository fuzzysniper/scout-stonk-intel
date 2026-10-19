# Inactive native Helius production path — Issue #111

Review-only backend implementation, based on main including #109, #110 and merged
#112 (`bea9b7b`). **Production RPC remains OFF.** This work did not read any real
credential, contact Helius/a hosted database, create an account, provision services,
incur provider charges, deploy, activate collection or change the former Render bot.

The actual route now composes a scoped credential loader, native HTTPS Helius
transport, native `pg` PostgreSQL adapter and trusted hosting identity. This is
executable code with real local PostgreSQL tests, not the old reference-store
substitute. Hosted availability, provider TLS/authentication, account entitlements
and a genuine source response remain **unverified** until separate owner approval.

## Reviewed acquisition contract

Agent A confirmed the [contract in #111](https://github.com/fuzzysniper/scout-stonk-intel/issues/111#issuecomment-6253559130);
#112 already implements the consumer gate. `GET /api/mint-facts?mint=<exact>` keeps
`version: "mint-facts/1"`, statuses and HTTP mapping. The sole additive shared type
is `source.acquisition: "production_rpc"` paired with exactly
`mainnet.helius-rpc.com`. No envelope, financial field or API target parameter.

The profile only denotes acquisition by the trusted native server path. It does
not prove independent Solana replay, project identity, backing, stock ownership,
quote/reward mode, holder payout or ROI. Assurance remains
`rpc_reported_not_independently_replayed`. Original request/receipt/checked clocks,
finalized context slot, null slotTime and original response SHA-256 are preserved
on cache hits; only evaluatedAt advances. Server cache expiry is 30 seconds from
receipt; #112 consumer expiry remains 60 seconds from that original receipt.
Provider Date/Age and unknown clocks retain the existing decoder semantics.

**Every successful test in this PR is expressly synthetic/offline**, including
tests of the production discriminator. No test fixture is an authentic observation,
and none is imported by the deployed route. Default dated StonkFun support remains
exactly three examples with its existing independent rights gates.

## Gate, credentials and hosting identity

`policy.ts: PRODUCTION_RPC_ENABLED=false` is unchanged. `LIVE_APPROVAL` derives
its enabled value from that source-code constant and has null database host and
Vercel project pins. The route checks it before any configuration, secret, store
or RPC operation. No query, request header, environment flag, credential presence,
NODE_ENV or test constructor enables the public route. Merely merging this code
does not authorize activation. Actual activation requires a separately reviewed
code change and owner-authorized operational work.

Only after approval, valid canonical input and hosting verification does the loader
read these exact sensitive, server-only names:

| Name | Purpose |
| --- | --- |
| `SCOUT_MINT_HELIUS_API_KEY` | Newly provisioned isolated SCOUT key in the founder's **existing paid Helius account**. No old bot fallback. |
| `SCOUT_MINT_ADMISSION_HMAC_KEY` | Independent high-entropy 32–128-character base64url key for domain-separated identity/cache MACs. |
| `SCOUT_MINT_STORE_DATABASE_URL` | Dedicated least-privilege PostgreSQL login, `scout_` role prefix, exact reviewed Neon primary host/database. |

No `NEXT_PUBLIC`, browser, GitHub Actions or Render credential path. Helius handles
keep full key-bearing URLs in a private WeakMap; store handles keep their password
in a private WeakMap; HMAC configuration is non-enumerable. JSON/spreads of these
handles contain no secret. Provider keys are not assumed to be provider-enforced
read-only: the application enforces one fixed `getAccountInfo`, jsonParsed/finalized,
exact mint, no batch, retry, redirect, arbitrary method or arbitrary target.

The isolated native `node:https` transport fixes verified TLS/SNI and headers,
disables agents/redirects/retries, bounds HTTP headers and uses byte-counted stream
backpressure. It also refuses other RPC methods/targets at the wire boundary.
It bypasses Next's global Fetch instrumentation, whose `http.url` spans/metrics
include query strings (verified in installed Next 15.5.9 `patch-fetch.js`). External
HTTP/APM instrumentation still needs owner redaction review. Local TLS tests verify
CA/hostname rejection, aborts, header/body bounds, no redirect following and that
a poisoned global Fetch never sees the key-bearing URL.

PostgreSQL configuration uses explicit fields, a fixed pinned hostname, verified
TLS hostname/CA (`rejectUnauthorized=true`), channel binding support, 1s connect/query
timeouts, 500ms statements, 100ms lock timeout and one connection per isolate.
No connection-string SSL overrides, inherited password fallback, pgpass lookup,
client-provided URL or automatic migration/bootstrap. Only the exact reviewed
`ep-….<region>.aws.neon.tech` / Azure hostname, including Neon's optional `c-N`
routing label before the region, is accepted. Full hostname equality is still
required; syntax support is not a production-host approval. Read-only endpoint
spelling is rejected; actual primary/write capability must also be verified by
the owner (host spelling alone is not proof). The SQL fails on recovery/read-only
operation. Startup options and the native transaction protocol must be checked
against the selected primary/pooler configuration before activation.

Direct Vercel production ingress is the only implemented identity profile:
`VERCEL=1`, `VERCEL_ENV=production`, exact code-pinned `VERCEL_PROJECT_ID`, canonical
HTTPS origin/forwarded host/protocol and one valid platform-overwritten IP.
`x-vercel-forwarded-for` must equal `x-forwarded-for`; outside hosting, unknown
project, previews, lists, malformed IPs and disagreement fail closed. The trust
comes from Vercel's overwrite guarantee plus hosting context, **not** header names
alone. Owner must verify actual direct ingress; generic proxies/Cloudflare or
Vercel Trusted Proxy mode are not implicitly approved. IP aliases are canonicalized
then HMACed; raw IPs never enter store/response. Origin checks alone are not auth.

## Actual shared state and transaction protocol

Selected provider profile: PostgreSQL 15+ on a reviewed Neon **primary**, reached
through native `pg` 8.23.1 (MIT; lockfile/integrities committed). The store is not
provisioned here. Upstash Redis was rejected for this hard global lease after its
documentation described eventual consistency and deprecated strong consistency.
Neon's documented WAL quorum acknowledgement supports a real durable PostgreSQL
commit; actual account configuration/failover/retention still require owner review.
There is no JavaScript/in-memory production fallback.

`postgres/schema.sql` creates the real schema, bounded state tables and a fixed
`SECURITY DEFINER` SQL function with a pinned safe search_path. Each native command
executes BEGIN → SET LOCAL synchronous_commit=on/timeouts → function → **COMMIT
before returning authorization/facts**. All commands lock the same persistent
policy row. Authoritative database time is sampled after acquiring that lock, so
quotas, cache serving, lease, sequence, high-water slot and circuit serialize across
all processes/regions. No RPC runs inside a database transaction.

1. Admission charges global/client reads, checks original cache expiry, or precharges
   source quota and commits one fenced global lease before RPC. Unknown/lost replies
   authorize no RPC and never refund charges.
2. Completion validates lease ID/mint/exact expiry, safe nonregressing finalized
   slot, original source clocks and bounded MACed projection, then commits cache/slot
   and lease release atomically. Unknown/lost completion returns no facts.
3. Failure opens a durable terminal circuit and clears cache. An expired lease is
   terminal, never reclaimed; a stalled/unknown prior operation cannot overlap a retry.
   Restart does not reset quotas, sequence, slot or circuit. No automatic circuit reset,
   refund, negative cache, stale-on-error, retry or alternate provider.

The runtime role has only schema USAGE and function EXECUTE. It cannot select or
mutate tables, create objects, change the function, bootstrap or reset the policy.
Missing schema/function/policy, permission/auth failures, outages, lock/query/total
deadlines, corrupted/future counters, host/store clock divergence and uncertain
commits all fail closed. Store/server clocks must agree within 1 second with no
future database clock accepted. A local stopped flag is additional protection,
never distributed state. Failed initialization remains failed until isolate restart.

| Enforced ceiling (not purchased entitlement) | Limit |
| --- | --- |
| Global / trusted-client reads, including cache, per fixed UTC minute | 30 / 6 |
| Source attempts per fixed UTC minute / UTC day | 3 / 120 |
| Minimum starts / global outstanding lease | 10 seconds / 1 |
| RPC deadline / store command deadline / lease | 5s / 2s / 15s |
| Cache serving age / entries / payload per entry | 30s / 8 / 16 KiB |
| Client bucket logical retention / capacity | 120s / 128 HMAC IDs |
| Policy | One persistent row, never time-expired |

These are fixed UTC windows, not rolling ceilings. The global lease and minimum
spacing still bound window-edge bursts. Lease expiry leaves a terminal circuit,
so even a lost store connection cannot trigger an overlapping source attempt.
Native query timeouts plus the total command deadline bound outward failure;
an uncertain command may finish later but its reply cannot authorize RPC after
the caller deadline. The durable charge/lease/circuit remains authoritative.

**Retention distinction:** PostgreSQL enforces logical expiry on every read and
prunes expired cache/client rows during commands. Physical row count is bounded;
idle expired rows can remain on disk until the next command. This is **not**
time-scheduled erasure/native Redis TTL. WAL/backups/PITR may retain older versions.
The owner must approve that privacy/retention policy (HMAC IDs are pseudonymous,
not anonymous). Strict physical erasure would require separately scoped work;
no scheduler is added here. Preserve durable policy state during cleanup/recovery.

## Owner provisioning and approval pathway — NOT EXECUTED

- Review code/schema/dependency/security changes and #112 compatibility. Review the
  existing Helius account's method pricing, unused/shared quota and terms; never
  inspect/copy/revoke the former bot key, stop it or assume its billing has ceased.
- Explicitly authorize a new isolated SCOUT credential inside that existing account
  and a dedicated store project/database/login. Owner enters secrets directly in
  the selected secure Vercel production configuration, never chat, PR, argv, output,
  screenshots or NEXT_PUBLIC. No subscriptions, upgrades/autoscaling or costs are
  implicitly authorized. Confirm no ambient PG*/APM configuration overrides policy.
- In the approved empty dedicated database, a separate owner/migration identity
  applies `postgres/schema.sql` once, reviews function ownership and default/public
  privileges, creates a `scout_…` LOGIN with no superuser/CREATEROLE/CREATEDB/BYPASSRLS
  or table privileges, and grants only membership in `scout_mint_runtime`. Do not
  use an automatically elevated console-created admin role as the app login.
  Apply `postgres/bootstrap.sql` **once** after review. It deliberately fails if
  repeated. The API never executes either file. Keep admin credentials out of app.
- Record nonsecret exact primary hostname, database/role and Vercel project pin;
  verify native TLS/SCRAM, transaction support, connection limits, clock agreement,
  durability/failover and account cost controls. Pin them in the activation review.
  All Vercel instances must use this same persistent policy, not branches/replicas.
  Snapshot/restore/failover that loses recent reservations is unsafe: keep the API
  OFF pending investigation/new reviewed policy epoch, never silently bootstrap.
- Approve full outbound URL redaction in hosting/APM/fetch instrumentation/proxies.
  Helius's key is in the URL query; application error redaction cannot prevent an
  external tracer from recording it. Permit only sanitized host/reason/aggregate
  latency, no key-bearing URL, raw IP, source body or SQL/connection error logs.
- Separately authorize **one** serial nonproduction `getAccountInfo` capture for one
  reviewed exact mint, one isolated credential, finalized/jsonParsed, 5s/64 KiB,
  no retries/other RPC methods. Agree private raw-response retention/rights first.
  Stop on any error. Save exact mint, sanitized host, original start/receipt clock,
  finalized context slot, Date/unknown and SHA-256 with parser outcome. Verify genuine
  provider format privately; mocks cannot substitute for this evidence.
- Review that authentic capture, owner subscription/data terms and meaningful source
  lag limits; run actual consumer/iPhone/terminal QA with Agent A. Then approve a
  **separate activation PR** changing the existing source-code gate and pins. This
  implementation PR, credential presence or a passing local test is not approval.

At one standard-call credit per current documented getAccountInfo pricing, 120
attempts/day is up to 3,720 credits in a 31-day month; this is a conditional estimate,
not a verified entitlement or promise of no charge. Neon compute, storage, connections,
retained WAL/backups and hosting execution may cost money even without source calls.
Owner must review current plan/free limits, cold-start latency, storage, transfer,
concurrency, applicable agreement and any autoscaling/overage settings. No entitlement
or price is fabricated here; no account/service was contacted or purchased.

## Tests, deployed boundary and rollback

Run `npm ci`, then `bash tests/onchain-api/run.sh` (also included in `npm test`).
Requires local PostgreSQL 15+ server binaries; Ubuntu CI normally installs these
under `/usr/lib/postgresql/<version>/bin`. On another development host, install
PostgreSQL locally or set **test-only** `SCOUT_TEST_PG_BIN` and optional
`SCOUT_TEST_PG_SHARE` to its binaries/share directory. Missing binaries fail with
an actionable error; the suite never skips or substitutes an in-memory store.

The database harness creates an isolated temporary local cluster with no TCP listener,
SCRAM for the synthetic runtime role, fsync/synchronous commit ON, applies the
actual SQL/client and cleans up. Owner-only counter seeding avoids long waits in
quota/expiry tests; it is unavailable to the real API role. Tests use independent
pools and real commit/rollback/lock failure, WAL crash/restart, outage/auth failure,
lost acknowledgement, cache/MAC expiry, budgets, fencing, circuit, zero/extension
states and the merged consumer projection. A separate synthetic loopback HTTPS
fixture exercises the actual native TLS client with a temporary generated local
certificate; it never reaches Helius. All RPC responses are labeled synthetic
mocks. Real provider TLS, hosting identity and cross-region failover are
owner-only unmet gates, not local-test claims. See [production-validation.md](production-validation.md).

The original bounded canonical deployed smoke failed before HTTP at the environment
network boundary (`scout.storkcoin.xyz` not allowed); no application response was
observed and restrictions were not bypassed. Agent A recorded the same outcome for
homepage/API/terminal. Local route/production-browser tests are separate evidence.

Rollback before activation: revert the backend changes/dependencies/tests; preserve
#112 consumer and all retained data. Keep `/api/mint-facts` honestly disabled. After
any future authorized activation, first restore `PRODUCTION_RPC_ENABLED=false` and
verify disabled/no-I/O on all serving deployments, then remove the native path if
needed. Consumer rollback alone does not stop an activated backend. Do not delete
durable policy to reset limits, auto-revoke keys, change billing or touch old bot
secrets; those are separate owner operations. Terminal circuits require deliberate
operator investigation, which trades availability for fail-closed safety.

Public design references and owner review links (no account/provider-data requests):

- [Vercel request headers / forwarded IP overwrite](https://vercel.com/docs/headers/request-headers)
- [Neon durable WAL/compute architecture](https://neon.com/docs/introduction/architecture-overview)
- [Neon pricing](https://neon.com/pricing) and [terms](https://neon.com/terms-of-service)
- [PostgreSQL explicit transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
  and [synchronous_commit](https://www.postgresql.org/docs/current/runtime-config-wal.html)
- [node-postgres TLS configuration caveat](https://node-postgres.com/features/ssl)
- [Upstash consistency limitations](https://upstash.com/docs/redis/features/consistency)
- [Helius credits](https://www.helius.dev/docs/billing/credits) and [terms](https://www.helius.dev/terms)
