# Native pilot — review candidate, OFF

Dependent on exact #281 `ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5`.
No route mounted, no build authority, `NATIVE_PILOT_ENABLED=false` and
`NATIVE_PILOT_BUILD=null`. No credential loader is evaluated, SQL executed,
provider requested or deployment authorized. Original signed lanes, owner root,
collector, proof policies and source limits are unchanged. Exact branch deployment
is suppressed before push. This is B's acquisition component for C's eventual
ordinary-history union, not another product or independent live service.

## Concrete boundary for A/C

`createNativePilot(config)` returns `inspect(Request)` and `stop(Request)`.
It is unconditionally held in this revision. Future inspection requires the exact
same-origin owner POST `/api/native-pilot`, JSON bytes `{"mint":"<approved mint>"}`,
and `x-unfarmd-native-intent: inspect`. STOP uses `stop`. C owns route/UI assembly;
there is no GET, polling, prefetch, source selector or arbitrary URL here.

`evidence-contract.ts` is an **exact byte/type-only mirror** of A's
`lib/native-evidence/contract.ts` at
`a1f9a9e0d5c3336098c5750b14b738acaec66372`. Imports retain original paths.
The finite guard verifies the upstream bytes; B does not fork/change A's contract.
Final union can use actual A types/functions structurally. `Configuration.intake`
must turn an original `RawBatch` into A's qualified `NativeEvidenceInputV1`;
`analyze` is A's synchronous `analyzeNativeEvidence`. B binds every A reference
to the exact batch host, method, request/response hashes and request/receipt clocks.
All three methods must be cited. A stays `candidate_only/providerAuthenticated:false`.
Only B's private real native TLS/reserve/finish assembly can create its separate
process-local `NativeObservation`; `verifiedNativeObservation` rejects copies,
JSON, injected transports, stale/STOPped objects and store/identity failures.
No boolean, URL, caller hash or offline result creates native origin.

**Current integration HOLD:** A's original holder qualifier only accepts
`api.mainnet.solana.com` / `api.mainnet-beta.solana.com`; Helius is not admitted.
A's same-batch wrapper at `b7168f754ad83b6539b59106933b127c964515c1`
can retain mint controls without a fourth call, but inherits that restriction.
No hostname relabel, old decoder edit, fabricated `getAccountInfo` capture or
fourth RPC is allowed. A must deliver an additive honestly named Helius intake
using the original binary readers/strict gates, then C must test actual A+B union.
Until then `intake` must return null and the slice remains unavailable.
Focused engine success uses an **explicit A-interface stub**, not actual analytics,
live evidence or a completed union. Original A public-RPC fixtures are not
rebranded Helius records. No findings/price/ROI are fabricated.

## Fixed request/cost plan

| Ordered attempt | Fixed request | Bound |
|---|---|---|
| 1 | `getTokenLargestAccounts(mint,{commitment:"finalized"})` | <=20 unique exact token accounts; original request id260001 |
| 2 | `getMultipleAccounts([mint,...selected],{encoding:"base64",commitment:"finalized",minContextSlot:selectionSlot})` | <=21 accounts in exact order; original id260002 |
| 3 | `getBlockTime(balanceSlot)` | required by original qualifier; original id260003 |

One exact mint, **THREE total attempted calls / <=15 minutes**, one outstanding
lease, >=2.5s spacing, <=5s per attempt, <=2KiB request, <=128KiB response,
<=16KiB headers. Total successful recipe is bounded by the original <=20s
qualifier. No retry, redirect, fallback provider, caller host, transaction,
wallet, enumerator, subscription or auto-extension. Null block time or invalid
account/extension/clock/mint is withheld. Selection/balance slots can differ:
`minContextSlot` is a lower bound; a requested finalized commitment is not an
independent validator finality proof. Request UTC and receipt UTC are actual
transport clocks; block time is an RPC estimate at the specified slot.

`plan(mints,debit)` models **1–4 explicit distinct exact mints offline** with
3N attempts and N times the three method debits. It always returns
`dispatchable:false`. Multi-mint estimates DO NOT broaden the live policy;
`policy` contains exactly one mint. No “batch = 1 credit” shortcut is used:
each method has a separately reviewed positive integer debit. A missing/zero
debit/review is denied. Current official [Helius credits](https://www.helius.dev/docs/billing/credits)
list standard RPC as one credit except listed exceptions and explicitly list
`getBlockTime` as one. That supports a **proposed 3-credit** first recipe, not
proof of current account entitlement or observed billing. Reserve the full
method debit before each attempted send; errors, timeouts and uncertainty stay
spent. No refund, policy refresh or old-canary budget reuse.

## Simpler proposed authorization — separate security decision

NEW lane only: owner approves a finite public policy and exact reviewed build,
immutable project/deployment/branch/origin, owner subject/issuer, exact mint,
method debit, key fingerprint, rights/retention and <=15-minute expiry. This is
an ordinary protected single-owner session model; **no Turnkey service or dual
signature is required**. It is not a replacement signature for any signed lane.
The existing global owner key/trust files and all old release verification stay
intact. A GitHub GO is an operational instruction, not an authenticated request.

`ownerSession` uses the actual Better Auth library and existing owner tables,
uncached/no-refresh signed `__Host` cookie, same-origin checks and the existing
immutable owner/issuer/audience/secret-hash policy. It mounts no login/signup,
issues no session and accepts no owner identity/header/email assertions. It
requires the original pinned native `StrictJournalClient` and actual TLS /
SCRAM-PLUS proof on each connection. Original SQL/roles are read only; no new
grant/schema required by this adapter. Its existing owner login/enrollment must
actually exist and work; Vercel Authentication alone is insufficient. Runtime
checks use actual platform variables plus an independently reviewed build
commit/tree pin; caller/configured target pins cannot mint identity. This
revision supplies neither build pin nor genuine runtime observation.

## Durable store and honest placement limitation

`openLedger` is a concrete persistent **single-host filesystem** adapter, not
an in-memory limiter or fake PostgreSQL store. It reuses the exact reviewed
#280 `fileAnchor` fsync/locking primitive as a library only, with a distinct
native policy, files and directory. No Turnkey SDK/account/signing or old beta
grant is consumed. The data file is `native-pilot.jsonl`; its independently
retained current anchor uses the inherited primitive's `beta-anchor.jsonl`
basename **inside a separate native-only directory**, never the old beta path.
Policy hash binds full finite scope. Immutable hash-chained state records
include spent attempts/credits, method, request hash, monotonic fence, uncertain
lease, completion hashes, clock and permanent STOP. No reset/refund/delete API.

Reserve: acquire exclusive non-expiring lock -> verify full ordered history
AND independent current anchor -> append reservation -> fsync data/directory ->
advance+fsync anchor -> ACK. Only then may the private wire read a key and send.
Finish follows the same ordering. Lost ACK, anchor outage, restart with lease,
clock rollback, expiry or fence failure never authorizes another call; STOP
cannot masquerade as successful reservation. Auth/identity are rechecked across
awaits and after finish. STOP cannot recall an already in-flight request; its
reserved maximum cost is already spent. STOP is terminal for the policy.

Files must be separately provisioned once by authorized operations, 0700
directories /0600 regular no-symlink files, initial state from `initialState`,
independently approved `bootstrap`. There is **no runtime initialize/reseed/repair**.
Independent current-anchor storage must not roll back with the target data.
Two self-consistent old snapshots, copied bootstrap, maxima or a stale restored
anchor are insufficient. Trust assumes a correctly behaving fsync/atomic O_EXCL
filesystem and a protected runtime/operator; a compromised administrator able
to rewrite both state and its independent current anchor defeats this model.
Never remove a leftover lock automatically or issue a fresh policy to retry.

**Placement HOLD:** Vercel ephemeral `/tmp` is NOT this durable store.
No existing persistent mount or independent anchor placement was verified.
The current native identity is Vercel-preview-specific, so a separate persistent
Node host cannot simply claim that identity. A reviewed existing durable mount
compatible with that runtime OR a separately reviewed concrete remote store /
observed-identity adapter is needed before dispatch. This PR does not provision
one, assume an old Render disk, add a service, or claim launch readiness. The
adapter is executable/tested now; it is not a fake distributed-store handoff.
Distributed/serverless operation is not supported by a local filesystem promise.
SQL execution is not authorized here; existing ancestor PG18 results are not
rerun or relabeled this store's hosted proof.

## Rights, retention, tests, rollback

Helius [CSA §3.1](https://www.helius.dev/terms) permits conditional own-business
integration. No bespoke enterprise letter is invented. Review actual private
display/combinations/retention and account/order terms, obey restrictions and
attribution, and confirm dedicated key methods, reviewed debit, included
headroom/reset and enforceable no-overage. Founder already supplied paid
Developer/10M-credit capacity and autoscaling-Off evidence; do not repeat that
screenshot ceremony. That is not traffic permission or current debit proof.
No paid resource, signup, secret installation or account inspection occurred.

Raw bodies stay request-memory-only and are cleared after A runs; the opaque
normalized view expires <=60s. JS copies/runtime/APM/provider logs cannot be
guaranteed physically erased. Durable metadata (owner/mint/policy/time/hash/
attempt/credit/fence/STOP/history) is retained immutable: approve that retention
explicitly. No raw bodies/API URLs/cookies/keys in the ledger, receipts or errors.
Operational logging/APM must redact query-string keys. No public redistribution.

Engineering checks (all local/synthetic, external requests blocked):
`NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/native-pilot/run.sh`.
Tests exercise actual fsync files, cross-process locking, restart, rollback,
currentness, missing anchor, wrong policy, truncation/STOP removal, lost ACK,
auth isolation, exact wire options and simulated TLS/error events, wrong
mint/host/slot/hashes, 429/503/timeouts, no retry, three-call budget and STOP.
Simulated TLS is **not** an actual certificate/SCRAM/hosted proof. No SQL test
is run. Full `npm test` reached the real PG harness and failed before any SQL
because binaries are absent; completing it would require separate local/CI SQL
authorization. `tests/native-pilot/root-offline.sh` executes the exact root prefix
before that harness plus other non-SQL root tests. It does not waive or claim
the remaining native PG/TLS, recursive Python or scheduler SQLite integration
tests passed. During validation, the inherited scheduler test did execute
disposable local SQLite before its scope was recognized; it was stopped and
excluded from this no-SQL workflow. No hosted database or PostgreSQL SQL was
executed. This is a disclosed boundary error, not a live readiness result.
Full existing guards remain on original immutable inputs and all
inherited runtime/source/UI bytes remain frozen by the new finite review guard.

Rollback before activation: close this additive draft. Future authorized
rollback: authenticated permanent STOP (or explicitly UNKNOWN/HOLD), unmount
new lane and withhold native output; retain all state, locks, anchors, spent
history and original collector/signed lanes. No automatic repair/reset/retry.

## One finite operational approval card — PROPOSED, NOT AUTHORIZATION

**HOLD until** C's actual union/CI, A's honest Helius intake, real owner login,
effective private edge/API protection, native immutable identity and durable
store/current-anchor placement are independently verified. Account/key debit,
retention and no-overage must be recorded without exporting a secret.

> After those gates pass, I approve ONLY the NEW native pilot on [exact reviewed
> SHA/tree, existing project, private branch, deployment ID/unique origin], for
> owner [subject/issuer], exact mint [one 32-byte base58 address], [UTC start/end
> <=15 minutes], Helius mainnet standard `getTokenLargestAccounts` ->
> `getMultipleAccounts` (base64/finalized) -> `getBlockTime`, <=THREE TOTAL
> attempted calls, <=[reviewed sum; proposed3] credits, one outstanding lease,
> no retry/fallback/auto-refresh. Use only separately authorized dedicated
> server-side key installation and reviewed immutable metadata/transient raw/
> 60-second derived retention. STOP on auth/source/state/cost/clock uncertainty.
> No old grant reuse, public display, trading, transaction/wallet operations,
> SQL/reset, new paid service or production change. This approves no further
> mint or future session; a wider20-token evaluation needs its own budget GO.

No founder terminal, password, private key, Codespaces or device-code step is
requested. Owner review is mobile-capable; actual enrollment/storage/secret/
protected deployment preparation remains a separately authorized operator task.
