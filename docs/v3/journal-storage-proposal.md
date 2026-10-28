# Private decision journal: offline contract and storage choice

Issue #195 · 2026-10-28 · **DRAFT / no persistence or source activation**.
Baseline main: `ba4b2e494f768350ec285e26791b61a90c50220b` (collector history retained).
Risk reference: #189 `36ede0e45046d8dba5a5163cc57ebc94434e2513`, still unmerged.
The current guided desk #193 is also unmerged. Neither is incorporated or modified
by this PR. No UI, route, auth, provider, original risk, SQL, workflow or dependency
file changes. The module is not imported by the production app.

## Founder decision

Recommend **A: a separately scoped, owner-controlled encrypted file pilot** for
five sessions before choosing hosted storage. First select and review an iPhone
encryption/import tool and recovery procedure. This PR does **not** implement
encryption, export/import UI, file downloads, localStorage, accounts or a store.
Today refreshing the desk still loses its in-memory decisions. A working offline
validator does not fix that user problem until an independently reviewed pilot
is built and accepted. Do not upload actual financial records to test this PR.

PASS and WATCH are decisions worth keeping. “No entry reported” is a useful
review outcome, not a failed trade or evidence that nothing happened elsewhere.
There are no P&L totals, returns, streaks, trading-volume goals or profit scores.

## Portable seam for C

```ts
import {createJournalEngine} from './lib/unfarmd-journal';
import {recordDecision,reviewDecision} from './lib/unfarmd-risk'; // future composition
const journal = createJournalEngine({recordDecision,reviewDecision});
const result = journal.replay(untrustedObject, {
  evaluatedAt: '2026-10-28T12:00:00.000Z', // caller clock, not provider time
  expectedJournalId: 'owner-chosen-random-journal-id',
}, previousTrustedCopyOrNull);
// result.status === 'invalid' => no state or metrics; never partial recovery.
// journal.parse(untrustedJson, context, prior) additionally rejects duplicate JSON keys.
// journal.summary(...) recomputes aggregate-only, identifier-free process counts.
```

The dependency is trusted application code, not a user-selectable plugin or an
untrusted callback from a file. There is no default/mock engine. Focused tests
compile the actual six original B library files extracted from the pinned Git
commit and a TypeScript structural-compatibility assertion. Main lacks B; this
typed seam avoids copying its mathematics or smuggling the unmerged UI into this
PR. Any future consumer must supply the actual reviewed risk functions and run
both focused suites. A permissive replacement callback is outside this contract.

`RiskEngine` is a deliberately narrow structural port. `recordDecision` validates
every original decision at **its original recordedAt**, not today's clock (which
would incorrectly reject an old valid hypothetical price). The emitted snapshot
must equal the original event. `reviewDecision` validates actual later reviews
and computes the original hypothetical cap/process checks; the journal does not
reimplement sizing. No review is invented for an entry that has not been reviewed.
Standalone entries receive bounded event-shape/decimal validation; cap adherence
remains unknown until a real owner review is supplied.

## `unfarmd-journal/1`

All inputs are bounded plain data. Only exact known keys are admitted; no coercion,
getters, functions, cycles, symbols, nonenumerable fields, sparse arrays or exotic
prototypes. A detached frozen snapshot is returned; this is memory immutability,
not a storage security or tamper-proof guarantee.

Journal header: `{version,journalId,clockBasis:'owner_reported',tail,receipts}`.
Tail is `{sequence,receiptId}` and must match the final receipt, or `0/null` for
an empty journal. Receipt header:
`{version,receiptId,sequence,previousReceiptId,receivedAt,type,event}`.
Sequence starts at 1; previous ID must match; IDs cannot repeat. Receipt IDs and
event IDs have separate namespaces. All event IDs are unique across event kinds.

| Receipt type | Preserved event | Additional exact fields |
| --- | --- | --- |
| decision | Original B `DecisionEvent` | `supersedesDecisionId`, `editReason`, both null for a new chain |
| execution | Original B `ExecutionEvent` | none |
| review | Original B `ReviewEvent` | `executionId`, `supersedesReviewId`, `editReason` (explicit nulls when unused) |
| override | Journal `OverrideEvent` | none |

An override is `{version:'unfarmd-journal/1',kind:'override',id,decisionId,
executionId,recordedAt,rule,reason}`. Rule is `risk_cap`, `allocation_cap`,
`cash_cap`, `reference_window`, `invalidation`, `decision_before_entry` or `other`.
These are owner admissions, **never authorization** or a repair of a cap breach.
Original caps and original events remain visible and continue to govern review.

Limits: **128 receipts**, **512 KiB UTF-8 JSON**, **24 KiB per risk/override event**,
16 levels, 50,000 data nodes; strings ≤2,000 UTF-16 code units, object keys ≤80,
arrays ≤128. Original B imposes its own tighter per-plan bounds as well. Larger
history needs an explicitly designed, reviewed partition/retention mechanism;
never silently drop the oldest decisions or accept partial replay. Input errors
return categorical codes/sequence only, without text, IDs, prices or secret values.

All clocks require exact `YYYY-MM-DDTHH:mm:ss.sssZ` with a valid calendar. No local
timezone conversion or hidden current time; a future/nonmonotonic receipt fails.
An event's recordedAt may precede its receipt time (late transcription), but may
not exceed it or the explicit evaluation clock. An execution's occurredAt can
precede its decision: that is admitted as **reported late**, never preplanned.
Equal decision/entry clocks do not count as preplanned. Clock correction requires
reconciliation, not silent time repair. These are owner clocks, not device-signed
time, broker fills, finalized slots or provider timestamps.

Original B supports only long spot / explicit USD assumptions; USDC, FX, leverage,
shorts, automatic prices and inferred fees are unsupported. Exact original decimal
strings and genuine zero remain intact. A journal has **one entry per decision
chain**, including after edits; partial fills, aggregation, exits, multi-leg entry
and paper/live-mode mixing are unsupported, rather than summed incorrectly.
An execution may be paper, simulated or user_reported, never provider_verified.

## Edits, replay and restored copies

- A decision edit appends a new fully B-validated decision receipt referencing the
  active old decision and a reason. It atomically supersedes the old version.
  Same owner asset reference is required; a different asset starts a new chain.
  The old decision, prior executions and reviews are retained. Later entries may
  not use an inactive version. Editing after entry cannot cure its original breach.
- A review explicitly names an earlier entry or null. It cannot omit an entry
  already known for its decision. A correction appends a superseding review with
  a reason; old outcome/lessons remain. The latest review for that exact decision
  and entry supplies current metrics. No automatic P&L is inferred.
- A later entry does not erase an earlier no-entry claim. Earlier no-entry is an
  as-reported review, not proof of no activity. Where an entry now exists, no-entry
  is excluded from the current no-entry count; unknown/missing review stays unknown.
- A repeated event/receipt, wrong link, unknown version, orphan, duplicate JSON
  key (including escaped aliases), truncated declared tail, corrupted plan,
  unsupported entry or invalid review rejects the **entire replay** and metrics.
  This API does not salvage selected favorable records.
- With a trusted prior copy, replay verifies that every prior receipt is unchanged
  and still a prefix. Restoring an older copy, changing an old receipt or replaying
  an old event as a new append fails. Semantic object key ordering is irrelevant.
- Without a trusted prior copy, a consistently rewritten journal or rolled-back
  copy with a matching tail **cannot be detected**. A journal ID, sequence, chain,
  freeze or even a content hash would not prove authorship, true chronology,
  complete history or append-only storage. There is no signing/hash chain here.
  A future digest can detect accidental corruption only when compared to an
  independently trusted digest; never label it cryptographic immutability.

Source adapters are absent. Only original B's bounded opaque evidence links are
retained (`unfarmd-evidence/1`, exact matching assetKey, unique opaque evidence IDs).
No source bodies, financial datasets, authenticated URLs, provider keys or account
numbers. The journal does not resolve links, extend retention rights, mark a source
fresh, grant a source policy, change SourceGo or promote owner notes into facts.
Disabled/missing source evidence does not prevent valid manual PASS/WATCH/PLAN.

## Process-quality metrics and denominators

Every metric is `owner_reported_journal_only`; `executionVerified:false`,
`outsideAccountExecution:'unknown'`, `actualLoss:null`. No account completeness
or safe-trading claim. Frequencies are floor-rounded integer basis points, with
numerator and denominator always included; denominator zero gives null, not 0%.

| Metric | Exact meaning / missing-data behavior |
| --- | --- |
| Decision chains/current choices | One active version per original decision chain; edits do not inflate this denominator. Separate raw decision/edit/PASS/WATCH record counts preserve deliberate history. |
| Preplanned reported entries | Linked original PLAN recorded strictly before owner-reported entry / all journal entries. Excludes no-entry decisions, not a score that penalizes PASS. Paper/simulated/user-reported counts are separate; no inference about off-journal activity. |
| Cap adherence | Existing B units and modeled budget checks under original assumptions. Within/breached/unknown shown separately. Rate uses only assessable entries; missing reviews/absent limits count unknown, not within. Not actual costs, stops or loss protection. |
| Process adherence | Original B review's within/outside/not-assessable, including time, asset reference, invalidation and explicit PLAN. Missing review is unknown. |
| Outcomes | One selected review per chain, tied to its entry when present, otherwise the active decision. Known owner-reported outcome coverage, unknown/missing and explicit no-entry counts. Gain/loss/flat labels do not produce performance totals. |
| Overrides | All declared override records, unique affected chains / all chains. No claim that zero reported overrides means no outside violations. Automatic modeled breaches remain separate. |

Metrics are reflection prompts, not a gamified grade or recommendation to enter.
Manual input can be dishonest/incomplete. Higher assessed percentages with many
unknown entries are not better evidence; display counts/unknowns alongside rates.
Journal summaries redact to these aggregates, omitting names, IDs, clocks, text,
evidence references and financial amounts. Small-sample aggregates remain private
and potentially identifying; this is not anonymization or a public sharing API.

## Privacy and redaction boundary

The strict schema rejects unexpected account/credential fields. It also rejects
obvious URL/auth/secret/account-number patterns and long numeric identifiers in
text. It never silently rewrites a decision to remove a secret and then calls
the result original. These heuristic checks have false positives and false
negatives; they are **not secret detection, DLP or permission to enter secrets**.
Private prose may still disclose sensitive facts. A future UI must say not to
enter credentials, account numbers, seed phrases or provider-owned data, offer
minimal fields and require preview/review before any authorized file or upload.
Error/metrics output cannot echo input; logs must not record raw receipts.

## Storage choices (design only)

Threats: lost/unlocked iPhone, shoulder-surfing/screenshots, shared Apple ID,
Files/iCloud/Time Machine backups, malicious extensions/app build/XSS, stolen
login, server operator access, wrong-owner ACL, compromised encryption key,
accidental deletion/restore and hostage recovery. Neither scheme protects a
compromised unlocked endpoint while plaintext is displayed. Vercel Authentication
alone is not a per-owner journal ACL. No wallet/account linkage is needed.

| Topic | A · explicit encrypted owner file | B · authenticated encrypted server journal |
| --- | --- | --- |
| Data path | Deliberate session-end export and later import. Plaintext stays in memory while used; no automatic browser or cloud store. iOS Files destination/sync is an explicit owner choice, not assumed private. | Separately approved owner account, session/CSRF controls, per-owner deny-by-default ACL/RLS and transaction boundaries. No reuse of mint/stream restricted roles, source schemas or admission history. |
| Encryption/keys | Select a maintained, reviewed, interoperable format/tool using vetted authenticated encryption and password KDF or device-protected key management. For example, review an existing age-format/passphrase-capable iPhone tool; **do not implement age, custom AES wrappers or a bespoke cryptosystem in this PR**. Tool UX/maintenance/KDF/device/recovery must be verified before selecting it. | TLS and managed disk encryption alone leave app/operator plaintext access. Envelope encryption with vetted AEAD and independently managed per-owner keys requires explicit key custody/rotation/recovery design. True client-side encryption reduces server access but limits server search/recovery; do not call ordinary database encryption end-to-end. KMS/auth/tool choices remain unapproved. |
| Usability | Visible “not backed up until export”; import verifies complete file/version/expected journal and prior trusted prefix before replacing memory. No merge-last-writer-wins. Manual export can be forgotten. Safari eviction/reload before export loses decisions. | Automatic durable append can prevent refresh loss, but offline edits, multi-device conflicts, idempotency, verified append and session expiry need engineering. Never last-write-wins event history. |
| Backup/recovery | Owner stores an encrypted primary and a separately recoverable encrypted backup; key/passphrase stored separately. Test restore on a second authorized device. Lost sole file or key means unrecoverable records; no vendor rescue promise. | Define tested RPO/RTO, encrypted backups/key recovery, disaster restore, per-owner integrity checkpoints and audit logs without prose. Recovery copies can reintroduce old events/deleted data; reconcile deletion markers and trusted prefix before serving. |
| Deletion | Removing browser state is not deleting exported files, Files Recently Deleted, iCloud copies, device backups or screenshots. Owner must delete each copy; physical media erasure cannot be promised. | Logical delete != physical purge. Founder-reported existing Neon PITR is **six hours** and no scheduled snapshots were listed at that observation; not independently reverified here. WAL/PITR, replicas, exports, logs, provider recovery/physical deletion windows and encryption-key backups require a written inventory/verified maximum deadline. Six hours is not proof all copies vanish after six hours. No change to existing history settings. |
| Cost | Offline module needs no hosted service. Incremental hosting for a file-only pilot can be $0; encryption app/license, owner storage/backup and support costs depend on the selected tool. No current price quote or new subscription is assumed. | No approved store or quote. Monthly ceiling must include auth, DB compute/storage, backup retention, egress, key management and monitoring, including usage beyond any allowance. Existing paid accounts do not imply free or authorized journal usage. No billing/provisioning action in this work. |
| Acceptance gate | Founder chooses reviewed tool + backup destination + privacy disclosure; separately approve a tiny export/import UI scope and recovery trial. No localStorage-only shortcut described as secure/durable. | Separate architecture/security/privacy approval, exact authenticated host/owner model, ACL tests, key custody, deletion/PITR evidence, backup restore drill, budget and retention approval. No new service today. |

**Pilot recommendation:** A, one owner, five sessions, encrypted manual files,
initially entirely invented data. Do not release “durable journal” until restore
works on the founder's physical iPhone and failure/deletion disclosures are
understood. If manual export is missed or Files/key recovery is too burdensome,
stop and reconsider B under a separately approved privacy/storage scope. Do not
quietly add localStorage, free-tier hosting or an unapproved encryption dependency.

## Five-session iPhone acceptance plan (future approval required)

Precondition: separate approved UI/encryption/import implementation; current PR
cannot execute this script. Founder selects tool/device and confirms availability;
no timed activation or cloud-agent substitution. Use invented assumptions first.
Keep a dated acceptance sheet outside the app, without secrets or account details.

1. **PASS / ownership:** owner records a reason-only PASS and incomplete WATCH.
   Explain that neither is a failure and source facts remain unverified. Deliberate
   encrypted export, cancel once without losing memory, then save to selected
   private destination. State that leaving without export can lose this session.
2. **Restore / privacy:** close/reopen Safari, import the right encrypted file.
   All IDs, clocks, choices and unknowns match. Wrong passphrase, corrupted or
   wrong-journal file produces one safe error and no partial overwrite. Confirm
   there is no plaintext file/download, analytics or hidden browser storage.
3. **Plan / edit:** record an explicitly assumed manual PLAN, then append an edit
   with a reason. Original receipt remains; changed assumptions require fresh B
   validation and acknowledgement. Append an invented paper entry and independent
   review. Process metrics identify their owner-reported basis, not real returns.
4. **Rollback / unknowns:** restore an older copy while retaining the newer trusted
   copy: refuse truncation/rewrite. Append duplicate IDs and an entry against an
   inactive decision: reject entire replay. Import without a trusted newer copy
   must warn that rollback/rewrites cannot be detected. No-entry and unknown
   reviews must remain distinct, including a later reported entry and override.
5. **Recovery / deletion:** restore encrypted backup on second authorized device
   with separately retained recovery material. Compare exact history; no clock
   repair or duplicate records. Practice deleting primary, backup and recoverable
   copies; document copies that remain and why, including Files/cloud backups.
   Lost-key trial must be explicitly unrecoverable if no recovery material exists.

Pass only if owner can explain PASS/WATCH value, manual/source distinction,
where copies live, known deletion limits and the recovery steps. Check Safari
focus/keyboard/VoiceOver and one-handed import/export later; no physical-device
acceptance is claimed by this offline PR. Do not encourage real entries or trades.

## Verification and rollback

`bash tests/unfarmd-journal/run.sh` compiles exact original risk code and the new
module, then runs focused adversarial tests. No network, SQL, real file import or
owner records; only temporary compiler/test artifacts. Reference commit must be
available locally (normal complete Git checkout); missing reference fails rather
than downloading a substitute. Root tests/types/lint/build/archive remain intact.
No workflow edits are authorized by #195: existing root CI covers its regressions
and types/build; the new focused suite must additionally be run explicitly. A
future aggregate should wire it into CI in that separately reviewed scope.

Local results for this implementation: **148 focused cases PASS**, **1,350 existing
Node regressions +107 Python tests PASS**, zero failures/skips; existing disposable
local PG/TLS security fixtures included. Locked `npm ci --ignore-scripts`, strict
TypeScript, lint (zero warnings), guarded optimized build, additive-scope/secret
review and append-only archive validation PASS. Two secret-scanner matches are
deliberately invented rejection fixtures, not credentials. Existing GitHub CI
results and exact head are recorded in the PR; local tests are not hosted source,
storage, device or backup/recovery acceptance. No UI changes or new screenshots.

Hold/close the draft to roll back. The production app imports none of this code;
no persistence, migrations, keys, counters, proof clocks, STOP or source budgets
exist to reset here. Future persistence approval is separate from code review,
source permission, operational acquisition and any commercial/legal approval.
