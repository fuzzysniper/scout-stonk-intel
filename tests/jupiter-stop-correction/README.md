# Correct committed clock-rollback STOP — dependent on exact279

Base **0ba7b2355acb72386f0d4f810f3601290cacb0cb**. No original PR/head is updated.
This correction changes only the experimental integration's STOP/result contract,
necessary test fixtures/types/docs, exact-branch Preview suppression and new tests.
All existing guards remain unchanged and replay on their exact immutable inputs.
App/C/A/global trust, legacy source gates, SQL, recovery and collector bytes are frozen.

## Reproduced defect and correction

On exact279, `transition()` detects backward clock movement and recursively commits
`stop`. That return was `{status:'ok',...}`: `beforeCall()` interpreted it as permission
to call the provider, and the reservation caller could report success. A real PG18
regression installs those exact original bytes into a NEW disposable cluster and
reproduces this for BOTH `call` and `reserve`; it does not merely mock the response.

New SQL returns `{status:'stopped',operation:'stop',stopped:true,...}` for fresh and
idempotent STOP. Successful non-STOP operations return their exact operation and
`stopped:false`. The adapter validates those fields and anchors a committed STOP
even if the requested operation was a read/check. It never throws inside SQL to
undo STOP. Local STOP latching only reduces requests; the real database + independent
current anchor remain authoritative. Missing/contradictory/old-schema replies HOLD.
The database receipt is bounded-copied and frozen BEFORE the asynchronous anchor
wait. A committed real-PG regression deliberately mutates the original receipt in
that wait: it fails without this snapshot and cannot change STOP into permission
with it. Returned known-STOP evidence never depends on a shared mutable object.

Provider caller requires the literal boolean `true`; truthy diagnostics cannot pass.
The authority requires `ok / reserve / stopped:false`; C's public boundary requires
`reservation_source_off / stopped:false`. Explicit owner STOP reports acknowledgment
only after an exact STOP receipt and anchor acknowledgment; lost results remain
UNKNOWN/HOLD. Counters, grant states/fences/nonces/operation IDs and ordered histories
are never reset, refunded, reclaimed or deleted.

This fixes authorization **from a committed STOP response**. It does not promise to
unsend an operation already admitted/transmitted before a later concurrent STOP.
No source call or acquisition exists in this release.

## Actual disposable PostgreSQL18 verification

```sh
# Preparation downloads/builds only public, checksum-pinned PostgreSQL18.6 source.
# Requires gcc/make/bison/flex/m4/openssl headers; emits SCOUT_TEST_PG_BIN path.
bash tests/v4-neon-durability/build-pg18.sh
# Set the emitted path; never supply a DSN, PGHOST, DATABASE_URL or existing cluster.
SCOUT_TEST_PG_BIN=/tmp/the-emitted-build/install/bin bash tests/jupiter-stop-correction/run-pg.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node --test tests/jupiter-stop-correction/unit.test.mjs
```

`run-pg.sh` fails unless a private network namespace can be created. It brings up
loopback only and drops to a non-root user. CI may use sudo for that ephemeral
namespace then drops back to the runner UID; no sysctl, host routing or service is
changed. The Node preloader independently requires only lo/no external route,
rejects external TCP/DNS before dispatch, maps exactly ONE synthetic Neon-shaped
hostname to loopback, and restricts Unix sockets to fresh harness paths. Only that
fixture gets the generated test CA; TLS hostname/certificate and mandatory PLUS
checks are NEVER disabled/replaced. No ambient credential/env or existing DB path
is read. Every test creates and removes a fresh mktemp cluster with synthetic roles.

The pinned real native client and actual function/permission handshake run against
PostgreSQL18.6. Successful PLUS proof requires authenticated SASLFinal server verifier
and verified TLSSocket; tests also query server TLS state. Wrong CA/hostname/password,
server cleartext authentication, function-body/PUBLIC-execute/owner-membership drift
deny. No mocked connection-attestation bypass is used in this suite.

Installer executes under a NON-superuser database owner with CREATEROLE. PG18 retains
that migration operator's automatic ADMIN membership for roles it creates; temporary
SET/INHERIT is revoked. It remains a trusted privileged migration actor, **not** an app
login. App NOLOGIN groups and restricted logins have no superuser/CREATEDB/CREATEROLE/
BYPASSRLS/owner membership/table or schema-CREATE access, and only their exact wrapper
EXECUTE rights. Do not install the migration operator's DSN into a service.

Committed cases cover true concurrent native sessions (barrier + independent queues),
replay, transaction rollback, fences/policy/epoch,25attempt/100use hard caps, retained
uncertain grants, STOP and restart, lost commit ACK, DB outage, missing/failed anchor
before/after commit, and clock rollback during call/check/reserve. A test-only
`LD_PRELOAD` shim advances ONLY fresh PostgreSQL process `gettimeofday` by30seconds
then restores it: real persisted clocks/history/anchor are used, not tampered counters
or a changed system clock. CLOCK_MONOTONIC and the host clock remain untouched.
All provider responses and P-256/Ed25519 math are synthetic, local and source-OFF.

## iPhone enrollment boundary

[Supported phone preparation, exact steps and acceptance HOLDs](../../experiments/jupiter-beta-approval/integration/owner/IPHONE-BOOTSTRAP.md).
The unmounted browser helper uses the pinned SDK and a new nonextractable temporary
key; it has no HTTP/storage/root-key import. Actual mobile dashboard public-key/expiry
controls and physical Safari enrollment/UV have not been observed. Those are explicit
acceptance gates, not a PC requirement or claimed enrollment. Daily dual approval,
strict RP/UV and the existing global root remain unchanged.

## Release/rollback and remaining HOLDs

No deployment, trust enrollment, accounts, provider API/signature, source acquisition
or hosted SQL is authorized. All four integration release flags remain false and
all public pins/origins/host remain null. New branch Git deployment suppression only;
no existing hosted setting is changed. CI permissions are read-only/no secrets.

The new transition fingerprint deliberately rejects old279 SQL. No migration/update
of an existing database is provided or authorized. If an old installation is ever
reported, HOLD and separately review a state-preserving function migration; NEVER
rerun an installer, restore an old snapshot, reset counters or bootstrap a new anchor.
All existing main/source/production gates and old recovery snapshots remain untouched.

Current rollback: close only this draft; preserve279 and earlier heads. Future approved
rollback must keep source OFF, obtain/verify permanent STOP or report UNKNOWN, retain
every spent/uncertain state and independent CURRENT anchor, and use a compatible
reviewed function/driver version. No reset/unstop, fallback provider or automatic retry.
