# Verified coverage V1 — inactive candidate onboarding

Issue [#81](https://github.com/fuzzysniper/scout-stonk-intel/issues/81). Base main `3de63c4`, including merged pair-economics strategy #79, Historical Research #75 and Stage C2 #77. **Review only: active coverage remains seven tokens.** No new observation, provider request, active allowlist edit, workflow, scheduler, Cloudflare change or deployment command is part of this work. Agent A owns cadence/infrastructure; this layer has no transport, scheduling or activation capability.

The deliverable is a source-bound catalog of **16 candidates, 14 additional exact token mints**, a pure offline validator and draft retention/persistence checks. It is an expansion path, not a statement that 21 tokens are now collected. SI/NVDAX and KNOTS/STONK are existing controls; GP/GLDX and GROK/SPCXX are proposed first additional subjects, subject to the gates below. No selection is a recommendation or payout ranking.

## Audit of the current contracts

| Boundary | Recorded/code evidence | Implication for expansion |
| --- | --- | --- |
| Active selection | [tracked-mints.json](../data/tracked-mints.json), seven exact token/quote pairs; original discovery `tokens?limit=20`, verified 12 October | A curated sample, not all reward-mode tokens. Never use ticker/name as an identity or automatically replace this file |
| Latest attempt at this base | [collection-summary.json](../data/collection-summary.json), owner-referenced run `38960299506`, 16 October 20:10:38–39 UTC, seven collected results; `expectedDatasetRevision=sha256:df8259125f0ca57f03de095d7db54cadee536c94be5a9c8a4471e5df57faa639` matches the exact retained dataset bytes | File/hash matching confirms this repository snapshot, not delivery cadence, served API revision, universal coverage or holder payments. There are 149 retained observations; GP/GROK have no active history |
| Active acquisition | [collect_rewards.py](../scripts/collect_rewards.py): v1 `/api/public/v1/tokens/{mint}/rewards`, up to 10 mints, sequential, 8-second timeout, 256KiB response, one request/token and no retry loop | Current seven imply seven reward reads per attempt. Do not increase `MAX_MINTS`, change this endpoint or attach this candidate layer to it here |
| Active admission | Exact token mint, `mode=reward`, exact quote mint/symbol; finite nonnegative numeric `distributedTokens`; source `meta.generatedAt` at most three hours old, at most 60s future; optional safe counts | Genuine numeric zero is valid; missing/invalid amount fails. No verified quote decimals are stored by this v1 collector, and numeric counters cannot be promoted into exact v2 integers |
| Active history | Actual observation time and original provider time, exact source/quote, duplicate observed timestamps not rewritten, backward observation time rejected, counter resets retained with a warning; maximum 193 points/token | Data retention is already bounded. More successful attempts cannot repair missing past hours. A reset is not negative payout flow |
| Verified quote registry | [#46 source contract](PAIR_QUOTE_REGISTRY.md), [pairs-source parser](../lib/pairs-source.ts): `/api/public/v1/pairs`, unpaginated received array, exact mint, decimals 0–18, known token program, duplicate-symbol groups. Retained audit has 587 identities | Registry membership is not a reward-mode catalog, market completeness, launch permission, equity/metal ownership or rights to redistribute data. Canonical STONK is distinct from other STONK mints |
| Pair discovery | [#43 findings](PAIR_DISCOVERY_COVERAGE.md), fixed v1 market-cap pages with exact `quoteMint`; retained four page-1 samples each have 25 entries | Verify every row's quote and declared page size/count; an HTTP 200 alone does not prove server filtering. Global/local partial filtering is not pair discovery. Market-cap samples favor particular tokens; no payout order is implied |
| Mode/lifetime | [v2 mode verifier](../lib/pairs-source.ts), [exact ledger parser](../lib/reward-lifetime.ts), [dated audit](PAIR_REWARD_AUDIT.md): `/api/v2/tokens/{mint}/rewards` has root `generatedAt`, mint, mode, quote including decimals, optional `basis=ledger` aggregate | Settings verification and provider-reported lifetime distributions are different facts. Use `distributedRaw`, never the rounded floating companion. Missing `rewards` or non-ledger basis does not become zero |
| Flow / returns | [Pair Pulse](../lib/pair-pulse.ts), [reward-evidence contract](../lib/reward-evidence-contract.ts) and [#79 vocabulary](strategy/PAIR_ECONOMICS_CONTRACT.md) | Covered intervals require separate source, identity, exact-unit, precision, chronology, reset, freshness and actual-boundary/gap gates. No aggregate establishes holder ROI, exact delivery sequence, trading fees, creator fees or realized returns |

The retained probe found the undocumented v2 reward-launch `quoteMint` filter ignored and a v1 `sort=distributed` behaving like market-cap order. This layer therefore uses neither. It does not traverse payout/holder cursors, request wallet addresses, query RPC, buy data or infer a complete reward denominator. Existing public/API contracts are unchanged.

## Candidate provenance and exact identity

[research/reward-candidates.json](../research/reward-candidates.json) contains metadata only. Its source is the **already retained** 500,861-byte audit at commit `df4e87658c5dd64fef9461d174333d824c8b1c7c`, document SHA-256 `4ff3c223122ca1479bade0e09889aa4837803cab137c26a9e714999a2ea0b50d`. Every seed points to the actual registry, exact-quote catalog and primary v2 aggregate packet. The offline reader verifies the document pin, body lengths/hashes, source paths and each identity. It copies no raw body or financial amount into the new catalog/report.

| Requested subject | Exact base token mint | Exact quote mint | Verified quote unit at capture |
| --- | --- | --- | --- |
| SI / NVDAX — existing control | `DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP` | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | 8 decimals, Token-2022 |
| GP / GLDX — additional candidate | `HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ` | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | 8 decimals, Token-2022 |
| GROK / SPCXX — additional candidate | `6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8` | `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` | 8 decimals, Token-2022 |
| KNOTS / canonical STONK — existing control | `8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS` | `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx` | 9 decimals, SPL Token; ticker ambiguous |

Other verified-at-capture seeds are VICKICHASE/SHOGGOTH/CHONK in NVDAX; WOW/BABEL/RPG in GLDX; OWL/URANUS/BOT in SPCXX; STONKITTY/STONKINU/KNOWER in that exact STONK. These are the original audit's four preselected reward subjects per quote, not a new discovery crawl or editorial claim of their merit. Ordering is exact-mint lexical order, with no financial score. Duplicate tickers are permitted across distinct exact mints; duplicate mint seeds or selections are rejected.

The four original page samples inspected 100 of 28,847 **provider-reported all-mode live pools**, with only 16 primary aggregates checked. This is a dated population description, not current reward coverage or a common economic denominator. `complete=false`, `atomic=false`, ranking/recent flow/holder return `null` are unconditional. Other quote ecosystems require independently validated registry units, exact-mint catalog and fresh primary reward receipts plus owner review; an existing ticker or allowlist entry is insufficient.

All seeds are **historical, not current**. Original capture and provider-generation strings are preserved, including microseconds. The old audit's millisecond `asOf` truncates the last original capture by 82µs; replay uses the latest original selected capture (`2026-10-14T22:34:25.223082+00:00`) as its validation boundary, without altering any receipt date or permitting future clocks. Current-time evaluation rejects these old receipts. Hashes identify retained bytes; they are not provider signatures or chain settlement proof.

## Inactive interfaces and fail-closed behavior

[scripts/coverage_candidates.py](../scripts/coverage_candidates.py) is pure Python: no network client, file I/O, implicit current clock, activation flag, collector import or write method. `opt_in=True` authorizes **offline evaluation only**. All plans say `executable:false`; the catalog must remain `activation=disabled` with fixed unverified/withheld rights. There is no rights-approval boolean or promotion command.

```python
plan(catalog, exact_mints, opt_in=False, request_budget=0)
evaluate(catalog, exact_mints, supplied_receipts, explicit_as_of,
         opt_in=False, request_budget=0)
append_offline(draft_store, validated_record, opt_in=False)
match_persistence(exact_dataset_bytes, exact_summary_bytes)
```

An opt-in plan is just an allowlisted list of fixed HTTPS sources: one registry, one page-1 market-cap catalog per selected exact quote, one v2 primary aggregate per selected mint. No URL input, tickers, alternate sort, global reward list, page walk, holder/payout endpoint or API fallback is accepted. Supplied receipt count cannot exceed the declared run budget/plan; foreign, repeated or excess receipts reject before normalization. Original body bytes get their own SHA-256.

Registry parsing validates the **whole received array**, mint uniqueness, units/programs, source-time and ticker-ambiguity assertions, rejecting pagination/partial markers. Catalog parsing checks each exact quote, pagination totals and the full expected page, refusing an ignored filter or silently shortened sample. Each selected identity must match original name/symbol/provider pool metadata and current reward mode; a renamed/migrated/mode-switched subject requires review. The pool field is provider-asserted context, not chain-verified linkage or allocation of token-wide rewards to that pool.

Transport metadata requires HTTP 200, JSON, no redirect/partial/link response, capture no older than five minutes, and transport Age/source-age no older than five minutes. Registry/catalog generation may be up to three hours old, but v2 ledger generation must be within five minutes. Unlike the legacy collector, this new candidate policy permits **no future generation or capture clock**. Missing/malformed timestamps, unsafe JSON/UTF-8, error envelopes or units fail closed. No opening a receipt/report changes its observation date.

V2 quote mint/symbol/decimals must agree with the independently validated registry and seed. Ledger basis, canonical unsigned raw integer (at most 78 digits), safe nonnegative counts, recipient-count consistency and last-payout chronology are required. The rounded `distributedTokens` field and separate base-asset aggregate are ignored. Provider `walletsPaid` remains a reported aggregate, not independently verified paid holders. `rewards:null` can retain settings verification while withholding the lifetime observation; true raw zero with valid zero counts remains zero. No fees/emissions/buybacks/owed balances are added to it.

429 or 503 pauses the entire offline batch without presenting a survivor ranking. A valid Retry-After is never shortened; unsupported, missing or excessive delay means unknown pause duration and operator review. No retry is implemented. Other source/timeout/missing/malformed receipts yield fixed reason codes and no observation; arbitrary error bodies/headers never enter the report. These are **offline admission decisions**, not an implemented distributed rate limiter or proof that a future transport honors deadlines.

### Explicit bounds

| Budget | Implemented offline limit / separate future transport requirement |
| --- | --- |
| Candidate catalog/selection | At most 16 unique token mints in at most four exact quote ecosystems; no automatic additions |
| Run requests/receipts | At most 21: one registry + four catalogs + 16 primary aggregates. A GP/GROK-only canary plan needs five; adding both v2 SI/KNOTS controls makes nine. Active v1 control counters cannot be substituted for v2 ledger evidence |
| Bytes | Registry 512KiB, each catalog 128KiB, each aggregate 32KiB; total at most 1.5MiB/run. Fixed-file audit input at most 1MiB, candidate metadata at most 32KiB |
| Concurrency and provider admission | Proposed concurrency **one**, minimum two seconds between request starts, at most **30/minute shared across all SCOUT readers/replicas**, no catch-up burst. This PR performs zero requests and implements no transport/coordination. Agent A/owner must approve and prove a shared budget before acquisition; a local cap cannot guarantee shared-IP headroom |
| Deadlines | Proposed future transport at most three seconds/request and 90s/run, no retry/redirect; stop the run at either bound. These are unexecuted transport requirements, not a claim of live timeout enforcement |
| Draft retention | At most 16 token histories × 193 points, each record ≤2KiB, store ≤7MiB; summary ≤16KiB. At most 3,088 records, conservative serialized growth ≤6.1MiB plus small structure within the hard store cap |
| Capacity behavior | **Stop**, never silently evict/delete old receipts, extend the cap, pay for storage or overwrite timestamps. Retention/rotation requires separately approved rights and operational design. 193 irregular observations do not imply eight days of coverage |

Previously recorded official documentation reported v1 300 reads/minute/IP and ordinary v2 240/minute/IP, CDN-hit exclusions and Retry-After. Those are dated contracts, **not newly verified current quotas or an SLA**. Existing UI/API reads and other clients consume headroom too. A request plan is not permission to spend the provider quota, retain bytes or activate a collector.

## Rights and publication stay blocked

Preserve [Historical Research's decision](HISTORICAL_RESEARCH.md#rights-and-retention-decision--blocked-not-inferred) and [#79's independent rights model](strategy/PAIR_ECONOMICS_CONTRACT.md). Earlier terms review described a public-API automation exception, anti-abuse rules and reserved exploitation/redistribution rights. No current terms, new retention/publication license or commercial use right is verified by this issue; there is no new source/terms request or acceptance.

Before any new acquisition, the owner must resolve permitted purposes/fields, retention duration, raw receipt handling, derived/public/commercial financial use, attribution and correction/deletion obligations, with dated source/permission hashes, reviewer, expiry and revocation process. No new permission receipt is invented here. Continued handling of existing Git evidence also requires owner review; this change does not certify or rewrite it.

The only report command is:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m scripts.coverage_candidate_report --offline-report
```

It reads two fixed local files, verifies their provenance, replays original-time eligibility, then separately evaluates staleness at the report clock. It writes **nothing** and returns only source-index metadata with lifetime, recent flow, holder returns and ranking withheld/null. There is no URL/file override, financial export, rights override, provider read or active app import. Do not wire the internal `evaluate()` result into pages, APIs, OG, exports or logs as a publication bypass. No public UI/API is added.

## Persistence / health handoff for a later approved implementation

The pure draft store is `version=1`, `kind=candidate_quote_ledger_v1`, keyed by exact token mint; every record independently carries exact quote mint/decimals, reward/ledger basis, integration `stonkfun`, provider network label `mainnet-beta`, grain `provider_token_aggregate`, raw integer/exact decimal text, reported counts/last payout, **actual captured `observedAt`**, original `providerGeneratedAt`, fixed source, body revision, registry/catalog source URLs/clocks/revisions and canonical record hash. This is not a complete implementation of #79's future canonical multi-venue model. Unknown base units, chain finality, economic epochs, fee origin, market linkage and holder entitlement remain unknown. Exact identity fields are not an ownership or chain-verification assertion.

Never append these records to `data/reward-snapshots.json`, reinterpret existing v1 floating counters as raw integers, or relabel the original audit as newly collected history. A future approved collector must produce a separate reviewed versioned store or explicitly reviewed compatible migration/adapter. Fetch/auth/rights approvals and a new schema/consumer review are needed first; this PR supplies neither an executable collector nor API integration.

`append_offline` preserves its input. It validates existing records and chronological units/mode; exact duplicates are idempotent. A repeated provider generation/body is **not a new independent snapshot** even if fetched later. A conflicting same observation/provider timestamp, regressed source clock, counter decrease/reset, quote/decimal/mode/basis switch or invalid existing history quarantines the append. Preserve the last known valid series and record a separate bounded failure/epoch-review event; do not bridge or rewrite it. New epoch acceptance needs a later reviewed protocol, not deletion/reset to get green results.

After future atomic file replacement, produce a separate versioned attempt summary with `startedAt`, `finishedAt` (≤90s), `expectedDatasetRevision=sha256:<exact persisted bytes>` and `accepted` rows containing exact mint, record ID, observed/provider time and receipt hash. `match_persistence` independently hashes those bytes and requires every accepted row to match the **latest** validated record in that token's store and lie inside the attempt window. Whitespace/byte substitution, stale accepted IDs or mismatched timestamps/hashes fail. A match reports `servedRevisionVerified:false`: owner verification of the committed and served revision remains independent, and a green job is not proof of either.

Health handoff fields: candidates selected/reviewed, planned/actual requests, bytes and budget refusals, registry/catalog records inspected, all-mode provider denominator with incomplete/non-atomic scope, mode checks, lifetime-valid reads, newly appended records, duplicate/provider-cache skips, quarantines and failures by fixed reason, provider/capture age, last real persisted observation and matched dataset revision. Preserve missing/null for unknown scope; do not report zero failures from a run that never executed. Feed actual attempt outcomes and gaps into existing health instrumentation only in a separate reviewed integration, never by editing cadence here.

UI label handoff, without a UI change: `Settings verified` requires current exact-mode evidence; `Reported lifetime distribution` requires its independent current ledger gate; `Covered interval flow` requires an actual reviewed history adapter plus all current Pulse/source-time/exact-boundary/provider-sequence/precision/gap/reset gates; `Holder returns unavailable` remains unconditional. Keep source/capture ages and exceptional stale/degraded states. No recent earning rate is computed by this layer. More observations, a matching hash or an old lifetime total cannot relax existing comparison gates.

## Staged owner selection and rollback

1. **Seven → inactive catalog review (this PR).** Verify exact subjects/source scope, rights blockers, budgets and field semantics. No source access/allowlist change. At current time all retained candidates fail freshness; original-time replay is historical validation only.
2. **Seven → two-subject shadow canary, later separate approval.** Owner explicitly selects exact GP/GLDX and GROK/SPCXX mints (or records a reason to defer them); obtain approved fresh registry/catalog/aggregate receipts within a shared request grant. SI and KNOTS remain controls. Prove correct mode/units, meaningful source clocks, missing/zero behavior, duplicate/reset/outage/rate handling, receipt→store→summary→served revision and storage/rights limits. No clock interpolation or catch-up. Keep the active seven unchanged during shadow proving.
3. **Seven → nine, later review only.** Rights, fresh-source stability and proving observations must pass before a separate active-collector selection/schema/consumer PR. The existing collector's cap is ten; this PR does not authorize expanding it or assume v2 is a drop-in replacement for v1. Cadence/permissions remain Agent A/owner's separate decision. At minimum a full real 48h boundary-aligned proving period is needed even to attempt current/previous period comparisons; irregular gaps or source clocks can still withhold them.
4. **Nine → at most ten under the existing cap, then larger coverage only after another capacity design.** Select for verified identities/units/rights and request/storage feasibility, not the largest cross-currency counter. Additional catalog mints are candidates only. Raising the active cap, adding ecosystems, retention rotation, transport or public financial output needs another reviewed change and owner approval. No market-wide coverage claim follows from completing a bounded sample.

Stop/rollback on unresolved rights/permissions, stale or untrustworthy clocks, mode/quote/epoch drift, reset/conflict, 429/503/timeout, admission/capacity refusal, summary/hash/served mismatch or unexpected costs. Here rollback is reverting the new catalog/modules/tests/docs only. After later approved shadow work, stop new acquisition and preserve existing approved receipts/failed-run metadata; retire candidate selection under review, leave the original seven/history unchanged, and follow approved retention/correction obligations. Do not auto-delete evidence, rewrite archives or undo Agent A's independent work.

## Executed checks and limitations

[Validation evidence](evidence/verified-coverage-v1-validation.json) records checks, hashes and protected scope. Required commands are `npm ci`, `npm test` (new Python suite is automatically discovered), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run archive:dry-run`, `bash scripts/archive-tool.sh check origin/main`, focused `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest tests.coverage_candidates_test` and the metadata-only report above.

Tests use pinned real source bytes or clearly synthetic mutated fixtures, with sockets blocked during candidate tests. They cover identity/ticker ambiguity, sample bias/ignored filters, mode/units, raw precision, missing/zero, source clocks/staleness, 429/503/missing/timeout-shaped receipts, malformed/partial/oversized bodies, per-run budgets, duplicate/conflicting snapshots, quote/mode switches, non-monotone counters, immutable capacity stops and independent summary hashes. Static import checks and CLI tests enforce no transport/activation/options/public financial output. No live timeout/rate behavior, provider rights, current eligibility, hosted persistence, new UI/browser screenshots or deployed coverage is claimed. Existing browser/OG/product contracts and all operational files remain unchanged.
