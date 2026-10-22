# Next desktop session: one authentic USDC proof

**Preparation only. No current release, SQL or invocation authorization.** #159 at `3cb69b0436c59100e75e40dcd7881c145f2e1954` is NO-GO after missed cutoffs. Do not merge it or reuse its window/SQL. No successor window is selected. Do not assume previous usage is zero.

## Next single founder action

Confirm the start and end of the next uninterrupted **desktop** session, with date and timezone (CDT or UTC). Scheduling does not approve a release, SQL or invocation. Until then both source gates remain disabled/null. This cleanup can be reviewed independently; a separately approved normal cleanup release closes the expired preflight without enabling mint acquisition or touching database state.

Founder reported `format_compatible_binding_unproven` for the previous DSN classification. No repeat classification is needed on that evidence alone. Native Neon connectivity remains unproven; #139 stays draft unless a separately demonstrated binding blocker requires its review. Mandatory TLS/SNI and any channel-binding requirement remain intact.

## Three approvals, in order

### 1. Release — after availability is confirmed

Prepare a new proof-only draft from then-current main: preflight disabled/null, `LOOKUP_APPROVAL.phase="proof"`, reviewed fixed UTC clocks, public GET disabled. Choose cutoffs allowing CI, owner review, normal deployment, protection checks and owner SQL to finish before the window starts. Missed cutoffs mean stand down; no automatic extension. Review the exact source/CI and SQL together. No runtime/provider/migration/budget change is needed merely to select a session.

Founder wording, with **all** placeholders replaced after review:

> RELEASE GO: normal GitHub/main release of PR [number], reviewed head [40-hex SHA], proof window [UTC start/end], release cutoff [UTC], deployment/SQL readiness cutoff [UTC]. USDC proof only; public GET and preflight remain off. This does not authorize SQL or an invocation.

No disposable staging, `--skip-domain`, manual production deployment, alias command or protection exception. This preparation performs no merge or deployment.

### 2. Immutable deployment verification, then separately approved atomic owner SQL

Founder records the actual `dpl_…`, immutable unique hostname and **deployed** SHA (possibly a merge/squash SHA), plus reviewed PR head. Verify READY, production, Node.js, team `riskledgerapp`, project `scout-stonk-intel` / `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`, repository and production branch `main`. Inspect the deployed diff: only approved proof clocks/phase and preflight disabled/null. Native `VERCEL_URL` / `VERCEL_GIT_COMMIT_SHA` must agree with this identity; never invent them or export environment values. Preserve credentials. If metadata is unavailable, STOP.

Verify effective Vercel Authentication for **this unique production URL and `/api/mint-facts`**, including project/deployment overrides, exclusions, bypass/share links and Trusted Sources. Check the unique homepage logged out; a login redirect alone does not prove API protection. Do not send a diagnostic/API request to test protection. All four existing production aliases must map to the expected normal Git release; capture before/after mappings, not secret values. Incomplete protection, unexpected alias mapping or identity mismatch means STOP, not an authorized repair. GitHub/Vercel green checks cannot substitute for these checks.

Only then review a **new exact SQL block** tied to that identity and new source window. Do not copy #159's expired block, reuse its numbers, rerun `lookup.sql`, or execute the former interactive `BEGIN`/`COMMIT` example. The future block must be one atomic owner `DO` statement (no assumption of pooled editor session continuity), with these acceptance conditions:

- Exact `neondb` primary context, reviewed owner identity, no recovery, unexpired readiness cutoff and new fixed clocks matching deployed source; no app credential export.
- Exactly the `scout-helius-mint/lookup-v1` row changes from `mode='disabled'`, null clocks, `seq=0`, no circuit/lease/last RPC, zero highest slot, no proof completion/hash/slot/checked-at. Missing, used, armed or uncertain state is a blocker, never a reset opportunity.
- Set **only** `mode='proof'`, `not_before` and `expires_at`. Require exactly one affected row; otherwise raise and roll back the whole statement. Preserve all counters, client/cache/history and legacy canary state. No schema/function/role/permission changes or admission-function invocation.
- Owner verifies one successful atomic acknowledgement. Error, zero rows, missing acknowledgement or timing ambiguity means STOP; do not resubmit or infer no write.

Founder wording:

> SQL GO: execute once the reviewed atomic authorization block [exact revision/digest], matching [deployment ID, unique host, deployed SHA] and [new UTC window], before [readiness cutoff]. No migration, reset or provider traffic. Invocation remains unauthorized.

No executable SQL is supplied now because no successor window is approved. The installed schema/function are owner-reported; this preparation does not query them. Runtime still checks the restricted role/privileges, function fingerprint and code/SQL handshake before admission. Unknown usage or a mismatched fingerprint blocks the proof.

### 3. One founder-authenticated USDC POST

After steps 1–2, readiness cutoff met, correct window active and legitimate desktop login on the verified **unique origin**, founder issues:

> ONE_NEW_LOOKUP_POST GO: [deployment ID], [unique host], [actual deployed SHA], [UTC start/end], canonical USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. One new-policy native Neon admission/completion and at most one Helius `getAccountInfo`, finalized/jsonParsed; no retries, old canary, public GET or fallback.

Owner pastes the reviewed deployment's [existing console helper](../../scripts/ops/lookup-proof-console.js) into that authenticated desktop tab. Pasting defines a function and sends nothing. Only after GO, owner calls **once** with the verified values:

```js
await scoutLookupProof({
  deploymentHost: 'APPROVED_UNIQUE_HOST',
  commitSha: 'APPROVED_DEPLOYED_40_HEX_SHA',
  notBeforeMs: APPROVED_START_MS,
  expiresAtMs: APPROVED_END_MS,
  go: 'ONE_NEW_LOOKUP_POST'
})
```

Placeholders above are deliberately not executable authorization. Do not refresh, clear the browser marker, open another tab to retry, export cookies/HAR, use bypass tokens or substitute an agent/CLI/cloud origin. The helper sends one empty same-origin POST; SQL supplies the durable lifetime proof cap. Public GET stays off. Any error, redirect, timeout, missing receipt or uncertain execution means STOP, not zero usage.

Success requires `ok:true`, `X-SCOUT-Delivery:rpc`, matching deployment/commit/new policy, exact USDC, original SPL program, integer supply with six decimals, authorities, finalized source slot, ordered source clocks and raw-response SHA-256. Slot time stays null. Save only the nonsecret receipt privately. Its API hash is browser-computed; the raw RPC hash is server-reported, not independently replayed. Do not claim negotiated SCRAM/PLUS, a separate chain replay, prices or returns. Synthetic tests are not hosted proof.

The native Helius request remains at most five seconds / 64 KiB, with no retries or alternate provider. A durable reservation consumes the one proof allowance even if acknowledgement or response is lost. Existing leases, fencing, completion checks, circuit and all rate/lifetime limits remain unchanged. Existing Helius/Neon/Vercel account metering applies; exact monetary cost is unverified. No billing or provisioning action is authorized.

## Mobile review and recovery

On mobile the founder can review the draft diff, CI, source SHA and nonsecret Vercel metadata/protection settings through legitimate login; confirm desktop availability; give approvals tied to fully verified records; and later inspect a sanitized receipt. Homepage login alone is insufficient API-protection evidence. The current procedure still requires the founder's desktop authenticated-origin console for invocation. No mobile substitute, shared cookie or agent execution is authorized.

If any cutoff fails, stand down. A missed or uncertain session needs new review and approvals, not later clocks or recycled SQL. If SQL was already armed, do not assume it remained unused: preserve that history and escalate. Disabling its mode requires a separate owner-reviewed, exact-row/window conditional operation, not a counter/lease/circuit/cache/proof reset. No SQL is executed by this runbook.

Source rollback uses a separately approved normal release returning lookup to disabled/null while leaving preflight disabled/null. In-flight reserved work may already consume the request; shutdown is not a refund. Never reinstall the migration, clear state, create another epoch, invoke the old canary, or fall back to another provider. Public GET requires a later independent review of authentic proof and matching code/SQL gates; it is not included in these approvals.
