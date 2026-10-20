# SCOUT Pulse V1 — isolated exact-mint engine (Issue #127)

Review-only from main `8df27bda59d29901d8996920fbe5f0cd6892ad3d`. This is executable code, not a signal catalog. **No live market request was made.** Every committed market number/clock in tests is explicitly SYNTHETIC OFFLINE. No UI, existing `/api/token`, Helius/USDC canary, Neon, secrets, collector, archive, scheduler, workflow or deployment changes.

## What works

`lib/trader-pulse/decoder.ts` validates original bounded UTF-8 bytes, binds their SHA-256 and exact request target, and produces a deeply frozen `ValidatedSnapshot`. `engine.ts` evaluates that snapshot at an explicit clock without I/O, randomness or an implicit current date. The runtime brand rejects fabricated/cast/round-tripped objects; revalidate original bytes instead. A valid 32-byte address encoding is **not verification that an account is a mint or an issuer is genuine**.

Identity requires `chainId=solana`, exact case-sensitive base/quote/pool keys, distinct token sides and the requested mint on one side. No trim, ticker resolution, symbol trust, unrelated pool skipping or duplicate pool acceptance. Names/symbols are untrusted display metadata, never identity. Invalid types, ambiguous integer lexemes, duplicates (including escaped JSON keys), invalid UTF-8, conflicting source URL and oversized packets fail the entire observation. Missing/null quantities stay unknown; a reported zero remains zero. Unknown optional metadata is discarded, never interpreted as a clock or authority.

The selected pool is the highest **reported** liquidity in the returned eligible **base-mint** sample, then ascending ASCII pool address. Known zero precedes unknown. An optional exact quote-mint pin narrows that sample. Quote-only results never inherit the other side's price, liquidity, buy/sell direction or identity. Returned sample counts and `complete=false` accompany the selected exact base/quote/dex/pool. Selection does not establish an official launch pool, a global best market or all-market coverage.

## Typed contract and rules

`contract.ts` exports `Snapshot`, `SourceClock`, `Signal<T>`, `PulseReport` and the neutral public policy. `decoder.ts` exports `decodeObservation`, `ValidatedSnapshot`, `endpointFor`; `engine.ts` exports `evaluatePulse`. See [rule proofs](RULES.md) and [source/rights decisions](SOURCES.md).

```ts
// PRIVATE integration example; bytes/clocks must come from the actual approved adapter.
const snapshot = decodeObservation({ mint, bytes, requestStartedMs, retrievedMs });
const report = evaluatePulse(snapshot, evaluatedMs);
// report.publication is ALWAYS withheld_pending_source_rights_and_clock_review.
```

Each signal returns `observed | uncertain | unavailable`, value/null, rule id, provider fields, original clock semantics, reasons and interpretation. Calculations from unclocked DexScreener market reports are **uncertain**, even if retrieved moments ago. `observed` applies only to directly detected packet-quality findings. Price impulse remains unavailable. No score, alpha, forecast, price target, rewards, holder count, ROI, ownership/backing or trade execution is inferred.

## Bounded private source adapter

`adapter.ts` is server-only and uses native runtime fetch against ONE fixed HTTPS endpoint, with no source/provider switch. Construction sends nothing. `observe(mint, 'explicit_user_action')` requires trusted owner-approved private source-use review, a nonsecret review reference, up to three exact mints, an expiry within 24 hours and at most three total requests per adapter. Default approval is null. The approval object is a caller assertion recording an owner decision, **not proof of a license or authentication**; never accept it from an HTTP request. There is no production enable env variable and no wired public adapter path.

The source budget is serial, at least 2 seconds apart, max three lifetime attempts including failures. No batch, retries, background refresh, writes, persistent cache or new paid service. Timeouts, 503/non-200, invalid source/schema/clock stop the adapter; 429 consumes an attempt and requires a later deliberate manual action after at least 60 seconds and any longer qualified Retry-After. Unbounded/invalid Retry-After stops it. An abort/Promise.race bounds headers/body acquisition to 4 seconds total, even with an uncooperative transport. Limits: 256 KiB body, 16 KiB projected headers, 1,024 chunks, 64 returned pools, 12 JSON nesting levels, 12,000 JSON value nodes. No partial truncation. Compression is refused. Standard platform HTTPS/CA validation is relied on; this is not a separate native TLS attestation. A trusted test transport can be injected; it is not a public request option.

**These counters/cooldowns are per adapter instance, not distributed provider quotas.** Restarting/recreating one is not an authorized budget reset. Public launch requires separately reviewed shared admission and source terms; this PR must not be described as production-global rate limiting. No timers run between observations; the only timer is the bounded in-flight deadline.

## Public route: no live source acquisition or financial output

`GET /api/trader-pulse?mint=<exact mint>` returns `source_review_required`, exact-input-format finding, an explicitly unverified external research link, null clocks, `financial=null`, `signals=null`, and both public policy bits false. No adapter/engine/env import, upstream request, market match assertion or credential read. Bad queries return 400; writes return 405. No query/header can grant source rights or turn this into an RPC/market proxy. Responses use private/no-store and no CORS. The external link identifies the entered address for provider research; it is not a verified pool link.

The existing consumer/UI/API integrations are deliberately unchanged. Callers should not replace `/api/token` or connect this route to autocomplete. A future integration needs explicit source-rights and clock review, including the [launch checklist](SOURCES.md#owner-decisions-required-before-any-launch).

## Reproduce and rollback

```sh
npm ci
bash tests/trader-pulse/run.sh
npm test
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import="$PWD/tests/security114/local-only.mjs" npm run build
node tests/trader-pulse/http-smoke.mjs
bash scripts/archive-tool.sh check origin/main
```

The new `tests/trader-pulse/engine_test.py` package hooks the existing unittest discovery, so **npm test and unchanged GitHub CI execute the Node signal/transport suite**. It compiles into a temporary directory, emits actual Node counts and fails on nonzero exit. No global runner/package/workflow edits. Full regression tests require local PostgreSQL 15+ per the existing harness; they never use hosted Neon. [Verified results](VALIDATION.md) distinguish offline execution from live evidence.

Rollback is a reviewed revert/removal of this isolated API/library/test/docs tree through normal GitHub review. There is no persisted state, migration, deployment/provisioning action, timer or credential to undo. No alias operation, canary invocation or admission-state reset is involved.
