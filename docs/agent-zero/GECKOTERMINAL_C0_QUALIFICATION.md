# GeckoTerminal C0 provider qualification — documentation review

**Decision: BLOCKED — current official documents could not be retrieved.** Review date: 22 October 2026 UTC. This is not a finding that the provider prohibits private research. No permission, current price/entitlement or deletion rule has been established. The six-request market-data experiment remains **unstarted and unauthorized**.

Scope: update draft #151 only; review official documentation/terms, reconcile rate claims conservatively, and prepare an unsent inquiry. No provider market-data/API request, account/key request, terms acceptance, provider contact, source activation, trading, deployment or merge.

## Dated citations and access evidence

At **2026-10-22 02:38:41 UTC**, four independent documentation-only HTTPS requests through the configured environment proxy failed with `Tunnel connection failed: 403 Forbidden`. No origin HTTP status, page content, terms version/effective date, body hash or clause text was obtained. These are **proxy CONNECT failures**, not API-origin 403s or evidence that a provider was down. No alternate host, access-control bypass, market endpoint or API experiment was used. [Machine-readable receipts](geckoterminal-c0-document-receipts.json) preserve exact times and attempted official URLs.

| Official review target | Retrieval result | What remains unverified |
|---|---|---|
| [GeckoTerminal API guide](https://apiguide.geckoterminal.com/) | Proxy CONNECT denied; no page | Current public-access limits, anonymous API entitlement, exact endpoint/bar semantics, linked FAQ/terms |
| [CoinGecko documentation](https://docs.coingecko.com/) | Proxy CONNECT denied; no page | Which approximately-10/min or 30/min statement applies to which product, account/host and plan; licensing guidance |
| [GeckoTerminal website terms target](https://www.geckoterminal.com/terms) | Proxy CONNECT denied; route/canonical terms link not confirmed | Current website terms, API incorporation, legal entity and applicable agreement |
| [CoinGecko website terms](https://www.coingecko.com/en/terms) | Proxy CONNECT denied; no page | Website versus API/data licensing terms, commercial restrictions, retention/deletion and derivative/publication rights |

These links identify official-origin review targets; they are **not substantive citations to text read today**. Once access is available, follow the site's actual current API/website licensing links and record titles, canonical URLs, retrieval times, effective dates and bounded supporting quotations. Do not infer API rights solely from website informational-access terms. `support.coingecko.com` is also needed if current official licensing guidance is linked there. The owner has been asked for documentation-only network access, not API access. Earlier October 20 transport denials and the original proposal's unknown-rights state do not substitute for current documents.

## 30/min versus approximately 10/min

The two numbers are **founder-supplied claims for investigation**, not independently verified current quotations in this review. A product/plan/host distinction, changed page or traffic-dependent anonymous limit could explain the discrepancy; none is established from unavailable text. Do not choose the larger figure or claim the discrepancy is factually resolved.

Operational resolution pending confirmation:

- Treat **10 attempted requests per rolling 60 seconds** as the stricter provisional ceiling, never a guaranteed entitlement or target throughput. Apply the lower of that ceiling, documented entitlement and any provider instruction. Include failed attempts and other consumers sharing the provider's IP/account quota.
- Keep the proposal's lower operative cap: **six attempts total for C0, at most six per rolling minute, serial dispatch at least ten seconds apart**, with no reset on restart. No production/multi-replica limiter is implied. Actual attempts remain zero.
- Stop on 429/Retry-After or any access/entitlement uncertainty. No quota-pressure probe, catch-up burst, endpoint switch or identity rotation. Even six low-rate calls require source-use permission and separate owner authorization.
- Do not transfer CoinGecko Demo/Pro/onchain plan limits or licenses to anonymous GeckoTerminal `/api/v2` without a provider statement naming the relevant host/product. A low proposed request count does not establish free access or retention permission.

Provider confirmation needed: the applicable anonymous-host limit; whether 30/min and approximately 10/min refer to different products/plans; shared-IP versus key/account scope; whether every error consumes quota; burst/rolling-window behavior; traffic-dependent reductions; monthly or credit limits; and whether an account/key/paid plan is required for this intended use. The $0 purchased-service target remains a constraint, not a verified price quote.

## Use-specific rights decision

| Intended use | Current disposition | Exact clarification required |
|---|---|---|
| Private internal founder/SCOUT research | **Not established** | Is investment-oriented internal/personal-treasury analysis allowed under the relevant free API license, even with no public data display? Does it count as commercial/competitive use? |
| Retain new-pool and completed OHLCV observations | **Not established** | Automated access and private raw/normalized numerical retention, including original timestamps, units and hashes, for the proposed 90-day audit period; cache/storage and backup limits |
| Derive activity/persistence research tags and statistics | **Not established** | Whether calculation, private use and retention of derived indicators are permitted; any competition, transformation, aggregation or redistribution limits |
| Long-term decision records | **Not established** | Whether decisions, source references/hashes and derived numerical facts may be retained beyond raw-data expiry; duration/backup limits and whether any data remains provider-controlled after derivation |
| Eventual public/commercial reporting | **Withheld** | Required plan/written license, permitted derived summaries versus raw data, screenshots/charts, attribution/linking and restrictions on consumer intelligence or treasury-performance reporting |
| Deletion, revocation and corrections | **Unverified** | Source-specific expiry, termination/takedown duties, normalized/derived data and backup treatment, permitted immutable metadata/tombstones and correction obligations |

Private use, public availability, no-key access, a generic commercial-use statement or attribution alone cannot establish all these permissions. “Private” is not assumed to exempt investment-oriented activity. No perpetual decision-ledger retention is asserted: keep licensed numerical payloads in expiry-controlled private blobs, retain only specifically permitted long-term metadata/decisions, append permitted expiry events, and withhold results after underlying evidence expires. Do not embed provider amounts in evergreen decision text without matching permission. Hashes cannot restore deleted source evidence or confer rights.

## Concise provider inquiry — prepared, not sent

> Subject: GeckoTerminal API limits and private Solana research/data-retention permission
>
> We are evaluating UNFARMD/SCOUT's private, read-only Solana research. Before any data requests, please identify the agreement and entitlement governing anonymous GeckoTerminal `/api/v2` new-pool, exact-pool and completed one-minute OHLCV reads. Our proposed source-qualification is six GET attempts total, serial ≥10 seconds apart and ≤6/minute, with no credentials, public display or trading execution. Any extended study would require separate owner approval.
>
> 1. Which published 30/minute versus approximately 10/minute limit applies to this host/use? Please confirm IP/account scope, error counting, traffic/burst/monthly limits, whether free anonymous access is available, and whether an account or paid plan is required.
> 2. Is private internal investment/treasury research permitted, including derived activity/persistence indicators? May we store original timestamped new-pool/OHLCV responses and normalized observations privately for 90 days for an evidence audit?
> 3. What decision records, hashes, source metadata and derived numerical results may remain long term? What expiry, deletion/revocation, corrections and backup obligations apply?
> 4. What separate license/plan and attribution would eventual public or commercial derived reporting require, including consumer intelligence, charts/screenshots and performance research? Please identify any competitive-use or redistribution restrictions and provide the applicable current terms/version or written permission.
>
> We will keep acquisition and public financial output disabled until this is resolved. Please provide documentation/permission, not credentials or API keys.

No inquiry has been sent, account enrolled, fee accepted or provider terms accepted on the founder's behalf. The inquiry is a review artifact; sending it requires explicit owner instruction.

## Release and next decision

**BLOCKED** at the documentation/permission gate. Current official-document review is incomplete because of environment access. After documents are obtained, use **NEEDS PROVIDER CONFIRMATION** if any applicable license, retention, commercial-use or limit ambiguity remains. GO could cover only a later owner-authorized, bounded C0 data probe after those gates pass; it would never activate the probe automatically or establish performance/price accuracy. No six-call packet experiment or technical source qualification has occurred.

Required next evidence: current official documentation and applicable API/website terms; dated rate-limit/product reconciliation; a recorded use/retention decision or written provider clarification; and separate owner authorization if a data probe is later requested. Preserve the existing six-call/$0 caps and all source gates. No changes to Agent B, #150, collector, API, credentials, production or treasury.

Verification: local TypeScript, lint, optimized production build and archive append-only check passed. Documentation-only receipt states and local references were checked. Root regression CI is reported in PR #151; no runtime test, source probe or screenshot result is invented.
