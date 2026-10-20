# Deterministic concern rules and evidence boundaries

`app/consumer/trader-model.ts` consumes a **validated consumer MintView**, not arbitrary provider JSON. `OnchainCheck` uses the unchanged shared MintFactsV1 projector; its observer supplies that accepted view to `TokenResearch`, without another RPC/API request. The concern helper also independently checks evaluation time <= original expiry and >= checked time minus existing 1s clock allowance. Expired, loading, disabled, unsupported, denied, malformed, unknown-source and synthetic-in-production results produce no token-specific concern. Expiry and tab-focus/visibility rechecks remove accepted controls; no refresh is fabricated.

| ID | Exact trigger | Plain meaning / qualification | Evidence retained per finding |
| --- | --- | --- | --- |
| `mint_authority` | Accepted `facts.mintAuthority.state === present` | Reviewed standard layout: “Supply can increase” through that standard authority. With unreviewed extensions: only “A minting control is present”; all issuance constraints remain unreviewed. No assertion anyone will exercise it. | `facts.mintAuthority`, state/address, exact mint, original finalized slot/checkedAt, endpointHost, responseSha256, offline classification |
| `freeze_authority` | Accepted `facts.freezeAuthority.state === present` | A standard freezing control exists. Its presence does not identify the controller or prove abuse. Other extension controls/constraints may be unknown. | Same source fields, exact `facts.freezeAuthority` state/address |
| `extensions` | Accepted `facts.extensions.assessment === unreviewed` | Additional Token-2022 issuance/transfer/freezing rules are not fully reviewed, including when standard authorities are absent. Extension names are shown as source labels, never decoded into guessed powers/fees. | Exact assessment/names plus same original source fields |

No standard authority and no unreviewed extension produces **no triggered item**, with “Standard authorities absent; other risks unknown.” It does not say safe, risk-free, transferable or sellable. The shortcut count measures the three possible review items, not a numeric safety score, severity, number of all extension controls or predicted loss. No comparison/rank/recommendation is attached.

The source slot is `getAccountInfo`'s finalized context, not block time or the last account change. `checkedAt` remains host UTC; `slotTime` remains null. A response hash identifies bytes, not a signature, project identity, economic entitlement or independent chain replay. Mint authority can be a PDA/multisig or ordinary address; no new wallet RPC identifies who controls it. Exact supply does not imply float, holder count or investor allocations.

## Independent market states

`MarketEvidence` reuses existing `readWatch` and `watchReport`, with a generation/abort guard. It requests only `/api/token?mint=<exact>` and never passes a source URL/auth field. Existing server provider selection/cache, browser client timeout/size/status parsing and tab-local cooldowns remain unchanged. New lookups do not bypass that shared backoff. Retries are explicit; a local 1s timer updates labels only.

| State | Consumer behavior |
| --- | --- |
| Loading | No market/price claim; independent onchain result may complete. |
| 429 / 503 | Paused/unavailable; original existing retry deadline is honored; no background retry. Unsupported/indefinite waits require review. |
| Denied / failed / HTML / incomplete / wrong identity | Unavailable or unverified; no old result promoted or default quantities. |
| Exact base match | One provider-reported pool and unverified provider label, not full coverage, project authentication or economic endorsement. |
| Exact quote-side match | Another base asset's market. Never inherit its name, cap or changes; this remains true after response aging. |
| No match | No pool returned by this adapter; not proof of invalid mint or no other markets. |
| Future retrieval >1s / self-pair / pool aliases asset | Identity/clock unverified; pool metadata withheld. |
| Retrieval >60s old | Dated **response**, retaining original identities/role/time; never called a fresh market observation. |

The underlying API's actual market clock is missing in every case. Financial values are stripped, including synthetic prices intentionally injected by tests. Rights are separately unverified and cannot be enabled through returned metadata or URL parameters. USD snapshot amounts are not exact quote-relative performance; market cap has no validated circulating-supply definition. No liquidity/volume/red-price-change concern is generated without qualified data/rights. Holder concentration, insiders, LP control, sellability, distribution and returns remain explicit unknowns in all states.

## Synthetic boundary

Only test code/harness injects ports or fulfills same-origin responses. Production has no fixture route, environment switch or query override. `trader-fixtures.mjs` is explicitly invented offline data; production-discriminator replays are labeled in the visible browser QA banner. They test the unchanged real contract shape/validation, not a live Helius/provider response. Existing `synthetic_fixture`, `recorded_response`, missing or development acquisitions remain rejected in production. No test data enters an application default or retained public-source dataset.
