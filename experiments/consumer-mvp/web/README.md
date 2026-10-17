# PROJECT CLEAR — consumer MVP, October 17–20, 2026

Issue [#88](https://github.com/fuzzysniper/scout-stonk-intel/issues/88). **Runnable, local, review only. No consumer deployment or launch is approved.** PROJECT CLEAR is a temporary working name, not a permanent brand or domain claim.

One flow: **paste an exact supported Solana mint → understand the token → inspect dated evidence → see risks and unknowns**. Three curated examples are starting points, not recommendations or a complete catalog. No wallet, trading, account, live provider, telemetry or paid service.

## Run independently

Node **20.19+ or 22.12+**, npm and this folder are sufficient. No root application install, environment file, keys or source API access:

```sh
cd experiments/consumer-mvp/web
npm ci
npm test
npm run build
npm run preview
```

The preview binds only to loopback port **4176**. `npm run dev` uses loopback port 4175. Open the printed local address on the same machine; there is no hosted/public consumer preview. A shared `?mint=<exact-supported-mint>` URL works on the same configured origin, including reload/back/forward. Sharing is not a hosting or publication mechanism.

`npm run test:browser` runs the **production build**, Chromium and axe at 320×740, 390×844 and 1280×900. It uses existing `/usr/bin/chromium` when present, an explicitly selected `CLEAR_CHROMIUM_PATH`, or an already-installed Playwright Chromium. This path is a public executable selector, not a credential. Install a browser separately if needed; tests do not provision services or deploy. PowerShell can run npm commands; Windows/Safari/physical-device execution was not performed here.

Build and test output stays inside this package's ignored `node_modules/.cache/`. ES-module TypeScript uses `.mts`, keeping UI/tool dependencies out of the production Next source glob. The copied backend `.ts` files have no external runtime dependencies. No root tsconfig, dependency, application, workflow or deployment setting is changed. Zero runtime npm dependencies; exact build/test dependency versions and integrity are locked locally.

## Evidence contract and current examples

The initial temporary frontend fixtures were **removed when Agent B delivered #89 / PR #90**. `src/adapter.mts` now imports the **actual readonly v1 engine**, not a simulated response or an API. The engine and contract are copied **unchanged** from commit `cf05f5df62cddf843c1ef4e8b8a0253f02274dea` into `vendor/evidence/`, making this folder runnable before #90 merges and independently extractable. `UPSTREAM.json` pins every file's SHA-256; regression tests enforce it. No B-owned path is edited. The upstream README and contract retain complete methodology and publication gates.

Coordination: [early interface request](https://github.com/fuzzysniper/scout-stonk-intel/issues/89#issuecomment-6238471165), [B's typed contract](https://github.com/fuzzysniper/scout-stonk-intel/issues/88#issuecomment-6238471873), [B's final handoff](https://github.com/fuzzysniper/scout-stonk-intel/issues/88#issuecomment-6238601456), [integration acknowledgment](https://github.com/fuzzysniper/scout-stonk-intel/issues/88#issuecomment-6238654448).

| Token | Supported exact base mint | Exact quote |
| --- | --- | --- |
| Super Inu / SI | `DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP` | NVDAX `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` |
| RuneScape Gold / GP | `HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ` | GLDX `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` |
| Grokification / GROK | `6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8` | SPCXX `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` |

The **different SI** mint `4SsapSJFx7ZqVb2C7z78wKD4nyySjFCBSuajnZdDsx97`, all quote mints, wrong case, surrounding whitespace, tickers and links are never aliases. An unknown syntactically valid address means **unsupported**, not nonexistent. The UI does not query a wallet, chain or provider to check it.

Evidence comes from genuine retained **14 October 2026** registry, exact-quote catalog and reward-setting receipts. These are **stale** on October 17. The engine evaluates its actual current clock; no old `asOf` is passed by the UI. Original capture and source-generation strings, including microseconds, are preserved. A device clock before the receipts yields unavailable evidence; correcting the clock and explicitly retrying can recover. The fixed preview clock in `tests/pinned-engine-preview.json` is an **upstream test fixture only**, never imported by runtime code; its simulated unsupported input is labeled separately from real captured records.

Supported means dated provider evidence exists. It does not mean independent chain verification, current eligibility, price tracking, redemption, endorsement, payout settlement or profitability. Two short authored sentences explain the base token and ownership. All original authored mechanism/ownership limitations remain in accessible Evidence. Visible default warnings retain stale/current-unknown status, unverified payouts/eligibility/returns, withheld financial figures, unverified publication rights and incomplete scope. The captured quote label does not establish company-share or gold ownership. Quote units and base ownership remain separate.

`src/model.mts` maps B's exact discriminated union into a conservative UI projection. It rejects quote/identity drift, unresolved fact citations, unsafe source links, live/current-value promotion, non-null financial quantities, rights promotion and verified-entitlement/settlement substitution. Withheld is never zero. No numeric market/reward figures, ROI, yields, ranks or projections are rendered, hidden in HTML or copied into URLs. Source links are user-operated; opening a mutable endpoint does not refresh the recorded evidence.

## Privacy, feedback and failure behavior

- No third-party assets/fonts, storage, cookies, analytics, wallet SDK, polling or runtime external requests. A mint is only held in memory; a **supported exact mint** is intentionally put in the URL for sharing. Unknown/invalid input is not written into a new URL. Incoming shared URLs necessarily belong to the user's browser/server history; no promise of universal URL secrecy is made.
- Copy link uses user-initiated clipboard **write**, never clipboard read. On denial it shows a labeled, selectable URL and truthful instructions. Back/forward/reload restore the same exact supported identity.
- Tester feedback is an unsent in-memory note with an honest **Copy feedback** action. Clipboard denial leaves a selectable note. Nothing is submitted to a service or persisted by the app. No deceptive submit/success button.
- Loading is announced while the local engine evaluates. Empty, ticker, malformed, unsupported and unavailable are distinct. Failure clears the prior answer; no anonymous/provider fallback, stale financial fallback or automatic retry.
- Production-like preview sends CSP, no-referrer and nosniff headers; evidence text uses DOM text nodes, not HTML interpolation. No query option can release financial figures, replace source identity or choose a historical evaluation clock.

Future analytics, **not implemented**: only after owner approval and explicit tester consent, consider per-session in-memory counts such as `opened`, `supported_answer`, `unsupported`, `evidence_opened`. Never collect raw mints/addresses, notes, clipboard, source URLs, fingerprints or balances. No network or persistent storage by default; any voluntary export must be explicit and reviewable. The current clipboard-only feedback is sufficient for Day 1.

## October 20 gates and extraction

Day 1 delivers the single working path, combined source contract, source-backed copy, screenshots and automated QA. Freeze breadth: additional tokens, discovery feeds, live adapters, financial quantities and account features are outside this MVP.

Before any founder-approved standalone preview/launch:

1. Run the [five-second / under-30-second human script](docs/QA.md). Automated tests and self-review are not real-user comprehension evidence. Test an actual small phone and keyboard/screen reader; Safari/iOS are untested.
2. Owner reviews retention, publication, attribution, commercial use and correction/takedown rights for the exact metadata, citations and screenshots. Rights remain **unverified**. Public API accessibility or a source hash is not permission. This PR authorizes no public/commercial rollout.
3. Approve the independent repository and final identity separately. Copy **this web folder only**, excluding `node_modules`, old build outputs and browser caches. Keep the vendor engine, its upstream attribution/pins, lockfile, tests and metadata-only fixtures. Do not copy restricted raw source packets, production application, workflows, scheduler or credentials. Re-run `npm ci`, tests, build and browser QA in that clean copy.
4. In that new repository, review a separate deployment plan and CI for this package. Existing repository CI only checks the existing app; this package's test/build/browser results are recorded here locally. The existing automatic Vercel integration, if triggered by the PR, builds the existing production app, **not this consumer experiment**. No consumer hosting/configuration was added or tested.

To update the shared engine, review a new upstream commit, replace its files byte-for-byte, update pins and rerun contract + combined browser tests. Never edit the vendored copy to weaken evidence/rights gates. A later direct workspace import can replace the snapshot only under review after integration/extraction paths are decided.

Rollback before launch: close the unmerged PR or remove `experiments/consumer-mvp/web/` through review. This is addition-only and has no production data migration or runtime dependency. Stop only local preview processes you started. No production rollback, credential operation, collector/scheduler change or financial history rewrite is needed. Future deployed rollback requires a separately approved plan; it is not authorized here.
