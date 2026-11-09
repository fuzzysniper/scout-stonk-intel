# One preserved source-OFF Preview — UNAPPLIED

This dependent packet targets #291 `06046d1909ce39e9808cff91075e51ddbe776b31`
(tree `eba9c9b2d2a2f8163ad9e8670e3fdfea0a7fa339`). It does not install itself
on `native-pilot/private-beta-rc`, dispatch, upload or deploy. No application,
SQL, trust key, admission, STOP, collector or publisher implementation changes.
Latest main observed during preparation: `53fe2523389f0738ed203a52de0eddf5454fc69e`;
that collector/application history is not incorporated or overwritten here.

## What is actually verified

Public dependencies: Node **24.19.0**, npm **11.9.0**, CLI **64.5.0**,
`@vercel/next` **23.0.3**, build-utils **14.21.3**, existing Next **15.5.28**.
The isolated toolchain lock and critical CLI implementation files are SHA256-pinned
in `policy.json`. Root dependencies/lockfile are unchanged. This is build tooling,
not a new runtime transport or database. No automatic dependency upgrade is allowed.

A normal clean clone of exact060 was genuinely compiled with this CLI, in an OS
network namespace without external interfaces, DB/provider bindings or CLI auth.
No `vercel pull`, `env pull`, login, project creation or credential file was used.
The public local project link is only a build recipe; it is not live project evidence.
`build --standalone` is essential: the default build emitted unresolved `filePathMap`
references into the source checkout. That rejected output was never uploaded.
The official standalone output has no such maps and only contained symlinks.

Preserved local060 output record (not an Actions artifact or deployed build):

- Inventory SHA256: `039185b03a6828db47414a583c3b77bb654dbca25df82167262cc8b23123fe3a`.
- Frozen bundle SHA256: `05901f7909fc505baa84f40b8f45bd7ae626680aa35c7c74749cb48f1ac8bce9`.
- Bundle bytes: **51,690,605**. Native API and owner-route closure SHA256:
  `4e920407b0d558e20b75283f7083c93dd6d1227933640fe98bd8547aa26ea466`.
- Both native routes use `nodejs24.x`. A full local restore reproduced the exact
  inventory. Ten receipt entries include eight physical function configurations
  plus the two native logical closures; this is not a count of ten independent APIs.

The local frozen060 bytes are retained privately; do not publish the raw bundle.
Next generates server-action/preview encryption keys even without supplied secrets.
The proposed release workflow encrypts the archive with AES-256-GCM before any
Actions upload. Public receipts expose paths, environment **names** and hashes only.
No provider/database credential is present. Synthetic encryption tests are not
owner key enrollment or genuine hosted acceptance.

## Exact release/identity issue resolved by this packet

Existing admission requires the final artifact's workflow-run SHA and branch to
equal the deployed application. An artifact uploaded by a different tooling-head
run cannot qualify as the old060 build. Consequently this patch must first be
reviewed and separately installed on the release ref, without changing main or
automatically deploying. The resulting **single final release SHA/tree** is built
once in its own exact-head `native-pilot-admission.yml` run. No claim is made that
this later, independently built release equals the retained local060 output.

In the final run, `build-isolated.sh` uses a normal `.git` directory, actual clean
HEAD/tree/ref and the canonical GitHub remote. Only `.vercel/` build metadata is
added to local `.git/info/exclude`; no application/source ignore is added. The
real pinned CLI `createGitMeta` result is checked. The CLI supplies its native
`gitMetadata` when creating the deployment. No `--meta`, `--env`, fabricated
`VERCEL_GIT_*`, deployment ID or origin is supplied. Runtime/system variables
remain Vercel's responsibility; their hosted mapping is still **unproven**.

The full file/mode/link inventory and physical function config hashes, plus native
closure hashes, are frozen immediately after build. The same original directory
is uploaded; hash drift HOLDs. The deployment ID does not exist during compilation.
`binding.json` and the final Actions receipt are added **outside** the frozen output
after the one CLI result. This avoids a deployment-ID rebuild/self-reference loop.
The old admission/owner verifier remains byte-identical.

## Required bindings and prerequisites — separate owner actions

Use the existing **native-pilot-setup** environment, ID **26516929095**;
workflow **409607134**, sole reviewer fuzzysniper58099771, bypass=false,
prevent-self-review=false, exact Branch `native-pilot/private-beta-rc`, no tags,
wildcards, timers or custom rules. Source environment **26517047948** is untouched.
Reuse the successful inspection42682647490 for the installed controls; the future
uploader rereads setup controls and its actual run review. Never request token values.

Only these step-bound secrets are needed for this future packaging operation:

| Name in existing setup environment | Binding / authority |
| --- | --- |
| `NATIVE_ADMISSION_READ_TOKEN` | Existing one-repository metadata READ token; fixed GitHub GETs only. No publisher writes. |
| `UNFARMD_NATIVE_BUILD_ARCHIVE_KEY` | Future owner-generated 32-byte base64url key, retained independently by owner; seal step only. Archive custody, **not** source/signing authority. Never chat/log/commit it. No actual key installed here. |
| `UNFARMD_NATIVE_PREVIEW_DEPLOY_TOKEN` | Future short-lived owner-authorized Vercel credential for existing team/project; bound as `VERCEL_TOKEN` only in the one uploader step. No argv token or CLI auth import. Review actual resource/role scope: do not claim project-only restrictions when the platform only offers team scope; HOLD unless owner explicitly accepts the actual scope. |

Build/install steps receive none of these. No provider, database, auth issuer,
checkpoint or enrollment credential is bound. The Vercel Preview environment must
contain **no native runtime credential/setup/source bindings** for this operation;
owner verifies names/targets without exporting values. Do not pull environment files.
If existing unrelated Preview bindings could be consumed, HOLD for specific review;
do not remove/change them under this approval. Existing production-only credentials
are not permission to copy them. All source-OFF prerequisites are checked again
before accepting an owner approval.

Before approving the environment, owner verifies current team/project access is
owner-only, no protection exceptions for these routes, existing Vercel/Render/GitHub
deployment event effects and current production aliases. The automated GET gate
requires existing project/team/Git link/Node24, a documented Vercel Authentication
mode covering Preview, no project webhooks or applicable/global integration handlers,
and a complete alias listing. Unknown/paginated/denied metadata is HOLD, not empty.
An applicable integration is not uninstalled or reconfigured to make the test pass.
GitHub environment jobs create automatic GitHub deployment records; these are not
Vercel deployments or the publisher's explicit setup/source metadata. Account for
those records and any consuming GitHub Apps before starting. No protection bypass,
protection-setting change, paid service or alias operation is permitted.

Current connector result (Nov9, connection-default scope): project/domain GET404,
deployment-list GET403. This does **not** establish actual project/protection state.
Fresh genuine metadata using the future approved Vercel credential and owner-visible
event/access controls is a deployment prerequisite. No unsafe CLI/API substitution.

## Executable sequence after separate installation and deployment approval

**Not authorized now.** Review the patch from its exact draft head; installation is
an ordinary descendant/fast-forward of060, no main write or history rewrite. Retain
`git.deploymentEnabled["native-pilot/private-beta-rc"] = false` and the topic false
entry. Check event effects before pushing. Rerun exact-head CI on the actual release
commit. No auto Preview is requested. Never reuse an old approval/window.

1. Founder selects a current absolute UTC interval of at most30minutes, long enough
   for review/build/upload, and explicitly approves **one** workflow run and **one**
   Preview. On the existing registered workflow select branch
   `native-pilot/private-beta-rc`, mode `preview-output`, `approved_sha` = exact
   installed release head, deployment **empty**, `preview_starts_at` /
   `preview_expires_at` in `YYYY-MM-DDTHH:mm:ssZ`. No dispatch occurs under this packet.
   If the selected feature-ref inputs are unavailable, HOLD; do not edit main.
2. The context job displays the real run/SHA/window card. Founder independently
   verifies those values and the prerequisites above, then approves the pending
   **native-pilot-setup** job with the **exact generated** comment:
   `APPROVE_NATIVE_PREVIEW_ONCE <RUN_ID> <SHA> prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q <EXPIRY_EPOCH_MS>`.
   The comment approves build/upload only. It does not publish setup/source authority.
3. The protected job runs these reviewed commands, once:

   ```bash
   npm ci --ignore-scripts
   npm ci --prefix ops/native-beta-output/toolchain --ignore-scripts
   node ops/native-beta-output/step.mjs prepare "$RUNNER_TEMP/native-preview"
   bash ops/native-beta-output/build-isolated.sh build "$PWD" \
     "$PWD/ops/native-beta-output/toolchain" "$APPROVED_SHA" \
     "$RUNNER_TEMP/native-preview/output.private.json" \
     > "$RUNNER_TEMP/native-preview/receipt.json"
   node ops/native-beta-output/step.mjs seal "$RUNNER_TEMP/native-preview"
   ```

   OS egress isolation is mandatory; absence fails closed. No hosted SQL or source.
   Public dependency installation happens before that boundary. The first official
   Actions archive preserves only `build.aesgcm` and `receipt.json` for1day. No raw
   output/generated server keys are uploaded unencrypted. This is a trusted reviewed
   builder approval, **not** an owner signature over a hash that did not yet exist.
4. The uploader rereads actual run/approval/project/aliases/handlers, verifies the
   bundle/output/CLI/Git pins, and writes/fsyncs a `started_unconfirmed` attempt
   journal before exactly one invocation. Its only deployment command is:

   ```bash
   node ops/native-beta-output/toolchain/node_modules/vercel/dist/index.js \
     deploy --prebuilt --target preview --non-interactive --json \
     --scope team_x1JQRQhMe5Ic1VFpklZMPM2j --global-config "$EMPTY_CLI_CONFIG"
   ```

   `EMPTY_CLI_CONFIG` is a newly created empty private directory; `VERCEL_TOKEN` is
   supplied by the reviewed step binding. No `--prod`, `--skip-domain`, `--force`,
   `--yes`, environment override, metadata override, bypass or promotion command.
   Pinned CLI code creates one deployment; internal file upload can retry up to5
   times. Do not describe that as zero HTTP retries. There is no second CLI invocation.
   No automatic retry after timeout, missing ACK, policy failure or partial outcome.
5. On a genuine ACK, append its ID without erasing the uncertain entry. GET that
   exact deployment: project, READY, actual unique hostname, Preview target (`null`
   is the API's normal Preview representation), native Git SHA/ref/repository.
   Reject production/custom environments and branch aliases. Compare **every**
   preexisting project alias with the captured baseline, including all four known
   production names. A legitimate concurrent collector release is HOLD for owner
   reconciliation; never auto-restore a newer production mapping.
6. Three unauthenticated GETs, redirect-unfollowed and no cookies/bypass, must prove
   Vercel Authentication on `/lens`, `/api/native-pilot` and
   `/api/native-pilot/owner/status`. An application401/503 is not protection proof.
   The qualified final archive is `native-pilot-build-<actualDplID>` and includes the
   **same** encrypted bytes/receipt plus external binding/journal. Failure instead
   preserves a held archive; it cannot qualify for setup. Automatic Actions artifact
   transfers and environment records are expected; the publisher is unreachable.
7. `artifact.mjs` reads the actual final artifact ID/digest/run/head, compares the
   official upload digest and records the receipt in the run summary. Its archive
   ZIP SHA, ID, run and deployment binding remain outside the frozen build. Review
   artifact expiration and the exact admission workflow content hash as required
   by the original verifier. No setup/source publication is performed.
8. Founder logs into Vercel in their own browser, opens the **unique** `/lens`,
   pastes `owner-browser.js`, then calls `verifyNativePreview(binding)` with the
   public binding.json. It makes only3 same-origin GETs. Require lens200 HTML,
   native GET503`native_pilot_off`, owner status503`native_owner_unavailable`.
   The latter establishes that early real Vercel Git/project/deployment/origin
   checks passed **before** missing setup; it does not prove enrollment/DB/source.
   A403`native_request_denied` means hosted prebuilt identity is incompatible:
   HOLD, preserve evidence, no fake system values, fallback or automatic redeploy.
   Capture only categorical results/nonsecret IDs. No cookie export/reuse.

Independent offline verification after owner downloads the exact final archive:

```bash
# Owner downloads the existing Actions archive through their authenticated GitHub UI.
# Verify ZIP SHA256 against artifact.digest BEFORE extraction; never a later rebuild.
sha256sum native-pilot-build-EXACT_DPL.zip
# Extract encrypted build and public receipt into a NEW private directory.
# Owner tooling supplies the separately retained archive key to this process only.
node ops/native-beta-output/restore.mjs build.aesgcm receipt.json /tmp/NEW-native-output
```

The restore command verifies AES authentication, plaintext/inventory/file hashes,
safe paths/modes/links and function closures. It never uploads and refuses an
existing destination. A partial extraction is not reused. Losing the original
archive/key or allowing it to expire is HOLD, not permission to substitute a rebuild.

## One bounded future owner GO

> Approve one source-OFF Preview packaging/upload run of exact release SHA/tree
> ___ on `native-pilot/private-beta-rc`, workflow409607134, project
> `prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`, during UTC ___ through ___ (max30minutes).
> Approve the reviewed credential scopes, two encrypted Actions archives (1day),
> one CLI Preview upload and six read-only route checks (three unauthenticated,
> three in my Vercel browser). I verified no native Preview bindings, owner-only
> access and deployment-event effects. All preexisting production alias targets
> must remain unchanged. No setup/source grant, SQL, enrollment, checkpoint,
> provider call, production deployment, retry or promotion. Stop on any uncertainty.

No guaranteed$0 claim: existing Vercel/GitHub storage/function/bandwidth/runner
quotas may be consumed; owner checks existing-plan allowance first. No service,
plan or billing change is permitted. Retain/download the encrypted artifact before
1day expiry. Preview removal or token revocation needs a distinct owner cleanup
approval naming the actual ID; this packet never deletes anything automatically.
On alias/protection/unknown-ACK failure, preserve archive/journal/records, report
actual observations, stop and request a precise reconciliation decision.

## Original incident and remaining acceptance

Preserve run42293408658, original variable/approval and deployment7610758384.
Inspection42682647490 established canonical variable match and only the automatic
failed-job record observed; historical explicit POST attempts/root cause remain
**UNKNOWN**. No retry/cleanup here. Successful build/Preview is not a functioning
live beta: actual owner enrollment, native Neon durability/roles, independent
checkpoint and finite source authority remain separate held installation decisions.
