# UNFARMD consumer integration — issue 166

Historical exact-mint candidate at `29ae3cb`. The current #167 private creation-viewer release checklist is [here](../live-feed-167/RELEASE.md); do not apply the old homepage acceptance below to the new launch surface.

Release candidate for founder review, 23 October 2026. This supersedes the **sequential parent release instructions** in inherited consumer documents. Release this single candidate after review; do not additionally merge #137/#143/#148 into it or copy their older backend/data.

## Candidate and evidence

- Baseline: current main `6a9ba2fa58235acd6c56bc4fdf09fefa38f01127`, including merged #164 cleanup and all collector history.
- Integrated unchanged: #137 `2169247924c05300e4ffc2ce005b3960317cebd8` → #143 `a10bf94ff866095446fb2d4829df8f5a948d9144` (includes #145 Outlier) → #148 `40ee1d974de0dcb47e3f58dbbc3cccbfe3c67c94`.
- Integration branch: `feat/166-unfarmd-consumer-release`. Exact final candidate SHA and exact-head CI are recorded in the PR, avoiding a self-referential commit hash in this file. Verify them before approval. Any later main/proof change requires refreshed scope and checks.
- API, backend libraries, data, scheduler, workflows, dependencies and deployment configuration remain byte-identical to baseline. The baseline is an ancestor, not a replaced snapshot. [Scope verification](scope.json) records protected tree identities and the asset comparison.
- [Verification results](VERIFICATION.md). Actual optimized-app first screens: [320](screenshots/home-320.png), [390](screenshots/home-390.png), [1280](screenshots/home-1280.png). Actual denial: [320](screenshots/denied-320.png), [390](screenshots/denied-390.png), [1280](screenshots/denied-1280.png). These contain no accepted token facts. The inherited explicitly labeled offline success tests validate compatibility, not authentic delivery or live demos.

## Working flow and fixed boundary

Exact-mint input → deliberate SCOUT IT → existing same-origin **GET** `/api/mint-facts?mint=…` → strict production-source validator → Control Receipt **only if** accepted. Paste, shared URL, examples, history, refresh and focus do not acquire mint facts. Market lookup remains a separate existing deliberate action. No new source, automatic retry, proof POST, wallet or worker is connected.

Both source gates remain disabled/null: `LOOKUP_APPROVAL.phase="disabled"`, null clocks; `PREFLIGHT_APPROVAL.enabled=false`, null clocks. This candidate invokes neither proof nor diagnostics. Local genuine handler denial is **403/access_denied** with null facts/source because localhost is not the canonical admitted origin. This is distinct from the canonical disabled response and from Vercel authentication. HTTP 401/403 hosting HTML becomes a truthful access denial, never a fabricated response or automatic login/proof fallback.

Only one authentic RPC-reported finalized PumpSwap reserve observation is established in #166. It is not production mint proof. Production mint facts, public GET and a continuous launch feed remain unproven/inactive. The old #165 window is NO-GO. Agent B must independently deliver the refreshed proof-only head, authentic evidence and later bounded GET authorization; this PR supplies none of those approvals. [Coordination on #165](https://github.com/fuzzysniper/scout-stonk-intel/pull/165#issuecomment-6368793582).

## Public UX versus protected operations

| Surface | Candidate behavior | Release boundary |
| --- | --- | --- |
| Consumer `/`, local artwork, icons, metadata | Existing responsive UNFARMD consumer UI; no secrets or admin/proof action | Existing Vercel Authentication remains in place. Candidate can be reviewed as a protected, source-disabled beta, not a public working scanner. |
| `/api/mint-facts` GET | Existing application admission, source gate and denial model | Disabled; do not change host/origin rules or activate it in this PR. |
| Mint proof, diagnostics, canary/lookup consoles and API POSTs | No consumer invocation or privileged credential flow | Existing platform protection plus application authorization; no route exceptions, bypass links, tokens in URLs, or global protection removal. |
| Research, terminal, data APIs and archives | Existing routes and withholding unchanged | Keep protected pending separate route-by-route source/publication and security review; hiding a link or `noindex` is not access control. |

**No public/private infrastructure split is claimed implemented by this consumer-only PR.** A public launch needs a separately reviewed exposure design that protects every privileged route/API and legacy archive, defines auth/origin/CSRF and enforceable rate/cost limits for permitted GETs, and verifies anonymous versus authenticated behavior on the actual immutable deployment. Do not disable Vercel Authentication globally to make the homepage public. No Vercel settings, middleware, exceptions or security gates change here.

**Protected-beta compatibility must also be proved:** the unchanged consumer transport uses `credentials:'omit'` and `redirect:'error'`. A logged-in homepage does not establish that its fetch can pass cookie-based Vercel API protection. Before calling an authentic-source beta usable, Agent B/owner must validate the intended browser/API authentication model on the exact deployment or separately review the necessary change. Do not inject a bypass token into the consumer or weaken API protection. This candidate intentionally preserves the existing transport and truthfully handles denial.

## Release checklist — human approval only

1. **Review exact head on founder PC.** Check final PR SHA/CI, main ancestry, protected-path and original-art hashes; resolve any new collector/proof commits by a normal integration and rerun affected checks. Never reset main. Confirm approved Outlier/art selection; commercial-art and independent trademark clearance remain separate. Existing metadata/source retention/publication rights require explicit review before public exposure.
2. **Authenticate normally to preview.** Use the actual candidate URL from the PR's Vercel bot/check, not an inherited parent preview or guessed hostname. Record immutable host, deployment ID, deployed Git SHA, project/team and protection. Green CI/Ready does not prove user access. Never share authenticated storage or private traces.
3. **Finish physical acceptance.** Use [the iPhone card](IPHONE.md); on founder PC also test actual Edge, keyboard and denied clipboard. Chromium emulation does not prove Safari/Edge/device behavior. Record URL, device/browser/version, UTC and pass/fail. No live proof is part of these UI checks.
4. **Choose scope.** Protected source-disabled beta may be considered after rights and physical review. A genuinely usable authentic-source MVP requires Agent B's independently approved proof and a separately reviewed/approved bounded GET activation. A proof-only POST success does not automatically authorize GET. If source delivery or public exposure is blocked, do not announce a public working scanner.
5. **Founder exact-SHA release GO.** Name approved candidate SHA, intended protected scope and current target. Git integration may deploy on main merge: approval must expressly cover that consequence. No merge, production deployment, SQL or alias change is authorized by this document.
6. **Verify actual release identity after separately approved execution.** Record merge SHA, immutable READY/Current production ID/host and deployed SHA, and current alias assignment. Check actual emitted icons/OG and authenticated mobile route, denial/recovery and passive-request behavior. If the eventual release differs from tested content, stop and reverify.

**Deployment target:** existing team `riskledgerapp`, project `scout-stonk-intel`, project ID `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`; existing canonical domain `https://scout.storkcoin.xyz`. No new project, UNFARMD domain, DNS or Vercel protection change. Confirm this target and its immutable deployment in the owner dashboard at release time. A future custom domain additionally needs ownership/DNS/TLS, canonical/OG/redirect review and Agent B's origin/admission approval; it is not a cosmetic alias switch.

## Rollback and mobile STOP

Before release: hold/close this integration PR; parents and production remain unchanged. Before any approved deployment, record the current production ID/SHA and exact frontend diff. After release, revert **only this integration's consumer/assets/metadata/tests/docs diff** via a reviewed revert against then-current main. For a merge commit, inspect `git revert -m 1 <actual integration merge SHA>`; for a squash, inspect `git revert <actual squash SHA>`. Preserve all intervening collector/backend/security commits. Never reset to a historical parent, reverse #164 cleanup, restore expired clocks or rearm proof budgets.

If immediate production recovery is necessary, the founder may separately authorize reverting/promotion to the recorded compatible prior production deployment through the existing project, then reconcile main. Recheck backend compatibility before restoring any older deployment; it must not restore expired enabled gates. This is an operational action, not authorized here.

On iPhone: stop acceptance on unexpected facts, repeated acquisition, wrong identity or a protection change; preserve URL/time/error without secrets; inform the owner/Agent B. Do not retry or bypass. Both source gates are already off. If a later approved activation needs a kill action, use its separately reviewed operator procedure; closing a tab is not a global kill switch. Do not begin a proof or activation without sufficient founder-PC time to finish verification and STOP.
