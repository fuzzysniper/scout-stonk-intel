# Recorded reward history

Issue: [#2](https://github.com/fuzzysniper/scout-stonk-intel/issues/2).

`GET /api/history?mint=...` reads `data/reward-snapshots.json` on the server. It makes no upstream request, writes no observations, and requires no credentials. The same strict base58/32-byte mint validation used by the dossier applies; missing, invalid, and repeated mint parameters return HTTP 400. A missing or unparsable store returns a generic HTTP 503 without file paths or exception details. An unrecorded valid mint returns HTTP 200 with `no_history`, null totals, and insufficient windows. Responses are uncached so `fetchedAt` describes this read, not a cached fetch.

## Observation handling

- UTC ISO timestamps (`Z` or the collector's `+00:00`) are calendar-validated, normalized, and sorted. Future or malformed timestamps are excluded and prevent comparisons because their place in the sequence is uncertain.
- `recordedCount` counts stored entries; `observationCount` counts unique, parseable, nonfuture timestamps, including entries with invalid counter fields. Missing counter/quote/source values are flagged, not converted to zero. `startAt`/`endAt` are timestamp coverage, not a guarantee that every observation is usable.
- Only finite, nonnegative numeric cumulative totals, valid quote metadata, and the expected StonkFun source URL are usable. Quote symbols are case-sensitive. Optional quote mint identity must agree if present at either endpoint. The current collector records only the symbol; a matching symbol alone does not independently verify asset identity.
- Duplicate timestamps with identical relevant counters, quote metadata, and source count once. Conflicting duplicates become barriers: no comparison uses or bridges that timestamp.
- `changes` subtract adjacent comparable recorded counters. A decrease in distributed tokens or in available payout counts is a reset/decrease, with a null delta. No negative delta is clamped to zero. Missing fields, quote changes, unverified sources, and conflicting duplicates also produce null deltas. A valid unchanged counter produces a genuine zero delta.
- A comparison after a reset can still be valid within the new segment. Windows never sum positive intervals across a reset. The latest valid lifetime counter is reported as recorded, not interpreted as profit.

## 24-hour and 7-day coverage

Windows end at the latest recorded observation (`endAt`), **not** the current fetch time. Each reports the requested start, actual start/end, actual duration, boundary offset, count, maximum observed gap, and timing mode.

The baseline is the nearest recorded point at or before the requested boundary. For the hourly collector, the baseline can be at most 2 hours earlier and all gaps inside the interval must be at most 2 hours. A shorter interval, missing baseline, larger gap, or fewer than two points yields `insufficient_history` and a null total. These conservative limits allow one missed hourly collection without pretending that arbitrarily sparse endpoints cover a period.

An exact baseline is labeled `exact`; an earlier baseline is `nearest_snapshot`, with its actual longer interval and offset disclosed. The result is the counter change over those **actual observations**, never an interpolated exact-period total. Every intervening observation must remain comparable; otherwise the window is `invalid_data` with a null total.

Observations older than 3 hours are explicitly stale. Even when historical coverage is otherwise adequate, stale windows return `stale_data` with null totals; recorded lifetime totals and historical point comparisons remain labeled with their observation times. Window completeness does not establish exhaustive transaction-level coverage.

## Limitations

The checked-in KNOTS history currently contains one observation, so neither a 24-hour nor 7-day comparison is available. Unrecorded mints show no history. No recorded data was added or changed for this feature.

These are StonkFun API-reported token totals, not independently reconciled transfers, APY, holder profit, or recommendations. JavaScript numbers preserve the input representation but do not provide arbitrary precision; UI numbers are rounded to six decimals. The existing collector skips decreasing counters, so resets absent from the recorded file cannot be reconstructed. Missing collection runs and delayed snapshots can limit coverage. GitHub collection updates need to reach the running deployment's local store; this endpoint does not fetch GitHub automatically.

## Verification

Use Node 20 (matching CI):

```sh
npm install --package-lock=false --no-audit --no-fund
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run start -- --hostname 127.0.0.1 --port 3108
```

The existing lockfile pins `eslint-config-next` 15.5.3 while the manifest requests 15.5.9. `npm ci` fails on this pre-existing mismatch. Installation above respects the manifest without rewriting the lockfile; no dependencies were added. Repairing the existing lockfile is a separate review item.

`npm test` compiles the actual history calculator and route into a temporary directory and uses Node's built-in test runner. Twenty tests cover all issue-required cases plus strict validation, source/quote consistency, stale/future timestamps, zero/missing values, malformed storage, and sanitized responses. Artificial counters exist only in explicitly labeled unit tests; API checks and UI screenshots use the actual checked-in store. CI runs the new tests and lint before type checking/build.

The history panel announces loading/error/no-history states, uses labeled sections and semantic definitions, displays UTC timestamps, and aborts obsolete requests when the selected mint changes. Window cards stack on mobile. JSON, snapshot, and StonkFun links provide evidence. Production smoke checks returned HTTP 200 for the homepage, mint-specific metadata, recorded history, and unrecorded history; invalid/repeated mint parameters returned 400 and POST returned 405. Chromium checks at 1280px and 390px found no horizontal overflow or uncaught browser errors; the recorded-change disclosure was operated with the keyboard. All 20 tests passed (none skipped), and TypeScript, lint, and the production build exited 0. The build retains the existing nonblocking edge-runtime/static-generation warning.

### Screenshots

Captured from the local production build without fabricated API/history responses:

- [Desktop: recorded KNOTS history](screenshots/history-desktop.png)
- [Mobile: recorded KNOTS history](screenshots/history-mobile.png)
- [Mobile: unrecorded mint](screenshots/history-no-history.png)

## Rollback

Revert the feature commit through a reviewed PR. This removes the history endpoint/panel, calculator, tests, and CI additions. The collector and recorded JSON are unchanged; no data migration or deletion is needed. No production deployment is performed by this task. Human approval is required before merge or production rollout.
