# Existing owner approval: disposable native PostgreSQL18 validation

Input #286 `55a15a939d31ea9f7b79a289f930d9e2d8026d30`, tree
`218f5c1f7e9243176fccafe137bd7c6369e5c251` remains preserved.
All runtime adapters, source-function bodies, original guards, trust, A/C and source gates
are unchanged. The first real PG18 run reproduced a single installer defect: the
redundant ADMIN TRUE self-grant fails with SQLSTATE0LP01. Remove only that option;
PostgreSQL's automatic creator ADMIN grant remains. Real tests assert ADMIN survives
and implicit SET/INHERIT are disabled after installation. This follow-up records the already granted approval:
https://github.com/fuzzysniper/scout-stonk-intel/pull/284#issuecomment-6622419328
and correction:
https://github.com/fuzzysniper/scout-stonk-intel/pull/286#issuecomment-6642663957
No repeat approval is needed for this scoped test.

Historical run41777213854 had five successful non-SQL jobs and one skipped PG
job. It is never reclassified as SQL acceptance. The original README at that
input records the stale approval-null state; this file supersedes that test-only
hold. Independent hosted custody and every operational hold remain.

## Exact command allowlist

1. `npm ci --ignore-scripts` (locked build dependencies only).
2. `bash tests/v4-neon-durability/build-pg18.sh` builds the unchanged
   checksum-pinned public PostgreSQL18.6 source. No service/database created.
3. `bash tests/native-postgres/pg18-isolated.sh` verifies test approval+installer,
   exact binaries, enters a new OS network namespace, enables only loopback and
   drops root before passing `env -i` to the SQL runner. No inherited real
   DSN/proxy/credential/key. Native allowlisted local TLS clients only.
4. `pg18.sh` compiles only the native adapter, runs `pg18.test.mjs` then the
   unchanged six-case synthetic TLS wire downgrade suite. No root/scheduler
   discovery, SQLite or legacy DB schema/reset commands.
5. The finite review and unchanged prior review replays, existing explicit
   source-OFF/non-SQL regression/build/browser/archive commands in CI.

Before any cluster or SQL, the preload verifies only `lo`, internal loopback
addresses, no external IPv4 routes and only loopback IPv6 routes, plus absence
of inherited credential/proxy variable names. OS isolation is required even if
JavaScript network guards pass. The fresh fixture only creates a synthetic
local database/native schema, synthetic non-superuser installer and NOLOGIN
app/STOP roles, synthetic TLS material and independent local test anchor files.
It executes no installed/hosted schema or old admission reset. No server starts
if OS isolation fails. Local workspace currently cannot map user namespaces and
has no sudo; no SQL runs there. CI's isolated unshare job is the execution path.

## Actual evidence, not transcript equivalence

CI must EXECUTE the required PostgreSQL job and pass; skipped is not acceptance.
Tests exercise real native pg TLS/SCRAM-PLUS, owner/grant checks, real concurrent
Node processes, atomic reservations/debits, method ordering/fencing/replay,
permanent STOP/clock rollback, rollback and lost COMMIT/checkpoint ACKs,
independent checkpoint outage, database outage/crash/restart and immutable history.
The provider is disconnected; a successful reservation is the only simulated
send marker. No authentic Helius/Neon/Vercel observation is claimed.

Corrected installer SHA256 is
`2ddbab84d1165686ad413dc2cb4886cb66231c4a7cc6f2ffd0f0881396180643`.
`validation.json` pins every changed harness/job; original #286 reviewer bytes
are unchanged and replayed at55a15a9. Validation outcomes/actual version and CI
are attached to the successor draft and sent to C with exact tested SHA.

## Unchanged operational HOLD

Independent hosted checkpoint custody/origin/disk/key/backup, real owner session,
signed physical durability, hosted role/schema installation, deployment/source
and key/debit/retention approval remain separate. A's corrected Helius intake is
#285 `3079cb4baf9c651e0febbf0e336229448f1144b3`; C must test its actual union.
No provider/hosted SQL/real credential/provision/billing/deploy/activation/merge
is authorized or performed by this test gate. Local clusters are destroyed.

Initial actual SQL run41929397486 atc9ec0bd failed at installer setup (0/16),
not a database acceptance pass. OS isolation and PostgreSQL18.6 were established.
The failure is retained as evidence; final results must use the corrected head.
