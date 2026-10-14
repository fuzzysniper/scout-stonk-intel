# Homepage conversion V1 — issue #48

## Problem and decision

The main homepage at `5480836` (merged #45) offered an empty search state, five similarly weighted navigation choices and technical paragraphs before useful token evidence. The correction is one task: **“Find memecoins that reward holders in the assets you follow.”** Choose a reward asset, then inspect matching memecoins. This describes documented mechanisms, not a promise that every discovered token rewards holders, eligibility, investment returns or equity ownership.

Four familiar, equally weighted choices are NVDAX, GLDX, STONK and SPCXX. They are curated **identities to verify**, not rankings, recommendations or a static registry. Buttons require live canonical exact-mint registry validation; loading/failure cannot invent availability. No token request happens until selection. A single search finds other registry assets, including other STONKs. No new API, data source, financial formula, package, polling, workflow, scheduler, Cloudflare or collection change.

Rows keep name/symbol, real nullable USD liquidity/24h volume and honest reward evidence. Alphabetical order preserves the existing sample, never a return ranking. One Evidence / Details entry opens full identity, source times, actual reward observation/interval dates, provenance, unavailable historical returns and a dossier link. Missing is not zero. Source-reported liquidity is not independently verified executable liquidity. Critical incomplete/partial sample, unverified reward mode, stale/invalid history and unavailable-flow warnings remain outside disclosures. USD snapshots are explicitly not live quotes; holder returns remain unknown. Native More retains Radar and the public Daily Brief/archive; Research/Status remain secondary. No route, immutable edition or query dossier is removed.

## Identity and source boundaries

| Featured label | Exact candidate mint | Registry meaning |
| --- | --- | --- |
| NVDAX | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | NVIDIA quote-token identity, not equity ownership |
| GLDX | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` | GOLD quote-token identity, not metal ownership |
| STONK* | `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx` | One explicit identity; other assets share its ticker |
| SPCXX | `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` | SPACEX quote-token identity, not equity ownership |

Each enabled choice retains its own complete canonical registry response and provenance. Exact mint/ticker must match; decimals/program/name are read from the validated response and checked against the selected catalog before figures render. Selected sample reads use only `/api/pairs?quoteMint=<original-case mint>&discovery=pair`, plus existing recorded Radar evidence. No ticker joins, global-page fallback or documentary-data fallback. Shared source caching, provider cooldown, four-reader cap and one cold scope/minute/process stay authoritative. Fast switching can be unavailable; the UI does not pretend to know whether this is admission, outage or upstream quota. Manual retry is available, without automatic retries or raw HTTP jargon.

Registry membership proves neither universal registry completeness nor comprehensive token coverage, market availability, reward mode, payouts or holder entitlement. The scoped sample remains at most two pages ×25, complete=false, atomic=false even when small. Provider market-cap pages choose that sample; provider totals are not complete ecosystem counts. Only the existing tracked seven can join historical Radar through exact token/quote/pool/source identity, verified reward mode and the existing freshness/reset/gap/interval gates. Counter distributions are not individual returns. All historical/benchmark/holder-return fields stay unavailable as the backend declares.

## Genuine before/after evidence

Before: unmodified latest main `5480836`, local optimized production build. After: the feature's combined frontend with that same unchanged backend. Chromium, viewport height844, widths320/390/1280. Captures use genuine current same-origin APIs and public provider responses; no intercepted or synthetic financial data is photographed. Timestamps/revisions/nullable market values and measured first-viewport bounds are recorded in [before evidence](evidence/pair-simple-before.json) and [after evidence](evidence/pair-simple-browser.json). Differences in dates/values are source changes, not performance comparisons.

| Width | Before | After landing | After selected NVDAX |
| --- | --- | --- | --- |
| 320 | [Before](screenshots/pair-simple-before-320.png) | [After](screenshots/pair-simple-after-home-320.png) | [Selected](screenshots/pair-simple-after-selected-320.png) |
| 390 | [Before](screenshots/pair-simple-before-390.png) | [After](screenshots/pair-simple-after-home-390.png) | [Selected](screenshots/pair-simple-after-selected-390.png) |
| 1280 | [Before](screenshots/pair-simple-before-1280.png) | [After](screenshots/pair-simple-after-home-1280.png) | [Selected](screenshots/pair-simple-after-selected-1280.png) |

Measured landing chip bounds (top → bottom) are247.3→295.3px at320,226.3→274.3px at390 and238.4→286.4px at1280; every chip is48px high. Search ends at403.9/382.9/397px respectively. The first selected token begins at552.6/513.6/527.7px, with two complete rows visible on the320px capture. Warm local-registry first-action readiness was0.260/0.270/0.307seconds; these are cached local measurements, not cold-provider or production latency promises.

Additional genuine390px states: [temporary unavailability](screenshots/pair-simple-after-unavailable-390.png), [expanded row Evidence](screenshots/pair-simple-after-evidence-390.png). Synthetic error/empty/null states are isolated tests only, never screenshot sources. A headless Chromium raster artifact affected an optional search-state photo; it is omitted. Duplicate-identity interaction and source packets remain tested. The supplemental genuine503 capture uses390×844 CSS pixels at device scale2 (780×1688 PNG), software compositing and a native viewport refresh; no page data or image pixels are edited. [Supplemental source packets and capture method](evidence/pair-simple-supplement.json) and `tests/pair-simple-capture.py` record the method. Main before/after captures use device scale1.

## Five-second cold-user script — human proving gate

Recruit five crypto-native visitors unfamiliar with SCOUT. Use their usual mobile browser at320 or390px; alternate widths. Give no product explanation, registry terminology or asset-selection coaching. Start with the settled homepage, show it for five seconds, then cover the page. Record their own words before showing the screen again:

1. “What does SCOUT do?”
2. “How would you choose NVDAX?”
3. “What is verified here, and what is still unknown?”

Then uncover the page: “Show me NVDAX memecoins, then show me where you would check the evidence.” Do not point or correct them. Record first tap, completion time, requests for help, interpretation of the shared-ticker mark, unknown/null data and whether they infer equity ownership, guaranteed payout, rankings or personal returns. Stop without wallets or trading. Record anonymized answers, not personal/financial information.

Operator answer key (never read before responses): SCOUT finds memecoins associated with a chosen reward asset; tap the visible NVDAX choice; registry identities are verified, reward mode/history varies per token, coverage is incomplete and holder returns are unknown. A visible mode label is separate from proof of individual entitlement. Evidence is the native row/pair disclosure. Proposed human pass gate: at least4/5 visitors independently identify the purpose and NVDAX action, can distinguish verified identity from unknown rewards/returns, and none infer guaranteed yield/equity ownership. Investigate confusion instead of treating the screenshot/automation as comprehension proof.

**No cold human study has been performed by this implementation.** The artifact proves layout, interaction and evidence preservation; the script is ready for an owner-run test before product acceptance. Browser timing is a local observation, not a five-second comprehension or production-latency guarantee.

## Regression, accessibility and reproduction

Use the root toolchain without changing dependencies. In this managed environment, Node20.20.2/npm11.9.0 run app checks. Node24.19.0 `--use-env-proxy` runs only the local production server with inherited CA/proxy and normal TLS verification so public read-only provider fetches work. This adds no app proxy logic.

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
npm run start -- --hostname 127.0.0.1 --port 3165
# Separate terminal; QA-only installed Playwright, Chromium and pinned axe 4.10.3:
python -u tests/pair-simple-browser.py --base http://127.0.0.1:3165 \
  --axe /path/to/axe-core-4.10.3/axe.min.js
# Immediately after the combined run, recapture the genuine503 state at DPR2:
python -u tests/pair-simple-capture.py --base http://127.0.0.1:3165
```

Use a fresh production server for cold-query proofs; do not build into its `.next` directory while it runs. The real-source test spaces cold featured scopes61seconds apart, respecting provider budgets. Genuine429 is not induced. Isolated fixtures cover429/503, missing/forged/partial preset validation, token identity/scope mismatch, empty bounded results, null markets, unverified modes and explicit recovery. Unit regressions retain all exact identity, source/count/ambiguity, pagination revision, Unicode, missing-data, true-zero, reward reset/gap/staleness and withheld-return gates. Accessibility covers one h1/main, skip focus, labeled search,44px controls, native keyboard disclosures, archive access, enlarged-text reflow and axe WCAG2A/AA/2.1AA. This is not physical iPhone/Safari/VoiceOver certification.

| Command | Exact final result |
| --- | --- |
| `npm ci` | Exit0;336 packages; manifests/lockfile unchanged |
| `npm test` | Exit0;186 main JS +15 adapter JS +62 Python;0 failures/skips |
| `npx tsc --noEmit` | Exit0; no diagnostics |
| `npm run lint` | Exit0; no lint errors/warnings |
| `npm run build` | Exit0;9/9 static pages; homepage126kB first-load JS |
| `bash scripts/archive-tool.sh check origin/main` | Exit0; append-only/reproduction passed |
| `npm run archive:dry-run` | Exit0; replay/idempotency/tamper checks passed; working archive unchanged |
| `python -u tests/pair-simple-browser.py --base <local> --axe <pinned axe>` | Exit0;57 checks:20 real-production +37 isolated;320/390/1280px;0 tested axe violations |
| `python -u tests/pair-simple-capture.py --base <local>` | Exit0;3 genuine supplemental capture/source checks |
| `git diff --check` | Exit0 |

Final combined browser run:2026-10-14T21:24:45Z–21:29:13Z. All four selected exact-mint samples returned50 records, retaining complete=false/atomic=false. Provider-reported scoped totals were7662 NVDAX,1910 GLDX,10618 STONK and8656 SPCXX; these are provider counts, not complete independently verified universes. This run verified no reward modes within its samples: rows correctly show unverified evidence. The source packets preserve actual dates and revisions. Superseded debugging runs are not passing results. Protected backend/API/data/workflow/scheduler/dependency paths compare byte-for-byte to main `5480836`.

The optional `--isolated-only` browser mode can recheck synthetic states using a completed saved genuine proof file without new provider reads or screenshots. It is not a replacement for the default combined real-source run. The default run above completed after correcting an isolated fixture that had accidentally supplied a valid STONK identity to its own “forged” case.

## Critical self-review, limitations and rollback

The correction removes the empty search-only start, redundant browse action, full-mint/time paragraphs above rows and competing home navigation actions. The long promise is intentionally concrete; at320px it wraps, so actual controls must remain in the first viewport. The unchanged shared STORK relationship footer is secondary, below the task. Full row names can clamp to two lines; Evidence retains the full name. Small USD values use scientific notation to avoid silently rounding nonzero amounts to zero.

Featured choices depend on registry availability and are disabled while checking; they are not guaranteed instant under outage. Initial verification adds four bounded same-origin identity reads served by the existing shared registry reader/cache, without token fanout. Source-verified tickers are not audited onchain or proof of underlying asset ownership. Mode checks may be sparse/unavailable, and most discovered tokens lack tracked reward history. The server's rate/admission policy can prevent a quick second selection from producing results. No UI work can create missing history, prove entitlement or expand provider coverage. Long lists still require scrolling; the human cold-user test and physical iPhone accessibility review remain outstanding.

Human-review PR only. No merge, production deployment, source/data/archive mutation, credential setup or scheduler/collection activation is performed. Rollback is a human-reviewed revert of this issue's frontend/test/documentation commit, preserving main's merged #45/#47, every actual observation and the archive. No migration, backend rollback, secret deletion or permission change is needed.
