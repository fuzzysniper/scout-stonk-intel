# Pair reward rankability audit — issue #54

**Dated finding:** on October 14, 2026, SI/NVDAX, GP/GLDX, GROK/SPCXX and KNOTS/canonical STONK had the largest **provider-reported lifetime quote-holder distributions among the four audited candidates in their respective exact-mint samples**. **Ecosystem leader unknown** for every pair. This is historical research evidence, not a live ranking, a common-period activity comparison, holder ROI or an expected return.

Base: `b8dc83c87ce4c3526cff4a2a2806dc2a46d8566e`, including merged #52/#53. [Issue #54](https://github.com/fuzzysniper/scout-stonk-intel/issues/54), [frontend coordination](https://github.com/fuzzysniper/scout-stonk-intel/issues/55#issuecomment-6180016724). Only backend/offline research, tests and this memo change. Existing APIs, frontend, Pair Pulse/Signal Lab mathematics, historical data, allowlist, collector, workflows, archive, Cloudflare, GitHub App and tokenomics remain unchanged.

## Four-pair memo

These amounts use exact integer `distributedRaw` divided by verified registry decimals, without converting to USD or comparing across rows. Each figure is **lifetime**, with unknown start and exact reconciliation cutoff; it is not a 24h delta. The four reward candidates are the first four **catalog-reported reward-mode** entries on the first 25-token market-cap page for that exact quote. Market cap chooses the sample; raw quote-holder distributions order the four verified candidates inside it.

| Exact quote universe | Top observed in audited sample | Reported lifetime quote tokens | Provider total, all modes | Catalog inspected / uninspected | Reward mode / payout / eligible verified | Rewards unassessed |
| --- | --- | ---: | ---: | --- | --- | ---: |
| NVDAX | SI | 15527.87212775 NVDAX | 7663 | 25 / 7638 | 4 / 4 / 4 | 7659 |
| GLDX | GP | 9828.59080179 GLDX | 1910 | 25 / 1885 | 4 / 4 / 4 | 1906 |
| SPCXX | GROK | 5092.44927539 SPCXX | 8656 | 25 / 8631 | 4 / 4 / 4 | 8652 |
| STONK (canonical mint only) | KNOTS | 11995464.083712182 STONK | 10618 | 25 / 10593 | 4 / 4 / 4 | 10614 |

All four universes are incomplete and non-atomic. Totals are the provider's live-platform-pool counts for the exact quote, **including standard tokens**, not an independently verified reward-only denominator. `Rewards unassessed = provider total − eligible`; it includes uninspected catalog tokens and catalog rows without audited reward totals. It does not count how many unknown reward tokens exist. New/hidden/retired pools, source omissions and non-atomic pagination are additional uncertainties.

| Quote | Exact registry mint | Decimals | Registry ticker ambiguity |
| --- | --- | ---: | --- |
| NVDAX | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | 8 | false |
| GLDX | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | 8 | false |
| SPCXX | `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` | 8 | false |
| STONK | `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx` | 9 | true: registry has three STONK mints |

The other STONK identities (`Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump` and `AMnRhMEt4QzoKACHuN8nTykxYthscAFyX9fhDNVpump`) are excluded from this universe. Registry labels NVIDIA/GOLD/SPACEX do not establish equity or metal ownership, redemption rights, issuer backing or benchmark equivalence.

### Actual audited candidate ordering

Within each line, ordering is by exact raw lifetime quote amount, descending. Units never cross quote mints. A recorded ledger zero is distinct from null/awaiting/unavailable.

- NVDAX: SI **15527.87212775**, CHONK **215.07028662**, SHOGGOTH **59.35130979**, VICKICHASE **0.00000000**.
- GLDX: GP **9828.59080179**, WOW **2092.17288897**, BABEL **76.52536793**, RPG **34.25500241**.
- SPCXX: GROK **5092.44927539**, URANUS **991.33146380**, OWL **928.67979209**, BOT **783.95712352**.
- Canonical STONK: KNOTS **11995464.083712182**, STONKINU **883815.013847760**, KNOWER **421817.002617643**, STONKITTY **53118.033963644**.

These are observations of reported counters, not a synchronized economic-leadership finding. Launch ages differ. Quote-holder Community Mode allocations may be included in holder totals; fees paid to separate recipients, pending/stranded balances and amounts distributed in the base token are excluded. `walletsPaid` counts distinct recipients ever paid, not current holdings or equal entitlement. No division by market cap, liquidity, wallet count or price is performed.

## Sources, actual times and corroboration

[Evidence](evidence/pair-reward-audit-2026-10-14.json) contains received response bodies, byte counts, SHA-256 revisions, public cache/rate headers, URLs, capture times, selected documentation excerpts and the deterministic offline report. SHA-256 identifies retained bytes; it is not a signature, chain reconciliation or Git commit. Documentation source hashes identify the inspected originals; only relevant excerpts are retained, not whole software/documentation copies.

A fixed **32-request ceiling** was declared before probing. **30 sequential public HTTPS GETs**, at least one second after each completion, ran from **22:33:14.259782 to 22:34:34.768696 UTC**. All returned **HTTP 200**; no retries, bulk crawl, forced 429, payout-recipient rows, wallet-specific request or write call occurred. TLS/proxy verification remained enabled. The two unused requests were not spent. Four `/rewards/holders` reads corroborated each sample leader's raw total and payout count; these are separate provider aggregates, not independent on-chain proof.

Offline evaluation time is **2026-10-14T22:34:25.223Z**, the last primary aggregate receipt. Later corroboration is documentary and is not silently advanced into that evaluation. Actual `lastPayoutAt` and response `generatedAt` are separate fields. The provider documents totals lagging by about a minute, but supplies no exact reconciliation watermark; `generatedAt` cannot substitute for payout cutoff.

| Source / sample | Provider generation | Retrieval UTC | Top candidate's actual lastPayoutAt |
| --- | --- | --- | --- |
| Registry, 587 validated identities | 22:28:32.776 | 22:33:17.185 | n/a |
| NVDAX catalog page1 | 22:33:38.637 | 22:33:38.653 | n/a |
| GLDX catalog page1 | 22:33:39.781 | 22:33:39.794 | n/a |
| SPCXX catalog page1 | 22:33:41.057 | 22:33:41.071 | n/a |
| STONK catalog page1 | 22:33:42.189 | 22:33:42.204 | n/a |
| NVDAX four aggregates | 22:34:07.055–22:34:10.607 | 22:34:07.070–22:34:10.622 | SI 21:16:12.127 |
| GLDX four aggregates | 22:34:11.750–22:34:15.213 | 22:34:11.763–22:34:15.227 | GP 20:07:59.564 |
| SPCXX four aggregates | 22:34:16.363–22:34:19.803 | 22:34:16.378–22:34:19.819 | GROK 21:16:27.245 |
| STONK four aggregates | 22:34:21.003–22:34:25.208 | 22:34:21.017–22:34:25.223 | KNOTS 18:03:22.886 |

All times in the table are October 14, 2026, UTC. Registry transport `Age:285` was below the existing 300-second cap at receipt; primary catalog and aggregate reads had `Age:0`. A recently generated aggregate with an old last payout does not imply fresh reward activity. Full token mints, source hashes, zero states, payout counts and exact timestamps are in each report candidate's provenance and lifetime object.

Direct primary sources: [NVDAX/SI](https://www.stonkfun.xyz/api/v2/tokens/DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP/rewards), [GLDX/GP](https://www.stonkfun.xyz/api/v2/tokens/HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ/rewards), [SPCXX/GROK](https://www.stonkfun.xyz/api/v2/tokens/6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8/rewards), [STONK/KNOTS](https://www.stonkfun.xyz/api/v2/tokens/8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS/rewards). These links can change after capture; the retained bodies establish the dated figures.

A genuine precision trap: KNOTS returned `distributedRaw:"11995464083712182"`, decimals9, but floating-point `distributedTokens:11995464.083712181`. The raw integer implies **11995464.083712182**. This report derives a decimal string and sorts BigInts, avoiding the one-atomic-unit float loss. It does not change the historical float-counter safeguards in merged #53.

## Official endpoint capability and rate/rights audit

Documentation inspected: [developer guide](https://www.stonkfun.xyz/developers), [OpenAPI2.0.0](https://www.stonkfun.xyz/api/public/v1/openapi.json). Verified response paths are recorded in evidence. No launch, claim, payment or write endpoint was invoked.

| Endpoint / test | Evidence | Decision |
| --- | --- | --- |
| v1 `/tokens`, exact `quoteMint`, page1/pageSize25, `sort=marketCap` | Four pages, every row's quote mint matched; totals above | Valid bounded discovery, biased by market cap |
| Same NVDAX catalog with `sort=distributed` | HTTP200; identical ordered token mints to market-cap response; guide allows marketCap/newest/volume | Unsupported sort must not be interpreted as payouts |
| v2 `/rewards/launches?asset=quote&sort=distributed&order=desc&limit=100` | `basis:ledger`,100 rows, non-null nextCursor; all PEPE/Bonk/SHIB/$HACHI/USA/UOTF, none of the four requested exact mints | Documented reward sort exists **globally**, by token count across unlike assets, not economic value |
| Same global query plus undocumented `quoteMint=NVDAX` | Byte-identical body/hash `18eceda986915ff0ce2f6f2a5e45b95260a527610a3127f03f37d119bae1091f`, still mixed assets | Filter ignored in this probe; no verified pair-scoped reward order |
| v2 `/tokens/{mint}/rewards` |16 matching mint/mode/quote/decimals, `basis:ledger`, exact raw totals | Supports the dated four-candidate counter comparison only |
| v2 `/tokens/{mint}/rewards/holders` | Four largest-observed candidates matched primary raw totals/counts | Holder aggregate corroboration; excludes fee-recipient payouts |
| v2 pending / fee-recipients | Official documented separate owed/unreceived balances and fee-recipient payouts; no requests | Different populations/assets; never add to delivered holder totals |
| v2 per-token/global payout cursors | Documented delivered rows with signature, holder, assetMint, integer amountRaw, createdAt; not requested | Future delivery reconciliation requires complete cursor traversal, stable scope and deduplication; schema alone is not complete-history proof |

The current documentation contains no exact quote-mint filter on reward launches, pair-specific lifetime leaderboard, pair reward-only denominator, fixed-period distribution sort, fee/payout catalog sort or complete historic price series. Tests establish behavior for the specified paths/parameters at the stated times, not that every possible future provider capability is absent. We did not guess many parameter aliases or crawl cursors to find these assets.

The guide states **v1 reads300/minute/IP; ordinary v2 reads240/minute/IP**, CDN hits do not consume origin quota, and 429 supplies Retry-After. These probes reported the same limit headers; no paid tier is documented. Shared-IP consumption and replica-wide admission matter. The global lifetime list has no `generatedAt`: cache age/HTTP date and approximate source lag alone are insufficient for the strict candidate source-time gate. It is capability evidence, not a report input.

The [previous terms inspection](PAIR_DISCOVERY_COVERAGE.md#published-access-terms) found the public API/documentation automation exception, anti-abuse requirements and reserved redistribution rights (terms dated September18,2026). This audit rechecked guide/OpenAPI access and rates, not that terms module. Public/no-key access is not commercial redistribution permission or an SLA. Owner confirmation of current terms, permitted retention/publication and provider headroom remains required before broader indexing. No fees, accounts, new dependencies, keys or paid requests were introduced.

## Offline contract, eligibility and operational limits

[Types](../lib/pair-reward-audit-contract.ts), [pure implementation](../lib/pair-reward-audit.ts). No live route is added and the frontend does not consume static audit evidence. Existing `/api/pairs` and `/api/pair-quotes` budgets, caches,429/503 admission and source contracts are unchanged.

`auditPairRewards({quoteMint, asOf, registry, catalog, rewards})` takes **recorded** fixed-origin response packets: URL, original fetchedAt, HTTP status, optional transport age and raw UTF-8 body. Caller must normalize capture times to strict UTC ISO and supply trusted public captures; the library hashes bytes but cannot authenticate the remote provider cryptographically. The CLI supplies the documented evidence, not a production fallback. It has no network, implicit current clock, polling, retry or writes.

- Exactly one validated unpaginated registry and one exact-mint market-cap page1/pageSize25; up to four preselected reward candidates. Existing parsers validate symbol ambiguity, token program, decimals, pagination, identity and provider total. Duplicated/mismatched/rejected catalog identities withhold the report; alternate sort, page, foreign URLs and extra candidate packets are rejected.
- Fixed body bounds512KiB registry/128KiB catalog/32KiB per aggregate; max four aggregate packets. Each retrieval must be no more than300s old at explicit `asOf`; Age>300/malformed, future retrieval/generation, registry/catalog generation>3h and aggregate generation>300s fail closed. Original cached dates are retained.
- V2 token/mode/quote mint/symbol/decimals must match. Only ledger basis and canonical nonnegative raw integer strings (up to78digits) qualify. Counts are safe nonnegative integers; recipient count cannot exceed payout count; positive raw requires positive payout/recipient counts. Actual last payout must match nonzero-count state and precede generation. Missing/awaiting/snapshot totals remain withheld; source errors,429/503 and cold missing packets never become zero.
- At least two candidates, **all preselected candidates eligible**, and primary generation/retrieval spreads≤60s are required for ordering. The60s gate limits observation skew; it does not create atomicity or common lifetime periods. A source failure withholds the whole ordering rather than silently ranking survivors. Independently eligible reported counters remain inspectable. Ties return all `topObservedMints`; deterministic mint ordering is a tie presentation rule, not unique leadership.
- Coverage exposes provider total, catalog inspected/uninspected, candidates selected, reads attempted, verified modes, valid payout totals, eligible count and rewards unassessed. Unknown denominators are null, never zero. `complete:false`, `atomic:false`, ecosystemLeader unknown and four unsupported return/economic outcomes null are unconditional.

Replay, without HTTP:

```bash
bash scripts/pair-reward-audit.sh > /tmp/scout-pair-reward-audit.json
# Optional argument: another owner-reviewed, bounded captured-evidence file.
```

The stored `offlineReport` must exactly match this replay in regression tests. Replaying the same original audit time is historical reproduction; using a later `asOf` correctly withholds expired evidence. No claim of current freshness is made when a reader opens this memo later.

## Safe path to stronger findings — proposal, inactive

1. Ask the provider for a documented exact `quoteMint` reward filter, reward-only count, reconciliation watermark, raw-amount sort and stable snapshot/cursor. Prefer a verified provider-side first page to crawling thousands of catalog entries. Validate ignored-filter/mixed-unit/order cases before treating it as pair scope. Even a first-page leader requires credible completeness and provider omissions disclosed.
2. If no such endpoint exists, owner review must define retention rights, deduplication keys, schema/reset handling, infrastructure budget and total coverage target first. Design an **inactive** resumable index keyed by launch mint + exact quote mint + reward mode and immutable receipt/hash. Persist page/cursor/count progress and source failures; maintain inspected/eligible/uninspected counters. Catalog can move or omit pools, so a completed page walk alone is not an atomic or universally complete catalog. Recent-launch10-minute discovery cannot backfill older launches.
3. Proposed proving cap: **≤30 requests/minute globally**, ≤2 concurrent, bounded bytes/deadlines, coalesced refresh and no burst catch-up. It is a planning cap, not activated code or a provider guarantee. Share rate budget across replicas and all SCOUT readers; honor Retry-After, pause on unsupported delays, back off503, never retry absent credential/access controls or force a rate-limit test. Cache and offline replay before repeated probing. Document approved storage/hosting costs; no new paid service or cost commitment is authorized here.
4. The current four pairs sum to28847 provider-reported all-mode pools. Even ideally packed100-token pages need **at least291 page reads** across the four scopes; per-token verification could add up to28847 reads. At30/minute, aggregate reads alone take over16hours before errors/refreshes, with a rapidly moving source. This is an estimate from dated counts, not an indexing completion guarantee or a request to run it. A fresh exhaustive hourly per-token crawl is unsuitable; pursue provider filtering/aggregate snapshots and reviewed incremental receipt evidence instead.
5. For actual24h reward *activity*, store real aligned actual boundaries and sufficient continuous observations for every compared token. Preserve existing Pair Pulse source/reset/gap/freshness/precision gates; record provider epochs and delivery-ledger completeness separately. No interpolated/backfilled missing counters. Aggregate receipt deltas remain gross distributions, not wallet earnings.
6. For quote-relative total return, separately acquire synchronized exact-asset/pool base-in-quote prices, quote benchmarks, eligible historical holdings and delivered attributable rewards, plus acquisition/disposal costs and fees. Community Mode populations and fee recipients need distinct attribution. Without these, quote-relative total return and holder ROI stay null regardless of a high lifetime counter.

Human gates: review this PR; confirm source rights and scope; separately approve schema/index design, global provider budget, costs, observed proving period and publication policy. No scheduler, collector change, credentials, activation or deployment follows automatically from this memo. Prove duplicates/resets/outages/rate pauses, stable per-mint units, ledger reconciliation and completeness counters offline before an explicitly approved limited observational pilot.

## Validation, risks and rollback

Local checks (Node20.20.2/npm11.9.0, unchanged lockfile):

| Command | Exact result |
| --- | --- |
| `npm ci` | exit0,336 packages added; existing ESLint9 deprecation warning |
| `npm test` | exit0,322 application +15 scheduler JS tests and62 Python tests; zero failures/skips |
| `npx tsc --noEmit` | exit0, no TypeScript diagnostics |
| `npm run lint` | exit0, no lint errors/warnings |
| `npm run build` | exit0,9/9 static pages generated; existing Next edge/static notice; existing homepage126kB first load |
| `bash scripts/archive-tool.sh check origin/main` | exit0, append-only/reproduction passed |
| `npm run archive:dry-run` | exit0, offline replay/idempotency/tamper checks passed; working archive unchanged |
| `bash scripts/pair-reward-audit.sh` | exit0, four genuine dated reports reproduced without HTTP |
| Final focused audit tests | exit0,64/64 passed, including exact stored-report equality and received-byte hashes |
| `git diff --check` | exit0 |

No source/coverage errors were suppressed to pass checks. npm's optional version-update notice is informational; no dependency changes were made. Remote PR checks are linked in the PR. Regression cases cover genuine four-pair replay, retained-byte hashes, market-cap/order assumptions, exact-mint/ticker collisions, raw precision/ties, small sample bias, missing/zero/awaiting totals, unsafe counters, timestamp/transport bounds, cold sources,429/503, and no implicit network or cache reset. Existing archive checks verify append-only data/reproducibility and offline replay/idempotency/tamper detection.

Residual risks: provider ledger incompleteness or changed semantics, unequal launch ages, Community Mode population differences, market-cap selection bias, nonatomic times and current licensing uncertainty. The biggest risk is removing the scope label and promoting these four reported sample counters into an ecosystem or return ranking. This PR adds no live endpoint or UI integration, so it cannot expand provider load in production.

Rollback: revert this PR's offline module/types, CLI, documentary evidence/memo and two backend runner registrations. There are no migrations, stored observation edits, allowlist changes, API replacements, credentials, workflows or production settings to roll back. Existing merged #53 comparison gates and #52 frontend keep their behavior. Stop at human review; no merge/deployment/activation is authorized.
