# Pair Explorer Day 2 — evidence and critical UX review

Issue [#42](https://github.com/fuzzysniper/scout-stonk-intel/issues/42), FRONTEND only. Base `179265e`, including merged #40/#41. Backend [PR #44](https://github.com/fuzzysniper/scout-stonk-intel/pull/44) remained unmerged during validation; its code was not imported into this feature branch. Consumer behavior and coordination are recorded in [the frontend contract](PAIR_FRONTEND_CONTRACT.md).

## Genuine before/after evidence

Both versions are local production builds. Before is unchanged main, captured 2026-10-14 17:14 UTC, using real recorded Radar data; after is this frontend, captured 17:52 UTC, using real `/api/pairs`, exact-mint responses and Radar. Full-page screenshots use 844px-high viewports. Financial values and dates were not intercepted, substituted or mocked. After provenance records read-only clones of the very same fetch responses rendered by the UI, not additional financial-source requests. Before/after source times differ naturally; these are layout comparisons, not price/performance comparisons.

| Viewport | Main before | Frontend after |
| --- | --- | --- |
| 320 × 844 | [Before](screenshots/pair-day2-before-home-320.png) | [After](screenshots/pair-day2-after-home-320.png) |
| 390 × 844 | [Before](screenshots/pair-day2-before-home-390.png) | [After](screenshots/pair-day2-after-home-390.png) |
| 1280 × 844 | [Before](screenshots/pair-day2-before-home-1280.png) | [After](screenshots/pair-day2-after-home-1280.png) |

Additional genuine 390px captures: [expanded ZEC evidence](screenshots/pair-day2-after-evidence-390.png), [verified STONK mint outside the sampled pages](screenshots/pair-day2-after-registry-empty-390.png). [Before packets](evidence/pair-day2-before.json) and [41 browser checks / after packets](evidence/pair-day2-browser.json) retain actual payloads and dates. Documentary evidence is never used as application fallback data.

The captured global sample contained 50 records, 35 quote groups and a registry count of 587. Provider-reported total 178056 describes its global catalog query, not an exhaustive SCOUT ecosystem. Mode-check outages caused genuine degraded states, including an unverified NVDAX reward mode; the UI withheld reward flow rather than inventing verification. The actual observation date remained distinct from provider market response generation. Exact STONK mint `Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump` verified as a registry-only group with zero tokens in these pages; the UI explicitly said tokens may exist outside the sample. Searching STONK then exposed both known distinct mints with visible mint abbreviations.

## Critical five-second self-review

The first action is selecting a quote asset; the selected mint, sampled count, mode state and USD snapshot/recorded-history status are visible. Four initial chips keep mobile scanning compact, with a native picker for the remaining returned identities. Searching/filtering remains local. Rows are alphabetical; no payout rank, ROI, APY or recommendation is inferred. Evidence/Details contains provenance, actual intervals and unavailable attribution without flooding the initial view.

The first token begins at 674px / 642px / 564px at 320 / 390 / 1280 widths. At 390px its three USD figures fit the initial viewport. At 320px full-mint wrapping and mode/time warnings push part of the snapshot below the fold; that is a real density cost. Selecting ZEC also requires scrolling for its second token. Compact rendering improves scanning but cannot establish a timed five-second analyst comprehension result. Human usability testing remains required.

The screen is useful for identifying a researched token and checking dated provider context, but current mode outages and sparse history prevent reliable reward comparison. “Compare the evidence” is a research purpose, not a return claim. The default NVDAX selection is inherited convenience, not an investment ranking. USD liquidity/volume do not establish executable liquidity in this exact launch account or live pricing. Quote registry names do not establish underlying equity/metal ownership.

Full registry symbol/name browsing remains incomplete: the API supplies a registry count, not its full list. The picker/search therefore covers returned identities only; known exact mints can be verified separately. Coordination requested a backend extension without editing backend scope. PR #44 adds optional wider exact-quote discovery, but not the missing full list. The frontend recognizes its explicit scope marker and tests compatibility offline; until separately reviewed/merged, real selection filters global sampled pages locally. A real integrated #44 run and a full-registry extension remain outstanding.

## Verification and reproduction

Node 20.20.2 / npm 11.9.0 for all app checks, with a writable workspace npm cache. Node 24.19.0 `--use-env-proxy` only for the managed environment's local built-server public-source reads; no application proxy code or dependency change. All commands below exited 0:

| Command | Result |
| --- | --- |
| `npm ci` | 336 packages installed; manifests/lockfile unchanged |
| `npm test` | 154 app/policy/backend/frontend JS + 15 adapter JS + 62 Python; 0 failures/skips |
| `npx tsc --noEmit` | No diagnostics |
| `npm run lint` | No lint warnings/errors |
| `npm run build` | Production compile/types passed; 9/9 static pages; homepage first-load JS 124 kB (main 120 kB) |
| `bash scripts/archive-tool.sh check origin/main` | Append-only/reproduction passed |
| `npm run archive:dry-run` | Genuine pinned replay/idempotency/tamper checks passed; working archive unchanged |
| `git diff --check` | Passed |
| Production Chromium QA | 41 checks passed at 320/390/1280px |

Browser checks cover genuine catalog/scoped/Radar consistency, full quote identity, response/observation dates, no search fanout/polling, cached selection, manual refresh, matching-token search, genuine empty sampled pairs and same-symbol mints. They also verify native keyboard disclosures, skip-link/main focus, one h1/main, 44px primary controls, enlarged-text reflow, no horizontal overflow, preserved research/immutable routes, dossier request bypass/OG metadata and STORK. Axe-core 4.10.3 reported no WCAG 2 A/AA or 2.1 AA violations in tested collapsed/expanded and all isolated states. Twenty-four isolated cases across three widths cover loading, 503, degraded, null market/history, empty sample, forged quote, unverified mode and duplicate ticker; **no screenshots use these fixtures**. Physical Safari/VoiceOver and WCAG certification are not established.

Reproduce against a local production build with working read-only egress to the existing providers:

```sh
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3154
# Separate terminal; Playwright/Chromium and pinned axe are external QA tools:
python tests/pair-explorer-browser.py --base http://127.0.0.1:3154 \
  --axe /path/to/axe-core-4.10.3/axe.min.js \
  --empty-mint Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump
```

The harness restricts its target to localhost. Expected genuine NVDAX/ZEC/sample facts may evolve, so inspect a failed real-source assertion rather than replacing evidence with fixtures. Earlier QA attempts failed on CDP response-body recording, a broad network-idle timeout and an ambiguous test locator. Response-clone recording, explicit UI readiness and the precise visible locator resolved these harness issues; final checks passed. Initial offline fixture aliasing and TypeScript narrowing errors were corrected before passing checks. Existing npm ESLint deprecation and Next edge-runtime/static-generation warnings remain.

## Risk, boundaries and rollback

Additional selected-pair requests are bounded/client-cached and use the existing server contract. Provider outages can retain dated identities while withholding figures; stale snapshots are explicitly response-dated, not promoted to live observations. Current payload validation intentionally rejects incompatible financial/schema changes. No new dependency, financial calculation or shared schema is introduced.

Only `app/pairs/`, pair-specific CSS, frontend tests/docs/evidence/screenshots change. `app/page.tsx` did not require edits. Backend modules/API/tests, data, allowlist, archive, collector, workflows, scheduler/staging, dependencies and configuration remain byte-identical to the base. No merge, manual deployment, dispatch, activation, permission/credential change, wallet/treasury access, trade or launch was performed.

Rollback: have a human review a revert of this frontend commit. It restores the dated tracked-seven explorer. Preserve all real data/archive/history and unrelated backend work; no migration, resource/secret deletion or backend/scheduler rollback is required. Human review is the stop point.
