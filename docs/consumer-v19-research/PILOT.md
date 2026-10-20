# Smallest subsequent genuine-data pilot — NOT activated

No new collector, schedule, provider integration, credential, paid plan or production setting is implemented. Existing API discovery budgets are unchanged. A pilot needs explicit owner approval after access/timing/rights are established; elapsed agent time or a public endpoint is not approval.

## Stage A: qualify a source before accumulating anything

Owner/provider decision required on: permitted automated GETs, transient processing, raw/derived retention duration, source/hash metadata retention, display/redistribution/commercial use, attribution, correction/takedown, and any plan/account constraints. Obtain a provider reference or written permission. Do not infer rights from an open endpoint or old terms snapshot.

Resolve access to a documented timestamped price source without bypassing a 403. Ask the source owner for actual timestamp/quote-unit/cache semantics and exact-pool support. The audited StonkFun snapshot has no actual market clock; **polling it hourly cannot satisfy this policy**. Gecko API/docs access and OHLC semantics were unavailable; Dex exact-pool access was denied. No paid access or new credential is approved. Stop qualification if it requires one; document options for the owner.

Validate exact base/quote/pool, network, price units, numeric precision, supply/cap methodology, volume windows, stale/empty-bar semantics and source rights. Completed hourly candles require their own reviewed bar adapter, not re-labeling as actual ticks. Do not fetch 25 purported historical bars and call them verified under this point contract. No snapshot-retrieval-time substitution.

## Proposed public sample (operator review, not recommendations)

These two exact identities appeared in the **single** official CARDS-scoped first page at 2026-10-20 07:39:52Z. Names are source labels, not trademark/backing claims. Selection is convenience/provider market-cap bias, not performance or investability. Reverify exact registry/pool continuity before starting.

| Source label | Base mint | Pool | Exact quote |
| --- | --- | --- | --- |
| PowerGacha / GACHA | `5NervA6LyRtqeacVug3wint61ExBJn2paE7xG3iPW9Tv` | `6CvFE14WUwKkQv1WchdPmbde6Urq7EWofaJcE8ZVUVBZ` | `CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp` |
| POKÉMON CARDS / POKEMON | `B5ANwoWkptDv1QszdPHXjCF2gTWdo27FGLffdfXzzoe6` | `6DshxMmroJb9ZFhpRcRfWtBtC2ftVWZzbQkm3hxeJDdg` | same exact CARDS mint |

No founder/private candidate or portfolio is part of this pilot. No default public watchlist is created. Do not substitute ticker matches, other pools or changed launch migrations.

## Stage B: separately approved bounded acquisition

Only after Stage A and review of a genuine source adapter:

* Operator-run, isolated research capture, not the production collector/scheduler. Approve a storage location and deletion/retention policy; append immutable bytes/metadata only where permitted. No database/RPC/Helius activation.
* Two fixed pools, one documented actual observation at each common hourly boundary T0…T24: **25 observations/pool, 50 price GETs over 24h**, plus initial/final registry verification (2 GETs), **52 GET maximum**, excluding qualification probes. Provider must actually supply those common actual boundaries; receiving requests near an hour is insufficient. If it cannot, revise the contract/pilot in review rather than interpolate or weaken gates.
* No retry loops. Space independent pool requests; never burst to catch up missed slots. Respect the lower of provider plan/rate headers and the approved cap. On 429 honor Retry-After and stop the comparison window for review; no new provider requests after a permission denial. The audited 300/min public StonkFun limit is context, not authorization for another provider or a request increase.
* Capture exact URL, requested/received UTC, HTTP status, selected cache/rate headers, provider-generated time, **actual market time**, exact token/quote/pool/network, original decimal text, body SHA-256 and source revision. Actual price timestamps, window/cadence, gaps, cache lag and failures must be auditable separately. Do not persist secrets, wallet data or portfolio positions.
* Run offline eligibility only after T24; any missing/misaligned/stale/unsupported point withholds the two-token comparison. One passing day is neither ecosystem coverage nor proof of reliable scheduling/predictive momentum. No financial publication until independent rights approval even if arithmetic passes.

**Stop conditions:** 401/403; credentials/payment/plan change; undocumented timestamp/quote units; changed base/quote/pool/network; source corrections or numeric overprecision; stale cache/future clocks; missing point or pool migration; 429; response/body/time cap; source terms changes; unexpected payload; budget exhaustion; incomplete rights. Preserve permitted failure metadata, withhold results, do not automatically repair/backfill or add another provider.

## Owner decisions and rollback

Approve source/rights first, then exact two-pool budget and storage, then adapter and operator-run procedure, then publication separately. No decision is implied by this PR. If all candidate sources remain untimed/inaccessible/unlicensed, stop at the current genuine insufficiency report. The next authorized action is **source qualification/rights resolution**, not collection activation.

An approved research pilot should stop simply by ceasing manual captures and deleting local artifacts according to the approved retention policy. This PR adds no services to disable or infrastructure to roll back. Existing collection, Cloudflare `ACTIVATION=disabled`, App controls and Agent B's systems remain untouched.
