# SCOUT UX V2.1 — Flow-First Radar

Issue [#34](https://github.com/fuzzysniper/scout-stonk-intel/issues/34). Base `219c6a46540470677762426f2f8d0aa1759d59e1` includes UX V2 and merged inactive Cloudflare staging PR #33. This is a presentation-only PR for human review. No deployment or activation is performed.

## Product decision

The first screen answers three questions: which StonkFun reward tokens are tracked, when actual evidence was recorded, and whether a valid reward-flow comparison exists. Home and Radar now use one short headline, a compact evidence timestamp/age and coverage line, and a list of token rows. Empty KPI cards, marketing hero, repeated overview cautions and the tall per-row status explanations are removed. Home previews the first three tokens in the backend's evidence order with one Full Radar entry; Radar retains the full list and existing filters/sort/refresh. Navigation keeps Home/Radar/Brief/Data Health and a compact Guide with its descriptive accessible name. STORK remains an optional secondary footer connection.

Each collapsed row shows its symbol (full name retained for assistive technology/tooltip), distinct verified allowlist quote unit, exact UTC observation time and age at the report's evaluation time. It presents **one** existing backend counter-change amount with its actual interval immediately adjacent, or one human-readable state: insufficient comparable history, stale observations or source unavailable. It does not rank money, invent live activity or display recommendations.

## Readout selection — no new reward mathematics

The presentation selects existing API fields, never reconstructs counters or recalculates a financial delta:

1. If the source is available and the backend's paired-period `signals.status` passes, show its current recorded distribution-counter change. Label **Matched 24h target**; show its actual start/end and duration, not an inferred exact daily rate.
2. Otherwise, if the existing Radar `windows['24h']` is available, show that counter change with **24h target · recorded span** and actual endpoints/duration. History/Radar coverage and paired-period coverage remain different methods: a covered current target is useful even without a covered prior target.
3. Otherwise, use an available `pointChange`, labelled **Recorded counter change**, with its actual interval. An 8h gap cannot become a 24h rate: the backend's unavailable long-interval state stays insufficient, with its full reasons/interval retained in Details.
4. Failed/degraded source context suppresses all primary figures; stale records show a stale state. Other withheld comparisons show one insufficient state. Missing values never become zero. A genuine comparable unchanged counter displays zero plus its quote unit and actual interval.

Primary formatting uses up to eight significant digits, with scientific notation for tiny/large amounts so a positive value cannot round into fake zero. This is display precision, not a new monetary calculation. Raw JSON is exact numeric evidence; original detail formatting remains. Amounts are not converted, summed or sorted across currencies. Default coverage/freshness sorting and exact quote-mint filtering are unchanged.

Freshness, reliability and coverage are distinct. **Latest record / age** comes from actual `latestObservedAt` and API `fetchedAt`, never dataset retrieval time. Age is fixed at that response, with no unattended polling. **Coverage** reflects the existing comparison gates, not the recency of a record. **Collection reliability** links Data Health's independent run/commit/diagnostic evidence; a recent point is not an hourly success rate. Details explain Radar's three-hour observation threshold and Data Health's separate 75-minute operational threshold.

All source/identity links, raw byte revision, dataset retrieval and response times, actual interval boundaries, offsets/gaps, payout counters, quality barriers and paired-period research remain behind native keyboard-accessible Evidence / Details. The independent guide remains reachable during errors. Token dossier inputs, share URLs and metadata, `/brief`, `/status`, `/research` and immutable edition URLs remain intact.

## Genuine before / after evidence

These screenshots are **local production builds with real main-backed responses**, not production or physical-device proof. No synthetic positive history or response is used in normal screenshots. Filenames identify local before/after phases; no banner or figure is injected. Dated JSON records the exact served reports and UI geometry.

| Width | Home before | Home after | Radar before | Radar after |
| --- | --- | --- | --- | --- |
| 320 | [Before](screenshots/flow-first-before-home-320.png) | [After](screenshots/flow-first-after-home-320.png) | [Before](screenshots/flow-first-before-radar-320.png) | [After](screenshots/flow-first-after-radar-320.png) |
| 390 | [Before](screenshots/flow-first-before-home-390.png) | [After](screenshots/flow-first-after-home-390.png) | [Before](screenshots/flow-first-before-radar-390.png) | [After](screenshots/flow-first-after-radar-390.png) |
| 1280 | [Before](screenshots/flow-first-before-home-1280.png) | [After](screenshots/flow-first-after-home-1280.png) | [Before](screenshots/flow-first-before-radar-1280.png) | [After](screenshots/flow-first-after-radar-1280.png) |

[Before](evidence/flow-first-before.json) / [after browser evidence](evidence/flow-first-browser.json). Baseline revision `sha256:2047872698c6d5093ff008f943ff84886561c7a79fdae0bab4ff1d16ac26eb61` contained genuine latest observations at October 13 23:44:36–37 UTC. All seven rows were recent at inspection, yet every last-point change failed for a long interval and no matched-period comparison passed. This is the useful distinction: recent evidence, insufficient comparable history. No supported positive financial figure is claimed in these real screenshots. An independent bounded GitHub download matched the baseline source hash; captures retain their own revision/time if main changes during QA.

## Critical UX self-review

**Less wordy:** the main action moved from reading a hero, three KPI blocks, repeated warnings and multiple status lines to scanning a record list. At 390px baseline Home's first row started around 676px and Radar's around 831px; V2 rows were about 260px tall. The new ordinary limited-data rows are about 126px and begin around 308px/332px respectively. Exact final values are in the browser report. This improves access to actual token/unit/time facts above the fold; it is not a five-second human comprehension measurement.

**More useful:** the current real data now communicates “recent record, insufficient comparable flow” without requiring a method deep dive. When evidence supports an amount, the strongest available existing interval appears directly beside it, with real zero preserved. Reliability inspection remains distinct. An analyst can still filter quote identity, choose evidence/freshness order and open all source records.

**What remains weak:** real coverage is sparse, so the product still offers little defensible financial comparison today. Compact UI cannot repair missing observations. Repeating an insufficient state across seven rows can still feel uninformative; it is preferable to invented figures. Short quote badges depend on the dated allowlist, not independent onchain reconciliation; full mint/provenance stays in Details. Full intervals increase row height when amounts are available, especially at 320px, because concealing exposure would mislead. Small evidence text requires real-device review. Dataset and nested disclosures can still be several taps away; human VoiceOver/discoverability review is necessary. No click/user study or conversion metric is collected. Five-second comprehension and finance usefulness are goals pending human testing, not measured achievements.

## Verification and boundaries

Root commands use Node 20.20.2/npm 11.9.0: `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Archive checks: `bash scripts/archive-tool.sh check origin/main` and `npm run archive:dry-run`. The existing scheduler/Cloudflare package is untouched; root regressions continue covering its static policy and prior offline adapter.

Rendered-component tests cover missing/loading/source-degraded/503, actual versus retrieval times, age formatting, valid zero, tiny positive formatting, paired/current-window/point priority, stale/quote/reset/gap withholding, one primary amount, visible actual intervals and retained advanced evidence. Synthetic positive histories exist **only in isolated tests**. The browser harness compiles the unchanged backend calculator into a removed temp directory to generate its labeled fixtures; those cases are never screenshot evidence or real records.

After a production build, use the existing local QA tools:

```sh
# Node 24 --use-env-proxy is needed only for this managed environment's read-only source routing.
node --use-env-proxy node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3121
# Existing Python Playwright + Chromium required; optional axe tool installed outside repo.
npm install --prefix /tmp/scout-ux-tools --ignore-scripts --no-audit --no-fund axe-core@4.10.3
python tests/ux-v2-browser.py --base http://127.0.0.1:3121 --axe /tmp/scout-ux-tools/node_modules/axe-core/axe.min.js
```

The harness keeps its prior filename but now verifies Flow-First and writes only `flow-first-*` evidence/screenshots; older V2 artifacts remain preserved. It rejects remote base hosts. It checks real response counts, units and exact timestamps, no KPI deck, first-screen entries, landmarks/active nav, 44px controls, Tab/Enter skip/focus, native nested Enter/Space disclosures, axe WCAG A/AA in collapsed/expanded states, quote filter/sort/manual refresh, browser Back, preserved guide/brief/status/edition routes, dossier metadata and real local clipboard sharing, enlarged-text reflow, no overflow/page errors, aborted-client retry/recovery, busy loading, empty responses and isolated valid/zero/gap/stale/unavailable layouts. These scoped checks are not WCAG certification, actual Safari or a phone share-sheet test.

[Protected hashes](evidence/flow-first-protected.json) verify **57** tracked backend/API/math, real data/allowlist/archive, collector/gate/other backend scripts, workflows, full Cloudflare scheduler/staging and root dependency files are unchanged from starting main. Only the existing UI browser harness's entry/status locators change among `scripts`. No treasury or tokenomics code exists in the change; no STORK repository is modified. No added project dependency, telemetry, payment, wallet, price target or scheduler operation.

## Mobile Safari human review checklist — pending

On a separately approved preview, record exact app revision, iPhone/iOS/Safari version and UTC time. Prior Safari observations do not prove this release.

- In five seconds, identify StonkFun reward tokens, the evidence time/age and whether a valid flow figure exists. Explain why a recent point can still have insufficient history. Record success/confusion without invented comprehension statistics or personal financial details.
- At narrow portrait/landscape widths and enlarged system text, inspect symbol/unit separation, timestamps, actual numeric interval reflow, native selectors, touch targets and the Guide entry. Do not infer equal quote amounts are comparable investments.
- With VoiceOver and keyboard, check nav/current page/skip target, symbol plus full name, quote unit, loading/error state, token-specific Evidence / Details, nested period boundaries and raw source links. Confirm visible focus and Enter/Space operation.
- Test Full Radar, sorting, quote filtering, refresh, browser Back, mint dossier and sharing on the local/approved preview only. Native Safari share-sheet behavior is not established by the local clipboard test.
- Open Data Health to distinguish collection reliability from the record age and comparison coverage. Check the preserved Brief/edition/guide URLs and secondary optional STORK relationship. Do not dispatch workflows, connect wallets or activate the scheduler for QA.

## Risks and rollback

Financial presentation can be misread as yield or prediction; explicit units/actual intervals, retrospective counter labels and unchanged evidence gates reduce that risk. Broader raw/math/source/holder-return cautions remain accessible in Details/Guide instead of being repeated above every row. Human reviewers must approve financial copy and the changed information hierarchy under AGENTS.md. Source outages, stale records and sparse coverage stay honest; neither byte hash nor recent retrieval establishes current collection health.

Rollback is a reviewed revert of this presentation/tests/docs PR followed only by a separately approved app rollout. Restore UX V2's Home/Radar/nav presentation while preserving all later genuine observations, immutable archives, financial methods, backend APIs and both schedulers. No data migration/deletion, permission/credential change, Cloudflare operation, archive activation, trade or tokenomics change is required. Do not revert data commits or enable collection as recovery. Open PR only; merge/deployment/activation remain separate human decisions.

## Recorded final results

| Command | Exit / result |
| --- | --- |
| `npm ci` | 0; 336 packages from unchanged root lockfile |
| `npm test` | 0; 129 app/workflow/UI/staging-policy JS + 14 existing adapter JS + 62 Python; no failures/skips |
| `npx tsc --noEmit` | 0; homepage and mint-specific metadata compile |
| `npm run lint` | 0; no lint errors/warnings |
| `npm run build` | 0; production routes compile |
| `bash scripts/archive-tool.sh check origin/main` | 0; append-only/reproduction passes |
| `npm run archive:dry-run` | 0; real pinned replay, idempotency/tamper checks and unchanged working archive |
| Local browser matrix above | 0; **69** checks at 320/390/1280px, zero axe violations in tested states |

Browser verification completed at 2026-10-14T00:20:01.882016+00:00. All six normal after captures match the same real source revision as baseline; no fixture was supplied to those screenshots. The independent source download also matched. Scoped tests include actual clipboard sharing and 21 isolated synthetic layout cases (seven cases × three widths); positive fixtures never enter the dataset or normal screenshot artifacts. Ten rendered UI regressions are part of the 129 app/workflow cases. Current record age and coverage remain distinct from reliability.

Existing ESLint installation deprecation and Next edge-runtime/static-generation warnings remain. Local production server used Node 24.19.0 `--use-env-proxy` only for the managed network; app checks used Node 20.20.2. Generated `next-env.d.ts` changes were removed. No new dependency or backend/Cloudflare file change. Physical Safari/VoiceOver, native share-sheet, human five-second comprehension and production HTTP proof remain pending. No manual deployment, merge, scheduler activation, wallet/treasury access or trade occurred.
