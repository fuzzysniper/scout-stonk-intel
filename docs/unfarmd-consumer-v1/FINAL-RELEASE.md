# Final UNFARMD frontend release checklist

**Scope:** consumer release readiness, not source activation or deployment. Exact final PR head, GitHub CI run and automatic Vercel status are recorded on [draft PR #137](https://github.com/fuzzysniper/scout-stonk-intel/pull/137). No independent merge/deployment approval is implied.

## Integrated baseline and ownership

- Starting draft head: `6b6580da24d0a0ff65d304d880db394d56e1c32f`, refreshed against GitHub before editing; no concurrent commit at that check.
- Main: `0592a608b4693544e0534c85e404aa0782ac7469`. A normal merge, `2ecf8417a698b351317ea5b5064a95812cb44804`, preserves the feature history and approved artwork/copy. No force push or cherry-pick.
- Main carries merged #138 and collector commits `22c8539`, `98bef0e`, `0592a60`. Their backend/DSN preflight, admission, workflows, scheduler and data are inherited **without agent edits**. Protected subtrees match main exactly. Agent B's #140 is untouched.
- Collector blobs retained from main: `data/reward-snapshots.json` → `04972bc74f5fe33d2b74fd34a17319976096e6a5`; `data/collector-audit.json` → `1d69efb83f77e3e7a25114f69e4de337254b5dbb`; `data/collection-summary.json` → `421c72cd59cc3523823b7002b7de113d7b6625cb`.
- Follow-up edits are limited to consumer regression coverage and this release documentation. No new runtime feature, scanner, receipt system, UI redesign, source contract or configuration change. No additional runtime frontend defect was reproduced.

## Acceptance evidence

Run the real optimized Next.js application at **320×740, 390×844 and 1280×900**. The existing consumer suite covers landing, clipboard/native fallback, exact-mint validation (no trimming, ticker inference or URL extraction), SCOUT IT, loading, actual local denial, recovery, keyboard/focus, sharing/history, dated receipts, original clocks, expiry and rejected responses. Every successful-path fixture is explicitly synthetic offline evidence, not an authentic Helius observation.

The release quota test requires **zero mint/API acquisition** before SCOUT IT: shared URL, paste/edit, homepage, research hover, refresh and dated examples are passive. Back **and Forward**, reload, focus and visibility changes add no requests. The additional real Next.js route-cache test submits once using labeled offline evidence, leaves via the CARDS research Link, returns and refreshes: still only the one deliberate mint request. Unrelated research requests are intercepted/aborted in that test; no public provider crawl. Expiry/cooldowns change display only; manual retries require deliberate action. Market checking is a separate explicit action. Server admission remains authoritative; this UI guard does not replace it.

Actual local optimized handler response is **403 / access_denied**, `facts:null`, `source:null`: unapproved localhost origin fails closed. Canonical-origin **503 / disabled** is covered offline; it is not claimed as actual local HTTP. No hosting-header spoof, protected-URL bypass, proof POST, hosted DSN preflight invocation, hosted SQL, Helius request or source activation. The inherited lookup approval remains **disabled**.

### Future authentic response compatibility

The unchanged production client calls only same-origin `GET /api/mint-facts?mint=<exact mint>` after SCOUT IT, with omitted credentials, no-store and redirect rejection. It accepts MintFactsV1 only through the unchanged identity/program/quantity/provenance/freshness validator. Main's disabled preflight integration does not extend that wire contract.

Prominently labeled offline production-shaped responses prove rendering of exact u64 supply and decimals, original mint, standard mint/freeze authority interpretation, Token Program versus Token-2022 limits, original finalized slot, original checked/request/response/evaluated clocks, source host/acquisition and response hash. Concerns require accepted facts; expiry removes facts and derived concerns without reacquiring. Holder concentration, LP control, profitability and other unsupported properties stay unknown. The separate three **14 Oct 2026 / stale** StonkFun examples keep rights-based financial withholding and do not inherit current timestamps. An authentic approved response requires **no consumer client-contract changes**; genuine connectivity, source acceptance and production public-GET authorization remain independent, unproved here.

### Artwork

The selected desktop/mobile hero, avatar and below-fold story remain byte-identical to supplied derivatives. Originals, unused alternatives, manifest and hashes are preserved. Existing dimensions, slow/missing hero/story tests, CTA hit-testing, focus and axe checks are rerun with the updated build. No replacement art or cosmetic adjustment was justified. See [current artwork/gallery/provenance](artwork/README.md). All captions retain **rights review pending**. Founder selection is not verified commercial licensing, export authenticity or trademark clearance.

## Checks and reproducibility

Actual local outcomes on the combined optimized app:

| Check | Result |
| --- | --- |
| Root `npm test` | **1,268 passed**: 1,161 Node + 107 Python, zero failures/skips. |
| Full consumer Chromium at 320/390/1280 | **186/186 passed in one clean 4.3-minute run**; includes all existing cases, selected-artwork checks and the new route-cache acquisition guards. |
| Unchanged MintFactsV1 client/validator suite | **19/19 passed**. |
| Artwork provenance/selection | **2/2 passed**; all supplied original/derivative bytes, dimensions and hashes unchanged. |
| TypeScript, lint, production build, archive integrity, diff/scope | All **exit 0**; lint zero errors/warnings; optimized Next.js build produces 14 static pages. |
| Asserted axe/network states | **0 violations**; no external browser/provider requests; passive consumer paths do not acquire sources. |

Exact final head and final GitHub CI/automatic Vercel outcome are recorded on PR #137 once completed. No old CI result is represented as passing the new merge. Local commands:

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
bash tests/consumer-homepage/run-onchain.sh
node --test tests/consumer-homepage/artwork.test.mjs
CONSUMER_CAPTURE=0 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs --workers 2
```

Root tests use existing disposable local test services only; no hosted database. Generated old-gallery metadata is restored so earlier evidence stays historical. No new screenshot collection is needed: selected artwork/layout did not change, and the existing gallery is rechecked on the actual combined production build.

## Preview and founder's five-minute check

Actual branch preview extracted from the Vercel bot/check metadata:

**https://scout-stonk-intel-git-feat-unfarmd-consumer-v1-riskledgerapp.vercel.app**

Report its exact-head automatic Vercel Ready status on the PR. Cloud proxy access to this host returns **CONNECT 403 / application HTTP 000**, so remote application HTTP/browser success cannot be claimed here. Use normal owner-authorized Vercel access if protected; no bypass URL, cookie, credential or protection change. This limitation is distinct from the application's local 403 admission response.

[Five-minute physical iPhone Safari procedure](IPHONE.md#tonight-five-minute-founder-check):

1. **0–1 minute:** open the preview in normal Safari, verify final headline/art/rights caption and visible SCOUT IT; rotate once. Do not activate a source.
2. **1–2:** paste `So11111111111111111111111111111111111111112`; no submission until SCOUT IT. Tap once while source-disabled/on the unapproved preview origin. Expect truthful **Check not permitted** (preview), no supply/slot/time or safe/unsafe verdict; recover via the editable field.
3. **2–3:** open a dated example, confirm **14 Oct 2026 / stale**, figures withheld and no equity ownership claim. Copy/share, Back/Forward and reload; no automatic live check.
4. **3–4:** inspect source disclosures, exact address and selected below-fold escape art. Close details; keep focus/reading position. Loading must not invent facts. Prefer synthetic loading/accepted-path QA evidence in the PR over invoking a provider.
5. **4–5:** VoiceOver labels for address, Paste, SCOUT IT, Brief/status and disclosures; test native long-press paste/keyboard dismissal. Record device/iOS/URL/pass/fail. Physical Safari/VoiceOver acceptance is **pending, not performed**.

## Founder decision and exact release gates

**Frontend technical readiness** means the combined app, complete tests/build/archive and exact-head CI pass, with no remaining reproduced frontend defect. It does **not** mean production source, rights or physical-device approval has been established.

Before a public release:

- Founder completes the five-minute iPhone acceptance, approves the final visual fit, and independently resolves commercial-art/trademark and any existing source-publication restrictions. Until then, pending disclosures/financial withholding remain; no permission is inferred.
- Agent B and the owner independently authorize the **production canonical public GET** under their approved source/admission policy. This PR must not alter #140, credentials, DSN preflight, budgets or source approval. A proof-only/disabled phase or a Ready preview is not public-source readiness.
- Founder explicitly approves PR #137 for merge/release through the existing review process; agent keeps it draft and unmerged. No manual deployment or domain change here. Frontend may be approved independently as source-disabled, but cannot be advertised as an authentic-data launch yet.
- After separately authorized production acquisition is available, founder performs **one deliberate check of an approved exact mint** on the canonical app: verify original identity, exact supply, authorities, program/extension limitations, checked time/finalized slot/provenance and unknowns. Verify that share/reload remain passive. Do not invoke the old proof/canary, rearm a one-shot budget or assume synthetic evidence proves live success.

## Rollback

Before merge, keep PR #137 draft or close it; current production is untouched by this task. To undo only this readiness follow-up, revert its frontend test/docs commit through review; the latest-main merge and approved consumer/artwork commits can remain. To undo the full consumer release after a future human merge, **revert only PR #137's consumer changes against that then-current main**, preserving backend #136/#138 and subsequent approved backend work, all collector data/archives, admission/counters, credentials and settings. Review the revert diff before approval; do not blindly reset to an old commit or reverse genuine dataset commits. Preserve main parent selection if reverting a merge. Artwork-only rollback remains documented in [ARTWORK.md](ARTWORK.md); never restore the pre-quota-fix UI or use rollback to activate/retry a provider.
