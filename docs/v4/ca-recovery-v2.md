# CA-aware recovery v2 — offline preservation review only

Dependent on integration #271 `8effe6ba0967d7a83e976840d5ed8df1d95fcbf5`.
No original file is changed. The v1 query/verifier, source installer SHA-256
`205791aa4d5a02f46d043e866e254833b4fa8079d5f9ebda5a7f1bcb9e605447`, its five
function bodies and every trust/activation pin remain unchanged.

## Contract and outcome

`recoveryManifestV2(extractionJson, {databaseId,generation})` validates a bounded
read-only projection and returns canonical `unfarmd-v4-recovery/2` JSON, or
`{status:'blocked',activate:false}`. Manifest creation is not trusted capture.
`reviewRecoveryV2(envelopeJson, restoredManifestJson, trust)` returns only
`{status:'preserved_offline_only',activate:false}` or the blocked result.
**Every outcome is `activate:false`. No result authorizes a restore or source.**

The manifest includes the original v1 legacy projection unchanged (authentication
commitment, journal heads/revisions/metadata, tombstones, owners, rates and legacy
pilot counters/STOP/fence/lease/ordered history commitment). CA coverage adds:

- Full policy-row hash plus policy/record identity, owner/origin hashes, signed
  release identity, runtime kind, clocks, all limits and exact provider debits.
- Lookups/attempts/credits, permanent STOP, full state-row hash, fence/uncertain
  lease hashes, source clocks and next-provider clocks. Null is distinct from zero.
- Every lookup row, committing exact id/mint and complete provider-list content.
- Every history row and original receipt, in strict numeric sequence order.
  Separate hashes commit the complete PostgreSQL JSONB receipt and full row;
  no receipt is reduced to an acknowledgement count or maximum counter.
- Identity sequence last value/called state. BIGINT values are decimal strings,
  not lossy JS numbers. Sequence gaps are legal; reordering/duplication is not.

Only installed-empty CA (both policy/state null, no lookup/history, unused
sequence) or fully configured CA is representable. Missing schema, partially
missing state or overflow blocks. A preinstall snapshot cannot substitute for an
independently recorded post-source policy/state. At most 3 lookup rows and 64
history rows are accepted; the SQL reads one extra to detect overflow, not accept
a truncated prefix. JSON is capped at 1 MiB. Hashes remain potentially linkable
metadata; hashing grants no retention/publication rights.

## Mandatory independent current-anchor authority

There is **no installed anchor store or authority** in this change. Trusted
operator/coordinator code must supply `RecoveryTrustV2` from an independently
protected authority, outside the restored target and its backups:

- A pinned **public Ed25519 key**, never a key from the envelope/request/target.
- `current.anchorSha256`: SHA-256 of the canonical entire signed envelope.
- Independently latest databaseId, generation, monotone checkpoint sequence,
  quiescenceId, manifest capture time and current CA policy hash (or null only
  after independently confirming no source policy/activity).
- `checkedAtMs`: time the authority freshly reaffirmed that this is its latest,
  complete head; trusted `nowMs` and `maxAgeMs` in (0, 300000].

The envelope contains `{record,signature}`. Record exact fields are
`{version:'unfarmd-recovery-anchor/2',sequence,quiescenceId,manifest}`. Signature is
canonical unpadded base64url Ed25519 over UTF-8 canonical record JSON. Canonical
JSON sorts object keys, retains array order and uses JSON serialization of safe
integer numbers/strings/null/booleans. All contract keys are ASCII. The current
checkpoint digest commits both the record and signature. This module loads no
key and exposes no signing function; local test signers are synthetic only.

Signature, database/generation, latest digest/sequence/quiescence/policy and fresh
authority check must all match. Freshness alone or two matching old signed copies
is insufficient. A historical anchor can still be latest only if the independent
authority freshly and authoritatively confirms that fact. A fresh restored-target
probe is also mandatory. Capture LSN/snapshot metadata may differ on that probe;
all logical legacy and CA content must match exactly. Taking maxima is rejected.

**Trust assumptions:** the pinned signer, latest-head authority and trusted clock
are uncompromised; checkpoint persistence/selection is monotone, independent of
the restored target, and includes all committed/uncertain source activity. An
external writer hold must remain enforced through capture and comparison. The
verifier cannot prove where a caller obtained its trusted inputs, create a store,
detect a lying signer or certify quiescence. Never obtain/re-sign a supposedly
current anchor from the restored target or use a backup's own checkpoint as the
latest authority. If latest head, uncertain ACK/activity or writer coverage is
unknown, supply no trust and HOLD. No default trust or `trusted:true` shortcut.

A store that lags a reservation or is rolled back with the target is unsuitable.
Source activity after a checkpoint invalidates its currentness even if its
signature/time is valid. A new checkpoint needs trusted capture/independent
retention; a new timestamp on old data is insufficient. This change provides no
automatic integration, persistence, freshness oracle, signing service or hardware
attestation. Those require separate reviewed owner approval before hosted use.

## Read-only extraction definition — never invoked automatically

`RECOVERY_CAPTURE_V2_PLAN` in `recovery-v2-extraction.mjs` defines literal SQL;
it has no driver/connection/environment/executor. A future separately authorized
operator uses a dedicated idle client through the existing strict native
TLS/SCRAM-PLUS boundary and existing SET-only migrator memberships. One
REPEATABLE READ READ ONLY transaction selects the fixed legacy and CA projections
under their existing owner roles and ends with ROLLBACK. No GRANT, new role,
security-definer function, policy edit or persistent setting is introduced.

Assemble `{...metadata,legacy:{...journal.part,...deploy.part,...boundary.part},
ca:ca.part}` and JSON-encode it for `recoveryManifestV2`. Any statement, privilege,
missing table, timeout or partial read error means ROLLBACK and no manifest. Do
not catch a CA error and fall back to v1/empty state. Existing SET-only ownership
is exercised under actual non-superuser PG18 in local tests. Every ordinary
snapshot-visible table uses the same MVCC snapshot. Identity-sequence state is
non-MVCC; a real external writer hold is essential for a stable whole capture.

`lsn` and `readSnapshot` are observational capture metadata, **not a certified
snapshot recovery point or independent Neon durability/quorum proof**. No query
checks or changes hosted snapshot/branch/billing settings. Definition execution,
privileged reads, key use, external checkpoint custody and restoration all need
separate owner GO. No new extraction endpoint or runtime import is installed.

## Limits, STOP and owner gates

This verifies exact data preservation against a trusted latest anchor; it does
not verify provider facts, grant rights, issue an owner/source capability, bless
backup immutability, certify the full catalog/roles/encryption-key availability,
or replace original startup SQL/TLS/source/admission checks. Schema/driver
compatibility, original function pins and secure external key custody remain
separate checks. Historical snapshots can retain deleted private data; retention
rights remain required. Any changed sequence value, including a legitimate
crash-related sequence advance, conservatively HOLDs until independently reviewed.

An uncertain lease is compared and preserved, never reclaimed, expired/refunded
or converted to a successful observation. STOP removal, missing history or
unknown source usage blocks. Even exact preservation may contain permanent STOP
or an unresolved lease, so it remains source-OFF and `activate:false`.

The old Neon snapshot stays untouched. Launch billing, a fresh verified snapshot,
B installer execution, owner credentials/source grant, any extraction/capture or
independently approved restore remain distinct owner decisions. This PR does not
amend the existing fresh-snapshot requirement or authorize restoration. Rollback
now is closing the unmerged draft; no deployed code or hosted state changes.
