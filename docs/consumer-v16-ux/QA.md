# Consumer V1.6 launch polish — Agent A

North Star: **Discover → Understand → Verify**. Founder-authorized consumer scope, continuing [#111](https://github.com/fuzzysniper/scout-stonk-intel/issues/111). Started from latest main `c18e1f1ffe20db7d0c0324c86548255814157a15`, preserving merged #112, inactive backend #113 and dependency security patch #115. No earlier PR recreated, cherry-picked or reverted.

## Three improvements, chosen from the V1.5 audit

| Observed friction in the merged flow | Shipped change | Evidence/safety boundary |
| --- | --- | --- |
| Pasting requires finding the native long-press menu, and mobile keyboard behavior is unclear. | A 44px **Paste** button inside the address field, 16px input, autocorrect off and Go key hint. On denial/missing API, focus the field with native-paste instructions. | Clipboard reads only on the explicit button gesture. No automatic lookup, logging, trimming, alias/URL extraction or truncation. Empty/overlong text leaves the draft intact. Typing, history, search/cancel and example selection invalidate delayed clipboard reads. |
| “Onchain facts explained,” “New token issuance” and an ISO clock require technical knowledge before the meaning is apparent. | **A Solana token**, plain-English control questions and readable UTC checked time. Exact supply, base authority states, unreviewed Token-2022 warning, Helius report and finalized slot remain explicit. | “Standard control absent” never becomes a promise that more tokens are impossible or transfers unrestricted. Extra controls remain unreviewed. Token units do not verify shares, gold backing or payout rights. |
| Evidence is a long technical list; retry timing and same-address recovery are unclear. | First disclosure shows exact address, source host, original checked UTC, finalized slot and Explorer link; nested **Technical receipt & controls** retains the full receipt. Escape closes one level and restores focus. Cooldown shows seconds remaining; same-address explicit submission and compact historical error retry work. Result status is announced politely. | No background retries. Original 60-second expiry, tab-wide 429 cooldown and all source gates are unchanged. A new attempt requires user intent; stale facts disappear rather than being relabeled current. An activated backend is not presumed. |

The design keeps the existing neutral paper/blue palette and generous focus/touch targets, with friendly task copy. No new brand, mascot, chart, rank, trading prompt, telemetry, permission polling, automatic clipboard read or infrastructure dependency.

## Preserved contract and file ownership

Agent A coordinated unchanged GET `/api/mint-facts?mint=<exact>` / MintFactsV1 behavior in [this handoff](https://github.com/fuzzysniper/scout-stonk-intel/issues/111#issuecomment-6258548266). The shared `production_rpc` discriminator is already merged; production projection still requires exact `mainnet.helius-rpc.com`, matching exact mint, supported initialized program, exact u64/decimal arithmetic, consistent authorities/extensions, finalized context slot, response digest and valid original capture clocks. Synthetic/development/recorded/missing/unknown acquisition, malformed/mismatched/expired data and positive bodies on failed HTTP statuses remain withheld.

**`app/consumer/onchain-model.ts` and `onchain-client.ts` are unchanged.** All backend/shared contracts, API routes, database configuration/migrations, Neon/Helius integration, credentials, deployment settings, workflows, collector, Cloudflare and treasury are unchanged. Agent B owns those independently. The merged route is inactive; this UI does not infer activation or configuration from provisioning progress and cannot enable RPC. No live Helius or Neon call, key access, deployment or activation occurred.

Source time is still original `checkedAt`, not render/evaluation/cache-serving time. The readable UTC label does not change the original ISO `datetime` or receipt fields. Finalized slot is a snapshot boundary, not last modification time; slot time remains unavailable. The existing six-second client bound, 32KiB response ceiling, no-store/credentials-omit/redirect refusal, request cancellation, source redaction and manual-only backoff are preserved.

The first-screen positive facts remain an RPC report, not independent replay, project identity, equity/backing, price, personal balance or payment verification. The original three exact-mint StonkFun examples and 14 Oct 2026 stale dates/receipts remain separate; existing financial withholding and metadata/retention/publication warnings remain unchanged. No source permissions or economic claims were extended.

## Real browser captures

Before PNGs were captured from unedited main's actual Next production build and the existing labeled offline harness. After PNGs use the actual new Next production build for discovery/native API failure/historical routes, and the isolated loopback-only harness for all positive current facts. All positive supply/control/slot/hash/time values are **invented synthetic/offline fixtures**, including envelopes exercising `production_rpc`. Their permanent visible harness warning is part of each capture. They are not authentic Helius observations. No compositing or physical-device photography.

| View | 320×740 | 390×844 | 1280×900 |
| --- | --- | --- | --- |
| Before: actual production-build discovery | [PNG](screenshots/before-landing-320.png) | [PNG](screenshots/before-landing-390.png) | [PNG](screenshots/before-landing-1280.png) |
| After: actual production-build discovery | [PNG](screenshots/after-landing-320.png) | [PNG](screenshots/after-landing-390.png) | [PNG](screenshots/after-landing-1280.png) |
| After: explicit paste, before checking | [PNG](screenshots/after-paste-320.png) | [PNG](screenshots/after-paste-390.png) | [PNG](screenshots/after-paste-1280.png) |
| After: denied clipboard / native-paste help | [PNG](screenshots/after-native-paste-help-320.png) | [PNG](screenshots/after-native-paste-help-390.png) | [PNG](screenshots/after-native-paste-help-1280.png) |
| Before: labeled offline answer | [PNG](screenshots/before-synthetic-answer-320.png) | [PNG](screenshots/before-synthetic-answer-390.png) | [PNG](screenshots/before-synthetic-answer-1280.png) |
| After: labeled offline production-profile replay | [PNG](screenshots/synthetic-production-profile-320.png) | [PNG](screenshots/synthetic-production-profile-390.png) | [PNG](screenshots/synthetic-production-profile-1280.png) |
| After: offline unreviewed Token-2022 | [PNG](screenshots/synthetic-production-extensions-320.png) | [PNG](screenshots/synthetic-production-extensions-390.png) | [PNG](screenshots/synthetic-production-extensions-1280.png) |
| After: source/address before technical receipt, offline | [Full PNG](screenshots/after-chain-evidence-320.png) | [Full PNG](screenshots/after-chain-evidence-390.png) | [Full PNG](screenshots/after-chain-evidence-1280.png) |
| Actual production-build origin refusal, no facts | [PNG](screenshots/production-disabled-320.png) | [PNG](screenshots/production-disabled-390.png) | [PNG](screenshots/production-disabled-1280.png) |

Additional captures cover original provider evidence, search, disabled/denied/offline responses, expiry and separate dated history. Dimensions, hashes, exact command results and first-viewport measurements are recorded in [validation.json](validation.json). “Production build” means local `next build`/`next start`, not independent verification of a deployed site. The filename `production-disabled` covers the actual localhost origin refusal; it does not assert canonical deployed 503 behavior.

## Reproducible verification

Node 20.20.2 / npm 11.9.0 / Next 15.5.28 / system Chromium 154.0.8037.57. Root lockfile and isolated Playwright/axe/Vite tooling are unchanged. Leave 4180/4181 free; the browser config starts Next production and the local-only harness. If absent, restore browser dependencies with their existing lockfile: `npm ci --prefix experiments/consumer-mvp/web`.

```
npm ci
npm test
bash tests/consumer-homepage/run-onchain.sh
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs
```

Final results: every required command exited **0**. **910 root tests**, **19 scoped consumer unit/SSR/transport tests**, **87 browser cases** at 320/390/1280; typecheck, zero-warning lint, 12-page production build and both archive checks passed. Tested axe violations, unexpected browser errors and external browser requests: **0**. `npm ci` installed 352 packages with the existing ESLint deprecation warning. All 63 PNG hashes/dimensions and layout measurements are in validation.json.

The backend's existing real PostgreSQL test harness requires local PostgreSQL 15+ binaries. This environment initially had none, so the first npm test stopped at 44 engine setup failures; no tests were skipped. PostgreSQL 17.11 Debian packages were downloaded using signed Debian repository metadata and extracted into `/tmp/scout-v16-pg`, with no system service/package installation. Final npm test uses `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin`; the existing harness creates/disposes local Unix-socket databases with synthetic data and test-only passwords, never a hosted Neon URL or production credential. On a machine with PostgreSQL in the documented normal paths, no override is needed. No backend test/migration/config file was changed.

The first browser pass was 81/87: the two new failing assertions matched hidden duplicate receipt timestamps and expected an exact clock instant while the emulated clock was advancing. Those tests now scope the basic receipt explicitly and bound the fictional capture time to the user retry’s before/after clock values. An intermediate attempt to pause time also stalled axe’s own timers; the final test leaves those timers running. No source gate, failure assertion or UI behavior was relaxed. The final matrix reruns every test from one consistent source revision. Initial browser startup also found a baseline QA server still using 4180; only the two test servers started by this task were stopped before the matrix.

Coverage includes all previous contract/precision/source/failure cases plus actual Chromium clipboard permissions, denied/unsupported clipboard API, no implicit submit, overlong/whitespace rejection, delayed clipboard cancellation, input font/keyboard attributes, same-address resubmission after 429, countdown with no automatic requests, nested disclosure/Explorer/one-level Escape, live-region status, and historical expiry followed by an explicitly requested new **fictional offline** capture. Test transport alone creates that fictional capture time; the application never renews it. Existing exact URL/copy/history/search, all three source records, financial withholding, native route/no-JS/bundle isolation, original terminal/research/API routes, axe and first-viewport/non-overlap checks remain.

## Critical self-review and launch limits

A familiar sentence and control questions now precede the technical receipt. Supply stays unrounded, the source and snapshot remain on screen, and absent standard controls do not become safety promises. Added questions can wrap on 320px, so first-viewport and overlap assertions remain required. The input scrolls its long address natively; the full exact mint remains selectable in Evidence. Clipboard permission prompts are browser-controlled and may not work on iPhone; fallback text and normal typing/native paste remain essential. Nested technical disclosure adds a second action for specialists while keeping address/source verification one action away.

Small receipt text, Safari toolbar/keyboard behavior, text scaling, native paste permissions, VoiceOver and real comprehension remain **unverified on a physical device**. Chromium mobile/touch emulation and zero tested axe violations do not certify iPhone Safari or understanding within 30 seconds. Use the explicit [physical iPhone acceptance checklist](IPHONE_ACCEPTANCE.md) for the first separately authorized genuine Helius observation. No genuine capture, human test or activation result is claimed here.

Unresolved StonkFun metadata/retention/publication rights remain governed by the existing [publication review](../consumer-homepage/PUBLICATION_REVIEW.md); financial quantities stay withheld. This change adds no source capture or financial dataset and grants no provider redistribution permission. Agent B/owner must separately confirm source/store terms, approved hosting/store/identity/quotas, credentials and the explicit one-capture/activation budget. Do not assume the Neon project is deployed or active. Review-only PR; no merge or manual deployment.

Rollback: human-reviewed revert of only this PR's eventual merge/squash commit. Preserve all merged backend/security/data work; do not reset main or datasets. No service, schema, credential or configuration was changed by A. If backend RPC has separately been activated later, reverting UI does not stop server I/O or costs: owner must first use B's approved kill switch/rollback and confirm no source I/O. Repeat homepage/terminal and exact-link smoke against the resulting reviewed deployment. This agent does not merge, deploy or activate.
