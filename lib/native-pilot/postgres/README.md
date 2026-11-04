# Native PostgreSQL successor — code review only, acquisition OFF

Exact base #284 `905f5e68a2d53a3d1e54747e0b4a9632e96b0f8a`.
This replaces only B's factory storage assembly. Vercel project/deployment/branch/
origin/build identity, owner auth, fixed three-method Helius transport, A's shared
types, pure acquisition state machine and all original SQL/signed lanes stay
unchanged. `NATIVE_PILOT_ENABLED=false`, build pin=null. No connection/credential/
checkpoint construction is reached while OFF. No hosted state was inspected.

## Concrete interface for C

`Configuration` now takes `store: NativePostgresConfiguration` instead of file
directories/bootstrap. Its fields are server-only `dsn,ca,host,durabilityEnvelope,
custody,checkpointKey`. `openPostgresLedger(policy,store)` returns the ORIGINAL
`Ledger` method/status/state interface. `engine.ts`, RawBatch and NativeEvidenceV1
are byte-identical. C's existing OFF wrapper still reads no config. A's corrective
intake and C's actual positive Helius union are separate work; none is mocked into
this factory. The old fsync ledger remains unchanged for historical regression,
but the Vercel factory no longer selects it. No filesystem/serverless durability
claim, runtime impersonation, memory fallback, old grant/counter reuse or Turnkey
service/signing prerequisite is introduced.

### Native connection and authorization

Reuse pinned pg8.23.1 `StrictJournalClient` and its actual socket/PLUS WeakSet;
TLS certificate/SNI verification and **mandatory SCRAM-SHA-256-PLUS** remain.
Only the reviewed direct `TARGET.host` is allowed, never the real c-6 pooler,
another database or old login. The proposed new login is `unfarmd_native_login`.
Direct native TLS is intentional; no PgBouncer preference can weaken PLUS.
One fresh native client per operation, 1s connect timeout, 800ms statement/100ms
lock limits, no reconnect/retry or frozen-serverless idle-pool dependency. The
connection closes with bounded250ms cleanup before returning. Every operation starts a transaction, sets local
synchronous_commit=on/search_path/timeouts, checks actual PLUS and exact PG18
role/function hashes/owner/ACL/permanent-table restrictions, calls a fixed bound
definer function, snapshots the reply **before** COMMIT's await and acknowledges
only after COMMIT. Uncertain connections are destroyed. No raw DSN/error logging.

Physical Neon durability uses the EXISTING `verifyNeonAdmission` verifier with
the unchanged global owner PUBLIC key selected internally. Its opaque signed
physical-target record is checked before a client is created. This does NOT enroll
a new root or authorize a source request. The new row separately binds its exact
signed-admission SHA, tenant/timeline and independent-custody review SHA. The SQL
step compares those bindings, synchronous_commit, primary state and actual Neon
tenant/timeline. `fsync=off` alone grants nothing. `local-fsync` exists only for
the proposed throwaway PG18 tests; production assembly requires the signed Neon
record and fixed Neon host. No old installer/function/grant is modified, nor is
an old source/recovery authorization claimed to cover this new namespace.

Owner access STILL needs the existing actual Better Auth owner session, original
issuer tables and `unfarmd_v4_owner.policy`, enabled owner/issuer/audience/secret
binding and restricted auth login. None is enrolled or confirmed here. Vercel
Authentication/header/target pins alone never establish application owner access.

## Atomic state and independent currentness

New schema `unfarmd_native`, tables `policies/history`, four source-pinned
functions. One row lock serializes the whole policy across function instances;
immutable ordered hash-chain history includes initial identity, attempts, exact
debits, outstanding lease/fence, response hashes, clocks and permanent STOP.
THREE lifetime attempts, one lease, no refund/reset/renew/retry. Each method's
reviewed cost is reserved before key read/send. The original <=15min policy and
2.5s/5s source bounds remain; real latency acceptance is pending, not inferred.

Sequence: authenticated current checkpoint -> SQL row lock/history/currentness
proof -> transition -> COMMIT -> independent checkpoint CAS+durable ACK -> return.
Subsequent inspections recompare the full critical-state hash/head/sequence. A
stale concurrent caller holds; it cannot spend against an old anchor. A second
in-flight owner request can conservatively STOP the policy rather than create
parallel acquisition. No throughput or distributed-concurrency claim comes from
transcript tests. Clock rollback/expiry/fence failure can COMMIT STOP; that reply
is checkpointed as STOP and NEVER interpreted as reservation success.

COMMIT ACK loss, checkpoint ACK loss or process death between them means HOLD:
the attempted debit/lease stays spent/uncertain. Never resume automatically or
derive a new anchor from the restored database. An explicit STOP may commit even
when the checkpoint is unavailable; return UNKNOWN/HOLD until independently
confirmed. A previously reserved in-flight request cannot be recalled. Keep all
history/fences/leases and the current independent checkpoint through rollback.

### Actual checkpoint protocol/custody — NOT provisioned

Concrete `remoteCheckpoint` specializes the reviewed bounded HTTPS peer and separate
`anchor` MAC mechanism, with native protocol/namespace, policy+custody digest,
fresh nonce and authenticated reply binding. 750ms bound, no redirect/cache/retry,
no consumer/signing/provider authority. Stale responses, wrong policy/key/nonce,
reflection and uncertain CAS fail closed. Requests cannot select a source URL.

The proposed custodian is the **existing owner-controlled persistent checkpoint
runtime**, using unchanged reviewed `fileAnchor` in a NEW native-only 0700
directory /0600 append-only current-checkpoint log. `createCheckpointCustodian`
is code-only, unmounted, `CHECKPOINT_SERVICE_ENABLED=false`. It creates no files
or bootstrap and does not instantiate a Turnkey/signer service. Its two existing
native-only paths `/native-checkpoint/read` and `/native-checkpoint/advance` are
authenticated in the new native protocol/key namespace. Mount only these additive
paths on the approved independent runtime; never replace legacy handlers or reuse
their MAC key, files or grants. This keeps old signing/anchor selectors out of
the new dormant server artifact while reusing the unchanged MAC/anchor primitives.

**HOLD:** no actual origin/runtime/persistent disk/key or independent custody has
been selected or verified. Owner must separately approve an exact HTTPS origin,
dedicated MAC key fingerprint, native-only directory/bootstrap/policy, operator
and backup/restore custody. Retain its CURRENT head independently of Neon/PITR,
Vercel and any target restore. Vercel `/tmp`, the same Neon restore branch, two
self-consistent old copies or a bootstrap copied from restored state do not meet
this requirement. A configured review hash/MAC is not proof of physical custody.
If the proposed existing checkpoint runtime/disk does not exist, provisioning
one independently durable custodian is an explicit unresolved owner decision;
no service/price/free-storage assumption or setup permission is implied here.
The Vercel PostgreSQL persistence incompatibility is corrected in code; the
independent-custody operational blocker is NOT declared solved.

## Exact unexecuted database package

`schema.sql` is a fresh native-only PG18 delta in EXISTING `unfarmd_v4_pilot` on
the reviewed target (repository pins, not hosted confirmation). It creates NO
database, login, password, source policy or session. It fails on existing native
objects, not self-heals. `pins.json`/`pins.ts` contain the exact installer SHA256
and every function-body SHA; grammar parsing is not installation/permission proof.

Roles `unfarmd_native_owner`, `unfarmd_native_app`, `unfarmd_native_stopper` are
NOLOGIN/non-superuser/non-bypass/non-CREATE. App can execute step/stop only;
stopper can execute stop only; neither can read/write/truncate tables, create
objects or execute old source functions. The non-superuser PG18 installer needs
database ownership+CREATEROLE, explicit temporary owner SET+database CREATE.
Database CREATE is revoked; installer maintenance ADMIN is intentionally kept
while SET/INHERIT are disabled, so a later explicit seed can be authorized without
stranding ownership under PG18. Installer credentials NEVER enter the app.

Future separately approved sequence, NOT commands to execute now:
1. Pass the explicitly approved disposable PG18 job below, including real TLS/
   PLUS, non-superuser ownership/grants, concurrency, STOP and uncertain ACKs.
2. Independently review exact schema SHA/target/durability and custody manifests;
   confirm old schemas/history untouched. Install only this delta via authorized
   maintenance role. No rerun/overwrite of installed old migrations.
3. Separately create dedicated restricted native app/STOP logins; grant CONNECT
   and only the corresponding NOLOGIN role (`INHERIT TRUE, SET FALSE`, no ADMIN).
   Confirm no PUBLIC CREATE/TEMP/old function privileges; missing hardening holds.
4. Pure `bootstrapSql(policy,durability)` renders ONE atomic INSERT of approved
   public policy+initial history; no upsert/reset. Independently provision its
   exact seq0 checkpoint once under separate trusted custody. Preserve CURRENT
   checkpoint forever after the first transition, not merely the seed file.
5. Verify actual owner session, private API protection, immutable Vercel identity,
   server-only credential separation and exact combined A/B/C acceptance. Source
   and hosted Save stay OFF. No provisioning/SQL happened in this draft.

Retain public policy, counters, full history/receipts, STOP/uncertain leases and
independent checkpoints indefinitely until a separately reviewed preservation
policy exists. No raw RPC body, provider key, DSN/password, cookie or private
research text is stored by this ledger. Existing transient/60s source retention
and provenance stay unchanged. Close the draft to roll code back; later approved
rollback is permanent STOP + unmount, never DROP/reset/refund/reseed.

## Executed tests versus required additional approval

`bash tests/native-postgres/run.sh` is an audited non-SQL command allowlist.
It blocks actual pg connect/query, database/SQLite/workerd subprocesses and
external HTTP. It executes actual protocol/transaction-wrapper/checkpoint MAC/
DSN/catalog-proof negative tests with explicitly SYNTHETIC driver transcripts;
PG18 WASM SQL+PLpgSQL grammar parsing executes no database statements. Old guards
run unchanged on their immutable inputs. No blanket root/scheduler/Python
discovery is permitted. Prior #283's local SQLite boundary error remains disclosed;
it is not repeated or relabeled as evidence here.

`pg18-approval.mjs` is NULL, `pg18.sh` and `pg18-isolated.sh` reject before setup,
and the CI PG18 job is `if: false`. They were NOT invoked. Prepared tests use only
the existing fresh local harness, exact pinned PG18.6 build, synthetic local
credentials/certificates/anchor files and an OS network namespace with only lo
and no external routes. No inherited DB/credential environment, fallback or
hosted URL. Test installer is a genuine NON-superuser; app roles stay restricted.
Real install/SQL/concurrency/TLS/SCRAM/restart/outage claims remain UNPROVEN until
that separate job runs. Current transcript tests do not establish them.

**Exact additional approval requested (NOT granted):**
> Approve ONLY one validation of [this reviewed draft SHA, schema.sql SHA256 and
> pg18 harness hashes], using checksum-pinned PostgreSQL18.6 in synthetic
> throwaway local/CI clusters, non-superuser installer, temporary TLS/SCRAM-PLUS
> credentials and independent local test anchors, inside verified loopback-only
> OS network isolation. Permit native-only installer/bootstrap and adversarial
> role/concurrency/budget/STOP/fencing/clock/lost-ACK/restart tests; destroy test
> clusters afterward. No hosted Neon/existing database, real credential, provider,
> network egress, deployment, trust enrollment or source activation. Enable only
> the separately reviewed test gate/job; do not change acquisition gates.

## One finite operational dependency card — HOLD

After real local PG acceptance, honest A Helius intake and actual C union, owner
must separately approve exact hosted schema/roles, independent current-checkpoint
custody, existing owner login/protection and immutable Vercel deployment, dedicated
Helius key/debit/no-overage and retention. Then ONE exact mint / THREE attempts /
<=15min / [reviewed proposed3]credits, largest20 -> base64 account batch -> blockTime,
no retries/fallback/refresh, STOP on uncertainty. The old source permits/counters
are not reused; no account setup, paid service, SQL, key, hosted request, deployment
or source permission follows from this code-only draft. No founder CLI/device-code
or private-key request. Helius internal-business terms/paid-capacity background
are unchanged; do not invent a new enterprise-letter prerequisite.
