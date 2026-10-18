# Consumer V1.5: gated Helius answer, Agent A

Issue [#111](https://github.com/fuzzysniper/scout-stonk-intel/issues/111), Agent A consumer scope. Base: latest main `f79f66d0b72247826e54d2237fd97ecd16c581b7`, including merged #109 (`dd8642a`) and #110 (`f79f66d`). New feature branch; neither earlier PR was recreated or cherry-picked.

## Working consumer change

The consumer can now project the agreed additive `source.acquisition: "production_rpc"` profile only with the exact `mainnet.helius-rpc.com` host and all existing identity, precision, account-program, extension, finalized-slot, receipt-hash and original observation clock gates. It reads the fixed same-origin GET `/api/mint-facts?mint=<exact>`; it never calls Helius or selects a provider URL. The server's independent immutable activation gate is untouched and remains OFF.

A successful permitted response leads with **Onchain facts explained**, the reporting source, and **A mint identifies token units. It does not verify shares, gold backing or payout rights.** Supply remains exact token units, distinct from price or anyone's balance. Issuance/freezing controls, unreviewed Token-2022 extensions, finalized context slot, actual checked UTC, unverified project/value/holder payments and unavailable slot time remain visible. Native keyboard-accessible Evidence retains full decimal/raw supply, exact mint/program/authority addresses, extension assessment, source host/acquisition/method, clocks and digest. Search collapses only after accepted facts; exact links, copy fallback, search/cancel, focus and Back/Forward survive. Errors are not token legitimacy verdicts. Access denial now says **Check not permitted**, distinct from unavailable source or expired observation.

No production success is shipped as data. Before separate owner activation, the page remains unavailable for current facts. No current supply, reward, equity or payout fact is inferred from an address. The original three StonkFun examples and their 14 Oct 2026 stale dates, receipts, explicit financial withholding and unresolved rights remain separate. An accepted independent chain report moves those statements into the existing clearly dated disclosure; it cannot refresh or substantiate them.

## Coordinated contract and trust boundary

[B's initial proposal](https://github.com/fuzzysniper/scout-stonk-intel/issues/111#issuecomment-6253546954), [A's confirmation](https://github.com/fuzzysniper/scout-stonk-intel/issues/111#issuecomment-6253559130) and [B's final confirmation](https://github.com/fuzzysniper/scout-stonk-intel/issues/111#issuecomment-6253572918) agree on unchanged MintFactsV1 version/body/status mapping with the additive `production_rpc` acquisition discriminator. B owns the shared contract export, server profile/store/identity/credentials and actual API. A changes none of those files and keeps the type-only shared contract import. The runtime boundary checks unknown HTTP input so this frontend is forward-compatible with B's additive export; the baseline server cannot emit this profile. B's companion contract/server PR must be reviewed before any activation. Any incompatible version/status/clock change requires rechecking this integration, not weakening it.

Only a response from the trusted same-origin server is considered; the classification string or SHA-256 alone is not authentication, a provider signature, independent replay, project verification or legal permission. Synthetic, recorded, development, missing and unknown acquisition profiles are rejected in production. Even the production discriminator on the public Solana RPC host is rejected. Positive bodies on non-200 statuses are withheld. Strict exact-mint parsing and all time/data gates remain intact.

Original request/received/checked clocks and digest must survive server caching. B's stricter cache horizon is 30 seconds; the presentation horizon is at most 60 seconds after original checked time. Later evaluatedAt, navigation, copying or rerendering cannot reset that deadline. Expiry removes quantities and authorities without background fetching. Suspended tabs and backwards clocks are checked on focus/visibility. The existing six-second HTTP bound, 32KiB decoded body ceiling, cancellation/generation protection, redaction and manual-only retries remain. Tab-wide 429 cooldown supplements B's distributed admission and is not a security boundary by itself. No API origin/permission policy is relaxed for localhost or previews.

## Evidence and screenshots

On 18 Oct 2026, bounded GET attempts to the existing deployed homepage/exact mint, `/api/mint-facts?mint=<exact>` and `/terminal` failed at proxy CONNECT: **403 Forbidden**. The configured outbound policy excludes `scout.storkcoin.xyz`; no application HTTP status, disabled JSON/cache headers, live source or deployed iPhone behavior was observed. No bypass or RPC request followed. Local Next production QA is distinct from deployed QA.

Before captures were made from the unedited baseline Next production build and labeled offline harness. After captures use the actual built Next server on 4180 for native failures and preserved historical flow, and the isolated local-only harness on 4181 for all positive current facts. The harness uses actual consumer code and CSS; only Next Link is a local anchor shim. It is not a Next route, has no RPC/API transport, and cannot be selected by homepage query/env/browser globals. `/consumer/harness` remains 404 and production SSR/JS have no successful fixture values or harness entry. Every positive-path value, slot, clock and hash is **invented synthetic offline test data**, including envelopes exercising the production discriminator. The permanent **LOCAL SYNTHETIC/OFFLINE HARNESS · no RPC · not a deployed page** banner remains in those screenshots. Ordinary synthetic-acquisition tests additionally display the component's offline warning. No image is a live Helius observation.

| Browser capture | 320×740 | 390×844 | 1280×900 |
| --- | --- | --- | --- |
| Before: actual Next production, denied origin | [PNG](screenshots/before-production-denied-320.png) | [PNG](screenshots/before-production-denied-390.png) | [PNG](screenshots/before-production-denied-1280.png) |
| After: actual Next production, denied origin | [PNG](screenshots/production-disabled-320.png) | [PNG](screenshots/production-disabled-390.png) | [PNG](screenshots/production-disabled-1280.png) |
| Before: labeled synthetic success | [PNG](screenshots/before-synthetic-verified-320.png) | [PNG](screenshots/before-synthetic-verified-390.png) | [PNG](screenshots/before-synthetic-verified-1280.png) |
| After: labeled synthetic success | [PNG](screenshots/synthetic-verified-320.png) | [PNG](screenshots/synthetic-verified-390.png) | [PNG](screenshots/synthetic-verified-1280.png) |
| Offline replay of agreed production envelope | [PNG](screenshots/synthetic-production-profile-320.png) | [PNG](screenshots/synthetic-production-profile-390.png) | [PNG](screenshots/synthetic-production-profile-1280.png) |
| Offline replay: unreviewed Token-2022 | [PNG](screenshots/synthetic-production-extensions-320.png) | [PNG](screenshots/synthetic-production-extensions-390.png) | [PNG](screenshots/synthetic-production-extensions-1280.png) |
| Offline expiry, no facts | [PNG](screenshots/synthetic-expired-320.png) | [PNG](screenshots/synthetic-expired-390.png) | [PNG](screenshots/synthetic-expired-1280.png) |
| Offline disabled, no facts | [PNG](screenshots/synthetic-disabled-320.png) | [PNG](screenshots/synthetic-disabled-390.png) | [PNG](screenshots/synthetic-disabled-1280.png) |
| Offline denied, no facts | [PNG](screenshots/synthetic-denied-320.png) | [PNG](screenshots/synthetic-denied-390.png) | [PNG](screenshots/synthetic-denied-1280.png) |
| Offline interrupted request, no facts | [PNG](screenshots/synthetic-network-320.png) | [PNG](screenshots/synthetic-network-390.png) | [PNG](screenshots/synthetic-network-1280.png) |
| Separate stale provider layer, offline chain | [Full PNG](screenshots/synthetic-history-320.png) | [Full PNG](screenshots/synthetic-history-390.png) | [Full PNG](screenshots/synthetic-history-1280.png) |

Additional unchanged discovery/historical/source/search captures are included. Image hashes, actual dimensions and measured layouts are in validation.json. These are genuine browser PNGs without compositing, not physical iPhone photos. Non-overlap/overflow and first-viewport boundaries are measured, not claims that humans understood the page in 30 seconds.

## Reproduction and results

Use Node 20.20.2 / npm 11.9.0. Root packages and existing isolated Playwright/axe/Vite tools are unchanged. Leave 4180/4181 free. The browser config starts the actual Next production server plus offline harness. If the isolated browser dependencies are absent, use their unchanged lockfile: `npm ci --prefix experiments/consumer-mvp/web`.

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

All final commands exited 0: **849 root tests**, **19 scoped consumer unit/SSR/transport tests**, **69 browser cases** across 320/390/1280, typecheck, zero-warning lint, 12-page production build and both archive checks. `npm ci` installed 336 packages with the existing ESLint deprecation notice. Exact results and screenshot hashes are recorded in validation.json. With both offline labels, the ordinary synthetic answer’s verification boundary ends at 669.75px at 320×740; the production-profile offline replay ends at 606.75px. Neither has overlaps or horizontal scrolling. Coverage includes production-profile acceptance and all nonproduction-profile refusals; exact Helius host; u64/zero/255-decimal precision; mint/program/authority/extension/hash/slot/clock mutation refusal; cached original-time expiry; actual native Next access denial; disabled/denied/expired/offline failure replay; 429 cooldown without background requests; malformed/oversized responses, cancellation/deadline and stale-request suppression; source redaction; real no-JS SSR; exact URL/copy/history/search; all three dated source records and financial withholding; original terminal/research/data routes; and fixture absence from production SSR/bundles. Axe checks WCAG 2 A/AA, 2.1 AA and 2.2 AA in tested states. Browser errors and unexpected external traffic fail QA; only expected source-check HTTP resource errors are classified separately.

## Critical review and owner approval gates

The source and plain-English boundary are easier to find, while the quantity and receipt remain precise. Dense raw addresses and hashes remain in native Details. The supply number alone still cannot establish circulating supply or a balance; authority absence cannot establish all restrictions. Unreviewed Token-2022 controls remain an amber warning, not a safety badge. A response body cannot authenticate its own provider; trusted server configuration is essential. The strong keyboard focus outline is intentional. Small receipt text, real Safari browser chrome, VoiceOver announcements and text scaling need owner device verification. Chromium touch emulation does not prove Safari, physical iPhone or human comprehension.

No live-source success can be claimed by this PR. Remaining separate decisions/actions:

1. Human review of A and B PRs and shared contract; review B's immutable OFF gate, trusted hosting identity, durable store, fail-closed security, costs/terms and quotas. Do not enable a query/environment shortcut.
2. Owner confirms existing paid Helius account and a dedicated SCOUT key plus dedicated durable-store policy/credential, provider terms and financial limits. Provision directly in secure hosting settings only after approval; never share values in chat, screenshots or logs and never reuse/read the old bot key. No setup, spending, secret access or activation is performed here.
3. Explicit separate approval for **one actual getAccountInfo capture of one agreed exact mint**, bounded by B's reviewed transport/store policy. Preserve sanitized host, raw-byte digest, original clocks and finalized slot. Do not represent these offline envelopes as that proof.
4. Human-reviewed deployment/activation decision after genuine format/provenance inspection and rollback preparation. Then verify actual deployed SHA, canonical disabled behavior before activation and unrelated-origin refusal; cache/no-store/security headers and no secret/fixture in HTML/JS. This agent does not merge, deploy or activate.
5. Owner runs the [30-second iPhone protocol](IPHONE_ACCEPTANCE.md) on actual Safari, then disabled/denied/expiry/429/network/Token-2022 and dated-history separation, exact URL/clipboard/history and `/terminal`. Until completed, authentic-source, physical-device and comprehension outcomes are unverified.

Publication: this PR adds no source capture or financial dataset and changes no source-rights decision. Existing [StonkFun publication review](../consumer-homepage/PUBLICATION_REVIEW.md) remains unresolved; financial quantities remain withheld. Independent account facts do not grant StonkFun rights or substantiate equity/backing/reward statements. Helius/store terms, retention and permitted public/commercial response use require owner review with B before activation; this frontend profile is not permission to redistribute data.

Rollback: owner reverts only this PR's eventual merge/squash commit through normal review. Do not reset main, recreate earlier PRs or roll back data. No schema migration, service, secret or configuration change exists in A's scope. A consumer-only revert returns to withholding all successful production profiles; it does **not** switch off an independently activated backend or prevent costs. If activation has later occurred, owner must first use B's separately reviewed kill switch/rollback and verify no source I/O, then revert A if needed. No automatic deployment or activation is requested by this PR.
