# #232 — native Helius facts producer, unselected / OFF

Status: code-only dependent on **#229 `6efb0eb66a79087b9c7a59b9a06ad584e9130ee9`**. No genuine provider observation was acquired. No account, plan, key, rights, auth issuer, hosted database or runtime configuration was inspected. Not an activation, deployment or executable live run card.

## What is implemented

A private producer uses the real #229 `OwnerBoundary.verify/inspect/reverify` and `GlobalLedgerPort` shape. The native transport is **reused unchanged** from `lib/onchain-mint/server/native-transport.ts`, not forked: native Node HTTPS avoids credential-bearing Next Fetch instrumentation; fixed `mainnet.helius-rpc.com`, TLS >=1.2, authorized certificate/SNI, port443, `agent:false`, exact POST `getAccountInfo` / `jsonParsed` / `finalized`. No URL supplied by HTTP callers, redirect, batch, retry, provider fallback or background work. Abort/deadline5s, headers16KiB, body64KiB, request256bytes. The existing strict decoder is reused unchanged for lexical integers, duplicate keys, precision, account owner/program/layout and extensions.

The existing V4 projection describes OFFLINE captures; it is deliberately **not relabeled as a genuine acquisition**. The new typed `NativeObservation` contains unchanged `MintFactsV1`, separately bound transport provenance and the ledger receipt identifiers. No change to any public/shared contract, route, UI, journal, SQL or production source factory.

`index.ts` is an unconditional OFF entrypoint with no options or dependencies. Even the directly imported `unselectedNativeBinding` rejects `disabled` before native I/O, and the candidate producer checks the same code constant before auth/key/ledger. No env/caller value enables it. A future source selection/code change must be separately reviewed and approved. Local test bindings are WeakMap capabilities, require NODE_ENV=test and **always** label responses `synthetic_fixture` / `local_fixture_only` / `offline_fixture`; a caller-supplied capture, hash or `production_rpc` string cannot promote one. They are not authentic Helius data.

## Admission / publication sequence

1. Exact same-origin deliberate POST read/STOP; bounded headers/body; reject prefetch, foreign host/Origin, unapproved exact mint or client credentials. Existing owner boundary enforces signed-cookie ownership (including host checks) and same-session revalidation.
2. One global durable `admit`, correlated and detached native ACK; charges authenticated read. Reverify original request/session. Read an explicitly injected server key only; no env or secret lookup/fallback.
3. One durable `reserve` ACK, checking policy/permit/mint, irrevocable attempt and conservative credit totals, strictly increasing lease ID and original expiry. No native call before this ACK; reverify session before wire. No second ledger or refund/reclaim/reset.
4. One fixed HTTPS request; immutable body/header/time snapshots, exact UTF-8 SHA256 and strict JSON/MintFactsV1 validation. Preserve finalized context slot, original start/receipt/evaluation UTC, HTTP Date or null; **slotTime remains null**. Finalized is the request commitment, context slot is not account last-change/block time, and TLS is not independent chain replay. getAccountInfo does not echo the requested mint: identity is bound to the server request, not an echoed account address.
5. Reverify same owner/session; durable exact `finish` ACK binds hash/slot/original receipt time. Reverify after I/O before returning immutable facts. No cached replay/new timestamp; every deliberate read requires a new lease in this minimal producer. Future cache may only reuse reviewed ledger semantics and original clocks, not extend source age.

At most one local read, no queue. Authenticated owner STOP can interrupt an in-flight read. Global STOP/publication linearizes in the existing PG function: a STOP before finish prevents publication; a later STOP cannot undo a previously committed observation or a request already sent. A failed/uncertain reserve/finish, timeout, malformed/untrusted/stale response or in-flight revocation withholds ALL observations, cancels the socket, permanently latches this producer and attempts existing durable STOP once. That STOP is best effort if storage is unreachable, never a false ACK claim; unresolved lease and #229 fence prevent restart takeover. No late response is published. Reservations remain spent. Restart/second replica is conservative STOP, not availability/failover.

429,401/403,5xx, malformed/unsafe numbers, duplicate JSON, unsupported/not-found account, bad TLS, oversized/compressed/stale data, missing key and unreviewed/suppressed Token-2022 extensions are **grey**, never evidence of safety. Unknown extensions discard the accepted observation with explicit `unreviewed_extensions`; reviewed base/metadata-pointer behavior still does not establish all controls, signer ownership, legitimacy, liquidity or profitability. No prices/rewards/ranks/score/trading inference.

## Offline verification / scope

Only disposable **loopback** native HTTPS and PostgreSQL/TLS/WAL fixtures; all successful data and identities explicitly synthetic. CI uses `tests/security114/local-only.mjs` egress denial. Covers reserve-before-wire, exact hashes/clocks/supply/authorities, HTTP/TLS/protocol bounds, Token-2022 grey, owner/nonowner/revocation, tamper/replay/STOP, lost ACK at admit/reserve/finish, actual PG crash/restart, ten-attempt exhaustion, clock regression, concurrent read/STOP, source OFF and immutable source-path manifests. No real provider query or production test.

Finite review: every byte/mode from exact #229 frozen, including runtime/auth/ledger/schema, all original A/B/C/J/P manifests, consumer/backend APIs, data/collectors and package lock. Only **two A-owned test reviewer files** delegate to a stronger exact whole-parent review; no broad path/env waiver or source manifest rebaseline. Entire original #229 suites and original parent/J/P/A/B/C suites also run unchanged in detached exact trees. New reviewer admits only finite complete hashes/patches and tests passing controls before rejecting source/data/dependency/manifest drift, extra files and symlinks. No Agent B/C work incorporated/edited. Current main was fetched at `5d9ce751c08089536ba9a21057219a60f053c8e1`; its newer collector commits were not copied/reverted into this explicitly dependent branch.

Commands (all offline; local PG binaries needed):

```
npm ci --ignore-scripts
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-helius-native/run.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/v4-helius-native/source-history.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm test
npx tsc --noEmit
npm run lint
bash scripts/archive-tool.sh check 6efb0eb66a79087b9c7a59b9a06ad584e9130ee9
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
```

Run root tests before build; restore only Next-generated `next-env.d.ts` afterward and rerun exact scope/built default-OFF probes. Do not run root/scope concurrently with Next generation.

## GO / HOLD and rollback

**GO:** review/offline local tests only. **HOLD:** all live/source/auth/storage/deploy/merge actions.

Remaining independent gates, none implied by green CI:

- Current Helius account/service/data contract approval (private/commercial/display/retention/derived hashes/deletion/subprocessor terms), exact paid plan/key permissions, actual getAccountInfo debit/remaining included allowance/reset and autoscaling hard-stop confidence. Prior #220 rights evidence is context, not a new account/usage approval. No assumed credits/request or synthetic billing measurement here; `creditsPerAttempt` must conservatively bound an independently confirmed debit, and maxCredits may never exceed the approved actual allowance. Unknown meter/debit = HOLD.
- Owner's separate explicit GO listing immutable SHA, one owner, exactly3 mints, <=15min, <=10 attempts, <=30 authenticated uses, integer per-attempt/total credit ceilings, stop owner and rights/retention approval. No live invocation is provided.
- Compatible real identity issuing flow, revocation/logout/CSRF and secure server-only key delivery, B/C isolated schema/principal composition reviewed independently. No real key/session/DSN consulted here.
- Brand-new isolated database with #229 SQL fingerprint, least privileges, genuine TLS/WAL, monotone budget/STOP/PITR restore anchor and physical retention/backups approved. No hosted migration executed. Process-memory body lifetimes/TTL are not verified physical erasure.
- Approved single-worker lifetime; reuse one existing durable ledger adapter, not a new adapter per request. Replica/restart STOP requires a new separately authorized operating plan, not reusing/refilling old budget. No Vercel multi-replica continuity claimed.
- Separately reviewed immutable native selection/route wiring, host instrumentation redaction, protected preview/release interlocks and final owner approval. `sourceGo:false` remains accurate: native readiness is not deployed acquisition permission.

Rollback now: close this draft. If later adopted under separate authorization, revert only the finite code commits/disable source selection; **never** reset/delete budget/history/STOP or auth revocations, replay a lease, overwrite collector data, or rearm an old source budget.
