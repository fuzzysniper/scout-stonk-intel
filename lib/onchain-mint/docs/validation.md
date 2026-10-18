# Validation and review — Issue #102

Base: latest main `c6ab86d5acf2f3f74f40a6c7ae159dac96573dcb` (including merged #100/#101). Main was fetched again during final validation and remained at that commit. Branch: `feat/102-onchain-mint-facts`. Date: 2026-10-18 UTC.

## Offline/security coverage

`bash lib/onchain-mint/test.sh` compiles the package separately with **no Node types or runtime dependencies** and executes 68 deterministic tests (37 decoder, 31 reader). Positive data is conspicuously synthetic; these are parser/security proofs, not captured current token observations.

Covered cases:

- Original SPL and Token-2022 owner/parser labels; initialized mint versus token account/multisig, missing account, executable, wrong owner/space, unparsed base64 fallback.
- Full u64 raw supply, genuine zero, decimals 0/255, exact decimal text; numeric/negative/fractional/overflow supply, malformed authorities, null versus missing. Original integer lexemes reject fractions that JS would round to integers. Actual u64-max **encoding** of an irrelevant synthetic rent epoch is handled without projection.
- Base Token-2022, exact MetadataPointer layout, larger accounts with empty/omitted extension output, duplicate/malformed/unknown/risk-bearing extensions and both interpretation overrides. Arbitrary metadata names/URLs/mints never become identity or fetch instructions.
- Exact 32-byte base58 without trim/case/ticker resolution; URL, query, array and object injection rejected before I/O. One fixed HTTPS POST/method/input, finalized request, JSON-RPC ID/version and owner integrity. Unexpected commitment/epoch/mint fields, unsafe/regressing slots, duplicate escaped JSON keys, depth/body limits and malformed envelopes fail closed.
- Production, unset/test environment, browser and default-off profiles: zero I/O. Three-attempt shared process budget **through the real public factory with native Fetch replaced by a mock**; no enabled test reaches the network. Existing dev reader becomes disabled if environment changes to production. Ten-second spacing, concurrent requests, TTL/source-clock preservation, budget exhaustion, cache expiry and error cache invalidation.
- 401/403/429/503/other rejection, network exception and upstream body redaction, circuit stop without retries; timeout with transport ignoring abort, hanging stream and hanging hash; stream cancellation/byte bound, headers/content length, content type, invalid UTF-8, redirects/changed response host, HTTP Date/Age, future/stale/invalid UTC and wall/monotonic divergence.

Manual source/security review found no production imports, route, consumer integration, secrets, dependencies, raw body/error logging, metadata requests, transactions, signature submission, wallet or unrelated source-rights changes. The only existing-file change is one focused suite invocation in `tests/run.sh`. Source/transport facts and the single failed development attempt are documented in [README](../README.md) and [development-feasibility.json](development-feasibility.json).

## Required repository checks

All final checks passed on 2026-10-18 UTC:

| Check | Result |
| --- | --- |
| Clean install | `npm ci` passed, lockfile/dependencies unchanged. |
| Full test run | `npm test` passed: 501 existing app/OG/archive/workflow/staging tests, 84 existing offline evidence tests, 68 new mint tests, 106 Python tests and 18 scheduler tests; zero failures. |
| Portable engine | Standalone compile and 37 decoder + 31 reader tests passed. |
| Typecheck | `npx tsc --noEmit` passed, also repeated after restoring generated Next reference. |
| Lint | `npm run lint` passed. |
| Production build | `npm run build` passed; existing edge-runtime static-generation notice only. |
| Archive integrity | `bash scripts/archive-tool.sh check origin/main` passed append-only/reproduction checks. |
| Archive rehearsal | `npm run archive:dry-run` passed; disposable checkout cleaned up and working archive unchanged. |
| Diff/scope | `git diff --check` passed; no imports from app, existing provider evidence, scheduler, scripts or workflows. |

Commands:

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
bash lib/onchain-mint/test.sh
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
git diff --check
```

`npm test` includes the existing consumer/app/OG/reward/archive/workflow/staging tests, old offline provider evidence tests, Python collection/security tests and local scheduler/Miniflare tests. No staging deployment, dispatch or live provider/RPC request is part of this verification. Archive dry-run uses a disposable local checkout and leaves retained data unchanged. Next's generated `next-env.d.ts` reference is restored after build; it is excluded from the change.

No UI files changed, so no new browser screenshots are claimed. Agent A #103/#104 owns browser QA of its unavailable fallback; successful onchain browser replay remains blocked on an authentic separately authorized capture and approved integration.

## Coordination and material limits

- Early typed contract: [#103 comment](https://github.com/fuzzysniper/scout-stonk-intel/issues/103#issuecomment-6251448387).
- Acquisition discriminator and stopped feasibility: [#103 follow-up](https://github.com/fuzzysniper/scout-stonk-intel/issues/103#issuecomment-6251588817).
- Cross-linked handoff on [#102](https://github.com/fuzzysniper/scout-stonk-intel/issues/102#issuecomment-6251630842). No HTTP route or status mapping is implemented/agreed.

Exactly one development mainnet RPC attempt failed at the network boundary, after which the session stopped. **No genuine current token facts or authentic successful response fixture were acquired.** No provider crawl or additional RPC method was used. Successful fixtures must never be relabeled live.

Security/schema review is required before merge under `AGENTS.md`; this PR is prepared for human review only. Production activation remains a separate approval/code change requiring a suitable RPC service, terms/quota/cost review, distributed hosting admission, trusted clocks, real-response validation and actual browser QA. Per-process limits cannot enforce a cross-restart/replica owner budget. JSON-parsed RPC output is not independent binary or consensus verification, and acquisition freshness cannot prove absolute chain-tip freshness. Unsupported extensions, metadata/project legitimacy, quote relationships, rewards/holder ROI and underlying-share ownership remain unverified.

Rollback: revert the isolated `lib/onchain-mint/` addition and one `tests/run.sh` line. Nothing is merged, deployed or activated; production consumer support remains exactly three dated examples.
