# Homepage publication review — issue #92

Reviewed 17 October 2026 against main `b6ccd1d91fd2570b96f87ca430af73d85be83ce0` (merged #90/#91). This is a field-level engineering review, **not a license or legal clearance**. No provider, terms-acceptance, wallet, RPC or account request was made. The existing production deployment/content was not independently inspected in this review; “existing” below means the public main source and its public projection, not a claim that a particular Vercel deployment served it.

## Exact disclosure decision

Issue #92 explicitly requests provisional metadata-only reuse. The homepage needs no new source-derived financial fields or raw bodies. It reuses the same three identities, receipts and authored explanations committed in #90/#91. The engine is imported directly from `experiments/consumer-mvp/evidence/`; no vendored copy, new capture, refresh, registry expansion or rights override is introduced.

| Proposed field | Already in public main | Homepage decision |
| --- | --- | --- |
| SI/GP/GROK names, exact base and NVDAX/GLDX/SPCXX quote mints/symbols | Engine `catalog.ts`, `listSupportedMints()`, historical source-index public projection; supported identities in engine README | Reuse only those three exact records; no ticker aliases, logos, provider descriptions or registry enrollment |
| Authored two-sentence explanation and ownership limitation | #91 `src/model.mts`; source-aligned facts in #90 `index.ts` | Reuse. Holding a base token does not mean holding its quote, equity or gold; no redemption/payout entitlement claimed |
| Reward-mode configuration at capture | #90 `economicMechanism.settings`, same-provider catalog/reward identity cross-check | Dated provider setting only; not chain proof, delivery, eligibility or returns |
| Original capture/provider-generation dates, source URLs, receipt/document hashes, evidence commit | #90 `SourceReceipt`, #91 disclosures; reward receipts also in `publicHistoricalResearch` | Reuse exact strings; identify mutable official endpoint links; never load them automatically |
| Retained document link/raw provider JSON | Already in public Git evidence, and linked in #91 prototype | **Omit raw-capture link and body from homepage**. Hash/commit text is enough for this view. No new copy/download endpoint |
| Provider lifetime distributions, interval amounts, liquidity/volume, prices, payout counts or sample-population totals | Some older offline audit/API surfaces contain quantities; new engine explicitly withholds them | **Do not import, render, serialize, bundle, screenshot or release them here**. Engine quantity values remain null; prior exposure is not permission |
| Holder cashflows, ROI, APY, earnings/yield ranking | Not established by evidence | Unavailable; no calculation, inference, substitutes or marketing promises |
| Public/commercial license, backing, issuer affiliation, enforceable ownership/redemption rights | Not established | Never assert; keep provisional metadata/retention/publication warning and prominent financial withholding |

Additional homepage exposure is **placement and accessibility of this existing metadata-only explanation**, not a new data product or permission determination. The original engine's explicit `permission: unverified`, `publication: metadata_only`, `financialQuantities: withheld` states are preserved. `metadata_only` is a projection description, not an exemption from provider terms. No hidden query, environment variable or owner checkbox releases amounts.

## What is unresolved

The dated review in [Historical Research](../HISTORICAL_RESEARCH.md#rights-and-retention-decision--blocked-not-inferred) cites terms updated 18 September: a public API/documentation automation exception (section 9) and restrictions on exploitation/redistribution beyond limited informational access (section 8). A public developer-guide GET on 15 October did **not** establish a commercial license; the terms modal was not revalidated. API availability, a hash, attribution, public Git history, noindex or withholding amounts does not establish permission. This PR does not claim current terms were fetched or that pre-existing retained raw records are cleared for commercial use.

**Owner decision before merging into an auto-deploying production branch:** record whether the exact provisional, non-paid identity/receipt/explanation fields in the table may remain publicly presented on the existing site, and resolve any current terms/retention obligations with the provider/adviser. Record reviewer/date, permitted purpose/fields, attribution, retention duration, expiry/revocation and takedown procedure. The founder's instruction authorizes this scoped code preparation; it cannot grant a third party's rights. There is no new permission receipt in this PR.

If the owner/provider review identifies a material restriction on even these metadata fields, **do not merge or publish this homepage**. Leave the feature branch unmerged and seek a field-specific permitted source/consent; do not ship a generic “metadata is licensed” assertion, remove warnings, substitute invented data, or rewrite immutable Git evidence autonomously. Any financial figures, broader records, commercial redistribution or new source acquisition require a separate permission-backed review/change. This scope deliberately has no dependency on any such disclosure.

## Verification boundary

Root regression tests reject promoted numeric quantities, rights, exact-quote substitution, settlement or holder entitlement. The original engine's offline receipt suite replays hash-pinned genuine evidence. Production-browser tests inspect actual HTML/RSC and homepage JavaScript assets for restricted financial payload markers, verify original clocks, no raw-capture links, stale/rights warnings and zero automatic provider requests. Screenshots contain only this allowlisted metadata. Passing these checks verifies the implemented withholding, **not legal permission**.
