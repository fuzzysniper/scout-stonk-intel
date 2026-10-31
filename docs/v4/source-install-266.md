# Oracle V5 source-admission installation review — B / #266

Status: **code/local SQL PASS; hosted installation and source HOLD**. Dependent on
reviewed #265 `f80ecba0d39ad854d189ff5b4c699f4310a45c1d`. B owns only this installer,
its full-file trust pin, tests and review package. A owns rights/debit/retention;
C owns the trusted producer mount into the existing private iPhone Oracle.

## Verified target and actual blocker

Authorized read-only connector/catalog observation on October 31, 2026:

- Project `twilight-hall-57571802`, branch `br-sweet-voice-b4x4et5q` (`main`),
  database `unfarmd_v4_pilot`, PostgreSQL **18.6**.
- Six installed schemas: `unfarmd_journal`, `unfarmd_thesis_rate`,
  `unfarmd_v4_auth_ops`, `unfarmd_v4_deploy`, `unfarmd_v4_owner`,
  `unfarmd_v4_pilot`. `unfarmd_v4_ca_budget.step(jsonb,uuid,text)` is absent.
- All sixteen `unfarmd_*` roles are **NOLOGIN**, NOSUPERUSER, NOCREATEDB,
  NOCREATEROLE and NOBYPASSRLS. No secret or authentication table value was read.
- Snapshot schedule `[]`. One manual snapshot
  `snap-shy-water-b4wxetcx`, created **2026-10-30 14:19:46 UTC**, named
  `unfarmd-v4-before-schema-install`. It predates the current review and is not
  a fresh source-install recovery anchor. No snapshot/branch/role was created.

The original source supplement fails as a genuine PG18 non-superuser migrator:
`permission denied for schema unfarmd_v4_deploy` at its initial `to_regclass`
lookup. PG16+ also requires explicit SET membership for newly created owner roles;
GRANT/REVOKE statements must execute as their object owners. The superuser-only
source fixture did not catch these installation permissions.

## Exact proposed migration — UNEXECUTED on Neon

File: `ops/v4-owner-auth/source-admission.sql`

SHA-256: `205791aa4d5a02f46d043e866e254833b4fa8079d5f9ebda5a7f1bcb9e605447`

Changes: catalog-only prerequisite lookup; transaction-local
`createrole_self_grant=set` (never inherited); SET ROLE for existing helper grants
and new-schema grants/revokes; refusal of existing/partial source installations.
The full-file `SOURCE_SQL_SHA` is updated to this digest. **All five function
bodies and SOURCE_BODIES pins are byte-identical to #265.** No TLS, SCRAM-PLUS,
owner signature, rights, source transport, Oracle route, release gate or budget
function semantics change.

One committed installation adds only:

- Three isolated NOLOGIN roles: `unfarmd_v4_ca_owner`, `unfarmd_v4_ca_login`
  (connection limit 2), `unfarmd_v4_ca_stopper_login` (limit 1).
- One source-budget schema with policy/state/lookups/history and the five
  existing reviewed functions. **Policy and state remain empty.**
- Narrow helper privileges to the source owner and narrow function execution
  to source/STOP roles. Runtime roles have no table writes/reads, CREATE/TEMP,
  cross-role membership, journal/auth or old-pilot capability.

The existing sixteen roles, old pilot/journal data, counters, uncertain leases,
STOP, tombstones, provider transport and #265 cold-start/UI bytes are preserved.
The runtime still requires signed owner/source admission, strict TLS/PLUS,
matching body fingerprints and admitted Neon durability; installation alone
cannot acquire a mint or authorize a provider request.

### Replay and recovery semantics

This is intentionally a **one-shot additive installer**, not an auto-repair tool.
An exact repeat, existing schema or any one existing source role raises
`ca_install_already_present_or_partial` before DDL; no role adoption, policy
rewrite, refund, lease reclaim or counter reset. This is fail-closed repeat
rejection, **not a claim of successful idempotent replay**.

Any statement failure rolls back the transaction, including role creation and
additive helper ACLs. The operator must use stop-on-error execution (for psql:
`-X -v ON_ERROR_STOP=1`; the Neon browser editor must execute the whole BEGIN/COMMIT
file as one reviewed transaction). B does not ask the founder to use a terminal.
Never ignore warnings/errors, execute individual fragments or retry an uncertain
commit. Catalog verification must resolve an uncertain outcome first.

Before approved execution, create/verify a **fresh owner-approved snapshot** of
this exact branch/database, record snapshot ID/time, installer hash and a secure
current recovery anchor. The existing October 30 snapshot is insufficient.
Backups and immutable mint/provider/date/lease/hash metadata need A's explicit
retention-rights review; no new retention entitlement is inferred here.

After installation keep every role NOLOGIN and policy/state empty. If verification
fails, leave sources OFF and investigate. Do not DROP the schema, reinstall base,
restore the October 30 snapshot or clear counters. After any source attempt,
restoring an older database can resurrect spending authority; preserve the newest
STOP, spent counters and uncertain lease. No such hosted restore is authorized.
Local source-only dump/restore tests demonstrate byte/state preservation, not a
hosted backup/PITR guarantee or an authorization to restore production.

## Finite acceptance and next owner approval

**B database-install approval only**, separate from later credentials/source GO:

> Approve only the reviewed source-admission installer at the exact PR head and
> SHA-256 `205791aa4d5a02f46d043e866e254833b4fa8079d5f9ebda5a7f1bcb9e605447`,
> on project `twilight-hall-57571802`, branch `br-sweet-voice-b4x4et5q`, database
> `unfarmd_v4_pilot`, after a fresh verified pre-install snapshot. One atomic
> installation; all nineteen roles stay NOLOGIN and source policy/state stay
> empty. No provider request, key installation, source grant, source activation,
> public access, main merge or production deployment is approved.

Shortest safe sequence for the authorized operator, with browser-based founder
review:

1. Verify exact reviewed PR/SQL digest and target identity; verify base/issuer
   ownership and SET capability. STOP on drift, absent snapshot, unexpected
   LOGIN, preexisting source objects, unknown migration/attempt history or any
   unapproved privilege requirement. Do not grant SUPERUSER or broad membership.
2. After the distinct database-install GO, execute the entire exact SQL file once
   on the existing database. No base/issuer reinstall or new database.
3. Independently verify one added schema, nineteen least-privilege NOLOGIN roles,
   zero source policy/state rows, exact five prosrc hashes from unchanged
   `SOURCE_BODIES`, source-only function ACLs and unchanged legacy state/owner
   history/recovery anchors. Record the categorical result; no credentials.
4. **HOLD.** A must clear exact method/account debit, private display/combination,
   immutable metadata and backup-retention terms. C must supply a signed,
   deployment-bound owner/source grant and trusted mount that uses this SQL hash.
   The source profile must explicitly cap **at most three Helius attempts in at
   most fifteen minutes**, with `providers: ['helius']`, exact mints, verified
   integer debit d and at most 3*d included credits. Existing Jupiter reads are
   separately scoped; this grant neither authorizes nor debits them. Both source
   rights must be named for combined display, with no combined-budget claim. Existing SQL's
   broader backward-compatible maxima are not a session approval.
5. A separate owner-approved credential installation and bounded source GO may
   then enable only the intended restricted server identities. No legacy key
   copying. No actual signing/credential step is performed or requested here.
   The existing private iPhone Oracle, not a new page, is C's acceptance surface.
   Its one deliberate lookup must carry original finalized bytes/hash/slot/time;
   unavailable evidence stays GRAY. Request durable STOP on uncertain ACK; only a verified STOP ACK confirms it.
   If the grant already expired before cold-start admission or the ACK is
   unavailable, report UNKNOWN and HOLD with the pending lease/counters intact.
   Serialize deliberate owner lookups: clock reordering or a competing process
   can legitimately STOP the existing ledger. No automatic retry, fallback
   provider, reconnect/refence or budget refund. End the session OFF.

## Executable evidence

`tests/oracle-source-install-266/run.sh` requires the pinned disposable PG18 build
and blocks external connections via `tests/security114/local-only.mjs`. Synthetic
keys/credentials/provider bodies occur only in existing local fixtures.

New installer tests reproduce the original failure and cover PG18 non-superuser
permissions, exact function pins/owners/ACLs, all19 NOLOGIN roles, atomic rollback,
partial/repeated installation refusal, genuine independent-session concurrency,
STOP-only isolation, irrevocable reservations, expiry/durability rejection,
correct completion receipts, crash/restart and source-only dump/restore.
Existing owner/sign-in/source/TLS/uncertain-ACK tests run against changed SQL.
A strict full-tree guard permits only B's nine paths and the single full-file
SQL pin replacement. Original #265/A/B/C/native/root/mobile guards run unchanged
on their exact immutable inputs; actual HEAD is separately typed/linted/built and
its optimized route is exercised with labeled synthetic source injection.

Neither these local tests nor the catalog-only connector check proves an
installed server role's actual Vercel-to-Neon TLS/PLUS connection or an authentic
Helius observation. Both remain independently gated hosted acceptance work.
