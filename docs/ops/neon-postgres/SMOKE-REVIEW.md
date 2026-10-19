# REVIEW ONLY: SCOUT native Neon read-only smoke test

This draft PR **does not authorize execution** against hosted Neon or Vercel. No actual Vercel production runtime, Neon TLS/SCRAM handshake or native application connectivity has been tested by this PR. The public Helius RPC gate remains OFF.

## Existing pinned target — provider metadata (not a native connection)

- Repo: `fuzzysniper/scout-stonk-intel`, base `main`.
- Neon project: `snowy-haze-83201847` / `scout-onchain`, branch: `br-long-fog-b54099ej` / `production`, database: `neondb`.
- Direct primary hostname: `ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech`.
- Scoped app login: `scout_mint_app` (only member of `scout_mint_runtime`).
- Vercel project: `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q` / `scout-stonk-intel`.
- Sensitive production-only `SCOUT_MINT_STORE_DATABASE_URL` already configured. Do not read, print, decrypt, export or commit it.

## Deliverables / tests

- `scripts/ops/scout-neon-smoke.mjs` is inert on import, a one-shot Node script. No route, cron job, Next import, build hook or automatic invocation. It validates explicit approval flags, pinned Vercel process environment and exact database URL, then lazily imports native `pg`.
- Only after **separate** owner execution approval: `BEGIN TRANSACTION READ ONLY`, a single metadata-only `SELECT`, and `ROLLBACK`. Never invoke `scout_mint.step(jsonb)`, which would change admission state. No rows read from policy/client/cache tables.
- The SELECT requires 14 boolean proofs: current/session role, database, read-only transaction, primary, active TLS 1.2/1.3 via session `pg_stat_ssl`, no elevated role flags, effective runtime-group membership, schema USAGE/no CREATE, function EXECUTE, database CREATE denied, no table privileges for policy/clients/cache.
- `node --test tests/onchain-api/scout-neon-smoke.test.mjs` uses **offline synthetic mocks only**, checking unauthorized settings, wrong host/user/URL, safe native TLS parameters, success rollback, failed privilege assertion and query failure. CI runs this suite without access to any hosted secret.
- `vercel.json` disables Vercel automatic deployments for **only** `ops/review-scout-neon-smoke`; all other branches retain default policy. **Remove this temporary file before any future merge.** It is a review-branch preview safeguard, not a lasting project setting.

## Crucial runtime limitation

SCOUT's existing `/api/mint-facts` handler checks `PRODUCTION_RPC_ENABLED=false` **before** opening credentials or any database connection. A disabled API response or READY deployment **cannot** prove native Vercel-to-Neon connectivity. Environment values `VERCEL=1`, `VERCEL_ENV=production`, and `VERCEL_PROJECT_ID` are config gates, **not cryptographic platform attestation**. A local process with spoofed environment variables does not prove Vercel runtime connectivity.

**There is no verified one-shot server-side execution facility inside the existing READY Vercel production runtime.** We will not invent one. Do not run the test using a local `vercel env pull`, permanently public diagnostic endpoint, build hook, covert deployment or edited Helius gate. If the platform needs a separately deployed temporary function, that requires a distinct review and express operator authorization. This PR stops at preparation plus offline tests.

## Later execution plan — NEW explicit approval required

1. Pin and review the deployed SHA, immutable RPC OFF and null LIVE_APPROVAL gates, exact Vercel project, Neon primary/role, budgets, production `pg` options and secret redaction.
2. Review a **nonpublic, disposable, operator-authorized Vercel production Node execution mechanism** with server-side injected credentials and no credential logs. If none is supported without deployment, STOP for new design/approval. No local spoofing.
3. After separate authorization, run the one-shot **once** with both `--execute --approve-production-read-only` flags *inside that verified process*. No Helius, retries, state writes, migrations or other resource modifications.
4. The script emits only a constant PASS/FAIL (no raw SQL/errors/secrets). Native pg uses a single connection, 1s connect timeout, TLS hostname/CA/SNI verification, channel-binding support and bounded statement deadlines. Successful TLS + password login plus `pg_stat_ssl` **does not independently prove exact SCRAM authentication method/PLUS negotiation**. That needs separately reviewed server auth/SCRAM metadata or protocol evidence.
5. Independently compare nonsecret durable policy counters/slot/lease and client/cache *counts* before and after via approved, read-only owner query. Expect no changes. Confirm no Helius source attempt, public endpoint, new deployment or background task.
6. Any failure, uncertain acknowledgement or mismatch is STOP, not an invitation to retry.

## Rollback and review status

The local offline tests do not attest real Vercel execution or hosted Neon. Prior to live execution, rollback is closing the draft PR and deleting its branch—nothing was installed into production. Remove the temporary `vercel.json` before any proposed merge; preserve the existing production deployment policy. Do not activate RPC or touch the old bot, collector, Cloudflare scheduler or treasury.
