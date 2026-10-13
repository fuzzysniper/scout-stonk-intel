# Archive release verification V1

Issue [#16](https://github.com/fuzzysniper/scout-stonk-intel/issues/16). This is a small operations layer over [ARCHIVES.md](ARCHIVES.md) and [BRIEFS.md](BRIEFS.md), not a new publication system or UI. A deployment checkmark, HTTP 200, local replay or green fixture suite alone does not establish that a physical phone renders and shares an approved archive correctly.

## Read-only smoke command

After `npm ci`, run:

```sh
npm run verify:release
npm run verify:release -- --base https://YOUR-IDENTIFIED-PREVIEW-HOST --target preview
npm run verify:release -- --base http://127.0.0.1:3123 --target preview
```

Default production origin is `https://scout.storkcoin.xyz`, date `2026-10-11`, reviewed original ID `d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63`. Override with `--date YYYY-MM-DD --id REVIEWED_64_HEX_ID` only after inspecting approved main evidence. Identify the exact host/deployment being assessed; a localhost preview is not production evidence. Base URLs cannot contain credentials, query, fragment or path; non-HTTPS is accepted only for an explicitly labeled loopback preview.

The command compiles into an automatically removed temporary directory and makes only bounded unauthenticated **GET** requests. No cookies, authorization header, workflow API, mutation, GitHub write privilege or new dependency is used. Each request has an eight-second abort deadline and body cap (5 MiB response, 2 MiB pinned snapshot/PNG, 64 KiB allowlist), no retry and no automatic redirect. The normal run makes twelve GETs (no mass crawl); a failed initial host probe stops additional route probes. Output is JSON with PASS/WARN/FAIL, exact requested URLs, UTC times, HTTP statuses when actually received, and a scoped outcome. Upstream bodies/headers/exception messages are not printed. It cannot turn an unreceived response into application success.

Checks:

- Known canonical day redirects to the exact reviewed original edition, never a provisional/current/correction replacement. Both explicit HTTP redirects and constrained server-streamed HTML refreshes are recognized; the latter still need browser navigation QA.
- Edition HTML contains date/ID canonical and Open Graph image paths; bounded PNG media/signature is readable. Preview metadata may intentionally use the configured production origin; the image path is requested on the identified test host, never an arbitrary third-party URL.
- `/api/archive` edition hash, supported method, captured hashes, grace, report rows/counts/identity/share path independently reproduce. Preserved metadata is checked separately from current navigation/transport metadata.
- Independent GETs of the exact pinned GitHub snapshot and allowlist match their preserved byte revisions. Source outage leaves provenance unverified; it does not invent replacement bytes.
- `/brief` redirects to the UTC date observed immediately before/after the request, accommodating actual midnight rollover; `/status` HTML and `/api/status` contract/archive state are readable.
- Invalid calendar date returns 400; missing ID returns 404 and old version returns 409, without replacement claims. A valid application 503 is a source-unavailable result, not an unreachable-host diagnosis.

Exit codes: **0** = all structural checks passed for the labeled target; **1** = observed contract/hash/metadata/tampering failure; **2** = incomplete due to reachability/access/source limits. A received 404/409 is a real HTTP application/access response; when deliberately probing failure states it passes the expected contract, otherwise it is a release failure. Received 401/403 means access restricted; proxy-denial headers or connection/TLS/DNS/timeout exceptions mean the environment could not assess the app. Gateway failures require further investigation; no HTTP failure alone identifies the responsible code change. An unreachable production host is **not proof the site is broken or healthy**. Do not bypass proxy policy, disable TLS verification or silently relabel a preview pass as production.

The smoke does not execute client JavaScript, verify touch interactions or authenticate into preview protection. It does not guarantee complete coverage, collector uptime, actual publication workflow execution, full PNG rendering, phone native sharing or human approval. Current Data Health may still disclose delayed/stale data even with a structurally correct archive. Complete these independent checks before a release GO.

Managed environments may require inherited proxy routing. On a Node 24 runtime that supports it, set `SCOUT_VERIFY_ENV_PROXY=1` for the smoke command to use `node --use-env-proxy`; retain injected proxy/CA settings. This switch is only a hardcoded runtime flag, never a shell command or new app dependency. Node 20 remains the CI/build runtime; do not pass an unsupported flag to it. No proxy bypass is attempted when a host is denied.

## Disposable local publication replay

Run:

```sh
npm run archive:dry-run
```

Default is the reviewed October 11 no-finding original. An optional date is a positional argument: `npm run archive:dry-run -- YYYY-MM-DD`. The local `origin/main` ref must contain the reviewed original and its source pin. Fetching latest main, if needed, is a separate read-only operator action; this command itself performs **no network request** or fetch.

The command reads the approved edition at local `origin/main`, validates it, resolves its reviewed ancestor input pin and checks exact Git bytes. It creates a unique disposable local clone with `--no-hardlinks`, removes its remote, checks out that pin, and uses only the existing compiled archive generator/checker. Child environment is limited to PATH, local module resolution and test mode; no GitHub secret is forwarded. Hooks are disabled. The working branch's archive is inventoried by exact byte hashes before/after.

Replay steps: create a new empty index only in the disposable pre-archive checkout; run the real generator twice; verify same files/ID, reviewed original hash, zero findings and null unsupported figures; stage only local temporary files and run actual append-only/Git-provenance verification. Then check out the reviewed approved tree within that clone, verify it, append a whitespace edit to its existing edition and confirm the checker rejects it. Finally assert pre-grace creation is refused, remove the clone in `finally`, and confirm the real working archive inventory is unchanged. No local or production commit is created, no branch is pushed, no PR is opened, no workflow runs, no variables or permissions change. Standard Git checkout/staging occurs only inside the disposable clone. Failed operations also clean it up.

Do not infer idempotency from green logs: evidence is the actual generated files, validated hashes and byte inventory. This environment initially suppressed child stdout; the harness was corrected to check artifacts/exit status instead of trusting log markers. The dry run reports actual execution UTC time separately from the preserved eligibility/source times; it never overrides the production generator clock to manufacture a grace-eligible success.

The existing generator limits backfill to eight days. When this old default replay ages beyond that window, **stop** on `retention_boundary`; select a recently approved no-finding original with preserved real inputs under human review. A pin already containing archive files or a non-no-finding edition is not silently reset/adapted: the small V1 replay reports failure and requires an explicit reviewed extension. Read-only `validateEdition` can still reproduce older archives; the dry run does not weaken generation safeguards. No synthetic history enters the working archive or live screenshot.

## Workflow risk review: recommendations only

This PR does not edit `.github/workflows/research-archive.yml`, repository variables, permissions, branch protection, environments or Actions settings.

| Risk in current proposal workflow | Stop/go recommendation before an actual test |
| --- | --- |
| `SCOUT_ARCHIVE_ENABLED=true` gates both manual and scheduled jobs | Approving one manual test must not unintentionally approve subsequent daily schedules. Approve a separate manual-only guard/environment design first, or explicitly approve and time-bound the scheduling exposure. Keep the variable unset/disabled now. |
| Standard `GITHUB_TOKEN` draft PR anti-recursion limitations | Confirm actual CI/append-only checks execute on the candidate's exact SHA. A green generating job or a draft PR does not satisfy review. Do not introduce a PAT or broader privileges to bypass this without separate approval. |
| Writable job's repository-wide `contents: write` and `pull-requests: write` | Branch-only commands are code controls, not a branch-scoped token. Preserve protected main, human reviewers and required checks. Never weaken rules to make a denied push/PR succeed. |
| Artifact downloads into `data/brief-archive` before the writable job's install/check | Same-run generation is trusted only insofar as its approved pinned code/output is trusted. Recommend extraction into a fresh staging directory, strict date/index/file allowlist, byte limits, regular-file/symlink/traversal checks and digest/run/base pin validation **before** credential-bearing checkout/install/staging. Current post-extraction archive diff checks alone should not be described as a complete extraction sandbox. Document any GitHub action extraction protections separately. |
| Pending branch recovery can create a draft for previously pushed content | Inspect that exact remote SHA and source evidence, not only current run artifacts, which may differ. Never force-push/rewrite pending proposals or assume recovered draft content equals the latest candidate. |
| Full-history clone plus duplicated source bundles/artifacts | Review storage, clone duration and eight-minute job limits. Capacity exhaustion stops; it must not delete old evidence or silently raise limits. Seven-day artifacts are diagnostic copies, not permanent publication. |
| Same-repository CI configuration/script can change in the same PR | Human review must assess workflow/checker changes and verify trusted checks at the actual candidate SHA; same-repo green checks are not an independent cryptographic authority. |
| Checkout/network/permission failure versus collection coverage | Preserve source/outage and absent-publication uncertainty. Do not grant write scopes or dispatch again merely to turn a release badge green. |

No recommendation above is implemented or activated by this task. Existing architecture, financial gates, archived originals and previews remain unchanged.

## Physical iPhone QA: manual evidence required

A human should use real Safari on an iPhone, record model, iOS/Safari version, Wi-Fi/cellular, exact UTC time, target/deployment and observed URL. This is independent of the automated proof; desktop Chromium at 390px is **not** physical-phone QA.

1. Open `https://scout.storkcoin.xyz/brief/2026-10-11`. Confirm it lands on `/brief/2026-10-11/editions/d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63`. If unreachable/login/source error, record that and STOP; do not claim rendering success from a deployment badge.
2. Confirm FINALIZED ARCHIVE, October 11 UTC, original edition ID, “No verified change to report,” zero verified comparisons and null/missing figures rather than invented payouts. Collection began October 12, so this day has no stored observations; it does not prove zero real-world payouts.
3. Tap actual interval/evidence disclosure and self-contained JSON. Check date/ID, pinned source and distinct quote identities. Open live Data Health separately; its current freshness is not the archived day's job history. Check readable wrapping, focus/touch, no horizontal scroll, zoom and back navigation.
4. Tap Copy link and paste into a local note/address bar; confirm the **ID URL**, then reopen it. Open Share brief and inspect the native share sheet; use Copy or cancel only, without sending/posting. Confirm cancellation is quiet and generic preview is dated/ID-specific, not a positive yield claim. Record clipboard denial/fallback if encountered.
5. Test a saved ID URL later without assuming a new edition; confirm original evidence remains and any correction is visibly separate. If safely possible, simulate a client offline/retry state without altering production DNS/data; no provisional financial replacement should appear. Attach screenshots of the exact observed target, never a fabricated success screen.

Manual QA record: `tester | device/browser | UTC | target URL/deployment | final URL | finalized/coverage label | evidence opened | copied ID/reopened | native share/cancel | layout/accessibility | observed failures | screenshot references`. Mark every untested item **pending**, not PASS.

## Human approval gates for a future real workflow test

**Gate A — verification only.** Run/read this smoke report on an accessible identified deployed target, inspect reviewed source/hash, complete physical-phone QA and inspect current collector/Data Health limitations. Production unreachable/incomplete, malformed source or any substituted claim means STOP. A localhost pass can help investigate but does not satisfy this gate.

**Gate B — privilege/design approval.** Human reviewers explicitly approve workflow code, schema, artifact extraction recommendations, required checks and a manual-only or explicitly time-bounded schedule policy. This issue's authorization does **not** authorize setting `SCOUT_ARCHIVE_ENABLED`, dispatching, modifying variables/permissions, or granting secrets. If the owner has not approved those exact future actions, STOP.

**Gate C — one approved draft proposal experiment.** Only after separate written approval may an authorized human perform the narrowly approved opt-in/manual invocation in the agreed window. Record run ID, immutable input/base SHA, artifact paths/digests, fixed diagnostics, accepted feature-branch SHA and draft PR. Distinguish generation, remote push, draft creation and CI independently; denied token/permission behavior is a STOP, not permission escalation. No merge, production deploy or social posting is implicit.

**Gate D — candidate review/publication approval.** Ensure genuine coverage/no-finding reasons, hash/provenance/append-only checks and CI at the exact branch SHA. Human approves any eventual merge separately. Any deployment/rollout requires separate approval and post-rollout verification. Restore disabled automation at the approved end of a time-bounded experiment; follow the owner-approved plan, not an agent's elapsed-time assumption.

Do not trade, launch tokens, access wallets/treasury, activate subscriptions/payments or post research automatically at any gate. These commands require no such capability.

## Rollback

Revert only this operational tooling/docs/package-script/test change through a reviewed PR. There is no application route/UI, archive, collector, workflow, permission, variable, DNS or dependency migration to roll back, and no production deployment is performed here. Temporary compiled code/clone are removed automatically; preserve saved read-only evidence as dated observations. Do not delete or mutate approved editions or later genuine snapshots. Workflow recommendations remain pending until separately approved.

## Recorded verification results

Final checks on Node 20.20.2/npm 11.9.0 all exited 0: `npm ci` installed 310 packages; `npm test` passed all 104 JavaScript cases across 13 test files (none failed/cancelled/skipped) and 14 Python tests; `npx tsc --noEmit`, `npm run lint`, `npm run build` passed. Existing ESLint deprecation and edge-runtime static-generation warnings remain. Initial typecheck caught the child environment’s required NODE_ENV typing; fixed. An unused test import warning was removed. Initial local replay failed on suppressed child stdout, so artifact/hash invariants replaced fragile log-message checks; the replay and full checks passed afterward. No dependency/lockfile, app route, archive or workflow files changed.

Actual recorded commands:

- [Production smoke evidence](evidence/release-smoke-production.json): **exit 2 / incomplete**, 2026-10-13 01:43:18 UTC. Exact target `https://scout.storkcoin.xyz/brief/2026-10-11`; no valid application response. This managed environment’s restricted network policy does not list the production domain; proxy/connection failure prevented verification. No HTTP 404/503 or application defect was invented. Remaining route checks were not claimed complete; no policy/TLS bypass attempted.
- [Explicit local preview smoke](evidence/release-smoke-local-preview.json): **exit 0 / pass**, 01:43:29–01:43:30 UTC at `http://127.0.0.1:3123`, twelve GETs, 21 PASS evidence entries. Canonical 307 original ID, edition/API/metadata/PNG, actual pinned GitHub bytes, grace, UTC-today redirect, Data Health and actual 400/404/409 failures passed. This proves this built local target, not the public deployed host.
- [Disposable replay evidence](evidence/publication-local-dry-run.json): **exit 0**, 2026-10-13T08:57:33.336Z through 2026-10-13T08:57:33.892Z. Reviewed main `9d458ffc943dfbda584743f5da8f93e5e984e132`, input pin `e3de19169c844f85f06d0cabe7a4c9682d68d8ac`, unchanged approved original ID `d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63`, zero findings/null figures, eleven file/hash/provenance/grace/cleanup checks. Remote-free clone removed and actual working archive byte inventory unchanged. No GitHub/network operation, commit, PR or workflow was part of replay.

Network smoke/local app used Node 24.19.0 `--use-env-proxy` only for this managed environment, with unchanged application code/dependencies. Regression tests use labeled isolated HTTP fixtures for unreachable/access-restricted hosts, valid HTTP error/source outages, archived/provisional/streamed redirect distinctions, source hash/report/edition tampering, UTC rollover, malformed targets and failure cleanup. Fixtures are not live verification evidence.

Chromium at 1280/390px used the actual built app and the **approved main-backed archive**, without mocked browser responses. It followed the original ID redirect, rendered seven withheld/no-history rows, copied/reopened the immutable ID URL, opened keyboard evidence, verified no overflow/uncaught errors and showed a real missing-edition failure without replacement. Screenshots are visibly labeled LOCAL PREVIEW; physical phone/native share and production deployment remain pending.

- [Local-preview desktop](screenshots/release-verification-desktop.png)
- [Local-preview mobile](screenshots/release-verification-mobile.png)
- [Local-preview mobile evidence](screenshots/release-verification-mobile-evidence.png)

The evidence crop belongs to the local preview and is not a physical-phone observation. No production success, iPhone QA, workflow execution, variable/permission change, merge, deployment, social post, wallet/treasury action, trade or token launch is claimed. All future real workflow gates remain STOP pending separate human approval.

## Final human-review handoff

The feature branch was rebased onto latest main `9d458ffc943dfbda584743f5da8f93e5e984e132` (merged PR #15 plus a genuine collector data commit). On October 13 at approximately 08:56–08:57 UTC, all five required checks were rerun successfully: `npm ci` (310 packages), `npm test` (104 JavaScript cases and 14 Python tests, no failures), `npx tsc --noEmit`, `npm run lint`, and `npm run build`. Existing deprecation/edge-runtime warnings remain. The saved disposable replay evidence was refreshed against this latest main and passed all eleven checks with the same approved edition ID. Earlier 01:43 local-preview and unreachable-production reports/screenshots remain dated evidence, not claims of a later production test.

Safest next action: a human runs `npm run verify:release` from an approved network/runtime with access to the production host and records the deployment identity, exact URLs, UTC time and JSON/exit code. Do not expand permissions or bypass TLS/proxy restrictions merely to obtain a pass. If the host remains unreachable, record the blocker and STOP; a preview result is not production proof. If structural production checks pass, complete the physical-iPhone checklist above, including local-only copy/reopen and share cancellation. Neither step needs archive automation, repository writes or workflow dispatch. Future workflow privilege changes/execution still require separate written approval at Gates B–D. Review/merge and any deployment remain human decisions; Issue #17 is untouched.
