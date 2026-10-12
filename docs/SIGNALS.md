# SCOUT Signal Lab V1

Issue: [#8](https://github.com/fuzzysniper/scout-stonk-intel/issues/8). Signal Lab is an on-demand research view within `/radar`, using the seven verified reward tokens and the existing GitHub history source. It describes recorded quote distributions and their changes, not an automated trading signal, predicted payout, individual holder return or investment ranking. No notifications, subscription features, payment flows or rapid buy/sell alerts are added.

## Reproducible calculation

`lib/signals.ts` is pure: store, mint, verified quote identity, source status and reference time are explicit inputs. It never fetches, writes records or changes source data. `lib/history.ts` now exports its shared observation normalizer, actual-boundary selector, timestamp parser and counter-comparison helper. Historical/Radar safeguards continue using those same implementations; there is no second parser or reset/clamp implementation.

Let C be the latest calendar-valid, nonfuture actual observation. The current target starts at C − 24h. B is the nearest actual recorded observation at or before that target. Current distribution is counter(C) − counter(B), **over the actual B → C span**.

The previous target ends at actual B, not an independently chosen approximate boundary. Its target starts at B − 24h; A is the nearest actual observation at or before that boundary. Previous distribution is counter(B) − counter(A), over A → B. The actual periods are adjacent and share B, with no overlap, uncovered gap or double-counted distribution. A shared observation appears in both coverage counts, but its counter is subtracted once in each period, not counted as a payout.

Each period returns requested and actual UTC start/end, signed start/end boundary offsets (actual minus requested, in seconds), actual observed seconds, unique observation count, largest gap, exact/nearest timing, distribution, observed quote units/hour and payout-counter change. These are **24h targets**, not invented exact-day interpolations when boundaries are approximate.

### Coverage and matching rules

Both periods must pass together before any Signal Lab distribution, velocity, acceleration or payout delta is published:

- A valid baseline at/before each target, with at least two recorded points per period. The shared history selection retains the existing two-hour baseline bound, and Signal Lab adds the tighter exposure rule below.
- Every interior gap is **strictly less than two hours**. Exactly two hours fails, as issue #8 requires; the older archive endpoint still permits its documented at-most-two-hour rule.
- Each actual span must be at least 24h and at most **24h + 60 seconds**. This narrowly allows second-level collection-time jitter, with all offsets disclosed, while rejecting materially unequal/extended periods. Since both spans are in this range, their duration difference is at most one minute. This matching tolerance is a reviewable V1 policy, not an estimate of missing data. It may withhold comparisons when real collection drift is larger; do not loosen it silently.
- Every compared point must have the same explicit quote **mint** and symbol as the verified allowlist. A matching symbol alone, missing mint identity or a quote transition fails; no legacy identity is retrofilled.
- Expected StonkFun provenance, finite nonnegative distribution counters, calendar-valid timestamps, no conflicting duplicates, and no distribution/payout counter decrease anywhere across the two periods. No interpolation, searching for a favorable older period, sum across resets or clamping to zero.
- Latest observation age is at most three hours and source status is available/cached. Source degradation or unavailability withholds all metrics even if retained observations look recent. Successful GitHub retrieval time never makes old observations fresh.
- Optional provider generation metadata, when present, must parse correctly, be no more than one minute after its own observation time (matching collector tolerance), and no more than three hours behind it. The latest provider generation must also be at most three hours old at calculation time. A present non-reward mode fails metadata validation. Optional absent provider fields do not establish an independently fresh upstream response; confidence concerns recorded coverage only.

Identical relevant duplicate records collapse to one timestamp and produce a warning; conflicts are barriers. Malformed/future observation timestamps cause the existing global ordering barrier because their sequence position is uncertain, even if other points look sufficient. Missing/invalid stores and no-history cases remain distinct. Reference-time or verified-quote metadata errors produce null metrics with explicit reasons. All failure reasons and observed partial coverage remain in the JSON and UI; missing observations are not represented as zero distribution.

### Velocity and acceleration

For each passing actual period:

`observed velocity = observed quote distribution / (actual observed seconds / 3600)`

This is a retrospective quote-unit distribution rate measured over those observations, not a future payout rate or yield on invested capital. It has no dollar conversion or cross-quote denominator. The previous period uses its own actual hours. The one-minute duration tolerance makes the nominal 24h targets comparable; using actual hours avoids silently treating small exposure differences as acceleration.

When previous velocity is positive:

`accelerationPercent = (current observed velocity / previous observed velocity − 1) × 100`

“Acceleration” in V1 is this period-over-period relative change of observed velocity, not a derivative per second, profitability estimate, alert or forecast. Categories are increased/decreased/unchanged observed velocity. The UI calls it **velocity change** and discloses the actual periods. Both distribution totals and their actual rates are available in JSON.

Zero prior distribution/velocity is never used as a percentage denominator:

| Covered previous / current distribution | Descriptive category | Acceleration |
| --- | --- | --- |
| 0 / positive | `new_activity` — newly observed distribution relative to this covered prior period | null |
| 0 / 0 | `no_activity` — neither covered period reports distribution | null |
| positive / 0 | decreased velocity | −100% |
| Missing, invalid or uncovered prior period | unavailable, never “new activity” | null |

JavaScript precision applies; finite/underflow checks prevent infinite percentages or a positive distribution turning into a fake zero velocity. If arithmetic cannot be represented safely, all Signal Lab metrics are withheld with `non_finite_calculation`. UI rounds to six decimals, which can hide very small changes; the raw JSON remains the evidence. No cross-token quote totals are added or ranked.

### Payout counts and holder semantics

The official reward ledger exposes a cumulative API-reported `payoutCount`, so the matched endpoint counter changes are included **only** when every point across both periods has a nonnegative safe-integer payout count and no decrease. Distribution comparisons can pass while optional payout count coverage is incomplete; in that case payout deltas stay null with `missing_or_invalid_payout_count`. A payout reset/decrease detectable between valid adjacent counts invalidates the full comparison, following the shared history rule.

These are reported payout-counter changes, not unique paid wallets or independently reconciled transfers. Bankroll’s separate base-asset ledger is not combined with its quote rewards. The API's `holderCount` is not established as a stable cohort of unique paid holders; inventory can change and it is not profit. **Holder-count change is omitted entirely** rather than inventing a meaningful growth measure.

## API, interface and confidence

`GET /api/radar` adds a `signals` object per row. Existing last-point changes and archive coverage remain available. Default `sort=coverage` orders passing matched comparisons first, then bounded observed point coverage of the two periods, then latest actual observation time, name and mint. This is an evidence-readiness order, never an investment score or reward-amount ranking. Explicit name/freshness sorts remain supported.

`quoteMint=...` filters to an allowlisted quote mint, not just its symbol. The response includes the complete set of distinct quote choices, even when filtered. Unknown/repeated filters and unsupported/repeated sorts return sanitized 400 before source access. Filtering does not create an arbitrary upstream fetch. The six distinct quote identities are kept separate; no aggregate dollar amount is shown. Default filtering is all assets, with per-row units always stated.

Confidence states are **coverage passed** or **withheld**, not probabilistic certainty or onchain verification. `reasons` explain withheld data; identical duplicates are separately listed in `warnings`. A confidence badge cannot establish complete transaction coverage, ongoing payouts or investment merit. Counts of available comparisons are evidence counts, not reward totals.

The compact mobile cards prioritize current/previous distribution targets, actual-hour velocity, velocity change and coverage reasons. Matched-period details disclose times, offsets, duration, gaps and payout deltas. Last-point/archive details and identity evidence remain keyboard-operated disclosures. Quote filtering, sorting and manual refresh are accessible; quote choices persist while refresh loads. Evidence links point to raw history/Radar JSON, original GitHub snapshots, official sources and token dossiers. No unattended polling or notifications are added. Client failures have a retry state with no fabricated rows or amounts.

## Sources, performance and limitations

Sources and synchronization are unchanged from [HISTORY.md](HISTORY.md) and [RADAR.md](RADAR.md): reviewed seven-token allowlist, real hourly observations, one fixed GitHub main dataset per five-minute warm-instance cache, one-minute failure backoff, bounded degraded retention and a 2 MiB limit. Signal Lab performs pure bounded calculations over those records; it adds no provider requests, collector/data changes, new dependencies, infrastructure, credentials or paid service.

Current real history is only a few hours old, so matched 48h comparisons remain unavailable. Screenshots use actual live GitHub data, not artificial positive signal examples. Synthetic complete histories exist only in explicitly labeled regression tests. The strict one-minute matching policy can withhold otherwise useful archive totals and should be assessed with real cadence after a reviewed release. Collector gaps, quote changes, prior skipped resets, JavaScript precision and upstream cache/provider outages remain limitations. A “coverage passed” result still describes API reports, not independently verified transfers.

No production rollout is performed by this task. After approved merge/deployment, verify seven rows, default coverage order, all six quote filters, timestamps/revision, mobile disclosures and dossier/source links on the deployed host. After at least roughly 48h of **real** collection, save actual A/B/C observations, every intervening gap and quote identity, independently subtract counters and divide by actual durations, then compare the API result. Confirm shared B, no overlap, exact matching policy, zero-baseline handling and no inferred holder metric. Do not seed or synthesize production history to make comparisons appear. Exercise outages only locally or in an approved isolated environment, without changing production DNS, credentials or assets.

## Tests and verification

Deterministic tests cover exact and nearest boundaries, consecutive shared endpoints, full/partial/no-history periods, strict gap/matching boundaries, source/observation/provider staleness, missing/negative/nonfinite counters, distribution and payout resets, quote mint/legacy identity mismatch, duplicates/conflicts, malformed metadata, zero baselines, safe payout omission, arithmetic overflow/underflow and immutability. Existing historical calculation/API, source and collector tests remain in the suite. API tests also cover quote filtering and safe parameter rejection; ordering tests prove evidence is promoted instead of amount.

Final results on Node 20.20.2/npm 11.9.0: `npm ci` exit 0 (310 packages); `npm test` exit 0 (57 JavaScript + 7 Python tests passed, none failed/skipped); `npx tsc --noEmit`, `npm run lint`, and `npm run build` exit 0. Node was selected through PATH and npm cache through `NPM_CONFIG_CACHE=/workspace/.npm`. Existing ESLint deprecation and edge-runtime build warnings remain.

Local production smoke used Node 24.19.0 `--use-env-proxy` for this managed environment only, with no added application proxy dependency. Live dataset revision `sha256:ca6cec900d453852f709532ee707df1570afdaefe505b48282090ad4739b9b22` matched an independent GitHub download. Seven rows and six quote choices were served; KNOTS had three points and the other tokens one each. All matched metrics were correctly null with explicit coverage reasons. Valid page/sort/filter HTTP 200, invalid/repeated filters and unsupported sorts 400, POST 405, API no-store. Chromium at 1280px/390px verified coverage default, quote filtering, persistent filters on refresh, keyboard period evidence, visible actual observation times/quote units, and no overflow or uncaught page errors. A browser request abort verified retry without fabricated rows. No positive production signal is claimed; complete-history calculations are verified with labeled synthetic unit tests.

- [Desktop Signal Lab](screenshots/signals-desktop.png)
- [Mobile Signal Lab](screenshots/signals-mobile.png)
- [Mobile quote filter](screenshots/signals-mobile-quote-filter.png)
- [Mobile client network failure](screenshots/signals-mobile-unavailable.png)

Command results and screenshots are also attached to the PR. Run `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` for verification. Snapshot files, allowlist and collector are unchanged by this feature.

## Rollback and approval

Revert the Signal Lab feature commit through a reviewed PR, then perform a human-approved deployment of the reverted app. This restores the previous Radar cards, default name sorting and filter-free API while preserving genuine history and existing GitHub synchronization. No data deletion, collector rollback, schema migration, DNS change, paid-service teardown or secret revocation is needed. Shared-helper refactoring is reverted with the same commit. Merge, deployment and any future financial interpretation changes require human review. No wallet access, payment, trade, token launch, gating or treasury operation occurs in this task.

## Data Health operational monitoring

[Data Health V1](DATA_HEALTH.md) documents per-token freshness/coverage, dated scheduler evidence, bounded collection summaries, optional daily operational alerts and human-approved verification. This operational view does not change the historical or Signal Lab calculations.
