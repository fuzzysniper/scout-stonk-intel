# Inactive Cloudflare scheduler staging

Issue [#32](https://github.com/fuzzysniper/scout-stonk-intel/issues/32). Starting main: `c4f75234064fc7526874aa4ca508211d7fcd85d3`. This PR prepares a separate Worker package; **Codex does not deploy it or activate any scheduler**. The owner may operate the PC procedure below only after reviewing/approving this PR and the exact inactive deployment. This does not authorize GitHub App/secret setup, Cron, dispatch, the collection gate, billing changes or a 48-hour pilot.

## Package and current lifecycle decision

`scheduler/package.json` and its own lockfile pin Wrangler **4.150.0** (current registry release at inspection), workerd **1.20261006.1**, and Wrangler's transitive Miniflare **5.20261006.2-beta**. Wrangler requires Node >=22; local staging checks use Node 24.19.0. The root app retains its Node 20 CI, dependency/lockfile and all financial/data/API contracts. Native tooling is development-only and requires human dependency/security review under AGENTS.md. No deploy script is added to either package.

The manifest names only `scout-scheduler-staging`. Compatibility date `2026-10-01` precedes the bundled runtime date. `workers_dev=false` and `preview_urls=false` are explicit. There are **no** routes, domains, Cron triggers, environment variants, assets, external service bindings, account IDs, GitHub IDs or secrets. The only variable is `ACTIVATION="disabled"`; `SLOTS` binds the actual `SlotCoordinator` exported by the existing adapter.

Current official docs prefer the declarative `exports` lifecycle for new Workers. This manifest declares `SlotCoordinator: {type: "durable-object", storage: "sqlite"}`; absent state means created. It deliberately has **no legacy `migrations` array**. This is current namespace lifecycle configuration, not an omitted SQL migration: the adapter lazily creates its existing tables when an object is instantiated. Do not mix `exports` and legacy migrations, select `legacy-kv`, transfer an existing namespace or rename the class. July 9's SQLite-only announcement used `new_sqlite_classes`; the current class-exports docs supersede that syntax for new Workers while preserving the SQLite requirement. Namespace creation/reconciliation is only a future human `wrangler deploy` action; dry-run cannot prove remote reconciliation.

The small `staging-entry.ts` re-exports only the **unchanged** adapter's default disabled scheduled handler and actual coordinator class. Directly deploying `worker.ts` passed bundling but failed the current local runtime because its public `TARGET` string export is not a function/handler. The entry wrapper keeps constants/helpers internal and fixes that verified compatibility issue without modifying adapter logic. It has no public fetch handler. The coordinator's internal fetch method is accessed only through a DO binding, not a public Worker route. No new facade, listener or probe endpoint is shipped.

[ADR 0001](decisions/0001-collection-trigger.md), [ADR 0002](decisions/0002-staged-trigger-adapter.md) and [collection gate](COLLECTION_GATE.md) retain their security/proving requirements. Preparing/deploying this inert namespace does not enable that gate, replace native collection or establish scheduler reliability.

## Local-only validation

From repository root using Node >=22:

```sh
npm --prefix scheduler ci
npm --prefix scheduler run dry-run
npm --prefix scheduler test
```

The fixed dry-run runner validates the entire inactive config, accepts no arguments/overrides, then calls the pinned CLI with `deploy --dry-run --config <isolated-copy> --outdir <temporary-directory>`. Only the source entry path becomes absolute in the temporary config. The directory is isolated from repo dotenv files; Cloudflare credential/account environment variables are not forwarded, metrics are disabled, and proxy/CA/platform bootstrap are preserved. It checks the actual bundled coordinator/SQL and removes temporary config, output and logs in `finally`. No upload, login, account provisioning or credential setup occurs. Local `.wrangler`, `.dev.vars` and generated output are ignored; no secret file is created.

Static regressions run in ordinary root `npm test` without installing Wrangler: no surfaces/secrets/activation, SQLite and real export identity, locked tool versions, no deploy script, rejected unsafe config/lifecycle drift, fixed dry-run arguments and rejected passthrough flags. The separate Node >=22 runtime test runs the **actual Wrangler-produced bundle** on its current workerd with SQLite. It forces a local scheduled event and ten internal ticks while disabled, confirms a successful real SQL receipt query returns null (no claim), and asserts **zero outbound requests**. An artificial local HTTP probe returns 500 with the expected missing-fetch-handler diagnostic; this is evidence of absent handler, not a public route or hosted failure. Miniflare's public legacy-options converter adapts the test harness to its current API; the runtime itself is the current pinned version. All test operations stay local; no App material or GitHub dispatch is used.

Root CI remains unchanged and Node 20. It runs the static config regressions and all existing adapter tests, not the separate Node >=22 Wrangler check. Repeat both staging commands on the reviewed PC revision before any approved upload. Dry-run, local SQL and startup success do not establish Cloudflare account permissions, remote lifecycle state, account limits or hosted behavior.

## Human-operated PC procedure — inactive deployment only

Use a trusted Windows PC with Git and Node 24 (or supported Node >=22). Root app checks remain the existing Linux/Node 20 CI; Windows operators can use an existing WSL environment for the full Bash/Python suite. No Next.js app is deployed to Cloudflare.

1. Obtain explicit review of this PR, the new native development dependencies, account selection and one **inactive** staging deployment. Record operator, exact commit and UTC time. In the Cloudflare dashboard select the **existing** intended account and confirm **Workers Free**, not merely a Free zone plan. Verify account usage can accommodate one additional SQLite DO class/namespace (Free class/account and storage limits still apply). If billing is Paid, quota is insufficient or any upgrade/payment prompt appears, **stop**; do not subscribe, provision another account or change billing. Confirm `scout-scheduler-staging` is absent. If it exists, stop for owner investigation instead of overwriting it or assuming it has no old secrets/triggers/data.
2. Start a clean PowerShell session with no Cloudflare API token/key, production `.env`/`.dev.vars`, CI upload agent or inherited production credentials. Never print or copy a credential. Substitute your local path and the approved exact 40-hex commit:

```powershell
$scoutRepo = "C:\Projects\scout-stonk-intel"
$scoutReviewedCommit = "PASTE_APPROVED_40_HEX_COMMIT"
if ($scoutReviewedCommit -notmatch '^[a-f0-9]{40}$') { throw "Select the reviewed commit first" }
Set-Location $scoutRepo
git fetch origin
git switch --detach $scoutReviewedCommit
node --version
Set-Location scheduler
npm ci
npm run dry-run
npm test
```

Stop on any nonzero result; in PowerShell check `$LASTEXITCODE` after each native command. Confirm the dry-run shows only SLOTS/SlotCoordinator and disabled activation. Do not pass `--env`, `--name`, `--remote`, or a different entry/config. Do not run root Next.js deployment commands.

3. Authenticate only on this approved PC using the owner's normal Cloudflare process. If login is needed, the pinned CLI supports the narrower script-authoring scopes below (its no-flags default requests many more scopes). Review the OAuth consent; stop rather than add privileges if the approved grant is insufficient. This credential can manage scripts/DOs/triggers in accessible accounts; choosing an account is **not** cryptographic confinement to one Worker. No GitHub App or runtime secret is created.

```powershell
$env:WRANGLER_SEND_METRICS = "false"
npx --no-install wrangler login --scopes account:read user:read workers_scripts:write
npx --no-install wrangler whoami
$scoutAccountId = "PASTE_EXISTING_FREE_ACCOUNT_ID"
if ($scoutAccountId -notmatch '^[a-f0-9]{32}$') { throw "Verify the existing account ID" }
$env:CLOUDFLARE_ACCOUNT_ID = $scoutAccountId
```

Verify whoami/account ID against the dashboard and approved account. Do not commit the ID or authenticate in Codex. Review the unchanged public `wrangler.json`. Confirm GitHub's collection-gate variable remains unset/false through owner read-only settings inspection; this procedure never sets it. If it is already enabled or unknown, stop and investigate without changing it here.

4. **Only after explicit inactive deployment approval**, run exactly this manual command from `scheduler`:

```powershell
npx --no-install wrangler deploy --config wrangler.json
```

This is the only upload step; it was **not run by Codex**. Confirm name/account, only disabled activation, SLOTS binding and the SQLite `SlotCoordinator` lifecycle reconciliation. Save safe deployment/version ID, namespace ID, commit, UTC time and CLI result outside the repo. Do not run `versions upload`/gradual rollout: current `exports` lifecycle requires `deploy`. Stop if permission/backend/lifecycle validation fails; never retry with a Paid upgrade, legacy KV migration, broader grant or other account.

5. Inspect the new Worker dashboard: workers.dev and preview URLs disabled; no routes/custom domains; no Cron/Scheduled triggers; variable exactly disabled; no secrets/App IDs/keys; SLOTS points to its own SlotCoordinator namespace with **SQLite** storage. Verify no other Worker/service binds to it. Namespace creation does not mean an object/SQL table has been instantiated; do not invoke it merely to fill the dashboard. Do not use “Test Cron,” HTTP/DO test calls, add a fetch facade, run a real dispatch, set activation or enable the GitHub gate.

Optional read-only CLI confirmation of no secret names (no values):

```powershell
npx --no-install wrangler secret list --config wrangler.json
```

Expected result is an empty list. Record dashboard's no scheduled invocations/requests and no expected GitHub scheduler-run activity over an owner-chosen observation interval. Empty logs alone cannot prove absence of every request; corroborate no triggers/routes/credentials with activity and run evidence. Existing native/manual GitHub collection may still run independently and is not caused by this inert Worker. No 48-hour hourly proving claim is made. If unexpected invocations, GitHub calls, bindings or data exist, stop/preserve evidence and escalate; do not fabricate a successful inertness check.

6. Remove the session selector after review: `Remove-Item Env:CLOUDFLARE_ACCOUNT_ID`. Keep OAuth/session handling under the owner's workstation policy. No key rotation, secret upload, production rollout, Cron setup or billing operation belongs to this procedure. Scheduler activation/App setup/shared-gate migration/48-hour proving each require separate approval.

## Removal and rollback — human only

Before any deployment, rollback is a reviewed revert of this preparatory PR; no Cloudflare resource, real credential or data exists from Codex to undo. Do not revert later genuine observation commits.

After a separately approved inert deployment, obtain explicit approval to remove **only** the recorded staging Worker/namespace. Confirm the exact account, script and namespace IDs; activation still disabled; no triggers/routes/secrets; no external bindings; and no genuine claim/receipt data that needs preserving. Retain operator evidence. If any of these checks fail or a namespace is reused/nonempty unexpectedly, stop instead of deleting it as “staging.” Never remove SCOUT observations, Git control claims or archives.

From the same trusted PC, authenticated to the recorded existing account and inside `scheduler`:

```powershell
$env:WRANGLER_SEND_METRICS = "false"
$env:CLOUDFLARE_ACCOUNT_ID = "PASTE_VERIFIED_EXISTING_ACCOUNT_ID"
npx --no-install wrangler delete --name scout-scheduler-staging --config wrangler.json --dry-run
# Only after confirming the name/account and separately approving deletion:
npx --no-install wrangler delete --name scout-scheduler-staging --config wrangler.json
Remove-Item Env:CLOUDFLARE_ACCOUNT_ID
```

Confirm only the staging name at the interactive prompt. **No `--force`**: reference/dependency warnings are a stop. Current documentation describes `delete` as removing the Worker and associated platform resources. Independently verify both the recorded Worker and SQLite namespace disappear; a success message alone does not prove full removal. If a namespace remains, preserve it and escalate for a separately reviewed namespace deletion plan rather than broad cleanup. The documented `exports` deletion alternative requires removing the class from code and binding, deploying a `state:"deleted"` tombstone and no external references; it permanently destroys namespace data and is not an automatic fallback here. Do not mix migration flows or roll back across a namespace lifecycle change with `wrangler rollback`.

Existing GitHub schedules, shared-gate variables/permissions, datasets, archived editions, financial calculations, app hosting, treasury and STORK assets remain untouched. A later active pilot has additional pause/token/receipt recovery obligations in ADR 0002 and COLLECTION_GATE.md; this inert removal procedure cannot substitute for those.

## CPU, compatibility and budget notes

Current local workerd successfully starts the actual wrapped bundle at the configured date and executes disabled scheduling plus real SQLite. This is **compatibility and inactivity proof only**. The approximately 373ms observed local test wall duration includes harness/runtime/SQL work, is not CPU, not hosted latency and not a Free-tier performance pass. The older [ADR 0002 CPU evidence](evidence/scheduler-cpu-benchmark.json) remains unchanged: old-runtime aggregate warm signing ~1.7ms, fresh SQL/mock dispatch ~4.5ms and thin Worker/repeat DO composite ~0.6ms, tick resolution 10ms. Those are neither invocation percentiles nor Cloudflare billed CPU; current hosted cold-start/key-size/account measurements are still unknown.

Current source review distinguishes Free Worker's **10ms CPU/invocation** from SQLite DO's **30s default CPU/request** (configurable ceiling in docs). Signing/dispatch remains inside the DO. No configuration raises CPU limits. With no event sources, public ingress or credentials, ordinary staging has no intended invocations/dispatches and only a newly provisioned namespace/class after human upload. Tests create temporary local SQL rows only. Confirm account-wide class/storage/usage limits before provisioning; do not promise a zero bill from local tests or assume an empty namespace has no quota footprint.

Free remains the conditional $0 infrastructure candidate. The existing maximum **$5/month target is not spend authorization**: Workers Paid starts at $5 plus possible overages/taxes/account usage and can exceed it. This task permits no purchase/upgrade or fallback to Paid. If Free validation fails, stop and reconsider through human review. Current Free storage operations exceeding quotas fail rather than justifying an automatic upgrade. An eventual hourly pilot's billing and hosted CPU need separate proving; none occurs here.

## Sources, checks and limits

[Eight dated official source hashes](evidence/cloudflare-staging-sources.json) pin Cloudflare's own docs repository. Direct docs GET returned HTTP 403 in this managed environment, so official GitHub sources were used without bypass. Topics: Wrangler configuration/commands, class exports/migrations, July 9 SQLite-only change, DO limits and Workers/DO pricing. `exports` support is also verified in the actual pinned CLI schema/dry-run. Account-specific state and hosted namespace reconciliation remain unverified until the separately approved human procedure.

[Local validation evidence](evidence/cloudflare-staging-validation.json) records exact versions, bundle estimate, bindings, zero outbound calls, no public handler and the incomplete release smoke. [Protected-file hashes](evidence/cloudflare-staging-protected.json) verify **73** existing data/archive/allowlist, app/math/API, workflow, collector/script, original adapter and root dependency files match starting main byte-for-byte. No UI change; screenshots do not apply.

| Command | Result |
| --- | --- |
| Root `npm ci` (Node 20.20.2/npm 11.9.0) | Exit 0; 336 packages |
| `npm test` | Exit 0; 127 app/workflow/staging-policy JS + 14 existing adapter-runtime JS + 62 Python; no failures/skips |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0; no errors/warnings |
| `npm run build` | Exit 0; existing production routes compile |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; append-only/reproduction passes |
| `npm run archive:dry-run` | Exit 0; genuine pinned replay/idempotency/tamper checks, working archive unchanged |
| `npm --prefix scheduler ci` (Node 24.19.0/npm 11.9.0) | Exit 0; 40 packages from separate lockfile |
| `npm --prefix scheduler run dry-run` | Exit 0; Wrangler 4.150.0; 14.66 KiB / gzip 4.74 KiB predicted bundle, only SLOTS and disabled activation |
| `npm --prefix scheduler test` | Exit 0; 1 actual current-runtime integration, zero outbound calls |
| `SCOUT_VERIFY_ENV_PROXY=1 npm run verify:release` | Exit **2**, incomplete at 2026-10-13 22:23:02 UTC: `host_or_network_unreachable`, no valid production app response |

Production reachability failure does not prove an application defect/health or validate this Worker; no deployed smoke is claimed. Existing ESLint deprecation and Next edge-runtime warnings remain. Wrangler reports inherited proxy usage; the local negative HTTP probe intentionally logs its missing-handler diagnostic. Both are expected and scoped. No Cloudflare account was queried/provisioned, no real credentials configured, no GitHub App/permission/gate change, no workflow dispatch, no remote upload, merge, paid action or treasury operation occurred. The PR stops at human approval.
