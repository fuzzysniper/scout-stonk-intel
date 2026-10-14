# Pair Intelligence Day 1: evidence and critical UX review

Issue #39, frontend only. Base: `70bd6ca56e12efec51d821dc0726e88390cba020`. Both sides below are local **production builds**. Screenshots use genuine `/api/radar` records; no interception, mock snapshots, substituted timestamps or artificial market metrics. API responses and capture metadata are retained in [browser evidence](evidence/pair-day1-browser.json). The selected identities come from the existing validated tracked allowlist, not a newly discovered catalog.

| Viewport | Before | After |
| --- | --- | --- |
| 320 × 844 | [Before](screenshots/pair-day1-before-home-320.png) | [After](screenshots/pair-day1-after-home-320.png) |
| 390 × 844 | [Before](screenshots/pair-day1-before-home-390.png) | [After](screenshots/pair-day1-after-home-390.png) |
| 1280 × 844 | [Before](screenshots/pair-day1-before-home-1280.png) | [After](screenshots/pair-day1-after-home-1280.png) |

Additional genuine captures: [ZEC mobile](screenshots/pair-day1-after-zec-390.png), [ZEC desktop](screenshots/pair-day1-after-zec-1280.png), [expanded mobile evidence](screenshots/pair-day1-after-evidence-390.png). The ZEC captures show keyboard focus on its selected chip, plus MASK and ZCAT sharing the verified quote mint. Neither token is ranked by rewards.

## Critical five-second self-test

Question: **Can a whale identify a pair and relevant research in under five seconds?**

Self-review of rendered screens: yes for identifying the selected NVDAX quote and SI dossier, or clicking ZEC to see MASK/ZCAT together. The mint is visible, the selected chip has a strong filled state, and both desktop and mobile place the relevant first token within the first viewport. Search accepts quote symbol, quote mint, token symbol, token name or token mint. Switching pairs does not wait on an API request.

This is **not** evidence of a successful timed user study or trading decision. Critical limitations:

- All genuine captured rows currently say “Insufficient comparable history.” The screen offers verifiable research paths; it cannot yet answer which token has a better return or support capital allocation. Liquidity, pair return and holder rewards stay Unavailable.
- The selected token begins at ~618px / 600px / 534px for 320 / 390 / 1280 widths, versus generic first rows at ~330px / 308px / 301px before. The added space buys explicit pair selection and identity, but there is a density cost. At 390px, both ZEC token names/readouts fit the first viewport; at 320px, evidence for the second token requires scrolling.
- A full quote mint is useful verification but visually dense on narrow screens. It wraps without clipping and remains a source link. It is not an equity/metal ownership assertion.
- Seven tokens and six quotes are a curated sample. Missing pairs cannot be interpreted as nonexistent. Initial NVDAX is a verified convenience default, not a recommendation or payout rank.
- The next useful improvement depends on #38's real catalog and source feasibility, followed by an actual analyst usability session. Larger catalog behavior and physical-device assistive technology remain unproven.

## Validation

- `npm ci` passed (writable temporary cache; dependency manifests/lockfile unchanged).
- `npm test` passed: existing backend/source/API/archives, 62 Python tests, local scheduler harness, and new frontend adapter/render tests. Synthetic financial observations are confined to named tests, including matched periods, true zero changes, stale/reset/identity/gap failures. No scheduler or staging code was edited or activated.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` passed.
- 33 responsive production-browser checks passed across 320/390/1280: exact quote-mint grouping, genuine observation dates, local selection/search with no extra requests, refresh preserving selection, keyboard Space/Enter disclosures, skip link and visible focus, single h1/main, 44px primary controls, no overflow, and enlarged-text reflow.
- Axe-core 4.10.3 found zero WCAG 2 A/AA and 2.1 AA violations in tested collapsed/expanded/empty-search/loading/outage/degraded/stale/forged/empty-response/slow-Health states. Aborted or synthetic API responses were used only in isolated tests, never screenshots. Native buttons and details/summary preserve pressed/disclosure semantics. Chromium does not establish Safari/VoiceOver behavior or WCAG certification.
- `/brief`, `/radar`, `/research`, `/status`, a permanent archived edition, dossier query links and OG metadata were verified. Returning from a dossier to Home restores the pair explorer. Dossiers bypass explorer requests. STORK footer/disclosures remain intact.
- Home first-load JavaScript: baseline 117 kB → 120 kB (Next build estimate). No new dependency, polling, provider fanout per token or pair-switch fetch. Health loads independently so diagnostics do not delay observed rows.

Reproduction: build latest-main worktree and feature checkout; run local previews on 3113/3112 with `NODE_USE_ENV_PROXY=1` for the managed runtime; run `python tests/pair-explorer-browser.py --axe /path/to/axe-core-4.10.3/axe.min.js`. Axe and Python Playwright are QA-only tools, not app dependencies.

The first sandboxed full test attempt failed in the existing local scheduler harness; rerunning with local network/socket access passed. Normal npm cache writes also needed a writable `/tmp` cache. These were runtime setup issues; no application workaround or backend edit was made.

Integration: [frontend contract for #38](PAIR_FRONTEND_CONTRACT.md). Risk: catalog/source interface may change, dated allowlist verification is not live provider verification, and unavailable data limits usefulness. Rollback: revert this frontend change; no migration, merge or deployment performed.
