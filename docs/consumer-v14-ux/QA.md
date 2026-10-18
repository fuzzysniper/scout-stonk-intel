# Consumer V1.4 — real MintFactsV1 UI, local synthetic QA

## What is implemented

Issue #107, from latest main `e9cc7a9d06841d7b9cba9f66bad9968eaf75f14f`, which already contains squash-merged #104 and #106 (`7184fad`). A new feature branch enhances those files directly. No cherry-pick, rebase, copy of either PR, or backend/source edit.

The consumer now has a working renderer and reader for the **single exported `MintFactsV1`** (`import type` from `lib/onchain-mint/contract.ts`). It presents exact supply, mint/freeze authority fields, plain-English control explanations, Token-2022 review limits, finalized context slot, checked UTC and explicit RPC assurance. Long decimal quantities use an exact raw coefficient/exponent with the full fixed decimal in Evidence; no raw integer is converted to a float. Zero is zero, missing is unavailable, and absent authority does not establish unrestricted transfers. No name/ticker, project legitimacy, equity, price, distribution, holder payment or profitability is inferred.

Positive current-account facts, when permitted in the isolated test context, lead the page and collapse the search. Exact-address deep links, search/cancel, copy/fallback, keyboard focus, Back/Forward and old terminal links remain intact. For the three known historical examples, the chain view and a separately labeled **14 Oct 2026 · stale StonkFun** disclosure remain distinct. The default historical page keeps its original explanation and replaces the long repeated unavailable panel with a short notice. The engine, field/rights gates, source records and metadata are unchanged.

## Agreed API and production boundary

Agent B confirmed [GET `/api/mint-facts?mint=<exact>` and status mapping](https://github.com/fuzzysniper/scout-stonk-intel/issues/107#issuecomment-6252159724); [A confirmed](https://github.com/fuzzysniper/scout-stonk-intel/issues/108#issuecomment-6252226773). The response is MintFactsV1 directly, with no wrapper. 200 carries reported mint/extension states, JSON 404 unsupported account, 400 invalid input, 403 access rejection, 429 rate/admission plus numeric Retry-After, 502 invalid source, 504 timeout, 503 disabled/unavailable/stale. A missing-route HTML 404 remains distinct from a typed unsupported account. No response error becomes a positive token finding.

The fixed same-origin client uses one exact mint, GET, no credentials/referrer, no-store, no redirects, a 6-second total bound, 32KiB decoded response bound, cancellation/generation protection and no automatic network retry. A 429 cooldown is clamped to 1–300 seconds (30 seconds if absent), with a tab-local guard across inputs. This supplements, **not replaces**, B's mandatory distributed admission. Expiry clears displayed facts after 60 seconds; focus/visibility checks also catch suspended tabs and backwards clocks. Rerenders, copying and caching do not renew source acquisition time.

The merged contract has development/recorded/synthetic acquisition profiles only. **No production acquisition is approved in this change.** The production presentation rejects successful nonproduction results, including missing provenance. All positive current tests use an explicitly labeled `synthetic-offline` injected port; only trusted test code supplies it. The deployed Next page never supplies it, and no URL, environment, browser global or activation flag can select it. Production reads only the fixed same-origin route and truthfully displays source-not-connected when missing or disabled. It cannot issue an RPC request or read a credential.

At this branch's base #108 is not merged, so the real production-build smoke exercises missing-route fallback; API error-state tests replay B's typed JSON on localhost. This is **not** a combined deployment of #108. B's agreed production route is hard-disabled and will respond `503/unavailable/disabled` with zero source I/O after its separate review. Future production acquisition/profile approval must be coordinated in a later PR; no invented `production_rpc` wire enum or schema extension is introduced here.

## Test harness and actual screenshots

`tests/consumer-homepage/harness/` runs **only on loopback 4181**, outside Next `app/` and `public/`. It imports the actual consumer components, original model, actual global/scoped CSS and the one MintFactsV1 type. Its only framework stand-in is a test-only Next Link → anchor shim. Its synthetic typed fixture is at `tests/consumer-homepage/synthetic.ts`. No authentic RPC response was captured or claimed. A top-level harness label and an independently rendered **SYNTHETIC · OFFLINE TEST — invented test values, no live RPC** label remain visible. Even supplying the parsed fixture to the renderer without its context retains the label.

The production Next build contains no harness entry, fixture object, test port or test URL. Negative unit cases reject synthetic/recorded/development/missing acquisition as production evidence. Browser QA verifies `/consumer/harness` is 404 and that the fixture's exact supply does not occur in production SSR/scripts. None of these checks establishes an authentic source result or independently replayed chain state.

| Actual browser captures | 320×740 | 390×844 | 1280×900 |
| --- | --- | --- | --- |
| **Synthetic/offline** supported-layout answer | [PNG](screenshots/synthetic-verified-320.png) | [PNG](screenshots/synthetic-verified-390.png) | [PNG](screenshots/synthetic-verified-1280.png) |
| **Synthetic/offline** unreviewed Token-2022 controls | [PNG](screenshots/synthetic-extensions-320.png) | [PNG](screenshots/synthetic-extensions-390.png) | [PNG](screenshots/synthetic-extensions-1280.png) |
| **Synthetic/offline** chain/provider separation | [Full PNG](screenshots/synthetic-history-320.png) | [Full PNG](screenshots/synthetic-history-390.png) | [Full PNG](screenshots/synthetic-history-1280.png) |
| Actual Next production build, source disabled/missing | [PNG](screenshots/production-disabled-320.png) | [PNG](screenshots/production-disabled-390.png) | [PNG](screenshots/production-disabled-1280.png) |

Additional landing/historical/search/receipt regression PNGs and all image dimensions/hashes are in this directory and [validation.json](validation.json). Screenshots are actual Chromium captures, without compositing or invented live observations. The source/slot/boundary portions of the synthetic answer fit the first viewport even with both offline labels; automated non-overlap checks cover heading, copy button, labels, quantity, controls, limits, clocks, boundaries, link and closed evidence. This measures layout, **not human comprehension within 30 seconds**.

## Verification commands

Node 20.20.2 / npm 11.9.0 / Next 15.5.9; system Chromium 154.0.8037.57. Existing isolated Playwright/axe/Vite dependencies are reused with no lockfile/package changes.

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

The browser configuration starts the real Next production server on 4180 and local-only Vite test harness on 4181; leave both ports free and build first. If the isolated tools are absent, reproduce them with the unchanged `npm ci --prefix experiments/consumer-mvp/web`. No manual deployment or provider request is needed.

Results: all final commands exit **0**. Root `npm test`: 501 app + 29 original evidence + 31 candidate + 24 pilot + 37 mint decoder + 31 mint reader + 106 Python + 18 scheduler = **777** tests. New unit/SSR/transport suite: **16**. Browser: **57** cases across the three viewports. Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA: zero violations in tested states. Type/lint/12-page production build and both archive checks pass. `npm ci` installs 336 packages with the existing ESLint deprecation notice. Full exact command results and screenshot hashes are recorded in validation.json.

The first matrix passed 54/57: the three no-JS tests found empty `<noscript>` content. An SSR-visible notice was added and is removed only after hydration. The final matrix checks actual JavaScript-disabled rendering. Earlier harness startup exposed a missing test favicon, fixed locally without adding production assets. No assertion or evidence gate was weakened.

Coverage includes u64 precision and decimals 0/255; zero vs missing; malformed/mismatched/expired/future/source/program/authority/extension cases; metadata/key redaction; clock/slot/host limits; API status mapping and body limits; 429 cooldown without background retry; timeout/cancellation; stale request suppression; Back/Forward/search and clipboard fallback; exact source fields; no-JS honesty; no horizontal scroll/overlap; `:has()` removal on preserved mobile layouts; original provider quantities withheld in SSR/JS; neutral PNGs and `/terminal`/research/radar/status/brief preservation. Expected API HTTP failures are monitored as failures of the source check, not silently promoted to facts; unexpected browser errors/outbound requests fail tests.

## Unmet live/device gates and rollout/rollback

- No authentic onchain capture, live source verification, real Helius request, actual finalized chain freshness claim, production activation or human test occurred. Synthetic age/clock tests are deterministic test cases, not recorded history.
- #108's actual API must be reviewed/merged and its default-disabled response verified in a combined build. A separate owner-approved production profile must cover source acquisition semantics, fixed Helius host/terms, isolated server credential, quotas/costs, distributed admission/cache/circuit and redaction. No old bot/key access or account setup is part of this PR.
- Owner must run real iPhone Safari/VoiceOver/keyboard/text-scaling checks; Chromium mobile/touch emulation and CSS selector removal do not certify Safari. Verify the approved deployed SHA first; use the existing [owner checklist](../consumer-usability/OWNER_VERIFICATION.md) with the new source-off and source/slot/extension states. Validate one-screen fit under real Safari chrome, readable exact quantities, focus, source disclosures and clipboard fallback. No physical device claims are made here.
- Existing provisional StonkFun metadata/retention/publication decisions remain unresolved and governed by the original [publication review](../consumer-homepage/PUBLICATION_REVIEW.md). Independent chain facts do not clear those rights or establish a reward/stock relationship. All original gates remain intact.

Scope: only `app/consumer/**`, `tests/consumer-homepage/**` and this new `docs/consumer-v14-ux/**` change. No API/source library, root tests, source rights, data/archive, collector, scheduler, workflow, Cloudflare, Vercel, permission, treasury, wallet or dependency edits. Human review only. Rollback is a human-reviewed revert of this PR's merge/squash commit, preserving merged #104/#106 and subsequent real data/API work. There are no migrations, services or credentials to undo. Do not reset main, restore old datasets or cherry-pick the prior PRs. Verify the resulting normal deployment SHA and repeat homepage/terminal smoke checks; the agent does not merge or deploy.
