# Issue #114 — production dependency security gate

Review-only change from main `a45f50af65484122c181f6aeb64adf330f1cefde` (merged #112/#113). No application, API, evidence, archive, infrastructure, credential or activation code changes.

## Audit and resolution

Audit captured on 18 October 2026 against the npm advisory database:

| Command | Before | After clean `npm ci` |
| --- | --- | --- |
| `npm audit --omit=dev --json` | Exit 1; 1 critical + 2 high affected packages | Exit 0; zero findings at every severity |
| `npm audit --omit=dev` | Not separately captured; JSON above is baseline | Exit 0; `found 0 vulnerabilities` |

Raw [before JSON](audit-before.json), [after JSON](audit-after.json), [after text](audit-after.txt), [loaded native versions before](runtime-before.json) and [after](runtime-after.json) are retained. These JSON outputs contain no secrets/private paths and are unmodified. They describe installed dependency versions, not the deployed service. All **37 individual production advisories** have a [specific disposition](advisories.md); none is waived.

| Dependency | Before | Exact remediation | Reason |
| --- | --- | --- | --- |
| Next.js / eslint-config-next | 15.5.9 | 15.5.28 | Supported 15.x line, includes 15.5.24 AVIF/Windows RCE fixes and later 15.5.27 cache fixes; align lint tooling |
| sharp | Optional transitive 0.34.5 | Direct 0.35.5 | Next 15.5.28 explicitly supports `^0.34.3 \|\| ^0.35.5`; normal pin, **no sharp override** |
| PostCSS | Next's exact 8.4.31 | 8.5.23, override scoped to `next` | Next still declares 8.4.31; same-major fix for all four reported PostCSS advisories, including the missing-`from` follow-up |

The lockfile changes only these trees and their native/compiler packages. React, pg, collector and scheduler dependencies stay unchanged. Next’s actual CSS-loader resolution uses PostCSS 8.5.23; its actual image-optimizer resolution loads sharp 0.35.5 / libvips 8.18.7 / libheif 1.23.5 / librsvg 2.63.2. Tests exercise those loaded libraries rather than relying on optional lockfile entries. sharp requires **Node ≥20.9.0**; existing CI uses Node 20, local checks use Node 24.19.0. Review the eventual host's Node version/native packages before any activation. Do not substitute an older global libvips build.

The PostCSS follow-up advisory GHSA-fxqj-rqcc-2cmp is **moderate**. The package's **high** aggregate reflects other source-map file-read advisories. The report distinguishes these severities and preserves the original advisory ranges.

## Image and OG review

- No application `next/image`/`<Image>`/`<img>` usage, user image-upload handler, custom `next.config`, remote image allowlist or `dangerouslyAllowSVG` enabling was found. This does **not** make the framework's `/_next/image` route unreachable: actual local HTTP tests exercise it.
- Benign generated 8×8 AVIF and PNG inputs optimize successfully to WebP using patched native libraries. SVG and malformed image inputs return 400; an unapproved remote image URL is rejected before network access. WebP output alone does not prevent decoding AVIF input. Next's libheif safety guard refuses the old 1.20.2 and unknown versions; the loaded 1.23.5 passes.
- A benign inline SVG exercises patched librsvg directly. No exploit payloads, external SVG resources, or sensitive files are used.
- Consumer and terminal static OG routes produce actual decoded 1200×630 PNGs. Other brief/edition OG code uses fixed markup and validated labels. `/api/og` accepts one exact mint only; it reads bounded same-origin **JSON**, truncates printable ASCII labels, ignores image URLs and renders fixed markup with bundled fonts. It does not pass caller/provider AVIF/SVG bytes to sharp. Its source/renderer failures remain controlled 503/no-store responses. Existing real renderer tests use explicitly synthetic JSON, and additional production HTTP QA checks source failure and rejected extra image parameters. No OG code change is needed.
- PostCSS tests use only generated non-secret map files. They reject an absolute external map when `from` is absent and traversal outside a known CSS directory, while retaining legitimate adjacent map support. Negative control against the retained baseline 8.4.31 reads the synthetic sentinel; patched 8.5.23 withholds it. The actual CSS pipeline also passes production build and browser layout/accessibility checks.

## Verification and reproduction

Detailed command results and PostgreSQL/TLS/browser evidence are in [validation.log](validation.log). All checks are local; network requests to data providers are blocked in the browser/build processes. npm registry and GitHub access are only for dependency/advisory and review operations.

Passed: **910 regression/security tests** (the original 903 plus 7 focused dependency tests), **19 focused consumer tests**, and **81 Chromium browser cases** at 320/390/1280. The 910 include **44 real local PostgreSQL** and **10 real loopback TLS** cases, with zero skips. Clean install, typecheck, lint, production build, archive reproduction/append-only and archive dry-run all pass.

```sh
npm ci
npm audit --omit=dev --json
npm audit --omit=dev
npm test
bash tests/consumer-homepage/run-onchain.sh
npx tsc --noEmit
npm run lint
NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs" npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
npm ci --prefix experiments/consumer-mvp/web
bash tests/security114/run-browser.sh
```

`npm test` requires PostgreSQL 15+ installed locally (never a hosted database). On this workspace `SCOUT_TEST_PG_BIN` points to the local PostgreSQL 17.11 binary directory. The harness starts an ephemeral Unix-socket database, uses explicitly synthetic passwords/state, exercises the real SQL/functions and SCRAM authentication, restarts it and removes it; TLS tests use loopback self-signed fixtures. Nothing is silently skipped. Chromium is `/usr/bin/chromium`; set `CONSUMER_CHROMIUM_PATH` on another machine if needed.

The offline browser runner creates temporary benign image files under a uniquely named local public directory and removes them on exit. It writes screenshots to a disposable `/tmp` directory, preserving all existing checked-in UX proofs. Positive terminal/six-row tests use explicitly synthetic offline packets and **never take screenshots**. Consumer success harnesses remain visibly labeled synthetic and cannot pass the production acquisition gate. Physical iPhone/Safari/VoiceOver and deployed-site testing were not performed.

Genuine local production screenshots: consumer landing at [320](screenshots/consumer-landing-320.png), [390](screenshots/consumer-landing-390.png), [1280](screenshots/consumer-landing-1280.png); terminal with provider access deliberately blocked at [320](screenshots/terminal-offline-320.png), [390](screenshots/terminal-offline-390.png), [1280](screenshots/terminal-offline-1280.png). [Dimensions/hashes and capture limits](screenshots.json) distinguish these from the synthetic harness. These are security/regression proofs; no UI redesign or live market coverage is claimed.

## Residual risks and activation gates

**Production npm findings: zero. Full development audit: exit 1, 8 high + 1 moderate affected packages.** See the [exact full audit](audit-all-after.json) and [development risk dispositions](development-risks.md). These are unresolved tooling risks in Miniflare and lint glob dependencies, not accepted exceptions or production advisories. Miniflare's major migration would change the scheduler test runtime; audit's suggested Next lint downgrade is not a compatible blind fix. Keep tests/emulators isolated from untrusted inputs and production secrets pending a separately reviewed tooling remediation. npm also warns that the existing eslint 9.39.5 tooling line is unsupported; this patch does not change its major version.

A clean production npm audit is a dated database result, not a guarantee covering OS/runtime vulnerabilities, globally supplied native libraries, all vendored Next internals, hosting configuration, future advisories or deployed artifact behavior. The isolated browser harness has its own unchanged lockfile; its dependencies are not covered by the root production audit.

Both shipped gates remain byte-for-byte unchanged: `PRODUCTION_RPC_ENABLED=false`; `LIVE_APPROVAL.enabled=false`, `storeHost=null`, `vercelProjectId=null`. No Helius/Neon credentials were read/provisioned, no hosted services/billing changed, no live RPC/provider crawl was run, and no collection, deployment or treasury action was taken. This PR resolves the **production dependency prerequisite** for #111; it does not approve production activation. The [existing owner acquisition/activation contract](../../../lib/onchain-mint/server/PRODUCTION.md) still requires independent review, a separately provisioned SCOUT credential/approved database and host identity/quota controls, and separately authorized genuine production verification. Do not install credentials as part of reviewing this PR.

## Review and rollback

Human review is required for the dependency/lock changes (root AGENTS.md rule 10). Inspect the narrow PostCSS override, supported sharp range, native versions, individual advisory dispositions and development residuals before approval. No merge/deployment is authorized here.

Rollback is a reviewed revert of this feature commit with both RPC gates OFF and credentials absent. Re-run `npm ci`, full tests, audit, build and archive/browser checks. A revert restores known vulnerable dependencies; it is **not** a safe permanent security resolution or permission to install secrets. If a future hosted compatibility failure occurs, keep the affected service/RPC disabled until a patched compatible alternative passes review. This PR changes no persisted data/schema, so no migration or financial rollback is required.
