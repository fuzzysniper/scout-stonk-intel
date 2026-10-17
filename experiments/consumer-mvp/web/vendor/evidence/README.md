# Portable mint evidence v1 — #89

Review-only experiment for the October 17–20, 2026 consumer MVP. The shared contract was published to [Agent A / #88](https://github.com/fuzzysniper/scout-stonk-intel/issues/88#issuecomment-6238471873) **before implementation**. This folder supplies evidence and explanations; it does not supply a production route, discovery service, wallet integration or live lookup.

```ts
import { explainMint, listSupportedMints } from "../evidence";
import type { ExplainMintResult } from "../evidence";

const result: ExplainMintResult = explainMint(
  "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP"
);
if (result.status === "supported") {
  // Show explanation, stale qualifier and risks. Receipts belong in Details.
  // supported means dated evidence exists, not current eligibility or returns.
  console.log(result.explanation.whatItIs.text);
}
```

## Supported identities

These three records were cross-checked against three official **same-provider** sources: registry, exact-quote catalog and per-token reward response. This is independent identity matching between response types, not independent chain verification or third-party corroboration. They were captured **October 14**, and are **stale on October 17**. No present-day source was queried.

| Base token | Exact base mint | Exact quote mint | Quote label |
| --- | --- | --- | --- |
| Super Inu / SI | `DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP` | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | NVDAX / NVIDIA |
| RuneScape Gold / GP | `HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ` | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | GLDX / GOLD |
| Grokification / GROK | `6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8` | `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` | SPCXX / SPACEX |

Labels are provider metadata, not assertions about an issuer, affiliation, underlying ownership, legal rights, redemption, reserves or tracking. In particular a stock-linked quote token **does not imply ownership of company shares**. Holding the base token does not mean holding the quote token. Quote decimals are not base-token decimals; base mint program/decimals are not established here.

The original NVDAX catalog actually contains **two different SI mints**. The other SI (`4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97`) remains unsupported. Unknown valid mints, all quote mints, wrong case, whitespace, tickers and URLs never become aliases. The `111…111` preview input is a synthetic unsupported-input test, not a fourth supported token.

## Agent A integration

`contract.ts` is the shared v1 schema; `index.ts` exports only `explainMint`, `listSupportedMints` and public types. Both operations are synchronous and have zero I/O. Use result discrimination:

| Result | Consumer behavior |
| --- | --- |
| `supported` | Render the dated explanation, original clocks, rights state and limitations. Do not call it current verification. |
| `unsupported / invalid_mint` | Show the fixed invalid-mint message; never silently normalize. |
| `unsupported / not_in_supported_set` | Show unsupported; no provider request or enrollment occurs. |
| `unavailable / invalid_clock` | Withhold the explanation; evaluation predates a required receipt or has an invalid UTC clock. |
| `unavailable / evidence_integrity` | Withhold the explanation; bundled receipt metadata is absent, inconsistent or corrupt. |

`whatItIs`, `whatUserOwns`, `pairRelationship`, mechanism conclusion and `risksAndUnknowns` are authored plain-language facts with citations. `basis` separates a provider report from an interpretation or limitation. Every cited ID resolves to a `SourceReceipt`. The additive optional `SourceReceipt.retained` field gives original commit/path/document hash/packet index for audit; it is populated in all current engine outputs and optional in the type for compatibility with the first published contract/mocks. No original financial body is exported. Opening `url` visits a **mutable official endpoint**, not a frozen historical receipt, and never refreshes this engine's evidence. Do not automatically load those URLs or third-party assets.

The hierarchy is deliberately separate:

| Evidence | v1 state |
| --- | --- |
| Reward configuration | `verified_at_capture`, provider-token scope only |
| Provider-reported lifetime distribution | `withheld_rights`, `value: null`; never a recent rate |
| Actual covered interval counter flow | `not_observed`, `value: null`; no aligned start/end observations |
| Settled transfers / holder entitlement | `not_verified` / `unknown` |
| Holder returns / ROI | `unsupported`, `value: null` |
| USD liquidity / 24h volume | `withheld_rights`, `value: null`; no replacement venue/pool |

Missing, null and zero source counters all remain **withheld**, not converted to public zeros. No numeric source-derived financial amount appears in the contract, fixture, runtime bundle or hidden field. Source access, a registry entry, ledger basis, hash or attribution grants no publication/commercial permission. `metadata_only` describes this projection, not a legal clearance. The owner must resolve continued retention and public/commercial use of existing evidence; this PR does not alter the existing rights gates or certify retained raw material for launch.

`freshness.evaluatedAt` is the evaluation clock, not an observation. Receipt `capturedAt` is original fetch completion; `generatedAt` is the original provider clock. Both are retained verbatim, including microseconds. `oldestCapturedAt` identifies the earliest dependency. The conservative 600-second limit checks **all** capture and generation clocks; it is an explanation-age policy, not a provider SLA. `currentValueClaim` is always false, including a replay near capture time. A future-to-evaluation receipt fails closed. No hash or matching unit proves a continuous economic epoch or settled payout.

`preview.ts` constructs typed `PreviewFixture[]`; `preview.json` contains three **retained-capture projections** evaluated at a fixed test clock, plus a separately labeled **simulated input**. They are not simulated provider responses, live results or new observations. Agent A can import the engine directly, or use this exact JSON while wiring UI. Never relabel fixtures as live. The clock option is for deterministic evaluation; do not pin an old clock in the consumer UI to conceal staleness.

## Reproduce and extract

From repository root, after `npm ci`:

```sh
bash experiments/consumer-mvp/evidence/test.sh
```

The script compiles with ES2020 only, no DOM or Node type libraries, into a disposable directory; verifies original document SHA-256, byte lengths, receipt hashes, status, cache/clock age, exact token/quote/pool/unit/mode and sampled page; checks deterministic metadata/JSON fixtures; then runs the focused `node:test` suite. Source files, production data and the archive are read-only. No provider requests, credentials, persistent state or extra dependencies are involved.

`tools/captures.mjs` is an **offline build/test tool**, never a public adapter or a way to enroll arbitrary documents. It pins the original 500,861-byte retained document at commit `df4e87658c5dd64fef9461d174333d824c8b1c7c`, SHA-256 `4ff3c223122ca1479bade0e09889aa4837803cab137c26a9e714999a2ea0b50d`. Selected packets: registry 0; catalogs 3/4/5; rewards 8/12/17. It projects only identity receipts; it never interprets or copies numeric rewards/base/market fields. A hash checks retained bytes, not provider authenticity, settlement or permission. The trust boundary includes the original HTTPS capture and reviewed Git commit.

For a new independent repository, copy `index.ts`, `contract.ts`, `catalog.ts`, `guards.ts`, `receipts.ts`, `retained.ts` and this documentation. There are no production imports, aliases, Node APIs, provider SDKs or branding dependencies. The runtime is about 25 KB of compiled JavaScript before compression; it needs only ES2020. Tests run it in a fresh JS context without network, Node, DOM, process or wallet globals. Build tools/tests are separate. To reproduce the original-source audit after extraction, retain an owner-approved read-only local evidence reference and original hash; do not automatically copy restricted raw captures into the consumer product. If rights do not permit retaining that reference, keep consumer publication blocked until an approved audit/retention path exists.

## Expansion and launch gates

No live adapter is included, even as a disabled switch. Current request budget is **zero**; runtime retention and writes are **zero**. No option, environment variable or `approved: true` flag can release quantities or enroll a token.

Before adding a supported record, the owner must approve exact source purpose/fields, retention, attribution, commercial/publication rights and expiry/revocation handling. A separate reviewed change must pin genuine original bytes and cross-check canonical mint, quote mint, pool, mode, quote units/program, source status/clock and bounded sample limitations. Ticker matching, a label, a fresh HTTP response or a copied counter is insufficient. Any proposed read-only adapter must have its own approved fixed request/byte/time budget, no broad crawl, no retries after ambiguous failures or permission drift, explicit 429/503 failure states and no automatic enrollment. Existing observations cannot supply missing history, settlement or holder ROI.

Acceptance for the three-day commitment:

- **Day 1 / October 17:** shared typed contract posted first; three supported exact-mint explanations, explicit unsupported/unavailable behavior, dated sources and deterministic fail-closed tests. Implemented locally in this PR.
- **Day 2 / October 18–19:** Agent A imports this contract in its isolated consumer UI; browser checks must show correct identity, stale qualifier, conspicuous ownership/rights/unknown states and source receipts. A second SI ticker must not resolve to the supported mint. **Pending Agent A integration and human comprehension testing; not claimed by engine tests.**
- **Day 3 / October 20:** owner reviews source-rights/retention decisions, actual mobile golden path, exact-mint sharing, no current-value/ROI claims, no empty-as-zero conversion and extraction readiness. Launch remains **unapproved**; human review and a separate authorized launch decision are required.

Rollback: close the unmerged PR or revert the experiment-only commit/remove this evidence directory and its consumer import in a separately reviewed frontend change. No production data, active allowlist, scheduler, archive, credentials or infrastructure needs restoration. This PR neither merges, deploys nor activates anything.
