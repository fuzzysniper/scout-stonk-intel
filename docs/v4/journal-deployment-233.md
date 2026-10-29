# Isolated journal database package — review only

**CODE REVIEW GO / HOSTED SAVE, SQL, AUTH AND SOURCES HOLD.** This package executes only in disposable local tests. Rendering SQL does not authorize provisioning, a hosted connection, migration, key installation, login enrollment or Save. No clocks or activation gates change.

## Immutable inputs and boundary

- Parent #230: `76dea8aab3f26eef39c2fcbc1b0b37d13180388f`; target its `feat/228-thesis-save-slice` branch, not main.
- Owner/Better Auth/native pilot schema from A #229: `6efb0eb66a79087b9c7a59b9a06ad584e9130ee9:lib/v4-owner-ledger/schema.sql`. Copied byte-for-byte into `ops/v4-journal/sources/owner-ledger.sql` with SHA-256 inventory; no A code/dependency/issuer is imported or installed.
- J schema and thesis-rate schema use their unchanged parent paths, verified against `sources.json`. Their existing crypto/auth/repository, all public routes/Lens, C owner↔thesis adapter, A source implementation, manifests, collector/data, legacy mint gates and runtime configuration remain byte-identical.
- Fresh **database `unfarmd_v4_pilot`**, never `scout_live`, `neondb`, an existing shared production database or a copy of private production data. No database is created by this package. PostgreSQL roles are CLUSTER-wide: any existing `unfarmd_*` role/schema collision causes STOP; do not drop/reuse it. Owner must verify actual Neon project/branch/database isolation and permission to create these roles. An extra database is not automatically a separate security/accounting or backup boundary.
- Refreshed main at preparation: `5d9ce751c08089536ba9a21057219a60f053c8e1`. This intentionally dependent branch does not import/revert current main or collector history. A later integration must preserve then-current scheduled data.

## Render, review and future authorization sequence

Safe OFFLINE commands (no connection arguments, environment/secret reads or network):

```sh
node ops/v4-journal/package.mjs > /tmp/unfarmd-v4-journal-reviewed.sql
sha256sum /tmp/unfarmd-v4-journal-reviewed.sql ops/v4-journal/sources.json
```

The renderer verifies source hashes, combines the three reviewed schemas in ONE transaction, explicitly resets source roles between them, then applies only additive package hardening. Absolute SQL clock limits: lock 2s, statement 15s, idle transaction 30s. Advisory transaction lock serializes installers; no retries. PostgreSQL15+ primary with `fsync=on` and synchronous commit required; **actual local validation uses PostgreSQL17, not a hosted compatibility claim or a tested15/16/18 matrix**.

First install requires a fresh namespace/role inventory. The schemas have no owner enrollment, users/sessions, pilot policy/state, permits, source budget or keys. All five credential roles remain **NOLOGIN**. There is no issuer creation, source approval, database password, extension, deployment, counter reset or destructive down migration in the artifact.

Replay checks the identical release digest and a catalog fingerprint: schemas/owners; columns/defaults/constraints/indexes; functions/definers/search paths; complete ACL principals/grantors/grant options; RLS/policies; triggers; role capabilities/membership/admin options; database ACL. Mismatch rolls back instead of repairing. ACLs are semantically canonicalized: pg_dump may represent the owner's default rights as either NULL or an explicit owner ACL. Both expand to the same exact privilege set; PUBLIC grants or new rights still fail. Intended credential roles' NOLOGIN→LOGIN and password verifiers are outside this catalog digest, exclusively for later separate owner enrollment; capability/owner roles' NOLOGIN is pinned. This is a same-major restore fingerprint, not an automatic cross-major upgrade tool. Migration admin remains trusted; a compromised admin can replace the baseline or disable triggers.

**NOT AUTHORIZED NOW:** after separate provisioning + migration approval, the founder may run this exact artifact through a protected, OWNER-managed libpq service outside the repository. Example syntax only; do not paste a DSN/password into shell history or chat:

```sh
PGSERVICE=unfarmd_v4_migration PGSSLMODE=verify-full PGCHANNELBINDING=require PGSSLMINPROTOCOLVERSION=TLSv1.2 \
  psql -X --no-password --set=ON_ERROR_STOP=1 --file=/tmp/unfarmd-v4-journal-reviewed.sql
```

The service must pin the separately approved direct primary hostname/port, exact database, restricted migration operator and protected CA/passfile. Verify those locally without displaying values; a correct database name alone cannot prove the correct Neon project/host. No generic DATABASE_URL, pooled host, browser-exported secret, scout_live login or superuser DSN in the app. Neon may restrict ownership/role grants; if the reviewed operations are unsupported, STOP for a new review. Do not bypass with a shared privileged login.

An ambiguous install ACK is **uncertain**, not failed/absent. No automatic retry or cleanup: separately approve catalog-only verification before any replay. The transaction makes ordinary errors atomic; it does not eliminate network uncertainty after COMMIT.

## Native transport and least privilege

`native-tls.mjs` is **uninstalled**. It reads no env, takes an explicit approved host/CA/DSN, accepts only exact database, five allowed role names, `sslmode=verify-full` and `channel_binding=require`. Extra/duplicate URL settings, alternate ports/hosts, poolers, legacy roles and insecure modes deny categorically. Credential values never enter returned error text.

Pinned pg8.23.1 prefers PLUS with `enableChannelBinding`; preference is not enforcement. The separate strict client checks source hashes of pg client/SASL/connection internals, requires an actual authorized native TLSSocket, TLS1.2+, exact SNI and Node hostname verification, rejects plain SCRAM/MD5/cleartext/trust before any application query, and accepts ReadyForQuery only after pg verifies the SCRAM-SHA-256-PLUS server signature. No provider fallback, in-memory admission, auth downgrade or retry. Tests exercise actual local PostgreSQL PLUS and real TLS synthetic peers; **they do not prove Neon/pgBouncer/provider-internal-hop or Vercel compatibility**. A driver update requires new source review. Existing production transport and conditional #139 are untouched.

| Proposed credential role (all initially NOLOGIN) | Capability | Explicit denials |
| --- | --- | --- |
| `unfarmd_v4_journal_login` | J read/functions + rate reservation | no auth sessions/pilot, table mutations, reset, DDL/TEMP |
| `unfarmd_v4_auth_login` | read fixed Better Auth tables + owner policy | no issuer/login endpoints, session writes, J/pilot |
| `unfarmd_v4_pilot_login` | existing pilot `step` only | no direct tables, schema/policy enrollment or refunds |
| `unfarmd_v4_erasure_login` | J due-only purge, max20 | no active-row removal, budgets/STOP or key access |
| `unfarmd_v4_stopper_login` | new monotone `stop_pilot()` only | no admit/reserve/finish, table reads/reset or source calls |

Separate non-login owners own J, A and deploy/rate objects. No runtime membership in owner roles; no ADMIN OPTION, superuser, BYPASSRLS, CREATE/CREATEROLE/replication or public DB CREATE/TEMP. Connection caps4/4/2/1/1 respectively. Use separate secrets/pools; do not give one application pool all memberships. Existing J RLS assumes a trusted server verifies owner capability before setting its transaction context; it cannot authenticate a caller who already stole that database credential. No complete server-compromise isolation claim.

The additive STOP trigger rejects state deletion/truncation, spent counter/clock/slot decreases, STOP undo and fence replacement. STOP-only execution locks/updates the existing row and appends its existing history format once. It requires an installed state; an empty source-disabled database returns unconfigured. It does not create/arm a policy or invent a replacement global controller. Old mint-proof/legacy STOP/admission schemas are neither included nor queried.

## Encryption, rotation and key loss

Existing J AES256-GCM authenticates exact owner/journal/mint/sequence/request/previous head. No plaintext thesis is stored in SQL. `envelope.mjs` rehearses a versioned owner-specific32-byte DEK wrapped by an independent32-byte KEK with authenticated owner/DEK/KEK/domain IDs. No key store or KMS is installed. KEK rewrap preserves DEK and existing journal ciphertext; new DEK versions are used for new writes while old versions remain necessary to read history. Cross-owner/version/tag/nonce/key substitutions fail. Temporary copies are zeroed; JavaScript cannot guarantee elimination of all runtime copies.

Future owner must choose independent envelope/key storage and restricted resolver; the DB must not contain its own KEK. Keep recovery escrow encrypted offline, separately controlled and restoration-tested. KEK/DEK destruction is irreversible unless an independently retained valid recovery copy exists. Old backups/rewrapped key copies weaken any crypto-erasure claim. A common server-held KEK is not end-to-end encryption against that server. Auth session tokens/identity fields are private plaintext in the AUTH schema: encrypt the **whole backup**, not only journal rows, and suppress SQL parameter/statement/HTTP body/session/cookie logging. No real key generation, export or storage occurs here.

## Retention, deletion and durable history

- J30-day logical expiry; explicit deletion/redaction immediately revokes access and queues erasure after24h. No instantaneous physical deletion claim.
- A separately authorized erasure worker/operator may call existing purge in batches<=20, at most5 batches/100 rows per reviewed run, with a10s outer deadline and no retry/reset. No scheduler/worker is added here. Owner must approve cadence, independent backlog/last-success notification and outage catch-up before Save; the single-owner32-journal cap bounds that beta's backlog.
- New trigger retains minimal tombstone(owner/journal UUID, terminal revision/head, revoked/expiry/erased time) when payload rows are purged and rejects later reuse of that UUID. These are personal metadata; no plaintext note, keys or source figures. Tombstones, lifetime owner counters, spent pilot attempts/credits/fences/leases/history and rate tickets are not purged/reset by erasure or code rollback.
- Rate quota60reads/20writes per owner/hour is its existing admitted-window behavior, not a manual reset. Minimal rate-owner and tombstone retirement needs a separately reviewed permanent-identity-retirement + all-backups-expired policy; this package provides no deleting helper. No claim of unlimited retention rights.
- Six-hour Neon PITR was previously founder-reported for another connected context; current isolated target retention/snapshots/physical deletion are **unverified**. Require exact branch/project backup history, all snapshot/export lifetimes, log/replica behavior, provider obligations and owner acceptance. Expired rows or destroyed current keys do not erase PITR/backups/old key copies.

## Backup/recovery must not resurrect state

Local test takes a real `pg_dump -Fc` of synthetic data and restores into a SECOND isolated local cluster with the exact reviewed NOLOGIN roles. Journal payloads stay encrypted; this test archive is mode0600 and deleted. It is **not** an encrypted production backup or a provisioned recovery service.

`snapshot.sql` returns bounded-beta metadata/hashes only, never note text, tokens, keys or ciphertext. `recovery.mjs` signs the snapshot using an explicitly supplied Ed25519 key and compares restored data with an INDEPENDENTLY retained, pinned-public-key/latest-generation anchor. Metadata includes journal heads/revisions, tombstones, owner quotas, exact rate windows, auth-policy/session hashes, pilot policy/budgets/STOP/fence/uncertain lease and complete pilot permit/report/history digest. A stale prefix, missing tombstone, revoked session restored, counter refund, missing lease, STOP undo, different identity/generation or even an unexplained greater counter is BLOCKED. Unknown/new data requires reconciliation; a larger number alone is not history proof.

The helper accepts only a fresh <=5-minute independently obtained anchor and known generation; signature validity alone does not make an older anchor current. It **always returns activate:false**, even on equality. It is pure offline validation, not an actual external durable monotone anchor store, authenticated capture service or installed application gate. **No anchor service exists yet: hosted Save remains HOLD until owner approves/proves an independent latest-generation capture/retention/availability mechanism.** A quiescent snapshot must be signed/exported and independently acknowledged after every protected mutation (or writes held until checkpoint) if zero rollback loss is promised. Outage without a known latest anchor => no restore/resume; never infer no attempts occurred.

Future restore: keep web Save/auth/source OFF; isolate restored data/no login or provider access; verify immutable artifact/roles/catalog; retrieve independent latest anchor and verify signature/generation/age; compare metadata and J cryptographic replay. Quarantine/revoke restored auth sessions with a separately reviewed monotone revocation plan; do not silently reuse tokens. Preserve/reconcile every new tombstone, spent quota, STOP and uncertain lease. No in-place rewind of the source database. Missing keys/anchor/unknown usage => HOLD, not reset or fresh policy.

## Reproduce offline evidence

```sh
npm ci --ignore-scripts
# PostgreSQL15+ tools must be installed; tests fail instead of skipping. Optional paths:
# SCOUT_TEST_PG_BIN=/path/to/bin SCOUT_TEST_PG_SHARE=/path/to/share
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-journal-deployment/run.sh
node --test tests/v4-journal-deployment/scope.test.mjs
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-journal-deployment/parent-regression.sh
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
node tests/v4-thesis/built-off.mjs
bash scripts/archive-tool.sh check 76dea8aab3f26eef39c2fcbc1b0b37d13180388f
```

The independent actual-tree reviewer freezes EVERY parent byte/mode and allows exactly19 new files, with mutation controls. Original parent guards intentionally reject arbitrary future paths. Rather than edit/skip/waive them, CI runs ALL original guards/full npm tests unchanged in exact detached #230; current package tests run against combined actual SQL and actual J. The current PR gets its own types/lint/build/installed-OFF/archive checks. Counts are reported separately, not described as `npm test` passing on a tree whose original scope guard rejects additions. The immutable parent browser suite rechecks320/390/1280 Save/Load/history/axe/keyboard plus legacy auth/STOP, without editing C/A or uploading private fixtures. No new UI screenshot is warranted for an ops-only change.

## Founder approval card — no approval requested for execution now

1. **Review package:** exact draft SHA + artifact SHA256, green local/native/parent/mobile CI, independent security review. Approve code review only; no merge or hosted operations implied.
2. **Separate infrastructure/migration GO:** identify existing Neon project + NEW isolated database/branch boundary and exact primary host, backup/PITR limits/costs, role ability/collisions, encrypted backup/key escrow and trusted anchor plan. Approve precisely the reviewed schema/role artifact on that target. Provisioning and hosted SQL remain separate from credential enrollment. Never show secrets.
3. **Separate security setup GO:** legitimate A owner issuer/session + C↔B capability/CSRF binding review, five separate least-privilege credentials, true native TLS+PLUS observation, envelope keys/rotation/escrow, log redaction, retention/purge/backlog/notification and independently durable latest anchor. No active owner/source policy is included here.
4. **Separate Save acceptance/release GO:** exact protected deployment/commit, one invented test thesis only, verified owner and second-session Load, original→revision, nonowner/revoked/conflict/uncertain denial, terminal erasure queue and STOP drill. Default routes remain503 and Lens OFF until a separately reviewed binding. Source/Helius permission is an entirely separate GO; credentials alone authorize none.

**STOP** on wrong host/database/role, collision, altered source/catalog, TLS/PLUS downgrade, ambiguous ACK, uncertain attempt usage, missing anchor/keys, nonowner access, retention/backups unresolved or unverified auth/protection. No retries, auto-enrollment, source activation, new service, reset or convenience exception.

**Rollback now:** close the draft; no hosted state exists from this task. Future authorized rollback keeps Save/auth/source OFF, uses a separately authorized permanent STOP, and reverts code only while preserving current collector history, ciphertext, keys/escrow, tombstones, signed anchors, quotas, permits/leases and STOP history. Do not drop schema/database/roles, clear counters, destroy keys or restore an old database as an undo. Destructive retirement requires a distinct data/backup/physical-deletion review.
