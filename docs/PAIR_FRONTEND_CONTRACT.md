# Pair Explorer consumer contract — registry integration, PR #45

Base: `7368c6e6a1b125ed5a6f473e209669cd0a46884d`, latest main including merged #40/#41/#44/**#47** and real reward-data commit `d77ba92`. Rebase applied both frontend commits cleanly; no backend conflict resolution or source edits were necessary. Canonical public types are imported as types only from `lib/pairs-contract.ts`. No server/provider code is shipped to the client. [Current QA and methodology](PAIR_REGISTRY_UX_REVIEW.md).

## Search pair → select asset → view matching memecoins

The landing view asks for a quote asset by name, ticker or exact mint. It makes no explorer JSON request and does not automatically consume the cold token-query allowance on a default pair. Typing or explicitly browsing opens verified registry results. Choosing one exact mint closes the search results and loads that mint's bounded token sample. The selected identity and sample remain visible while another registry search runs; typing alone never changes the selected token universe.

Registry search uses `/api/pair-quotes` through the single typed client module `app/pairs/client.ts`. Input is debounced300ms, checked against the canonical NFKC/lowercase rules for literal name/ticker search, bounded to64 Unicode code points before/after normalization, and rejected for control/unpaired-surrogate characters. A canonical full mint uses the explicit `mint` parameter with its original case; names/tickers never become keys. Raw text is sent for server normalization, so Unicode text that resembles a mint cannot silently become an identity alias. URLSearchParams encodes literal input; it cannot choose an upstream URL. No client-side provider bypass, embedded full registry or documentary-data fallback.

Results use original provider labels and visible mint abbreviations, with full mint in the accessible button name. Same/case/Unicode-equivalent tickers remain separate, using effective symbolAmbiguous/symbolMatchCount supplied by the whole validated registry. No rank, return or token-count claim appears in registry rows. Native labeled search/buttons/list semantics avoid an incomplete custom combobox implementation.

The endpoint searches the validated registry response independently of the first token pages. This resolves the earlier full-registry-search integration gap: a quote absent from global token pages can be found by name/ticker/mint. It does **not** prove independent universal registry completeness, launch readiness, economic ownership or comprehensive token coverage. New server fields are consumed unchanged; no backend contract extension is introduced here.

## Runtime validation and bounded pagination

`app/pairs/registry.ts` validates schema1, echoed query/mint/window, source scope, HTTP/status agreement, original source/retrieval dates, official fixed registry URL and received-byte SHA-256 revision. It checks identity/program/decimal/text bounds, unique canonical mints, original labels, ambiguity/count consistency and official_registry_only verification. Available/cached results require valid provenance and numeric registry/match counts. Unavailable results require null counts/provenance;503/429 never masquerade as a successful zero-match search. Exact404 describes membership absence from that validated response, not absence everywhere.

Each browser window requests12 identities. Explicit “Show more” appends at most48 visible identities; broad results then ask the visitor to refine the query. All records remain searchable through server filtering regardless of that display cap. Every raw page retains its original coverage metadata; appended windows do not rewrite returnedCount into a made-up canonical response. Appending requires the same source revision/time, query/mint/limit, registry/match counts, expected next offset and no duplicate mints. A refresh/inconsistent window clears results and asks for a manual restart. Registry paging is never inferred atomic across different source revisions.

All JSON reads have a2MiB streamed body cap and15s abort deadline, and cancel on unmount/superseded query. Registry source work remains the backend's one bounded fixed registry GET with its five-minute cache and shared cooldown. There is no polling, automatic retry or upstream call per result row.

## Explicit selection and exact-mint token evidence

A selection requests only `/api/pairs?quoteMint=<mint>&discovery=pair`, plus the existing `/api/radar?sort=name` for recorded reward evidence. No default/global catalog fetch is required by the UI. Scoped responses must prove provider_quote_mint strategy, requested exact mint and quote_mint total scope. Every declared catalog page and token source URL must carry that mint; page-source count must equal pagesFetched. Global markers require null mint, and a global read cannot masquerade as a scoped result.

The chosen registry mint/symbol/name/decimals/program must also match the scoped group before token figures render. A changed identity asks for a new search. Rendering guards against a previous selection's catalog before React's effects finish resetting state. Late aborted reads cannot replace the current selection. Successful scoped responses cache up to12 mints for five minutes with their original dates; manual sample refresh clears that client entry but does not bypass server limits.

The unchanged backend admits one cold scoped refresh/minute/process and four scoped readers. A quick switch can honestly return503; the UI withholds figures and offers manual retry. It does not infer whether a generic503 means admission, outage or shared provider cooldown. Real upstream429 is not forced for QA; defensive429 and backend Retry-After/shared-cooldown behavior are tested offline. Registry failure does not erase separately valid selected-sample evidence. A failed token read never falls back to global pages or a dated seven-token sample under a successful scoped label.

## Units, times and unavailable returns

Token discovery stays at most two25-record pages with complete=false and atomic=false, even if seven returned records fit one page. Registry counts are identity counts; sampled token counts and provider-reported scoped totals are separate. Provider market-cap sampling is selection bias; displayed rows sort alphabetically, never by payout or return.

Nullable USD price/liquidity/24h volume are labeled reported snapshots. Null is Unavailable, true numeric zero is US$0, tiny nonzero values retain significance. Visible provider response dates are not market observation/tick times or live quotes. Source/retrieval dates and byte revisions remain in Evidence. Historical quote-relative return, quote-asset benchmark return and holder-attributable rewards remain Unavailable.

Existing Radar comparisons are joined only for the tracked seven by exact token/quote mint/symbol, pool and official reward-source identity. Catalog mode must be verified reward, history recorded/fresh and catalog pool matching. Existing source/freshness/reset/gap/matched/window/point gates and actual intervals remain authoritative. There is no new financial calculation. Radar failure withholds reward comparisons without fabricating absent USD snapshots; those independent provider snapshots keep their own nullable status/time limitations. Distributed counter changes are not individual investment returns. Sharing a quote does not synchronize token intervals or imply underlying equity/metal ownership.

## Preserved surfaces and rollback

Home's existing entry point and app/page.tsx remain unchanged. `/radar`, `/brief`, `/research`, `/status`, permanent editions, query dossiers/OG metadata, STORK and accessibility landmarks remain available. Dossiers bypass registry/catalog/Radar explorer reads. No backend, API, data, allowlist, archive, workflow, collector, scheduler/staging, dependency or tokenomics change is introduced.

Rollback by a human-reviewed revert of the frontend commits while retaining merged #47/#44 and all genuine data/archive. No migration, secret/resource deletion, backend rollback or production activation is required. Earlier [Day2 review](PAIR_DAY2_UX_REVIEW.md) documents the pre-registry milestone, not current search limitations.
