# Issue #135: exact-mint lookup release

**Review-only. No live proof obtained.** `LOOKUP_APPROVAL.phase="disabled"` and null session clocks mean zero hosting/configuration/credential/SQL/RPC reads. Merging this implementation enables no acquisition and removes the deployed route's old-canary POST path. The old canary code, policy, absolute expiry, function and admission records are unchanged. Its production 503 cause and previous usage remain unknown; #131 proves a local TLS-proxy compatibility defect only.

## Frontend contract — Agent A / #134

Keep `GET /api/mint-facts?mint=<exact 32-byte base58 mint>`, existing `requestMintFacts`, deliberate SCOUT IT click and `MintFactsV1` unchanged. No new body fields, custom headers, candidates or address allowlist for the eventual public GET. It requires the existing same-origin browser fetch, approved canonical origin, production project/direct Vercel ingress and code + SQL approval. No request on page load, automatic retries/polling, alternate providers, market data or holder/ROI conclusions.

A 200 returns verified SPL base fields or `unsupported_extensions` with Token-2022 uncertainty. Supply stays an integer string with exact decimals. Missing account/wrong owner/token account returns the existing 404 negative; a valid address alone establishes no existence. Source failures remain 403/429/502/503/504, with null facts/source. New nonsecret headers: `X-SCOUT-Policy`, `X-SCOUT-Delivery` (`rpc` / `cache`), deployment host and commit. The source hash covers raw RPC response bytes, not the API envelope. Slot time remains null; reception time is not block time. Assurance remains RPC-reported, not independently replayed.

## Independent durable budget

`postgres/lookup.sql` is a single additive transaction for the **existing** database, using existing `scout_mint_runtime` membership and `scout_mint_app` login. It creates only `scout_lookup` tables/function and an inert row. No old schema alteration, new role/credential, automatic migration, upsert or reset. Reapplication fails/rolls back. Native transport selects the new function explicitly and pins its exact body SHA-256 and effective privileges before every transaction. Native verified client TLS/SNI remains mandatory. Required-binding DSNs additionally require the strict adapter below; provider-internal TLS remains unobserved and no hosted negotiation has been tested.

Two independent gates must match: source-code phase/window and SQL phase/window. At most 24 hours per session; fixed `lookup-v1` epoch, no rolling activation. Proof accepts only canonical mainnet USDC and reserves at most **one lifetime RPC**. Fenced successful proof persists its source hash, slot and checked-at time. Public mode requires that proof plus a separate owner code/SQL approval, retaining counters. The public backend already works under synthetic offline tests; it is not exposed live by this PR.

Across all isolates: one 15-second lease; 3 RPCs/UTC minute; 30/UTC day; 10-second minimum spacing; **31 lifetime RPCs including proof**; 30 admitted reads/minute globally, 6/client/minute. Thirty-second HMAC cache, at most eight 16 KiB entries; at most 128 HMAC-only client keys, 120-second logical retention. Expired cache/client rows are pruned on later approved admissions, not by a new background collector. After shutdown their physical footprint stays bounded until separately authorized cleanup. The small proof receipt remains in the policy row; no raw RPC body is retained there.

Each cache miss consumes one reservation before any Helius call, even if its acknowledgement is lost. A cache hit keeps original source clocks/hash. No refunds, retries or lease reclamation. Provider error, malformed/stale evidence, uncertain completion, clock regression or expired lease closes the new policy's circuit. Only supported negative account results complete normally without poisoning the service. App and SQL expiry both prevent new acquisition; expired completions cannot publish.

## Categorical DSN preflight — separate authorization, currently disabled

The installed production `lookup.sql` schema/function/tables are founder-confirmed. **Do not reinstall the migration.** This preflight does not query them or touch admission state. `PREFLIGHT_APPROVAL` is `enabled:false` with null clocks, and `LOOKUP_APPROVAL` remains disabled/null. Merely merging this draft exposes no configuration and authorizes no invocation.

A separate short-window, server-only POST branch at `/api/mint-facts?preflight=neon-dsn-v1` can read **only** `SCOUT_MINT_STORE_DATABASE_URL` after approval. It never returns the URL, host, role, database, password, query options, lengths, masks, hashes, exception messages or source facts. Response is exactly `{status: CATEGORY}` with private/no-store headers and no application logging. No SQL, pg pool, admission, Helius transport, fallback, credential writer or secret export is invoked. Parsing shares the connector's identity/credential validation without rewriting a mandatory requirement. The #138 categorical protocol and disabled approval are unchanged by the dependent strict-binding adapter.

| Category | Meaning |
| --- | --- |
| `dsn_missing` | Scoped DSN absent/empty. |
| `dsn_invalid_or_unapproved` | Malformed, wrong pinned identity, unsupported/ambiguous options or unsafe configuration. No field-specific detail. |
| `blocked_required_channel_binding` | Otherwise validated DSN requires binding. #138's baseline connector cannot enforce it; this conservative category still requires the separately reviewed strict adapter below and hosted verification. A format-only result cannot clear this gate. |
| `format_compatible_binding_unproven` | Current parser accepts the format; required binding, negotiated authentication and connectivity remain unproven. **Not permission to connect.** |
| `disabled` / `access_denied` / `preflight_unavailable` | Gate closed, request/runtime rejected, or sanitized failure. |

No category proves TLS connectivity, negotiated SCRAM/PLUS, database privileges or provider success. `enableChannelBinding:true` prefers PLUS; it does not enforce it. Never remove `channel_binding=require`, disable certificate/hostname verification or otherwise lower mandatory binding to make this check pass. This is configuration classification, not an onchain proof.

**Required separate approvals, none exercised by this PR:**

1. Owner reviews the exact code/CI and explicitly authorizes a normal preflight-only release on the existing project. First verify effective Vercel Authentication/no exceptions on unique production URLs; blocked metadata access must be resolved or supplied by the owner, not guessed. Review a dedicated `PREFLIGHT_APPROVAL` source change to `enabled:true` and literal UTC millisecond START/END (at most **five minutes**), selected once with release lead time. Keep `LOOKUP_APPROVAL` disabled with null clocks and all credentials unchanged. Normal GitHub/main release only, no disposable staging or alias commands. This task performs no merge/release/enablement.
2. After that separately approved release, record the actual production deployment ID, immutable unique hostname, deployed Git SHA, existing project ID, READY/production/Node runtime and effective Authentication/no exceptions. Confirm normal aliases. The immutable URL must match runtime `VERCEL_URL`; request commit must match `VERCEL_GIT_COMMIT_SHA`. Canonical public aliases, preview deployments and other projects are refused.
3. Owner then issues a distinct **READ_SCOUT_DSN_CATEGORY_ONCE** approval naming that deployment/commit/window and exactly one empty same-origin POST. It authorizes one server-only in-memory read/classification of the existing DSN, returning only the category; **no URL/key export, SQL, Helius, mint proof, RPC activation or credential change**. Use legitimate Vercel login on the unique origin, never a copied cookie or bypass. Execute once within the window; do not retry on errors.

The approved browser request is the following (definition/instructions only; **not executed**). Replace the two placeholders from verified deployment metadata. It emits only a whitelisted category and bounds body bytes; it never reads a credential:

```js
await (async () => {
  if (location.origin !== 'https://APPROVED_UNIQUE_HOST') return 'access_denied';
  const r = await fetch('/api/mint-facts?preflight=neon-dsn-v1', {
    method: 'POST', mode: 'same-origin', credentials: 'same-origin',
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(3000),
    headers: {'X-SCOUT-Preflight-Intent': 'neon-dsn-configuration-v1',
      'X-SCOUT-Preflight-Commit': 'APPROVED_DEPLOYED_40_HEX_SHA'}
  });
  if (!r.headers.get('content-type')?.includes('application/json') || !r.body) throw Error();
  const reader = r.body.getReader(); let bytes = 0, text = '';
  const decoder = new TextDecoder('utf-8', {fatal:true});
  try { while (true) {
    const c = await reader.read(); if (c.done) break;
    bytes += c.value.byteLength; if (bytes > 96) throw Error();
    text += decoder.decode(c.value, {stream:true});
  }} finally { void reader.cancel().catch(() => {}); }
  const b = JSON.parse(text + decoder.decode());
  const allowed = ['dsn_missing', 'dsn_invalid_or_unapproved',
    'blocked_required_channel_binding', 'format_compatible_binding_unproven',
    'disabled', 'access_denied', 'preflight_unavailable'];
  if (Object.keys(b).join(',') !== 'status' || !allowed.includes(b.status)) throw Error();
  return b.status;
})().catch(() => 'preflight_unavailable')
```

This is idempotent classification, **not a globally enforced one-shot**: there is no new distributed store or SQL counter. Source window, protected origin and explicit owner one-request discipline bound execution; concurrent authorized requests could each classify once. Expiry stops DSN reads automatically. After the single result, an owner-reviewed normal cleanup release sets `PREFLIGHT_APPROVAL` back to disabled/null (or removes the branch); keep mint acquisition disabled/null. No SQL/reset, credential rotation, protection change or billing/provisioning action is needed. The existing Vercel function can incur ordinary compute cost; there is no database/provider request from this preflight.

## Dependent fallback: mandatory SCRAM-SHA-256-PLUS

Prepared from exact #138 head `7b4e53a4a055b81e617911e46041b5666b26200d`; review #138 first. **No activation or production compatibility claim.** If its eventual category is `blocked_required_channel_binding`, this adapter is the required code correction before any separately approved proof. `dsn_missing` / `dsn_invalid_or_unapproved` remain blockers it cannot fix. `format_compatible_binding_unproven` does not require this fallback to parse the DSN and does not establish mandatory binding; do not claim PLUS on that path.

Only the exact query forms `?channel_binding=require`, `?sslmode=require&channel_binding=require` and `?channel_binding=require&sslmode=require` enter the strict path. Ambiguous/duplicate/extra options remain rejected. The opaque handle retains the requirement; `databaseParameters(handle)` without the mandatory client fails. Native store construction supplies the pinned strict client and requires its private per-socket attestation before **any SQL**, on every checkout. No connection-string SSL override, pgpass, custom stream, native/libpq fallback, provider fallback or weaker certificate check is introduced. Existing no-query / `?sslmode=require` behavior is unchanged.

The adapter uses pg **8.23.1**'s real SCRAM implementation. It rejects non-PLUS offers before a SASL response, cleartext/MD5/trust authentication, missing/out-of-order final messages, bad server signatures and Ready without verified PLUS. It permits connect/SQL only after pg validates the actual PLUS server signature, followed by AuthenticationOk, on an authorized TLS 1.2/1.3 socket with exact hostname/SNI and peer certificate. TLS renegotiation is disabled. A WeakMap records that particular socket; fake flags, another pooled client and a new connection cannot reuse the proof. Version/handler changes fail closed and require re-review. The adapter relies on private pinned pg auth hooks; upgrading pg is a security review, not a routine untested bump.

Offline evidence uses real disposable local PostgreSQL, synthetic credentials and ephemeral certificates. Tests inspect the actual selected mechanism and compare client `tls-server-end-point` bytes to the actual certificate digest, complete a genuine PostgreSQL PLUS exchange, reject a different-certificate TLS terminator at the real server, reject a non-PLUS proxy before credential proof/SQL, and test forged/missing finals with AuthenticationOk/Ready in the same packet. Existing restricted-role/catalog/function hash, disabled SQL phase, source gates and old-canary state are preserved. These tests prove implementation behavior, **not actual Vercel → Neon support**. A successful future approved connection on a required-binding handle would establish client-enforced PLUS on the verified frontend TLS socket; it cannot attest the provider's internal hop, independent chain replay or a client-certificate identity.

Shortest owner path: review #138 and this dependent draft; separately authorize the existing categorical preflight release/invocation, still with mint lookup disabled/null. If required binding is reported, include this reviewed adapter in the later normal proof release without editing the secret. Independently approve the existing exact source/SQL phase-window handshake and **one** protected-origin proof invocation below. Never reinstall the already-installed migration or change counters to retry. A PLUS/hostname/certificate/auth failure destroys the connection, returns generic `upstream_unavailable`, and performs no admission SQL or Helius request from that failed connection. It provides no diagnosis of historical usage. STOP; no automatic retry or weaker binding. Rollback keeps LOOKUP_APPROVAL disabled/null through a reviewed release and reverts this adapter; a required-binding DSN then becomes rejected again, never downgraded. No credentials, roles, SQL state, aliases or environment values change.

## Founder approval — short execution path (not executed)

1. **Review and approve** this PR, the additive migration and bounded session. Normal GitHub PR → main → existing Vercel production build only; no disposable deployments, domain changes or bypass links. Confirm CI, project `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`, primary `ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech`, `neondb` / `scout_mint_app` and unchanged aliases. Never export a secret value.
2. **Separately authorize owner SQL and proof release.** The exact production migration is already installed and founder-verified; **do not rerun it**. Before any future proof release, review the scoped configuration through the separately approved categorical preflight above. If required binding is reported, the dependent strict adapter must be reviewed and included; `pg.enableChannelBinding=true` alone is insufficient. Never remove the requirement or weaken TLS. Scoped keys/login/hostname must match; no old-bot fallback.
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
5. **Verify authentic success:** receipt `ok:true`, actual Vercel request ID/commit/host, `X-SCOUT-Delivery:rpc`, new policy ID, USDC exact mint, finalized/jsonParsed, original SPL program, source slot, exact integer supply/6 decimals, authorities, ordered request/response clocks and SHA-256. The console validates these and independently hashes the API receipt. Raw RPC SHA-256 is server-reported: raw provider bytes are not returned to the browser. Retain the nonsecret receipt privately; never save a cookie/key. This would establish actual runtime connectivity, compatible restricted-function execution and committed admission/completion. PLUS is client-enforced only if the deployed strict adapter used the required-binding handle; the preference-only path makes no such claim. Neither independently replays chain state.
6. **After that proof only**, owner reviews public GET activation: source `phase:"public"`, same clocks, plus owner SQL `UPDATE scout_lookup.policy SET mode='public' WHERE id='scout-helius-mint/lookup-v1' AND mode='proof' AND proof_completed AND seq=1 AND circuit IS NULL AND lease_id IS NULL AND proof_hash='APPROVED_SOURCE_HASH' RETURNING id,seq,proof_hash;` Require one row. Do not clear cache/counters, extend expiry or rearm. Normal deployment, then an explicitly approved deliberate SCOUT IT lookup can use arbitrary exact mints under the remaining budget.

Cost ceiling: one ordinary Helius `getAccountInfo` in proof, at most 31 total in this short session, with no retries/fallback. Helius credit pricing and Neon/Vercel metering depend on the existing account plans and are not verified here; admission/compatibility SQL also runs for cache hits/denials. No purchase/provisioning/billing action is included.

Rollback: source phase `disabled` through normal reviewed release and, if separately authorized, owner `UPDATE scout_lookup.policy SET mode='disabled' WHERE id='scout-helius-mint/lookup-v1';`. Pending work may consume its already reserved request; no successful completion after SQL disable. Preserve all counters, proof receipt, circuit and lease. Never roll back to/reinvoke the old canary. No DROP, TRUNCATE, bootstrap rerun or new epoch without review. Missing/uncertain acknowledgement always means STOP, not zero usage.

## Local validation

`npm ci`, `npm test` (with PostgreSQL 15+ binaries), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `bash scripts/archive-tool.sh check origin/main`. The tests use real disposable local PG, real certificate/hostname/SNI and SCRAM authentication, and a TLS-terminating proxy; all provider packets, credentials and hosting context are explicitly synthetic. No test establishes hosted Vercel → Neon or live Helius success. See the PR for exact totals and actual GitHub CI results.
