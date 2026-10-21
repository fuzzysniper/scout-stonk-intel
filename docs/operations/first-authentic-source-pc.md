# First authentic mint observation — PC execution card

**Review only. No release, SQL or request is authorized by this document.** Next founder action: confirm a continuous desktop availability interval in CDT (start/end), with Chrome/Edge DevTools and legitimate Vercel login available. Scheduling is not release or invocation approval. Select no new clocks until that reply.

## Refreshed state — October 21, 2026, 23:25 UTC

Main: `acd72f2d09cb9bec3f40fd8dcddcf031decae950`. `LOOKUP_APPROVAL` is disabled/null. Main's #141 preflight clocks expired; #142's proposed clocks also expired **without being merged**. Prior production usage has not been reconciled; assume neither zero attempts nor reusable authorization.

| Draft | Head | Role in this path |
| --- | --- | --- |
| [#139](https://github.com/fuzzysniper/scout-stonk-intel/pull/139) | `9792d2814d26567bba90715d9bd7ecd4ab5ac9b4` | Conditional mandatory SCRAM-PLUS correction; CI 39544600833 passed, hosted compatibility unproven. |
| [#142](https://github.com/fuzzysniper/scout-stonk-intel/pull/142) | `00dadfc9551c7c00d337ec63622236f463bded59` | Expired proposal; CI 39672855076 passed. Do not release/reuse it. |
| [#118](https://github.com/fuzzysniper/scout-stonk-intel/pull/118) | `6b06fb5853245424b98028d60c65c49435d28026` | Separate diagnostic work; not needed for this route. Disposable staging is retired. |
| #137 / #143 / #144 / #133 | Draft consumer/brand work | Not prerequisites for an owner-console proof; leave untouched. |

Minimum path: protection → separately approved classification release + one classification → optional #139 review/release → separately approved proof release + SQL authorization + one USDC POST. Public GET is a later release. Green CI and configured credentials are not live evidence or traffic authority.

## 1. Verify protection and exact deployment on the PC

Use the existing Vercel dashboard, team `riskledgerapp`, project `scout-stonk-intel`, ID `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`, repository `fuzzysniper/scout-stonk-intel`, production branch `main`.

- Review effective Authentication for **unique production URLs and `/api/mint-facts`**, including project/deployment overrides, path exclusions, bypass/share exceptions and Trusted Sources. Record nonsecret settings evidence; a homepage login screen alone is insufficient.
- Record actual `dpl_…` ID, immutable `scout-stonk-intel-<unique>-riskledgerapp.vercel.app` host, actual deployed 40-hex SHA, READY/production/Node runtime and normal production alias mappings. Repeat after **each** owner-approved normal GitHub/main release; all existing aliases must advance together only to its expected production target. STOP on unexpected mappings; no alias repair is authorized. A PR-head SHA or a green Vercel check is not deployed identity.
- Native `VERCEL_URL` / `VERCEL_GIT_COMMIT_SHA` must match that host/SHA, and the project pin must match. Confirm system identity through nonsecret deployment metadata; STOP if it cannot be established. Do not open/pull secret values.
- In Incognito, check **only the unique homepage** reaches Vercel login; do not probe an API. Log in legitimately on that exact origin in the execution browser, then open DevTools. No copied cookies, HAR export, bypass headers, environment pull or protection change.

STOP on uncertain identity, anonymous API exceptions, unavailable permissions or login. A previous connector 404 does not establish protection. No CLI deploy/promote/alias command is part of this procedure; `--skip-domain` already moved an alias in the retired experiment.

## 2. One separately approved DSN classification

Only **after confirmed PC availability**, prepare a new reviewed fixed-window change using the existing preflight gate (maximum five minutes), matching tests and [existing console procedure](exact-mint-lookups.md). Set explicit release and verification/stand-down deadlines with the founder. Do not reuse expired #141/#142 clocks or extend them automatically. Keep lookup disabled/null throughout classification.

Owner approves that exact release; normal GitHub/main → existing Vercel deployment only. Repeat step 1. On the PC, inspect public source at the **actual deployed** SHA (PowerShell, repository checkout; these commands send no application request):

```powershell
$deployedSha = 'APPROVED_DEPLOYED_40_HEX_SHA'
if ($deployedSha -notmatch '^[0-9a-f]{40}$') { throw 'STOP: verify deployed SHA' }
git fetch origin main
git show "${deployedSha}:lib/onchain-mint/server/config-preflight.ts"
git show "${deployedSha}:lib/onchain-mint/server/lookup-policy.ts"
git show "${deployedSha}:docs/operations/exact-mint-lookups.md"
```

Confirm both literal preflight clocks, five-minute duration, lookup disabled/null and the console's matching clocks/cutoff. Do not use the expired block from current main or #142. No runtime code changes are proposed here.

Git is optional: the same three files can be opened in GitHub's immutable deployed-commit view. Execution needs only the authenticated desktop browser and DevTools.

Separate owner GO must say **`READ_SCOUT_DSN_CATEGORY_ONCE`**, naming actual deployment ID, unique host, deployed SHA, exact UTC window and **one** attempt. Only then use the first JavaScript block from that deployed version of `exact-mint-lookups.md`, replacing its host/SHA/GO placeholders. **Pasting sends immediately** after guards pass. One operator/tab, before its ten-second-early cutoff. It sends exactly:

```http
POST /api/mint-facts?preflight=neon-dsn-v1
X-SCOUT-Preflight-Intent: neon-dsn-configuration-v1
X-SCOUT-Preflight-Commit: APPROVED_DEPLOYED_40_HEX_SHA

```

Empty body; same-origin browser credentials; no redirect/retry. Keep only the categorical result and approved nonsecret deployment/window metadata privately. There is no SQL/global one-shot counter; the page guard cannot prevent another tab. No database connection, SQL or Helius is authorized.

| Single result | Decision |
| --- | --- |
| `format_compatible_binding_unproven` | Format accepted only. Proceed to preparing step 4, not executing it. TLS/authentication/PLUS remain unproven; #139 is not required for parsing this format. |
| `blocked_required_channel_binding` | STOP for step 3. Never remove `channel_binding=require` or weaken TLS. |
| `dsn_missing` / `dsn_invalid_or_unapproved` | STOP for separate owner configuration review, without exporting a URL/key or borrowing another credential. |
| Any other result, timeout, redirect, lost response or uncertainty | STOP; a read may already have occurred. No retry or assumption of zero usage. |

Missing either release/readiness deadline means stand down. Expiry is not permission to select another window.

## 3. Conditional SCRAM-PLUS review only

Only a required-binding category triggers separate security review of draft #139 against then-current main. Its local tests cover mandatory PLUS, TLS certificate/hostname checks and fail-closed rejection of a server offering plain SCRAM; `enableChannelBinding:true` alone merely prefers PLUS. Re-run exact-head CI and review unchanged restricted-role/lookup gates before any separately approved normal release. No credential rewrite, role change or automatic merge.

Its offline evidence is **not** actual Vercel → Neon compatibility. If accepted format has no required-binding option, do not merge #139 merely to diagnose another failure. If the founder separately requires mandatory binding regardless of DSN format, STOP for that explicit policy review. Do not infer the negotiated mechanism from a successful query or from a provider-internal `pg_stat_ssl` row.

## 4. Independently gated Neon + Helius USDC proof

After classification and any necessary connector correction, obtain separate owner approval for (a) a reviewed source release with `LOOKUP_APPROVAL.phase="proof"` and absolute `START`/`END` clocks, at most 24 hours; (b) the matching owner SQL authorization below; and (c) one later invocation. No clocks are selected here. Disable/null the independent preflight in the proof release. Do not reinstall the already-installed `lookup.sql` migration or reuse the old canary.

Repeat step 1 for the actual proof deployment; inspect its `lookup-policy.ts`, `postgres-compatibility.ts` and console helper at that SHA. Only then may the **separately authorized owner** run this single atomic block in the existing Neon `scout-onchain` / production / `neondb` console. Replace the two symbolic values with the **same reviewed integer milliseconds** as the source. It is intentionally non-executable until filled. This is an owner authorization write, not a read-only diagnostic; no SQL is executed by this runbook preparation.

```sql
DO $scout_authorize$
DECLARE
  start_ms CONSTANT bigint := APPROVED_PROOF_START_MS;
  end_ms CONSTANT bigint := APPROVED_PROOF_END_MS;
  changed integer;
BEGIN
  IF start_ms < 0 OR end_ms <= start_ms OR end_ms-start_ms > 86400000
     OR end_ms <= floor(extract(epoch FROM clock_timestamp())*1000)::bigint THEN
    RAISE EXCEPTION 'STOP_INVALID_OR_EXPIRED_PROOF_WINDOW';
  END IF;
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

Any failure rolls back this block. Zero matching rows, uncertain acknowledgement or any evidence of earlier lookup usage means STOP for separately authorized reconciliation, **not** repeat, reset, reinstall or a new policy epoch. Do not paste an automatic COMMIT after an interactive row-count check. This block touches no `scout_mint` record and changes no privilege, function or credential.

Now obtain **`ONE_NEW_LOOKUP_POST`** GO, naming actual proof deployment ID/unique host/deployed SHA, exact `START`/`END`, canonical USDC and at most one Helius request. From that SHA, copy `scripts/ops/lookup-proof-console.js` into the authenticated unique-origin browser console: pasting defines a function and sends nothing. Then call **once**, only inside the matching source/SQL session:

```js
await scoutLookupProof({
  deploymentHost: 'APPROVED_PROOF_UNIQUE_HOST',
  commitSha: 'APPROVED_PROOF_DEPLOYED_40_HEX_SHA',
  notBeforeMs: APPROVED_PROOF_START_MS,
  expiresAtMs: APPROVED_PROOF_END_MS,
  go: 'ONE_NEW_LOOKUP_POST'
})
```

The exact mint is hardcoded in that helper: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. Native verified TLS/SNI + restricted login/function-body fingerprint precede `scout_lookup.step`; phase and both clocks must match SQL. Durable reservation commits **before** Helius. There is at most one proof RPC, finalized/jsonParsed `getAccountInfo` to `mainnet.helius-rpc.com`, five-second provider deadline, 64 KiB response ceiling, no retries/fallback. The helper bounds its API receipt to 32 KiB / 12 seconds. Admission/completion **do write** budget/lease/cache/proof records; this is expected only under the distinct proof approval.

Success requires helper `ok:true`, `production_rpc`/`rpc` delivery, native deployment headers/request ID, positive source slot, original SPL program `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`, exact integer supply/6 decimals, mint/freeze authorities and strict finalized identity. Save the sanitized receipt privately. `sourceRpcResponseSha256` hashes raw provider bytes on the server; `apiResponseSha256` independently hashes the API receipt in the browser. Raw RPC bytes are not returned or archived by this path. Request/reception clocks are observations, **not block time**; `slotTime` stays null. RPC-reported facts are not independently replayed chain verification or holder returns.

STOP on any error, cache delivery, malformed/late response, authentication failure or missing receipt. Never clear browser attempt markers, retry, refund admission or reset a circuit/lease. Unknown acknowledgement may have consumed the one durable reservation. Negotiated SCRAM is not exposed by the ordinary receipt; strict #139 enforcement, if used, is distinct from directly observing the authentication transcript. Application/APM redaction must exclude credential-bearing DSNs and Helius query strings before release.

## 5. Public GET only after an authentic proof

Separate review/approval changes source **and SQL** to `public` with the same still-valid clocks, requiring the actual completed proof hash, `proof_completed=true`, `seq=1`, no circuit/lease, and an atomic exactly-one-row guard. Use the existing [public-release procedure](exact-mint-lookups.md#founder-approval--short-execution-path-not-executed); never reset counters or extend a session to make it pass. If that proof window expired, STOP for a new reviewed policy decision; no automatic rearm.

After the approved normal release and deployment checks, a deliberate existing SCOUT IT action on canonical `https://scout.storkcoin.xyz` can issue `GET /api/mint-facts?mint=<exact mint>` with same-origin credentials. No homepage request, polling or auto-retry. Preserve Token-2022 uncertainty and negative/unknown results. Existing SQL caps: 31 lifetime RPCs including proof, 30/UTC day, 3/minute, ten-second spacing, one lease; cache preserves source time/hash. Actual billing/remaining account quota is unverified and needs owner review; no purchase is authorized.

Rollback is a separately reviewed normal source-disable release; any SQL disable requires its own owner approval. Preserve all counters, lease/circuit, proof receipt and credentials. Expiry closes acquisition without a cleanup query. No old-canary retry, disposable staging, alias repair, collector/scheduler action or new service is part of this path.
