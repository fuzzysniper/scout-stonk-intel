# UNFARMD — source-disabled release acceptance

PR #137 continues from `a88054300f5b1a7806f028d88aab37b94f6c46b4`. Latest main was refreshed and the UI branch rebased cleanly onto `3ac97d4`, including merged backend #136 (`1368b7726b6d5d0a1a77f456b6d010ec01bb239f`). No backend conflict was resolved or backend/source/admission setting edited. Genuine main-branch dataset additions remain intact.

## Release blocker found and fixed

The prior branch did not contain #136 and its consumer would mount both `/api/mint-facts` and `/api/token` on a shared mint URL without SCOUT IT. The three `before-requests-{width}.json` records reproduce both GETs in the actual combined production build; the market response was intercepted offline to avoid a provider request.

The release fix is strictly acquisition intent:

- Opening a mint URL, reloading, Back/Forward, hovering research links, pasting, editing or selecting a dated example makes **zero consumer source requests**. Shared links preserve the original exact mint and say **Onchain check not requested**, not “source disabled” or “verified.”
- **SCOUT IT** (button or Enter) mounts the existing same-origin mint client once for the explicit request. Normal manual **Check again** remains subject to existing cooldown/admission. Expiry, focus/visibility, loading and copied links do not retry.
- The existing market check is **manual**, initially **Market source not checked**. Its existing retry control starts the read only when explicitly chosen. No automatic market request piggybacks on a mint check. Market figures remain withheld; no price/return/rights change.
- Trusted offline harness ports retain their test-only local behavior; no production URL flag or server setting can inject one. Production `app/page.tsx` supplies no port. The acquisition gate is a UX/quota precaution, **not a substitute for server admission**.

Approved hero copy, Escape layout, original SVG placeholder/caption and replacement seam are unchanged. No additional consumer feature, style, asset or data source was introduced.

## Actual end-to-end result

`release.browser.spec.mjs` runs the optimized Next.js app at 320×740, 390×844 and 1280×900. The deliberate clipboard → SCOUT IT → actual HTTP response → truthful failure → dated recovery → history/reload flow is real local HTTP, **not an API success/failure fixture**.

Actual localhost response: **403 / access_denied**, `facts:null`, `source:null`. The merged handler is source-disabled but retains canonical-origin validation; localhost and preview hosts do not become approved production origins. The browser displays **Check not permitted**, no numeric supply/authority facts or token verdict, and no accepted slot/time. A separate explicit inert local test GET reads body evidence because Chromium can discard a no-store response after History navigation. The browser itself sends exactly one mint request after SCOUT IT. No hosting/origin headers were spoofed.

The canonical-origin source-disabled **503 / disabled** path is covered by the existing backend offline tests and a separate frontend failure replay; **503 was not observed as the actual localhost response**. We did not call hosted SQL, Helius, proof POST, protected endpoints or the original canary. Source-code `LOOKUP_APPROVAL` remains disabled with null session clocks. Its disabled branch performs no configuration/credential/store/RPC reads.

The `rehearsal-{width}.json` records retain exact browser calls, actual HTTP status/reason, null evidence and axe result. No new screenshot collection: use the approved [landing/focus gallery](../polish/README.md). Those are dated previous-build captures, not a claim of authentic source readiness or new release screenshots.

## Genuine MintFactsV1 compatibility

The URL, HTTP client, wire schema and production projector are unchanged: `GET /api/mint-facts?mint=<exact mint>`, same-origin mode, no-store, omitted credentials, no redirects or extra body fields. The merged backend explicitly retains this contract. No client contract change is required after a **separately approved canonical production public-GET activation**. A preview host is not an approved acquisition origin.

The production validator is separately exercised with prominently labeled **SYNTHETIC OFFLINE** production-shaped evidence, never authentic Helius data. The real browser client/validator accepts exact u64 decimal supply, original mint, standard authorities, Token-2022 limits, finalized slot, original checked UTC and provenance only when all existing checks pass. Cache evaluation/browsing does not renew capture clocks; the original 60-second expiry removes facts/concerns. Synthetic acquisition in production, malformed/negative/unavailable evidence and rate limits cannot become verified claims. Market requests require a separate explicit action.

## Preview and founder acceptance

Actual automatic preview URL extracted from the existing `vercel[bot]` PR check comment:

**https://scout-stonk-intel-git-feat-unfarmd-consumer-v1-riskledgerapp.vercel.app**

This is the provider-reported branch alias, not a guessed domain or a manual deployment. The final PR records its exact-head Vercel Ready/check status. This cloud environment cannot open that host: the HTTPS CONNECT proxy rejects it with **403 before HTTP to the application**. That is an environment access limitation, not an observed application response or successful hosted QA. No authentication/protection bypass was attempted. Founder should use the normal Vercel-authorized browser session if protection prompts appear; no cookie/key/bypass URL is needed here.

Use the [five-minute physical iPhone checklist](../IPHONE.md#tonight-five-minute-founder-check). Physical Safari and VoiceOver are **pending**. The original Midjourney export remains pending; its absence is truthfully labeled, not substituted with purported final artwork. Source rights/withholding and the separate 14 Oct 2026 stale StonkFun layer remain intact.

## Verification

The PR records final exact-head CI and merge verdict. Actual local outcomes:

| Check | Result |
| --- | --- |
| Combined production build with #136 | Exit **0**; optimized Next.js 15.5.28 production build, 14 static pages. |
| Root `npm test` using disposable local PostgreSQL 17 | Exit **0**; **1,193 passed** (1,086 Node + 107 Python), no failures. |
| Unchanged production validator/client suite | **19/19 passed**, including exact supply, identity, source classification, cache clocks, expiry, redaction and bounded transport. |
| Final interpretation/SSR suite after availability wording | **16/16 passed**; no automatic source mount or implicit market fetch. |
| Focused real release rehearsal | **9/9 passed** at 320/390/1280, **21.3s**; actual localhost rejection separately identified from synthetic success. |
| Broader reused consumer semantic suite | **165 passed / 6 failed initially** in 4.2m; failures were two old automatic-fetch assumptions at three widths. Corrected expectations/actions; **all 6 targeted reruns passed in 11.2s**. **171 distinct scenarios verified; no remaining failures**. This is not represented as a single clean 171-test run. |
| Final build-focused release/availability check | **15/15 passed in 27.5s** on the final build; real disabled-path rehearsal, passive-request guard, production validator and first-screen controls. |
| TypeScript / final lint / archive integrity / diff | All exit **0**; lint zero errors/warnings; archive append-only/reproduction passed. |
| Accessibility / network | **0 axe violations** in asserted states; no external browser/provider requests, GET-only consumer API calls. |

Existing screenshot collections are preserved; only six small request/HTTP evidence JSON files were added. No new visual collection or physical-device success is claimed. Availability copy is conditional so an access denial does not purport to diagnose global source activation. Reuse existing semantic tests; do not rerun baseline screenshot capture.

```sh
npm run build
CONSUMER_CAPTURE=0 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/release.playwright.config.mjs --workers 2
bash tests/consumer-homepage/run-onchain.sh
CONSUMER_CAPTURE=0 node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config tests/consumer-homepage/playwright.config.mjs --workers 2
npm test
npx tsc --noEmit
npm run lint
bash scripts/archive-tool.sh check origin/main
```

Older acquisition tests now call the shared `openResearch`/`scout` helpers: these perform actual SCOUT IT browser gestures after navigation instead of requiring the unsafe former page-load request. Market-specific tests use an explicit market gesture. The dedicated release test independently asserts **zero passive requests**. Historical-only tests and injected offline harness behavior retain their original evidence/rights assertions.

## Merge decision and rollback

Technical review targets a **source-disabled consumer release candidate**, not a live-data launch or permission to activate the lookup backend. Final verdict requires green exact-head CI, combined build and focused acceptance; recorded on PR #137. Physical founder acceptance, authentic-source approval and final original art remain explicit separate items. PR #137 stays **draft**; no merge, production/manual deployment or source activation is performed.

Before human merge, the current main parent is `3ac97d4` and includes #136. If the consumer release is later merged and needs rollback, **revert only PR #137’s consumer merge** through the normal reviewed release path. Keep #136 and its source-disabled approval, durable counters/proof policy, all genuine datasets, secrets and infrastructure unchanged. Do not roll back main to the older canary route, rearm a budget, apply SQL or activate providers. The previous `a880543` UI is not a quota-safe rollback target once public GET is authorized; prefer current main’s disabled backend plus a reviewed consumer correction.
