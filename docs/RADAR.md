# Intelligence Radar V1

Issue: [#6](https://github.com/fuzzysniper/scout-stonk-intel/issues/6). The Radar is a bounded, read-only research view at `/radar`, linked from the homepage and token dossier. It does not rank investments, compare inferred returns, annualize distributions, predict payouts or require wallets/payments.

## Verified discovery and allowlist

Discovery used the official public catalog `https://www.stonkfun.xyz/api/public/v1/tokens?limit=20`, without pagination or a mass crawl, then seven selected reward endpoints. The catalog was rechecked at `2026-10-12T20:37:52+00:00`; reward identity checks occurred at `20:36:36–20:36:37 UTC`. Selection preserves the existing KNOTS mint and adds six reward-mode catalog entries with matching mint and quote identities and positive payout counts. All seven reported a payout within the previous 24 hours at verification. “Active” here means this dated API evidence, not guaranteed ongoing payouts, popularity, independent onchain reconciliation or an endorsement. The standard-mode STONK mint is a quote asset for KNOTS, not enrolled as a reward token.

| Token | Reward-token mint | Quote symbol / mint |
| --- | --- | --- |
| ALLINU | `4MMQY9bwkxxTtsK3W227Q5ABT6yFY8Pmn9Ze7wmAXKY8` | DKNG / `DKNGQFNGQmoBdXSRGKJ8tTu7uPDasw5JDcfMmWniNfow` |
| Anonymous Cat (ZCAT) | `HcRLc9VDgjLeK154xDawfb1dmVJ98DoSqcwTHGqiDeJR` | ZEC / `A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS` |
| Bankroll | `B32ocrADBEo1XHsGVnxqP81SaK2NiZkQmmAoTnmT8Ybu` | USDC / `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| KNOTS | `8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS` | STONK / `6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx` |
| NearKat | `6UtY9iTZMQQ5QZVrbzFnNaJntV7oySm9k97mvwnuZcxr` | NEAR / `3ZLekZYq2qkZiSpnSvabjit34tUkjSwD1JFuW9as9wBG` |
| Nullmask | `HuAXPyDWDaMYFKuwQHpqL1oPnj93zdzWmtvFGzCeCUa7` | ZEC / `A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS` |
| Super Inu (SI) | `DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP` | NVDAX / `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` |

`data/tracked-mints.json` is the reviewed/configurable allowlist, capped at ten unique mints, with name, symbol, quote mint/symbol, pool mint, verification time and official provenance. Invalid/duplicate addresses or unsupported sources fail configuration validation. Configuration/identity evidence is bundled with the app and requires review/deployment to change; observation history remains dynamically fetched from GitHub main. No user input can expand the catalog or choose an upstream origin.

Captured official catalog and rewards are in [`public/evidence/reward-verification.json`](../public/evidence/reward-verification.json), served at `/evidence/reward-verification.json`. Each reward capture has its real retrieval time, source URL, exact-byte SHA-256 and a linked raw capture. Catalog response is archived as parsed JSON; its digest identifies original HTTP bytes, not the pretty-printed archive. These are dated official API reports, not invented contracts or unit-test fixtures. Automated tests cross-check every allowlisted identity and recent payout against these captures.

## Collector and actual observations

The existing hourly workflow stays unchanged. Its script now reads the structured allowlist and makes at most ten sequential reward requests (currently seven), each with an eight-second network timeout and a 256 KiB body limit, without request-level retry. A failed 404/429/timeout/malformed response is isolated to its mint; no missing point, zero total or updated timestamp is fabricated. Logs contain mint, actual observation time and safe exception class; they do not print response bodies/redirect destinations. If all mints fail or no new timestamps exist, the script exits nonzero without replacing the dataset. Partial success is written atomically.

Every new record validates returned mint, `mode=reward`, and exact allowlisted quote mint/symbol. It stores observation time **after** the response is read, provider generation time, quote identity, counter, safe counts, payout time and fixed source URL. Provider generation over three hours old or over one minute in the future is rejected. Socket timeout applies to network operations; slow-server operational limits also rely on the GitHub runner's job budget. Optional bad count fields become null, never zero.

Duplicate timestamps (even conflicts) leave existing observations unchanged and log deduplication. Decreases/resets are appended as the actual new counters with an explicit warning; they are never clamped, overwritten or silently skipped. The historical calculator then withholds affected comparisons. Older symbol-only KNOTS observations are preserved byte-for-field, without retroactively adding an inferred quote mint. The quote-identity transition remains a comparison barrier.

An actual collector run during this task appended seven verified observations at `2026-10-12T20:41:27–20:41:29 UTC`. There are now three KNOTS points and one for each new mint in this branch. They are real successful HTTP reads, not reconstructed past samples or test counters. These initial samples do not support 24h/7d totals or a cross-token rate ranking. Provider observations can be cached; `providerGeneratedAt` discloses that distinction, while `observedAt` is when the report was actually read.

Retention is bounded to 193 points per tracked mint (eight days plus a point at hourly cadence), down from the single-token 90-day cap. This provides a cushion around the 168-hour baseline while keeping a ten-mint formatted dataset below the existing 2 MiB reader cap at current record sizes. Missed hourly runs still affect coverage. Collector retention is by count, not guaranteed elapsed time. Do not advertise completeness solely from point count.

## API and comparison safeguards

`GET /api/radar` aggregates the reviewed allowlist against the same sourced GitHub reader used by `/api/history`; it does not call StonkFun once per visitor or use deployment-local JSON as fresh history. `sort=coverage` is now default (Signal Lab evidence readiness, point coverage, then freshness); explicit `sort=name` remains supported, `sort=freshness` orders latest actual timestamps descending with name/mint tie-breaks. Other/repeated sorts return 400. Signal Lab adds allowlisted `quoteMint` filtering; see [SIGNALS.md](SIGNALS.md). There is no sort by amount, investment score or estimated profitability. One GitHub dataset read supplies all rows.

Each row contains mint, expected verified quote identity, identity verification time/provenance, latest actual observation, unique point count, observation freshness, quality issues, last recorded point-change interval/status, 24h/7d coverage, dossier/history/official API/onchain token links. Missing mints still have an identity card but no observation, no delta and no implied zero rewards. The dataset exposes its byte revision, original successful retrieval time and independent source status.

Only the reward quote ledger is used; Bankroll’s separate base-asset ledger is not added to USDC rewards. The latest point-change is the last adjacent recorded pair; it is **not** a per-day rate. It requires valid source/counters, no uncertain timestamp/conflict/reset barrier, explicit matching quote mints/symbols at both points, a latest observation no older than three hours and an interval no longer than two hours. Longer intervals retain their actual timestamps/duration but withhold the numeric change. No search backwards for a favorable older pair is performed. A genuine unchanged comparable counter may yield zero. Quote units differ across tokens and amounts are never summed or ranked.

24h/7d totals retain all [history safeguards](HISTORY.md): nearest baseline at/before the boundary within two hours, no interior gap over two hours, complete actual duration and comparable intervening counters. Radar also requires recorded quote mint identity matching the allowlist throughout the window. Legacy symbol-only or mismatched quotes withhold comparisons; missing identity is not “verified” by metadata alone. Approximate boundaries retain actual timing metadata. Stale or degraded/unavailable source withholds numeric changes/windows. Invalid source responses do not refresh observations.

Freshness and source reliability are independent. The unchanged reader caches for five minutes, backs off failures for one minute, retains last-success data up to 15 minutes as degraded and otherwise returns 503. Radar's 503 can retain allowlisted identity rows, labeled source-unavailable with no invented records; a bad configuration returns a generic error. All radar responses are no-store. The UI displays source/coverage warnings, loading/retry states, UTC timestamps and a manual refresh, with no unattended polling.

## Performance, costs and security

No new external dependencies or paid services. At the present seven-mint configuration the collector makes seven official reward requests/hour, plus no catalog crawling on routine runs. Worst configured count is ten. User Radar requests aggregate at most ten histories/193 points each and reuse one per-instance GitHub cache. Active warm instances fetch at most twelve successful GitHub datasets/hour; cold starts multiply work and failures back off. If growth reaches the reader's 2 MiB limit, it fails safely; review storage/cache changes separately rather than raise limits without analysis. Existing GitHub Actions/hosting bandwidth and execution quotas apply.

Fixed HTTPS origins, validated mint/quote addresses and no arbitrary redirect/source input reduce fetch risk. GitHub TLS/main writes and official StonkFun reports remain trust boundaries. Protect repository/collector write permissions. Captured evidence is public metadata and aggregate counters, not wallet access. No credentials, signer, payment code, SDK for transactions, third-party trackers or speculative alerts are introduced. Public token links open evidence pages only.

## Verification and screenshots

Run `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`. `npm test` covers source/history/Radar and Python collector regression tests, including actual archived identity checks; synthetic responses are confined to labeled test code. Empty histories, 404/429/timeouts, quote mismatch, resets, duplicate/conflicting timestamps, incomplete windows, stale sources, long intervals and source recovery are tested. The collector was also run against the official endpoints to obtain real new samples.

Final checks on Node 20.20.2/npm 11.9.0: `npm ci` exit 0 (310 packages installed); `npm test` exit 0 (41 JavaScript tests plus 7 Python tests, all passed, no skips); `npx tsc --noEmit`, `npm run lint`, and `npm run build` each exited 0. Node 20 was selected via PATH and npm cache via `NPM_CONFIG_CACHE=/workspace/.npm`. The existing ESLint 9.39.5 deprecation warning and edge-runtime/static-generation warning remain. Initial new CSS compatibility warnings were corrected before the final build.

The local production server used Node 24.19.0 `--use-env-proxy` solely for this managed environment’s HTTPS proxy; build/tests ran on Node 20. No application proxy dependency/configuration was introduced. Live radar/history evidence came from GitHub main. Its revision `sha256:4928c873487d0536dcedfbf299fed1e1d92c9caabdc5bc1d07ddaef890a5bb92` matched an independent live download. Seven identity rows were shown; KNOTS had two actual points (latest `2026-10-12T20:32:33.000Z`), six rows no history. No numeric change or 24h/7d total was claimed. `/radar`, valid radar sorts and captured evidence returned HTTP 200; invalid/repeated sorts 400; POST 405; API cache-control no-store.

Chromium at 1280px/390px confirmed seven cards, no horizontal overflow or uncaught page errors, working freshness sorting/refresh, keyboard-operated evidence disclosure and homepage/dossier navigation. Screenshots contain the actual live source response. The client outage screenshot aborts the actual browser request (no invented response/data); it confirms an accessible retry state with no fabricated rows/totals.

- [Desktop live Radar](screenshots/radar-desktop.png)
- [Mobile live Radar](screenshots/radar-mobile.png)
- [Mobile simulated client network outage](screenshots/radar-mobile-unavailable.png)

Exact command and screenshot evidence is also attached to the PR. The live GitHub source remains `main`: until this branch is reviewed/merged, the six newly enrolled histories are not in that source. Pre-merge screenshots honestly show absent live history for those rows, even though genuine initial observations are staged in this branch. No screenshot response is mocked or filled with invented amounts.

After a human-approved rollout, check `/radar` and `/api/radar`: seven allowlisted rows, byte revision/source status, UTC observations and evidence links, valid dossier deep links, keyboard sort/refresh/disclosures, and no horizontal overflow at 390px/1280px. After an actual collector commit and cache expiry, confirm new observations on the same deployment, without redeploying. Confirm no 24h/7d metric until real coverage and quote-identity checks are satisfied. Do outage testing locally/isolated, without changing production DNS or credentials. Initial data sparsity is expected, not permission to fabricate past samples.

## Rollback and approval

Revert this feature commit through a reviewed PR and approved deployment to remove Radar/links and restore the previous allowlist/collector. Preserve any genuine later observations when resolving the data-file revert; do not delete real collected history blindly. Existing `/api/history` and GitHub synchronization continue. No schema migration, DNS change, paid service teardown, secret revocation or transaction rollback is needed. Merge and production deployment require human approval; this task performs neither.

## Signal Lab V1

[Issue #8 methodology](SIGNALS.md) documents the pure matched-period calculation, observed reward velocity, relative velocity change, zero-baseline categories, explicit quote identity and stricter coverage/freshness rules. Signal Lab is now the primary compact card view; last-point/archive and identity evidence remain in disclosures. Earlier screenshots and rollout statements above describe the original Radar release and are retained as historical evidence.

## Data Health operational monitoring

[Data Health V1](DATA_HEALTH.md) documents per-token freshness/coverage, dated scheduler evidence, bounded collection summaries, optional daily operational alerts and human-approved verification. This operational view does not change the historical or Signal Lab calculations.

## UX V2 presentation

[UX V2](UX_V2.md) supersedes the original Home onboarding and expanded Radar card presentation. Compact rows retain quote units, actual observation times and withholding reasons; existing research calculations and provenance remain behind Evidence / Details. Source/API/calculation policies in this document are unchanged.
