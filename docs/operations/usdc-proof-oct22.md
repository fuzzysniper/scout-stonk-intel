# October 22: one protected USDC proof — review only

**No release, SQL or invocation is authorized by this document.** Founder reports `format_compatible_binding_unproven` from the separately authorized preflight at production commit `aede88cf1edda125ea2af757a51d03221860aa31`. This is owner-reported format evidence, not an independent connectivity/authentication observation. #139 stays draft; no required binding or TLS rule is removed. [PC runbook #146](https://github.com/fuzzysniper/scout-stonk-intel/pull/146) was reviewed at `02b91ec3eb02bee0bc31a4982f58a9acc712600f`; it remains separate and unchanged.

| Proposed gate, October 22 | UTC | CDT |
| --- | --- | --- |
| Separate release approval cutoff | 19:43 | 2:43 PM |
| Actual deployment/protection verified and separately approved SQL completed | Before 19:48 | Before 2:48 PM |
| Proof window, start inclusive / end exclusive | 19:50–20:00 | 2:50–3:00 PM |
| Operator's latest start | Before 19:59:30 | Before 2:59:30 PM |

If review, CI, deployment, SQL or founder availability cannot meet these gates, **stand down**. Do not release late, extend automatically or replace the window without a new reviewed proposal/approval.

Only `LOOKUP_APPROVAL.phase="proof"`, `notBeforeMs=1792698600000`, `expiresAtMs=1792699200000` are proposed. Public GET remains disabled. The independent expired preflight is cleaned to `enabled:false`, null clocks in this same release; it cannot classify again. No API/transport/admission algorithm, migration, credential, budget, legacy canary or collector changes.

## Approval 1 — release only

Owner wording: **“Approve the normal proof-only release of PR [number] at [reviewed head SHA], October 22 19:50–20:00 UTC, public GET disabled and preflight disabled/null. This approves no SQL or invocation.”** Approve only after exact-head CI/security review is green, before 19:43 UTC. Normal GitHub/main → existing Vercel Git release only; no manual/disposable deployment, promotion or alias command. Do not merge any other draft as a dependency.

After that independently approved release, owner records the **actual** `dpl_…`, unique `scout-stonk-intel-<unique>-riskledgerapp.vercel.app` hostname, deployed 40-hex SHA (may differ from PR head), READY / production / Node runtime, repository and project `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`, team riskledgerapp. Inspect deployed source for the exact proof clocks and preflight cleanup. Native `VERCEL_URL` / `VERCEL_GIT_COMMIT_SHA` must agree; no fabricated hosting identity.

Review effective Vercel Authentication for unique production URLs **and `/api/mint-facts`**, including project/deployment overrides, path exclusions, bypass/share exceptions and Trusted Sources. Compare all production aliases before/after: only the expected normal production target may advance together. STOP on uncertain identity/protection or unexpected aliases; no repair is authorized. A green Vercel check or homepage login alone does not prove API protection. In Incognito check only the unique homepage, then use legitimate Vercel login on the exact execution origin with desktop DevTools. No API probe, cookie/HAR export, bypass header, secret-value view or environment pull.

## Approval 2 — one owner SQL authorization, not executed

The existing installed `scout_lookup` migration is founder-confirmed; **do not reinstall it**. Reviewed source remains `lib/onchain-mint/server/postgres/lookup.sql`; runtime requires its exact `c5aedb841dc23f6012bd1ef2935262f2a3899e6b11b62c0386d7f45fc436e0c0` function-body fingerprint, restricted `scout_mint_app` login/privileges and verified native TLS/SNI before admission. Installed role/function compatibility is unproven until the future runtime executes those checks. Do not run diagnostic SQL to guess it now.

Owner wording: **“Authorize executing once the exact authorization block below in existing Neon project `snowy-haze-83201847` (scout-onchain), production branch, `neondb`, for the verified proof deployment [ID/host/SHA] and October 22 19:50–20:00 UTC. No migration, reset, privilege/credential change or invocation is authorized.”** Use the existing authorized owner console; the app login cannot perform this UPDATE.

Run only after approval 1's actual deployment checks, before 19:48 UTC. This is an atomic authorization **write**, not a read-only connectivity test. It changes only mode/clocks on exactly one fresh lookup policy. All counters/history remain untouched. Uncertain acknowledgement, zero matching rows or any prior usage means STOP, not repeat or repair.

```sql
DO $scout_authorize$
DECLARE
  start_ms CONSTANT bigint := 1792698600000;
  end_ms CONSTANT bigint := 1792699200000;
  authorize_before_ms CONSTANT bigint := 1792698480000;
  changed integer;
BEGIN
  IF current_database() <> 'neondb' OR pg_is_in_recovery()
     OR floor(extract(epoch FROM clock_timestamp())*1000)::bigint >= authorize_before_ms
     OR start_ms < 0 OR end_ms <= start_ms OR end_ms-start_ms > 86400000 THEN
    RAISE EXCEPTION 'STOP_WRONG_DATABASE_OR_PROOF_WINDOW';
  END IF;
  PERFORM pg_catalog.set_config('lock_timeout','100ms',true);
  UPDATE scout_lookup.policy
     SET mode='proof', not_before=start_ms, expires_at=end_ms
   WHERE id='scout-helius-mint/lookup-v1' AND mode='disabled'
     AND seq=0 AND circuit IS NULL AND lease_id IS NULL
     AND lease_mint IS NULL AND lease_until IS NULL AND last_rpc IS NULL
     AND highest_slot=0 AND NOT proof_completed
     AND proof_hash IS NULL AND proof_slot IS NULL AND proof_checked_at IS NULL
     AND not_before IS NULL AND expires_at IS NULL;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'STOP_EXPECTED_ONE_FRESH_LOOKUP_POLICY'; END IF;
END;
$scout_authorize$;
```

The single DO block commits atomically on success or rolls back on exception; no interactive UPDATE/COMMIT split. Wrong/changed policy, missing schema, permissions, timeout or lost acknowledgement means STOP. Do not clear a circuit/lease, reset sequence/cache, change an epoch or touch `scout_mint`. The new lookup budget is independent of the unknown old canary usage.

## Approval 3 — one authenticated USDC invocation

Owner wording: **“ONE_NEW_LOOKUP_POST: deployment [actual ID], [unique hostname], [actual deployed SHA], October 22 19:50–20:00 UTC, canonical USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, at most one finalized/jsonParsed Helius getAccountInfo and the required native Neon admission/completion transactions. No retry, public GET or other mint.”** This GO is distinct from release and owner SQL approval.

After all three approvals, copy `scripts/ops/lookup-proof-console.js` from the **actual deployed SHA** into the authenticated unique-origin desktop console. Pasting that unchanged helper only defines the function. Then call once inside the approved window, before 19:59:30 UTC:

```js
await scoutLookupProof({
  deploymentHost: 'APPROVED_ACTUAL_UNIQUE_HOST',
  commitSha: 'APPROVED_ACTUAL_DEPLOYED_40_HEX_SHA',
  notBeforeMs: 1792698600000,
  expiresAtMs: 1792699200000,
  go: 'ONE_NEW_LOOKUP_POST'
})
```

Exactly one empty same-origin POST, no redirect/retry. Source and SQL phase and both clocks must match. Native verified TLS/SNI, role/permission/function fingerprint and atomic durable admission precede Helius. At most one proof RPC is durably charged **before dispatch**, even if its acknowledgement/result is lost. No memory limiter, alternate RPC, old credential or legacy canary fallback. The source uses a five-second provider deadline / 64 KiB response ceiling; the console bounds the API receipt to 12 seconds / 32 KiB. Admission and completion write budget/lease/cache/proof records under this explicit approval. Ordinary Neon/Vercel compute and existing Helius plan metering apply; account pricing/quota are not verified here and no billing action is authorized.

Success requires helper `ok:true`, actual deployment/request identity, `X-SCOUT-Delivery:rpc`, policy `scout-helius-mint/lookup-v1`, `production_rpc`, exact USDC mint, original SPL program `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`, finalized source slot, exact integer supply/6 decimals, mint/freeze authorities, strict source clocks and SHA-256. Do not predict supply/authorities. Save only the sanitized receipt privately. Server-reported `sourceRpcResponseSha256` covers raw provider bytes; independently computed `apiResponseSha256` covers the returned API bytes. Raw RPC bytes are not returned/archived by this path. Reception time is not block time (`slotTime:null`); assurance remains `rpc_reported_not_independently_replayed`. Neither this receipt nor the reported DSN category proves negotiated SCRAM-PLUS or provider-internal TLS. A separately demonstrated required-binding blocker, not speculation, is needed before revisiting #139.

On any error, non-200, cache delivery, malformed/stale response, authentication failure, missing receipt or uncertain completion: **STOP_NO_RETRY**. Never clear the browser attempt marker, infer zero usage or refund/reset admission. Preserve the receipt/error category and nonsecret identity privately; no raw logs containing credentials/Helius query strings. Existing APM/log redaction must be verified before release.

## Expiry, rollback and later public GET

At 20:00 UTC source/SQL expiry closes acquisition and successful completion. Afterwards prepare a separate reviewed normal cleanup restoring LOOKUP disabled/null; the preflight is already disabled/null in this draft. Do not reuse this window or automatically switch to public.

If early shutdown is needed, a separately approved source-disable release prevents new route work. Only with **separate owner rollback SQL approval**, run this atomic one-row disable; it preserves all clocks/counters/proof/circuit/lease/cache history:

```sql
DO $scout_disable$
DECLARE changed integer;
BEGIN
  PERFORM pg_catalog.set_config('lock_timeout','100ms',true);
  UPDATE scout_lookup.policy SET mode='disabled'
   WHERE id='scout-helius-mint/lookup-v1' AND mode='proof'
     AND not_before=1792698600000 AND expires_at=1792699200000;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'STOP_EXPECTED_ONE_MATCHING_PROOF_POLICY'; END IF;
END;
$scout_disable$;
```

An already reserved request may still consume its one RPC; uncertain acknowledgement is never retry authority. No DROP/TRUNCATE, migration reapplication, epoch change, source/provider fallback, alias change or credential rotation. Public GET needs a later independent code + SQL approval after genuine committed proof, retaining all counters and a valid reviewed session. This draft does not approve it.
