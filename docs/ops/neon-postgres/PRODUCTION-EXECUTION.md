# Connectivity execution decision — 20 October 2026

**STOP before deployment or invocation. No verified alias-neutral production execution mechanism is currently available.** Native Vercel → Neon connectivity remains **UNPROVEN**. This revision prepares an auditable default-disabled artifact and offline guards, not a permission to use them against hosting or PostgreSQL.

## Actual incident and current evidence

Founder-confirmed: the reviewed OFF artifact from `edcc3602e5c64cba15f013dbefccbab91420010a` was staged from authenticated Codespaces using `vercel deploy --prebuilt --prod --skip-domain`. Contrary to our prior runbook's assurance, the team alias moved. The founder restored it, deleted `dpl_Gdz452bZZ5qwXMoDj4NwrM69eHpL` and independently verified cleanup. **The old staging command is retired for this operation.** We did not reproduce the incident or invoke its Function. The original ZIP/inventory hashes identify that older artifact, not this revision's output.

Read-only Vercel control-plane metadata checked 20 October 2026 at approximately 07:43–07:52 UTC:

| Check | Observation, not live connectivity proof |
| --- | --- |
| Project / team | `scout-stonk-intel` / `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q` / `team_x1JQRQhMe5Ic1VFpklZMPM2j` |
| Node | `24.x` |
| Protection configuration | SSO `enabled=true`, `deploymentType=all_except_custom_domains`; this does **not** prove effective authentication for a future particular deployment URL |
| Complete project alias listing | 66 aliases; pagination `next=null` |
| Four production aliases | `scout.storkcoin.xyz`, `scout-stonk-intel.vercel.app`, **`scout-stonk-intel-riskledgerapp.vercel.app`**, **`scout-stonk-intel-git-main-riskledgerapp.vercel.app`** all pointed to `dpl_DjDo97SmCUM3kcibVqPT1LkjSjkj` |
| Project domain mappings | Two, custom domain and project `.vercel.app`; neither had git-branch/custom-environment mapping or redirect |
| Custom environments | `environments=[]`, `accountLimit.total=0`; no usable custom environment was verified |

This snapshot is dated evidence, **not a reusable future baseline**. Normal main releases can change production targets. Collect fresh authenticated complete metadata immediately before and after any future separately approved staging, and after cleanup. Freeze concurrent releases for that window. Do not invoke a Function to gather these snapshots.

### Why skip-domain was insufficient

The [CLI docs](https://vercel.com/docs/cli/deploy) describe skipped automatic domain assignment. Inspection of the official installed **Vercel CLI 64.5.0** deploy module shows `--skip-domain` sets **`autoAssignCustomDomains=false`**, passed to the creation request. It does not expose a separately reviewed all-generated-alias suppression switch. Module SHA-256: `700c6d723f420abe1e7b322a36fc0583fadc47d2cdb40f536971f005d661c7ac` (`vercel/dist/commands/deploy/index.js`). This is local package-source evidence, not proof of the incident's unknown CLI/server version or a complete root-cause analysis. The observed team-alias move is enough to invalidate the earlier blanket safety assurance.

No reviewed public [deployment-creation schema](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment) or CLI path established that **every** production alias would remain untouched. Do not invent `autoAssignArchivableAliases`, substitute an API upload, use `redeploy`, `promote`, `rollback`, `--force` or a production deployment followed by repair. Post-deployment comparison can **detect** a changed alias; it cannot prevent a transient production change. An OFF approval manifest prevents SQL, not routing damage.

## Smallest supported alternatives and their blockers

| Method | Isolation / consequence | Decision |
| --- | --- | --- |
| Existing production Function, arbitrary command | Vercel exposes no reviewed attach/exec facility for arbitrary code in the deployed app. Disabled `/api/mint-facts` must remain disabled. Local `env run`/`build`/Sandbox is not production execution. | Unavailable; no spoofed runtime identity or credential export. |
| Another production-target artifact | Uses existing production-only variables; observed alias promotion can affect the public app. | **Rejected**, including former skip-domain procedure. |
| Existing project's custom nonproduction environment | Supported [custom target](https://vercel.com/docs/deployments/environments), e.g. `--target=scout-neon-proof`, separates target/domain mapping from production. Requires no production domains/branch auto-deploy mapping, effective authentication, owner-approved server-side **DB-only** credential scoping, and a separately reviewed nonproduction identity gate/artifact. | Structurally preferable candidate, **not presently available**: environment list empty, limit zero. No entitlement, cost or all-alias guarantee inferred. Existing production-only secrets do not follow it automatically. No creation, copying or paid-plan upgrade authorized. |
| Ordinary Preview | Nonproduction target may still receive generated preview aliases. Production-only DB credential absent; wildcard Preview scoping would expose it to unrelated preview code. | Not a credential workaround. No broad scope expansion, env pull or locally injected DB URL. |
| Separate isolated project | Separates production alias namespace most strongly, but new project/secret scope/protection/usage/cost must be approved. | Not authorized; does not prove connectivity of existing SCOUT production runtime. |
| Provider-supported alias-neutral production execution | Would preserve existing credential scope and prove production directly if Vercel supplies a documented supported mechanism with testable no-alias behavior. | **Preferred next enquiry** if production-runtime proof is mandatory. Owner can ask Vercel support; no message has been sent. No deployment until reviewed. |

Custom-environment connectivity, if separately enabled and tested, would prove **that environment's** Node-to-Neon reachability, not retroactively prove the existing production Function. The current handler intentionally continues to reject Preview/custom targets. Do not fake `VERCEL_ENV=production`, edit identity pins locally, or claim the unimplemented alternate gate is ready. Authentication must cover the exact generated URL, not just the project setting or an unguessable address.

**Precise remaining blocker:** with unchanged production-only credential scope, no presently reviewed method both runs the temporary code and guarantees zero production-alias mutation. A platform-supported alias-neutral method, or explicit owner approval of genuinely isolated nonproduction infrastructure/DB-only secret scoping and its narrower proof, is needed. This PR does not authorize either.

## Unsent Vercel support enquiry

> For existing project `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q` in team `team_x1JQRQhMe5Ic1VFpklZMPM2j`, we need one temporary protected Node Function using existing production-only sensitive variables for a read-only native PostgreSQL connectivity proof. `vercel deploy --prebuilt --prod --skip-domain` nevertheless moved the team-level alias; the deployment was removed and aliases restored. Is there a **supported documented execution/deployment mechanism that cannot reassign any custom, project, team or git-main production alias**, including transiently? Please specify the exact CLI/API contract, generated-alias behavior and inspectable protection/assignment metadata. We cannot export secrets, change billing, promote/repair aliases, or use another project and call it proof of this runtime. If not supported, please confirm the limitation so we can separately review isolated nonproduction credential scoping. No permission to deploy or invoke is being requested by this message.

Prepared for owner review only; **not sent**. No support ticket/service or provider traffic was created.

## Exact offline artifact procedure

Use a fresh clean checkout of the final reviewed PR **head SHA** (not GitHub's synthetic merge commit). Pin Node 24, Python 3 and the lockfile. No hosting credentials, `.env` files or application environment are needed. Do not run `vercel pull`, `env pull`, `env run`, `build --prod` or login as part of packaging.

```bash
# Run in that clean checkout; confirm git rev-parse HEAD matches the reviewed SHA.
npm ci --ignore-scripts
node --test tests/onchain-api/neon-artifact.test.mjs tests/onchain-api/neon-isolation.test.mjs tests/onchain-api/scout-neon-smoke.test.mjs
node scripts/ops/build-neon-smoke-artifact.mjs
mkdir .vercel/review
python3 scripts/ops/neon-artifact-zip.py pack .vercel/output .vercel/review/scout-neon-default-off.zip
```

The last command returns the actual ZIP SHA-256, canonical file-inventory SHA-256, byte count, file count and source commit. Use **those exact values**, independently compared to the reviewed CI summary, with:

```text
python3 scripts/ops/neon-artifact-zip.py verify .vercel/review/scout-neon-default-off.zip ZIP_SHA256 INVENTORY_SHA256 REVIEWED_HEAD_SHA
```

Replace the three uppercase placeholders with the actual approved values; they are not hashes of the outer GitHub Actions download ZIP. CI uploads an inner deterministic ZIP plus detached `review-summary.json`. The outer Actions ZIP can differ. The verifier reads without extracting, checks both digests, duplicate/path traversal/symlink/size constraints, exact Node24 single-function configuration, OFF manifest, clean source commit, source file hashes and locked pg package versions. Packaging refuses an existing output/destination, symlinked output ancestors, changed installed versions, unsafe files or recognizable key bytes. npm's verified clean install and human inventory review are still needed; pattern scans cannot prove absence of every possible secret.

Artifact facts: Build Output v3, Node `nodejs24.x`, 10s maximum runtime, only `/_ops/neon-smoke`; other paths 404. No Next app/CARDS, project link/auth file, aliases, cron, collector, SDK, env or deploy command is bundled. `artifact.json` binds source/lock/handler/probe hashes. CLI output is always **`approval.json={"enabled":false}`**. An armed artifact must be newly built from a reviewed clean commit, with exact operation/source pin and positive ≤5-minute UTC window, then independently hashed and separately approved. The builder's programmatic arming API is for a **future separately reviewed builder**, not a shell activation flag. Artifact provenance is review evidence, not remote attestation: someone able to replace the whole trusted artifact can replace its manifest too.

## Mandatory domain/alias verification — executable offline guard

The guard has **no network or deployment capability**. In an already authenticated owner CLI, collect fresh **read-only** control-plane metadata for the exact project/team. Do not print secrets, use a decrypted env endpoint or dump complete runtime logs. These documented GET operations are sufficient for the current <100-row inventory:

```text
vercel api '/v9/projects/prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q?teamId=team_x1JQRQhMe5Ic1VFpklZMPM2j' --method GET
vercel api '/v4/aliases?projectId=prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q&teamId=team_x1JQRQhMe5Ic1VFpklZMPM2j&limit=100' --method GET
vercel api '/v9/projects/prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q/domains?teamId=team_x1JQRQhMe5Ic1VFpklZMPM2j&limit=100' --method GET
```

Run only in the authenticated owner context; do not add verbose/debug logging or save unprojected responses. Project output must be projected in memory to `{id,name,accountId,nodeVersion,ssoProtection}` before saving; alias rows to `{alias,deploymentId,projectId}`, domains to `{name,projectId,gitBranch,customEnvironmentId,redirect}`, plus their actual `pagination`. Save a private JSON object `{project,aliases,domains}`; no env fields/values. Preserve independent capture UTC/source in the private operator record. A source error, wrong scope, absent pagination, `next!=null`, stale capture, concurrent release or >100 aliases means STOP; do not drop pages or manually mark them complete. For larger listings, add/review pagination handling first.

```bash
node scripts/ops/neon-alias-guard.mjs snapshot before-raw.json before.json
# Only after a separately approved safe mechanism; no deployment is authorized here.
node scripts/ops/neon-alias-guard.mjs snapshot after-raw.json after.json
node scripts/ops/neon-alias-guard.mjs compare before.json after.json
# Repeat after cleanup with a newly captured cleanup-raw.json / cleanup.json.
node scripts/ops/neon-alias-guard.mjs compare before.json cleanup.json
```

All four production aliases must exist and agree at baseline. The guard compares **all** project aliases and domain assignments, including preview alias additions/removals and production target/protection changes; those require renewed review, not an ignored difference. Reordered response rows are harmless. A snapshot hash is not provider attestation or a deployment authorization. Inspect exact deployment metadata as well: expected project/team, artifact commit/digest, environment, Node runtime, `alias`, `aliasAssigned`/`aliasError`, custom-environment/domain mapping, and every actual alias targeting it. Missing/ambiguous control-plane evidence is a blocker. Effective exact-URL Authentication must be verified before an armed artifact or POST; no protection-bypass token creation/export. If control-plane evidence is insufficient, request a **separate explicit owner approval for a single unauthenticated GET to the OFF artifact** to check the platform challenge. If protection is broken that GET can reach the handler (OFF/GET rejects before secrets), so it is a possible Function invocation, not a harmless metadata check. No such GET is authorized or performed here. A different final armed deployment needs its own protection evidence; do not inherit proof from an old URL.

## Invocation and cleanup contract — no live command authorized

Once a **new safe execution mechanism is reviewed**: stage OFF only after a separate deployment GO; collect exact deployment ID/URL and protection/domain evidence; reject any mapping change. A later armed artifact is different bytes and needs its own review/deployment approval. An **invocation-specific GO** must name that final immutable deployment, digest, operation and short UTC window. No GO is inferred from credentials, successful staging, authentication or prior approval of a different artifact.

Before the one empty POST, the owner records the operation consumed. Handler gates run before DB credential lookup; reads the actual empty stream, consumes a per-warm-instance attempt, checks source pin/window and rechecks expiry after driver import and before connect/SQL. The probe opens **one client**, executes at most **three fixed statements** (`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, catalog SELECT, `ROLLBACK`), closes and returns only a sanitized 19-check report. No request supplies SQL, hostname, role, mint or token. Failure/timeout/expired window/uncertain response means **no retry**. Cleanup rollback/close must still run if approval expires after BEGIN. Import/stream bounds plus 5s work and bounded rollback/close fit the 10s function maximum under normal scheduling; a platform kill may prevent a response, which is failure, never PASS.

The in-memory latch is **not durable/global exactly-once**. Other instances/restarts can accept the same manifest. Owner serialization, consumed private operation record and prompt deletion are procedural controls; explicitly accept that limitation or review a real durable external invocation claim before proceeding. Do not create a Neon latch or call admission/`scout_mint.step` to enforce it.

Cleanup must delete the **exact disposable deployment**, not merely the source branch. Future owner-approved CLI reference (substitute the reviewed immutable ID and quote scope as needed): `vercel remove DEPLOYMENT_ID --scope riskledgerapp --yes`. First verify the ID belongs to the disposable artifact and has **zero production aliases**; otherwise deletion could cause an outage. Confirm supported remove syntax using that pinned CLI's help before the approved action. Verify deletion in authenticated control-plane metadata and repeat the alias/domain comparison. Do not probe the deleted Function URL. Retain sanitized hashes/clocks/decision/request/deployment IDs privately; no credentials, complete headers or raw logs. Deployment/function execution can incur existing plan compute and DB connection/auth telemetry; no zero-cost or zero-side-effect promise.

If any alias moves: **no POST, no further deployment and no automatic repair/delete**. Preserve sanitized before/after evidence and notify the owner. The owner uses the independently recorded preflight deployment target to review and restore each affected alias using Vercel's supported Alias management, then verifies every original mapping. A CLI `alias set` with a guessed/current/latest target or whole-project promote/rollback is not recovery. Only after restoration is verified should the owner delete the temporary deployment and recheck mappings. No DB reset/bootstrap/policy update, credential rotation, collector action or RPC gate change belongs to recovery.

## Founder checklist — separate decisions

- [ ] **Choose execution path:** Vercel-confirmed alias-neutral production mechanism, or separately approved isolated nonproduction scope with honest narrower proof. No repeat of skip-domain production staging.
- [ ] **Review costs/credential scope:** no plan/new service change, no Helius/HMAC cloning, no secret export. If an unavailable entitlement or DB scope change is needed, approve it separately before implementation.
- [ ] **Review artifact:** exact clean commit, ZIP/inventory hashes, Node24, OFF manifest, source pin; freeze concurrent deploys and record fresh complete alias/domain baseline.
- [ ] **Staging GO only:** exact mechanism/artifact/project; inspect resulting immutable ID, domain assignments, protected URL and unchanged aliases. No POST.
- [ ] **Arming/deployment GO separately:** newly reviewed short-window artifact and hashes; repeat all staging checks. OFF staging approval does not cover it.
- [ ] **Invocation GO only:** exact final ID/URL/hash/window; accept procedural single-use limitation; one DB connection/three metadata statements/no retry, no Helius. SCRAM mechanism remains unobserved.
- [ ] **Cleanup:** exact deployment removed, all four aliases and complete mappings unchanged, sanitized result retained. No automatic next call.

After an authentic successful Neon result is reviewed, the next decision is the [separate one-call Helius capture](HELIUS-CAPTURE.md). Neither step enables public RPC or LIVE_APPROVAL.
