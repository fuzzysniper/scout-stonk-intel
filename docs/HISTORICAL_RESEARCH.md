# Historical Research V1 — issue #74

SCOUT can identify what was recorded, when, and from which source even when current coverage fails. This change adds a **dated source index**, not a current rewards fallback. Financial quantities remain **withheld from the new public surface**: provider retention and commercial redistribution rights and owner publication approval have not been verified. This PR is for human review; it authorizes no deployment or source-data publication.

Base: `5ff8d4563acb4fba729f3f27e1d43c2cb334e232` (latest main, Terminal V3 #73 and readiness #71). [Issue #74](https://github.com/fuzzysniper/scout-stonk-intel/issues/74). Inventory reviewed 15 October 2026; all receipt times below are UTC. No new reward, catalog, payout, wallet or RPC requests were made. One bounded public developer-guide GET was used for the rights review; no retry, broad crawl, terms acceptance, account or paid service.

## What is genuinely retained

[Inventory](evidence/historical-research-inventory-2026-10-15.json) pins every source family below to the base commit with file SHA-256, byte count, purpose and limitations. It does not duplicate raw provider bodies or claim that diagnostic copies are independent observations.

| Source family | Retained evidence | What it cannot establish |
| --- | --- | --- |
| [Dated reward audit](PAIR_REWARD_AUDIT.md), original receipt document at `df4e87658c5dd64fef9461d174333d824c8b1c7c` | 28 raw response packets, including 16 primary reward aggregates in four exact-quote samples; original-time deterministic report | Complete ecosystem coverage, common lifetime periods, chain settlement or current flow |
| Earlier pair discovery and Pair Pulse research | Source/capture hashes, genuine API responses and feasibility findings; metadata-only captures are distinguished from retained raw bytes | Missing historical prices or eligible comparative periods |
| Reward evidence / source receipts / source clocks, 15 October | Actual provider/cache clocks and overlapping direct Python, Node and Next reads | Independent new payouts: identical body hashes can be the same cached response |
| Data Health V2 | Dated Actions runs, data commits, gaps and calculation reasons | An absent schedule bucket is not a missing payout; a green run is not complete coverage |
| Pinned `data/reward-snapshots.json` | 100 genuine counter observations across seven tracked mints. SI has 14; KNOTS has 16. Last captures 15 October 13:28:39–40 UTC; largest gaps exceed eight hours | No GP/GLDX or GROK/SPCXX time series; no aligned comparative reward flow; v1 floats cannot become exact v2 integers |
| Immutable brief original `d3a23a36…6f63`, UTC day 11 October | Embedded snapshot/allowlist bytes, input commit `e3de19169c844f85f06d0cabe7a4c9682d68d8ac`, reproduction hash | Zero verified findings, all rows withheld, no points in the target day. Existence of an indexed candidate is not proof of publication approval |
| Dated market/OG/dossier QA receipts | Point-in-time provider response/transport diagnostics | No supported historical exact-quote price series, transaction tick times or holder profitability |

The inventory is a pinned review, not a live manifest of the moving collector file. Existing archives, receipts and observations remain byte-for-byte unchanged. No market path is interpolated and no missing hourly point is manufactured.

### Four curated identities

These are four subjects from the genuine audited samples, in editorial quote order, **not a cross-currency ranking**. Full quote/token mints, original sub-millisecond capture strings, response generation, per-receipt hashes and root-document hash are in the [metadata-only manifest](evidence/historical-research-manifest.json). Canonical STONK is one of multiple distinct registry identities with that ticker. Registry labels do not establish equity/metal ownership or redemption rights.

| Subject | Exact token mint | Quote-token unit | Capture UTC, 14 October | Provider generation UTC |
| --- | --- | --- | --- | --- |
| SI / NVDAX | `DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP` | NVDAX, 8 decimals | 22:34:07.070 | 22:34:07.055 |
| GP / GLDX | `HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ` | GLDX, 8 decimals | 22:34:11.763 | 22:34:11.750 |
| GROK / SPCXX | `6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8` | SPCXX, 8 decimals | 22:34:17.512 | 22:34:17.495 |
| KNOTS / canonical STONK | `8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS` | STONK, 9 decimals | 22:34:21.017 | 22:34:21.003 |

Each source scope inspected 25 market-cap-selected catalog entries and audited four preselected reward candidates. Thousands of provider-reported all-mode pools remained uninspected. The original memo's within-sample lifetime ordering is reproducible offline; this layer publishes no ranking, ecosystem leader or comparable recent period. Source totals and sample coverage counts stay in restricted offline records until rights approval; public copy discloses the sampling design and unknown population coverage.

## Contract and trust boundaries

`lib/historical-research.ts` exports `HistoricalRecord`, `HistoricalRead`, `readHistoricalEvidence` and an explicit public projection. The original document is bounded to 1 MiB and pinned by SHA-256. All receipt lengths/hashes and unique source paths are checked; all four original audit reports must reproduce exactly at **their original `asOf`** through the existing strict parser. Token/quote mint, decimals, ticker ambiguity, source endpoint, receipt hash, original capture and generation time must match the reviewed manifest. Missing/corrupt/inaccessible evidence withholds every record with a fixed error; no current API fallback, refresh clock, arbitrary file/URL input or provider error body is exposed.

The immutable record ID hashes token mint + exact quote mint + original endpoint + receipt SHA-256 + original capture string. The original capture string preserves microseconds; the existing parser's millisecond UTC normalization is separately retained. Changes require a distinct reviewed document/manifest/identity, never rewriting old bytes to today's time. A hash establishes retained-byte identity and detects accidental substitution; it is **not a provider signature, proof of rights or independent settlement attestation**. Trust ultimately includes the original public HTTPS capture and reviewed Git commit.

Internal offline fields:

```ts
type HistoricalRecord = {
  id: string;
  tokenMint: string;
  unit: { mint: string; symbol: string; decimals: number; symbolAmbiguous: boolean };
  temporalState: 'historical_not_current';
  evidenceTier: 'dated_provider_reported_lifetime';
  modeVerification: 'verified_at_capture';
  chainVerified: false;
  source: { endpoint: string; capturedAt: string; originalCapturedAt: string;
    providerGeneratedAt: string; receiptSha256: string; documentSha256: string;
    commit: string; path: string };
  lifetime: LedgerLifetime; // exact raw integer and decimal strings; start/end null
  coverage: PairRewardAudit['coverage']; // incomplete, non-atomic, explicit counts
  recentFlow: null; holderReturn: null; historicalPrice: null; comparablePeriod: null;
};
```

Future minimal UI consumption is `ReturnType<typeof publicHistoricalResearch>`: a fixed, allowlisted metadata projection with `rights.financialPublication='withheld'`, no counts/ranking/raw body, and lifetime/recentFlow/holderReturn/historicalPrice/comparablePeriod all null. There is **no env, browser or query approval toggle**. Unverified rights cannot be promoted by passing an `approved` flag. A later permission document and separately reviewed code/schema change would be needed to permit specific quantities/records. No API contract is changed or route added.

`/research/history` is a server-backed static source index: date and historical status first, one rights warning, four compact rows and native keyboard-accessible source disclosures. Dossier and pair quick-view links appear only for exact curated token identities; pair quick views must also match the exact quote mint. Other STONK identities and same tickers cannot inherit records. Live error/coverage warnings are preserved. No source body, hidden metric, numeric counter or downloadable raw dataset is passed to the client by this layer; HTML/RSC carry the metadata-only publication projection. Source endpoint links are clearly mutable external destinations; opening them does not refresh the capture. There is no automatic provider read or polling on the historical page.

## Evidence ladder

1. **Dated provider-reported lifetime amount** — supported internally by the retained audit after original-time replay and verified mode/units. Provider `basis:ledger` is an assertion. Lifetime start and exact reconciliation cutoff remain unknown. Unknown/null is not a recorded zero. KNOTS requires exact `distributedRaw` conversion, not rounding the provider float. Financial publication remains rights-gated.
2. **Reconstructed timestamped delivered payouts** — not established. Requires actual successful chain signatures, exact transfers and a proved completeness window; a documented payout endpoint, aggregate counter or last-payout timestamp alone cannot promote the record.
3. **Current verified covered periods** — separate existing collector/Pair Pulse machinery. Neither old captures nor a replay at old `asOf` supplies current eligibility. Strict freshness, source age, actual boundaries, gaps, reset, raw precision, matched-period and exact-mint gates are unchanged. Cross-asset amounts and unequal lifetimes cannot establish economic leadership.

All tiers concern gross token-level distributions. Holder ROI requires ownership/eligibility, acquisition and disposal cashflows, costs, fees and valuation at actual receipt times. None is established. No annualization, implied profitability, yield forecast, price backfill or trading recommendation is introduced.

## Rights and retention decision — blocked, not inferred

The earlier [published terms review](PAIR_DISCOVERY_COVERAGE.md#published-access-terms) reports terms updated 18 September 2026: Section 9 permits the published public API/documentation exception to the automation restriction, while Section 8 reserves exploitation/redistribution beyond limited informational access. This is dated research, not a legal determination about every API fact.

This issue made **one** GET to `https://www.stonkfun.xyz/developers`, HTTP 200, 83,524 bytes, HTTP Date `2026-10-15T17:06:42Z`, Age 0, SHA-256 `ead8027eada78f8d7a7cf3f1fdf963fca2876cedbd206c499aedfd7f586b6a05`. Local file-write completion and its precision caveat are in the inventory. The HTML is not copied into the repository. It does not establish a commercial data license. The terms modal/module was **not revalidated**, so current terms and source retention/redistribution permission remain unknown. No acceptance or access-control circumvention occurred.

Decision: preserve already-committed genuine evidence for review; add only SCOUT-authored source-index metadata and validation, **withhold all source-derived financial quantities from the new public view**. Existing raw evidence was already in Git before this PR. This work grants no new right to retain it, publish a paid dataset or expose additional raw bodies; it does not silently delete or rewrite history. The permission boundary is not cured by attribution, hashes, API accessibility, rate limits or a repository license. An owner must decide existing Git retention and any takedown/licensing obligations with the provider/adviser before commercial use. This index does not certify pre-existing pages or repository evidence for commercial reuse.

Required human decisions before any expanded publication/indexing:

1. Confirm current provider terms and written permitted purposes: internal audit, duration, public and commercial derived facts, raw receipts, attribution, caching, screenshots and deletion/takedown obligations. Record dated permission text/hash, reviewer, exact records/fields and expiry/revocation handling. Do not invent consent.
2. Approve continued retention of existing immutable evidence and a compatible correction/takedown procedure; avoid an autonomous Git-history rewrite. Until resolved, no new financial publication or broader receipt acquisition.
3. Approve a narrowly scoped publication PR after permission. Rights approval alone cannot upgrade evidence tier, freshness, scope or holder-return claims. Any later public numbers must preserve units, original dates, unknown cutoff and incomplete-sample warning.
4. Review any proposed RPC/provider access, global request budget, costs and privacy boundaries separately. This PR adds no credentials, indexing job, paid API or automatic external calls.

## Historical Solana reconstruction feasibility — proposal only

The dated official guide documents per-token `/api/v2/tokens/{mint}/rewards/payouts` cursor rows with signature, holder, assetMint, integer amountRaw, amountTokens and createdAt. Pending/stranded balances and fee-recipient records are separate populations; do not count them as delivered quote-holder distributions. Provider rows are leads for validation, not chain-verified evidence. No payout page, recipient address or RPC was requested here.

| Requirement | Minimal safe proving method, after separate approval | Remaining blocker |
| --- | --- | --- |
| Program/pool semantics | Pin exact token/quote mint, SPL Token vs Token-2022 program, decimals and pool/mode/config epochs from audited configuration and reviewed program/IDL semantics | Provider catalog pool identifiers and current mode are not a historical program/migration attestation; payout authority/transfer path not independently authenticated |
| Actual delivery | For a tiny owner-approved existing receipt sample, read `getTransaction` at finalized commitment, require success, inspect outer and inner transfer instructions, asset mint, integer amountRaw and token-account ownership at that slot | No authenticated signatures/transactions are retained. Null/pruned/version-unsupported responses must withhold, not imply no payout |
| Timestamp | Preserve signature, slot, blockTime, source createdAt, retrieval and finality separately; null blockTime remains unknown | Provider event time is not necessarily settlement time; no inferred slot-to-hour clock |
| Duplicate identity | Use chain + signature + instruction/inner-instruction index + asset mint + recipient token account, with distinct transfer legs and semantic attribution | A signature may cover multiple recipients/transfers. Signature-only dedup loses payouts; summing pre/post balances can include unrelated transfers |
| Completeness | Validate stable cursor, terminal cursor, repeated-page/body hashes, fixed lower/upper finalized slot watermarks, covered accounts/program versions, reset/reorg/omission checks; reconcile exact raw totals to a known scope | A completed provider page walk is not proof the provider covers all payouts or pools; current aggregate cutoff is unknown. Never claim complete history from a partial cursor |
| Holder boundary | Separate delivered quote-holder payouts, base-token transfers, fee recipients and pending/failed transactions; minimize or exclude public wallet identifiers | Attribution requires eligibility/holdings at actual slots; aggregate distribution still cannot determine personal costs/profit |
| RPC availability and cost | Owner validates [official RPC methods](https://solana.com/docs/rpc/http/gettransaction), [signature pagination](https://solana.com/docs/rpc/http/getsignaturesforaddress) and [cluster access](https://solana.com/docs/references/clusters), supported history depth/versions, quotas, storage and dated price quote | No RPC access/price was verified in this issue. Public endpoint availability is not an archival SLA. No provider/account/key/fee or paid plan approved |

Proposed offline-first pilot **not executed or activated**: one exact pair, one known delivered signature and a fixed bounded finalized interval; a future explicit approval must specify a maximum number of GETs, bytes, duration, no-retry/cooldown rules and storage limit before any request. Do not search wallets or traverse the full payout catalog to find an example. Price/budget equation: cursor-page reads + unique transaction reads + version/account lookups, multiplied by a verified provider quote plus storage/egress; no defensible dollar estimate is available until cardinality, history depth and provider terms are known. Prior multi-million lifetime event counts are not necessarily distinct transactions and must not be used as an exact request estimate. No fee account, new key, paid API or bulk scrape is justified by this proposal.

Future data needed: approved source rights, exact transfer receipts and program epochs; finality and complete watermark/cursor evidence; raw integer amounts/units; actual aligned observation windows; separately sourced exact-quote prices at real times if economic comparison is ever proposed. Missing past observations remain missing. No wallet access/signing is required to research public transactions, and none is authorized or performed here.

## Validation and review

Reproduce without HTTP:

```bash
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
bash scripts/historical-research-report.sh
```

The final command verifies the genuine audit and emits only metadata with null financial fields. Invalid source bytes fail with fixed status and exit 1; it accepts no URL, file override or permission flag. Tests cover original report equality, copied hash/body/identity/capture substitution, original timestamps, exact units, stale-versus-historical, same-ticker different-mint exclusion, genuine zero versus null, 429/503, missing/inaccessible sources, source skew/mixed units, publication projection, accessible disclosures, error view and CLI reproduction. Existing Pair Pulse tests retain actual-period, gap, precision, freshness and withholding coverage.

See [validation and browser evidence](HISTORICAL_RESEARCH_VALIDATION.md) for executed results and screenshots. Before images are the unchanged latest-main guide; after images are the new source index, not simulated rewards or the same route pretending to have existed before. Browser QA makes no StonkFun/API/RPC requests and fails on client errors, overflow, missing date/rights warnings, non-keyboard disclosures or leaked quantities.

Risk: no usable financial publication until rights approval; provider assertions are not independent chain proof; root-pinned original receipts intentionally fail closed on edits; future trace/package failures can withhold the static index. A source hash is not an authentication signature. The source index cannot make current coverage reliable. A source endpoint can be down or return changed data without invalidating retained bytes. No claim of legal clearance, reconstruction completion, universal ranking or commercial launch readiness.

Rollback: revert this PR to remove the source-index page, two compact entry links, guide link, new modules/tests and documentation. No migration or current API response changes. Do not delete/modify the existing audit, counter snapshots or immutable editions. Collector, freshness/math/coverage gates, native workflows, Cloudflare/GitHub App, archive publication, wallets, treasury and tokenomics are unchanged. Human review is required for schema, financial-claim and rights decisions under AGENTS.md; no merge, deployment or activation follows this PR.
