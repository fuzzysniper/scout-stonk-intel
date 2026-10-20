# Issue #135: exact-mint lookup release

**Review-only. No live proof obtained.** `LOOKUP_APPROVAL.phase="disabled"` and null session clocks mean zero hosting/configuration/credential/SQL/RPC reads. Merging this implementation enables no acquisition and removes the deployed route's old-canary POST path. The old canary code, policy, absolute expiry, function and admission records are unchanged. Its production 503 cause and previous usage remain unknown; #131 proves a local TLS-proxy compatibility defect only.

## Frontend contract — Agent A / #134

Keep `GET /api/mint-facts?mint=<exact 32-byte base58 mint>`, existing `requestMintFacts`, deliberate SCOUT IT click and `MintFactsV1` unchanged. No new body fields, custom headers, candidates or address allowlist for the eventual public GET. It requires the existing same-origin browser fetch, approved canonical origin, production project/direct Vercel ingress and code + SQL approval. No request on page load, automatic retries/polling, alternate providers, market data or holder/ROI conclusions.

A 200 returns verified SPL base fields or `unsupported_extensions` with Token-2022 uncertainty. Supply stays an integer string with exact decimals. Missing account/wrong owner/token account returns the existing 404 negative; a valid address alone establishes no existence. Source failures remain 403/429/502/503/504, with null facts/source. New nonsecret headers: `X-SCOUT-Policy`, `X-SCOUT-Delivery` (`rpc` / `cache`), deployment host and commit. The source hash covers raw RPC response bytes, not the API envelope. Slot time remains null; reception time is not block time. Assurance remains RPC-reported, not independently replayed.

## Independent durable budget

`postgres/lookup.sql` is a single additive transaction for the **existing** database, using existing `scout_mint_runtime` membership and `scout_mint_app` login. It creates only `scout_lookup` tables/function and an inert row. No old schema alteration, new role/credential, automatic migration, upsert or reset. Reapplication fails/rolls back. Native transport selects the new function explicitly and pins its exact body SHA-256 and effective privileges before every transaction. Native verified client TLS/SNI remains mandatory; provider-internal TLS and negotiated SCRAM/PLUS are unobserved.

Two independent gates must match: source-code phase/window and SQL phase/window. At most 24 hours per session; fixed `lookup-v1` epoch, no rolling activation. Proof accepts only canonical mainnet USDC and reserves at most **one lifetime RPC**. Fenced successful proof persists its source hash, slot and checked-at time. Public mode requires that proof plus a separate owner code/SQL approval, retaining counters. The public backend already works under synthetic offline tests; it is not exposed live by this PR.

Across all isolates: one 15-second lease; 3 RPCs/UTC minute; 30/UTC day; 10-second minimum spacing; **31 lifetime RPCs including proof**; 30 admitted reads/minute globally, 6/client/minute. Thirty-second HMAC cache, at most eight 16 KiB entries; at most 128 HMAC-only client keys, 120-second logical retention. Expired cache/client rows are pruned on later approved admissions, not by a new background collector. After shutdown their physical footprint stays bounded until separately authorized cleanup. The small proof receipt remains in the policy row; no raw RPC body is retained there.

Each cache miss consumes one reservation before any Helius call, even if its acknowledgement is lost. A cache hit keeps original source clocks/hash. No refunds, retries or lease reclamation. Provider error, malformed/stale evidence, uncertain completion, clock regression or expired lease closes the new policy's circuit. Only supported negative account results complete normally without poisoning the service. App and SQL expiry both prevent new acquisition; expired completions cannot publish.

## Founder approval — short execution path (not executed)

1. **Review and approve** this PR, the additive migration and bounded session. Normal GitHub PR → main → existing Vercel production build only; no disposable deployments, domain changes or bypass links. Confirm CI, project `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`, primary `ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech`, `neondb` / `scout_mint_app` and unchanged aliases. Never export a secret value.
2. **Separately authorize owner SQL and proof release.** Owner applies `lib/onchain-mint/server/postgres/lookup.sql` once. Before that, review existing scoped DSN configuration privately: only no query or `?sslmode=require` is supported; URL `channel_binding=require` is rejected because `pg.enableChannelBinding=true` prefers PLUS but does not enforce it. Do not silently remove a required binding policy. If this requirement exists, STOP for a separately reviewed connector correction. Scoped keys/login/hostname must match; no old-bot fallback.
3. Pick absolute UTC millisecond `START` / `END` (at most 24 hours) in a reviewed source change to `LOOKUP_APPROVAL` (`phase:"proof"`, those exact clocks). Owner authorizes the matching SQL below. It must affect **one** fresh disabled row. No counter, circuit, lease or expiry repair. Wait for the normal deployment, then verify its exact Git commit and unique production URL, effective Vercel Authentication with no exceptions, existing project, aliases and protected-origin login. GET stays OFF.

   ```sql
   BEGIN;
   UPDATE scout_lookup.policy
      SET mode='proof', not_before=START, expires_at=END
    WHERE id='scout-helius-mint/lookup-v1' AND mode='disabled'
      AND seq=0 AND circuit IS NULL AND lease_id IS NULL
      AND NOT proof_completed AND not_before IS NULL AND expires_at IS NULL
   RETURNING id, mode, seq, not_before, expires_at;
   -- Owner checks exactly one row; otherwise ROLLBACK and STOP.
   COMMIT;
   ```

4. **Separate invocation GO:** approve exactly `ONE_NEW_LOOKUP_POST`, the deployed commit/host, canonical USDC, that fixed session/window, and at most one Helius request. This permits new-policy native Neon admission/completion SQL and one `getAccountInfo`; it does not authorize retry or the old canary. Pasting `scripts/ops/lookup-proof-console.js` into the authenticated unique-origin desktop browser console only defines the function and sends nothing. Owner then calls once with the approved values:

   ```js
   await scoutLookupProof({deploymentHost: 'REVIEWED_UNIQUE_HOST',
     commitSha: 'REVIEWED_DEPLOYED_40_HEX_SHA', notBeforeMs: START,
     expiresAtMs: END, go: 'ONE_NEW_LOOKUP_POST'})
   ```

   Mobile can approve/review the receipt; execution needs a desktop browser console (or its attached mobile Web Inspector). Do not paste/export authentication cookies. The tool uses existing same-origin authentication, no bypass. It sends one empty POST, no redirects/retries, a 12-second local deadline and bounded 32 KiB receipt parsing. SQL, not browser storage, supplies the shared one-request cap. STOP on any error, missing receipt, cache delivery, redirection or authentication failure. Do not click again.
5. **Verify authentic success:** receipt `ok:true`, actual Vercel request ID/commit/host, `X-SCOUT-Delivery:rpc`, new policy ID, USDC exact mint, finalized/jsonParsed, original SPL program, source slot, exact integer supply/6 decimals, authorities, ordered request/response clocks and SHA-256. The console validates these and independently hashes the API receipt. Raw RPC SHA-256 is server-reported: raw provider bytes are not returned to the browser. Retain the nonsecret receipt privately; never save a cookie/key. This would establish actual runtime connectivity, compatible restricted-function execution and committed admission/completion. It cannot establish a negotiated SCRAM mechanism or independently replay chain state.
6. **After that proof only**, owner reviews public GET activation: source `phase:"public"`, same clocks, plus owner SQL `UPDATE scout_lookup.policy SET mode='public' WHERE id='scout-helius-mint/lookup-v1' AND mode='proof' AND proof_completed AND seq=1 AND circuit IS NULL AND lease_id IS NULL AND proof_hash='APPROVED_SOURCE_HASH' RETURNING id,seq,proof_hash;` Require one row. Do not clear cache/counters, extend expiry or rearm. Normal deployment, then an explicitly approved deliberate SCOUT IT lookup can use arbitrary exact mints under the remaining budget.

Cost ceiling: one ordinary Helius `getAccountInfo` in proof, at most 31 total in this short session, with no retries/fallback. Helius credit pricing and Neon/Vercel metering depend on the existing account plans and are not verified here; admission/compatibility SQL also runs for cache hits/denials. No purchase/provisioning/billing action is included.

Rollback: source phase `disabled` through normal reviewed release and, if separately authorized, owner `UPDATE scout_lookup.policy SET mode='disabled' WHERE id='scout-helius-mint/lookup-v1';`. Pending work may consume its already reserved request; no successful completion after SQL disable. Preserve all counters, proof receipt, circuit and lease. Never roll back to/reinvoke the old canary. No DROP, TRUNCATE, bootstrap rerun or new epoch without review. Missing/uncertain acknowledgement always means STOP, not zero usage.

## Local validation

`npm ci`, `npm test` (with PostgreSQL 15+ binaries), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `bash scripts/archive-tool.sh check origin/main`. The tests use real disposable local PG, real certificate/hostname/SNI and SCRAM authentication, and a TLS-terminating proxy; all provider packets, credentials and hosting context are explicitly synthetic. No test establishes hosted Vercel → Neon or live Helius success. See the PR for exact totals and actual GitHub CI results.
