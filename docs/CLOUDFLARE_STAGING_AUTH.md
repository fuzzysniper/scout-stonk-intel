# Inactive staging authentication handoff

Issue #68 follow-up: [hourly pilot readiness](HOURLY_PILOT_READINESS.md) records current NO-GO gates, staged Windows approval scopes, an owner-only no-dispatch PC auth probe, the inert Actions-read proposal and corrected GitHub-token/Vercel build-cost evidence. Earlier setup instructions are not activation approval.

Issue [#36](https://github.com/fuzzysniper/scout-stonk-intel/issues/36), based on main `cf4fb16b4d5804e38d18a10452e78746c26b126d` including PRs #33 and #35. This is preparatory code and an owner runbook. **No hosted mutation, credential operation, deployment, dispatch or activation has been performed by the agent.** Review/merge is not authorization to run the hosted steps. Each hosted action below needs separate explicit owner approval.

## Decision and exact bindings

Keep the existing staging Worker and SQLite class identity, lifecycle and adapter unchanged. Add only these owner-verified, nonsecret string variables to `scheduler/wrangler.json` and its strict whole-manifest policy:

| Binding | Value | Purpose |
| --- | --- | --- |
| ACTIVATION | disabled | Fail closed before auth, reservation, retry or dispatch |
| APP_ID | 5310753 | Existing SCOUT App |
| INSTALLATION_ID | 171233795 | Existing selected-repository installation |
| REPOSITORY_ID | 1415026436 | fuzzysniper/scout-stonk-intel |

The only future runtime secret name is `APP_PRIVATE_KEY`. It is **absent from the manifest, all local bindings and this change**. IDs are public configuration; they cannot authenticate. The policy permits exactly the values above, rejecting other names, values, types, missing fields, environment variants and secret configuration. There is no account ID, Cron, routes/custom domains, public fetch handler, workers.dev/preview URL, external binding, CI deployment or paid configuration. An internal DO fetch is not a public endpoint. No collector workflow, collection-gate variable, GitHub permissions, data or financial calculation is changed.

`ACTIVATION=disabled` is checked by the scheduled handler, DO tick and retry alarm. Adding IDs or a future secret does not bypass it. It is a configuration safety gate, **not a security boundary against a compromised account administrator**. Existing adapter code contains a dispatch path for a separately approved future pilot; this PR neither invokes nor exposes it. No hosted auth probe, signing request, token minting, dispatch or “Test Cron” belongs to this handoff. Secret-name existence is not proof of key correctness, installation scope, CPU feasibility or end-to-end authentication.

## Security and operational review

The owner reports that the App is installed only on SCOUT with Actions read/write and Metadata read, and that the existing PKCS#8 key is solely on their Windows PC outside the repository with reviewed file permissions. These are **owner-verified issue statements**, not agent inspection of the account or key. Before any hosted change, independently recheck the complete installation, account and Worker in their dashboards. No new App, key, permission or installation is needed or authorized.

Actions write is repository-wide, not specific to one workflow: theft of the key permits minting tokens within the App's actual grants, cancelling/dispatching workflows and deleting Actions evidence. The adapter's narrowed token request does not prove the full installation grant is SCOUT-only. Cloudflare script-authoring credentials may affect other scripts in an account; the config name is not cryptographic confinement. Owner MFA, trusted workstation, pinned package integrity, protected repository review and separate action approvals remain essential. Do not add Contents, Secrets, Variables, Administration, STORK Post Office or treasury access.

Secret storage protects at-rest values but the Worker runtime receives the key if provisioned. Compromised Cloudflare administrators, malicious code/package updates, workstation malware or debug/network capture can expose signing capability. Never pass key contents in arguments, an environment variable, clipboard, here-string, config/.dev.vars, JSON bulk input, uploaded file artifact, chat, Codex or PR. Ignore patterns are defense in depth; they do not make storing a key in the checkout safe. Policy rejection diagnostics expose only a generic error, never the rejected configuration; the PEM scan reports only a file path. The tracked-file scan detects complete PEM envelopes, not every possible encoded credential or secret in Git history.

Keep Workers **Free** (zone Free alone is insufficient). Use the existing account and namespace; inspect quotas and usage without upgrading. IDs and an inactive secret add no scheduled requests by design; no measured hosted bill or CPU claim is made. The <=$5/month target is a ceiling for future engineering review, not spending approval. Stop on a paid plan, quota/upgrade prompt, account mismatch, unexpected bindings, existing activity or unknown gate state. Do not provision another account as a workaround.

## Windows owner procedure — do later, with separate approvals

Use a trusted Windows PC with Git, supported Node >=22 (locally verified Node 24.19.0), the reviewed checkout and its locked Wrangler 4.150.0. The private key already exists; do not generate, download, convert, copy into the checkout or show it to this agent. If its format or ACL needs work, stop for a separate owner security procedure. The following commands have **not** been executed against Cloudflare.

### 1. Review and local credential-free checks

Select the approved 40-hex feature commit, keep the key outside Git, and check every native command's exit code. Root Bash/Python app checks can use the owner's existing WSL installation; no new environment or account is provisioned here.

```powershell
$scoutRepo = 'C:\Projects\scout-stonk-intel'
$scoutReviewedCommit = 'PASTE_APPROVED_40_HEX_COMMIT'
if ($scoutReviewedCommit -notmatch '^[a-f0-9]{40}$') { throw 'Choose the reviewed commit' }
Set-Location $scoutRepo
git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
git switch --detach $scoutReviewedCommit
if ($LASTEXITCODE -ne 0) { throw 'Checkout failed' }
git status --short
Set-Location scheduler
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Install failed' }
npm run dry-run
if ($LASTEXITCODE -ne 0) { throw 'Dry run failed' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Offline tests failed' }
```

Confirm a clean tree and exactly SLOTS/SlotCoordinator (SQLite), disabled activation and the three approved IDs. The fixed dry-run isolates dotenv/profile discovery and strips credentials; never substitute raw deploy flags for it. Do not use `--env`, `--name`, `--remote`, `versions upload`, a test facade or another config.

### 2. Read-only preflight and explicit inactive-config approval

Authenticate only through the owner's existing Cloudflare workstation process after approving that credential use. If new login is needed, follow the narrow scoped login in [the staging runbook](CLOUDFLARE_STAGING.md); do not broaden grants here. Ensure no `CLOUDFLARE_API_BASE_URL`/`CF_API_BASE_URL` override, capture proxy or untrusted executable redirects credentials. Verify the account against the dashboard, not CLI output alone.

```powershell
$env:WRANGLER_SEND_METRICS = 'false'
$env:WRANGLER_SEND_ERROR_REPORTS = 'false'
$env:WRANGLER_WRITE_LOGS = 'false'
$env:WRANGLER_LOG_SANITIZE = 'true'
$env:WRANGLER_LOG = 'log'
$scoutAccountId = 'PASTE_VERIFIED_EXISTING_FREE_ACCOUNT_ID'
if ($scoutAccountId -notmatch '^[a-f0-9]{32}$') { throw 'Verify the existing account' }
$env:CLOUDFLARE_ACCOUNT_ID = $scoutAccountId
npx --no-install wrangler whoami
if ($LASTEXITCODE -ne 0) { throw 'Account verification failed' }
npx --no-install wrangler secret list --config wrangler.json
if ($LASTEXITCODE -ne 0) { throw 'Secret-name inspection failed' }
```

This lists **names/types only**, never values. Before first provisioning expect no secret; on a subsequent visit allow only `APP_PRIVATE_KEY`, investigate any other name and do not overwrite blindly. Record only safe account/script/version/namespace IDs, reviewed commit, UTC time, operator, approvals and exit codes outside the repo. Do not save raw debug/request logs. Owner dashboard checks: existing `scout-scheduler-staging`, correct Free account, disabled activation, no Cron/routes/domains/public URLs, original SLOTS/SQLite namespace/class, no unexpected service binding or invocation. Check GitHub gate unset/false by read-only owner inspection, without changing it.

**First hosted stop/go:** only after separately approving the inactive identifier update, the owner may use `npx --no-install wrangler deploy --config wrangler.json` from `scheduler`. This updates hosted code/config and may restart runtime instances; it is not a read-only binding edit. Keep class/name/lifecycle unchanged and preserve namespace data. Recheck all dashboard properties, IDs and version evidence. Stop on errors; do not retry with broader permissions, another account, billing changes or deletion. This agent does not run it.

### 3. Separately approved private-key provisioning via file-backed stdin

**Second hosted stop/go:** approve exactly one `APP_PRIVATE_KEY` write to the verified, already-existing inactive Worker. Recheck the preflight immediately before the write. Wrangler's secret command can create a draft Worker if the script is missing; this procedure forbids that fallback. If the Worker is absent or its latest version is not the reviewed inactive one, stop. `secret put` is a hosted secret mutation with deployment/version effects; it is not an inert local operation. Review the resulting version and disabled state afterward.

Use a clean local PowerShell session with no transcript, screen recording, debug/verbose tracing, shell/network capture, output redirection or CI agent. If workstation policy requires content capture, stop for an approved secure provisioning channel rather than disabling required controls. The example contains a **path only**. Set it to the existing owner-held PKCS#8 PEM file; never paste the contents. Do not use `Get-Content`, `type`, `cat`, `echo`, clipboard or an interactive secret prompt.

```powershell
$scoutKeyPath = 'C:\OwnerSecure\existing-scout-app-pkcs8.pem'
if (-not [System.IO.File]::Exists($scoutKeyPath)) { throw 'Owner-held key file missing' }
$scoutKeyPath = [System.IO.Path]::GetFullPath($scoutKeyPath)
$scoutCheckoutRoot = [System.IO.Path]::GetFullPath($scoutRepo).TrimEnd('\') + '\'
if ($scoutKeyPath.StartsWith($scoutCheckoutRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Key must stay outside the checkout' }
# Working directory must still be the reviewed scheduler directory.
# Start-Process reads the existing file directly into non-TTY stdin.
$scoutSecretProcess = Start-Process -FilePath $env:ComSpec `
  -ArgumentList '/d /c npx --no-install wrangler secret put APP_PRIVATE_KEY --config wrangler.json' `
  -WorkingDirectory (Get-Location).Path -RedirectStandardInput $scoutKeyPath `
  -NoNewWindow -Wait -PassThru
if ($scoutSecretProcess.ExitCode -ne 0) { throw 'Provisioning failed; do not retry or share raw logs' }
Remove-Variable scoutKeyPath, scoutCheckoutRoot, scoutSecretProcess
```

File-backed stdin passes the multiline ASCII PEM without putting its value in arguments/history or using a PowerShell text pipeline. The Windows command is a documented owner procedure, not a byte-for-byte transport claim tested on this Linux host. Only the path enters command history; keep even that private. The pinned CLI reads non-TTY stdin, trims trailing whitespace and submits a `secret_text` value over HTTPS; it normally prints the secret **name**, not content. Explicit log sanitation/no disk logs/metrics/error reporting reduce exposure; they are not protection from malicious dependencies, a compromised host or administrator. Do not inspect key contents to “debug” an error. No key-shaped fixture or actual key has been used to test this command; Windows hosted provisioning must be reviewed by the owner.

Run the same `wrangler secret list --config wrangler.json` afterward and verify exactly the `APP_PRIVATE_KEY` name/type plus the unchanged four nonsecret variables in the dashboard. Preserve safe version/UTC evidence. No secret getter, signing/JWT test, API-token mint, HTTP/DO probe, Cron test, workflow dispatch or auth-validation endpoint is added or run. Name existence cannot verify the key's format/validity. Hosted authentication validation and the ADR 0002 48-hour pilot require **later, separate approval**; this handoff ends with scheduling inactive. Remove the session's `CLOUDFLARE_ACCOUNT_ID` selector afterward; retain the original private file and manage workstation/OAuth access under owner policy.

## Rotation, revocation and rollback

Before hosted changes, rollback is a reviewed revert of this PR. No actual credential/resource/state exists from this agent's work to remove. After an approved inactive config update, restore only the previously recorded **inactive** config/code in a separate owner-reviewed update, keeping the same SQLite class/namespace and no triggers/routes. Do not assume a code revert removes hosted secrets or restores a prior secret value; inspect names and version/config independently.

For auth-only rollback, separately approve removal of exactly this binding, verify account/name/inactivity, then the owner may run `npx --no-install wrangler secret delete APP_PRIVATE_KEY --config wrangler.json` and confirm the interactive prompt. Check exit status, list names again and inspect disabled state/version. This hosted mutation does not erase the original PC key or revoke GitHub credentials. Preserve all receipts, namespace state, Git claims, real observations and archives; do not delete the Worker/DO, reset a circuit or release a consumed slot as auth rollback. The original runbook's whole-resource removal is not appropriate for this existing namespace without independent state review.

For rotation, remain disabled/no Cron, preserve independent evidence and approve each owner credential action separately: replacement-key creation by the owner, secure PC storage/ACL, runtime secret replacement and old-key revocation. No new key is generated by this PR or requested from the owner. Until a separately approved isolated verification plan exists, do not validate by dispatching production workflows. A key replacement alone is not resume approval.

If compromise is suspected, preserve safe evidence and escalate immediately for owner-approved GitHub key revocation and installation suspension/uninstallation. Deleting a Cloudflare binding or GitHub key does **not** guarantee already-issued installation tokens are invalid; reconcile/revoke them or allow their bounded expiry (up to one hour). Inspect authenticated Actions activity and Git commits independently. Never change grants, erase evidence/data, enable the scheduler/gate, trade or access wallets/treasury as recovery. There is no automatic rollback or activation script.

## Local evidence and limits

The current pinned Wrangler bundle is checked locally with its current workerd and SQLite lifecycle; exact test results are recorded in the PR. Policy regressions reject surfaces, credentials, activation, value/name/type drift and namespace deletion. Runtime tests force scheduled/tick events with IDs and an invalid **non-key** sentinel, as well as missing/malformed activation, and assert zero outbound calls and null receipts. Existing offline adapter tests use only ephemeral mock RSA material, unrelated to the real App. A persisted retry-alarm regression verifies disabled mode leaves its receipt unchanged and emits no calls. No hosted secret, Cloudflare account or actual key is accessed for these tests.

Local Linux runtime proof is not a hosted account audit, real App authentication proof, Windows provisioning execution, 48-hour proving run or Free-tier CPU certification. Worker plan/state and installation details remain owner assertions until their read-only preflight. No UI changes; screenshots do not apply. App/staging locks, collector workflows, gate default, financial APIs/math, recorded history, archive, tokenomics and treasury are unchanged.

References: [Wrangler secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/#secret), [ADR 0002](decisions/0002-staged-trigger-adapter.md), [collection gate](COLLECTION_GATE.md), [staging lifecycle/runbook](CLOUDFLARE_STAGING.md). CLI behavior above is source-verified against the locked Wrangler 4.150.0, not an executed hosted command.

### Verification record — 2026-10-14 UTC

App: Node 20.20.2/npm 11.9.0. Separate staging: supported Node 24.19.0/npm 11.9.0, locked Wrangler 4.150.0/workerd 1.20261006.1. No dependency/lockfile changes. Commands ran from the repository root with the workspace npm cache; staging runtime stays separate from unchanged Node 20 app CI.

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0; 336 packages |
| `npm test` | Exit 0; 131 app/policy JS + 15 adapter JS + 62 Python tests; no failures/skips |
| `npx tsc --noEmit` | Exit 0; no diagnostics |
| `npm run lint` | Exit 0; no warnings/errors |
| `npm run build` | Exit 0; production compilation/types and 9/9 static pages |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; append-only/reproduction passed |
| `npm run archive:dry-run` | Exit 0; genuine pinned replay/idempotency/tamper checks, working archive unchanged |
| `npm --prefix scheduler ci` | Exit 0; 40 packages |
| `npm --prefix scheduler run dry-run` | Exit 0; 14.66 KiB bundle, 4.74 KiB gzip; only SQLite SLOTS and four nonsecret variables |
| `npm --prefix scheduler test` | Exit 0; 6 current-runtime tests; zero outbound requests/claims |
| `git diff --check` | Exit 0 |

The initial staging `ci` exited 254 because the default `/home/agent/.npm/_cacache` was unavailable; it passed with `NPM_CONFIG_CACHE=/workspace/.npm`, preserving integrity/TLS verification and the lockfile. Initial new test failures were a missing test-helper import and an incorrect expected assertion-error boolean; both were corrected before final full verification. Existing npm ESLint deprecation and Next edge-runtime/static-generation notices remain. The local negative HTTP probe intentionally emits the missing-fetch-handler diagnostic; Wrangler's inherited-proxy warning is expected.

Byte comparison against the starting main verified 75 protected application/API/math, dataset/archive/allowlist, workflow, backend script, actual adapter/entry/dry-run and package/lock files unchanged. Only the nonsecret staging manifest/policy, tests, ignore rules and documentation change. Account state, secret existence, private-key validity, Windows execution and hosted behavior are deliberately unverified here. Human review is the stop point.
