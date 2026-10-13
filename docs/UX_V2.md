# SCOUT UX V2: recorded intelligence first

Issue [#30](https://github.com/fuzzysniper/scout-stonk-intel/issues/30). Base: `60b190e2e41eda02eb42ef3d142358e90d440bee`, including merged PR #29. This is a presentation-only, review-required change. No activation or production rollout is authorized.

## Product decision

Home leads with “Follow the money.”, one sentence about reported StonkFun reward flows, and an Open Radar entry. Three evidence counts distinguish tracked identities, tokens with recorded points, and passing matched comparisons. The latest actual recorded observation is shown separately from dataset retrieval. The first three tokens preview the same compact rows used in Radar. Repeated onboarding, route CTAs and financial paragraphs no longer precede the evidence. Primary navigation, the independent research guide and the optional STORK ecosystem connection remain available.

Radar rows show symbol/name, reward quote unit, last recorded point change or an explicit withholding reason, and exact UTC observation time. “Recorded ≤3h ago” describes the existing Radar observation threshold, never operational health or complete coverage. `/status` retains its separate 75-minute operational threshold. A numeric point change includes its actual interval immediately beside the reading; it is not a daily rate. No quote amounts are summed, converted or ranked. Units come from the dated reviewed allowlist; matching every compared recorded point remains the backend's responsibility.

Native closed `details` elements progressively expose matched-period distributions/velocity, coverage failures, intervals, payout counts, full quote mint, identity provenance and source links. Dossier deep links retain their address and sharing contracts, with research behind Evidence / Details. Dataset provenance retains exact-byte revision, source status, original retrieval time and response generation time. All original calculation safeguards and disclosure links remain accessible.

## Missing-data contract

- Loading/client failure: unknown counts use `—`; there are no substitute rows, amounts or source times. Retry is explicit; there is no polling.
- Valid empty history: known identity count, zero tokens with recorded points, no recorded timestamp, and “Not enough history.” Zero observed-token counts do not imply zero rewards.
- HTTP 503 identity-only report: tracked identity count remains known; observed-token and comparison counts are unknown. Rows say “Observation unavailable,” not that no collection ever occurred.
- Degraded source: retained actual records stay dated; current comparisons are withheld. Retrieval never refreshes observation age.
- Stale/reset/mismatched/long-gap records: numeric change remains withheld, with the exact reason. Genuine comparable unchanged counters still display `0` plus their quote unit and actual interval.
- Passing matched comparison: the count reflects the existing paired 24h coverage gate, not a trading signal, health score or expected payout.

## Contracts, security and cost

No `lib`, API, allowlist, observation, archive, collector, scheduler or workflow file changes. Quote-mint filtering, evidence/freshness sorting, source bounds and cache/backoff remain the existing API behavior. `/status`, `/brief`, `/research`, query-mint dossiers and immutable edition paths are preserved. No dependency or lockfile changes, browser storage, telemetry, credentials or permissions are added.

Home now makes one on-demand `/api/radar?sort=coverage` read for its overview/preview. It shares the existing bounded GitHub reader with Radar; it adds no direct StonkFun crawl, scheduler, paid infrastructure or unattended polling. Cold server instances and navigation still consume existing hosting/GitHub quotas. Bundle size grows on Home because it renders evidence; see build results below. Untrusted public text remains React-escaped; sources are existing validated report links. Financial copy, reflow and disclosure discoverability need explicit human review under AGENTS.md.

## Before / after review

All normal screenshots use the local production build and real main-backed responses. No financial fixture is supplied to these captures. Full-page screenshots show normal content without injected banners; filenames and the dated machine-readable reports identify them as local, not production or physical-device proof. Before Home did not fetch an overview; before Radar's captured response records the genuine dataset. Screenshots can differ in retrieval time and source-cache status because these are real separate reads.

| Width | Home before | Home after | Radar before | Radar after |
| --- | --- | --- | --- | --- |
| 320 | [Before](screenshots/ux-v2-before-home-320.png) | [After](screenshots/ux-v2-after-home-320.png) | [Before](screenshots/ux-v2-before-radar-320.png) | [After](screenshots/ux-v2-after-radar-320.png) |
| 390 | [Before](screenshots/ux-v2-before-home-390.png) | [After](screenshots/ux-v2-after-home-390.png) | [Before](screenshots/ux-v2-before-radar-390.png) | [After](screenshots/ux-v2-after-radar-390.png) |
| 1280 | [Before](screenshots/ux-v2-before-home-1280.png) | [After](screenshots/ux-v2-after-home-1280.png) | [Before](screenshots/ux-v2-before-radar-1280.png) | [After](screenshots/ux-v2-after-radar-1280.png) |

[Before response evidence](evidence/ux-v2-before.json) and [after browser checks / exact captured responses](evidence/ux-v2-browser.json). At baseline, revision `sha256:8252f9d79b49c9ef0e8a0a378a1f98fa314698b164d07b483062146d076f9a8c` had seven tracked tokens with real records. Latest observations were October 13 at 19:19:34–35 UTC; KNOTS had seven points, the other tokens five. All last-point changes were withheld for intervals over two hours, and zero matched comparisons passed. This is sparse historical coverage, not evidence of zero payouts or verified hourly collection. No positive production financial comparison is claimed.

## Reproducible checks

Required commands: `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Archive preservation: `bash scripts/archive-tool.sh check origin/main`. New rendered-component tests run in `npm test` and use deterministic fixtures only within tests. They cover unknown loading/failure/503 counts, valid empty history, genuine comparable zero, quote units, exact timestamps versus retrieval, stale/source/reset/identity/gap barriers, fully covered historical evidence, closed disclosure semantics and retained source links.

Built-app browser matrix:

```sh
# Start the built local app. Node 24 --use-env-proxy is needed only in this managed proxy environment.
node --use-env-proxy node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3114
# Optional local QA tools, outside the repository; no project dependency changes.
npm install --prefix /tmp/scout-ux-tools --ignore-scripts --no-audit --no-fund axe-core@4.10.3
python tests/ux-v2-browser.py --base http://127.0.0.1:3114 --axe /tmp/scout-ux-tools/node_modules/axe-core/axe.min.js
```

The harness requires an existing Python Playwright installation and Chromium. It rejects remote hosts. It asserts real response row counts, per-row quote units and observation times, first-screen Radar entry/overview, semantic landmarks, 44px controls, actual keyboard skip/disclosures, nested evidence accessibility, quote filters/sort/refresh, preserved routes/metadata, no horizontal overflow, enlarged-text reflow, and axe-core WCAG A/AA checks in collapsed/expanded states. Browser-aborted requests verify honest failure/retry/recovery; one explicitly labeled artificial empty response exists only inside the test and is never screenshot evidence. A stalled request checks the loading/busy state without financial fixtures. These checks are not WCAG certification.

## Mobile Safari human QA checklist (pending)

On a separately approved preview, record actual iPhone model, iOS/Safari version, app revision and UTC time. No production activation is needed for this review.

- Within five seconds, explain reported reward-flow research, identify the Radar entry and distinguish the three evidence counts. A human reading test is still needed; automated viewport assertions cannot establish comprehension.
- At narrow portrait widths, landscape and enlarged system text, check navigation, mint entry, quote selectors, timestamps and expanded evidence for clipping or overlap. Observe Safari's native select and `details` behavior.
- With VoiceOver, check primary/current navigation, the main landmark, token symbols/names, reward-unit labels, unknown counts, status announcements and token-specific disclosure names. With keyboard, verify visible focus and Enter/Space on nested disclosures.
- Exercise manual refresh, a quote filter, browser Back and a query-mint dossier. Verify actual interval, recorded UTC time and unit before interpreting a number. Open Data Health when collection/coverage is sparse.
- Open `/brief`, `/research` and the preserved permanent edition URL. Check research/optional STORK links without connecting a wallet or treating the relationship as a promotion. Do not dispatch workflows or configure services for QA.

Actual Safari/WebKit/VoiceOver/device QA, production HTTP proof, native sharing and five-second user comprehension are unverified. Sparse real data does not demonstrate a positive matched-comparison layout; complete-history rendering is tested with clearly artificial fixtures only.

## Risks and rollback

The main UX risk is mistaking a recent observation or an identity verification for complete coverage. Exact timestamps, separate comparison counts, plain withholding reasons and retained evidence disclosures address it. Progressive disclosure can reduce methodology discoverability: review labels and keyboard/VoiceOver behavior before merge. Home's new one-shot read can fail independently; it shows unknown counts and a retry. Automated Chromium and axe checks cannot substitute for mobile Safari human QA.

Revert this UX PR through a reviewed branch/PR and a separately approved application rollout. It restores previous Home/Radar presentation; all genuine observations, allowlist, archive editions, calculations and backend contracts remain. No data migration, financial state rollback, permission/secret change or scheduler/collection-gate operation is required. Do not revert later genuine data commits. Merge and any deployment remain human decisions; the collection gate, Cloudflare scheduler and archive publication stay outside this change.

## Recorded final results

Local checks used Node 20.20.2 / npm 11.9.0. The production-preview server used Node 24.19.0 `--use-env-proxy` solely for this managed environment, without changing application proxy behavior or dependencies.

| Command | Exit | Result |
| --- | --- | --- |
| `npm ci` | 0 | 336 packages installed; existing ESLint 9.39.5 deprecation warning |
| `npm test` | 0 | 124 app/workflow/UI JavaScript cases + 14 offline Worker cases + 62 Python cases; no failures/skips |
| `npx tsc --noEmit` | 0 | Types pass; homepage and query-token `generateMetadata` compile |
| `npm run lint` | 0 | No lint errors/warnings |
| `npm run build` | 0 | Production routes compile; existing edge-runtime/static-generation warning remains |
| `bash scripts/archive-tool.sh check origin/main` | 0 | Archive append-only / reproduction check passes |
| Browser matrix command above | 0 | 48 scoped checks pass at 320/390/1280px; no page errors or overflow, zero axe violations in tested states |

Eight new rendered-evidence tests are included in the 124 app/workflow cases. All normal screenshot responses have the same real byte revision as baseline; an independent bounded GitHub GET matches it. Exact capture/retrieval/evaluation times remain in the response evidence, and every displayed observation matches its response field. Browser checks finished at 2026-10-13T21:29:26.270153+00:00.

A byte inventory confirmed 46 existing files under `data`, `lib`, `app/api`, `.github`, `scripts` and `scheduler` are unchanged, including the original archived edition and collection gate. The older readiness browser harness only updates its Home CTA locator/label for Open Radar; it changes no application contract. Build-only generated `next-env.d.ts` changes were removed. Home's reported first-load bundle is 117 kB (baseline 112 kB), Radar 112 kB (baseline 111 kB); these are build estimates, not device performance benchmarks. Human Safari/VoiceOver/comprehension approval remains pending. No manual deployment, merge, workflow dispatch, service activation or credential configuration occurred.
