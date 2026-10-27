# UNFARMD evidence contract v1 — offline review

Issue #184; parent #183. Based on git/API-verified main `9e5264b7edd3f37aeb35113ffb8b86aa8a50b7ec`. Draft only. **No source is connected, enabled or authorized by this module.** No existing worker, consumer, API, database, authentication, STOP or collector contract changes.

`lib/unfarmd-evidence/index.ts` exports the version `unfarmd-evidence/1`, TypeScript types and five pure operations:

| Operation | Result |
| --- | --- |
| `resolveAssetIdentity(unknown)` | `AssetResolution`; never makes a provider call |
| `validateEvidence(unknown)` | `{ok:true,value:EvidenceDocument}` or `{ok:false,issues:[{path,code}]}` |
| `validateContext(unknown)` | Separately supplied context/policy validation, same result union |
| `evaluateEvidence(document, context)` | Validated `EvidenceReport`, or structural validation issues |
| `serializeRedacted(document, context)` | Allowlisted diagnostic JSON; invalid input becomes a generic safe failure |

No acquisition adapter, source registry, HTTP client, background work, storage, risk math, prediction, trade recommendation or executable authorization is provided. Every report/export has `sourceGo:false`. Code readiness is not data coverage.

## Identity before interpretation

Input to the resolver is `{kind,chain?,address?,mic?,ticker?,hints?}`. Surrounding address whitespace is trimmed; Solana case is preserved. Optional `hints` contains at most eight other exact identities with no nested hints. All must agree on the exact key; unresolved/conflicting hints fail closed. Ticker annotations on tokens are unverified labels, never evidence of a mapping or equity ownership.

| Kind | Canonical key | What is **not** established |
| --- | --- | --- |
| `solana_mint` | `solana:mainnet:<mint>` (or explicit `devnet` / `testnet`) | 32-byte base58 formatting does not prove an account exists, is a mint, has authorities, or is supported by a source |
| `evm_token` | `eip155:<positive-chain-id>:<lowercase-0x-address>` | Chain is mandatory; no checksum, code, contract, proxy or ownership verification. `enteredAddress` preserves original casing |
| `listed_equity` | `listed_equity:<MIC>:<ticker>` | MIC/symbol syntax only; no verified exchange listing, ownership, ISIN, share class, permanent security identity or corporate-action resolution |
| `unknown` | `null` | Ticker alone cannot choose chain, market, token, quote mint or security |

Every resolution is `inputOrigin:'user_entered'`, `verification:'not_verified'`; states are `exact_identifier`, `ambiguous`, `unsupported`, `conflicting_hints`, `invalid`. `exact_identifier` means specified **format**, never verified asset. A 32-byte system/program address can pass format checks; it must not be presented as a verified mint. Unknown/unsupported assets remain representable without invented coverage. Equities use a listing-reference key, not a durable security identifier; historical corporate-action mapping needs a future approved security master.

Network spelling differs from existing `mint-facts/1` (`solana-mainnet`); a future explicitly reviewed adapter must map that exact known network to `solana:mainnet`, preserve original mint/slot/clocks/hash/assurance, and never infer a network from a ticker. No such adapter or cross-agent import is added here.

## Evidence document

`EvidenceDocument={version,asset:AssetResolution,entries:EvidenceEntry[]}`. Maximum 100 entries. All fields in the exported types are required unless explicitly optional; absent observations use **null**, not empty strings, zero or invented clocks. Unknown fields are rejected. Validation copies allowlisted fields and does not mutate inputs.

Each entry contains:

- `id`, exact nullable `assetKey`, `category`, scoped `subject`, `statement`. Categories distinguish **fact claims / user assertions / hypotheses / counterevidence / unavailable**. Raw category `fact` is not a verified-fact badge: always use the assessment and original verification tier. A user entry cannot declare itself a sourced fact.
- Optional `quantity:{raw,decimals,unitAssetKey}`: canonical signed integer string (up to 78 magnitude digits), scale 0–30, exact asset-unit key. No IEEE-754 conversion, ticker-only units, aggregation, comparison, ROI or monetary calculations. `unavailable` cannot contain a quantity. Unit validation checks identity syntax, not asset existence.
- `origin:source_record|user_entry|synthetic_fixture`, `representation:raw|derived`, `derivedFrom`, `contradicts`. Links must exist, be unique, non-self and match asset; contradiction links must match subject. Derivation cycles are rejected regardless of entry order. Derived claims always need separate methodology review and are not admitted by v1.
- Nullable `source:{providerId,sourceId,method,rights,entitlement}`. Methods are manual/http/rpc/websocket/archive; a method says how an observation was obtained, not whether it is trustworthy. An unknown provider/source is retained as **withheld**, never auto-registered.
- Three original, separate `clocks`: nullable `observedAt` (time of the phenomenon), `receivedAt` (receiver clock), `reportedAt` (provider report clock). `observedClock` is unknown/provider_reported/corroborated. No timestamp is filled from another clock. No ambient `Date.now()`.
- `coverage:{kind,chain,from,to,exhaustive:false}`; point-in-time, interval, partial sample or unknown. No universal-token/equity or exhaustive coverage claims. Interval bounds are not available from a point-in-time snapshot.
- `verification:{tier,finality,reference}`: unverified/provider_reported/corroborated/independently_replayed; unknown/provisional/finalized_reported/finalized_independently_verified/not_applicable. Independent finality requires independent replay tier/reference. These are adapter-supplied **claims**, not proof that this validator replayed a chain.
- Nullable `reference:{id,sha256}`, bounded nullable `maxAgeSeconds`, explicit `unknowns` codes. References use opaque nonsecret IDs or an actually available SHA-256. Null remains null; the module never manufactures a reference, timestamp, hash or finality. Hash syntax does not validate the original bytes, origin, signature, authenticity or retention permission.

References/IDs cannot contain URLs. Free text rejects URI URLs, common credential assignments/bearer forms and control characters. **Never supply credentials**: lexical checks cannot recognize an arbitrary secret disguised as ordinary text. Full documents may contain private theses or restricted data and are not a safe public export format. An eventual source registry can resolve opaque references to reviewed, credential-free citations; v1 does not fetch or render external links.

## Separate policy and deterministic assessment

Context is `{evaluatedAt,mode:'offline_fixture'|'record_review',intendedUse,sourcePolicies?:[]}`. No policies are installed. A policy supplies provider/source ID, disabled/reviewed metadata state, origin, exact asset kinds/chain scope, allowed methods, rights/entitlement references and a freshness ceiling. `reviewed` is **metadata**, not source activation, network permission, owner GO or authentication. Context must come from separately reviewed trusted integration, never document/user JSON. This library cannot authenticate a lying adapter or owner-supplied policy; a matching string/hash alone cannot prove identity, rights or finality.

Rights are explicit permitted/unverified/restricted/denied, allowed uses (private_research/public_display/commercial_reporting), permitted/unverified/prohibited retention and a reference. Entitlement is separately authorized/unverified/denied with reference. Both record and policy must establish the exact use, permitted retention and entitlement. Private permission does not imply commercial/public permission. Free/protocol-accessible does not mean licensed. A restrictive/unknown status is withheld even if another field claims permission. Evaluation assumes retained decision evidence; it cannot grant an ephemeral-use exception. Unresolved provider rights remain unresolved, including existing Pump/Helius retention/PITR/cutoff gates.

A scoped raw claim can become `admissible_fact` only after identity match, reviewed source scope/method/origin, rights/retention/entitlement, available provenance, verification, coverage, valid clocks and bounded freshness pass. RPC/WebSocket observations need reported or independently verified finalized status; provisional events stay withheld. Provider-reported finalized data remains **provider-reported**, not independent chain replay or safety certification. An HTTP snapshot may have finality not_applicable; it is not a finalized onchain mint observation.

UTC timestamps are strict real-calendar RFC3339 with `Z`, up to nine fractional digits; numeric timestamps, offsets, leap seconds and normalized invalid dates are not silently accepted. Nanosecond comparisons preserve exact original text. Future/inverted clocks are withheld; missing/untrusted clocks stay unknown. Max age is 1–604800 seconds, bounded by **both** record and policy; null is not forever fresh. Freshness ages from observedAt, and from the interval end for interval records: recent receipt of old history cannot make it current. Freshness is a classification relative to caller-supplied `evaluatedAt`, not a timer or a live claim.

Explicit contradictions are retained on both sides, not overwritten by the newest record. The validator does not use NLP to detect semantic contradictions, prove a hypothesis, resolve counterevidence, infer safety, or decide whether any asset should be bought. Future adapters/reviewers must supply scoped contradiction links and unresolved unknowns truthfully. Derived math, holder ROI, universal coverage and predictive scores are not supported.

## B/C interface — evidence, risk and decision remain separate

`EvidenceReport` contains `version,mode,intendedUse,evaluatedAt,assetKey,assetVerification:'not_verified',sourceGo:false`, per-ID `assessments`, `admissibleFactIds`, `userAssertionIds`, `hypothesisIds`, `counterevidenceIds`, `unavailableIds`, `unknownIds`, and `decisionAdmissibility`. An assessment is valid only for that recorded intended use and evaluation time; do not reuse a private-research assessment as publication approval:

- `PLAN:'withheld'|'evidence_component_only'` is **only the sourced evidence component**. It never approves a trade, risk calculation or manual plan. Empty facts, unknowns or unresolved counterevidence withhold this component. A separately labeled, owner-authored manual plan can still be recordable under B's own rules; do not turn this status into a blanket veto of manual planning.
- `WATCH` and `PASS` are `recordable_without_source_evidence`. This says evidence is unnecessary to record those choices, not that their reason/completeness/risk checks passed.
- B's proposed `evidenceRef:{version:'unfarmd-evidence/1',assetKey:string|null,evidenceIds:string[]}` is a compatible **unverified link**, not an authorization. Integration must compare A/B exact keys without case-folding Solana, verify selected IDs exist, distinguish manual assumptions from admitted facts and preserve unknowns/counterevidence. B's risk result is an independent axis. No A/B imports until separate review.
- C should display `asset.state`, original entries and their assessments, not raw category labels as proof. Default source-disabled view can show unknown/unavailable and record manual WATCH/PASS without synthetic market data. Do not show a verified icon for format-only identities or source assertions. No implication that `/desk` already consumes this library.

Minimal **source-free**, deterministic example (the evaluation time is a caller-chosen example, not a source observation):

```ts
const document = {
  version: 'unfarmd-evidence/1',
  asset: resolveAssetIdentity({kind:'unknown', ticker:'SOL'}),
  entries: [],
};
const result = evaluateEvidence(document, {
  evaluatedAt:'2026-10-27T12:00:00Z',
  mode:'record_review', intendedUse:'private_research',
});
// ok:true; assetKey:null; sourceGo:false; no admissible facts;
// PLAN evidence component withheld; WATCH/PASS recordable without sourced evidence.
```

Synthetic tests use explicitly invented provider IDs, rights references, quantities and clocks. Fixture mode and fixture policy origin independently prevent false source-record promotion. No fixture is an authentic observation, authorization or demonstrated investment result. No live source positive-path claim is made.

## Redacted serialization, retention and rollback

`serializeRedacted()` revalidates, exports only canonical public asset identity, classification, original clocks, coverage bounds, tier/finality, origin, raw hash if supplied and static reason codes. Entry IDs become ordinals. It excludes free text, source/provider IDs, opaque reference IDs, quantities, unknown text and private notes. Invalid input exports only version/status/sourceGo/code. This is a diagnostic summary, **not** a signed/durable receipt, journal/persistence format, anonymization guarantee, authenticity proof, licensing exemption or retention mechanism. Even retained hashes/derived metadata may need rights review. Original documents and redacted summaries must not be stored/published without their own authorization.

Validation is offline and does not alter the existing append-only journals. No migration, storage, physical deletion claim, infrastructure or workflow change exists. Rollback is removal/revert of these three new paths; no live consumer imports them. Reviewed future integration must add rights-qualified adapters and enforce provenance authenticity/authorization externally before admitting real records. Pump creation receipts, if ever separately admitted, support only their exact mint/network/event/source scope, not EVM/equities, liquidity, returns, holder distribution or full token coverage.

## Reproduction and remaining gates

Run `bash tests/unfarmd-evidence/run.sh`. It compiles only this new pure module into a temporary directory and runs deterministic identity, evidence, security and fuzz tests. No provider calls, SQL, keys or fixtures written to production. Root scripts/workflows are intentionally untouched; this standalone suite is **not automatically added to root npm test**. Reviewed integration must explicitly include it in its check command.

Tests cover ambiguous symbols, exact keys/wrong chains, listing ambiguity, input-origin/fixture laundering, source disabled/unknown, rights/retention/use/entitlement denial, clock/microsecond/freshness boundaries, snapshot/interval separation, contradictions and derivation cycles, decimal precision, invalid/fuzzed input, safe errors, redaction and no network/ambient clock dependencies. Physical iPhone, real provider acquisition, account identity, finality replay, rights clearance, B/C combined integration, persistence and source activation are **not performed**. This contract intentionally has no market price, opportunity ranking, safety score or execution capability.

Local review evidence: 116 focused tests pass (including 1,000 malformed identities and 500 invalid-clock fuzz cases), the existing 716-test non-SQL root prefix passes, root TypeScript/lint and archive check pass. `npm test` is not manually run because its later sections execute SQL fixtures; no SQL is authorized for this assignment. Existing automatic PR CI is reported separately in the PR, not assumed green. No screenshots apply to this pure non-UI module.
