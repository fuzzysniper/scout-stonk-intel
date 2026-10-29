# Neon durability admission — code review GO, hosted operation HOLD

Dependent on exact #238 `1133d6813e6913a6846cd08f11117f2a0635d6b1`, tree `5af0ebf9b34905513f127f1a74dac3e09bead0f4`, targeting `integration/v4-final-source-off`. #234/#235/#236 remain ordinary immutable ancestors. Latest observed main `320d216f2b9f278ffa623b29fe367c6fcc50be08` and collector history are untouched. No hosted SQL, connection string/password lookup, resource creation, settings/keys, provider call, deployment, merge or activation occurs here.

## Conclusion and evidence

**Neon's documented synchronous safekeeper quorum can provide the commit durability this design needs; compute-local `fsync=off` alone is not evidence of lost durability.** This is a conditional architectural conclusion, not a measurement or certification of this project's storage. Current default code correctly refuses the unfamiliar configuration. A generic fsync-off exception would be unsafe.

Official evidence, retrieved2026-10-29 and hash/revision-pinned in [evidence.json](../../ops/v4-neon-durability/evidence.json):

- [Neon architecture](https://neon.com/docs/introduction/architecture-overview): commit success follows WAL quorum acknowledgment, independently of compute-local cached pages. Object storage/page materialization is asynchronous; do not substitute it for the commit boundary.
- [Pinned proposer implementation](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/pgxn/neon/walproposer.c) computes the acknowledged quorum position. [Postgres bridge](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/pgxn/neon/walproposer_pg.c#L2175) presents that committed position as synchronous replication's flush acknowledgment.
- [Safekeeper storage](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/safekeeper/src/wal_storage.rs) distinguishes written versus flushed WAL. Its configurable development `no_sync` path is NOT evidence about production configuration. We cannot inspect actual safekeeper disks/quorum/AZ placement from application SQL.
- [Registered Neon identity settings](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/pgxn/neon/libpagestore.c#L1481) are postmaster settings; ordinary custom-GUC placeholders are insufficient.
- [External TLS/channel binding](https://neon.com/docs/connect/connect-securely) and [managed roles/configuration](https://neon.com/docs/reference/compatibility) distinguish public Postgres authentication from the internal database API.

Provider outage/lost quorum may block or fail a commit: that is unavailability/uncertainty, never permission to issue RPC. After uncertain COMMIT, retain the existing process terminal latch, one best-effort STOP, no retry/refund/publication. An acknowledged reservation precedes the external request; a lost completion ACK cannot erase its spent budget. Fresh replicas/process fences, terminal STOP and atomic row locks remain exactly the original ledger algorithm. Consensus tolerates its specified failures, not arbitrary provider corruption, simultaneous loss beyond the fault model or an owner-requested PITR rewind.

## Founder-reported target, not newly queried here

Existing project `twilight-hall-57571802` / `unfarmd-v4-private`, branch `br-sweet-voice-b4x4et5q`, region `aws-us-east-2`, reported PG18.6. Only `neondb` and privileged `neondb_owner` currently exist. **Project creation did not authorize `unfarmd_v4_pilot`, roles or migrations.** That proposed database remains nonexistent/unapproved. Default owner/BYPASSRLS credentials must never be runtime principals.

Reported `fsync=off`, `synchronous_commit=on`, `synchronous_standby_names=walproposer`, `full_page_writes=off` fit the documented architecture. Internal API `ssl=off`/`pg_stat_ssl=false` neither proves nor disproves external TLS/PLUS. No actual native credential/TLS/PLUS observation exists. The published source revision is an evidence pin, not the hosted build's attested revision. Six-hour history is not an independent rollback anchor or complete backup/deletion policy.

## Minimal code and migration contract

Exactly one existing runtime file changes: ledger's proof dispatch optionally accepts an opaque `NeonAdmission`. Its conventional three-argument call still executes byte-identical `PROOF_SQL`/`STEP_SHA`, including literal fsync-on. No source profile, public route, auth issuer, J crypto/repository, producer, key selector or environment flag changes. Installed APIs still503/OFF, default Lens NOT SAVED/grey.

`verifyNeonAdmission` requires a canonical, duplicate-key-safe, versioned Ed25519 owner-signed record and an explicitly trusted server-side public key. It rejects wrong versions/modes/project/branch/database/region/host/major, poolers, missing native acceptance/recovery-policy hashes, altered evidence/artifact pins or cloned/forged capabilities. It installs nothing and reads no env/keys. An arbitrary browser owner claim or signed record from a different key is not authority. Future code review must pin the actual owner's public key; there is no configured key or automatic provider selection now.

Version `unfarmd-neon-durability/1`, mode `neon-safekeeper-quorum/v1` binds the exact approved direct hostname, tenant/timeline, project/branch, proposed database, PG18, evidence/migration digests, independently reviewed native-acceptance and recovery-policy references and owner approval ID. These references are owner attestations, not a magically installed probe or backup service.

The OFFLINE Neon candidate renderer starts from the original three-schema package, verifies exactly one step-body substitution and one installer predicate substitution, and emits a distinct release/catalog digest. It leaves the original conventional renderer and all original SQL sources unchanged. Render only (no connection):

```sh
node ops/v4-neon-durability/render.mjs > /tmp/unfarmd-neon-candidate.sql
sha256sum /tmp/unfarmd-neon-candidate.sql
```

The new contract table is EMPTY; every credential role remains NOLOGIN. No users, source policy, counters or approval row is installed. Replaying the wrong conventional/Neon artifact fails rather than converting modes. This is a new isolated installation proposal, NOT an update/drop/reinstall of any deployed/shared database.

Actual Neon-mode admission requires ALL of: matching immutable contract hash; exact registered project/branch/tenant/timeline; PG18 primary; transaction read-write; synchronous commit ON and exact walproposer setting; expected fsync/full-page configuration; all17 critical tables logged; exact step/admission function bodies/owners and original role proof; the actual pinned pg8.23.1 StrictJournalClient's opaque verified TLS/SCRAM-PLUS proof on the same connection/hostname. The pilot role must be exactly its restricted login/capability, with no other memberships/admin options or DB CREATE/TEMP. No wrapper substitutes a Boolean result, no memory admission or fallback.

Write triggers additionally cover J originals/revisions/owner quotas, rate tickets, pilot state/permits/reports/history and erasure/tombstones. Missing/mismatched evidence rejects the transaction, preserving existing records and charges. The immutable contract rejects UPDATE/DELETE/TRUNCATE; it cannot reset a spent session or silently follow a new timeline. Original monotone STOP/fence/counter and due-only erasure guards remain. A provider failure may prevent STOP acknowledgment; never report an unacknowledged STOP as durable. No automatic restart/reclaim is introduced.

## Separately approved native acceptance probe

`ops/v4-neon-durability/probe.mjs` is uninstalled, has no executable CLI/environment/DSN reader, public endpoint or retry. Default call returns disabled before touching a client. A future OWNER-operated call requires distinct purpose `READ_NEON_COMPATIBILITY_ONCE`, a prepared source-pinned strict client and exact nonsecret host/tenant/timeline pins. Existing `configuration()` enforces direct Neon host, exact proposed DB/roles, verify-full CA/SNI/TLS1.2+ and mandatory PLUS; no pooler/plain SCRAM/SSL downgrade. Do not use an HTTP database API, copied browser cookie or privileged default role.

The actual native socket and verified SCRAM-PLUS server signature precede ONE read-only transaction: bounded SET LOCAL settings, one fixed parameterized catalog/settings query, ROLLBACK. No `step`, reservations, table writes, owner issuance or Helius. Connection<=1s, outer<=2.5s plus<=100ms shutdown; no retry. Results are categorical with no DSN/password/role token values. A successful shape observation includes a target-binding SHA256 and local completion clock, **not a WAL/commit clock**, and always `durabilityProven:false,sourceGo:false,saveGo:false`.

Operator procedure, only AFTER separate GO:
1. Pin this reviewed head/artifact and OWNER-approved new target/roles. Prepare credentials privately outside checkout/chat/history; never `get_connection_string` through an agent or print a URL. Confirm the existing direct host belongs to the exact project/branch/database and CA roots are trusted.
2. Configure one restricted client using the existing server-only `configuration(ownerSuppliedDsn,approvedHost,reviewedCa)` and `StrictJournalClient`. Nothing in this task performs that step.
3. Invoke exactly once: `await runNativeAcceptance(client,{purpose:PURPOSE,host:approvedHost,tenantId:approvedTenant,timelineId:approvedTimeline})`. Retain the JSON privately, hash exact bytes, bind it to the owner GO/reviewed head/observed target and clock. No SQL text editing or second attempt after uncertain execution.
4. `disabled/invalid_target`: no proof. `blocked_role`: never replace with the privileged owner. `blocked_provider_shape`: HOLD; obtain vendor clarification/review, not a looser check. `unavailable_uncertain`: STOP, no inferred success/retry. `native_plus_and_neon_shape_observed` proves only this client/configuration observation; provider trust/backup/anchor and separate enrollment/source approvals remain.

## Honest local evidence and immutable source review

Build source-pinned PostgreSQL18.6 under /tmp (no daemon/service registration) using `bash tests/v4-neon-durability/build-pg18.sh`, then use its printed SCOUT_TEST_PG_BIN/SHARE for disposable tests. Pinned official source archive hash is checked before extraction. No hosted signal is fabricated.

```sh
npm ci --ignore-scripts
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-durability/run.sh
node --test tests/v4-neon-durability/scope.test.mjs
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-durability/replay.sh root
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-durability/replay.sh
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-neon-durability/browser.sh
bash scripts/archive-tool.sh check 1133d6813e6913a6846cd08f11117f2a0635d6b1
```

Tests distinguish real local PostgreSQL/TLS/role/transaction behavior from synthetic signatures/settings. A real fsync-OFF local server with walproposer label and matching-looking custom settings is rejected: placeholders are not registered postmaster identity, and it is not Neon. The positive end-to-end Neon/quorum branch is **unperformed**, intentionally not portrayed as local proof of a hosted provider. Current atomic STOP/concurrency/restart/lost-ACK cases run unchanged against the actual modified runtime with conventional durability. Actual-tree browser99+nativeSTOP5 regressions exercise the same default path.

Current finite reviewer pins one complete ledger patch plus19 named additions, every other #238 byte/mode and every #234/#235/#236 ancestor. Every old source guard remains byte-exact and executes unchanged in exact detached input trees. Full root npm tests execute in exact #238; the actual modified runtime additionally executes all unchanged affected functional tests plus new contract/PG18 cases. Do not label the detached run as `npm test` passing on the current tree: original byte-freeze guards deliberately reject new paths. Current-tree types/lint/build/archive and independent mutation guards are separate. The unchanged original built-OFF audits run in a frozen parent source context with its .next linked to the ACTUAL current build and BUILD_ID checked before/after; this avoids altering the old byte freeze and never substitutes an old compiled artifact. No env/prefix waiver, removed assertion or skipped test.

## Remaining GO/HOLD and shortest owner decisions

**GO:** code-only review of the provider-specific semantic contract and migration candidate. **HOLD:** actual hosted compatibility, migration, owner auth, Save and source. Conventional fsync-on remains the only default selection.

1. Owner accepts the documented provider commit guarantee/limitations, exact candidate digest and approves creating ONLY the proposed isolated database + reviewed NOLOGIN roles/schema on the existing project. No action authorized here. If a literal local-fsync/independently observable quorum guarantee is nonnegotiable, choose conventional durable PostgreSQL under separate hosting approval rather than weaken this contract.
2. Separate credential/least-privilege and one native read-only acceptance GO; project-only creation or credentials alone never authorize queries. Registered identity settings/permissions remain unobserved; missing values cannot be waived. No default owner/BYPASSRLS runtime, broad pg_monitor/pg_read_all_settings grants, settings changes or hidden provider fallback.
3. Independent signed latest-generation rollback anchor/capture, KMS/owner DEK escrow, encrypted backups, retention/purge notification and restore reconciliation must be approved/proven. Neither quorum nor six-hour PITR prevents intentional rewind of STOP/credits/tombstones. Current anchor helper always activate:false; no independent service exists. Missing/old anchor, unknown attempt, lost key or ambiguous ACK => HOLD. Never reset/refund or restore a spent ledger as restart.
4. Separate signed provider-record enrollment/server public-key pin + genuine owner auth/CSRF/private Save release/acceptance. The identical verified record would be inserted ONE time by an independently authorized owner transaction, not by runtime roles; no such row or key exists now. Source/profile/time/credit GO and production merge/deployment are further independent approvals. No absolute session window is selected.

Rollback now closes the draft. Future code-only rollback keeps sources/Save OFF, preserves newest collector history, encrypted originals, keys/tombstones/anchors, revocations and every spent quota/lease/fence/STOP. Keep the provider contract immutable; do not drop/reinstall, revert database state, enable fsync-off fallback or pretend uncertainty is a refund.
