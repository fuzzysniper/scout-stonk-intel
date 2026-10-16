# Pair economics IA and staged roadmap

Companion to [positioning/audit](PAIR_ECONOMICS_V1.md), [canonical contract](PAIR_ECONOMICS_CONTRACT.md) and [adapters](VENUE_ADAPTERS.md), issue #78. **Text wireframes only.** No UI, routing, financial data, search capability or venue has been implemented by these mocks. Bracketed fields denote design slots, not source observations or test results.

## Information architecture

| Layer | Reader question | Proposed contents / ordering |
| --- | --- | --- |
| Terminal entry | What does SCOUT do and where can I start? | Pair-economics promise, current StonkFun support disclosure, one search. Exact quote examples may be bounded registry identities; no favorites/top earners/venue logos implying support |
| Identity selection | Which token, quote group or market is this? | Disambiguate result type, chain, exact mints, executing venue/program assurance and pool. A quote result opens a bounded universe; it does not select a pair silently. Same ticker results remain separate |
| Pair research | How does this pair work and what flow is established? | Exact pair and economic scope, one concise mechanism/recipient finding, one distribution-evidence conclusion with actual dates and unit if allowed. Critical identity/rights/freshness/coverage warnings remain visible |
| Evidence / Details | What supports or withholds that conclusion? | Fee origin, recipient/entitlement/config epoch, precise units, provider/chain tier, actual periods/finality, original source clocks/hashes, sample coverage and publication state. No wallet action |
| Historical sources | What was previously recorded? | #75 dated metadata and permission gate. Original capture stays separate from present eligibility. Preserve source IDs and immutable editions |
| Secondary market context | What market observations accompany this research? | Nullable liquidity/volume/price with provider, market identity and time limitations. A different pool is explicitly separate. Optional sample sorts, no global “best” or signals |
| Research operations | Is collection/evidence dependable? | Existing Data Health, Radar, brief/archive and methodology accessible through quiet secondary navigation; no route removal |

Existing production navigation remains untouched. A first approved UX phase should keep `/`, `?mint=`, `/research/history`, Radar, Data Health and all brief/edition permalinks working. Future exact-pair/market permalinks need an approved versioned identity specification; never reinterpret a token-only research link as an exact pool or a frozen record. Source records and published immutable editions remain separately addressable.

## Mock mobile entry — intended for 320/390px

```text
SCOUT.                         Guide
The Pair Intelligence Terminal
Follow the pair. Verify the flow.

Understand a pair's fees, recipients
and recorded distributions.
StonkFun is currently the supported
reward source.

[ Search StonkFun quote assets    ]
  Name, ticker or exact mint

[Verified registry examples, if usable]

Token-mint research  ·  Data status
```

Search stays obvious and fast; the purpose and support boundary come first. This entry is compatible with the current capability ceiling **after a separately approved copy/UX PR**. Do not replace the label with “all tokens/pools” before an authorized resolver supports it. Hide unusable examples rather than suggesting a verified static universe. No auto-keyboard, popup, financial hero number or dashboard of unavailable tiles.

## Mock mobile selection / research

```text
< Search                 Pair research
[Base label] / [Quote label]
[chain] · [source integration]
[exact-mint discriminator / market choice]

PAIR ECONOMICS
[One mechanism → recipient explanation]
[One recorded-flow evidence conclusion]
[Actual period and exact unit, if eligible
 and publication allowed; otherwise reason]

[Critical identity / source / rights warning]
Holder returns not established.

> Evidence / Details
> View historical sources [only if indexed]

Market context                     [later]
[reported liquidity / volume if usable]
[provider, pool linkage, unknown tick time]
```

The economic conclusion must explain **who** the recorded mechanism concerns (creator, LP position, holder population, other or unknown), and whether the observation is lifetime, interval or validated delivery. Do not repeat “unavailable” in five cards. One concise withheld finding can explain missing evidence, while eligible independent settings or dated source metadata remain useful. Never erase critical warnings or populate current counters with historical figures. With #75's present rights state, the historical link opens sources, not amounts. Longer provenance remains behind disclosure; its warning does not.

## Mock desktop — intended for 1280px

```text
SCOUT.  The Pair Intelligence Terminal                  Guide
Follow the pair. Verify the flow.     [ Search supported scope ]
StonkFun is currently the supported reward source.

SELECTED EXACT IDENTITY             PAIR ECONOMICS
[chain / base / quote / market]     [mechanism → eligible recipient]
[bounded quote-universe results]   [recorded flow + actual unit/period]
[name order by default]            [visible evidence/rights warning]
                                   Holder returns not established.
                                   > Evidence / Details
                                   > Dated historical sources

                                   SECONDARY MARKET CONTEXT
                                   [source-specific snapshots + pool note]
Data Health · Radar · Archive · Methodology / relationship
```

This is one research workspace, not two competing economic and trading dashboards. Desktop may expose a source side-panel; mobile uses native or equivalently accessible disclosures in the same reading order. Avoid fixed-width mint/hash cells; wrap full identity in Details. Search and venue controls must not become a row of unsupported tabs. Mechanisms without verified evidence get explicit unknown/unsupported states, not an assumed “no rewards.”

## Discovery policy and UX acceptance, for a later implementation

- Universal search is the **secondary design target**, not the current API's name: resolve exact chain/address inputs first; names/tickers return separately labeled ambiguous candidates. Distinguish token identity, quote universe and exact market. Reject malformed addresses per supported chain; never downcase Solana mints or interpret a URL as an upstream source. Unsupported chain/venue is explicit.
- Volume/liquidity are context, with missing last and sample scope visible. Default economics order is name, then deterministic exact identity; any future quantitative ordering names its metric/scope and withholds incomparable values. “Trending” is deferred until an approved, dated, reproducible observation method and coverage exist; it cannot be a momentum score or investment recommendation.
- At 320/390/1280px, purpose and current-support disclosure must appear in the first viewport; selected research must expose its one economic conclusion and critical warning before secondary market figures. No horizontal page overflow, color-only state, inaccessible close action or hidden warning. Preserve 44px targets, visible focus, keyboard/listbox/disclosure semantics, live error/cooldown announcements and reduced motion; prove 200% text zoom/reflow and no forced keyboard. No new analytics or wallet data collection.
- Proposed five-second human task, **not performed**: “What can SCOUT explain?”, “Which reward source works now?”, “Does a creator fee mean holders were paid?” Then select one exact same-ticker identity and find the source/capture date. Proposed gate: at least 4 of 5 consenting readers identify economics/evidence, StonkFun-only current reward support and the fee-versus-holder distinction; all five can find the identity/source with at most one hint. Record confusion, not holdings/wallets/trades; revise before rollout if readers infer guaranteed returns or universal venue support.
- Future production browser QA must use genuinely allowed source metadata/records or clearly segregated negative test fixtures, never synthetic positive economic metrics in screenshots. Capture real 320/390/1280px states and label historical dates. These wireframes are not screenshots, accessibility certification or user-study evidence.

## Prioritized stages and acceptance gates

Each stage needs an explicit owner-approved issue/PR scope. This document starts no implementation. Any publication requires applicable source rights and owner approval; no stage approval subsumes spending, secrets, workflow permissions, deployment or scheduling activation. Review may keep a stage blocked without inventing data to meet its target.

| Stage / priority | Narrow deliverable | Measurable exit and reasons to stop |
| --- | --- | --- |
| **A / P0 — truthful StonkFun reliability and interval evidence** | Use existing Data Health V2 and readiness/C2 findings; produce a current dated evidence report under separately authorized read-only/operational scope. Diagnose scheduling, provider clock and persistence independently. Prioritize canonical mapping blockers in legacy null coercion/provider identity before any stricter reuse | If an hourly pilot is separately approved, reconcile **48 consecutive slots** against run/claim/provider/commit receipts with observed gaps, duplicates, failures and recovery explicitly counted; use the existing proving plan and never dispatch/activate from this strategy. Each current flow must pass existing source/raw/gap/reset/alignment policy or carry an exact withheld reason. 48 job successes alone do not pass comparison eligibility; absent shared boundaries/precision or source watermark remains a blocker |
| **B / P0 — offline canonical mapping** | Implement the reviewed draft vocabulary/validators and a pure StonkFun mapper in a separate PR using already retained permitted evidence; preserve V1 and #75 public outputs. Can proceed offline while A reports gaps | Golden replay of all four curated dated identities/capture hashes/units; all existing V1 output unchanged; documented unknown base decimals/program/entitlement/fee facts; zero network calls; all negative cases below pass. Owner approves schema and rights handling before any public field or endpoint |
| **C / P1 — one next-venue research spike** | Owner selects one venue/program version, one chain and one exact subject using source verifiability/rights/cost criteria. Produce a capability/semantics/rights report, not an enabled adapter | Proposed **unapproved ceilings**: ≤10 documentation GETs + ≤20 read-only data/RPC requests, ≤2 pages per source, ≤2 concurrent, ≤1 MiB/response, ≤5 MiB total and ≤30 minutes; no automatic retries or paid/keyed access. Provider rules may demand lower caps. Approval must set final caps before execution. Stop on rights/identity/cursor ambiguity, 429, scope drift or budget exhaustion. Deliver source URLs, dates/hashes, native/downstream mapping, fee/recipient distinctions, historical-depth limits and actual costs if known; unsupported is an acceptable finding |
| **D / P1 — authorized single-venue implementation** | One adapter and gated public projection only after C; explicit support flags and tiny reviewed read scope. Keep all unknown mechanisms/rights withheld; then a separately scoped UX/copy PR | Offline malformed/duplicate/outage/cooldown/migration/rights tests pass; no extra requests from unsupported/invalid searches; strict UI contracts and 320/390/1280px QA pass. Publish only after field/use permission and human review. Live provider proving requires its own request/cost authorization; no scheduler/workflow change piggybacked |
| **E / P2 — qualified comparisons across venues** | Evidence comparison for an explicitly named small cohort; no global leaderboard or holder-profit feature | Every pair passes exact reward asset/unit, actual/provider interval, compatible mechanism/stage/recipient/grain/config/finality/coverage and rights gates; sample/unknown denominator remains explicit. Withhold on any mismatch. Review calculation policy and claims independently; two source integrations do not imply comparable economics or ecosystem leadership |

Historical reconstruction is a gating dependency, not an assumed backlog completion: each relevant stage must record whether it has only provider lifetime reports, covered counter periods or a validated complete transfer sequence. Missing retained history, failed cursor completeness, absent program epochs/settlement signatures or unknown RPC depth/pricing prevents upgrading the evidence tier. The [#75 feasibility/rights report](../HISTORICAL_RESEARCH.md) remains the baseline. No new fee account, broad crawler, source-data purchase or wallet attribution is authorized here.

## Future tests and small reversible PRs

| Future test group | Required cases |
| --- | --- |
| Identity and mapping | Same ticker/different exact mint; same mint/different chain; several pools/quotes for one token; quote group versus exact pair; launch versus downstream market; reversed orientation; native versus wrapped asset; unknown/mismatched base decimals/program; config change/migration splits |
| Economic semantics | Trading/creator fees and funding descendants cannot be double-counted; LP versus holder eligibility; fee asset versus reward/quote; accrued/pending/claimed versus delivered; emissions versus fee revenue; buyback spent/acquired/disposition legs; aggregate payouts cannot populate holder returns |
| Scientific eligibility | Genuine zero versus null/empty/coerced values; exact integer precision; copied hash/body substitution; original versus refreshed capture times; provider/source age/future clocks; unequal lifetimes; misaligned periods; gap/reset; mixed units/grain; partial sampling; unrelated liquidity pool cannot support an economic claim |
| Source and rights safety | 404/429/503/deadline/outage, malformed body, size/admission caps, no redirects/arbitrary URL, unknown/unsupported feature makes no fetch; original cache clocks/warnings persist; incomplete/looped cursors; duplicate event legs across sources; missing finality; unauthorized/expired/revoked financial rights absent from HTML/RSC/JSON/OG/export/log/cache; no paid fallback or raw wallet exposure |
| Compatibility and presentation | Existing API fixtures and immutable edition replay unchanged; #75 output contains no financial quantities; exact selection persists and legacy links retain meaning; visible support/quality warnings, keyboard/disclosure/error behavior, text reflow, genuine mobile/desktop screenshots and human five-second test |

Proposed PR slices, not tasks started here:

1. **This PR:** new strategy Markdown only. Rollback: remove these files.
2. **A evidence / targeted integrity PR(s):** separately approved report or narrowly proven legacy validation fixes; preserve current contracts or explicitly version any necessary behavior. No new data source or operational activation. Roll back the individual change; retain genuine records and immutable editions.
3. **B offline schema/mapper PR:** unreferenced by live routes; tests over recorded permitted inputs. Rollback removes the new model/mapper; no data migration or existing reader replacement.
4. **Approved positioning/UX PR:** explicit copy/IA changes supported by current capabilities, with screenshots and existing API regressions; preserve legacy URLs. Can follow B review without advertising C/D support. Rollback restores presentation only.
5. **C report, then D adapter, then optional E comparison:** separate review boundaries. A capability goes public only after verified implementation and permission; rollback disables only the new capability, preserves receipts/config epochs, invalidates new public caches appropriately and retains independent StonkFun evidence. No blind overwrite of archived documents or source history.

No calendar promise or approved spend is inferred. Collection/Cloudflare/GitHub App stages remain owner-only under merged #77 and their runbooks. STORK-related conflicts are disclosed where applicable; treasury/community affiliation cannot change inclusion, order or proof requirements. Holder realized-return computation, trade execution, token launches, signing and treasury actions are outside these stages.
