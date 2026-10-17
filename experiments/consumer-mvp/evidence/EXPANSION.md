# Consumer expansion readiness v1 — #95

**Review only; production stays at exactly three.** Base main `f880e660` includes merged #93. The deployed consumer uses `index.ts` for SI/NVDAX, GP/GLDX and GROK/SPCXX. Those original entrypoint, identity, receipt, contract and preview files are unchanged. Unknown mints remain unsupported, including all three candidates below. Nothing is imported into `app/consumer`, and no provider reads, source activation or deployment occurs.

The useful next step is a small, provable enrollment decision, not broader unsupported claims. There are **16 rows** in the pinned retained candidate catalog, including the three consumer examples, leaving **13 outside current support**. This change independently rechecks three of those 13 against original registry, exact-quote catalog and reward-response bytes. **Zero additional records are presently authorized for consumer publication.** All three examined candidates have sufficient dated provider-identity evidence for owner review; none has current full identity/mechanism verification or cleared retention/publication/commercial rights. Other candidates are not silently imported or enrolled.

## Source and contract audit

| Existing source / boundary | Genuine evidence and value | Limit that prevents promotion |
| --- | --- | --- |
| Consumer engine, #89/#90 → #93 | Three exact reviewed base/quote mints, original October 14 clocks/hashes, metadata-only facts, withheld quantities, unsupported unknowns | `supported` means dated evidence exists; hashes are not provider signatures, rights or chain proof. Old `asOf` replay must not hide age. |
| `research/reward-candidates.json` | Version 1, activation disabled, 16 explicit base/quote/pool/unit/program identities, source packet indexes, rights unverified; file SHA-256 `7334efa7ccaaa8cf54d0eeb864cc407a0a4ca419dca92f94cab47467c957f7c6` | A candidate list is not current eligibility, broad discovery or enrollment authority. No new raw bodies or financial counters are copied. |
| Retained official `/api/public/v1/pairs` + exact-quote catalog | One returned registry array and bounded market-cap-selected first catalog pages. Exact quote filtering was checked against every returned row, not inferred from HTTP 200 | Registry is not full market coverage, legal backing or shares. Pages are non-atomic and incomplete; absence from the sample is not delisting. Same ticker can name multiple base/quote mints. |
| Official `/api/v2/tokens/{mint}/rewards` | Root `mint/mode/quote/basis/generatedAt`, matching quote decimals. Provider-token configuration, separate from the catalog pool field | Ledger basis and lifetime counters do not verify settlement, recipient rights, current epoch continuity or holder ROI. No fee split is inferred. |
| Native seven-token collector at this base | Existing `/api/public/v1/tokens/{mint}/rewards` v1 envelope, `meta.generatedAt`, original `observedAt`, quote identity and floating token counter. Latest retained clocks are October 17 around 19:28 UTC; KNOTS and SI overlap consumer review subjects | Different source/schema from v2. Does not carry the complete registry/pool/unit receipts needed here. Some local observation clocks are second-truncated and precede the provider millisecond clock. Cannot manufacture finer timestamps, exact raw v2 quantities or current full evidence from it. Seven-token allowlist and data stay untouched. |
| Official `/api/v2/rewards/launches` | Original packets 1 and 2 in the audit; same SHA-256 `18eceda986915ff0ce2f6f2a5e45b95260a527610a3127f03f37d119bae1091f` with and without `quoteMint=NVDAX` | The undocumented quote filter did not change the retained response. Global lifetime rows span asset units; this is not pair discovery, comparable rewards or a safe enrollment source. No cursor walk or numeric ranking. |
| Public API access / terms | Existing dated review in `docs/PAIR_DISCOVERY_COVERAGE.md` and `docs/HISTORICAL_RESEARCH.md`: September 18 terms; public API automation exception, limited informational access, no confirmed commercial redistribution license | No terms were re-fetched or accepted here. Public/no-key access, attribution, project license and hashes do not grant provider metadata, raw-retention or commercial/publication rights. Current terms and permission remain unknown. |

The original audit document is pinned by SHA-256 `4ff3c223122ca1479bade0e09889aa4837803cab137c26a9e714999a2ea0b50d`, original commit `df4e87658c5dd64fef9461d174333d824c8b1c7c`, path `docs/evidence/pair-reward-audit-2026-10-14.json`. `tools/expansion-captures.mjs` verifies both documents, each selected receipt hash/length/status/path, provider clocks, exact pool/mints/mode/program/decimals and sample scope. New `expansion-retained.ts` holds **metadata only**, with original microsecond clock strings and per-packet hashes; no copied financial totals. Independent response matching remains same-provider evidence, not independent on-chain corroboration.

## Three-candidate support matrix

Selection covers distinct exact quotes and a real ambiguity case; it is not based on returns or lifetime amounts. Source packet 0 is the shared registry, captured `2026-10-14T22:33:17.185179+00:00`, provider-generated `2026-10-14T22:28:32.776Z`.

| Candidate / exact base mint | Exact quote mint / units | Original catalog → reward capture (UTC, October 14) | Evidence/readiness and required next step |
| --- | --- | --- | --- |
| **KNOTS** `8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS` | Canonical STONK `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx`, 9 decimals, SPL Token | Packets 6 → 20: `22:33:42.204832` → `22:34:21.017218`; reward generated `22:34:21.003Z` | Dated identity/mode/unit verified; **stale, current mechanism unverified, public use blocked, not enrolled**. STONK has distinct registry mints; a different STONK cannot substitute. v1 collector overlap cannot refresh full v2 evidence. Need permission, fresh full receipts and explicit exact-mint enrollment review. |
| **OWL** `68AGsjomsgTtiTaDhF6XGCeVJDnFeh415ngYYgVxGzns` | SPCXX `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8`, 8 decimals, Token-2022 | Packets 5 → 16: `22:33:41.071614` → `22:34:16.378211`; reward generated `22:34:16.363Z` | Dated identity/mode/unit verified; **stale, current mechanism unverified, public use blocked, not enrolled**. Shares a quote with GROK; does not share its identity, payout history or stock rights. Need permission and fresh subject-specific evidence. |
| **SHOGGOTH** `CgBR5onYw5Z37YdCq2t77oxzQu4wVpof8GngowGzsHnL` | NVDAX `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh`, 8 decimals, Token-2022 | Packets 3 → 10: `22:33:38.653731` → `22:34:09.483812`; reward generated `22:34:09.469Z` | Dated identity/mode/unit verified; **stale, current mechanism unverified, public use blocked, not enrolled**. Name is not unique identity; current first-page membership is unknown. Need permission and fresh subject-specific evidence; sample absence must withhold, not imply nonexistence. |

All exact catalog pool identifiers and full source clocks/hashes are in `expansion-catalog.ts` / `expansion-retained.ts`. Provider pool identifiers are not independently authenticated on-chain pool accounts. Quote decimals do not establish base decimals. NVDAX/SPCXX labels do not prove reserves, price tracking, redemption or underlying share ownership. KNOTS does not confer rights to another asset merely through its quote relationship.

## Separate, inactive contract

Agent A continues using the original consumer engine. No simultaneous UI integration is requested. A later reviewed UI can inspect this separate entry point:

```ts
import {
  reviewExpansionCandidate, evaluateFreshnessTranscript,
  type FreshnessTranscript,
} from "../evidence/expansion";

// Omission of offlineReview returns inactive before inspecting the transcript.
// Explicit offline review still cannot authorize source access or publication.
const review = reviewExpansionCandidate(candidateMint, {
  offlineReview: true, asOf: "2026-10-17T20:00:01Z",
});
// review.state === "blocked"; publicExplanation === null; original clocks remain stale.
// evaluateFreshnessTranscript(candidateMint, offlineTranscript, options) is rehearsal only.
```

`expansion-contract.ts` versions results as `consumer-expansion/1`; transcripts use `stonkfun-identity-transcript/1`. Review covers only the three candidate mints; the transcript harness also recognizes the original three for future source validation rehearsal. Neither list modifies production support. Default result is `inactive`; malformed or unreviewed addresses are `unsupported`; unsafe inputs are `rejected` with fixed reason codes and no source payload. Valid candidate review stays `blocked` with explicit rights/owner/current-verification blockers and `publicExplanation: null`.

No approval boolean, environment flag, caller URL, transport callback or network enablement option exists. Outputs always report `activation: disabled`, `requestsMade: 0`, null financial quantities/holder return and no publication authorization. A valid transcript result says **`offline_validated`**, `currentMechanism: not_live_verified`, and `sourceAuthenticity: not_attested`; it cannot become a public source receipt or a fresh production explanation. Its supplied clocks are not independently authenticated. Original-source capture hashes are verified separately by the offline audit tool.

## Bounded freshness rehearsal

Permissions do not justify a live adapter. The implemented substitute is a pure, transport-free transcript harness. It exercises the smallest known complete source set for one reviewed subject:

1. `/api/public/v1/pairs` — at most 512 KiB.
2. `/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint=<reviewed exact quote>` — at most 128 KiB, no additional page or fallback.
3. `/api/v2/tokens/<reviewed exact base>/rewards` — at most 32 KiB.

Input bounds: exactly **3 receipts**, **688,128 body bytes total**, one subject, sequential/nonoverlapping intervals, at most **3,000 ms per receipt / 9,000 ms batch**, no retry, all source/capture clocks at most **600 seconds** old and **zero future skew**, strict UTC calendars and preserved microseconds. Partial/redirect/HTML/error responses, 429/503, timeout/network-error outcomes, extra/missing requests, unapproved source paths, stale cache/provider clocks and version/schema changes fail closed. A first failure stops before later receipt access. Identity must match exact base/quote/pool, reward mode, program, units and genuine symbol ambiguity. Duplicate JSON keys, excessive nesting and nonfinite numeric syntax are rejected; source financial fields are never interpreted or projected.

New epoch/config/program-version fields, even nested, require separate review. A quote/mode/basis/unit/pool switch fails identity checks. Matching settings never establish a continuous reward epoch: `economicEpoch` remains unknown and `continuity` not established. No deltas, settlement, payout eligibility, fee split, prices or holder ROI are computed. Missing/null/simulated zero counters all remain withheld, not public zeros. Market information from other pools/providers is not substituted.

These are **transcript validation bounds**, not tested real HTTP timers or distributed rate admission. There is no live transport, timer/retry loop, authentication, browser proxy, endpoint or background refresh. Actual HTTP budget and persistent retention are **zero**. No caller can cause SSRF or API flooding because no I/O capability is supplied. A future live implementation requires separately reviewed actual abort/stream limits, body hashing, trusted acquisition clocks, per-owner/global admission across replicas, provider Retry-After/permission expiry handling and an approved deployment/access decision. This harness cannot simply be mounted as a live API.

## Broader discovery options, independent of the collector

| Route after separate approval | Exact-identity evidence path | Rights/technical blockers |
| --- | --- | --- |
| **Narrow official API candidate intake** | Retained OpenAPI excerpt documents catalog `q` search by name/symbol/mint. A future owner-approved request can submit one full exact mint, inspect one bounded page, reject every nonmatching mint, then verify quote registry and per-token mode. Direct source adapter can live in an extracted neutral product without using collector snapshots | `q` is search, not proven exact server filtering; quote binding, pool and mode still need receipts. Current prototype uses only the already-verified exact-quote query. New query/adapter version and provider permission required. No unknown token auto-enrollment or page walk. |
| **Independent Solana mint-account identity intake** | A separately approved read-only [getAccountInfo](https://solana.com/docs/rpc/http/getaccountinfo) response can pin the requested address, finalized context slot, returned owner program and raw-data hash. Strict SPL Token / Token-2022 **mint-account**, not wallet/token-account, decoding can establish initialized mint identity/decimals. User-supplied mints avoid global discovery crawling; inspect at most one mint per approved intake, then a separate owner enrollment decision | Feasible identity-only route; **no RPC response is retained or requested here**. Select/approve provider terms, quotas and source retention first; test exact program/layout/extensions and context provenance in another PR. Mint data does not establish name/ticker, quote pair, economics, legal stock rights or payouts. Those fields stay unknown until separately permission-cleared configuration/metadata evidence exists. No holder extraction, account scan or wallet access. |

The first route expands known provider-specific mechanisms without inheriting collector assumptions. The second offers neutral, broader exact-address research with a deliberately smaller identity-only claim, rather than pretending every mint has a verified pair/reward mechanism. RPC documentation links are review references, not a claim of new endpoint/access/rights verification. Neither route is enabled here, and neither promotes unknown inputs in the live product.

## Owner approval and rollback

The [permission draft](PERMISSION_REQUEST.md) is **unsent**. Access, transient processing, continued existing retention, new raw retention, nonfinancial metadata publication, screenshots/attribution, commercial use and expiry/revocation are separate unresolved permissions. No inferred legal clearance is encoded. Required pathway:

1. Owner reviews current terms and obtains a dated, attributable permission artifact for the exact provider, product, mints, fields, purpose, storage, attribution and public/commercial scope; record its hash, validity and revocation/deletion obligations. Unresolved/expired scope stops acquisition and publication. Do not attach raw financial material to the request.
2. In a **separate PR**, owner reviews the evidence/permission artifact and selects an exact mint subset (not a ticker). Approve an explicit one-off source budget, actual transport/clock/stream/rate controls and receipt retention. This issue supplies no authorization to make that proof request.
3. After that approval, prove actual trusted identity/freshness and source revision under the bounded grant. Review original source bytes and any epoch/unit changes. If a mint left the bounded sample, withhold and approve a new exact-query plan rather than crawl. Do not reuse v1 history or old clocks to make a fresh result.
4. A separate enrollment/consumer-contract PR may add permission-appropriate dated or current identity facts after acceptance tests. Name exactly what remains unknown. Default list stays at three until that PR is human-approved/merged; live source access/hosting needs its own explicit authorization. Financial figures and holder ROI remain outside this expansion scope even if metadata permission is granted.
5. Roll back on rights expiry/revocation, identity/schema/epoch drift, stale clocks, unexpected cost/traffic, rate/error/timeouts or source-hash mismatch. Keep approved audit material only per granted retention; withdraw new public facts when their evidence/permission expires. Never silently serve old evidence as current or rewrite source dates.

Current rollback: close the unmerged PR or revert only these experiment additions and the focused test-script lines. The production three, UI, collector, seven-token allowlist, snapshots, archive, API, infrastructure and credentials need no restoration. Tests: `bash experiments/consumer-mvp/evidence/test.sh`; see `VALIDATION95.md` for full local validation. Day 2 consumer integration, source-rights decisions and any live proof are deliberately **not claimed** by this offline work.
