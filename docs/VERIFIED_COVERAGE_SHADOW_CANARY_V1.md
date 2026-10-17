# Two-token shadow canary V1 — offline rehearsal, live NO-GO

Issue [#85](https://github.com/fuzzysniper/scout-stonk-intel/issues/85), from main `69760f9` including merged #82/#83/#79. **Proposed owner cohort; not approved. Current eligibility: UNVERIFIED. Rights: NO-GO.** No new provider read, live observation, active enrollment, credential, workflow, security/Cloudflare setting, schedule, deployment command or trade occurs. Agent A owns infrastructure/cadence; this change owns coverage research and offline tests only.

## Why these two subjects, and why they cannot be collected today

[The proposed cohort](../research/shadow-canary-v1.json) chooses two additional subjects already independently matched in #82's pinned catalog and October 14 registry/catalog/primary aggregate receipts. Selection uses source integrity and two exact quote units, **not token performance**. Both use provider-reported 8-decimal Token-2022 quote units; no equity/metal ownership, redemption or economic equivalence follows from their names.

| Subject | Exact token mint | Exact quote mint | Original aggregate capture UTC |
| --- | --- | --- | --- |
| GP / GLDX | `HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ` | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | `2026-10-14T22:34:11.763783+00:00` |
| GROK / SPCXX | `6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8` | `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` | `2026-10-14T22:34:17.512424+00:00` |

The full metadata catalog revision is `sha256:7334efa7ccaaa8cf54d0eeb864cc407a0a4ca419dca92f94cab47467c957f7c6`; the existing retained source document revision is `sha256:4ff3c223122ca1479bade0e09889aa4837803cab137c26a9e714999a2ea0b50d`, original commit `df4e87658c5dd64fef9461d174333d824c8b1c7c`. Old source strings, hashes, microseconds and quote units remain unchanged. This selects five existing packets for replay; it does not fetch them or backfill a new observation date.

Four independent blockers remain:

1. **Freshness.** These receipts are historical. Current-time evaluation withholds both. They establish neither today's reward mode nor today's source availability, quote configuration or publication eligibility.
2. **Rights.** [Historical Research #75](HISTORICAL_RESEARCH.md#rights-and-retention-decision--blocked-not-inferred) and [#82 coverage](VERIFIED_COVERAGE_V1.md) leave expanded acquisition/retention, redistribution and commercial/public financial rights unverified. Accessibility, attribution, a hash or a local approval flag cannot confer them.
3. **Schema/persistence.** The live [seven-token collector](../scripts/collect_rewards.py) reads V1 numeric `distributedTokens` with exact token/quote identity and a three-hour source-age gate, retaining up to 193 points/token. It has capacity for ten mints, but no consumer for these exact raw V2 ledger records. Adding two entries is not a safe schema migration. Never round raw integers into V1 history or import the rehearsal into a live store.
4. **Operations.** [Merged #83 cadence evidence](COLLECTION_CADENCE_V1.md) and [C2](STAGE_C2_AUTH_PROOF.md) remain separate NO-GO boundaries. No shared live admission, private sink, current token permissions, hosted persistence or reliable canary cadence is proven here. The latest main summary references run `39002962311`, seven results and dataset revision `sha256:f03f562aa9c21da17b7726dd7eba9c67ee0ee9e753c19968b50472a031131da6`; that is existing V1 history, not a new two-token shadow run.

## Implemented offline acceptance

[coverage_shadow_canary.py](../scripts/coverage_shadow_canary.py) reuses #82's pure validator and exact raw precision. Default `opt_in=False` is inactive before inputs are inspected; opt-in allows **offline rehearsal only**. The cohort must exactly retain disabled activation, proposed owner selection, unverified current eligibility/rights, fixed membership and limits. Changing those to `approved`/`allowed`, adding a permission flag, changing a quote/mint/program or exceeding a budget fails closed. There is no live approval mechanism or environment toggle.

One registry + one exact-mint market-cap catalog per quote + one primary V2 aggregate per token must all pass together. Preserve no-future clocks, capture/Age ≤300s, registry/catalog generation ≤3h, primary ledger generation ≤300s, exact mode/mint/quote/decimals/program and independent registry ambiguity validation. Missing/zero, HTTP/JSON/body bounds, partial/ignored-filter detection and source errors reuse #82's strict gates. Both tokens must yield a valid ledger observation; an unavailable subject cannot be silently replaced by a third candidate or omitted from the cohort.

Ledger raw integers stay exact; rounded companion amounts and separate base-asset aggregates are ignored. Settings, provider-reported lifetime distributions, actual covered flow and holder returns are distinct. These are token-wide **provider aggregates**, not chain-validated transfers or pool allocations. No holder-address extraction, payout crawl, ranking, recent rate or ROI exists here. Partial sample coverage and non-atomic sources remain explicit.

The local configuration fingerprint includes exact base/quote identities, decimals, quote program, provider pool context, reward mode and ledger basis. It is **not a verified provider/onchain epoch**: `providerEpoch=null` and `providerEpochVerified=false`. It cannot detect an unobserved configuration change and reversal between captures, establish historical holder entitlement or justify a covered economic period. Observed identity/epoch drift, changed mode/units, counter decrease/reset or conflicting/repeated source clocks stops the batch; no epoch is reset or bridged automatically.

## Versioned persistence rehearsal

The `scout_shadow_canary_v1` envelope explicitly says `evidenceUse=offline_retained_capture_rehearsal`. It wraps #82's `candidate_quote_ledger_v1` store with the reviewed cohort/catalog revisions, local configuration fingerprints, generation and previous exact dataset hash. Generation zero is empty; generation one contains **one original retained observation per token**. No synthetic positive time series is created. Each record retains all three sources' hashes/clocks, original capture and provider generation, exact unit/raw counter and record hash internally.

All-or-nothing admission: either two new source snapshots produce the next version or no version is produced. Both unchanged cached snapshots are idempotent; a mixed new/cached batch, reset or one-source failure withholds the batch and preserves previous bytes. Failed-attempt metadata must be retained separately after future approval; it is not an invented zero observation.

Each private generation has three files:

| File | Exact verification |
| --- | --- |
| `dataset.json` | Bounded versioned envelope, only the two exact token histories, immutable previous records, strict chronology/configuration/precision, cohort revision and previous dataset hash |
| `summary.json` | Exact outer dataset hash plus #82's independent inner-history byte-hash/accepted-record check. Both accepted IDs, receipt revisions and capture/provider times must match the latest records |
| `manifest.json` | Canonical bytes bind generation, cohort, exact dataset hash, exact summary hash and previous dataset hash; mutable pointer binds this manifest's received bytes |

The matching summary's `startedAt`/`finishedAt` are explicitly the **original retained-source window**, not a newly executed collection run. The selected five originals span `2026-10-14T22:33:17.185179+00:00` to `2026-10-14T22:34:17.512424+00:00`; original observations fall within that ≤90s window. Report evaluation time is separate and never becomes an observation timestamp.

[coverage_shadow_rehearsal.py](../scripts/coverage_shadow_rehearsal.py) is the only new filesystem adapter. It creates its own unpredictable mode-0700 directory under **`/tmp`**, writes mode-0600 files without following symlinks, flushes/fsyncs files, rereads and verifies them before selecting a generation. No output directory/URL argument or repository destination is accepted. It verifies the bounded parent chain, advances a temporary pointer, confirms duplicate replay, selects the old empty generation and restores generation one while retaining both immutable versions. The entire directory is removed in `finally`, including failures. Raw/financial-containing byte fields have suppressed representations; stdout exposes only fixed metadata, hashes, dates, null financial fields and NO-GO decisions.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m scripts.coverage_shadow_rehearsal --offline-rehearsal
```

This proves local process-level write/readback/rollback behavior only. It does not prove live provider identity, a production transaction/lock, remote commit, served API revision, power-loss durability or a trusted external hash anchor. Hashes detect byte substitution relative to a trusted parent/pointer; they are not signatures or protection against an administrator replacing every artifact. The future sink needs its own owner-approved transactional/CAS, fsync/durability, recovery and permission proof. A version written before an uncertain pointer update is preserved; no automatic replay, overwrite or source reread is authorized by that uncertainty.

## Exact budgets and retention decisions

| Boundary | Required bound |
| --- | --- |
| Selection | Exactly GP and GROK's reviewed token/quote tuples; no ticker resolution, automatic enrollment or third-token fallback |
| Source reads | **Five/run total**: one shared registry, one catalog and one primary aggregate per token (two incremental reads/token). No pagination/holder/price/RPC calls. Existing seven V1 reads are a separate budget: combined minimum is 12, before other SCOUT traffic |
| Source bytes | Registry ≤512KiB; catalog ≤128KiB each; aggregate ≤32KiB each; ≤**832KiB/run**. Fixed retained document read ≤1MiB; cohort ≤16KiB; catalog ≤32KiB |
| Proposed future transport | Sequential/concurrency one; ≥2s between starts; ≤3s/request and ≤90s/run; no retry, redirects, catch-up or paid fallback. At most 30 reads/minute **across all SCOUT consumers/replicas**, subject to provider's current verified terms/headroom. Shared admission and actual timeout enforcement are not implemented by this offline layer |
| Per-token snapshots | ≤73 points/token, each ≤2KiB; ≤72h between first and last accepted capture. Counter/token clocks are real source captures, never nominal slot times |
| Versions and bytes | Empty baseline + at most 73 accepted paired versions = **74 immutable generations**. Dataset ≤512KiB; summary ≤16KiB; manifest/pointer ≤4KiB; entire private directory ≤**40MiB**, including incomplete/failure files. Admission must reserve space before a future source read |
| Time/rights | Proposed acquisition window ≤72h. Ask permission for private audit retention no longer than seven days after window end (or a narrower provider requirement). This time-based live retention/expiry policy is not implemented or approved; owner must agree deletion/correction obligations first. Rehearsal artifacts last only for the temporary process |
| Stop | Any cap, unknown source/grant/headroom, expiry, stale source, reset/configuration drift or uncertain write stops acquisition. Never evict/purge old versions, enlarge limits, renew grants or rewrite past points automatically |

The historical guide reported v1 300/minute/IP and ordinary v2 240/minute/IP. These are **dated evidence**, not current entitlement or headroom. Five read descriptors are a bounded plan, not actual requests or an implemented distributed limiter. 73 points do not automatically mean continuous three-day coverage.

## Separate approvals: seven → two shadow → nine active

All boxes remain unchecked. Code review/merge is not any later authorization.

- [ ] **Rights decision:** dated provider/current-terms evidence, exact fields/purposes and written allowed read/retention/public-metadata scope; explicit financial/raw/commercial restrictions, duration, attribution, correction/deletion and expiry/revocation. Keep unknown/denied fields blocked. No dummy consent record or `approved:true` substitution.
- [ ] **Cohort decision:** owner records exact two tuples, reason (integrity/diversity), reviewed commit/cohort hash, UTC window and named operator. Confirm these remain outside the seven-token active file.
- [ ] **Infrastructure decision:** Agent A/owner approve the exact source-only transport, global admission, private storage permissions/CAS/durability/receipts, operational cost, cadence and alerts. Resolve their existing workflow/security/hosted gates separately; do not alter them through a coverage PR.
- [ ] **One recertification:** separately approve one bounded five-GET read-only source check after rights. Confirm source mode/unit/identity/current clocks with original byte hashes. A stale, ignored-filter, missing-within-sample, non-ledger, 429/503 or uncertain result is NO-GO; do not crawl further pages or retry until separately reviewed. This has not run.
- [ ] **Private shadow proving:** separately approve an initially empty **fresh-capture** store and a 48h proving window, expected 49 hourly opportunities, within the 72h/73-point/40MiB limits. Retained rehearsal frames must not seed it. No active allowlist change, public figures or new flow/ROI labels. Every intended opportunity must have a paired valid capture, immutable revision, matching summary and verified private readback; observed provider generations must advance. Unknown attempt evidence is not a successful slot.
- [ ] **Promotion review:** require at least one complete real 48h proving window with all 49 intended opportunities verified and no unresolved resets/drift/rights/hash/rate incidents. Source gaps or boundary misalignment still withhold comparison/flow; counts alone are insufficient. An incomplete window remains incomplete; a replacement window requires a recorded decision without purging old evidence.
- [ ] **Seven → nine implementation:** separate reviewed collector/schema/consumer PR with current V1 compatibility evidence or an explicitly versioned V2 consumer. Keep the existing cap ten and the original seven histories unchanged. Financial publication and covered-flow methods require their own permission/evidence review; no automatic promotion follows shadow success.

Missed-slot/stop contract for that future approved window: record actual intended opportunity and UTC grace in the private attempt journal, not an inferred schedule from receipt times. Warn after 15 minutes past an unfulfilled intended hour; flag degraded if no paired persisted observation for **75 minutes**, and pause the canary at **120 minutes** without one (or immediately on source/right/epoch/hash/cap incidents). Do not dispatch an alert or add a schedule here. A green job, fetched-but-unpersisted value or unchanged cached body does not clear the warning. Unknown/unstarted evidence stays unknown, not zero missed slots. Record failures and source/capture ages; never burst-replay missed hours or relabel a future capture as a past slot. This cadence contract does not change Agent A's collector or existing Pulse gap policy.

## Inert, separately reviewed collector proposal

[The unapplied patch](../research/proposals/shadow-canary-collector-v1.patch) proposes only a new `scripts/coverage_shadow_collect.py` entry, which **does not exist in this PR's active tree**. Its literal `ACTIVE=False`, absent CLI and missing trusted adapters prevent reads. Tests apply the text only in a temporary tree, then exercise disabled/unapproved/stale/rate-failure cases with offline mock receipts. Nothing applies it automatically.

For a later review, it names a distinct **`scout_authorized_shadow_v1`** schema and private key `shadow-canary/v1`. This must never share the rehearsal's `scout_shadow_canary_v1` kind or active V1 dataset. The future trusted `authorize` adapter must verify actual owner/source-rights decisions, exact cohort/code/schema, approved UTC window, current private parent/epoch/capacity, expiry, remaining per-token/total/shared-IP allowance and stop state **before** issuing a scoped read grant. No verifier, transport or production sink is implemented here. Ordinary caller objects/flags are not proof of authorization; there is no public endpoint accepting them.

The proposal uses only the five fixed GET descriptors, passes deadline/byte/spacing/no-retry requirements to a future trusted reader, stops on any non-200/unknown outcome, validates both rows, and passes private facts to a future CAS sink. That sink must implement the versioned parent/summary/readback/retention protocol above, bind a separate trusted manifest anchor, return only a sanitized outcome and refuse repository/public destinations. An uncertain write means inspect/reconcile under approval, not refetch/retry or claim zero. Applying the text or flipping its flag alone is insufficient; separately reviewed adapters, fresh source/rights and explicit owner consent are all required. No live collector, workflow change, credential or activation shortcut is delivered.

## Narrow provider-permission request draft — not sent

> SCOUT would like written permission for an internal, read-only two-token research canary for the exact GP/GLDX and GROK/SPCXX mints listed above. We propose no more than one registry, two exact-quote first-page catalogs and two primary aggregate reads per approved hourly attempt, sequentially, with a shared 30/minute ceiling and your stricter rate/caching rules. No holder addresses, payouts pagination, RPC, trading or paid access is requested. The acquisition window would be at most 72 hours, with at most 73 records per token and bounded private storage. May we retain exact token/quote units, mode/basis, reported raw aggregate/count/last-payout fields, original capture/generation times, source references and hashes privately until at most seven days after the window, or your narrower limit? Please specify permitted purposes, caching/attribution, correction/takedown/deletion, expiry/revocation and whether nonfinancial source metadata may be public. We request no public raw/financial or commercial redistribution permission by implication; those remain blocked unless separately agreed in writing. May hashes/nonfinancial audit metadata remain after required quantity deletion, and under what terms?

The owner must review/narrow and separately authorize any contact. No request was sent, terms accepted or rights fabricated. Existing evidence is not a new license. A permission answer cannot upgrade a provider aggregate to settled payouts, complete pair coverage, historical flow or holder ROI.

## Rollback and validation

Before later activation, rollback is removal/revert of the new cohort, shadow modules, tests, inert patch and this document only. No active dataset, archive or infrastructure state exists to undo. The command's local rollback demo selects generation zero and restores one in `/tmp`; it **does not** erase generation one or reset a live collector's consumed attempt/state.

After any future separately approved shadow run, revoke permission for new attempts through the approved owner mechanism, reconcile in-flight/uncertain read/write outcomes, preserve original seven-token state plus approved private source/summary/manifest/attempt evidence and select the last verified private version only under review. Do not delete a namespace, purge/reset a version journal, rotate credentials, mutate workflows or rewrite repository history as incidental rollback. Follow actual provider expiry/takedown/deletion obligations through a reviewed process; do not invent indefinite retention rights. Resume, larger cohort, public output or seven→nine promotion needs a new recorded decision.

[Validation evidence](evidence/verified-coverage-shadow-canary-v1-validation.json) records exact checks, scope and metadata-only replay hashes. Full `npm ci`, `npm test`, typecheck, lint, build and archive checks run alongside focused `python3 -m unittest tests.coverage_shadow_canary_test` and the offline rehearsal command. Real retained captures are the only positive source fixtures; altered timestamps/counters/units are explicitly negative fixtures. Tests cover source failures, budget/retention refusal, idempotence, configuration drift/reset, hash/parent/schema tamper, private permissions, partial/uncertain writes, rollback/restore, cleanup and inert-proposal denial. No new runtime UI, browser screenshot, hosted durability, current provider availability, permission grant or live proving period is claimed.
