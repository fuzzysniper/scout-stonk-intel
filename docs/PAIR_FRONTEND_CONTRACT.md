# Pair Explorer consumer contract — Day 2, issue #42

Frontend base: `179265e` (latest main at task start, including merged #40/#41). Canonical types are imported **as types only** from `lib/pairs-contract.ts`; this frontend change does not edit those types, the API, backend tests or calculations. The earlier Day 1 proposed interface was superseded by the merged canonical schema; its screenshots remain dated evidence.

## Reads and identity

`app/pairs/client.ts` is the sole consumer adapter for `/api/pairs` and `/api/radar?sort=name`. Entry/manual refresh makes one global catalog and one independent Radar read, followed by one selected exact-mint catalog read. Selection makes at most one catalog read; text search stays local. There is no polling, direct provider access or per-token request fanout. Reads abort after 15 seconds/unmount. JSON bodies are bounded to 2 MiB. Exact-mint results are cached for five minutes, at most twelve selections; manual refresh clears this cache without changing selection. A retry cancels the previous selection request and ignores late responses.

`parseCatalog(unknown)` validates schema 1, canonical object coverage and explicit nulls, bounded records, UTC timestamps, unique valid mints, exact group/token quote identities, official HTTPS provenance and byte revisions, mode evidence, USD snapshot units and unavailable historical comparison fields. Genuine Unicode symbols and names up to the backend's 32/160-character bounds survive. Invalid packets fail closed; individual forged records are not silently dropped into a seemingly valid catalog. This is defensive consumption of the trusted server response, not independent chain verification.

Groups/select/cache keys are **quoteMint**, never ticker. Names/symbols are search labels; full mint remains in the selected identity and accessible button name. Ambiguous/same-symbol chips have visible mint abbreviations; native picker entries always show mint abbreviations. Token rows sort alphabetically, then mint, not price/rewards. NVDAX is a convenience selection inherited from the dated allowlist, not a recommendation.

## Bounded coverage and the registry gap

Main's endpoint returns quote groups matched in at most two global catalog pages of 25 records. Its `?quoteMint=...` filters those pages locally; a verified registry-only quote can return an empty group. Neither zero sampled tokens nor a successful lookup proves ecosystem absence. Coverage stays `complete=false`, `atomic=false`, `historyScope=tracked_sample`; provider totals describe the upstream query, not verified unique holdings or ecosystem size.

The full registry is **not** exposed: `registryCount` is a number, not a list of identities. Chips/search/native picker therefore cover returned verified records only. An exact-mint lookup can verify another registry identity and show an honest empty sample. The UI does not invent all 587 identities, use static registry evidence as application data or bypass the server. Full symbol/name discovery for unreturned registry records remains blocked on a separately reviewed backend extension. Coordination: [#43 registry gap](https://github.com/fuzzysniper/scout-stonk-intel/issues/43#issuecomment-6173947115), [#42 scope agreement](https://github.com/fuzzysniper/scout-stonk-intel/issues/42#issuecomment-6174210200).

Backend [PR #44](https://github.com/fuzzysniper/scout-stonk-intel/pull/44), unmerged at validation, proposes opt-in `discovery=pair` and optional `dataset.coverage.discovery`:

```ts
type DiscoveryEvidence = {
  strategy: 'global_sample' | 'provider_quote_mint';
  quoteMint: string | null;
  providerReportedTotalScope: 'catalog' | 'quote_mint';
};
```

The frontend uses this opt-in only after a valid global response carries the capability marker. An opted-in response must prove `provider_quote_mint`, the requested exact mint and quote-mint total scope; all returned groups must match. Without the marker, no unsupported parameter is sent and evidence explicitly describes local global-sample filtering. A scoped failure retains earlier identity only, withholds figures and says source unavailable; there is no silent global fallback pretending to be wider discovery. Compatibility is covered by offline tests; a real integrated #44 proving run remains pending separate backend review. No shared schema change is made here.

## Units, times and reward gates

Market rows consume only canonical `reported_snapshot` values in **USD**. Null is Unavailable; a genuine numeric zero is US$0; tiny nonzero values retain a scientific representation. The visible time is provider response generation, **not** a price tick, live quote, observation time or quote-token unit. Source/retrieval times and SHA-256 byte revisions appear behind Evidence. Historical quote-relative return, quote-asset benchmark return and holder-attributable rewards stay Unavailable.

Reward flow joins existing Radar only for the existing tracked seven using token mint, quote mint/symbol, pool and official reward-source identity. Current catalog mode must be verified reward, history recorded and fresh, and catalog pool must match the allowlist. Existing `flowReading()` freshness, source, reset/gap and matched/window/point gates remain authoritative; no new backend or financial calculation is introduced. Actual positive-duration start/end intervals accompany every displayed amount. Matched current/previous details are disclosed, never turned into a cross-token ranking. Sharing a quote mint does not synchronize observation periods. Distributed counter changes are not individual investment returns or holder entitlement.

Catalog failure/503/malformed JSON shows a separately labeled dated seven-token sample, with no catalog snapshots. Radar failure is independent and prevents reward comparisons. Selection-source failure withholds displayed snapshots/flow. Catalog-mode unavailability is visible rather than promoted to a verified state. Missing observations never become zero.

## Preserved surfaces and rollback

Home uses the existing explorer entry point; `app/page.tsx` is unchanged. `/radar`, `/brief`, `/research`, `/status`, immutable editions, query dossiers/metadata/OG image and STORK footer/disclosures are preserved. Dossiers bypass explorer reads. Native buttons, search label, pressed states, details/summary and the inherited skip link/main landmark remain accessible. Revert the frontend commit through human review; no data migration, archive rollback or backend/scheduler change is needed. [QA and limitations](PAIR_DAY2_UX_REVIEW.md).
