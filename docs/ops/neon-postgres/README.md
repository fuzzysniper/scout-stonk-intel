# Existing Neon PostgreSQL setup — 19 October 2026

Scope: founder-requested existing project setup, related to #111. Started from main `c18e1f1ffe20db7d0c0324c86548255814157a15`, including merged security PR #115. This is a review-only configuration/compatibility PR, **not a completed hosted SCOUT store onboarding or RPC activation**.

## Verified target and real service checks

The already-authenticated Neon connector verified the supplied organization/project and exact production branch. No new project, branch, endpoint, database, role, password or API key was created:

| Item | Verified value |
| --- | --- |
| Organization | `org-fragrant-butterfly-26428175` |
| Project | `snowy-haze-83201847` / `scout-onchain` |
| Production branch | `production` / `br-long-fog-b54099ej` |
| Database / existing owner | `neondb` / `neondb_owner` |
| Primary endpoint | `ep-flat-band-b5fp4ls8` (read/write) |
| Exact direct hostname | `ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech` |
| Region | `aws-us-east-2` |

Two bounded, read-only SQL checks through the Neon connector reached that actual existing database. The final server clock was `2026-10-19T02:53:22.501Z`: PostgreSQL `server_version_num=180006`, `pg_is_in_recovery=false`, session `transaction_read_only=off`. **`scout_mint` schema and `scout_mint_runtime` group are both absent.** This verifies hosted PostgreSQL connectivity through the connector, not native app connectivity, migrated SCOUT storage, runtime login permissions or Helius facts. No table contents or credentials were requested. [Sanitized source result](verified-target.json).

Existing endpoint metadata reported autoscaling 0.25–2 CU, suspend timeout 0 and pooling disabled. These settings, branch protection, plan, retention and billing were not changed. A SQL health query can use existing metered compute; no zero-cost entitlement is claimed.

## CLI, skills and actual init result

The installed Neon and Neon PostgreSQL agent skills were read first; the plugin was already available. The official npm package `neon@latest` resolved to **8.8.0** (requires Node ≥20.19.0) and was installed in a separate tools directory, outside this repository. No global plugin/MCP installation or account-wide API-key minting was performed. CLI profile metadata showed the default credential file was missing; no old credential was opened/replaced/revoked.

The requested `neon login` was attempted with a new private config directory and browser launching suppressed. It returned exit 1:

```text
ERROR: Could not reach the Neon API. Please check your internet connection and try again. If your connection is fine and this keeps happening, check https://neonstatus.com for ongoing incidents.
```

A separate public OIDC discovery check confirmed the enforced workspace proxy rejects `oauth2.neon.tech` with **CONNECT HTTP 403**. **Login failed before the CLI issued any authentication URL. There is no valid founder URL to report.** The authenticated connector and unauthenticated CLI are distinct; connector access does not establish CLI login. No token was copied between them. The CLI's OAuth flow discovers its issuer first, then generates PKCE/state and a loopback callback URL; fabricating that URL would not authenticate anything.

Before init, this fresh worktree had no `neon.ts`, `.neon`, `.env` or `.env.local`. The supplied command was then run with only safe operational additions:

```sh
neon init -y \
  --org-id org-fragrant-butterfly-26428175 \
  --project-id snowy-haze-83201847 \
  --branch production --services postgres \
  --no-agent-setup --config-dir <private-cli-config-dir> \
  --no-analytics --no-color
```

`--no-agent-setup` preserves the already-installed plugin/configuration. **Init exited 1**, truthfully reporting pending authentication. It created ignored `.neon` context and `neon.ts`, installed config tooling and skipped env pull. Its “linked, not verified” warning describes the offline CLI link; the same IDs were independently verified through the authenticated connector. **No `.env` or `.env.local` was written.** Do not equate this partial init with a successful deployment. [Actual sanitized init/plan outputs and tests](validation.log).

## Reviewed policy and deploy effects

The generated starter contained explicit `auth: false` and a future-branch 7-day TTL closure. Both were removed: the committed policy is `defineConfig({})`. Postgres already exists on every Neon branch; it needs no additional service declaration or duplicate provisioning. All other services and branch tuning remain unmanaged. No Auth, Data API, functions, storage, AI Gateway, Realtime, triggers, migration hooks, compute/TTL/protection/retention changes or environment reads are declared.

`@neon/config` **1.9.2** is exact-pinned as a **development dependency**. The unused generated `@neon/env` dependency was removed. Neither config SDK appears in production server traces. Native **pg 8.23.1** remains the production driver; there is no serverless-driver substitution, ORM, browser database client, generic `DATABASE_URL` fallback or new app credential path. Config tooling requires Node ≥20.19.0; local checks use Node 24.19.0 and existing CI selects Node 20.

The official config loader evaluates the committed policy to `{}` without network access. Explicitly synthetic offline tests against the official diff engine return zero plan steps/conflicts for existing/new branch targets and already-enabled/disabled service states, including update mode. **These pure tests are not a live remote plan.** A real `neon config plan` attempt returned exit 1 with the same authentication/network error. No `neon deploy` was run.

Reviewed CLI effects: `neon deploy` aliases `neon config apply`; it can reconcile services/branch settings and, by default, pull database credentials into a local env file. It does **not** install SCOUT SQL migrations or its least-privilege login. With the committed empty policy, an authenticated zero-change plan needs no deployment. Do not run deploy just to make init's suggested checklist appear complete. If the owner later explicitly applies a reviewed plan, use exact project/branch selection and `--no-env-pull`; do not pass `-y`, `--update-existing` or `--allow-protected` to suppress safety review.

## Secure hostname compatibility

The actual endpoint uses Neon's current `c-7` routing label. SCOUT's old hostname syntax rejected it even with a matching reviewed pin. The only production-code change permits one optional `c-<digits>.` label before the region. Exact full-host equality, provider suffix, read-replica rejection, scoped `scout_` login, URL/query restrictions, native TLS CA/SNI verification, channel binding, timeouts and private WeakMap credentials are preserved. Tests cover legacy/routed AWS and routed Azure hosts, substitutions, forged suffixes, extra routing labels, replicas, owner login and SSL/port overrides. **The real host is not installed as a production pin.**

## Remaining blockers and safe continuation

1. **CLI network/authentication:** this workspace has no Neon HTTP hosts or PostgreSQL TCP destination grant. Use the supported workspace networking configuration to permit `oauth2.neon.tech` and the CLI API host `console.neon.tech`, then retry `neon login`; or run login on the founder's own workstation, where the loopback callback is reachable. Report/use the actual CLI-generated URL, never a reconstructed URL. No API key/password should be pasted into chat or committed.
2. **Authenticated context/plan:** preserve existing local files. After login, validate the supplied existing context without pulling owner secrets:

   ```sh
   neon link --org-id org-fragrant-butterfly-26428175 \
     --project-id snowy-haze-83201847 --branch production --no-env-pull
   neon config plan --project-id snowy-haze-83201847 --branch production --config neon.ts
   ```

   Stop on any target mismatch or unexpected provisioning/settings/billing action. Empty policy/empty plan requires no hosted mutation. Do not create replacement projects/branches or enable extras to resolve an authentication failure.
3. **SCOUT database onboarding:** the schema/runtime group are absent. Preserve the reviewed [schema](../../../lib/onchain-mint/server/postgres/schema.sql), [owner-only bootstrap](../../../lib/onchain-mint/server/postgres/bootstrap.sql) and [owner acquisition checklist](../../../lib/onchain-mint/server/PRODUCTION.md). Have the owner apply the existing migrations once through an approved **direct** admin connection, separately create a dedicated low-privilege `scout_…` login with only membership in `scout_mint_runtime`, and keep its password server-only. Do not use `neondb_owner` as the app login, rerun bootstrap to clear durable admission state, or turn migrations into automatic startup work. No hosted DDL or role changes were applied here.
4. **Native hosted end-to-end test:** requires an approved TCP route to the exact host on port 5432 and that dedicated runtime credential. Verify TLS/SCRAM, native pg transaction/startup-option compatibility, function-only permissions, durable policy/quota/lease behavior and failure handling against the selected host. The connector's owner SQL check and local synthetic-data service tests do not prove this. Hosted SCOUT transaction/TLS tests remain **blocked/not run**, not passed. Any test that writes synthetic state needs its own isolated owner-approved scope; never reset a production policy.
5. **RPC remains OFF:** `PRODUCTION_RPC_ENABLED=false` and `LIVE_APPROVAL` OFF with null host/project pins are unchanged. This database setup does not approve Helius key access, genuine RPC capture or activation. Preserve all other #111 acquisition, hosting identity, quota, redaction and owner approval gates.

## Tests, risks and rollback

See [validation.log](validation.log) for final results, including real local PostgreSQL/SCRAM/transaction tests, loopback TLS and production browser checks. Local RPC packets are explicitly synthetic; the real hosted service checks above are read-only metadata SQL. No UI/data/evidence/collector/Cloudflare/workflow/treasury or former Render bot changes.

Passed: **920 regression/security tests**, including **47 local PostgreSQL/security cases**, **5 new real PostgreSQL TLS/SCRAM cases** and **10 existing loopback HTTPS transport cases**; **81 production browser/service cases** at 320/390/1280; clean install, production build, typecheck, lint and both archive checks. PostgreSQL TLS tests exercise actual SQL over verified TLS and reject untrusted CA, wrong hostname, wrong password and plaintext. They use a disposable local database and generated test certificates, not the hosted Neon service. All tests complete with zero skips. No UI changes or physical-device claims.

Production dependency audit remains zero. The full development audit still reports the pre-existing 8 high + 1 moderate affected tooling packages documented in [Issue #114](../../security/issue114/development-risks.md); no Neon package appears among the findings. A passing local build or empty policy does not establish hosted readiness or approve credentials.

Rollback: reviewed revert of this PR removes config/dev dependency and routed-host compatibility; retain both RPC gates OFF. Local `.neon` is ignored and may be removed only after checking it still identifies this target; do not delete other contexts or env files. No hosted changes were made, so do not delete the existing Neon project/database or revoke other credentials as “rollback.” Original schema/bootstrap SQL and pg driver remain unchanged.
