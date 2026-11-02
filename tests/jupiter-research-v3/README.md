# Lens v3 research integration — CODE ONLY / SOURCE HARD-OFF

Owner authorization: [#280 comment6566804901](https://github.com/fuzzysniper/scout-stonk-intel/pull/280#issuecomment-6566804901).
Exact parent `e19a7ded18b0cd63b9e06c6b5efce35447719fa0`, tree `3ea4a7222dd038050e306752f5d15dad5eb3d697`. One dependent draft; nothing merged, deployed, enrolled or acquired. Working265 and every existing reviewed head remain unchanged.

## Review boundaries

The existing `/lens` receives `#jupiter-research=<base64url public envelope>`, immediately replaces the fragment, bounds decoded UTF8 to65536bytes and holds it only in component memory. Syntax/lifetime checks are **not** authentication: the notice explicitly says UNVERIFIED / HARD-OFF. Clear, pagehide/bfcache, background, clock rollback and absolute expiry discard carrier, private drafts and current view. No automatic status, reservation, source, retry, refresh, polling, storage, tracking, export or sharing.

A deliberate Inspect uses a separate `x-unfarmd-jupiter-research:3` marker and bounded closed JSON `{action:'inspect',mint,authorization:<v3 envelope object>}`. It never sends v3 through v1's header/decoder or v2's domain. The65536byte envelope plus wrapper has a65792byte wire limit; streaming is capped at256chunks/1second. Original exact Host/Origin/intent/protocol/mint/schema gates remain. The binder strips authorization and its marker, producing only the original <=256byte `{action:'inspect',mint}` source body. This framing is not source permission.

The runtime branch always returns503, including with a genuine-looking packet. Separate checked-in `JUPITER_RESEARCH_SOURCE_ENABLED=false` and `JUPITER_RESEARCH_PUBLIC_TRUST=null`; no authority or consumer MAC is installed/read. The public-only adapter reuses B's `verifyV3` and `researchBoundary`, snapshots public trust, rejects uncertain replies and withdraws on identity/expiry/clock drift after await. No signer, provider SDK, remote caller, database or credential loader is part of that graph. Dependency-injected authority/ledger behavior exists only in labeled tests; memory test counters are **not** durable quota or STOP evidence. B's real consumption component requires `operation:'reserve'` and `stopped:false` before returning a reservation result. Even a positive synthetic reservation has `activate:false,sourceCalls:false` and never invokes the producer.

The new branch's `/lens` does not offer owner/native/Save enrollment. Existing branches retain their original owner/native/Jupiter gates and STOP behavior. THE TAKE, WHAT BREAKS IT/red-first, conditional WHY, material GRAY, Test the Claim, all24 findings, original hashes/clocks/one-tap evidence and60second withdrawal use unchanged models/components. Powered by Jupiter / Jupiter Tokens V2 · provider-reported labels apply to Jupiter market material, distinguish fixtures/source OFF and explicitly do not resolve rights or certify native/holder facts.

## Immutable identity: implemented, not hosted-attested

`next.config.mjs` derives full commit/tree from the actual clean Git checkout at build and injects that public proof only into server compilation. Dirty/untracked checkout or missing Git metadata yields null. The platform getter separately requires native Vercel preview/project/provider/repository/ref/full commit/deployment/immutable HTTPS hostname and compares commit to the build proof. No request/body/header/tree environment pin supplies observed identity. Mutable `-git-` aliases and old release packets fail closed. The same getter is required before and after any future consumption boundary.

This does **not** attest READY, effective edge access, rights, owner enrollment or public-key provenance. Git deployments for this branch are suppressed in `vercel.json` without changing other branches/settings. Consequently there is **no new hosted deployment identity/URL or acceptance**. A platform build without trustworthy commit-bound Git metadata must remain HOLD; do not replace it with a self-approved manifest, configured target or service MAC. Future reviewed deployment and actual Ready/platform metadata verification are separate gates.

## Reproduce offline

Use Node24.19.0 and unchanged lockfiles. Public package install only:

```sh
npm ci --ignore-scripts
npm ci --prefix experiments/consumer-mvp/web --ignore-scripts
npm ci --prefix experiments/jupiter-beta-approval/integration --ignore-scripts
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/jupiter-research-v3/run.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/jupiter-research-v3/replay.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/jupiter-research-v3/original-build.sh
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
git restore -- next-env.d.ts
node tests/jupiter-research-v3/artifact.mjs
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/jupiter-research-v3/mobile.sh
node --test tests/jupiter-research-v3/scope.test.mjs
```

CI runs the NEW exact PR head, five jobs, read-only token, no deployment step/secret/environment access. Scope tests pin exact paths/modes/patches/full tree, preserve all other bytes and include positive/negative mutations. Prior reviewers run unchanged on their original immutable inputs; original optimized v3-absence guards run on exact280. Combined-head tests independently exercise public crypto, finite1–4mint scopes/per-mint/total limits, forgery, v1/v2/v3 isolation, wrong identity/rights/expiry, STOP/revocation/UNKNOWN, source-OFF and no heavy imports/credential reads. New optimized browser cases and original current-head TAKE/claim/native/OFF suites cover320/390/1280, keyboard, axe,200%, evidence, Clear and withdrawal. Screenshots are CI artifacts labeled LOCAL/SYNTHETIC, not real data or physical Safari.

B's accepted [actual isolated PostgreSQL18/TLS/PLUS/STOP run41363566150](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/41363566150) is **ancestor evidence**. C changes no B SQL, driver, anchor, signer, STOP, authority or contract bytes; no new native/hosted SQL or PG run is claimed here. New code never stores a reservation.

## Remaining operational HOLDs — separate approvals

1. **Trust/custody/enrollment:** genuine source-specific rights and newly approved beta public-key provenance; actual supported iPhone/Turnkey enrollment, two distinct non-root DAILY approvers, policy and real receipt/UV compatibility. No existing global key migration/import. B's helper remains unmounted; no credentials, signatures or enrollment created here.
2. **Durable authority:** approved Neon native TLS/PLUS/role/clock/STOP installation, current independent anchor custody/continuity/restore plan and least-privilege consumption MAC. Never treat local memory as authority, reset counters/history, refund uncertain requests or replace STOP UNKNOWN with ACK. Render/Turnkey/Neon setup, billing and hosted SQL remain unapproved.
3. **Rights/edge:** recorded applicable Jupiter Tokens V2 internal interpretive display/receipt/attribution decision; actual effective founder-only protection across project/deployment exceptions, share links, automation and access groups. Metadata flags and forged cookies cannot attest owner identity. No provider outreach or hosted negative test performed.
4. **Deployment/signature:** separately reviewed code/operational approval for a protected non-production deployment with independently verified exact final repo/ref/SHA/tree/project/Ready ID/immutable Origin. Verify build metadata availability. Then genuine dual-authorized v3 public envelope within<=10min, same exact identity, evidence and finite budget. v3 is never an old global-root release.
5. **Finite source session:** separate explicit GO for exact1–4mints, per-mint/total budget, zero retries, late-withdrawal/STOP handling. This does not expand the old live one-USDC approval. No new provider/source fallback, public/native/holder/Save access, main merge or production GO.

Missing evidence means HOLD/GRAY with no remote action. Approval of this code is not approval to clear any gate above.

## Rollback / rejection

Current rollback: close this dependent draft and retain280/earlier heads and working265. No hosted rollback is necessary because nothing is deployed. Original reviewers and all record/collector/STOP history remain intact. A future admitted operation must use the independently reviewed permanent STOP path; uncertainty stays UNKNOWN, no replay/retry/refund/reset. Changing the branch, commit, tree or deployment invalidates old signed identity and requires new approval; an old public packet never carries over.
