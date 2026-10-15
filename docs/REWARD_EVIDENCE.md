# Reward Evidence V1 — mechanism, lifetime, intervals and returns

Issue [#58](https://github.com/fuzzysniper/scout-stonk-intel/issues/58), backend/data only, from main `49ab560` including merged Reward Audit #56 and screener #57 plus the genuine October14 23:16 collector snapshot. [Schema coordination with frontend #59](https://github.com/fuzzysniper/scout-stonk-intel/issues/59#issuecomment-6181141509) preceded implementation. A new optional `PairToken.rewardEvidence` on the **existing** `/api/pairs` response makes four separate evidence claims. It adds no upstream requests, route, query parameter, ranking, collector, archive publication or frontend integration.

| Evidence | What is verified/reported | What it never establishes |
| --- | --- | --- |
| Mechanism | Official v2 API matches token mint + reward mode + exact quote mint/symbol, against the official registry/catalog | That holders were paid, eligible, or profitable |
| Lifetime | Provider ledger reports cumulative delivered quote-holder totals, exact raw integer scaled by matching registry/provider decimals | A 24h period, current payout pace, comparable launch ages or holder ROI |
| Interval | Genuine stored counter observations pass the **unchanged strict Pair Pulse V0 gates** for two adjacent actual 24h windows | Independently reconciled payout receipts, holder entitlement, price/market trends or investment return |
| Holder return | Always unavailable/null; inputs missing | Holder profit, APY, total return or expected yield |

Confirmed standard mode is explicit and carries no holder-reward claim. A ledger zero is reported as a zero string; missing/awaiting/invalid totals stay null. A freshly fetched source is separate from its actual observation/payout time and coverage. Partial source/catalog evidence may support a named token's reported lifetime value while the sample remains incomplete and interval comparisons are withheld.

## Implementation and compatibility

Public types: [reward-evidence-contract.ts](../lib/reward-evidence-contract.ts). Presentation: [reward-evidence.ts](../lib/reward-evidence.ts). Shared exact ledger parser: [reward-lifetime.ts](../lib/reward-lifetime.ts). Existing PairCatalog/PairToken fields, schemaVersion1, sort/group semantics, quote registry endpoint, query validation, HTTP status, source requests, caches,429 admission and no-store behavior are preserved. Older clients ignore the optional field; no frontend consumes it in this PR. Adoption requires a separate later integration PR after human review/merge, per #59.

The existing mode-check GET already receives the official v2 aggregate body. The source reader now retains only bounded validated lifetime fields from **that same response**, excluding base-token, pending and fee-recipient objects, float amount, wallet identities and unknown properties. It independently validates the already-fetched registry for interval eligibility; if that stricter registry validation is unavailable, existing discovery/mode behavior is retained and interval evidence fails closed. There is no additional registry fetch.

The dated [Reward Audit](PAIR_REWARD_AUDIT.md) and live evidence use one exact raw/count/date parser. Its16 genuine retained candidate totals and four-pair audit output remain unchanged, including ties and zeros. The documentary JSON is never imported by application code and is never a static fallback, current catalog or cached source. Parser extraction introduces no historical math changes.

`evaluatePairPulseCandidate` exposes the same private source/identity/history/coverage/precision/period gates used by `comparePairPulse`; no gate thresholds or arithmetic were changed. This permits one selected token's covered interval evidence without requiring another candidate to have history. The two-token comparison still requires its original cross-token exact-boundary/provider alignment and withholds economic leadership/returns. Positive synthetic fixtures prove the standalone result equals the old left-candidate result, and negative cases preserve resets, duplicate rejection, exact-two-hour gap rejection, previous-window requirements and unsafe-float withholding.

## Minimal future UI schema

Read `token.rewardEvidence` only when present. If absent (older backend), use existing `rewardModeVerified/modeVerification/rewardSource` **for mechanism only**; do not assume a lifetime/interval field or invent an amount. A current frontend must not expect this unmerged optional field.

| Field | Consumer meaning |
| --- | --- |
| `schemaVersion:1`, `evaluatedAt`, `tokenMint` | Contract version, calculation time, exact base-token identity. Evaluation time is not market/payout observation time. |
| `unit.kind:quote_token`, `mint`, `symbol`, `decimals` | Common unit for lifetime/interval amounts. Group by exact mint; ticker is a label. These are quote-token units, not USD or shares in an underlying company. |
| `summary` | `observed_interval`, `reported_lifetime`, `mechanism_verified`, `standard_mode`, `unverified`. A compact evidence label with an explicit meaning; no score or earning rank. |
| `mechanism.state` | `verified_reward`, `verified_standard`, `unverified`. `meaning:settings_confirmation_not_distribution_or_return` is unconditional. |
| `mechanism.evidenceLevel/source/reason` | `official_api_mode_identity`, `catalog_only` or `none`; exact official response source/hash/original receipt and generated timestamps, or null/unavailable. `referenceUrl` is a fixed official lookup URL even when provenance is missing, not evidence of a successful read. Source presence alone is not verification. |
| `lifetime.state/value` | `reported` plus exact string `distributedRaw/distributedTokens`, counts and actual `lastPayoutAt`, or `unavailable`/null plus reason. `basis:ledger`; startAt/endAt null because true lifetime start and reconciliation cutoff are unknown. |
| `lifetime.evidenceLevel/source` | `provider_reported_ledger` or `none`, source URL/hash/receipt/generation. Provider assertion, not independent chain proof. |
| `interval.state/value` | `covered`, `insufficient_history`, `unavailable`. Covered value is the existing PulseDistribution: exact current/previous starts/ends, provider generation boundaries, seconds86400, observation counts, max gaps, raw/string deltas and history revision. Missing value is null, never a zero/default 24h figure. |
| `interval.historySource/reasons/details` | History source/hash/original retrieval/source status even when withheld; exact Pulse reason codes and existing Signal Lab coverage reasons. Source timestamps do not manufacture observations. |
| Metric `quality` | `current`, `cached`, `partial`, `stale`, `unavailable` describes source freshness/retention/partial-page state. Check state/value/evidenceLevel as well; a current source may have null or invalid payout data. |
| `holderReturn` | Always `state:unavailable`, `value:null`, `evidenceLevel:none`, reason holder entitlement/costs/cashflows missing. No ROI/APY/trading inference. |
| `scope` | Bounded market-cap-selected catalog, inspected raw records, same-quote unique candidates, attempted mode checks, same-quote modes verified (reward **and** standard), reported lifetime/covered interval counts. Counts are evidence coverage, not sorting scores. |
| `scope.providerReportedUniverse/uninspectedCatalogCount` | Exact scoped query: provider all-mode live-platform-pool total and total minus returned unique candidates. Global/local-filter sample: null/unknown for the pair; never substitute the global catalog count. |
| `scope.ranking` | Always withheld, reason nonexhaustive sample/not reward order, ecosystemLeader null. `complete:false`, `atomic:false` always, even0 uninspected in a small response. |

Suggested neutral text: “Reward settings confirmed”, “Reported lifetime total”, “Observed interval flow”, “Insufficient history”, “Unverified”. For reported **zero**, say “Reported lifetime total:0 {quote}”; do not imply that any payout occurred. For intervals, present actual boundaries and the counter-change interpretation. An explanation of verified settings must remain distinct from payout evidence. Do not use “top earners”, green profit indicators, return percentages or a 24h amount when value is null.

Shareability belongs to #59: use existing tested exact-token/quote links and disclosures. This backend PR provides exact identities and source references; it creates no new selection URL, share endpoint or fabricated dossier. A shared link must re-evaluate current source states, not carry a dated audit amount forward as live evidence.

## Gates and security boundaries

Mechanism requires the official registry source and exact token/quote match, original registered mode provenance/byte hash, source receipt≤300s and provider generation≤3h. Future dates and foreign/path/query-injected URLs fail closed. Catalog-only/unchecked modes remain unverified. A closed internal source-failure code maps stale transport/generation to source_stale and429/shared cooldown to source_rate_limited; raw errors/headers/credentials are not exposed. Reference URLs are fixed official paths for valid mints, not arbitrary incoming URLs. Verified standard mode never enables lifetime/interval reward values.

Lifetime additionally requires generation≤300s, matching provider/registry decimals, ledger basis, canonical nonnegative integer string≤78digits and safe nonnegative counts. Paid-wallet count cannot exceed payout count; positive raw needs positive counts; last payout state/time must agree with count and precede generation. It uses raw BigInt precision/string scaling and ignores provider float, base/pending/fee recipients. A stale/missing/invalid/awaiting/snapshot response yields null without changing verified settings into a payout claim.

Interval uses original Pulse limits: source ≤300s, observation≤3h, strict actual/provider boundaries, two full adjacent24h windows, original gap/reset/identity/allowlist/source-hash checks, provider sequence alignment and safe float-counter-to-atomic conversion. A current mechanism must also pass the new presentation gate. No interpolation, invented counter points, dropped malformed/duplicate observations, widening of gaps or relaxation of precision. Library tests alone use clearly labeled synthetic hourly histories to prove positive behavior; production data stays genuine and may legitimately withhold every interval.

Fixed GET-only origin; existing15 maximum provider reads per refresh (1 registry+2 pages+12 aggregate mode checks), concurrency3, per-read3s/overall10s,1MiB cumulative body,512KiB/128KiB/32KiB bounds. Source parser/controller, request scheduling, Retry-After interpretation, five-minute caches, scoped capacity4 and one cold scoped refresh/minute are unchanged. Existing history reader retains its independent2MiB/fixed-GitHub/cache/fallback safeguards. No credentials, wallet calls, redirects, arbitrary upstream input, user URLs, secrets, chain writes or new dependency. API/error/query security tests run with all previous backend regressions.

## Four exact quote universes and evidence

All four target identities are confirmed in retained official registry evidence; they are token units, not legal equity/metal ownership.

| Quote | Exact mint | Decimals |
| --- | --- | ---: |
| NVDAX | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` |8|
| GLDX | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` |8|
| SPCXX | `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` |8|
| Canonical STONK | `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx` |9|

Other STONK ticker identities remain separate. The dated audit inspected25 catalog rows/four reward candidates per universe, from7663/1910/8656/10618 provider all-mode totals respectively. It supports only a dated observed-sample lifetime ordering. V1's live contract intentionally exposes **no ordering** and always withholds ecosystem leadership. Historical values such as SI 15527.87212775 NVDAX or KNOTS 11995464.083712182 STONK are documentary, not automatically current.

Four-pair tests replay genuine retained **response bodies** through the source pipeline with controlled offline receipt clocks. Unrecorded pages/mode packets produce explicit synthetic unavailable responses; this is a regression scenario, not evidence that the provider failed those requests. No new capture timestamp, outage or candidate universe is inferred from replay. Actual current endpoint evidence and the documentation recheck are recorded separately in the PR evidence file.

## Rates, rights and incremental indexing — inactive proposal

Two bounded documentation GETs on October15 00:07UTC returned200. OpenAPI2.0.0 and guide hashes exactly matched the October14 audit originals. Documentation still states lifetime holder totals, separate base/fee-recipient/pending populations, unknown-decimal amounts null, and a **global** reward-launch sort comparing unlike-asset token counts. There is still no documented exact quote reward filter or complete pair reward ordering in that source. No aliases/cursor crawl were retried.

Guide rates remain v1 reads 300/minute/IP and ordinary v2 reads 240/minute/IP, Retry-After on429, CDN hits excluded, no paid higher tier listed. Production provider call budgets are unchanged. Existing public-API automation exception/redistribution uncertainty in [the prior terms review](PAIR_DISCOVERY_COVERAGE.md#published-access-terms) remains an owner-review blocker for broader commercial indexing/publication; guide/OpenAPI access alone is not a redistribution license or SLA. Terms module was not re-fetched or accepted.

Prefer provider-supported exact-mint aggregate filtering, raw-unit order and a reconciliation watermark/stable snapshot. If unavailable, retain only owner-approved incremental source receipts keyed by token+quote+mode, explicit source epoch/reset/coverage counters and immutable hashes. A bounded checkpoint/cursor index must disclose moving/hidden/retired catalog omissions and can never promote an incomplete walk to ecosystem leadership. The four audited pair counts sum 28847; individual verification alone would exceed 16hours at the previously proposed 30GET/minute global proving cap. No such index, scheduler, database, cron or crawler is activated here.

Human gates remain: current usage/retention rights, reviewed schema and distributed provider budget, storage/cost limit, separate proving plan and activation approval. Real aligned observations and separately modeled holder eligibility/cashflows/fees are required before interval comparability and any holder return. Preserve sparse history and existing mathematics; no backfill/fictional continuous series. No paid account, credential or activation is needed for this PR.

## Verification and rollback

Local validation on Node20.20.2/npm11.9.0 (production transport QA uses Node24.19.0 with inherited proxy/CA support; no TLS bypass):

| Command | Exact result |
| --- | --- |
| `npm ci` |exit0,336 packages installed; existing ESLint9 deprecation notice|
| `npm test` |exit0,366 app +15 scheduler JavaScript tests and62 Python tests; zero failures/skips|
| `npx tsc --noEmit` |exit0, no diagnostics|
| `npm run lint` |exit0, no errors/warnings|
| `npm run build` |exit0,9/9 static pages, homepage127kB first load; clean build removes diagnostics|
| `bash scripts/archive-tool.sh check origin/main` |exit0, append-only/reproduction passed|
| `npm run archive:dry-run` |exit0, offline replay/idempotency/tamper passed; working archive unchanged|
| Focused backend security/API/source suite |exit0,139/139 passed, including43 new reward-evidence cases and64 unchanged audit cases|
| `bash scripts/pair-reward-audit.sh` + retained-output comparison |exit0, original dated audit output exactly preserved|
| `git diff --check` |exit0|

No source/counter gates were weakened to pass checks. Existing UI tests run unchanged. Exact documented source URLs, origin/query/revision/future/stale rejection,429/503/cold behavior, capped requests/bytes, raw precision, ties/zero/null, rankability limits and genuine source-body replay are covered. Remote PR checks are linked in the PR.

[Current evidence](evidence/reward-evidence-2026-10-15.json) records34 public provider GETs across documentation2, two bounded existing cold scope refreshes15+15, and two direct SI diagnostic reads. The diagnosis ceiling was36; no429 was observed or induced, no retries/cursor crawl/cache-busting query/paid request was added. The second refresh investigated an unresolved production validation failure; it did not increase the per-refresh production budget. One existing fixed-GitHub history fetch per new local server is outside that provider count.

The actual local production requests at October15 00:10:54.365UTC and00:17:05.384UTC each returned HTTP200/degraded with50 exact NVDAX candidates,7663 provider all-mode tokens,12 mode attempts, zero verified mechanisms/lifetime values and zero covered intervals. This is honest unavailable evidence, not a fictional positive result. The later diagnostic observed11 HTTP200 responses rejected as stale transport (Age370–371>300) and one404; direct SI captures returned genuine ledger data but do not bypass those production gates. SI's last payout was October14 23:55:13.817UTC, distinct from response generation October15 00:10:53.901UTC. The initial rejection causes were not logged and are not retroactively assigned to the later stale response. Provider/CDN freshness, the observed404 and sparse genuine interval history remain source limitations, not permission to weaken checks.

Safe temporary diagnostics modified only ignored local build output and logged fixed public response metadata/coded errors. A clean final rebuild removes them; no diagnostic code or alternate fetch wrapper is committed. Four-pair retained-body replay and synthetic positive/negative gates exercise the new contract independently of a currently stale provider. Required commands and backend security results are listed in the PR. Regression coverage includes distinct statuses, exact mints/same tickers, zero/null/ties, provider float precision, lifetime/period separation, scope bias, stale/429/503/cold sources, malicious source URL/path/revision, byte/request bounds, unchanged Pulse gates and genuine dated replay. Existing frontend tests execute unchanged as regression checks, with no frontend modifications or screenshots in this backend PR.

Rollback: revert the optional evidence field, bounded receipt retention/parsers/presentation, single-candidate Pulse wrapper and backend tests/registration/docs. The old two-token Pulse/math/source/history/allowlist contracts and source-call budgets are retained; audit output must continue to reproduce. No migration, observations, archives, live settings, workflows, Cloudflare, wallets, treasury or tokenomics require rollback. Human-review PR only; no merge/deployment/activation.
