# Issue #135: exact-mint lookup release

**Review candidate only; no release/SQL/POST authorization.** Main and the independent cleanup candidate keep LOOKUP disabled/null. This unmerged proof candidate proposes `phase="proof"`, Oct 23 15:45–16:00 UTC (`1792770300000` / `1792771200000`), with public GET off and preflight disabled/null. Runtime changes only that phase and its two clocks after independent cleanup. Owner approval and normal release are required before any source activation. Existing canary code/history and unknown prior usage are untouched. #131 is local compatibility evidence, not a proven production diagnosis.

## Frontend contract — Agent A / #134

Keep `GET /api/mint-facts?mint=<exact 32-byte base58 mint>`, existing `requestMintFacts`, deliberate SCOUT IT click and `MintFactsV1` unchanged. No new body fields, custom headers, candidates or address allowlist for the eventual public GET. It requires the existing same-origin browser fetch, approved canonical origin, production project/direct Vercel ingress and code + SQL approval. No request on page load, automatic retries/polling, alternate providers, market data or holder/ROI conclusions.

A 200 returns verified SPL base fields or `unsupported_extensions` with Token-2022 uncertainty. Supply stays an integer string with exact decimals. Missing account/wrong owner/token account returns the existing 404 negative; a valid address alone establishes no existence. Source failures remain 403/429/502/503/504, with null facts/source. New nonsecret headers: `X-SCOUT-Policy`, `X-SCOUT-Delivery` (`rpc` / `cache`), deployment host and commit. The source hash covers raw RPC response bytes, not the API envelope. Slot time remains null; reception time is not block time. Assurance remains RPC-reported, not independently replayed.

## Independent durable budget

`postgres/lookup.sql` is a single additive transaction for the **existing** database, using existing `scout_mint_runtime` membership and `scout_mint_app` login. It creates only `scout_lookup` tables/function and an inert row. No old schema alteration, new role/credential, automatic migration, upsert or reset. Reapplication fails/rolls back. Native transport selects the new function explicitly and pins its exact body SHA-256 and effective privileges before every transaction. Native verified client TLS/SNI remains mandatory; provider-internal TLS and negotiated SCRAM/PLUS are unobserved.

Two independent gates must match: source-code phase/window and SQL phase/window. At most 24 hours per session; fixed `lookup-v1` epoch, no rolling activation. Proof accepts only canonical mainnet USDC and reserves at most **one lifetime RPC**. Fenced successful proof persists its source hash, slot and checked-at time. Public mode requires that proof plus a separate owner code/SQL approval, retaining counters. The public backend already works under synthetic offline tests; it is not exposed live by this PR.

Across all isolates: one 15-second lease; 3 RPCs/UTC minute; 30/UTC day; 10-second minimum spacing; **31 lifetime RPCs including proof**; 30 admitted reads/minute globally, 6/client/minute. Thirty-second HMAC cache, at most eight 16 KiB entries; at most 128 HMAC-only client keys, 120-second logical retention. Expired cache/client rows are pruned on later approved admissions, not by a new background collector. After shutdown their physical footprint stays bounded until separately authorized cleanup. The small proof receipt remains in the policy row; no raw RPC body is retained there.

Each cache miss consumes one reservation before any Helius call, even if its acknowledgement is lost. A cache hit keeps original source clocks/hash. No refunds, retries or lease reclamation. Provider error, malformed/stale evidence, uncertain completion, clock regression or expired lease closes the new policy's circuit. Only supported negative account results complete normally without poisoning the service. App and SQL expiry both prevent new acquisition; expired completions cannot publish.

## Current release candidate — no execution authorized

[#159](https://github.com/fuzzysniper/scout-stonk-intel/pull/159) is expired/NO-GO; never reuse its clocks, SQL or approvals. Independent cleanup is #164; this proof candidate is based on its commit and retains main `01f4be846c6483860c0e2bd6404a877d6f276e05` collector history. After the owner merges cleanup, refresh/retest this proof candidate against actual main and review its proof-only diff before GO 1.

The [one-page Oct 23 owner procedure](usdc-proof-oct23-owner.md) is the current proposed schedule and approval sequence. Release GO deadline 15:15 UTC; verified deployment and separately approved SQL acknowledgement before 15:35 UTC; one POST 15:45–16:00 UTC, latest start before 15:59:30. Missing any gate means NO-GO, never an automatic extension. Installed lookup.sql is owner-confirmed; no migration or diagnostic SQL is authorized by preparation.

### DSN classification and binding

Founder reported `format_compatible_binding_unproven` from the separately authorized October 22 preflight. That is a categorical parser result, **not** an observation of Neon connectivity, TLS negotiation, restricted-role execution or Helius. No independent production check was performed by this cleanup. No repeat preflight is scheduled or authorized; uncertain prior usage must not be treated as zero.

| Category | Next action; no traffic authorized |
| --- | --- |
| `format_compatible_binding_unproven` | Prepare the separately gated proof. #139 is not required by this parser category. Actual native connectivity remains unproven. |
| `blocked_required_channel_binding` | STOP; separately review conditional draft #139 and its offline PLUS evidence. Never strip the requirement or weaken TLS. |
| `dsn_missing` / `dsn_invalid_or_unapproved` | STOP for separate owner-side review, without reading/exporting the URL or borrowing credentials. |
| `disabled` / `access_denied` / `preflight_unavailable`, redirect, timeout or uncertain response | STOP; no retry or assumption of nonexecution. |

The retained implementation returns only `{status: CATEGORY}`, with private/no-store headers and no logging, SQL, pg pool, admission, Helius or credential writer. Cleanup returns disabled before clock, hosting or DSN access. The code cannot be enabled by environment, request or query overrides. No preflight invocation command is active here.

Native verified TLS/SNI remains mandatory. `enableChannelBinding:true` prefers PLUS but does not prove or enforce negotiation; a URL requiring channel binding stays rejected by the current connector. Never remove `channel_binding=require`, disable certificate/hostname checks or claim hosted SCRAM-PLUS from synthetic tests. Conditional #139 remains draft, unchanged and outside this cleanup.

## Local validation

`npm ci`, `npm test` (with PostgreSQL 15+ binaries), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `bash scripts/archive-tool.sh check origin/main`. The tests use real disposable local PG, real certificate/hostname/SNI and SCRAM authentication, and a TLS-terminating proxy; all provider packets, credentials and hosting context are explicitly synthetic. No test establishes hosted Vercel → Neon or live Helius success. See the PR for exact totals and actual GitHub CI results.
