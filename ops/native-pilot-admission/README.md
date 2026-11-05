# Native-only owner-reviewed operational admission — DRAFT / HARD OFF

Base #288, `80d952c73bf4529fd04034c85985c16898ab17e8`. This is one integrated successor,
not a signer/analytics prototype. No credentials, signatures, hosted SQL, GitHub
approval/deployment metadata publication, provisioning, billing, deployment,
provider acquisition, merge or activation is performed here.

## Deliberate change in assurance

The NEW native lane uses `native-pilot-setup/1` and `native-pilot-source/1`, under
`owner-reviewed-control-plane/1`. It relies on an authenticated, explicitly
owner-reviewed GitHub publication tied to an immutable build artifact and actual
Vercel Preview identity. It does NOT have independent owner-private-key assurance.
Repository, GitHub Actions/environment, Vercel and admission-configuration
administrators who can replace reviewed code/configuration are in the trust
boundary. If the owner declines this tradeoff, do not enroll/enable this lane.

The existing global Ed25519 public key, `verifyNeonAdmission`, old physical
contracts/installers and EVERY legacy signed lane remain unchanged. No unsigned
record is accepted by that verifier, no conversion or fallback is implemented.
Native PostgreSQL instead requires its own opaque setup capability. Pure schema
validation and caller-injected GitHub transcripts produce CANDIDATES only,
never authority. Native caps are created only inside the fixed-host authenticated
read path; there is no exported test-capability constructor.

All shipped gates remain OFF: native setup/configuration=false, public approval plan/build=null,
original native source=false/build=null, C source=false, checkpoint service=false.
Missing evidence/configuration returns HARD-OFF before DB/provider credentials.
The ordinary real Better Auth owner session remains required before any source
reservation/key read. This code never enrolls a user, forges an owner cookie or
makes Vercel edge login equivalent to application enrollment. If owner access is
not established, keep the owner-acceptance evidence missing and remain OFF.

## One concrete publication protocol; no identity/redeployment loop

No operational workflow is installed by this draft. The runtime accepts ONLY the
fixed future `.github/workflows/native-pilot-admission.yml` workflow, whose actual
ID and protected environment IDs must first be verified and code-reviewed into
the public plan. This is not a workflow-dispatch authorization today.

1. Separately approve preparation and protected nonproduction deployment of an
   exact reviewed commit/tree/build artifact. Build identity is generated from
   the actual checkout before packaging, not by committing a self-referential
   SHA literal. Native source stays OFF. Observe real Vercel deployment ID/unique
   hostname, repository, branch and project. Never forge `VERCEL_*` or repeat the
   retired production/skip-domain deployment experiment.
2. Prepare canonical setup JSON using the pure `publicationPacket` helper. Bind
   code SHA/tree, exact immutable artifact ID/SHA256, actual Vercel deployment,
   exact Neon project/branch/direct host/database/PG18/tenant/timeline, CA hash,
   unchanged native installer/function hashes, physical-acceptance/recovery/
   independent-checkpoint identifiers and evidence hashes, real owner/auth schema
   and secret HASH, control-plane acceptance and finite setup validity<=24h.
   Policy is finite and prepared explicitly, but `sourceGo:false`. All current
   fixtures are SYNTHETIC; never install their tenant, owner, resource or evidence
   values. Current hosted values/acceptance have NOT been established.
3. Use TWO separate GitHub workflow runs/environments: `native-pilot-setup` and
   `native-pilot-source`. Each requires exactly the owner user58099771/fuzzysniper,
   no teams/other reviewers, admin bypass=false and one exact branch restriction.
   `prevent_self_review:false` is deliberate: the founder may start and separately
   approve a run. This is explicit owner confirmation, not dual-principal approval.
   The research runtime has only a dedicated READ-ONLY repository credential
   (Actions/Deployments/Contents/Variables metadata read), no review/publication/settings
   write scope. Actual token grants and owner-only access are an operational trust
   assumption requiring independent acceptance, not proved by an HTTP header.
4. Owner installs the canonical NONSECRET manifest in an authenticated repository
   configuration variable named UNFARMD_NATIVE_SETUP_<DEPLOYMENT_ID_UPPERCASE>
   (or SOURCE). It contains no credential values and must not be printed in public
   logs. The public deployment payload contains ONLY its hash, never the mint/
   owner/research scope. Variable storage is mutable, but accepted content is
   immutable under its reviewed hash; mutation fails closed. No Vercel env is
   changed. After inspecting the exact manifest/artifact/deployment, the owner enters
   the exact protected-environment review comment returned by the helper:
   `APPROVE_NATIVE_SETUP <manifestSHA256> <artifactSHA256> <VercelDeploymentID>`.
   A source review must instead say `APPROVE_NATIVE_SOURCE ...` for the distinct
   source body linked to that setup and exact policy. An issue comment, label,
   bot assertion, Git SHA or arbitrary environment toggle alone is insufficient.
5. Only the approved publisher job's GitHub token (deployments:write, contents/
   actions:read, no approval/admin write) publishes the helper's GitHub DEPLOYMENT
   METADATA body and then one SUCCESS status with its exact Actions run log URL. The owner alone creates the private configuration
   variable; the publisher job does not receive Variables-write permission.
   This metadata publication does NOT deploy Vercel. Payloads are immutable; one
   setup and one source publication per actual Vercel deployment. Duplicate,
   paginated, rejected, pending, inactive or ambiguous records HOLD. Publishing
   metadata does not alter the existing Vercel artifact/configuration or aliases.
6. Native runtime reads that metadata and its hash-bound authenticated configuration under the fixed repo/actual code SHA/task/
   environment, verifies its real successful workflow run, sole owner review,
   protection settings/branch, workflow content hash and exact immutable artifact
   digest/source SHA. It rejects mutable branch refs or changed deployments.
   Post-build setup/source publication is read at runtime, with NO Vercel env
   mutation/rebuild/redeployment to approve another identity. The owner sees and
   approves the actual already-created deployment. GitHub availability and real
   owner/mobile review acceptance remain UNPROVEN; do not assume the environments,
   workflow, permissions or publication records exist merely because tests pass.

Runtime validates authenticated GitHub API metadata; it cannot independently
recompute the uploaded ZIP from an unpacked Vercel runtime. The owner/publisher
control plane must establish that the reviewed artifact was the one deployed.
Actual mobile environment-review UX, review/bypass controls and this artifact
relationship require hosted source-OFF acceptance before any source GO.

## Gating and actual enforcement

Setup approval admits only native configuration/physical checking and a real
same-owner STOP path; it does not authorize provider inspection. Source approval
additionally binds the exact setup/policy, ONE exact mint, three fixed ordered
methods, <=3 attempts, exact method debit sum, retries0 and <=15min clocks. The
native factory requires the opaque source capability on every identity check;
source authority is rechecked/latches clock rollback and ages out within30s of
its authenticated read. No source grant is renewed by a cache, Clear or retry.
The separate setup-only STOP requires real owner authorization but no live source
approval, so source expiry cannot turn a STOP into acquisition permission. Missing
setup/owner/currentness gives HOLD/UNKNOWN, never a fabricated STOP acknowledgment.

`loadApprovedNativeConfiguration` is server-only and default-disabled. Its literal-false
`NATIVE_CONFIGURATION_ENABLED` resource branch also removes inactive native-pg
imports from the optimized OFF artifact. Next tracing retains inactive dependencies behind cross-module exported flags;
this literal resource branch is deliberate. A later reviewed setup build must
select it explicitly alongside setup admission; an environment variable cannot. It reads
only the new GitHub read token after compiled setup admission is enabled, then
requires genuine review evidence before reading native DB/owner/checkpoint
bindings. Native Helius key access stays LAZY until the unchanged durable
reservation + independent ACK + real owner recheck. Fields:

- `UNFARMD_NATIVE_GITHUB_READ_TOKEN`: dedicated read-only control-plane credential;
- `UNFARMD_NATIVE_PG_DSN`, `UNFARMD_NATIVE_PG_CA`: NEW native app login/direct host,
  CA hash and mandatory verify-full/SCRAM-PLUS;
- `UNFARMD_NATIVE_AUTH_READER_DSN`, `UNFARMD_NATIVE_AUTH_SECRET`: existing restricted
  real-owner reader and approved auth secret hash, no enrollment privilege;
- `UNFARMD_NATIVE_CHECKPOINT_KEY`: separate32-byte native MAC, no signer authority;
- `UNFARMD_NATIVE_HELIUS_KEY`: dedicated lazy provider key, never old-bot material.

No binding is installed or read with the current gates. C UI/analytics stay
unchanged; the future literal branch mapping/owner bootstrap/resource wiring
still needs operational review. This is not a claim of completed enrollment.

The native PostgreSQL adapter no longer calls the old signer verifier. It binds
its approved native setup hash into its EXISTING native-only durability tuple;
installer SHA2562ddbab84d1165686ad413dc2cb4886cb66231c4a7cc6f2ffd0f0881396180643
and all four SQL bodies stay exact. Existing signed native policies are NOT
silently converted: a mismatching stored durability tuple HOLDs. No old source,
canary, journal or CA budget is reused/reset. Every native transaction retains
actual TLS/SCRAM-PLUS + exact restricted role/function proof and additionally
checks primary/synchronous WAL shape, exact tenant/timeline/project/branch and
registered postmaster identities. A user-set fake Neon GUC/manifest hash is not
physical durability. Independent checkpoint currentness, COMMIT-before-ACK,
fences, spent/uncertain attempts/debits, no refund/retry and permanent STOP are
unchanged. Signature removal does not remove any physical/currentness check.

## Bounds, failure and revocation

GitHub reader is native HTTPS api.github.com/443, GET endpoint allowlist only,
CA/SNI/TLS1.2+, identity encoding, no redirects/retry,64KiB/128chunks per response,
1200ms request and4000ms total admission deadline. At most18 metadata reads for
setup+source; these are not Helius calls. API429/503/timeout, pagination, stale
approval, artifact change or missing review HOLDs before DB/provider access.
GitHub quota/private edge protection and actual latency must be accepted; the
existing consumer10s deadline is not silently extended. A30s in-flight admission
is not instantaneous GitHub-status revocation: use durable native STOP, which is
rechecked before sends. It cannot recall a request already in flight.

No setup/source policy or absolute live window is selected/enrolled here. Owner
preparation/installation approval, hosted source-OFF read/write acceptance and
one finite live-source GO remain distinct. Hosted acceptance must enumerate SQL/
checkpoint writes, independent current recovery custody, real owner/protection,
Neon shape and provider key/debit/retention. Never use an old snapshot or two old
matching copies to reconstruct current authority. Render proposal remains only
one service+1GB disk at published$7.25/month base, not provisioned/all-in priced.
No new signing service/paid subscription is needed for this approval design;
actual account/hosting and GitHub environment availability remain HOLD.

Rollback now: close this draft; all inputs preserved. A later authorized rollback
is permanent STOP then disable source/setup/publication selection; retain all
spent/uncertain/history/checkpoint state. No DB restore/reset/refund/reseed or
legacy trust rotation. If the owner declines this control-plane trust assumption,
leave this lane HARD-OFF; do not fall back to the unavailable original signer.

## Reproducible offline verification

Run `bash tests/native-admission/run.sh` for106 deterministic synthetic cases.
The generated-code harness enables only a disposable copy of the admission module,
with a mocked native HTTPS transcript/clock/identity; it exercises the real private
issuance path,18 exact metadata reads, setup-only STOP authority, source expiry,
rollback latching and rejection without exporting a test-cap constructor. It is
NOT genuine TLS, owner review, hosted identity or source acceptance. Committed
gates stay false/null. The original legacy verifier rejects the new native record.

`node --test tests/native-admission/scope.test.mjs` verifies the finite byte pins
and immutable288 input; `./node_modules/.bin/tsc --noEmit`, `npm run lint`,
`npm run build` and the unchanged optimized source-OFF/import guards remain
required. Six exact-head CI jobs additionally run full original regressions,
original immutable reviewers, archive checks, mobile320/390/1280 and the already
approved isolated local PostgreSQL18.6/TLS/SCRAM-PLUS/STOP/replay/restart/budget/
checkpoint suite plus actual SQL-backed A/B/C browser cases. No hosted database
is used. The additional actual-PG test rejects user-set fake Neon identity GUCs
before any reservation/debit; it does not pretend local PostgreSQL is Neon.
