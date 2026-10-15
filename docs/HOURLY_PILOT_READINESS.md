# Hourly collection pilot preflight — issue #68

Issue [#76](https://github.com/fuzzysniper/scout-stonk-intel/issues/76) records owner-reported Stage B/B2 completion and C1 PC authentication success, with its temporary token revoked. [Stage C2's inactive proof and owner decisions](STAGE_C2_AUTH_PROOF.md) supersede the PC-authentication status below only. Hosted binding/current collector workflow-token permissions remain unverified; pilot remains **NO-GO**.

**Decision: NO-GO for live activation.** Offline integration is verified; the hosted prerequisites below are not. Human review/merge of this PR authorizes none of the owner operations. Stage A consent does not authorize B, C or D. No actual key, account configuration, secret, live dispatch, workflow permission or scheduler setting was accessed/changed by this work.

Base main: `633ca3efc317c1d505405a0d925b77f0dac1ce15`, including merged #66 Data Health V2 and #67 Token Quick View. Agent A owns infrastructure/offline readiness; Agent B #69 owns frontend/dossier. [Audit, protected hashes, fresh official documentation and hosting evidence](evidence/hourly-pilot-readiness-2026-10-15.json).

## What is verified and what is blocking

| Boundary | Repository/offline finding | Live gate before pilot |
| --- | --- | --- |
| Staging deployment | Locked Wrangler 4.150.0, workerd 1.20261006.1, `compatibility_date=2026-10-01`; scheduled-only entry; `workers_dev=false`, `preview_urls=false`, no routes/Cron/account/secret in config | Owner must inspect the actual existing account, latest Worker version, variables, bindings, triggers and activity. Local main is not proof of deployed state |
| SQLite lifecycle | `SLOTS` → `SlotCoordinator`, current declarative `exports` with SQLite storage; real bundle runs against current local runtime | Keep the existing class/namespace identity. No legacy KV migration, new namespace, `deleted` export, resource recreation or unreviewed migration |
| Nonsecret App bindings | Main declares App `5310753`, installation `171233795`, repository `1415026436`; `ACTIVATION=disabled` | Do not assume deployed Worker has these values or any App secret. Reconcile exact IDs/account with owner records before an inactive update |
| App authentication | Offline mock-key proof exercises installation account/grants, repository-limited Actions-write token, expiry/scope and workflow GET; probe revokes the returned temporary token | Full installation must include **only SCOUT**. Narrow token scope alone does not establish the entire grant. Actual PC/hosted key validity is untested |
| Workflow run authentication | Gate binds authenticated REST run/workflow/repository/branch/actor/attempt/context before Git/provider work | Workflow currently declares only `contents: write`; `actions: read` is not declared. No hosted proof establishes these authenticated reads with that workflow token. Do not rely on public anonymous readability or broaden credentials |
| Shared claim | Native/manual/external first-winner tests, real temporary Git CAS/confirmation, actual Worker input contract and unchanged synthetic provider validator pass | All sources must migrate to the same enabled guard, using the verified numeric App **bot actor ID**, before external delivery. No unguarded overlap |
| Dispatch/recovery | One SQLite singleton; at most two attempts only for confirmed bounded 429; uncertain acceptance/expired reservation never authorizes retry | Hosted durable receipts/export, circuit pause/recovery, actor/queue/CAS integration and rollback are unproven. No reset/release operator bypass exists |
| Build/cost side effects | Bot data commit already has a Vercel “Deployment has completed” status; GitHub-token push recursion is suppressed | Owner must review actual hosting build/deploy policy and all account usage/cost before increasing main writes. This PR configures no ignored-build step/filter |
| Research | Data Health V2 recorded 6/24 and 10/48 scheduled creations; successful attempts persisted; stale reward receipt and history/precision/alignment gates remain | Hourly delivery cannot make stale v2 responses fresh or fabricate aligned pair periods. No source threshold, request budget or reward method changes |

`ACTIVATION=disabled` is checked before scheduled/tick/alarm authentication or dispatch. The default production entry exports only the handler and DO class. The new owner-auth helper is **not exported by that entry**, has no route/DO operation, and is absent from the actual bundled staging output. No new credentialed hosted surface is introduced. The small optional token-observer parameter in the existing auth function has no callback in normal dispatch.

## Prepared changes and offline proof

1. `inspectAppReadiness` reuses the adapter's real authentication checks in an explicitly invoked owner-PC probe. It accepts disabled mode only, does not touch SLOTS/Git/Cloudflare or dispatch, reads the fixed workflow metadata, and revokes a bounded token actually returned to the probe (including subsequent scope/workflow failure). Revocation failure makes the probe unavailable. Lost token-issuance responses cannot be revoked by an unknown token; stop and account for possible expiry, never repeat blindly. Result explicitly says `hostedBindingVerified:false`, `workflowTokenVerified:false`.
2. `scheduler/auth-readiness.mjs` requires supported Node 24+, the exact `--approved-owner-auth --key-file PATH` invocation, strict inactive local config and a bounded existing **absolute local file outside the checkout**. It rejects relative/UNC paths, checkout paths/reparse targets, non-files and >8KiB input. It never accepts a key value in an argument/environment variable, prints it, configures a secret, generates/converts a key or calls Cloudflare. The flag is not authorization: only the owner may run it later under explicit stage C consent on their trusted PC, never through Codex.
3. Gate diagnostics now distinguish sanitized HTTP 401/403 from other unavailable identity reads. A 403 does **not** by itself identify the cause; no permission/API fallback is attempted, no response body/header is logged, and collection remains false.
4. [The permission proposal](proposals/68-collector-actions-read.patch) is **inert text**, adding only workflow-token `actions: read`. It is not applied by this PR, a script or a workflow. A regression applies it only to a temporary tree and proves that no schedule/flag/permission other than that proposed line changes. It needs separate owner approval/review before any real application. The external App remains Actions-write/Metadata-read only; never grant it Contents or Administration.

The combined test takes the actual mocked Worker dispatch input, passes its canonical slot to the real Python gate with independent authenticated REST fixtures, and uses temporary bare repositories/clones. Each native/manual/external winner confirms the remote claim before the first synthetic provider query and publishes a matching local data commit; all later sources query zero times. Lost response after accepted Git push yields zero same-slot provider calls, leaves the slot consumed and permits only the next actual fixture slot. Other existing tests cover simultaneous collisions, identical/up-to-date pushes, main advancement, cross-branch/actor/rerun/replay attacks, late queues, provider failure, data push rejection, corrupt confirmation and disabled fallback. All financial/control fixtures stay temporary; none becomes SCOUT history or a proving slot.

## Migration order and separate approvals

The owner must record scope, UTC, reviewed commit, operator and approval for each stage outside the repository. Keep keys/tokens/transcripts/raw debug logs out of the record. Safe records include public IDs, version/namespace IDs, status enums, timestamps, Git SHAs/hashes and exit codes. Unknown is a stop, not a default false/empty value.

### A — inspect only; no hosted mutation or key access

Use the owner's **existing trusted Windows PC**, existing authenticated account/session and clean approved checkout. No new account, login grant, billing upgrade or credential is authorized. If the CLI needs new authorization, stop or inspect read-only in the dashboard until separately approved. Root app/Bash/Python checks are proven in Linux CI; an existing WSL checkout may reproduce them with its own dependencies. Do not share Windows/WSL native `node_modules`.

```powershell
$ErrorActionPreference = 'Stop'
$scoutRepo = 'C:\Projects\scout-stonk-intel'
$scoutReviewedCommit = 'PASTE_APPROVED_40_HEX_COMMIT'
if ($scoutReviewedCommit -notmatch '^[a-f0-9]{40}$') { throw 'Select the reviewed commit' }
Set-Location $scoutRepo
$scoutChanges = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Repository inspection failed' }
if ($scoutChanges) { throw 'Preserve existing changes; stop' }
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
git switch --detach $scoutReviewedCommit
if ($LASTEXITCODE -ne 0) { throw 'Checkout failed' }
node --version  # Owner probe requires Node 24+; do not auto-upgrade here.
if ($LASTEXITCODE -ne 0) { throw 'Node unavailable' }
Set-Location (Join-Path $scoutRepo 'scheduler')
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Locked staging install failed' }
npm run dry-run
if ($LASTEXITCODE -ne 0) { throw 'Inactive validation failed' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Offline staging tests failed' }
```

Review the exact approved `scheduler/wrangler.json` and strict policy. No version update, override config, test facade, `.dev.vars`, `--env`, `--name`, `--remote`, HTTP route, Test Cron or secret access belongs to A. Locked Wrangler may report a newer release; do not upgrade silently. The credentials-stripped dry-run isolates dotenv/profile discovery and never deploys.

After approving use of the existing owner Cloudflare session for read-only metadata:

```powershell
if ((Test-Path Env:CLOUDFLARE_API_BASE_URL) -or (Test-Path Env:CF_API_BASE_URL)) { throw 'Unexpected API override' }
$env:WRANGLER_SEND_METRICS = 'false'
$env:WRANGLER_SEND_ERROR_REPORTS = 'false'
$env:WRANGLER_WRITE_LOGS = 'false'
$env:WRANGLER_LOG_SANITIZE = 'true'
$env:WRANGLER_LOG = 'log'
$scoutAccountId = 'PASTE_EXISTING_VERIFIED_FREE_ACCOUNT_ID'
if ($scoutAccountId -notmatch '^[a-f0-9]{32}$') { throw 'Verify account in dashboard' }
$env:CLOUDFLARE_ACCOUNT_ID = $scoutAccountId
npx --no-install wrangler whoami
if ($LASTEXITCODE -ne 0) { throw 'Account inspection failed' }
npx --no-install wrangler versions list --config wrangler.json
if ($LASTEXITCODE -ne 0) { throw 'Version inspection failed' }
npx --no-install wrangler secret list --config wrangler.json
if ($LASTEXITCODE -ne 0) { throw 'Secret-name inspection failed' }
```

`secret list` returns names/types, not values. An existing `APP_PRIVATE_KEY` name is not proof it matches the owner-held key; do not overwrite it blindly. Unexpected names, a missing Worker or unclear version history require investigation. Do not run a secret getter/export.

Dashboard checks: existing `scout-scheduler-staging` in the exact intended **Workers Free** account; actual activation disabled; no Cron/routes/custom domains/workers.dev/preview URLs; same SLOTS/SQLite class and namespace; no unexpected service bindings; exact nonsecret IDs; recent invocations/CPU/DO rows/storage/log use understood. Account-wide quotas and billing must be checked, not inferred from a Free DNS zone. Do not recreate/delete a namespace to match the repo.

Read-only owner GitHub checks: SCOUT-only installation `171233795` belongs to App `5310753`, account `fuzzysniper`, repo `1415026436`; entire installation selects only SCOUT; Actions write and implicit Metadata read, no Contents/Secrets/Variables/Admin grants. Read the actual gate/App actor variables and branch/rules without changing them. Missing variable (confirmed 404), denied inspection (403) and `false` are different states.

```powershell
gh api repos/fuzzysniper/scout-stonk-intel/actions/variables/SCOUT_COLLECTION_GATE_ENABLED --jq '{name,value}'
if ($LASTEXITCODE -ne 0) { throw 'Record status and confirm absent/denied state in owner dashboard before continuing' }
# Record missing/false/denied accurately; stop if enabled or unknown. Do not set it.
gh api repos/fuzzysniper/scout-stonk-intel/actions/variables/SCOUT_COLLECTION_APP_ACTOR_ID --jq '{name,value}'
if ($LASTEXITCODE -ne 0) { throw 'Record status; do not infer an actor ID' }
# Verify the actual App slug from its settings; do not guess it or the actor ID.
$scoutAppSlug = 'PASTE_VERIFIED_APP_SLUG'
if ($scoutAppSlug -notmatch '^[a-z0-9-]+$') { throw 'Verify App slug' }
gh api ('users/' + $scoutAppSlug + '%5Bbot%5D') --jq '{id,login,type}'
if ($LASTEXITCODE -ne 0) { throw 'Bot identity unavailable' }
```

Confirm the account is the intended App Bot; the numeric bot actor ID differs from App/installation/repository IDs. A user token performing these read-only owner checks is not a proof of the workflow's ephemeral token permissions. Record separately the main-push build/hosting policy discussed below.

### B — separately approved inactive configuration/secret mutation, owner only

A alone authorizes **none** of B. Stop until the owner approves the exact existing Worker version/config update (if necessary), and separately the one `APP_PRIVATE_KEY` provisioning operation. Before exposing a key to hosted runtime, verify the disabled-path App denial trap: `SCOUT_COLLECTION_APP_ACTOR_ID` must already match the verified App Bot ID. Otherwise a stolen App key could dispatch blank inputs through the legacy off path. If that variable is absent/wrong, stop B for a separately approved nonsecret deny-guard setting; do not silently set it or enable the collection gate. Ordinary native/manual behavior can remain off-path while the App actor is explicitly blocked. Recheck existence/account/namespace/inactivity immediately beforehand. These operations have deployment/version effects. The actual hosted nonsecret variables and key remain unverified by this PR.

If an approved inactive code/config update is necessary, the owner may later run from `scheduler`:

```powershell
# ONLY AFTER EXPLICIT B DEPLOYMENT APPROVAL; not a read-only command.
npx --no-install wrangler deploy --config wrangler.json
if ($LASTEXITCODE -ne 0) { throw 'Stop; do not broaden grants or change billing' }
```

Preserve class/name/namespace and inspect the resulting version/vars/triggers again. No gradual `versions upload`, alternate manifest or legacy migration is substituted. If the hosted version already matches the reviewed inactive state, do not redeploy merely to run this checklist.

Use the **existing** owner-held PKCS#8 file outside the checkout, with reviewed ACLs, no transcript/debugger/capture and no key in clipboard, arguments, environment variables or chat. Never ask Codex to perform this. If secure workstation policy cannot be met, stop for an approved channel. After separate **B secret-write approval** and the existence/version checks, the file-backed stdin procedure is:

```powershell
$scoutKeyPath = 'C:\OwnerSecure\existing-scout-app-pkcs8.pem'
if (-not [System.IO.File]::Exists($scoutKeyPath)) { throw 'Existing owner file missing' }
$scoutKeyPath = [System.IO.Path]::GetFullPath($scoutKeyPath)
$scoutCheckoutRoot = [System.IO.Path]::GetFullPath($scoutRepo).TrimEnd('\') + '\'
if ($scoutKeyPath.StartsWith($scoutCheckoutRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Key must be outside checkout' }
# Never Get-Content/type/cat/echo the key or use an interactive paste prompt.
$scoutSecretProcess = Start-Process -FilePath $env:ComSpec `
  -ArgumentList '/d /c npx --no-install wrangler secret put APP_PRIVATE_KEY --config wrangler.json' `
  -WorkingDirectory (Get-Location).Path -RedirectStandardInput $scoutKeyPath `
  -NoNewWindow -Wait -PassThru
if ($scoutSecretProcess.ExitCode -ne 0) { throw 'Stop; do not share raw logs or retry blindly' }
Remove-Variable scoutSecretProcess
npx --no-install wrangler secret list --config wrangler.json
if ($LASTEXITCODE -ne 0) { throw 'Name inspection failed' }
```

This passes file bytes on non-TTY stdin, not the key value in a shell string. The Windows hosted operation is documented, **not executed/tested on a Windows account here**. `secret put` can create a draft if the Worker is missing: that fallback is forbidden. Recheck disabled state, no Cron/routes, only the approved secret name and safe version evidence. A binding name proves neither key validity nor actual hosted binding use. No key conversion/generation is part of B.

### C — separately approved isolated authentication/readiness proof, no workflow dispatch

C consent must explicitly include the temporary GitHub installation-token creation/revocation; B provisioning does not imply it. Use a trusted, non-debugged Node 24+ process on the owner PC with reviewed code. No `NODE_OPTIONS` preload/inspector, untrusted executable, key/HTTP capture or transcript. The local probe does not need a Cloudflare token, GitHub PAT or account mutation.

```powershell
# ONLY AFTER EXPLICIT C AUTH-PROOF APPROVAL. PATH only, never key contents.
# From the reviewed scheduler directory; define the existing local path even in a new session.
$scoutKeyPath = 'C:\OwnerSecure\existing-scout-app-pkcs8.pem'
if (Test-Path Env:NODE_OPTIONS) { throw 'Use a reviewed clean Node session' }
node --use-env-proxy .\auth-readiness.mjs --approved-owner-auth --key-file $scoutKeyPath
if ($LASTEXITCODE -ne 0) { throw 'Auth proof unavailable; stop without raw debug logs' }
```

After the approved stage, remove the path/session selector with `Remove-Variable scoutKeyPath` and `Remove-Item Env:CLOUDFLARE_ACCOUNT_ID -ErrorAction SilentlyContinue`; this does not delete/revoke credentials or change hosted settings.

The probe makes at most **five serial fixed-origin GitHub calls**: installation GET, repository-limited token POST, scope GET, workflow GET, temporary-token DELETE. Requests are eight-second bounded with 32KiB JSON limits, no redirects or retries. It emits safe public IDs/time and a zero-dispatch result, never key/JWT/token. A failed revocation or uncertain token response needs owner review/expiry accounting, not another probe. The PC key can be checked under separate C consent before B to avoid uploading an invalid key; this does not authorize B.

**C1 success proves only the PC key/App's checked authentication/scope path.** It cannot prove the hosted secret binding, full installation selection, workflow-token REST access, Git CAS in the hosted workflow, namespace persistence or CPU. The result explicitly marks the hosted binding and workflow token **unverified**. Installation selection still needs A's full-grant review.

**C2 remains a blocking human design/approval gate:** the current deployed entry has no private admin invocation/auth-only endpoint or receipt-export route, and none is opened here. Before D, approve a private isolated hosted probe that reuses the auth-only helper, cannot dispatch or expose credentials, and verifies the actual hosted binding/current runtime; also prove authenticated workflow-token identity reads in the approved isolated Actions context without provider collection. That may need a separately reviewed inert test entry/workflow and permission proposal. Do not use public routes, remote test facades, Test Cron, a production dispatch or an unapproved real claim as substitutes. This PR provides the tested seam, not authorization or a hosted C2 implementation chosen without owner review.

### D — separately approved migration/pilot; still NO-GO

There is deliberately **no activation, Cron registration or variable-write command** here. Owner prerequisites:

- Approve/apply the minimal Actions-read proposal in a separate reviewed workflow change, or produce explicit hosted authenticated-token proof under the current permission map. Never fall back to unauthenticated REST/another token or grant the external App Contents access.
- Resolve C2, numeric actor identity, all full-grant/key/version/CPU/cost/hosting gates, independent evidence export and a non-destructive paused-circuit recovery procedure. No unaudited SQL reset, lease release, journal clearing or namespace deletion is a recovery plan.
- Separately approve migration of **native and manual** collection to the guard. All three sources must use the same confirmed Git claim. Native/manual attribution uses actual creation time's previous minute-17 boundary and the 15m window; late runs intentionally stop. Current `checkout ref:main` can differ from the run's recorded SHA after queueing; that safely fails closed, not an invitation to bypass/rebase. Enabling the gate without a ready approved external producer can reduce collection; explicitly plan the transition.
- Choose and approve native coordination: retain native as a gated competitor, or remove only its schedule in a separately reviewed change after the guard is proven. Never leave a legacy ungated native/manual path alongside external delivery. Keep the daily audit's shared concurrency and understand queue effects.
- Reconcile queued/in-flight old-revision runs before the transition. Select T0 sufficiently in the future for approved configuration/Cron propagation (allow up to 15m) and record actual delivery times. No missed-slot replay/backfill. Approve at most one external hourly producer, exact fixed main/workflow/slot inputs and a stop/rollback owner.

GitHub concurrency alone is not deduplication. Claim-before-query requires trusted run identity, exact base/main equality, non-force exclusive accepted push, exact remote bytes/parent/HEAD confirmation and a still-valid time window. A consumed claim persists after a collector crash/provider failure/data-push conflict. Same-slot collection never resumes; only a new actual slot can recover. Unknown acceptance or lost confirmation stays stopped, even if a later fetch finds a claim. A competing main commit can safely make a job fail rather than collect; record it, never force-push or erase evidence.

## Free-tier, CPU, quota and hosting controls

Fresh official Cloudflare documentation was read from its public `cloudflare/cloudflare-docs` production branch on Oct 15; URLs, hashes and excerpts are in the evidence JSON. It describes **10ms Free Cron CPU**, a separate **30s default DO request CPU**, 100,000 Worker requests/day, five Free Cron triggers, 100 Free DO classes/account and 5GB total Free SQLite DO storage. Waiting on network is not CPU, but pending I/O/duration and SQL row/storage quotas still matter. Owner must verify all current account/region/product limits and available shared usage, not only these public limits. No paid upgrade or secret/account inspection was performed.

Normal modeled pilot load: 24 Cron events/day, 24 DO ticks/day, 96 GitHub adapter calls/day (four per dispatch attempt); at most one approved 429 retry per slot can make 192 GitHub calls/day and additional DO alarms. Actual native/manual competing jobs, two Git identity reads per enabled gate entry, Git fetches, control/data commits, artifacts/log retention, failure cases and other account workloads add cost. No provider-request cadence increase is authorized here. SQL caps remain 193 slots/386 attempts/eight-day retention; artifacts retain seven days, so owner-held exports must start immediately.

The existing Linux benchmark is aggregate workerd-process CPU at 10ms OS tick resolution, with an older compatibility date/test facade and mock transport. It cannot certify current hosted cold starts, isolate Cron's 10ms billing from DO crypto/SQL, or prove Free feasibility. The current supported Wrangler bundle is **14.77KiB / 4.77KiB gzip**, inert, and has no owner-probe entry. Hosted per-component cold/warm CPU, duration, row operations, storage and account usage remain C/D gates. Stop on a quota/paid prompt, unexpected activity or insufficient CPU headroom. The $5/month engineering ceiling is **not spending approval**; Workers Paid has a $5 minimum plus possible extra usage/tax and is not a guaranteed $5 cap. Stay Free or stop for an explicit budget decision.

**Correcting an earlier cost assumption:** `.github/workflows/ci.yml` declares main-push builds, but pushes performed with the workflow's repository `GITHUB_TOKEN` normally do **not** recursively trigger Actions workflows. The fresh official GitHub source states that rule (dispatch exceptions are separate). The complete available CI-push listing returned 64/64 runs and none for bot data commit `93b1769e56b296c13f9f4d78a8971b5259a1df79`. Do not multiply 744 claim commits into 744 CI runs as an established fact. Re-evaluate if any publication credential changes; no such change is authorized.

Third-party hosting is different. That same data-only commit has Vercel status **success**, “Deployment has completed,” at **2026-10-15T01:35:25Z**. This is concrete evidence of a hosting side effect, not proof of current project environment, price or a disabled production trigger. Owner must review the actual Vercel Git integration, ignored-build semantics, last-successful-deployment reference, branch/environment policy, plan and deployment usage **before** pilot writes. Prepare/approve any safe data/control-only ignore policy separately; keep code/API/allowlist/archive changes buildable and fail to normal build on uncertain refs. Do not invent an environment-variable contract or install a filter here. No Vercel setting, workflow trigger or production deployment was changed by this PR.

## 48 consecutive canonical slots — evidence contract and pass/stop rules

This is an **unexecuted** plan, not 48 synthetic/test receipts presented as operation. After explicit D approval choose `[T0,T0+48h)` minute-17 slots and enumerate all 48, retaining missing/unknown/denied entries. A control slot is never a reward observation timestamp.

| Required join for each slot | Evidence / interpretation |
| --- | --- |
| Slot and producer | Canonical target key, actual scheduled time/clock, external attempt(s)/receipt/nonce hash, activation/config/version, UTC update time, final accepted/denied/retry/uncertain state; no raw nonce/token |
| Authenticated GitHub execution | Actual run ID/attempt, actor and triggering actor IDs/types, repository/workflow/path/main SHA, event, creation/job/collection start/finish; a 204 or unreadable 200 run ID stays nullable until read-only reconciliation, never redispatch |
| Shared claim | Gate decision, base SHA, candidate hash, exclusive push/confirmation stage, claim commit/parent and confirmed main bytes/hash; losers may safely fail on main advancement and need correlation, not fabricated duplicate success |
| Provider/observation | Each allowlisted mint's actual attempted result/reason, real observedAt/providerGeneratedAt, exact quote mint/unit, raw source identity/revision and relevant quality warnings; collected/partial/failed/skipped differ |
| Persistence | Actual data commit and parent, summary run ID/expected hash, exact remote snapshot hash and actual added observations; claim or green job alone is insufficient. Old files in skipped-run artifacts are not new observations |
| Propagation/research | Owner-approved served-host hash after existing TTL, retrieval versus observation age, gaps, source mode/lifetime/interval statuses and withheld reasons; no fake holder-return figures |
| Account evidence | Cron and DO CPU separately, requests/alarms, row reads/writes, storage/duration/log/artifact usage, actual hosting deployments/cost and all approvals/pauses |

Before T0 verify an independent secure export mechanism for private DO receipts and Actions/Git evidence. Current DO receipt operation is internal, no public exporter exists. Dashboard logs may be sampled/short-lived and App Actions-write can delete Actions evidence; empty logs are not proof. If a reviewed private read-only export cannot be operated, **NO-GO**. Do not add a public fetch facade to extract receipts. Correlation hashes are not signatures.

Inspect at +6/+12/+24/+36/+48h without dispatching missing slots. Require ≥47/48 authenticated intended slots to produce a job within 15m, at most one accepted external dispatch/slot, **zero duplicate provider collections across all sources**, no unresolved claim/dispatch/data-persistence ambiguity, exact accepted remote/served hashes, explicit per-mint failures, max real observation gap ≤2h and latest observation age ≤3h. Native creation buckets cannot establish intended-slot lateness. Preserve all 48 denominators and all failures, including a consumed claim that produced no data. Do not treat same-slot retry as repair after provider failure.

Research eligibility is a **separate** outcome: fresh validated registry/catalog/mode/history, non-degraded compatible exact-mint candidates, precise same-basis counters, real observation boundaries `end−48h/end−24h/end`, exact provider periods and cross-token alignment, and all existing gap/reset/identity gates. Two contiguous periods may need 49 genuine boundary observations; 49 points/48 elapsed hours do not guarantee them. Data Health V2's Age 370–371 vs strict 300 gate, empty GLDX/SPCXX tracked cohorts, single NVDAX/STONK candidates and STONK precision issue are not fixed by scheduling. No interpolation, slot relabeling, clock reset, APY/ROI, ranking or leadership inference.

Pause on auth/scope/actor drift, unexpected permission/billing, duplicate, uncertain accepted POST/CAS, unexplained conflict, evidence loss, clock/identity error or gap/staleness/quota failure. No automatic circuit reset or new slot catch-up exists. Denials that persist as `circuit_paused` need a reviewed future recovery method, not SQLite deletion.

## Rollback and validation

Before hosted approval, revert this PR's helper/diagnostics/tests/proposal/docs through review; there are no live changes to undo. Do not revert later genuine history. After a future approved pilot: owner first stops external activation/Cron, allows propagation and reconciles queued/in-flight dispatches/claims; preserves receipts/namespace/journal/data/archives; then uses the separately approved credential suspension/revocation/removal procedure. An installed token may live up to an hour if not explicitly revoked. Deleting a Cloudflare secret does not revoke the PC key or all issued tokens.

Only after external activity/uncertainty is reconciled may a separately approved rollback restore ungated native/manual mode or native cron. Never switch off the guard while external dispatch remains possible, release consumed claims, force-push, drop SQLite tables or recreate the namespace. Restore only a verified inactive Worker version/config if necessary; code rollback does not automatically remove secrets/triggers or restore a previous secret value. Paid upgrades, permission expansion, wallets/treasury/trading/tokenomics and archive activation remain outside scope.

Local Linux checks: Node 20.20.2/npm 11.9.0 app; Node 24.19.0 staging/owner guards. `npm ci` 336 packages; `npm test` **433 app JS + 64 Python + 18 workerd adapter/integration tests**; TypeScript, lint, production build, append-only archive check and local archive dry run all exit 0. `npm --prefix scheduler ci` 40 packages; current Wrangler dry-run and **nine** staging/owner-guard tests exit 0. Expected warnings: installed ESLint deprecation, Next edge static-generation, inherited proxy, newer Wrangler available (not upgraded), and negative HTTP probes report no fetch handler. No skipped tests or UI changes/screenshots. Windows execution, real key/authentication, hosted config/CPU/export, permission changes and the 48-slot experiment remain deliberately unverified. **PR for human review only; activation remains NO-GO.**
