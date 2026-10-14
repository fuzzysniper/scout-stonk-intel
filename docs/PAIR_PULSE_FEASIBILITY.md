# Pair Pulse V0 — feasibility, offline gates and proposed contract (#51)

## Decision

SCOUT cannot currently establish which NVDAX/GLDX project is economically “strengthening,” or publish defensible relative alpha. The available evidence supports bounded identity discovery and dated provider-reported market snapshots. Its recorded reward counters are too sparse and insufficiently synchronized for the new cross-token comparison gate. Distributions are aggregate token-level counter readings, not individual investment returns or independently reconciled payouts.

This PR adds only `lib/pair-pulse*.ts`, offline tests, two small registrations in the existing test runner, this report and its genuine backend research evidence. It adds no endpoint, UI import, provider call, persistence, collection behavior, workflow, Cloudflare/GitHub App change or activation. Agent B owns #50's compact results/snapshot sorting. Coordination: [#51 comment](https://github.com/fuzzysniper/scout-stonk-intel/issues/51#issuecomment-6179298797), [#50 comment](https://github.com/fuzzysniper/scout-stonk-intel/issues/50#issuecomment-6179299055). Snapshot sorting within a fetched sample is independent of this future two-project research contract; it must not become a Pulse/return ranking.

## Evidence inspected

Base main: `5203321f3e27f59cf144cc8cf134ba668261bf04`, including merged #49/#47. Canonical types and implementations: `lib/pairs-contract.ts`, `lib/pairs.ts`, `lib/pairs-source.ts`, `lib/history.ts`, `lib/history-source.ts`, `lib/signals.ts`, `lib/radar.ts`; unchanged GET routes `/api/pairs`, `/api/pair-quotes`, `/api/radar`, `/api/history`. Methodology references: [recorded history](HISTORY.md), [Signal Lab](SIGNALS.md), [pair identities](PAIR_INTELLIGENCE.md), [bounded discovery](PAIR_DISCOVERY_COVERAGE.md), [quote registry](PAIR_QUOTE_REGISTRY.md). No source/API schema is extended.

Stored `data/reward-snapshots.json`:36,385 bytes, SHA-256 `61bddcd2beb82d126b7aac9ef5497142db434433492e63afc7e987f2b8cbc214`. Latest dataset commit: [`d77ba9299cd8b03701b01b4dff19877ff18e0d88`](https://github.com/fuzzysniper/scout-stonk-intel/commit/d77ba9299cd8b03701b01b4dff19877ff18e0d88), committed2026-10-14T19:28:07Z. There are72 recorded points for seven allowlisted tokens across six exact quote mints. Seventy points include explicit quote mint, mode and provider-generation metadata; KNOTS' two earliest symbol-only observations remain unverified and are never retrofitted. This is an audit of preserved bytes, not an invented historical series.

| Allowlist label | Exact quote group | Points | Span (hours) | Largest gap (seconds) | Last interval (seconds) |
| --- | --- | --- | --- | --- | --- |
| ALLINU | DKNG | 10 | 46.777222 | 29728 | 15230 |
| ZCAT | ZEC | 10 | 46.777222 | 29727 | 15230 |
| BANKROLL | USDC | 10 | 46.776944 | 29727 | 15230 |
| KNOTS | STONK | 12 | 51.740000 | 29727 | 15230 |
| NEARKAT | NEAR | 10 | 46.777222 | 29727 | 15230 |
| MASK | ZEC | 10 | 46.776944 | 29728 | 15230 |
| SI | NVDAX | 10 | 46.776944 | 29727 | 15230 |

Labels are allowlist labels, not a join key or assertion that current provider names are unchanged. Only full token/quote/pool identities can join evidence. NVDAX mint `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` has one recorded token; STONK `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx` has one. GLDX `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` and SPCXX `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` have no recorded allowlisted history. Those are quote-token identities, not underlying equity/metal ownership. Identical ticker text cannot substitute another mint.

The only two-token recorded group is ZEC `A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS`: ZCAT `HcRLc9VDgjLeK154xDawfb1dmVJ98DoSqcwTHGqiDeJR` and MASK `HuAXPyDWDaMYFKuwQHpqL1oPnj93zdzWmtvFGzCeCUa7`. Latest observations are2026-10-14T19:28:05Z and19:28:06Z; provider generations are19:27:52.774Z and19:27:48.689Z respectively. Their only shared recorded timestamps are2026-10-13T03:35:50Z and2026-10-14T04:58:26Z, which do not establish three boundaries24h apart. Both series span less than48h, have >8h gaps, and their most recent counter delta spans4h13m50s. Neither current freshness nor a successful new fetch repairs those missing periods.

### Existing API semantics and live read-only check

`/api/pair-quotes` resolves a bounded search window over the validated official registry, independently of the token sample. Registry membership verifies a provider identity, not reward mode, payments or complete token-market coverage. `/api/pairs?quoteMint=<mint>&discovery=pair` provides at most two25-record pages with complete=false/atomic=false. Its market `observedAt` is **null**; provider response generation/retrieval dates are not executable quote or market-tick times. Rolling24h USD volume is a snapshot field, not a recorded independent period/trend. Historical quote-relative/benchmark/holder-attributed return fields are null by contract.

`/api/radar` derives each token's own anchored recorded periods. Individually equal durations do not establish cross-token alignment. A point-change's actual start/end must not be relabeled24h; current stored last intervals exceed the2h comparison limit. `/api/history` exposes observations and intervals, not wallet cost basis or historical markets. The backend source cache/five-minute receipt age is independent of three-hour observation freshness and counter-period coverage.

Six read-only local production API requests completed on2026-10-14T22:07:03–22:07:05Z, using the unchanged main application/backend. All returned200; this was not a workflow dispatch or external deployment. No real429 was induced. App checks use Node20.20.2/npm11.9.0; the local server used Node24.19.0 `--use-env-proxy` with inherited CA/proxy and normal TLS verification, without application proxy changes.

| Request | Capture UTC | HTTP | Received API-body SHA-256 |
| --- | --- | --- | --- |
| `/api/pair-quotes?mint=Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | 2026-10-14T22:07:03.573501+00:00 | 200 | `d39b3a1bcdaa2800d6f8ced2977b717f1104558407b593948df33e90fbac16a7` |
| `/api/pair-quotes?mint=Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | 2026-10-14T22:07:03.590986+00:00 | 200 | `d5ccc064166d4e3b87b3f38fea893a7825a4721eb1de80ce30a71b54e9a4b647` |
| `/api/pair-quotes?mint=A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS` | 2026-10-14T22:07:03.594837+00:00 | 200 | `ccea1cb68eeee95d08223e311db1fa1a05e0c225a2932859e133315362431343` |
| `/api/radar?sort=name` | 2026-10-14T22:07:03.822517+00:00 | 200 | `2a1d97fdb420bffba256fde7ae54a9260a44ced53dd76444a6beaa3f8cf9bbf9` |
| `/api/history?mint=HcRLc9VDgjLeK154xDawfb1dmVJ98DoSqcwTHGqiDeJR` | 2026-10-14T22:07:03.828184+00:00 | 200 | `a47a5ef6cb4793f5336560268e56fab49af2a4b434dd3260a7f0eb5f04602358` |
| `/api/pairs?quoteMint=Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh&discovery=pair` | 2026-10-14T22:07:05.059082+00:00 | 200 | `c0d0abd291ddfe7d99e42ece81782702b4ee57977eae4df52c5f0f9f7e550ac4` |

The received API-body hashes above identify those complete response bytes, including evaluation times; they are separate from provider/history byte revisions, not Git commit SHAs or independent authenticity proofs. Future requests naturally differ.

Registry read:587 identities; NVDAX, GLDX and ZEC returned one exact match each. Their shared provider source was generated2026-10-14T22:03:30.447Z, retrieved22:07:03.555Z, revision `sha256:6c5603620214de8c78ca02750a5dca2b3f5374e8ddea1849b136b999df720367`. The latter two queries reused the existing cache without making source generation newer.

| Live verified registry label | Mint | Decimals | Token program |
| --- | --- | --- | --- |
| NVDAX | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | 8 | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| GLDX | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | 8 | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| ZEC | `A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS` | 8 | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |

The NVDAX scoped response was **degraded**:50 records over two pages, provider-reported scoped total7662,12 mode-check attempts,0 verified reward modes,1 recorded tracked token and49 not_tracked. No upstream HTTP cause is inferred from `mode_check_unavailable`. All50 market observation times and historical-return/holder-attribution fields remained null. Complete=false and atomic=false remain authoritative.

| Scoped provider source | Response generation | Retrieval | Source-byte revision |
| --- | --- | --- | --- |
| `https://www.stonkfun.xyz/api/public/v1/pairs` | 2026-10-14T22:03:30.447Z | 2026-10-14T22:07:03.990Z | `sha256:6c5603620214de8c78ca02750a5dca2b3f5374e8ddea1849b136b999df720367` |
| `https://www.stonkfun.xyz/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint=Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | 2026-10-14T22:07:04.184Z | 2026-10-14T22:07:04.203Z | `sha256:90da6cb10f67d16d8cb79118cf2e3f8b383bb9587ddbbeef78f0219ead7da9a8` |
| `https://www.stonkfun.xyz/api/public/v1/tokens?sort=marketCap&page=2&pageSize=25&quoteMint=Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | 2026-10-14T22:07:04.388Z | 2026-10-14T22:07:04.405Z | `sha256:ee41c4504c64c4bfeb105bc194b2a636abbdc5c0f832c2ab29e9f48e90ad83cc` |

The real Radar response used the same stored-byte revision as the base audit (hash match confirmed), fetched22:07:03.810Z. All seven rows were observation-fresh but had `pointChange.status=long_interval` and unavailable Signal Lab comparisons. Six reported `gapped_current_history`, `unmatched_duration`, `insufficient_previous_history` and `gapped_previous_history`; KNOTS reported gapped/unmatched periods plus missing previous boundary and inconsistent quote identity. ZCAT history returned10 points and an insufficient24h window. This directly demonstrates that fresh source retrieval is not usable temporal coverage.

Offline replay of those unchanged API packets and the hash-matched real store at `asOf=2026-10-14T22:07:05.059Z`, requested actual end `2026-10-14T19:28:06Z`:

```json
{
  "quoteMint": "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
  "leftMint": "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP",
  "rightMint": "2NxsFPVyehrejM1jvrSx4JaU8J1HDCKda7VQ2vWfLJkU",
  "leftDistribution": {
    "state": "withheld",
    "confidence": "withheld",
    "value": null,
    "reasons": [
      "catalog_partial"
    ],
    "details": []
  },
  "rightDistribution": {
    "state": "withheld",
    "confidence": "withheld",
    "value": null,
    "reasons": [
      "catalog_partial"
    ],
    "details": []
  },
  "comparison": {
    "state": "withheld",
    "confidence": "withheld",
    "value": null,
    "reasons": [
      "candidate_withheld"
    ],
    "details": []
  },
  "leftSnapshotState": "available",
  "rightSnapshotState": "available",
  "unsupported": {
    "marketTrend": {
      "state": "withheld",
      "confidence": "withheld",
      "value": null,
      "reasons": [
        "historical_market_observations_missing"
      ],
      "details": []
    },
    "quoteRelativeReturn": {
      "state": "withheld",
      "confidence": "withheld",
      "value": null,
      "reasons": [
        "synchronized_quote_prices_missing"
      ],
      "details": []
    },
    "holderRoi": {
      "state": "withheld",
      "confidence": "withheld",
      "value": null,
      "reasons": [
        "holder_cashflows_missing"
      ],
      "details": []
    },
    "economicLeadership": {
      "state": "withheld",
      "confidence": "withheld",
      "value": null,
      "reasons": [
        "economic_leadership_not_established",
        "historical_market_observations_missing",
        "synchronized_quote_prices_missing",
        "holder_cashflows_missing"
      ],
      "details": []
    }
  }
}
```

The selected real tokens were SI (`DEW9…8WDP`, recorded) and ACQUIHIRE (`2Nxs…LJkU`, not_tracked), both with unavailable current mode checks. First-failing distribution reason was catalog_partial; the second project also has no allowlisted historical series, while the first has the recorded gaps above. Snapshot-only values retained degraded source quality. No positive comparison/leader was manufactured. The six genuine API payloads and the complete offline result are retained in [backend research evidence](evidence/pair-pulse-research.json). For every payload, SHA-256 and length of UTF-8 `JSON.stringify(packet.json)` were verified equal to the actual received HTTP bytes. The raw history/allowlist inputs are pinned by the base commit and byte revision above. This is a dated replay, not live application data; no source dataset was changed and no documentary snapshot became an application fallback.

Request budget: one scoped token query, three registry lookups (shared source cache), one Radar read and one history read (shared history cache). The existing scoped implementation permits at most15 provider attempts; no extra data fanout, full catalog crawl or quota-pressure experiment was added.

## Pure eligibility policy

`comparePairPulse(input)` consumes the existing typed canonical registry/catalog/history-reader schemas plus an explicitly supplied current trusted allowlist. It takes explicit UTC `asOf` and `endAt`; it never reads the clock, fetches, retries, writes or scans backwards to select a flattering window. `endAt` must be an actual shared observation within3h of `asOf`. The caller can replay an old report with its historical evaluation time, but must label it as a replay rather than live evidence.

Input wrappers are a discriminated union: `{state:'ready',value:T}` or `{state:'partial'|'unavailable'|'rate_limited',value:null}`. A generic503 is unavailable; it cannot be labeled provider429 without evidence. Failures produce fixed reasons and null values, never healthy zero, retained success, fallback sample or raw exception text. Ordinary failure diagnostics are conservative/fail-first; candidate reasons and existing Signal Lab `details` expose the gating failure, not an exhaustive claim that every other condition passed.

Bounded work: exactly two distinct selected token mints; at most100 returned quote identities,50 catalog tokens in one scoped group,15 source records,10 allowlist entries and1024 raw observations per selected token. Other history keys are not enumerated. Oversize input is withheld, never truncated into eligibility. The object/metadata validation is a comparison boundary over trusted canonical reader output, not a replacement HTTP parser or authentication system.

A distribution comparison requires:

1. Successful official exact-mint registry verification, compatible original symbol/name/decimals/program between registry and catalog, unique identities, proper scoped query/page provenance and no false complete/atomic assertion. Registry revisions can differ when two fresh reads verify the same identity; that does not make pagination atomic.
2. Fresh source receipts (at most300s), valid received-byte revision metadata, official fixed source URLs, and provider-generation dates no older than3h. Existing upstream clock-skew allowance is at most60s for source responses. Fresh retrieval cannot promote old provider generation or observations to current evidence.
3. A successful catalog and history source for comparisons; partial/degraded/outage/rate-limited comparisons are withheld. Current verified reward mode, exact current allowlist token/quote/pool mapping, same history revision as catalog history metadata, and consistent recorded count/latest-observation metadata are required. Registry membership or catalog `mode` alone is insufficient.
4. Existing **unchanged** `calculateSignals` coverage, quote, source, reset, future/malformed-point, source-generation freshness and two-period gates. Each observed gap must remain strictly below2h; exactly2h fails. V0 also withholds duplicate timestamps, including identical duplicates. It never repairs missing/invalid observations, interpolates, fills with zero, relabels an incomplete period or sums across resets.
5. Three **exact** recorded boundaries `endAt−48h`, `endAt−24h`, `endAt`, and the same provider-generation boundaries between the projects. Each provider-generation period must also be24h, with strictly increasing generation times and gaps below2h. Cross-token endpoint tolerance is **0ms**, deliberately stricter than Signal Lab's per-token nearest-boundary tolerance. Same duration, overlapping periods, rounded-to-hour times or a1ms provider-boundary shift are insufficient. Internal sample times need not coincide when both series independently pass all gap/metadata gates.
6. Every compared received decimal counter must fit the quote's atomic precision without rounding and fit at most `Number.MAX_SAFE_INTEGER` atomic units. Exact deltas/differences then use BigInt internally and JSON-safe decimal/atomic strings externally. Sub-atomic digits, nonfinite/negative values and unsafe large cumulative totals withhold. This does not recover precision already lost upstream or authenticate an upstream numeric claim; future atomic-string capture is preferable. Legacy STONK-sized counters with9 decimals can exceed this conservative safe bound and remain withheld rather than rounded.

Future-provided points, malformed timestamps and duplicates cannot be silently removed to make a window pass. The selected valid period can exclude newer/older observations outside its explicit target, but future/structural/duplicate defects still fail. Existing history, Radar and Signal Lab calculations, thresholds, allowlist and data remain unchanged.

## Supported arithmetic and its limits

For a candidate with cumulative received counter `C(t)` and quote decimals `d`, convert accepted decimal representations to exact integer atomic units `A(t)`. For two adjacent aligned periods of86400 seconds:

- `previous = A(t1) − A(t0)`
- `current = A(t2) − A(t1)`
- `change = current − previous`
- Two-project current/previous differences are `left − right`; the change difference is `(left.current − left.previous) − (right.current − right.previous)`.

All operands share the same verified quote mint and precision. Zero remains zero; signed changes/differences can be negative without implying cumulative counter resets. There is no currency conversion, annualization, division by holder count/liquidity/market cap, percentage from a zero baseline, rank, score, “winner,” recommendation or buy/sell action. A synthetic spike can produce a larger **observed counter change**, but never unlocks economic leadership, holder ROI or market momentum.

These are aligned **counter-read measurements**, not proof of the exact onchain payout cutoff or independent settlement. Provider response generation is separate from recorded receipt and may not be a counter-specific as-of watermark. Matching their boundaries is a necessary conservative gate, not proof of payment completeness or provider honesty. Counter corrections can resemble distributions. Any stronger payout/leadership interpretation needs independent reconciliation and additional data.

Market snapshots may remain separately available when history is unavailable or catalog quality is degraded, provided their own identity/provenance/source-age/units pass; their sourceQuality remains explicit. Null liquidity/volume is unknown, genuine zero stays0. `kind:'provider_reported_snapshot_not_trend'`, `confidence:'snapshot_only'` and `observedAt:null` are mandatory. No difference of two snapshots becomes liquidity flow, volume momentum or a historical return.

## Feasibility and exact future data requirements

| Research question | Present evidence | Outcome / missing inputs |
| --- | --- | --- |
| Which exact asset is this pair? | Official registry mint/program/decimals and catalog match | Provider identity only; no underlying ownership or independent onchain identity claim |
| Current reported liquidity/volume? | Nullable USD provider fields | Dated snapshot only; market tick time/executable liquidity/reconciled pool identity unknown |
| Did a project's aggregate distribution counter change over aligned periods? | Sparse cumulative history for seven tokens | No current V0 comparison; need48h of credible, sufficiently frequent observations with three actual shared read/provider boundaries, fresh mode/source/quote/pool metadata and safe precision |
| Relative observed distribution activity within NVDAX/GLDX? | One NVDAX history and zero GLDX histories | Need separately approved history for at least two compatible projects; broad catalog discovery is not historical coverage |
| ZEC cross-project activity? | Two histories with10 points each, >8h gaps,46.78h spans and unaligned endpoints | Coverage, duration and actual/source endpoint alignment all fail; do not infer through interpolation |
| Liquidity/volume trend or net inflow? | Point snapshots; rolling volume windows lack independent observed start/end | Need durable append-only timestamped observations, defined venue/pool coverage and interval semantics; price changes/reserve changes are not pure capital inflow; overlapping24h rolling windows are not independent turnover periods |
| Quote-relative price return / benchmark? | No synchronized token-price and quote-token-price history | Need aligned, reliable price observations in explicit units, actual valuation times, stable pool/venue attribution and a documented benchmark methodology; token labels do not supply equity/metal prices |
| Holder-attributed ROI / yield? | Aggregate totals/holder counts, no attribution/cost basis | Need holder entitlement over time, actual payments, valuations, acquisition/disposal cashflows, fees and timing; do not divide aggregate distributions by holder count and call it ROI |
| Genuine economic leadership / alpha? | Above gaps plus nonexhaustive, non-atomic sample | Withheld permanently in V0; defining a defensible population/metric, costs/valuation, attribution, reconciled data and bias controls requires a separate reviewed methodology |

A future instrumentation proposal should preserve exact provider/collector/block/cutoff timestamps separately, original response-byte hashes and transport/source status, quote mint/program/decimals, token/pool/mode changes, atomic counter strings and source errors. Establish genuinely shared provider snapshots or verified ledger cutoffs rather than rounding existing timestamps into alignment. New observations cannot manufacture past coverage. Historical market capture, allowlist changes, legal/provider rights, quota/cost review, retention/storage design and scheduler activation are separate human-approved work; this PR performs none of them. The strict gate may remain unavailable under the existing sequential collector even after hourly reliability improves. Do not weaken it to manufacture a chart or leader.

## Minimal future frontend contract (proposal, no route)

Types are in `lib/pair-pulse-contract.ts`; importing types requires no server/provider module. A future reviewed read-only endpoint could return `PulseReport`, but none is added here. The current frontend must continue using its existing APIs and must not expose synthetic positive examples.

- `schemaVersion:1`, fixed policy identifier, explicit evaluatedAt/endAt and a verified quote identity/provenance or null.
- Two candidates under `left`/`right`, selected from a bounded scoped sample; full mint is the identity. Scope always says complete=false/atomic=false.
- Each candidate has independent `distribution` and `snapshot` available/withheld outcomes. Available distribution includes actual recorded/provider windows, observation/gap counts, exact atomic/token strings, unit identity and original history/catalog/mode provenance. Withheld values are null with reason codes and optional existing gate details.
- `comparison` becomes available only when **both** candidate gates and cross-token alignment pass. Its signed left-minus-right values are observed aggregate activity, never a ranking or expected personal return. Individually available candidates must not bypass a withheld comparison.
- `unsupported.marketTrend`, `quoteRelativeReturn`, `holderRoi` and `economicLeadership` always remain withheld/null, with specific missing-data reasons, even in positive test cases. `confidence:'coverage_passed'` is logical coverage, not payment verification; snapshot confidence is only `snapshot_only`.

A narrow future screen/report should ask for one exact quote and two projects, show evidence windows and source states, and say “not enough comparable history” when withheld. It should not prefetch providers per row, select a “best” project or silently hide withheld candidates. Keep source/coverage warnings and dates accessible. Integration/API/financial wording requires its own human approval.

## Threat model and verification

This offline function does not authenticate a malicious caller or verify content hashes against raw bytes it does not receive. It assumes canonical server readers and the current trusted allowlist, not untrusted browser-supplied “verified” flags. Any future server adapter must supply a trustworthy evaluation clock; a browser cannot choose `asOf` to promote an old replay into current evidence. It checks consumed identity/provenance/age/count metadata, never follows URLs, never prints raw errors, and returns fixed bounded states. Arbitrary extra registry properties are not copied into outputs. Current-pool mapping is not a historical pool-migration attestation; provider counts and hashes are not proof of settlement, licensing or universal completeness.

Tests use positive synthetic packets **only inside the test file**. They cover exact quote/program/source identity, same-ticker different mint, duplicate candidates/points, shifted observation/provider periods, stale/current/cache ages, partial/outage/429, source/revision forgery, gaps exactly2h, resets, zero/null, decimal precision/unsafe outliers, synthetic spikes, bounded arrays, frozen inputs, no network/implicit clock, JSON-safe results and unchanged real stored history failing coverage. Tests preserve the original Signal Lab/Radar/backend/frontend suites. No screenshot is applicable: no UI changes.

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
git diff --check
```

| Required command | Final result |
| --- | --- |
| `npm ci` | Exit0;336 packages; manifest/lockfile unchanged |
| `npm test` | Exit0;256 main JS (including70 new Pulse cases) +15 existing adapter JS +62 Python;0 failures/skips |
| `npx tsc --noEmit` | Exit0; no diagnostics |
| `npm run lint` | Exit0; no lint warnings/errors |
| `npm run build` | Exit0;9/9 static pages; home remains126kB first-load JS |
| `bash scripts/archive-tool.sh check origin/main` | Exit0; append-only/reproduction passed |
| `npm run archive:dry-run` | Exit0; replay/idempotency/tamper checks; working archive unchanged |
| Six actual read-only API requests + offline replay | Exit0; all200; six response byte hashes/lengths verified; real comparison withheld, snapshots separately labeled |
| `git diff --check` | Exit0 |

All existing frontend/backend/collector/scheduler tests remain included. No UI/browser screenshot test is newly required because application/UI files are unchanged. Existing npm ESLint deprecation and Next edge/static-generation notices are not new failures. App checks use the established toolchain; no dependency/configuration change. Earlier debugging runs are not reported as passing final results.

## Approval and rollback

Human-review PR only. No merge, deployment, workflow dispatch, live permission/credential change, spending, treasury/wallet action, trading, token launch or scheduling/collector gate activation. There is no frontend behavior change and no route to activate accidentally.

Rollback: a human-reviewed revert of this PR removes the new pure modules/tests/report and the two test-runner additions. Preserve all merged frontend/backend work, real observations, archive files and safeguards. No data migration, resource teardown, secret deletion, permission change or production rollback is needed. Do not label the future contract production-ready until human review of methodology, source trust, timing/precision constraints and current withholding evidence.
