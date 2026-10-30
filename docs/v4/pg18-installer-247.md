# #247 — corrected PG18 non-superuser install

Owner approval is already recorded in #247. This is the corrected installer for the next owner-run attempt, not another approval request. No hosted command has been executed by this task. Base is exact #246 `334400a6535d198a36bc17433d7e2813d855e603`; no main/production change, credentials, source activation or infrastructure redesign.

## Owner Codespaces command

Use the exact final commit in the PR. In the existing repository terminal, one copyable command fetches that immutable commit, checks it out without force and runs the pinned installer:

```sh
# Replace REVIEWED_COMMIT with the exact SHA in the final PR/card, not a branch name.
git fetch origin REVIEWED_COMMIT && git switch --detach FETCH_HEAD && bash ops/v4-journal/install-reviewed.sh --execute
```

The final response/PR provides this command with the actual SHA filled in. Git stops on conflicting local edits; no work is discarded. Enter the existing **migration owner's** password only at the native psql prompt in Codespaces. No password/URL is placed in the command, environment, repository or chat. The script renders locally and verifies SHA256 **`e4e1cd5e8336cf93051a2bd9cb3999bce178e8e110df3b1d9e6ba7b82aa2afb3`** before opening ONE native psql session. Default script invocation (no --execute) only verifies offline. `--render` prints the exact SQL without executing.

It pins project target by the existing SQL identity guard, direct host `ep-tiny-truth-b4bx6xt9.c-6.us-east-2.aws.neon.tech`, port5432, existing database `unfarmd_v4_pilot`, DDL-only `neondb_owner`, CA/hostname verification and mandatory SCRAM-SHA-256-PLUS. It ignores old PG service/password/options selectors, disables psql startup files and uses ON_ERROR_STOP. No pooler, downgrade, retry, DB creation, authentication enrollment or Helius call. The real target is founder-reported; local tests are not a new hosted observation.

On definite SQL error the transaction rolls back. On uncertain completion, STOP and inspect the installation catalog using the already authorized owner procedure; never blindly retry or reset. The installer is replay-safe BEFORE optional supplements: matching exact release+catalog passes, drift fails without repair. After an auth/source supplement, the extended catalog intentionally differs: do not rerun the base as a repair step. Both previous failed attempts were owner-verified empty; the old `3416...` SQL is obsolete.

## What was corrected

- Transaction-local `createrole_self_grant=set` on PG16+; PG18 CREATEROLE supplies SET without inheriting created app owners. No manual PGOPTIONS workaround or permanent setting. PG18 represents ADMIN and SET via distinct grantor rows; tests verify effective ADMIN+SET and absence of INHERIT, not an incorrect per-row assumption.
- Original J/rate/A input SQL remains byte-exact/provenance-pinned. The offline renderer scopes schema/table REVOKEs to their real owner, temporarily grants boundary-owner CREATE on public for ownership transfer, then revokes it. Public remains owned by `pg_database_owner`.
- Rate table/function transfer occurs while the migrator still owns the rate schema. Temporary CREATE/USAGE for the new owner and database CREATE for schema transfer are removed or absorbed solely by ownership of its own schema. No new owner keeps database/public CREATE.
- Trigger creation runs as each table owner with temporary EXECUTE/USAGE, revoked afterward. Neon-only triggers follow the same rule. No trigger/function body, RLS policy, immutable journal, monotone STOP/fence/quota rule or uncertain-ACK behavior is weakened.
- Installation detection uses public catalogs; verification/metadata insertion run as the actual NOLOGIN deployment owner. Whole emitted sources and hardening are version/digest-bound; replay never silently repairs grants/ownership.
- Issuer-only supplement uses its actual object owners for GRANT/REVOKE and its own transaction-local role setup. All16 roles remain NOLOGIN; no users/sessions/policies/keys/source budgets are enrolled. Auth rate function body unchanged. Supplement SHA256: **`355ab3abf775f7b8bf74a9f1cf50f3e93618d34f80bda9544ba7a4bdc68eff55`**. This supplement is tested/ready in the existing sequence; the single command above executes only the base installer.

Both current runtime migration pins and owner-release/auth SQL pins are updated. Old prospective signatures/digests must not be reused. The source-only supplement is untouched; no source activation is part of this correction.

## Genuine local proof and limits

Source/hash-pinned real PostgreSQL18.6. Fresh database owned by a real NON-superuser `neondb_owner` equivalent (CREATEROLE/CREATEDB/BYPASSRLS, no superuser), `public` owned by `pg_database_owner`, real local CA/TLS/SCRAM-PLUS. ALL installation/replay/supplement statements execute through that non-superuser, not through a superuser SET ROLE illusion. A setup-only superuser creates the disposable test actor/database and inspects results.

Tests reproduce the old missing SET ROLE failure and rollback, the still-broken self-grant workaround on stock PG18 schema REVOKE, and the reported public ownership transfer failure after preceding owner scoping. Corrected conventional install/replay succeeds without PGOPTIONS; all owner/ACL/NOLOGIN invariants and injected CREATE drift detection pass. Issuer-only supplement also succeeds while preserving original J/rate/STOP function bodies and empty state.

For the full Neon DDL permission sequence on stock PG18, a clearly marked LOCAL test copy replaces ONLY the vendor hardware preflight with the existing strict fsync-on/primary/database preflight. Every emitted DDL/ownership/function statement is unchanged; the real shipped artifact still rejects stock PG before DDL. No fake quorum function, environment waiver or provider proof is introduced. The positive hosted vendor state is not claimed from this substitution. This isolates the proven PG18 permission bug from Neon's already-reviewed alternative durability architecture.

Current auth/native/browser tests exercise the actual corrected package and release pins. All ancestor guards remain unchanged in exact input trees. Current full-patch/mode/source hashes and negative mutation checks protect every other byte/history/collector/source gate. Full-root replay is labeled as exact inherited input coverage, not current-tree npm test success in the presence of intentional old byte freezes.

```sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-pg18-install/run.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-pg18-install/replay.sh root
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-pg18-install/replay.sh history
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
git restore -- next-env.d.ts
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-pg18-install/replay.sh built
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-pg18-install/run.sh browser
bash scripts/archive-tool.sh check 334400a6535d198a36bc17433d7e2813d855e603
```

Rollback before execution closes the draft; no hosted state changed. A failed transaction preserves prior state. Never drop/reinstall or roll back a later successful used ledger. Preserve collector history, ciphertext, keys, tombstones, revocations, counters, leases/fences and terminal STOP. No new activation/production permission is requested or implied by this installer fix.
