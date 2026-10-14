# Issue #46: independent verified quote registry search

Agent B backend work from main `156c9be`, including merged PR #44. No frontend files or PR #45 changes. The [proposed typed contract](https://github.com/fuzzysniper/scout-stonk-intel/issues/42#issuecomment-6175805595) was communicated before implementation; Agent A can adopt this endpoint in a follow-up after human review without blocking its existing work.

## What the official source actually returned

One bounded bare GET of `https://www.stonkfun.xyz/api/public/v1/pairs` at `2026-10-14T18:43:15.680788Z` returned **587 unique mint identities**, not 587 memecoins. Its unpaginated `data.pairs` array came with `selectBy: mint`, `ambiguousSymbolCount: 25`, `standardV2Enabled: false` and `meta.generatedAt: 2026-10-14T18:43:11.045Z`. There was no count/total/page/cursor/continuation field. Full received body: 226614 bytes, below the 512 KiB research limit.

The registry's 25 case-insensitive ambiguous ticker groups cover 63 records. There are 20 exact-case duplicated symbol groups, so case variants such as xBTC/XBTC, Link/LINK and chrome/CHROME must also be disambiguated. Name matching finds 17 duplicated normalized name groups; names are never identity keys. Unicode labels include 熊猫, モモ太 and BOIÚNA. All identity/program/decimal/text records were validated; duplicates are not collapsed.

The inspected OpenAPI 2.0.0 describes an unpaginated registry with category/launchable/launchLabReady/communityMode filters, not registry search or paging. SCOUT deliberately requests the **bare endpoint**, preserving all returned identities, including records without a current launch permission. Registry membership does not establish launch readiness, a particular token market, economic exposure to the named equity/metal, reward eligibility, onchain reconciliation or comprehensive token coverage.

HTTP headers in this probe reported `Cache-Control: public, max-age=30`, Age 4, v1 limit 300/minute, remaining 291 and reset 1792003440. Remaining quota can reflect other requests sharing the IP; it is not SCOUT-only usage. The guide documents per-IP v1 reads 300/minute and ordinary v2 reads 240/minute, CDN-hit exclusions and 429 Retry-After. No real 429 was induced. The new endpoint never requests token pages, rewards or history.

## GET /api/pair-quotes

This is local server search over one validated official registry response. It is independent of the first 50-token sample and PR #44's bounded pair-scoped token discovery. Client input never chooses an upstream URL, path, provider filter or regular expression.

| Parameter | Accepted semantics |
| --- | --- |
| query | Optional, at most 64 Unicode code points before/after normalization; trim, NFKC and Unicode lowercasing for literal symbol/name substring search. Empty/whitespace query lists a page. A canonical full mint selects that exact mint with its original case; partial/noncanonical mint text is not a mint alias. |
| mint | Optional canonical Solana mint, exact/case-sensitive, no surrounding whitespace. Mutually exclusive with the query parameter, even an empty query. |
| limit | Canonical decimal integer 1–100, default 25. No leading zeros, exponent, sign or clamp. |
| offset | Canonical decimal integer 0–1024, default 0, over the filtered/sorted registry snapshot. |

Unknown/repeated/mixed parameters, control/unpaired-surrogate queries, overlong input and invalid numeric/mint syntax return 400 before source access. Encoded query-string length is also bounded to 2048. A literal `+` must be percent-encoded under normal URL semantics. No cache-bypass option or query-specific upstream request.

| HTTP | Meaning |
| --- | --- |
| 200 | Available/cached registry matches, including genuine zero text matches or an empty offset window |
| 400 | `{error: string}` parameter error; no provider access |
| 404 | `status: not_found` only for an explicitly selected mint absent from the validated provider registry; not a claim of asset absence everywhere |
| 503 | Unavailable source; empty result array with **null** registry/match counts and provenance, not a healthy empty registry |

All exported GET responses are `Cache-Control: no-store`; no write handler is exported. A canonical full mint supplied through query has 200/empty on no match, consistent with text search; mint explicitly requests membership selection and can return 404.

## Exact typed interface for Agent A

Canonical public types are appended to [lib/pairs-contract.ts](../lib/pairs-contract.ts): `PairQuote`, `PairQuoteSearch`, `PairQuoteRegistry`. Existing PairCatalog types/fields and all `/api/pairs` query semantics remain unchanged.

- Root: `schemaVersion: 1`, status=`available | not_found | unavailable`, search=`{query,mint,offset,limit}`, quotes=`PairQuote[]`, optional sanitized error. Search echoes normalized text, or original-case full-mint text with resolved mint; explicit mint has query empty.
- Each quote: quoteMint, quoteSymbol, quoteName, decimals, tokenProgram, symbolAmbiguous, providerSymbolAmbiguous, symbolMatchCount, verification=`official_registry_only`, verifiedAt. No tokens, market values, scores, rewards, histories or returns.
- Provider ambiguity flags are preserved separately and checked against the full source's case-insensitive duplicate groups/count. Effective symbolAmbiguous/symbolMatchCount also account for NFKC-equivalent symbol labels. Counts consider the **full registry**, not just this page/search. Always select/key by mint, even when a symbol currently has a single match.
- Dataset: sourceStatus=`available | cached | unavailable`, fetchedAt=response time, dataFetchedAt=successful source-read/validation time or null, scope=`official_quote_registry`, provenance=`PairSource | null`. Provenance retains the fixed URL, retrieval time, provider envelope time and exact received-byte SHA-256 revision. verifiedAt is source validation time, not a blockchain or market tick time.
- Coverage: registryResponse=`validated_unpaginated | unavailable`, registryCount and matchedCount=`number | null`, returnedCount, responseLimit, nextOffset=`number | null`, resultTruncated=`boolean | null`, providerAmbiguousSymbolCount=`number | null`, tokenCatalogComplete=`false` always.

`validated_unpaginated` means the entire bounded HTTP response was received and its array/identities/ambiguity assertions passed validation. The provider supplies no independent registry total or completeness proof. It does **not** mean every crypto asset, every historical/launchable quote, or every token/pool is independently accounted for. Hidden omission of otherwise-consistent records cannot be disproved from this API alone. No universal complete=true field is introduced.

Order is normalized symbol then exact mint using deterministic UTF-16 lexical comparison, never market/reward ranking. nextOffset is the next result window, or null. resultTruncated means this window omits any matches, including earlier offsets; the final page can have nextOffset=null while resultTruncated=true. Pagination across a source refresh is not an atomic multi-request snapshot: compare provenance.revision and restart if it changes.

After approval, frontend follow-up:

1. Debounce registry search, keep responses bounded and handle source errors distinctly from empty search. Use import type from the canonical contract; do not ship the full registry as a client bundle/fallback.
2. Display original labels plus mint disambiguation; render provider labels as text. Preserve common dataset provenance when showing identity evidence. Never merge case/Unicode-equivalent tickers into one identity.
3. Select quoteMint, then use the unchanged `/api/pairs?quoteMint=<mint>&discovery=pair` for bounded token discovery. This step has PR #44's independent admission/cache limits. Empty token pages mean **“No matches within bounded sample,”** not no coins exist. Registry results do not unlock reward/return comparisons.
4. PR #45 can continue using its current API/contract; no integration is made in this backend branch.

## Source quality, cache, cost and shared cooldown

Registry source makes **one fixed HTTPS GET** per refresh: 512 KiB streamed byte cap, 1–1024 records, a three-second whole fetch/body deadline, strict UTF-8/JSON, HTTP200/application-json only, no redirect, no partial Content-Range/206 or Link-next response. Explicit page/continuation/partial flags, inconsistent declared totals, empty/malformed/duplicate/noncanonical identities, unknown token programs, invalid decimals/text or ambiguity conflicts reject the whole response. The source does not silently clip records or crawl another page.

One five-minute cache/pending promise serves every search/list/mint/offset; queries do not allocate separate provider readers. Warm calls keep their original source timestamps/revision. Provider envelope age over three hours, future time over one minute or transport age over five minutes fails verification. Expired source failure has no stale/curated fallback; counts become unknown. Non-rate failures retry no sooner than 60s. There is no polling or background refresh.

The new reader uses PR #44's shared provider fetch/cooldown with global and scoped pair readers.429 numeric waits up to 3600s are honored, missing Retry-After defaults 60s, unsupported/long/date-form delays pause the instance rather than shortening a wait. Already-valid cached identities can be served without network access. Invalid/excessive client queries never bypass these controls. Tests coalesce 100 concurrent different searches into one fixed GET and check cross-reader cooldown in each direction.

Cost addition: at most one registry GET per five minutes per process in healthy operation, with at most one failed attempt/minute before any longer shared cooldown. Search work is bounded by 1024 records and 100 returned identities. These are process limits, not a distributed IP quota; replicas/other consumers can share provider limits. Existing global/scoped token request budgets and contracts are unchanged. No new dependency, paid provider, database, collector or scheduler.

## Access terms and publication limits

Four bounded official documentation/source GETs were made: bare registry, current guide/OpenAPI, and the Terms module referenced by that guide. The current Terms module retained the September 18, 2026 version and the same byte revision inspected during #43. Section 9 excepts automation through the published public API/documentation and prohibits rate abuse/access-control circumvention. Section 8 grants limited informational access and reserves further exploitation/redistribution rights. Public/no-key API access is not an unrestricted commercial data license; the current guide/OpenAPI supplies no separate redistribution entitlement or SLA. Broader commercial publishing/retention permissions remain **unknown and require owner review**. No terms acceptance/signing or private wallet/holder endpoint was used; full documentation/software copies are not committed.

## Genuine production-build proof and checks

At `2026-10-14T18:59:52.424450Z`, the local production API's STONK query returned200/no-store, registryCount 587, matchedCount 8: three exact STONK symbols plus five name/substring matches. All three STONK identities have symbolMatchCount 3. Subsequent Unicode 熊猫/boiúna, exact distinct-STONK mint, zero-match text and offset 500/limit 100 requests used the **same cached source revision/time**. The late list page returned 87 of 587 matching registry identities; nextOffset=null/resultTruncated=true correctly retained the bounded-window distinction. No token/reward/history source was called by this endpoint.

The captured source had providerGeneratedAt `2026-10-14T18:58:12.189Z`, retrieval `2026-10-14T18:59:52.402Z`, revision `sha256:c9582e3ead7f5cc38aaf45c38307608d27da05522f8526c7af8c6edd615e892a`. These are separate times, not invented live market observations. The source manifest and exact-mint response follow below.

All required checks passed: `npm ci --cache /tmp/scout46-npm-cache`; `npm test` (169 Node source/API/frontend regression tests, 62 Python tests, 15 existing local scheduler tests); `npx tsc --noEmit`; `npm run lint`; `npm run build`; `bash scripts/archive-tool.sh check origin/main`; `npm run archive:dry-run`. Archive replay/idempotency/tamper checks left working archives unchanged. Backend tests cover Unicode/case/name collisions, exact case-sensitive mint selection, query/pagination bounds, malformed/partial/oversized registry/transport, stale/cache/outage/recovery, byte provenance, excessive queries/concurrency and shared429 cooldown. Synthetic test fixtures are never app data or evidence of source behavior. An initial URL fixture used an unencoded plus; that fixture was corrected and the complete suite rerun.

Rollback: revert this backend commit/new route; no frontend or data migration. Risks: source semantics/counts can change; response validation cannot independently prove hidden-provider completeness; cache and rate state are process-local; broad publication rights need review. No merge/deployment/Cloudflare/collection activation performed by this work.

## Nonsecret source manifest

Hashes identify actual received bytes, not signatures, Git commits or independent onchain proofs. Documentary data is not an application fallback.

```json
[
  {
    "source": "https://www.stonkfun.xyz/api/public/v1/pairs",
    "fetchedAt": "2026-10-14T18:43:15.680788+00:00",
    "status": 200,
    "bytes": 226614,
    "revision": "sha256:5cd2677e8250264330f18c2996676d71eb42a89c71cd7e56b80f596e597afbf9",
    "headers": {
      "age": "4",
      "cache-control": "public, max-age=30",
      "content-type": "application/json; charset=utf-8",
      "date": "Wed, 14 Oct 2026 18:43:11 GMT",
      "x-ratelimit-limit": "300",
      "x-ratelimit-remaining": "291",
      "x-ratelimit-reset": "1792003440",
      "x-vercel-cache": "HIT"
    }
  },
  {
    "source": "https://www.stonkfun.xyz/api/public/v1/openapi.json",
    "fetchedAt": "2026-10-14T18:43:18.219752+00:00",
    "status": 200,
    "bytes": 53010,
    "revision": "sha256:95e88bc9c042e597e4ed81eb980e12240bd288dff47180015420d02c1e17ab2a",
    "headers": {
      "age": "0",
      "cache-control": "public, max-age=30",
      "content-type": "application/json; charset=utf-8",
      "date": "Wed, 14 Oct 2026 18:43:18 GMT",
      "x-vercel-cache": "MISS"
    }
  },
  {
    "source": "https://www.stonkfun.xyz/developers",
    "fetchedAt": "2026-10-14T18:43:20.754945+00:00",
    "status": 200,
    "bytes": 83524,
    "revision": "sha256:7105178346e2dc6d87a40846852a6a315e0dd5f9056d23fe723e40fd9f24e4a5",
    "headers": {
      "age": "0",
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "content-type": "text/html; charset=utf-8",
      "date": "Wed, 14 Oct 2026 18:43:20 GMT",
      "x-vercel-cache": "MISS"
    }
  },
  {
    "source": "https://www.stonkfun.xyz/_next/static/immutable/chunks/421rdmyyvvm01.js",
    "fetchedAt": "2026-10-14T18:59:55.079340+00:00",
    "status": 200,
    "bytes": 79220,
    "revision": "sha256:41ec48e4ae9b655c281425a19ef90c951fa53e793842b251aeeb7b5e985bdc6c"
  }
]
```

Actual exact-mint production response (cached source; the quote remains distinct from two other STONK mints):

```json
{
  "request": "http://127.0.0.1:3146/api/pair-quotes?mint=Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump",
  "capturedAt": "2026-10-14T18:59:52.440737+00:00",
  "status": 200,
  "cacheControl": "no-store",
  "response": {
    "schemaVersion": 1,
    "status": "available",
    "search": {
      "query": "",
      "mint": "Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump",
      "limit": 25,
      "offset": 0
    },
    "quotes": [
      {
        "quoteMint": "Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump",
        "quoteSymbol": "STONK",
        "quoteName": "STONK",
        "decimals": 6,
        "tokenProgram": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        "symbolAmbiguous": true,
        "providerSymbolAmbiguous": true,
        "symbolMatchCount": 3,
        "verification": "official_registry_only",
        "verifiedAt": "2026-10-14T18:59:52.402Z"
      }
    ],
    "dataset": {
      "sourceStatus": "cached",
      "fetchedAt": "2026-10-14T18:59:52.439Z",
      "dataFetchedAt": "2026-10-14T18:59:52.402Z",
      "scope": "official_quote_registry",
      "provenance": {
        "source": "https://www.stonkfun.xyz/api/public/v1/pairs",
        "fetchedAt": "2026-10-14T18:59:52.402Z",
        "providerGeneratedAt": "2026-10-14T18:58:12.189Z",
        "revision": "sha256:c9582e3ead7f5cc38aaf45c38307608d27da05522f8526c7af8c6edd615e892a"
      },
      "coverage": {
        "registryResponse": "validated_unpaginated",
        "registryCount": 587,
        "matchedCount": 1,
        "returnedCount": 1,
        "responseLimit": 25,
        "nextOffset": null,
        "resultTruncated": false,
        "providerAmbiguousSymbolCount": 25,
        "tokenCatalogComplete": false
      }
    }
  }
}
```
