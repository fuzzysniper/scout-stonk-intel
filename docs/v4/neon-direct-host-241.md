# #241: exact direct-host correction; all hosted actions HOLD

Dependent on #240 `add2a47a3707cca0d380325b09552b0aff0613ad` (tree `7c7b65de4e6d05918b5572fe7b8248e2b6eb754b`), targeting its `fix/239-neon-durability-contract` branch. #238/#234/#235/#236 and collector history remain immutable. Latest main observed `5bb26051f4183b081625387ebd3d8609fa46e620`; no rebase or upstream edits.

## Reproduced defects and correction

The owner reports these nonsecret target facts in [#241](https://github.com/fuzzysniper/scout-stonk-intel/issues/241); no hosted inventory/SQL/credential query was performed by this task:

- Project `twilight-hall-57571802`, branch `br-sweet-voice-b4x4et5q`, PG18, region us-east-2.
- Exact direct: `ep-tiny-truth-b4bx6xt9.c-6.us-east-2.aws.neon.tech`.
- Pooler: `ep-tiny-truth-b4bx6xt9-pooler.c-6.us-east-2.aws.neon.tech` — ALWAYS rejected.
- `unfarmd_v4_pilot` now exists. Only privileged `neondb_owner`, no UNFARMD roles/schemas/policies installed. Do NOT create/recreate a database.

#240's signed-admission/SQL hostname regex rejects the real `.c-6.` direct hostname. Exact equality replaces that shape in both gates, including a NOT-NULL-safe table CHECK. The renderer asserts both copies and recalculates migration/function/release pins. Native acceptance also requires this exact host before touching a client. Host rotation needs new code review + signed immutable owner approval; no normalization, wildcard, shard fallback or automatic discovery.

One issue premise was not reproduced: the actual pooler DOES contain `-pooler.`; old `configuration()` already rejected it. A distinct real defect WAS reproduced: directly constructing `StrictJournalClient` with that pooler bypassed configuration and read a synthetic password twice. Constructor-level endpoint-label rejection now happens before pg/password processing. The actual pooler, uppercase and other pooler labels are covered. No network was used in this reproduction.

The generic pure `configuration(dsn,approvedHost,ca)` retains its existing explicit-caller pin contract/backward compatibility. The new pure `pinnedNeonConfiguration(dsn,ca)` fixes that pin to this project's exact direct host; use this wrapper in the future owner procedure. It cannot connect, authorize a role, sign/enroll admission, read an env/key or activate anything. The existing strict native client's CA/SNI/TLS1.2+, pg8.23.1 source hashes, mandatory SCRAM-PLUS server signature and opaque socket proof are unchanged. Never use `neondb_owner` as an application/probe principal.

Signed record verification still requires the independently trusted Ed25519 public key, canonical duplicate-key-safe payload, exact project/branch/database/tenant/timeline/PG/evidence/artifact/native-acceptance/recovery policy and immutable capability context. No owner key, signature, selector or DB record is installed. A test signature is not a real owner approval. The new artifact/evidence pins invalidate old prospective signatures; do not reuse #240's SQL digest.

Conventional fsync-on remains default. Provider-specific quorum checks, row locking, immutable J/erasure, permanent STOP, quotas/credits, fences, uncertain-ACK latch/no retry/refund, legacy source gates, auth/CSRF and installed 503/OFF behavior remain unchanged. SQL cannot attest actual safekeeper disks/quorum. Read-only native compatibility is not a durable-write or activation proof.

## Shortest future hosted sequence — separate approvals, NOT executed

1. **Code/artifact GO:** review the exact dependent head and normal upstream release order; render ONLY locally:

   ```sh
   node ops/v4-neon-durability/render.mjs > /tmp/unfarmd-neon-reviewed.sql
   sha256sum /tmp/unfarmd-neon-reviewed.sql
   ```

   Match the exact reviewed SQL SHA in the PR. No `CREATE DATABASE` or credentials are included. Recheck project/branch/existing DB/direct host in the owner console; unexpected schemas/roles/state => STOP, never drop/reset/repair automatically.

2. **Migration GO:** independently approve that SQL SHA + exact existing target + NOLOGIN roles. An owner operates privately through a direct native PostgreSQL client, CA/hostname verification and mandatory SCRAM-PLUS. Privileged DDL login is for installation ONLY; never route it into the app. A privately prepared libpq service (outside checkout/chat/history) must pin exact direct host,5432,`unfarmd_v4_pilot`,verify-full,channel_binding=require,reviewed CA and the separately authorized DDL identity. Example future command, NOT run here:

   ```sh
   PGSERVICE=unfarmd_v4_migration psql -X --no-password -v ON_ERROR_STOP=1 -f /tmp/unfarmd-neon-reviewed.sql
   ```

   No connection URL/password on the command line, agent output or git. The existing renderer's transaction, identity, empty-target/collision and catalog guards are authoritative. Roles stay NOLOGIN; approval/source/owner-policy tables stay EMPTY. Failure/uncertainty => HOLD, no rerun until state is independently reviewed. Never point this at `scout_live`, neondb or another branch.

3. **Restricted-native GO, AFTER migration:** separately approve one least-privilege LOGIN/credential setup outside this task, using exactly the installed capability and no CREATE/TEMP/BYPASSRLS/additional memberships. Only then can the read-only acceptance probe succeed. Prepare the pinned pg client privately:

   ```js
   // OWNER-ONLY future procedure; values supplied privately, never printed or read by an agent.
   const config = pinnedNeonConfiguration(ownerSuppliedDsn, reviewedCa);
   const client = new StrictJournalClient(config);
   const result = await runNativeAcceptance(client, {
     purpose: PURPOSE, host: NEON_DIRECT_HOST,
     tenantId: approvedTenant, timelineId: approvedTimeline,
   });
   ```

   Import native exports from `ops/v4-journal/native-tls.mjs`, probe/PURPOSE from `ops/v4-neon-durability/probe.mjs`. Exactly one connection, existing bounded deadlines, read-only transaction/one catalog query/ROLLBACK, no step/RPC/admission reset or retry. `invalid_target`, TLS/PLUS/role/provider mismatch, timeout or uncertain execution => STOP. Internal API SSL=false does not prove external TLS. Hash exact result bytes privately and bind to owner GO/head/target/time; `durabilityProven:false`, `saveGo:false`, `sourceGo:false` remain true statements even for compatible native shape.

4. **Still HOLD:** independent latest signed rollback anchor/KMS/owner-key escrow, encrypted backup/physical retention/restore acceptance, authentic owner sessions/CSRF and signed one-time matching provider enrollment/public-key pin. Six-hour PITR can rewind STOP/credits/tombstones; quorum does not solve it. No such infrastructure/key/auth is configured here. Private Save or bounded Helius/source GO and production merge/deploy require further independent approval.

Do not try the native probe before migration/restricted credentials: it would be a misleading role failure. Do not test with privileged owner credentials to work around that order. No hosted action/absolute window is selected by this PR.

## Offline evidence and review

All real native I/O is loopback disposable PostgreSQL18.6/TLS only. Actual target strings are used ONLY in pure format/signature/SQL CHECK tests; no DNS/connection to them. Positive native provider/quorum branch is unperformed. Tests cover constructor password-read avoidance, exact signed target, wrong shard/region/project/branch, real pooler/delegation/punycode/Unicode/case/trailing dot, duplicate URL settings/ports, immutable contract SQL, no generic fsync-off, roles, actual strict PLUS/CA failures, J/rates/concurrent STOP/credits/restart/lost ACK and current app source-OFF.

```sh
npm ci --ignore-scripts
# Use source-built PG18.6 from the existing source/hash-pinned build script; export its printed paths.
bash tests/v4-neon-durability/build-pg18.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-host/affected.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-host/replay.sh root
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-host/replay.sh history
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
git restore -- next-env.d.ts
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-host/replay.sh built
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-host/browser.sh
bash scripts/archive-tool.sh check add2a47a3707cca0d380325b09552b0aff0613ad
```

New finite review pins the COMPLETE nine existing-file patches and all named additions, every other #240 byte/mode and all source ancestors. Original #240/#238/input guards execute unchanged in frozen input trees; current affected runtime, current browsers, actual optimized build and new negative tamper tests execute separately. No skipped/deleted guard, broad path/env waiver or old compiled artifact. Full root npm tests are reported as exact detached #238 through #240, not mislabeled current-tree npm test success.

**GO:** code-only hostname correction review. **HOLD:** migration/credentials/native hosted test, auth/storage/source/production. Rollback now closes draft. Future code rollback keeps sources/Save OFF and preserves current collector history, every ciphertext/key/tombstone/anchor, revocation, spent budget/fence/lease/terminal STOP. Never drop/reinstall/rewind/refund or retry an uncertain operation.
