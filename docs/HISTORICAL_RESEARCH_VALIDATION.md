# Historical Research V1 — executed validation

Issue #74; base main `5ff8d4563acb4fba729f3f27e1d43c2cb334e232`. Node 20.20.2 / npm 11.9.0 for app checks, unchanged lockfile. Python 3.12.14 and system Chromium 154.0.8037.57 for genuine local production browser QA. No fabricated application data, credentials or provider mocks are used in screenshots; the page renders only metadata from the original hash-checked audit. Mutations in regression tests are explicitly test-only.

| Command | Final result |
| --- | --- |
| `npm ci` | Exit 0; 336 packages added. Existing ESLint 9.39.5 deprecation warning |
| `npm test` | Exit 0; 484 application JS, 64 Python and 18 adapter integration tests passed; zero failures/skips |
| `npx tsc --noEmit` | Exit 0; no TypeScript diagnostics |
| `npm run lint` | Exit 0; no lint diagnostics |
| `npm run build` | Exit 0; 10/10 static pages generated, including `/research/history`; existing edge-runtime/static-generation notice |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; archive append-only/reproduction passed |
| `npm run archive:dry-run` | Exit 0; offline replay/idempotency/tamper checks passed, working archive unchanged, disposable checkout removed |
| `bash scripts/historical-research-report.sh` | Exit 0; four original-time records verified; public metadata output financial fields null, permission unverified |
| `python3 tests/historical-research-browser.py http://127.0.0.1:3195` | Exit 0; production Next server, HTTP 200 `text/html; charset=utf-8`, 4 records at 320/390/1280 × 844px |
| Protected-file comparison to base | 56 existing data/backend/API/staging/workflow files byte-identical; original audit/receipts/archives preserved |
| `git diff --check` | Exit 0 |

The initial browser harness exposed an incorrect Python `await` expression in its own assertion; that assertion was corrected and the full three-width run passed. No assertion was removed. Fresh production-server startup was used for the final run. Before screenshots were captured from the unmodified latest-main guide before implementation. Neither a build success nor a screenshot is substituted for the HTTP/browser checks.

The new regression cases cover genuine exact-raw replay, all four original reports, immutable identifiers, original microsecond capture preservation, document and receipt hashes, copied-hash substitution, missing/inaccessible/truncated/oversize evidence, exact mint versus ticker, genuine zero versus null, 429/503, expired replay versus historical availability, source skew/mixed units, allowlisted rights projection, accessible disclosures and failure view, and deterministic CLI reproduction. Existing Pair Pulse/collector/archive/security tests continue to cover actual-period boundaries, gaps, precision, freshness and fail-closed behavior. No math or backend API is changed.

## Browser evidence

[Machine-readable result](evidence/historical-research-browser-qa.json) contains screenshot hashes, HTTP results, keyboard disclosure results, source-document identity and the zero-external-request assertion. Native Enter opens and Space closes each tested disclosure; all source text and exact mints remain readable without horizontal scrolling. No browser errors. The initial date, rights warning and first pair appear within the first viewport at all widths. The page has no provider fetch/poll/automatic external source request. Existing-data financial amounts are absent from both hidden HTML and RSC payload.

| Width | Before: existing guide | After: new source index | First viewport | Expanded source disclosure |
| --- | --- | --- | --- | --- |
| 320px | [Before](screenshots/historical-research-before-320.png) | [After](screenshots/historical-research-after-320.png) | [Viewport](screenshots/historical-research-first-viewport-320.png) | [Sources](screenshots/historical-research-sources-320.png) |
| 390px | [Before](screenshots/historical-research-before-390.png) | [After](screenshots/historical-research-after-390.png) | [Viewport](screenshots/historical-research-first-viewport-390.png) | [Sources](screenshots/historical-research-sources-390.png) |
| 1280px | [Before](screenshots/historical-research-before-1280.png) | [After](screenshots/historical-research-after-1280.png) | [Viewport](screenshots/historical-research-first-viewport-1280.png) | [Sources](screenshots/historical-research-sources-1280.png) |

Before and after are different explicitly named surfaces: the new historical index did not exist on main. The guide now links to it. Exact-curated-mint links in dossier and pair Details are covered by server-render regression tests; this browser run exercises the source index, guide navigation and canonical-STONK anchor without visiting current-data endpoints. No claim of new real-time pair/dossier provider QA or chain reconstruction is made.

## Critical self-review and five-second check

The first screen says what the record is, when it was captured and why figures are gated. Four compact subjects replace a wall of provenance text; exact units, mints, endpoint and hashes require an explicit disclosure. Dates are never disguised as current freshness. Amber rights copy remains visible without opening Details. At 320px three rows fit or begin in the first viewport; the fourth follows normally. Full mint/hash wrapping makes expanded source views long, intentionally secondary to the concise index.

This is useful for finding and auditing known sources, **not yet for reading published historical amounts**. That limitation is deliberate and material: no rights approval exists. The UI should not be marketed as a historical chart, comprehensive leader list or commercial dataset. Repeated lifetime-counter figures would not create recent flow or a comparable period. The existing source/coverage failure warnings in dossier/results remain visible.

Suggested human five-second script (prepared, **not a claimed user study**): show the closed 390px source index for five seconds, then ask “What date is this research from?”, “Does it tell you current rewards or holder profit?”, “Why are amounts absent?” and “Where would you inspect the original source?” Success requires identifying 14 October, historical/provider-reported status, rights approval gate and the source disclosure. If users infer live rewards, profit or ecosystem leadership, revise copy before approval. Do not ask for wallet, holdings, trades or personal information.

Manual screen-reader and independent human comprehension testing remain unperformed; automated semantics/keyboard/browser checks do not establish a complete WCAG audit. No live provider outage, signature reconstruction or legal clearance was manufactured for QA. External official endpoints can be unavailable or changed; immutable capture validation and fixed withheld states are tested offline instead of probing provider failure modes.

Remaining gates and rollback are in [the methodology/rights report](HISTORICAL_RESEARCH.md). Revert only this feature to remove its page/index/entry links/tests/docs; preserve original snapshots, audit evidence, archives and all existing gates. Human-review PR only. No merge, deployment, live permission/credential change, scheduler activation, wallet access, treasury action or provider-wide crawl.
