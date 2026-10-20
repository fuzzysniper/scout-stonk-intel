# Offline inspection and comparison policy

`app/consumer/cards/pipeline.ts` has no network or persistence calls. `scripts/cards-research-report.sh <absolute-local-input.json>` compiles it into an auto-cleaned temporary directory, reads one bounded regular UTF-8 file, and prints the **safe metadata projection**. Invalid input gets fixed redacted stderr/exit 1, not a source dump. It never searches for captures, reads credentials, schedules a job, fetches a URL, writes a dataset or calls RPC. Scoped executable fixtures are in `tests/consumer-cards/pipeline-fixtures.mjs`; they are synthetic, not captured observations. The CLI is not included in the consumer bundle.

## Typed capture and identities

See exported `PipelineInput`, `Capture`, `Subject`, `Normalized` and `SeriesFinding` in the consumer research modules.

* Input version `cards-research-input/1`: context `public_source_inspection` or `synthetic_offline_rehearsal`; UTC `asOf`, `startAt`, `endAt` (exactly 24h); independently captured registry; 1–4 distinct token/pool subjects; at most 128 captures and 12 MiB aggregate encoded bodies.
* Capture version `cards-capture/1`: evidence class, exact fixed source URL, requested/received clocks, HTTP status, Age, SHA-256 of original bytes and canonical base64 body. At most 1 MiB/body; 12-second capture duration; future skew <=1s; valid microsecond UTC calendars; Age 0–300 required; provider response generation no more than 3h old. These are transport checks, **not market freshness**. Source bytes are checked before parsing. Hashes alone do not authenticate arbitrary operator input.
* Genuine inspection accepts only fixed HTTPS `www.stonkfun.xyz` registry and exact single-token paths, without credentials, query or fragment; exact CARDS registry name/mint/decimals/program; exact token/pool/quote/network. Ticker-only or reversed identity is rejected. Registry and snapshot source classes cannot mix with synthetic. Unsupported sources remain unqualified.
* Strict JSON parser preserves original numeric lexemes, rejects duplicate/prototype keys, malformed UTF-8/surrogates, >32-depth, >4,000-element arrays, >50,000 nodes and >100-character numbers. Decimal exponent expansion is bounded; nonnegative snapshot amounts allow <=30 integer and <=60 fractional digits, without rounding. Zero differs from missing. Values outside bounds withhold rather than truncate. A future price adapter has a stricter <=18-fractional-digit policy.
* The actual official adapter returns `untimed_usd_snapshot`, never `actual_market_observation`. Added undocumented `observedAt`/`priceQuote` fields do not promote it. USD price is not CARDS quote price, generated time is not market time, cap supply basis is unknown and trailing volume is not participant count. Liquidity/volume are snapshot context, not covered flows.
* CLI serialization explicitly allowlists identities, clocks, hashes, counts and reasons. All financial metrics stay null, ranking rows empty, permission unverified. Extra properties/claimed approvals cannot release data. Genuine [inspection output](actual-inspection.json) records one successful normalization and the exact missing-data result without retaining raw financial bodies.

## Pure mathematics — `cards-observed-24h-v2`

Only typed offline series can rehearse this layer today. No qualified genuine source adapter currently supplies it. Browser UI never imports fixtures, this pipeline, Node crypto or financial calculation outputs.

| Requirement / metric | Definition |
| --- | --- |
| Identity / sample | Distinct exact base mints and pools, pinned exact CARDS quote; 2–50 candidates for comparison; every candidate must qualify, no silent deletion of failed tokens. Selected partial sample, never ecosystem leadership. |
| Period / coverage | Exactly 24h, **25 actual hourly points** at common boundaries including start/mid/end, strictly increasing, no duplicates/fill/interpolation. <=1,000 records checked before cadence rejection; >90m gaps rejected. A dense burst around a spike cannot increase persistence. End <=90m old at evaluation; no future end. All candidates share the period/cadence. |
| Provenance | Each point requires actual-observation kind, consistent credential-free HTTPS source within its series and SHA-256 revision shape. Pure functions do not authenticate the provider or certify source clock semantics. A reviewed adapter/rights approval is still required. |
| Decimal arithmetic | Positive quote prices <=30 integer /18 fractional digits, scaled BigInt, never float price ratios. Display percentages truncated toward zero to six decimal places. Exact cross-products order appreciation and determine true ties; equal rounded display strings need not share rank. Numeric liquidity/volume inputs represent caller precision; normalized fixture context retains exact decimal strings. |
| Appreciation | `100 × (end − start) / start`, in CARDS per token. Observed price change, not realized holder/trading return (execution, fees, taxes, transfers, cashflows unknown). |
| Sampled peak | Maximum sampled price and its actual sample time inside this window only. Earliest tie retained. Not all-time high, candle high or proof of unobserved extrema. |
| Maximum drawdown | Most negative `100 × (later price − earlier running peak) / earlier running peak` in chronological order. Separate ending drawdown = `(end − window sampled peak) / peak ×100`. Nonpositive convention; not a full intrahour risk statistic. |
| Momentum context | Every point has nonnegative finite canonical USD liquidity >=10,000 and trailing 24h volume >=1,000. Exact decimal gates (<=18 fractional digits); unknown/overprecision fails conservatively. Volume is overlapping context, not additive hourly flow or distinct traders. Missing context withholds momentum, not necessarily internal price arithmetic. |
| Market cap / activity | No cap comparisons without separately qualified aligned price/supply definition (circulating vs FDV) and rights. No unique-holder/trader inference from reported volume, no reconstructed payouts or ROI. |

### Retrospective momentum rules

Exact half-window ratios, not rounded displayed percentages, determine thresholds. All require the coverage/context above. Rules are descriptive, unvalidated policy choices, **not predictions, trading signals or investment opportunities**.

1. Weakening first: first-half gain >=10% and second-half loss <=−10% or ending drawdown <=−20%.
2. Sustained expansion: each half >=10%; >=80% of equally spaced recorded prices at or above start.
3. Early emerging: first half within [−3%,+3%], second half >=10%, ending drawdown >=−5%.
4. Consolidation: first half >=10%, second half within [−3%,+3%], ending drawdown >=−20%.
5. No clear pattern: context/price coverage passes but no rule matches.
6. Insufficient evidence: invalid identity/time/price/source/coverage or unavailable context.

All calculation results carry `publication: withheld_pending_rights_review`. Synthetic rehearsal produces internally testable numbers, but the public report explicitly says synthetic, returns null metrics and zero qualified **public** price points. A real qualifying adapter and separate rights decision cannot be supplied through a query, input property or environment flag.

## Future adapters

An authorized tick-price provider must document actual quote denomination, pool continuity, actual timestamp meaning, cache lag, completeness, numeric fidelity and retention/publication terms. A completed OHLC bar is a different observation type: its close/end time is not necessarily the last trade's actual timestamp, its high is not a sampled tick peak, and empty/no-trade bars may be filled. Qualify interval boundaries, quote conversion, volume aggregation and no-fill behavior and add an explicit bar contract/tests in a separate PR; do not silently put candle closes into this point policy. USD prices need aligned actual CARDS/USD observations before any quote conversion, with propagated precision/coverage; no conversion is implemented.
