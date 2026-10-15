# Stage C2: private authentication proof, inactive proposal

Issue [#76](https://github.com/fuzzysniper/scout-stonk-intel/issues/76). **Pilot: NO-GO. No hosted authentication or workflow-token test has run in this PR.** Review or merge is not permission to deploy, arm, invoke, change permissions or collect. Product/data work in #74 / PR #75 is untouched.

The owner reports Stage B deployed `scout-scheduler-staging`, with `ACTIVATION=disabled`, existing `SLOTS` SQLite class and no Cron/routes; B2 provisioned encrypted `APP_PRIVATE_KEY`. Owner-reported C1 passed at **2026-10-15T17:23:20Z**, workflow ID `382300817`, dispatches `0`, temporary token revoked, `hostedBindingVerified:false`, `workflowTokenVerified:false`. These are issue evidence, not agent inspection of the account/key. Earlier [pilot readiness](HOURLY_PILOT_READINESS.md) and [staging handoff](CLOUDFLARE_STAGING_AUTH.md) remain applicable except that PC authentication is now owner-reported passed. Do not repeat C1 or request its key.

## Decision: one private instance, one permanently consumed reservation

There is no approved ingress to execute code with the deployed binding. A public admin endpoint, test Cron or remote development would introduce a credentialed surface. A separate Worker would require copying the key. Neither is proposed.

The future integration instead adds **one private Cloudflare Workflow** (`scout-stage-c2-auth-only`, class `StageC2AuthProof`) to the **same existing Worker**, and **one separate SQLite DO namespace**, `C2_ONCE` → `StageC2ProofOnce`. The original default handler, `SlotCoordinator`, `SLOTS` binding/class identity, compatibility date and disabled activation are retained. No Workflow creation binding, public handler, route, schedule, alarm or external service binding is added. An owner with existing account authority would create exactly one instance through Cloudflare's authenticated control plane, never GitHub dispatch.

This PR does **not** select this entry or apply that configuration. The live repository manifest still selects `staging-entry.ts` with only `SLOTS`. [The proposed configuration](proposals/76-hosted-auth-only.patch) is inert text: `C2_ARMED=false`, gate attestation `false`, all other proof variables `UNAPPROVED`. Its strict policy permits no armed values or extra configuration. The packaging command writes it only to a temporary directory and always passes `deploy --dry-run` with credentials/profile discovery removed. It accepts no passthrough arguments. Applying this proposal later also requires review of the existing whole-manifest policy; simply applying the text is not an approved deployment procedure.

`C2_ONCE` uses the constant singleton `stage-c2-auth-once`. In a synchronous SQLite transaction it inserts permanent row `id=1` **before key access or authentication**. There is no release, reset, TTL, delete, alternative singleton or retry operation. Crash, failure, timeout, lost response, Workflow restart and concurrent calls cannot authorize a second attempt. A new namespace or instance design to try again requires a new security decision; it is not routine recovery. The marker and fixed sanitized receipt are independent of collection slots and survive process/version changes in offline SQLite tests.

The private Workflow accepts only `{}` and trusted instance metadata. It rejects scheduled events and runs one step, retry limit `0`, timeout one minute. Nonsecret guards require:

- `ACTIVATION=disabled`; `C2_ARMED=true`; `C2_GATE_DISABLED_ATTESTED=true`.
- App `5310753`, installation `171233795`, repository `1415026436` (`fuzzysniper/scout-stonk-intel`).
- Owner-reviewed actual numeric App **bot actor ID**, distinct from owner/App/installation/repository IDs.
- One exact `c2-<40 lowercase hex>` instance ID, and canonical UTC boundaries (`.000Z`), at most ten minutes apart. Both current time and instance creation must be inside that window.

The attestation is an **owner assertion from a fresh read-only inspection**, not an App-authorized read of GitHub repository variables. The App has no Variables permission; adding it to verify this assertion is forbidden. Unknown gate/actor state is NO-GO.

## Fixed authentication capability and its limits

`app-proof.mjs` imports only the existing JWT signer. The isolated packaged proof contains no collection/dispatch class or endpoint. It never enumerates environment values, follows source-provided URLs or prints exceptions. Only after all guards and the permanent reservation does it read the already-encrypted binding in that Worker. No key is transferred to a runner, CLI, artifact, Workflow parameter/step result or SQLite row.

| Ordered GitHub request | Required result |
| --- | --- |
| `GET /app` | Exact App, owner `58099771` / `fuzzysniper`, valid slug; Actions write and optional Metadata read only |
| `GET /app/installations/171233795` | Exact App/installation/account, selected repositories, not suspended, same grants |
| `POST /app/installations/171233795/access_tokens` | Body **only** `repository_ids:[1415026436]`, `permissions:{actions:"read"}`; bounded token and valid expiry; no broader returned permissions |
| `GET /installation/repositories?per_page=2` | Token sees exactly SCOUT, exact ID/name, default branch `main` |
| `GET /users/<verified-app-slug>%5Bbot%5D` | Actual Bot login and approved numeric actor ID |
| `GET /repos/fuzzysniper/scout-stonk-intel/actions/workflows/reward-snapshots.yml` | ID `382300817`, exact path, active |
| `DELETE /installation/token` | `204` for that known temporary token, including after downstream failure |

Only these method/path pairs and `https://api.github.com` exist in the transport. No dispatch, Git write, claim, collector or provider request is possible through this proof's code path. Responses have a 32KiB bound, redirects are rejected, per-request deadlines are five seconds, body reads are bounded by the remaining 35-second authentication budget. Revocation has an independent eight-second reserve. No automatic HTTP retries occur.

The existing App **still has Actions write authority**. Code-level isolation and requesting an Actions-read token do not cryptographically reduce the authority of the encrypted private key, or defend against a malicious account administrator/code deployment. The future integration retains the original inactive dispatch implementation; it is unreachable from the proof, and remains gated by `ACTIVATION=disabled`. Review the wrapper, fixed capability and resulting bundle together. A narrowed one-repository token also **cannot prove the entire installation grants access only to SCOUT**: the owner must inspect the complete installation separately. Do not broaden the token to enumerate other repositories.

Known returned tokens are revoked in `finally`. A lost/malformed/oversized issuance response may leave an **unknown** token that cannot be revoked with its unavailable value. A hard runtime/CPU kill may prevent `finally`; a non-204/lost revocation is uncertain. These cases never pass, leave the reservation consumed, and require independent owner reconciliation/expiry under a separate incident decision. Do not retry, reset, rotate the App key, or revoke unrelated credentials automatically. The temporary token is requested read-only and its reported expiry is checked; no complete-cleanup claim is possible after an uncertain response.

Only fixed booleans, public IDs, canonical UTC, fixed status labels and exit code leave the proof. `passed:true` requires all five identity/access checks and confirmed token revocation. Dispatches, claims, provider queries and repository writes remain `0`; `workflowTokenVerified` and `pilotReady` remain `false`. A local fixture success never establishes `hostedBindingVerified`. Hosted success requires owner correlation with the actual control-plane instance, reviewed Worker version, binding and usage evidence below.

## Separate isolated Actions token proof

[The inert YAML](proposals/76-workflow-identity.yml.txt) is outside `.github/workflows`. It proposes a future **push-only**, owner-controlled `security/c2-workflow-proof` branch, path `.github/workflows/scout-c2-identity.yml`, job `identity-only`. It has no dispatch/schedule/PR trigger. Only `actions:read` and `contents:read` are requested for that isolated job; Contents read is needed by SHA-pinned checkout, whose credentials are not persisted. There is no artifact upload, collector/App/Cloudflare secret, data write or gate import. The current collector workflow and its permissions remain byte-for-byte unchanged.

Before reading `GITHUB_TOKEN`, the standalone Python proof checks the exact repository/ID, owner actor/ID, job/path/ref, push event, first attempt, GitHub-hosted Linux runner, workflow SHA = commit SHA = separately approved SHA, proof arm, disabled/unset collection guard and exact approved bot-denial ID. It rejects extra credential environment names without reading their values. Four **authenticated GETs** verify its own workflow, current in-progress run, collector metadata and actual Bot identity. Run ID, workflow ID/path, repository, branch, SHA, actor and triggering actor, attempt and UTC creation age (at most 120 seconds) must agree. Queue delay can legitimately fail this narrow proof; do not loosen/retry automatically. No anonymous/API fallback exists.

The CLI has one exact invocation, a 25-second process deadline, five-second socket timeout, 32KiB responses, no redirects/retries, generic failures and one sanitized JSON result. A rerun (`attempt>1`), old/completed run or wrong context fails. Repeating GETs inside the same in-progress job has no claim/write effects; unlike hosted authentication, this read-only check has no durable one-use ledger.

Success says **`isolatedWorkflowTokenIdentityVerified:true`**, **`collectorWorkflowTokenVerified:false`**, **`hostedBindingVerified:false`**, **`pilotReady:false`**. A token in this new read-only job does not prove the token permissions or future claim path of the current Contents-write collector job. The separate existing #68 collector `actions:read` proposal remains unapplied. Owner-PC `gh` access cannot substitute for this job's authenticated proof.

## Owner decisions: independent approvals and stop conditions

Record each approval outside Git with reviewed commit/config hash, operator, UTC, exact account/Worker/version/namespace/instance or branch/SHA, allowed action and limits. No secrets, raw debug logs, complete environment dumps or network traces. **None of the approvals below is granted by this PR.**

| Stage | Separate owner decision | Stop / NO-GO |
| --- | --- | --- |
| C2-A: inspect | Existing trusted PC/session, read-only account/repository metadata | Different account/Worker/IDs, non-Free Workers plan, unknown quota/cost, installation not SCOUT-only, broader grants, missing secret name, enabled/unknown guard, incorrect Bot denial ID, unexpected triggers/routes/activity |
| C2-B: prepare inactive hosting | Review exact integration/policy and authorize updating **existing** Worker plus one Workflow and one separate private SQLite namespace, unarmed | Secret copy/write/rotation, replacement `SLOTS`, public ingress, schedule, extra credential/scope, code outside reviewed hash; stop if deployment would replace/remove the existing secret |
| C2-C: one auth-only execution | Separately review public actor/instance/time-window values and arm patch; explicitly approve **one** private instance and one read-scoped temporary-token creation/revocation | Unknown variable state, automatic trigger/retry, expired window, consumed namespace, unexpected code/version/account, no CPU/usage visibility. No collection permission is implied |
| C2-D: isolated Actions proof | Separately approve exact new file/branch/SHA and public vars; only that job's Actions/Contents read; owner push once | Dispatch, existing collector edits, Contents write, extra secret/App permission, unapproved SHA, actor/guard mismatch; no automatic rerun |
| Later pilot | New proposal, authenticated current collector identity/permissions, gated shared-claim migration, hosted receipts, cost/hosting review and all #68 gates | C1, either C2 proof, or both passing **never authorize activation** |

Before C2-C, owner must read actual deployed variables and GitHub `SCOUT_COLLECTION_GATE_ENABLED` / `SCOUT_COLLECTION_APP_ACTOR_ID`, verify the entire installation in its settings, reconcile the Bot identity, and record those public facts. `C2_GATE_DISABLED_ATTESTED` must never be inferred from a local config/default. Preserve `ACTIVATION=disabled`, no Cron/routes/preview URLs, unchanged existing secret/binding and unchanged `SLOTS` namespace ID through every future stage.

Human approval checklist (leave unchecked until individually evidenced):

- [ ] Review the exact code/config hashes and the original production exports; retain secret and `SLOTS` identities.
- [ ] Record existing account/Worker/Free quotas, complete SCOUT-only installation/grants, disabled gate and actual Bot denial ID.
- [ ] Approve only the unarmed resource/code update, with no key operation, ingress or schedule.
- [ ] Separately approve public arming values, one short UTC window and one exact instance; confirm unused permanent reservation.
- [ ] Explicitly approve one read-scoped token creation/revocation; accept stop/reconciliation rather than retry on uncertainty.
- [ ] Match sanitized hosted receipt to the actual approved version/instance, revocation and account CPU/usage; keep pilot NO-GO.
- [ ] Separately approve the isolated job's exact branch/SHA, read-only permissions and public variables; no collector edit.
- [ ] Retain evidence and seal/unarm under a separate approved rollback; preserve consumed state and resolve any outstanding token.

The fixed future invocation shape, **for owner review only**, is locked Wrangler's `workflows trigger scout-stage-c2-auth-only '{}' --id <approved-c2-id> --json` using the reviewed configuration and existing owner session. No invocation command was executed here. Do not use omitted/default payload, `latest`, scheduling, restart, resume, Test Cron or `dev --remote`. An unknown creation response is a stop, not permission to repeat. This is Cloudflare control-plane instance creation, not a GitHub workflow dispatch. This PR provides no arming/deploy/invoke shortcut.

Minimum authority: existing App grants only (Actions write/Metadata read, selected SCOUT); proof token Actions read on SCOUT; isolated job Actions read + checkout Contents read. The owner may use an existing correctly scoped Cloudflare session for later approved script/resource changes; no token, login scope, secret, account or permission is created now. Read-only instance inspection accepts Workers Scripts Read according to the [official endpoint](https://developers.cloudflare.com/api/resources/workflows/subresources/instances/methods/get/). Account-wide authoring authority is broader than this named Worker; the script name is not an IAM boundary. If an existing session cannot perform an approved action, stop for a separate permission decision rather than granting a broader token.

## Exact future read-only verification

Run only **after separately approved hosted actions**, on the owner's trusted PC using the existing session and exact reviewed checkout. Do not enable shell tracing, tail Worker logs, use `--debug`, persist raw CLI responses or paste them into a PR. Check every native exit code; suppress raw stderr. If authentication/authorization, schema or bounds fail, stop. No login or credential change is part of verification.

Read Worker version metadata (`npx --no-install wrangler versions list --config wrangler.json`), and secret **names only** (`npx --no-install wrangler secret list --config wrangler.json`), then independently confirm the active version/config, original `SLOTS` namespace, new `C2_ONCE` namespace, unchanged encrypted binding name, disabled activation, no routes/Cron, account plan and usage in the dashboard. Names/versions alone do not prove binding validity. Use no API-base override, `.dev.vars`, alternate environment or new account. The exact approved instance must be tied to that version and approval record.

From `scheduler/`, after selecting the actual approved ID, this PowerShell read projects only the fixed proof receipt. It accepts no root API error/log text and makes no mutation:

```powershell
$ErrorActionPreference = 'Stop'
$scoutC2Id = 'PASTE_APPROVED_c2_ID'
if ($scoutC2Id -cnotmatch '^c2-[a-f0-9]{40}$') { throw 'Select exact approved instance' }
if ((Test-Path Env:CLOUDFLARE_API_BASE_URL) -or (Test-Path Env:CF_API_BASE_URL)) { throw 'Unexpected API override' }
$env:WRANGLER_SEND_METRICS = 'false'
$env:WRANGLER_SEND_ERROR_REPORTS = 'false'
$scoutRaw = (& npx --no-install wrangler workflows instances describe scout-stage-c2-auth-only $scoutC2Id --json --config wrangler.json 2>$null | Out-String)
if ($LASTEXITCODE -ne 0 -or $scoutRaw.Length -gt 32768) { throw 'Instance unavailable; stop' }
try { $scoutInstance = $scoutRaw | ConvertFrom-Json -ErrorAction Stop } catch { throw 'Instance unavailable; stop' }
$scoutRaw = $null
if ($scoutInstance.id -cne $scoutC2Id -or $scoutInstance.status -cne 'complete' -or $scoutInstance.error) { throw 'Instance unproven; stop' }
$scoutResult = $scoutInstance.output
if ($scoutResult -is [string]) {
  try { $scoutResult = $scoutResult | ConvertFrom-Json -ErrorAction Stop } catch { throw 'Receipt unavailable; stop' }
}
$scoutFields = @('version','kind','proofId','checkedAt','passed','exitCode','appId','installationId','repositoryId','workflowId','appActorId','appIdentityVerified','installationVerified','repositoryVerified','appActorVerified','workflowReadVerified','tokenIssuanceAttempted','tokenIssuanceUncertain','temporaryTokenRevoked','revokeUncertain','dispatches','collectionClaims','providerQueries','repositoryWrites','workflowTokenVerified','pilotReady')
if ((@($scoutResult.PSObject.Properties.Name | Sort-Object) -join ',') -cne (@($scoutFields | Sort-Object) -join ',')) { throw 'Unexpected receipt; stop' }
if ($scoutResult.kind -cne 'stage_c2_app_auth_only' -or $scoutResult.proofId -cne $scoutC2Id -or $scoutResult.version -ne 1 -or $scoutResult.exitCode -ne 0) { throw 'Receipt unproven; stop' }
foreach ($scoutName in @('passed','appIdentityVerified','installationVerified','repositoryVerified','appActorVerified','workflowReadVerified','tokenIssuanceAttempted','temporaryTokenRevoked')) {
  if ($scoutResult.$scoutName -isnot [bool] -or $scoutResult.$scoutName -ne $true) { throw 'Proof failed; stop' }
}
foreach ($scoutName in @('tokenIssuanceUncertain','revokeUncertain','workflowTokenVerified','pilotReady')) {
  if ($scoutResult.$scoutName -isnot [bool] -or $scoutResult.$scoutName -ne $false) { throw 'Proof uncertain; stop' }
}
foreach ($scoutName in @('dispatches','collectionClaims','providerQueries','repositoryWrites')) {
  if ($scoutResult.$scoutName -isnot [long] -and $scoutResult.$scoutName -isnot [int]) { throw 'Unexpected counter; stop' }
  if ($scoutResult.$scoutName -ne 0) { throw 'Unexpected operation; stop' }
}
if ($scoutResult.appId -ne 5310753 -or $scoutResult.installationId -ne 171233795 -or $scoutResult.repositoryId -ne 1415026436 -or $scoutResult.workflowId -ne 382300817) { throw 'Wrong identity; stop' }
if ($scoutResult.checkedAt -cnotmatch '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$' -or $scoutResult.appActorId -isnot [long] -and $scoutResult.appActorId -isnot [int]) { throw 'Unexpected public evidence; stop' }
$scoutResult | Select-Object -Property $scoutFields | ConvertTo-Json -Compress
$scoutInstance = $null
```

Reconcile the printed Bot ID and UTC with the **previous approval** and deployed time window; inspect the exact instance step/version metadata privately for one attempt, no retries and unchanged code hash. A `complete` instance can contain `passed:false`; completion is not authentication success. If the API output format changes, stop and review the schema; do not print raw output or substitute another instance. Keep only this sanitized receipt plus allowlisted public metadata (account/version/namespace/instance IDs, UTC, hash, usage/CPU, exit code). Local JSON or a copied receipt is not authenticated hosting evidence.

For the separate future Actions proof, inspect the exact approved run in GitHub, not a collector dispatch. A read-only owner metadata check is `gh api repos/fuzzysniper/scout-stonk-intel/actions/runs/<exact-run-id> --jq '{id,workflow_id,event,head_branch,head_sha,run_attempt,status,conclusion,actor_id:.actor.id,triggering_actor_id:.triggering_actor.id}'`. Match the approved SHA/branch/owner, first attempt and isolated workflow path. Privately inspect its pinned file, effective read-only job permissions, one proof-step JSON and exit code. Retain only that sanitized proof record and public matching metadata; no full job-log archive, checkout headers or token. Its own authenticated checks must pass; owner `gh` success is not workflow-token proof. Confirm existing collector workflow, disabled guard and Bot denial value remain unchanged. Both proofs still leave the pilot NO-GO.

## Rollback and incident handling

Before any future application, reverting this PR only removes inactive files/scripts; there is no hosted state to undo. Never delete existing production namespaces or credentials as part of that revert.

After a future separately approved deployment/invocation, first stop authorizing new instances and inspect exact in-flight status. An instance may retain its original code/config; flipping a variable or updating a Worker does not safely interrupt/revoke an already-running token. Reconcile any issuance/revocation uncertainty before a separate cleanup decision. Do not automatically terminate, restart or retry it. Token expiry/revocation must be independently accounted for if the receipt is missing.

Then separately approve an unarmed/sealed code update: preserve `ACTIVATION=disabled`, original handler/`SLOTS` and encrypted binding, the **same C2 namespace/class identities**, Workflow resource and consumed receipt. `c2/sealed-entry.mjs` retains all exports but its proof classes return only a failure receipt: no proof key read, auth, binding RPC or SQL mutation. The retained original production handler remains disabled. Offline tests switch integration → sealed → integration with persistent SQLite and demonstrate that consumption remains effective. Keep resource definitions/identities in the rollback configuration; changing only the entry is insufficient if a deployment would delete/recreate resources. Never use a `deleted` export, namespace purge/recreation or migration to release the marker.

For the isolated Actions proposal, disarm its separate proof variable and remove only its separately approved future workflow/branch under review; retain the sanitized run receipt/metadata. Do not change the collector workflow, gate, App grant/key, schedules or tokens as an incidental rollback. Permission or credential incident response needs its own owner decision.

## Cost, hosting and offline evidence

No hosted resources were created, billing changed or cost/CPU measured here. Official [Workflow pricing](https://developers.cloudflare.com/workflows/reference/pricing/) lists Free limits including 100,000 invocations/day shared with Workers, 10ms CPU/invocation, 3,000 steps/day and 1GB-month storage; finished Free instances are retained only three days. [Limits](https://developers.cloudflare.com/workflows/reference/limits/) and [SQLite DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/) apply independently. RSA signing/JSON/Workflow overhead may exceed Free CPU; offline wall time does not establish hosted CPU feasibility. A bounded request count is not a guaranteed free bill. Review remaining account-wide quotas/usage and instance/DO CPU before and after the one future proof. Stop on limit errors, paid/upgrade prompts or unknown charges; do not increase CPU, buy a plan or retry to get a pass. This proof writes no repository data and should not trigger product hosting builds; existing collector-commit hosting costs remain a separate pilot blocker.

Node **24+** is required for the C2 credential-stripped packager/tests (no dependency upgrade). Root and scheduler dependencies remain locked. Local commands:

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run archive:dry-run
bash scripts/archive-tool.sh check origin/main
npm --prefix scheduler ci
npm --prefix scheduler run dry-run
npm --prefix scheduler test
npm --prefix scheduler run c2:dry-run
npm --prefix scheduler run c2:test
```

[Offline evidence](evidence/stage-c2-offline-2026-10-15.json) records actual check results and packaged hashes. Tests generate an ephemeral synthetic RSA key in memory and intercept every runtime outbound call. They exercise real current-Wrangler/workerd Workflow + SQLite bundles, concurrency/restarts, retained SLOTS isolation, sealed rollback, missing/malformed key, identity/scope/branch/actor/guard mismatches, HTTP/timeout/revocation uncertainty, bounded bodies, redaction and persisted-state credential exclusion. The Python suite blocks real sockets and checks authenticated transport/identity; the inert job's condition is evaluated with GitHub's expression library. None of these claims hosted success, real workflow-token permissions, zero account cost or production readiness. App/UI/API/data/active workflows remain unchanged; UI screenshots and live provider/browser probes are outside this ops-only task.

Official design references reviewed 2026-10-15: [Workflow exports/entrypoint and retry configuration](https://developers.cloudflare.com/workflows/build/workers-api/), [private control-plane triggering](https://developers.cloudflare.com/workflows/build/trigger-workflows/), [GitHub App token scope and revocation](https://docs.github.com/en/rest/apps/apps), [job-token permissions](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token), [pinned checkout release](https://github.com/actions/checkout/releases/tag/v4.2.2). Wrangler `4.150.0` supports declarative Workflow exports. No new secret operation, authority or future hosted success is inferred from documentation.
