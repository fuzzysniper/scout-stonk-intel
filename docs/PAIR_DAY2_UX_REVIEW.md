# Pair Explorer Day 2 — combined #44 integration and critical UX review

Issue [#42](https://github.com/fuzzysniper/scout-stonk-intel/issues/42), FRONTEND only, [PR #45](https://github.com/fuzzysniper/scout-stonk-intel/pull/45). Rebased onto latest main `156c9bed1d6bc394f6639a05d6661e0d46d63613`, including merged #40/#41/**#44**. Backend sources were not edited. [Consumer contract](PAIR_FRONTEND_CONTRACT.md).

## Genuine before/after evidence

Before is unchanged original main `179265e`, captured 2026-10-14 17:14 UTC. The backend-only #44 does not change that frontend. After is the combined production build, tested 18:44–18:48 UTC with supplemental capture checks afterward. Before uses real recorded Radar; after uses real global catalog, provider-scoped catalog and Radar. After photos are **844px-high viewport captures**, not full-page images of all 50 rows. Before photos retain their original full-page extent. Source times differ naturally: these compare layout and evidence presentation, not prices or financial performance.

| Viewport | Main before | Combined frontend after |
| --- | --- | --- |
| 320 × 844 | [Before](screenshots/pair-day2-before-home-320.png) | [After](screenshots/pair-day2-after-home-320.png) |
| 390 × 844 | [Before](screenshots/pair-day2-before-home-390.png) | [After](screenshots/pair-day2-after-home-390.png) |
| 1280 × 844 | [Before](screenshots/pair-day2-before-home-1280.png) | [After](screenshots/pair-day2-after-home-1280.png) |

Additional genuine captures: [expanded ZEC evidence](screenshots/pair-day2-after-evidence-390.png), [real admission503](screenshots/pair-day2-after-admission-390.png), [distinct STONK mint](screenshots/pair-day2-after-distinct-stonk-390.png). Every screenshot uses actual source responses; no intercepted financial payloads, substituted dates or mocked figures. The recorder clones the same responses consumed by the UI without substitution. [Before packets](evidence/pair-day2-before.json), [current combined proof](evidence/pair-day2-browser.json).

Preserved historical evidence: [pre-scoped 17:52 browser packets](evidence/pair-day2-pre-scoped-browser.json) and the [old local-filter empty capture](screenshots/pair-day2-after-registry-empty-390.png). That photo predates integration with #44. **It is not a current opt-in empty result:** the exact STONK mint now returns seven actual scoped tokens.

## What the real combined endpoint proved

All recorded GETs below returned200/no-store, except the deliberate immediate second cold-scope request which returned503. Values are dated provider reports, not independently reconciled ecosystem counts.

| Query | Returned tokens / reported total | Scope and limitation |
| --- | --- | --- |
| Global `/api/pairs` | 50 / 178094 | global_sample, quoteMint=null, total scope catalog; 35 returned quote groups, registry count587 |
| NVDAX + discovery=pair | 50 / 7654 | provider_quote_mint; 2 pages; 6 reward-mode verified; degraded for incomplete mode checks |
| ZEC + discovery=pair | 50 / 9740 | provider_quote_mint; 2 pages; 12 reward-mode verified |
| Canonical STONK + discovery=pair | 50 / 10615 | provider_quote_mint; 2 pages; 6 reward-mode verified; degraded |
| Distinct STONK + discovery=pair | 7 / 7 | provider_quote_mint; 1 page; 7 reward-mode verified; complete/atomic still false |
| Distinct STONK, legacy quoteMint only | 0 / 178094 | global_sample local filtering, verified registry-only identity; no ecosystem-absence inference |

Canonical STONK mint: `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx`. Distinct STONK mint: `Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump`. Their scoped token sets were disjoint. Quote symbol alone cannot select or join them.

Every scoped response proved the requested mint, provider_quote_mint strategy and quote_mint total scope. Each catalog source URL carried the exact mint, with page-source count matching pagesFetched. Markets remained USD with observedAt=null, and every historical return/holder-entitlement result remained null. Complete=false and atomic=false held even for a seven-record one-page result. Two pages are a market-cap-selected, non-atomic sample, not a SCOUT investment rank or full pair index.

The UI now replaces a global group with its verified scoped result, so NVDAX's chip/search/rows consistently use50 instead of mixing the global single token with50 displayed rows. A real token absent from the global sample was searchable after discovery. Up to12 validated scopes retain exact identities across switches; manual refresh clears this client state. Header counts refer to the active query, not a total across different quote currencies.

## 503/429, recovery and empty-state limits

The unchanged backend admits one cold scoped refresh/minute/process, at most four scoped readers; successful responses cache for five minutes. The genuine initial switch from cold NVDAX to cold ZEC returned503 as expected under that admission policy. The UI retained earlier identities, withheld snapshot/flow figures and did not retry automatically. After the budget window, a read-only ZEC query succeeded; subsequent real UI selection recovered. The harness paced its four cold scopes by61 seconds each, without changing budgets, clocks, permissions or server code.

A generic503 does not reveal admission vs provider outage vs cooldown. The UI does not invent that distinction. No upstream429 was observed or deliberately induced by quota pressure. Unchanged backend regression tests cover upstream Retry-After/shared cooldown; frontend offline/browser fixtures cover both defensive429 and503, invalid scope and recovery. These fixture states never produce screenshots.

The genuine empty result above is the **legacy global-filter endpoint**. None of the four successful real opt-in scopes was empty. A zero-result opt-in is tested with explicitly isolated fixtures, including false completeness and quote-mint total scope. Do not describe that as observed provider evidence or turn an empty bounded sample into “no tokens exist.”

## Critical UX self-review and remaining limitations

The first action stays choosing a quote asset. Exact mint, sampled count, mode state and source/observation limitations remain visible. Four default chips keep the page compact; a native picker exposes other returned identities. Rows remain alphabetical, never ranked by price, payout, yield or implied ROI. Evidence/Details retains actual intervals, byte revisions, source/retrieval dates and attribution limitations.

The first token starts at674px /642px /564px at320/390/1280. At390 its initial USD values fit the viewport; at320 some snapshot details need scrolling. Long tiny decimal values can wrap across two lines. Fifty genuinely discovered rows require scrolling/search; this is a density cost, not a demonstrated five-second comprehension win. A timed analyst session and physical-device assistive-technology review remain necessary. The NVDAX default is convenience, not recommendation.

Mode-check outages and sparse tracked history still withhold comparisons. Reported liquidity/volume do not establish executable liquidity in the precise launch account. Provider generation/retrieval dates are not market ticks; historical quote-relative return, benchmark return and holder attribution remain Unavailable. Distributed counter changes do not establish individual investment returns. Quote names do not establish equity/metal ownership.

**Full registry symbol/name search is still unsupported.** The API exposes a registry count, not the whole identity list. Chips/search cover returned registry-verified groups and successful exact-mint lookups only. No static587-asset invention or client-side provider bypass was added. Broader verified registry-list support requires separate backend review. [Coordination](https://github.com/fuzzysniper/scout-stonk-intel/issues/43#issuecomment-6174856064). Human review may proceed with this explicit limitation; issue #42 is not closed as an exhaustive discovery solution.

## Verification and reproduction

Node20.20.2/npm11.9.0 for all app checks; Node24.19.0 --use-env-proxy solely for the managed local production server's existing public-source egress. No app proxy/configuration/dependency changes. All commands exited0:

| Command | Result |
| --- | --- |
| npm ci | 336 packages; manifests/lockfile unchanged |
| npm test | 166 app/policy/backend/frontend JS +15 adapter JS +62 Python; zero failures/skips |
| npx tsc --noEmit | No diagnostics |
| npm run lint | No lint warnings/errors |
| npm run build | Production compile/types,9/9 static pages; homepage124kB first-load JS |
| bash scripts/archive-tool.sh check origin/main | Append-only/reproduction passed |
| npm run archive:dry-run | Real pinned replay/idempotency/tamper checks; working archive unchanged |
| git diff --check | Passed |
| Production Chromium/axe | 54 combined checks +4 supplemental genuine capture/reflow checks passed |

The combined checks cover real global/local/scoped provenance, newly discovered token search, same-symbol distinct mints, actual times/nullable amounts, active sample counts, failure/recovery, no polling/fanout, cache/manual refresh, single h1/main,44px controls, skip focus, keyboard disclosures, enlarged text, research/immutable routes, dossier bypass/OG metadata and STORK. Thirty-three isolated cases across three widths cover503/429, scoped503, forged scope, degraded, nulls, empty, forged quote, loading, mode-unverified and duplicate-symbol states. Screenshots use none of them. Axe4.10.3 found no tested WCAG2A/AA or2.1AA violations; Chromium is not Safari/VoiceOver validation or WCAG certification.

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
npm run start -- --hostname 127.0.0.1 --port 3156
# Separate terminal, external QA-only Playwright/Chromium and pinned axe:
python -u tests/pair-explorer-browser.py --base http://127.0.0.1:3156 \
  --axe /path/to/axe-core-4.10.3/axe.min.js
```

The harness requires a **fresh local server process**, working existing provider egress and about four minutes for paced scopes; it does not weaken admission/caching to speed QA. Genuine source facts can evolve, so diagnose a real-source failure rather than substituting fixtures. Local preview links are not published. Earlier failures were synthetic fixture construction and a CDP body-recorder stall, resolved by proper fixture provenance and fetch-clone recording. Final tests passed. A supplemental screenshot review found a Chromium raster artifact after long-mint focus: DOM/visual viewport/nested-scroll geometry had zero horizontal overflow; a CPU-rendered scroll/repaint capture displayed the full header. The capture harness now uses CPU rendering and settled frames for that photo. Content/financial responses were not changed. Existing npm ESLint deprecation and Next edge/static-generation warnings remain.

## Boundaries and rollback

Only frontend pair components/adapter/client, necessary CSS, frontend tests/docs/evidence/screenshots differ from latest main. Backend/API/tests, data, calculations, allowlist, archive, workflows/collector, Cloudflare/staging, dependencies and app/page.tsx are unchanged. No merge, manual deployment, dispatch, activation, wallet or treasury access.

Rollback through a human-reviewed revert of the frontend commits: restore the dated tracked-seven explorer and remove scoped client consumption. Preserve merged #44, all genuine history/archive and unrelated work. No schema/data migration, resource/secret deletion, backend or scheduler rollback is needed. Human review is the stop point.
