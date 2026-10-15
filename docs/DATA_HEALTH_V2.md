# Data Health V2 — stale reward receipts and observation gaps

Issue [#65](https://github.com/fuzzysniper/scout-stonk-intel/issues/65), Agent A, backend/ops only. Analysis cutoff **2026-10-15T02:07:59.910Z**; pinned main [`f4ea31c31ce71846e8a7b85971b702bccd24e792`](https://github.com/fuzzysniper/scout-stonk-intel/commit/f4ea31c31ce71846e8a7b85971b702bccd24e792), including merged #61, #63 and #60. This report is a dated investigation, not a present uptime claim or an executed proving experiment.

**Finding:** two independent bottlenecks remain. Recorded v2 reward responses were delivered beyond the unchanged 300-second transport limit; actual collector run creation is sparse despite successful observed collection/persistence. Fixing either alone cannot establish covered pair-relative reward flow. Exact period alignment, compatible units/precision, fresh validated sources and a suitable tracked cohort are additional requirements.

**Safe change:** an explicitly invoked, bounded **offline receipt-clock diagnostic**, plus regressions of the unchanged production gate/cache behavior. It has no active application/workflow integration, provider reads, refresh loop, writes to history or eligibility output. Zero new StonkFun requests were made. Production cache TTLs, source contracts, reward mathematics, history safeguards, allowlist, workflows, permissions, credentials, Cloudflare and archive state remain unchanged. Agent B's frontend/dossier/sharing scope is untouched.

Evidence: [complete dated operational report](evidence/data-health-v2-2026-10-15.json), [normalized receipt input](evidence/reward-source-receipts-2026-10-15.json), [offline clock output](evidence/reward-source-clocks-2026-10-15.json). The operational report preserves run/job/step times, commit/parent links, exact snapshot hashes and real per-token observation/provider times. No raw credentials, signed log URLs, wallet data or invented observations are added.

## 1. What the stale packets establish

Exact official endpoint, unchanged across the three recorded requests:

`https://www.stonkfun.xyz/api/v2/tokens/DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP/rewards`

Source: committed [reward evidence capture](evidence/reward-evidence-2026-10-15.json), pointers `directPythonAggregate`, `directNodeAggregate`, `nextAggregate`. These are real **earlier** requests, replayed offline here. Body SHA-256 was independently recomputed from each recorded body and matches:

`30cb652d069374ad5159997b9e93ff1b09bc5c69485d9909ad201e5fe867ec6c`

All three had HTTP 200, 398 bytes, JSON content type, the same SI token/verified NVDAX quote mint, provider `generatedAt=2026-10-15T00:10:53.901Z`, and HTTP `Date: Thu, 15 Oct 2026 00:10:53 GMT`.

| Capture/runtime | Actual receipt UTC | HTTP Age | Generation age at receipt | Transport result |
| --- | --- | ---: | ---: | --- |
| Python, outside app | 00:12:06.896490 | 73s | 72.995s at ms precision | Not rejected by recorded Age |
| Node, outside app | 00:14:52.999 | 239s | 239.098s | Not rejected by recorded Age |
| Next fetch | 00:17:04.853 | 371s | 370.952s | Rejected, unchanged `>300` rule |

The Python capture records `Cache-Control: public, max-age=60`, `X-RateLimit-Limit: 240`, `X-RateLimit-Remaining: 239`. Later captures retained only selected headers; absence from those records is **not proof** that the origin omitted Cache-Control, ETag, Last-Modified, cache-status or request IDs. The Next request started 00:17:04.715 and completed 00:17:04.852; its HTTP request latency was about 0.137s, not a six-minute wait. The saved receipt capture was one millisecond later.

This demonstrates the same aged response **outside SCOUT's app cache**, with Age and Date broadly corroborating the generation clock. It does not identify the stale-serving layer: the requests used the managed cloud egress path, and no independent network path/CDN status/conditional revalidation trace is recorded. Provider CDN, intermediate cache/proxy, revalidation policy and stale-response extensions are unresolved. Seeing Age exceed a recorded max-age identifies a freshness question; it alone does not prove a particular cache violated HTTP rules. No claim that current provider freshness is still 371 seconds is made.

The recorded diagnostic burst (`diagnosticObservations`) made 12 mode reads: **11 HTTP 200 rejected as `stale_transport` (Age 370–371), one HTTP 404**. Thus 11/12 (91.7%) stale-transport rejections, 1/12 (8.3%) HTTP-not-found and 0/12 usable mode reads in **that bounded NVDAX burst**. This is not a statistically independent service failure-rate estimate, or evidence of provider errors during absent collector runs. The initial uninstrumented API failure causes remain unknown; the later burst does not retroactively diagnose them.

Later main QA at **2026-10-15T01:09:47Z** records a real NVDAX scoped discovery: two pages/50 tokens, 12 mode checks, zero mode-verified tokens, provider-reported universe 7,663 all-mode live platform pools. It retains partial/non-atomic coverage warnings. Its browser widths reuse the same response and are not three independent provider samples. Those responses do not record the failed mode-read headers, so this report does not assign them the earlier 370–371-second cause.

## 2. The clocks and gates must remain separate

| Clock/policy | Current behavior | What it does not establish |
| --- | --- | --- |
| Official `Age` / nonstandard `Source-Age` at GET receipt | Missing accepted by existing reader; malformed or integer >300 rejected. Exactly 300 remains accepted | New source generation, complete payouts or a guaranteed CDN refresh |
| Provider `generatedAt` in registry/catalog/mode receipt | Existing source reader allows up to 3h, rejects invalid/far-future time | A payout observation/reconciliation watermark |
| Pair source per-instance cache | 300s; concurrent refresh coalesced; GET `cache:'no-store'`, no redirects | Origin revalidation: a fetch cache option is not proof a CDN/proxy honored a refresh |
| Reward evidence receipt retrieval age | Recomputed against actual `fetchedAt`; >300s withheld | A changed body or new observation |
| Lifetime generation age | Independently >300s withheld in reward evidence | Holder returns, equal launch ages, interval flow |
| Legacy collector v1 generation age | Up to 3h, future tolerance 60s; unchanged | Acceptance by the stricter v2 transport/lifetime gates |
| Historical observation age / gaps | Latest ≤3h; gaps constrained by existing 2h safeguards | Covered two-day periods merely because the latest point is fresh |
| Pair Pulse alignment | Exact observation boundaries and provider durations; zero cross-token period tolerance | A canonical scheduler slot can replace an actual observation time |

Code: [pair source](../lib/pairs-source.ts), [reward evidence](../lib/reward-evidence.ts), [Pair Pulse](../lib/pair-pulse.ts), [history](../lib/history.ts), [Signal Lab](../lib/signals.ts), [collector](../scripts/collect_rewards.py). These files are inspected, **not modified**.

An initial degraded pair snapshot is retained for the normal five-minute cache interval. Although failure handling records a 60-second backoff, the cached-entry branch precedes it: calling again at +60s does **not** re-run failed mode checks. The new regression verifies no extra requests at +59/+60/+299s and ordinary refresh/recovery at +300s with synthetic sources. This explains persistence of partial availability within a warm instance, not the original stale upstream packet. It also avoids retry storms; changing it could increase provider requests and is not justified here.

A received Age 239 packet has at most 61s of the recorded 300s transport budget left; if provider age is also about 239s, lifetime visibility expires similarly. Keeping bytes 300s cannot renew their generation clock. The offline diagnostic shows that remaining visibility budget and subsequent residence, **not financial eligibility**. It is a lower-bound age analysis, not the full RFC corrected-age algorithm. No production threshold or TTL is changed; existing lifetime gates already reevaluate source generation age.

## 3. Actual Actions execution and Git persistence

Read-only GitHub operational capture: **17 metadata GETs** (workflow, complete run listing, snapshot commit listing, 13 job listings, daily-audit run listing). No dispatch, log-download credential handling or settings modification. The collector run API returned **13/13 listed runs**, all attempt 1 and successful: 11 schedule, two earlier manual. Completeness is of the available listing; historical deletion cannot be excluded.

Workflow is active; cron remains `17 * * * *`, introduced Oct 12 15:42:15 UTC. Latest workflow content revision is `2aff890` (opt-in shared gate). Recent jobs show the shared gate **skipped**, consistent with inactive integration. This is run evidence, not a read of secret values or a claim about undisclosed account settings.

| Window ending at cutoff | Mature nominal hourly slots | Listed scheduled creations | Mature buckets without creation |
| --- | ---: | ---: | ---: |
| Trailing 24h | 24 | 6 | 18 (75.0%) |
| Trailing 48h | 48 | 10 | 38 (79.2%) |
| Since workflow introduction | 58 | 11 | 47 (81.0%) |

Buckets associate creation with the nearest prior minute-17 boundary. They are **not intended-event attribution**, proof of a counted number of dropped jobs, or evidence of a provider/commit attempt in the unlisted hours. Queueing after listed creation was only **2–3 seconds**; jobs lasted **5–13 seconds**. GitHub's internal reason for sparse/late schedule emission is still unverified. Existing quota/default-branch/settings/service investigation is an owner decision. Moving an already off-hour cron minute or adding provider retries cannot repair absent execution.

| Run ID / event | Created UTC | Real newly recorded UTC | Dataset commit |
| --- | --- | --- | --- |
| [38666358430](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38666358430), schedule | Oct 15 01:34:09 | 01:34:16 | `93b1769e56b296c13f9f4d78a8971b5259a1df79` |
| [38653023256](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38653023256), schedule | Oct 14 23:16:10 | 23:16:18–19 | `49ab560dde396d302f62dd21c7897379cccec75d` |
| [38623893058](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38623893058), schedule | Oct 14 19:27:58 | 19:28:05–06 | `d77ba9299cd8b03701b01b4dff19877ff18e0d88` |
| [38587535589](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38587535589), schedule | Oct 14 15:14:08 | 15:14:15–16 | `70bd6ca56e12efec51d821dc0726e88390cba020` |
| [38548406157](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38548406157), schedule | Oct 14 10:16:28 | 10:16:36–37 | `aa82c21cf09c1ee0d5477445171af34f3bd1395a` |
| [38514153980](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38514153980), schedule | Oct 14 04:58:19 | 04:58:26–27 | `cf4fb16b4d5804e38d18a10452e78746c26b126d` |
| [38486060353](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38486060353), schedule | Oct 13 23:44:28 | 23:44:36–37 | `219c6a46540470677762426f2f8d0aa1759d59e1` |
| [38453921067](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38453921067), schedule | Oct 13 19:19:27 | 19:19:34–35 | `f6fb803ede1a4bc55309113ad2c1718f320783ef` |
| [38393086625](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38393086625), schedule | Oct 13 11:51:10 | 11:51:17–18 | `fdce3c1d95e1d4cf1d78ddf5c56aab6c5dcc4e1a` |
| [38342446125](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38342446125), schedule | Oct 13 03:35:41 | 03:35:49–51 | `9d458ffc943dfbda584743f5da8f93e5e984e132` |
| [38319900484](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38319900484), schedule | Oct 12 23:01:12 | 23:01:18–19 | `b4ad30fb49226b2de86fef5ce30b7acc70018857` |
| [38304889111](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38304889111), manual | Oct 12 20:32:28 | 20:32:33, KNOTS only | `027ab3eb95acce515beb79dc74e5764036384759` |
| [38272331847](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38272331847), manual | Oct 12 15:43:36 | 15:43:41, KNOTS only | `804c6ee7d882c52fd334c2df3f3f132a9a9c2dff` |

Every matched data commit is reachable from pinned main, its actual parent matches that run's head SHA, and its diff appends genuine points without changing existing observations. All collection/persistence steps succeeded. Ten instrumented runs have matching summaries/hashes: **70 collected, zero failed, zero skipped**. Earlier three runs lack the newer summaries; their successful steps and actual additions are reported without invented per-attempt failure telemetry. There is **no observed commit/push failure or provider-error explanation for the absent runs**. Provider behavior during hours with no attempted execution remains unknown.

Pinned snapshot SHA-256: `d9b2dc915f5802903c3d2ef15d2ef8d31ffc6d95e268954e1505c6e2f574579c`, matches latest summary. **86 real observations** remain intact. Seven genuine feature-branch observations entered through `47bdc17` at Oct 12 20:59:15; they are not another scheduled run. Git ancestry/hash proof is stronger than a green step alone, but does not independently verify propagation through deployed app/raw-source caches; no deployed host was fetched here.

The daily audit shares GitHub scheduling and collector concurrency. Latest run [38568972261](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38568972261) was created Oct 14 **13:05:48**, over five hours after its nominal **07:43** clock; its artifact checkedAt is 13:05:59 and still references the then-current `aa82c21`. Prior [38420708084](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38420708084) began Oct 13 15:16:59. Neither created time overlaps a listed collector execution. A monitor on the same irregular emitter cannot guarantee detection of emitter gaps. At this cutoff the audit is still within its 26h overdue policy; it must not be called current snapshot-persistence proof for the newer data commit.

## 4. Why historical and pair-relative flow is withheld

All seven tokens have recent newest observations at Oct 15 01:34:16, but their immediately preceding gaps are **8,277–8,278s** (2h17m57–58s), exceeding 7,200s. Maximum stored gaps remain **29,727–29,728s** (about 8h15m). The unchanged `calculateSignals` run, using actual pinned bytes at the report cutoff, withholds all seven with `gapped_current_history`, `unmatched_duration`, `gapped_previous_history` and null figures. Its current actual durations are **92,979–92,980s**, not 86,400s; current/previous maximum gaps are about 19,090–19,091s / 29,727–29,728s. A fresh fetch/new commit does not close those earlier holes, and zero change in a cumulative counter does not prove complete payout coverage.

Four exact quote universes, as verified in the **Oct 14 22:34:25 dated audit**, not a new ecosystem scan:

| Quote / exact mint | Dated all-mode universe / catalog sample | Dated reward receipts | Current tracked history |
| --- | --- | --- | --- |
| NVDAX `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | 7,663 / 25 | 4/4 mode/ledger reads verified then | SI only, 12 points; no second tracked comparator |
| GLDX `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | 1,910 / 25 | 4/4 verified then | No tracked mint/history |
| SPCXX `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` | 8,656 / 25 | 4/4 verified then | No tracked mint/history |
| Canonical STONK `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx` | 10,618 / 25 | 4/4 verified then | KNOTS only, 14 points; no second tracked comparator |

These totals cover **all modes**, not an enumerated reward universe. The old audit is non-atomic, market-cap-selected, and does not establish current freshness, an ecosystem leader or comparable interval returns. Only NVDAX has the later 370–371s burst; present stale-response rates for GLDX/SPCXX/STONK are **not measured**. STONK is symbol-ambiguous: use the exact mint, never another same-ticker identity.

Pair Pulse is intentionally stricter than a sampled lifetime comparison. Before any relative flow outcome, both candidates must be verified reward tokens in the same exact mint unit, with compatible tracked identities/pools, fresh matching catalog/registry/history revisions, non-degraded sources, valid precise counters and actual observations on all three common boundaries `end−48h`, `end−24h`, `end`. Both provider-generation periods must also be exactly 86,400s; sequences strictly increase with provider gaps **<2h**. Cross-token actual-period tolerance is zero. A partial catalog can allow separately labeled mode/lifetime evidence but still withhold intervals.

**Hourly reliability is necessary, not sufficient.** Real sequential requests and irregular cache generation need not land exactly on those boundaries or produce matching provider periods—even if 48 hourly jobs all succeed. Current source `generatedAt` is not an authoritative payout cutoff/watermark. Never rewrite observation timestamps to scheduler slots, normalize different periods into “24h,” interpolate missing counters or widen tolerance to make a pilot pass. A new method/source contract would require separate review; this PR does not implement one.

For KNOTS, current legacy float counters scaled to canonical STONK's nine decimals exceed `Number.MAX_SAFE_INTEGER` atomic precision. Pair Pulse must withhold that path independently of scheduling. Earlier quote-identity changes/missing metadata remain preserved; they are barriers where they enter a comparison window. The v2 ledger can report an exact raw integer, but silently splicing it into the legacy cumulative series would mix basis/units/coverage and is not a safe repair.

Aggregate distributed rewards, provider-reported snapshots and covered counter changes remain distinct. No individual holder entitlement, purchase cost, valuation, realized cashflows or fees are recorded; holder ROI/APY and market-trend/economic-leadership conclusions remain unavailable.

## 5. Smallest safe path and owner decisions

**Now:** merge no operational change automatically. Review the offline diagnostic/report and keep existing gates/traffic/activation unchanged. There is no evidence-supported production reliability fix that can be activated safely within this scope. The helper makes recorded clock diagnosis reproducible; it does not improve scheduler delivery or force fresh provider generation.

| Human decision | Concrete bounded next step after separate approval | Stop condition / success evidence |
| --- | --- | --- |
| Provider cache investigation and request budget | Owner obtains clarification on CDN freshness/revalidation and permitted cache headers. Authorize at most **six serial GETs to the single SI v2 reward URL over ≥10 minutes**, minimum 60s spacing, from approved paths. Record normal request control, then a documented revalidation alternative **replacing**, not adding to, a scheduled request. Capture UTC start/receipt, Date/Age/Source-Age, Cache-Control/stale extensions, cache-status/request ID, ETag/Last-Modified if supplied, HTTP status/Retry-After, exact body hash/generation/identity | Any 429: stop this experiment and honor full Retry-After; unsupported delay remains unknown. Stop on redirect/auth/rate/rights uncertainty. A new fetch time/304/Age reset alone is insufficient: unchanged generation/old body remains subject to every gate. No nonce/query cache busting, alternate undocumented endpoint, key or crawler |
| Conditional read support | Only if the provider documents/proves ETag/Last-Modified behavior, use conditional headers on an **already authorized** read. A 304 must retain body hash and provider time, and validate its freshness metadata/identity; never fabricate a new generation time | Current captures do not establish validator support. No conditional mode is implemented or enabled here |
| Collector delivery | Owner inspects Actions/default branch/service/quota settings read-only first; selects native-only observation or separately approves the existing ADR 0001/0002 external pilot and shared claim-before-collect gate | Cloudflare/App staging remains inactive. Separate authorization for any account changes, secrets, deployment, permissions, gate/cron activation or dispatch. Repository-only App, authenticated run identity, confirmed Git CAS, duplicate/failure recovery and budget gates remain mandatory |
| Cohort, raw counters and time contract | Approve a small exact-mint curated cohort and a versioned raw-integer ledger observation/source-watermark design. Two candidates per selected quote are needed; current allowlist has seven of ten allowed slots, so four complete pairs cannot simply be appended without scope/cost review | Preserve all old bytes/allowlist until reviewed; do not splice v1 floats into v2 raw-ledger history, truncate history, relabel timestamps or widen the strict gates. Provider cutoff/period semantics must be verifiable |
| Evidence visibility versus refresh cadence | Evaluate shortening **visibility**, not blindly shortening refresh TTL; preserve the current request budget, coalescing and global cooldown. Future jitter/backoff should affect only approved request timing and never rewrite actual observed times | Expiring visibility can safely withhold stale data; an earlier refetch increases origin load and needs explicit approval. No automatic retry changes here |

Dated [official developer excerpt](evidence/pair-reward-audit-2026-10-14.json) says v1 reads 300/IP/min, most v2 reads 240/IP/min (whole-history exceptions 30), cached hits do not consume origin quota, and 429 adds Retry-After. These are dated statements, **not a granted research budget** or assurance about shared-IP headroom. Cache revalidation can turn a free hit into origin work. The original snapshot request limits remain: ≤15 fixed-source GETs per refresh (registry + at most two pages + 12 mode checks), three concurrent mode reads, ten-second total deadline, five-minute per-instance cache, bounded scoped caches and provider cooldown. Cold instances multiply load. Never introduce more requests or live credentials without review.

## 6. 48-hour proving plan — not activated or started

Choose a UTC start/end and an owner responsible for stop/go **after separate operational authorization**. Native-only observation is possible without activation but must be reported as such; a Cloudflare pilot requires every prior security/budget gate. Store an owner-held immutable export independent of GitHub/Cloudflare, containing **all 48 canonical opportunities**, not selected successes. No backfilled samples or replay of missed slots.

1. **Before T0:** pin workflow/code/data revisions and exact approved cohort; declare the request budget and clock/source semantics. Confirm monitoring export, cache/header capture on existing authorized reads, rollback owner, and whether delivery-only testing or research-eligibility testing is possible. Record the genuine initial observation—do not fabricate a T0 boundary. Keep archive publication off.
2. **Each slot:** record intended slot where actually known (external receipt), native/manual/external event, immutable claim/attempt, actual run ID/attempt/actor/create/job/collect times, duplicate decision, per-mint result/reason and actual provider/observation times. Join summary candidate hash to accepted remote data SHA/parent and all actual additions. Missing creation, partial provider success and failed push are separate states. Never resubmit an ambiguous dispatch as a retry experiment.
3. **At +6/+12/+24/+36/+48h:** inspect complete bounded Actions listings and retained artifacts, preserving pagination/completeness and missing evidence. Recompute real per-token gaps and all existing eligibility gates against original timestamps/bytes. Verify served data revision after the existing cache interval through an owner-approved deployed-host read; a build or green job alone is not propagation proof.
4. **Delivery/reliability pass:** apply existing ADR pilot gates: ≥47/48 jobs created within 15m when intended slots are authenticated; no unintended duplicate collection, no unresolved claim/dispatch/push conflict, exact committed/served hash agreement, all failed/partial tokens attributable, max real observation gap ≤2h and latest observation age ≤3h. Report the complete denominators; native creation buckets alone cannot prove intended-slot lateness. Also record cache-age/source-generation distributions and every 300s rejection; no “acceptable stale percentage” override.
5. **Research pass is separate:** at least two approved same-mint candidates, both fresh verified modes, non-degraded validated catalog/history, precise compatible counters, both real current/previous 24h periods passing all gap/reset/identity gates, all three exact observation boundaries, exact provider durations, and cross-token alignment. Two contiguous periods usually require 49 genuine boundary observations; **49 points or 48 elapsed hours do not guarantee eligibility**. If any condition fails, preserve `withheld` and identify the exact missing contract/data. Seven-day coverage needs its own longer proving window. No ROI/ranking/economic-leader claim follows from operational success.
6. **Stop immediately** on auth/scope drift, duplicate, unresolved acceptance/persistence conflict, unsupported rate delay, provider rights concern, clock/identity corruption, quota/spend risk or evidence tampering. An approved pilot rollback first disables external activation/cron, preserves receipts and genuine history, then follows the owner-approved App/token/resource process. Do not perform that operational rollback without authorization or erase evidence to make it pass.

## 7. Offline tool, tests, limits and rollback

```sh
bash scripts/reward-source-diagnostics.sh docs/evidence/reward-source-receipts-2026-10-15.json
```

Input: `{asOf, receipts}`; at most 48 receipts and 2 MiB file bytes. A receipt has fixed official v2 reward `source`, `receivedAt`, nullable `providerGeneratedAt`, recorded headers, body SHA-256 and optional request-start clock. Dates are calendar-valid canonical UTC at millisecond precision; original Python microsecond captures remain in the source evidence and are explicitly normalized for this input. The diagnostic does **not** validate the body/ledger, whole HTTP response, conditional semantics or financial comparability. Its `eligibility` is always `not_evaluated`.

Output keeps reported/missing/invalid header states separate; records source-generation and retrieval residence, Date clock, recorded advertised TTL and a known remaining visibility budget. Missing data remains null. The lower-bound transport age is not RFC corrected age. Conditional-validator presence means only **recorded**, not supported. Unknown fields/header values are not echoed, arbitrary sources/queries are rejected, errors are sanitized. The command reads the explicitly supplied file, prints JSON, and only builds in a disposable directory; it cannot fetch, dispatch, persist data or activate a service. It is not imported by any app route or workflow.

Ten new regressions cover exact 300/301 and 370/371 boundaries, malformed/missing Age/Source-Age, generation versus receipt clocks, future/unknown time, sanitized identities/header values, batch/file bounds, actual committed body-hash/clock replay, unchanged real production pair-source rejection, degraded-cache request coalescing/recovery and the CLI. Fixtures are offline and explicitly synthetic. Replay reads existing documentary packets without network. No frontend/backend financial tests were rewritten to weaken assertions.

Checks on Node 20.20.2/npm 11.9.0: `npm ci` exit 0 (336 packages); `npm test` exit 0 (**431 application JS + 62 Python + 15 scheduler tests**, no failures/skips); `npx tsc --noEmit`, `npm run lint`, `npm run build`, `bash scripts/archive-tool.sh check origin/main`, `npm run archive:dry-run` all exit 0. The CLI above exits 0 and its saved output is reproducible. Existing ESLint deprecation and edge-runtime static-generation warnings remain. No dependency/workflow/runtime upgrade is included. Browser/screenshots are unnecessary for this inactive ops-only change; no app/server was started that could add provider requests.

Risks/limits: dated incomplete header capture cannot attribute a cache layer or prove present source health; full available run listings do not exclude deleted runs; summaries and Git commits are not payout reconciliation or served-host proof. The helper trusts supplied recorded metadata and diagnoses clocks only, not signatures or production eligibility. Its constants are diagnostic descriptions, with real-source regression coverage; they do not configure production. No 48h pilot or conditional-read experiment occurred.

Rollback: revert only this new diagnostic, its CLI/tests/test-runner registration and documentation/evidence through a reviewed PR. No live path depends on it. Preserve all subsequent real observations, historical safeguards, allowlist, archives, workflows, credentials and inactive scheduler state. No migration, data rewrite, activation change, force push or secret handling is needed. **Stop at human review; no merge or deployment.**
