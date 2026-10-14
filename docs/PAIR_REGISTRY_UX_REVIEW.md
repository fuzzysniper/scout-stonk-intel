# Registry-first Pair Explorer — PR #45 review and methodology

Frontend only, rebased onto main `7368c6e6a1b125ed5a6f473e209669cd0a46884d`, including merged backend #47/#44 and real observation update `d77ba92`. Both existing frontend commits applied cleanly. Backend/API/tests, data/math/allowlist/archive, collector/workflows, scheduler/Cloudflare, dependencies and app/page.tsx remain unchanged. [Consumer contract](PAIR_FRONTEND_CONTRACT.md).

## Product flow and identity boundary

**Search pair → select asset → view matching memecoins.** No initial default consumes the cold token-query budget. Name/ticker/mint search queries the verified registry, rather than the first token pages. Selecting an exact mint closes results and requests its bounded provider-filtered token sample. Searching another asset leaves the current sample selected until an explicit choice.

Identical/case/Unicode-equivalent tickers remain separate records. Original labels and mint abbreviations are visible; full mint is in each accessible button name and the selected identity. No names/tickers are used as keys. Text is sent literally, with URL encoding; the server performs canonical normalization. This preserves the distinction between Unicode text resembling a mint and an actual case-sensitive mint lookup. The frontend checks the echoed normalized search and validates the returned identities/source/counts before rendering.

Registry search resolves the former unsupported-registry-search limitation. It covers the **validated official response**, including identities absent from global token pages. It cannot independently prove universal registry completeness, launch readiness, economic ownership or token-catalog coverage. Query windows show12 records, explicitly load up to48, then ask for a narrower query. The48-row display cap does not restrict which identity can be found through server search. Window appends require a consistent source revision/time/counts and next offset; changed/duplicate/inconsistent pages ask for a manual restart.

## Genuine screenshot methodology

Before photos are original main `179265e` at17:14UTC on October14. Its relevant frontend files are byte-identical to latest main7368c6e; backend/data have since evolved. After photos use this local **production build**, real registry/scoped/Radar responses and844px-high viewports. Before retains full-page extent; after intentionally shows the initial viewport. Dates/values may naturally differ, so these are layout/evidence comparisons, not financial-performance comparisons.

| Width | Main before | Search landing | Selected real sample |
| --- | --- | --- | --- |
| 320 | [Before](screenshots/pair-day2-before-home-320.png) | [Landing](screenshots/pair-registry-home-320.png) | [NVDAX](screenshots/pair-registry-selected-320.png) |
| 390 | [Before](screenshots/pair-day2-before-home-390.png) | [Landing](screenshots/pair-registry-home-390.png) | [NVDAX](screenshots/pair-registry-selected-390.png) |
| 1280 | [Before](screenshots/pair-day2-before-home-1280.png) | [Landing](screenshots/pair-registry-home-1280.png) | [NVDAX](screenshots/pair-registry-selected-1280.png) |

Additional genuine390px photos: [ambiguous STONK registry search](screenshots/pair-registry-stonk-search-390.png), [real admission503](screenshots/pair-registry-cooldown-390.png), [expanded token evidence](screenshots/pair-registry-evidence-390.png). The run records a real Unicode quote query as observed; it does not promise an empty token result. [Current source packets/checks](evidence/pair-registry-browser.json). Earlier pre-registry photos and [Day2 methodology](PAIR_DAY2_UX_REVIEW.md) remain clearly historical, with their source packets preserved in Git and the existing evidence files.

No screenshot uses mocked metrics, intercepted financial responses, substituted dates or static documentary application data. A read-only fetch-clone recorder captures the same response bodies the UI consumes. CPU-rendered Chromium/settled frames avoid the earlier headless raster artifact; screenshots do not edit financial content. Synthetic/aborted fixtures are isolated and never photographed.

## Real-source proving scope

The real run verifies name NVIDIA, ticker NVDAX, Unicode 熊猫, STONK text matches and exact original-case mint lookup. Multiple STONK identities are preserved, including a quote absent from the globally fetched token pages. Canonical and distinct STONK scopes produce disjoint records. Every successful token response proves provider_quote_mint, its requested mint, quote_mint total scope and exact-mint catalog source URLs/page count. Returns and holder attribution remain null; market observedAt remains null and unit USD.

A rapid second cold selection produces genuine503 under the unchanged one-cold-query/minute/process policy. No prior token figures appear under the new asset identity. There is no retry loop; a manual retry after the window recovers. The run spaces its four cold scopes61seconds apart, keeps four-reader/cache limits intact and does not pressure the provider into429. Defensive429/503 handling, shared backend Retry-After/cooldown, stale/cached/empty/malformed source handling and missing markets/history are tested offline. A generic503 does not identify admission vs outage vs provider quota; the UI does not invent its cause.

Actual totals, source revisions, capture times, sample sizes, mode counts and measured token positions are retained in the evidence JSON. A rare quote's unavailable or nonempty response is not relabeled empty. Empty registry search and an empty bounded token sample are separate states; neither proves absence elsewhere. Even a one-page result retains complete=false/atomic=false.

## Evidence safeguards and critical self-review

Provider market-cap pages select the token sample; visible rows remain alphabetical. USD price/liquidity/24h-volume fields are nullable, dated provider snapshots. Generation/retrieval times are not market ticks, live quotes or independently verified executable liquidity. True numeric zero stays zero; missing values are Unavailable. Tiny decimal figures can wrap on320px. Quote names do not establish underlying equity/metal ownership.

Only the existing tracked seven can join recorded Radar by exact mint/quote/symbol/pool/source identity, verified reward mode and valid fresh history. Existing gap/reset/window/matched-period safeguards and actual intervals remain authoritative. Distributed counters do not establish individual investment returns; historical quote-relative/benchmark returns and holder entitlement remain explicitly Unavailable. Registry membership alone unlocks none of them.

The landing view communicates one task with a short heading, one search input and an optional browse action. Selected-asset identity and dated sample evidence are compact, with advanced provenance behind native details. The density check found an earlier320px first token at~672px; the shorter heading and grid-aligned refresh control bring it to610px. Final first-token positions are610/560/563px at320/390/1280. All three snapshots remain actual bounded source results. This is an implementation/self-review result, not a timed five-second user study. Long result lists need scrolling/refinement, fifty token rows need scrolling, and tiny numbers/long mints remain dense. Physical Safari/VoiceOver and actual analyst comprehension testing remain pending human validation.

## Checks and reproduction

Node20.20.2/npm11.9.0 for app commands; Node24.19.0 --use-env-proxy only for the managed local production server's public-source egress, preserving inherited proxy/CA/TLS verification. No app proxy code or new dependency.

| Command | Result |
| --- | --- |
| npm ci | Exit0;336 packages; manifests/lockfile unchanged |
| npm test | Exit0;183 app/backend/policy/frontend JS +15 adapter JS +62 Python; zero failures/skips |
| npx tsc --noEmit | Exit0; no diagnostics |
| npm run lint | Exit0; no lint warnings/errors |
| npm run build | Exit0;9/9 static pages, homepage125kB first-load JS |
| bash scripts/archive-tool.sh check origin/main | Exit0; append-only/reproduction passed |
| npm run archive:dry-run | Exit0; real replay/idempotency/tamper checks; working archive unchanged |
| git diff --check | Exit0 |
| Real production browser/axe | Exit0;68 combined +1 supplemental genuine capture check; zero tested axe violations |

The browser harness tests all three widths,44px controls, native list/button/keyboard disclosures, skip link/main focus, one h1/main, enlarged-text reflow, no overflow, real values/times/quote scope, no entry/polling/token fanout, debounce, bounded registry windows, cache/refresh, dossier/OG/immutable routes and STORK. Isolated cases cover registry429/503/forgery/empty/loading, sample429/503/empty/nulls/unverified-mode/identity/scope/loading, revision drift, late cancelled search, invalid input and manual registry recovery. Axe4.10.3 tests WCAG2A/AA and2.1AA; this is not WCAG certification.

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
npm run start -- --hostname 127.0.0.1 --port 3160
# Separate terminal; external QA-only Playwright/Chromium and pinned axe:
python -u tests/pair-explorer-browser.py --base http://127.0.0.1:3160 \
  --axe /path/to/axe-core-4.10.3/axe.min.js
```

Use a fresh local process for the admission proof and working existing provider egress. The real-source portion requires about four minutes to respect budgets. Provider identities/counts/availability can change; investigate a failed assertion rather than substituting fixture screenshots. Earlier iterations corrected an unnecessary TypeScript narrowing comparison, response-recorder readiness, a320px density assertion, literal Unicode query semantics, browse dismissal and an isolated Playwright callback signature. Interrupted/superseded browser runs are not reported as passing. Existing ESLint deprecation and Next edge/static-generation warnings remain.

## Risks, stop point and rollback

Registry data rights/redistribution/SLA, hidden provider omissions and independent onchain reconciliation retain the backend documentation's limitations. Client and server caches are separate; original data/source dates are preserved rather than promoted to live observations. Rate/cooldown state is process-local and provider outages still constrain useful research. No financial recommendation, ranking, fabricated yield/holder ROI or trading action is introduced.

PR #45 is for human review only. Do not merge, activate collection/scheduling or deploy production. Existing Vercel automation may create its normal preview; no manual deployment is performed. Roll back through a human-reviewed revert of the frontend commits while preserving merged #47/#44 and all genuine history/archive. No schema migration, secret/resource deletion, backend or collector/scheduler rollback is required.

The supplemental STONK photo moves the pointer outside the scrollable results before the paint-settling wheel action, keeping the first identities visible. This corrects capture positioning without changing app data; its real response is recorded separately in the evidence file. The complete68-check run and43-case isolated debugging run both exited0; the supplemental capture adds one check.

The current evidence JSON is compact machine-readable data; `python -m json.tool docs/evidence/pair-registry-browser.json` expands it for inspection. Compact serialization was round-trip checked to preserve every recorded value and timestamp.
