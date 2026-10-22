# Exact implementation evidence — October 22, 2026

**Live/persistent success criterion remains BLOCKED, not claimed.** No source or RPC acquisition was performed. Native acquisition stays disabled by the checked-in false approvals and strict owner entry. Actual live counts, independently finalized counts, reject counts, latency and gaps are **NOT MEASURED / NOT RUN**. The owner's earlier #154 proof is a separate founder-reported two-read snapshot, never reused as stream evidence or budget.

| Check | Actual local result |
|---|---|
| Root `npm ci` | Exit 0, 356 packages; existing ESLint deprecation warning. Root dependencies unchanged. |
| Isolated `npm ci --prefix experiments/live-market --ignore-scripts` | Exit 0, one pinned MIT `ws` 8.22.0 package. No provider/key/account use. |
| `bash experiments/live-market/test.sh` | **30/30 pass**, no skips/failures. Pure synthetic fixture tests, mocked native provider transport and real loopback HTTP only. No market-data connection. |
| `bash experiments/launch-intel/test.sh` | **47/47 pass**, unchanged #158 decoder/replay. |
| Root `npm test` | **1,160 Node + 107 Python = 1,267 pass**, no failures; one final full root run, local fixture PostgreSQL only. |
| `npx tsc --noEmit` / `npm run lint` | Exit 0. New experiment compiled by focused suite and re-linted after final freshness guard. |
| `npm run build` | Exit 0, optimized Next production build; no new production route or consumer change. |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0, append-only/reproduction passed. No archive changes. |
| Actual `node experiments/live-market/run.mjs view` + browser QA | Chromium **320/390/1280**: no overflow, 4 NOT RUN metrics, keyboard disclosure passes, zero JS errors/provider requests/browser WebSockets. |

[Actual disabled-state 390px screenshot](private-disabled-390.png) and [browser results](browser-qa.json). This is the real local read-only view, not a live-feed demonstration, production/physical iPhone/Safari/VoiceOver/human test. No synthetic market stream/screenshots are passed off as authentic arrivals. Source-disabled view was closed after QA.

Tests cover original finalized transaction/signature/slot/program/quote bindings, provisional identity withholding, unsupported/failed/null/stale/revised data, exact atomic sums, independent-provider counts, deterministic clocks, selected-signature budgets, close/timeout/kill/expiry source boundaries, no retry/reconnect, native read-method/destination/byte restrictions, durable singleton/spent IDs after raw deletion, journal integrity, private filesystem boundaries, Host/Origin/CSRF isolation, view-without-acquisition and honest unknowns. Filesystem test hides only the harness's artificial `/tmp/.git` ancestor marker; production has no bypass switch and all per-test Git/symlink rejection remains exercised.

New 30-test and parent 47-test suites are explicitly invoked locally; existing root CI **does not register them**. Automatic root CI still checks archive/root tests/lint/types/build for the PR. CI outcome is reported in the PR after push, never inferred from local success. No workflow dispatch/rerun or workflow/permission edits.

Only new `experiments/live-market/` work is authored here. Latest main's #155 production-policy changes are inherited unchanged; unchanged #158 files are included as a pending dependency, not reimplemented or edited. Agent B, collector, credentials and other PRs remain untouched. Next's generated `next-env.d.ts` change was restored.

## Remaining founder decisions

1. Confirm whether authorized original FuzzySniper receipts can satisfy the need without another connection.
2. Resolve exact public endpoint/private internal research/24h retention permission and approve this **exact head + scope + fresh single-pilot budget**. PumpPortal/Helius current terms/access remain unqualified; no automatic fallback. Approval hash/checkbox is not legal permission.
3. Perform the Windows pilot only after GO. Check actual arrivals, raw hashes and same-provider finalized corroborations; a zero/missed/blocked/capped/unsupported pilot is not a live success. Honor raw deletion while keeping permanent non-market spent markers.
4. Only after measured success, separately approve a dedicated provider/runtime, costs/credentials, retention/deletion and restart/gap/independent-verification controls. Public RPC must not silently become production; no permanent activation is included.

Rollback: stop this private process, keep budget tombstones and respect retention. Revert only the new worker directory/commit; retain #158 and unrelated main/Agent B changes. No production deployment, source activation, wallet or PR merge occurred.
