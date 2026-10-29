# Owner → encrypted thesis bridge (code-only)

**Review GO. Hosted auth/storage/source HOLD.** One dependent draft from A#2296efb0eb retaining B#23076dea8a by ordinary two-parent merge. Original branches and collector data are untouched. Installed Next routes still return503 storage_off before request/auth/key/SQL access. /lens defaults to NOT SAVED with no Save/Load capability. The new bridge has no installed issuer, environment loader, route or production selector.

## Real method-to-principal trace

1. Actual GET/POST/PATCH + signed __Host cookie + exact journal-intent goes to **A's boundary.journal().verify**. A independently checks Origin/Fetch Metadata, Better Auth1.7.14 signature and uncached PostgreSQL session, enabled immutable issuer/audience/subject→journalOwnerId policy. Pilot POST read/stop rules are reused unchanged, never relabeled into journal requests.
2. Bridge accepts only A's opaque WeakMap-inspected context. A short-lived internal **Ed25519 delegation** carries that verified journalOwnerId (not subject/email/wallet/header) to **the SAME J OwnerAuthority used by this app instance's repository/rate**. J independently verifies its configured issuer/public key, signature, audience, clock and UUID. No brand/UUID cast or production synthetic principal. An unrelated signing key/authority cannot resolve. No delegation assertion or principal is returned to a client.
3. The original Request/context are privately retained. Every currentness/CSRF checkpoint calls A's **reverify(originalRequest, previousContext)** and compares complete stable owner/session/mapping/issuer/audience/auth-time/expiry. J capability expiry and authority membership are rechecked. B's handler retains before/after rate/database checks and withholds private output on revocation/expiry. A denied response can follow a committed write; it does not undo the commit or justify a retry.

## CSRF issuance proposal, unselected

Only a genuine journal GET with exact intent can obtain an opaque session-bound HMAC token after the actual shared SQL read budget is charged and fresh A recheck succeeds. Token binds owner/mapping/issuer/audience/session/auth-time/expiry, random nonce and ≤60-second expiry. POST/PATCH require exact Origin and constant-time HMAC validation; another session, missing/changed token or revoked session denies. No auth-cookie/login issuer is installed. The server proposal is not an active endpoint. Real key delivery/rotation, session renewal and issuing-route review remain HOLD.

The mobile test server alone implements a SYNTHETIC CSRF-bootstrap proposal at actual GET /api/v4/theses with a test-only intent header. It uses real signed Secure/HttpOnly/Strict cookies and the same original HTTPS localhost method/Origin throughout. Two independent app objects have separate A boundaries, J authorities, repositories/rate pools and share the real local database/encryption-provider fixture. They are not two hosted deployments or a production distributed-key proof. The fixture binds loopback HTTPS443 without rewriting the real method, Origin or Host. Only in the disposable CI VM, the low-port bind threshold is443 so the unprivileged test process can listen; no deployed auth/network protection changes. Self-signed browser HTTPS is test-only; native DB TLS/SNI/CA/SCRAM remains verified. Production gates are unchanged.

## Test/owner card

Local PostgreSQL: create via one verified session → second independent app/session Load → append revision → original preserved; encrypted rows contain no owner prose. Test forged/nonowner/cross-owner, missing intent, CSRF GET/POST/PATCH, expiry/revocation mid-I/O, changed sessions/mapping, CAS and ambiguous committed Save recovery. UI limits now match API2000/1000. Original B21 mobile cases plus joint9 at320/390/1280 exercise history, original, no automatic retry, focus/axe/privacy. All identities, signed cookies and keypairs are ephemeral synthetic fixtures, not evidence of a real issuer. No provider queries.

Uncoached owner task after separate configuration approval: one CA → invented thesis Save → new verified session Load → Add update → compare original/revision; verify revoked/uncertain outcomes without retry. Current hosted page cannot do this because activation is OFF. No new wizard or risk form.

## Finite composition / data

The four overlapping guards and the required adapter/UI/guard resolutions are exact blob/mode/SHA-256/full-patch reviewed. Every other A/B input byte is frozen; existing manifests and original guards remain in immutable source history and run unchanged in detached trees. No path-prefix/environment bypass. Candidate begins at A and retains B; target is A's feature branch, never main. Inherited collector blobs remain exact; later main has three collector-only commits through5d9ce75 and needs independent data-preserving review before release. No rebaseline/reset.

## Remaining GO/HOLD sequence

1. Review this finite draft and the real issuer/delegation key trust + one immutable owner mapping, CSRF issuing/renewal/revocation lifecycle. No signup/login/configuration is authorized here.
2. Separately approve isolated hosted auth/journal/ledger schemas, mandatory TLS/channel binding, keys/backups/tombstones/retention/rollback anchor and bounded beta/global budgets. Native local tests do not attest hosted settings.
3. Bind reviewed APIs/UI only on a verified protected immutable preview, physical iPhone/VoiceOver acceptance, all-alias hold/rollback and explicit owner auth/storage GO. Helius native transport/producer admission/rights/budget/source GO remain independently OFF. Production/main merge is separate.

Rollback now: close unmerged draft. Later revert must retain ciphertext/keys/tombstones, session revocation, rate/attempt/STOP history and latest collector data. No database restore/drop, quota reset or automatic retry as recovery.
