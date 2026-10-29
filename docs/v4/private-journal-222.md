# Private thesis journal — dependent review #222

**Storage OFF. No Save feature, route, auth installation, hosted database or keys.**
Dependent on exact draft #220 `b56475c681311d35f95ee9879d9969b868a1724e`.
The /lens UI, NOT SAVED wording, A/C code, original B validator, data and all
legacy source/STOP/lookup/preflight gates are unchanged. No production change
or activation follows merging this code. `index.ts` returns disabled/null clocks
before any environment, auth, key, pool or network access; no enable parameter.

## Working offline server contract

`PostgresJournalRepository(trustedNativePgPool, ownerKeys, ownerAuthority)` is
executable, server-only and unconnected. It uses the real existing
`appendThesis`/`replayThesis` (`unfarmd-thesis/1`), not a replacement format.
`append(principal,{journalId,mint,requestId,expectedHead,change})` accepts no owner
override. `read(principal,journalId,mint,optionalTrustedPrefix)` verifies and
returns the bounded full original chain; `list(principal,limit<=20)` returns
private metadata only, not verified evidence. UUIDs are not private sharing URLs.
Exact CA is asset identity, never authentication. Snapshot references are only
references, not admitted facts or permission to fetch sources.

`OwnerAuthority` verifies short-lived (max five minute) Ed25519 signed assertions:
fixed issuer/audience/key IDs, exact opaque account UUID subject, strict bounded
JSON/duplicate-key rejection and iat/nbf/exp. Its process-local capabilities cannot
be forged by headers, emails, raw wallet addresses, object cloning or an unrelated
signing authority. Every operation rechecks identity and expiry before I/O and
before commit. Public key trust is server configuration, not caller-controlled
request data. No assertion issuer/session endpoint, JWKS fetch or account setup
is installed. Bearer assertion replay within its short validity is possible;
revocation, refresh and CSRF/origin/cookie security require the separately reviewed
real authentication integration. Tokens must never enter URLs, logs or storage.

Proposed minimal mobile auth: invite-only account with passkey enrollment and a
second recovery passkey; or existing vetted email login then passkey enrollment.
Use the vetted provider's stable subject mapped server-side to one opaque UUID,
with a server-minted audience-scoped assertion. Explicitly review recovery and
account deletion. Vercel Authentication gates site access, not journal ownership.
No auth package, paid subscription or new service is selected or installed here.

## Transactions, isolation and encryption

Distinct schema `unfarmd_journal`, NOLOGIN owner/app/erasure capabilities; no
existing role membership or `scout_live` modification. Future login creation and
membership need owner approval. App can SELECT through FORCE RLS and execute two
fixed SECURITY DEFINER functions; no direct insert/update/delete/DDL/purge. Each
transaction sets owner scope from a verified capability. Fixed SQL is parameterized,
search paths pinned. Per-owner row locks serialize journal creation, quotas and CAS
across processes. Event insert, ciphertext head, revision, privacy revoke and
lifetime charge commit together. Unique owner/request UUID provides idempotency;
same-key different command/journal is conflict. No retry, in-memory fallback or
refund. Uncertain commit returns unavailable; an explicitly authorized same-key
retry recovers the receipt for active journals without a duplicate event. After
deletion/revocation, all content reads and retries deny; do not interpret that as
an erasure receipt or silently create a replacement journal.

Bounds: 32 lifetime journals, 2,048 lifetime events per owner; 64 events and B's
128 KiB plaintext-chain cap per journal; 32 KiB sealed row, 512 KiB sealed journal;
reads at most64 events/list20. Statement timeout1.2s, lock timeout1s, idle-in-tx3s.
Trusted native pool must additionally bound connections, connect/query timeouts
and TLS. Tests use verified CA/SNI, SCRAM and local hostssl-only PostgreSQL.
This is not a hosted or mandatory negotiated SCRAM-PLUS proof. Any later native
production transport must preserve existing mandatory TLS/channel-binding rules;
no DSN, URL parser, downgrade flag or production pool is introduced here.

AES-256-GCM uses fresh random96-bit nonces, versioned per-owner256-bit keys,
authenticated owner/journal/mint/revision/previous ciphertext head/request ID/key ID.
The entire original event, private prose, invalidation, source references and
idempotency command are inside the sealed payload. Database CAS hashes commit
to randomized ciphertext, not dictionary-testable plaintext hashes. Decryption
verifies envelope/AAD, storage chain and B's original event hash chain before
returning content. Keys are injected separately from DB credentials and copied
working key buffers wiped. Resolver-owned keys are not mutated. Errors are fixed
categories; no raw SQL/provider/key/token/notes are logged. No PII goes to a source.

RLS defends missing predicates but the shared app login is **not** a separate
cryptographic owner verifier: compromised backend/DB credentials can change its
transaction GUC. Trusted app, issuer and key resolver remain critical boundaries.
Host/admin can corrupt or restore the database; corruption fails closed, but a
complete valid-prefix rollback requires an independently retained trusted anchor
to detect. No external anchor store or stronger backup attestation is claimed.
Already-running snapshot reads can finish during a concurrent revoke; subsequent
reads after commit deny. App-level encryption protects database-only disclosure,
not a compromised application holding keys or browser/OS copies of returned text.

## Retention, erasure, rotation and recovery

Creation sets a non-renewing30-day expiry. Expired rows are hidden even if cleanup
has not run. Deletion appends a terminal request and atomically revokes access,
queues erasure after24h. Redaction conservatively revokes the entire journal and
queues whole-journal erasure; it does not overwrite an original or promise surgical
deletion that would break the chain. Receipt says **access revoked, erasure queued**,
never deleted. No erase worker/scheduler is installed or activated.

Separate erasure capability can delete only due/expired journal rows in batches
of1–20; FK cascade removes events. It cannot append, modify quotas, delete active
journals or directly delete event rows. Purge is safe to resume after outages;
lifetime tombstone counters remain and cannot be reset by app/erasure roles.
Metadata owner UUID/counter tombstones remain for abuse limits and must be included
in a separately reviewed account-erasure/privacy decision. Full physical erasure
is not proven by row deletion: WAL, provider PITR, snapshots, branches, replicas,
exports and client copies can outlive primary rows. Obtain actual project settings
and deletion/backup contractual guarantees; do not infer them from previous tasks.
No hosted settings were read here.

Key rotation is append-with-new-version; old immutable ciphertext stays unchanged
and needs old owner key versions. Missing versions fail closed. Before activation,
approve a separately managed envelope-key/KMS path, independent access controls,
key version retention and dual-control backup/recovery. Key destruction only
protects old copies if **all** relevant key versions and backups are erased and
no plaintext/client copy remains. No key erasure or rotation is performed here.
Rehearse restore into an isolated target, replay against independently retained
anchors and reapply revocation tombstones before reopening access. Restoring an
old DB backup must not resurrect revoked accounts/journals or refund limits.

## Owner acceptance / distinct activation gates

1. Review this exact dependent SHA and green offline/native/security CI; no main merge
   implied. Keep /lens NOT SAVED. Approve the eventual user-facing conflict, retry,
   privacy-request and expiry language separately, on a physical iPhone.
2. Choose/approve real account auth and issuer-to-owner mapping; prove A cannot read,
   list, revise or revoke B on actual authenticated browser sessions; secure same-origin
   POST/CSRF, session revocation and recovery. No public note URLs/sharing by default.
3. Approve separate native server-only DB/owner-key/maintenance identities. Inspect
   schema.sql SHA and ownership/ACLs in an isolated authorized environment first.
   Schema is a one-shot transactional migration; existing-name collision aborts.
   No DROP/CASCADE repair, no existing schema alteration, no auto rerun or inline
   passwords. Authorize actual production SQL and secrets separately, never in PR.
4. Confirm real backup/PITR/branch/export retention, encrypted key backups, deletion
   requests/tombstone retention and restore acceptance. Define purge monitoring and
   owner notification after outages before any user note is accepted.
5. Approve a tiny connection/storage/write budget and quota/cost alert thresholds;
   no paid service/billing initiated here. At max512 KiB/journal,32 active journals
   can hold16 MiB ciphertext per owner before indexes/WAL/backups. This is a bounded
   capacity estimate, not a provider bill or free-storage promise. Set a beta owner
   count and total DB cap before activation; no global capacity approval exists.
6. A separate release adds real auth/transport/key loading/HTTP integration and the
   Save feature only after these gates. Current production entry cannot be armed
   through env, args or this PR. Sources/Helius/market storage are independent and OFF.

Rollback now: close this unmerged dependent draft. No infrastructure exists to
remove. After any future authorized activation, disable journal access/writes,
preserve ciphertext/tombstones/keys and exact counters, then reviewed code-only
rollback. Do not drop production schema, delete keys, restore an old DB or revert
collector history as an automatic rollback.

## Verification and narrowly pinned scope

`NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-private-journal/run.sh`
uses generated ephemeral keys/passwords and a disposable local PostgreSQL17 TLS
server; it fails rather than skipping when PostgreSQL is absent. No real notes or
secrets are fixtures or CI artifacts; literal fixture prose is explicitly invented
SYNTHETIC ONLY. Nothing uploads raw DB logs, assertions, keys or decrypted events.

The inherited #220 scope guard rejects additive paths. Two exact hash/patch-pinned
test-only changes admit precisely18 named new paths and retain every original
source hash/ancestry/data/auth/STOP assertion. The old scope mutation harness copies
the added dependent context and proves an unmodified clone passes before mutation,
so a missing dependency cannot create false-positive protection. No directory or
environment bypass. Original source suites also execute in exact detached trees.
Existing root Python discovery runs this new suite without modifying tests/run.sh.
The current combined full root suite, types/lint/build/archive and unchanged mobile
regressions run in read-only CI; no dispatch, schedule, secrets or deployment step.
