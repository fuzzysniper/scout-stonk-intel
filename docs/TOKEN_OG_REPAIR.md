# Token dossier OG repair — issue #62

Scope: `app/api/og/route.tsx`, OG-specific tests and this evidence. Based on main `c50569bbddd43a21638a7bec2113c340dbba7a48` (merged PR #61). PR #60 frontend code is not included or changed. No reward calculations, API source contracts, archive records, collector/workflows or Cloudflare configuration changed.

## Reproduction and cause

On unchanged main, a production build **passed**, but the real tracked SI request `/api/og?mint=DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP` at **2026-10-15 00:42:47 UTC** closed the connection without a response. Chromium independently returned `ERR_EMPTY_RESPONSE` at **00:43:26 UTC**. Invalid mint input returned 400. [Baseline HTTP/browser evidence](evidence/token-og-before.json) records the route hash, request times and errors; [before screenshot](screenshots/token-og-before-browser.png) is Chromium's actual error page.

Satori rejected nested divs with multiple children and no explicit `display`. Next logged `failed to pipe response` with `Expected <div> to have explicit "display: flex" or "display: none" if it has more than one child node.` The brand glyph `◉` also caused a failed dynamic-font request. These are runtime failures; successful compilation and a Vercel build alone do not validate this endpoint.

## Endpoint behavior

Every div now has explicit flex layout; the unsupported brand glyph becomes a bundled-font period. Remote token images/fonts are not introduced. Provider labels are bounded printable ASCII; unsupported labels show `TOKEN`/an unavailable unit, with the full requested mint still shown. Long labels are truncated and must not replace mint identity.

The image stream is fully rendered before returning headers. A renderer exception becomes a sanitized 503 rather than a broken 200 stream. Both existing internal APIs are read with a 6.5-second timeout, no redirects, no cache and a 64 KiB response limit. No additional provider endpoint or reward math is introduced.

- Exactly one valid `mint`, no extra parameters: invalid/duplicate/unsupported input returns **400**, plain text, `Cache-Control: no-store`.
- A successful rendered card returns **200**, `Content-Type: image/png`, `X-Content-Type-Options: nosniff`, and `Cache-Control: public, max-age=60, s-maxage=60`. This replaces the renderer's implicit long immutable caching.
- Both sources unavailable/mismatched, or rendering failure: **503**, plain text, `no-store`, `Retry-After: 60`. No provider error detail is exposed. There is no retry loop in the route.
- An identified source surviving the other source's failure can produce a card with explicitly unavailable fields. A valid unknown token (`found:false`/official `not_found`) gets an identity-only card, never invented zeros or a fresh observation claim.

Market identity must match the requested mint, including when DexScreener matched the **quote side** of a pool. An unrelated base-token label is never substituted. Rewards require the requested mint, official `reward` mode, a valid quote mint, a supported quote symbol and a finite nonnegative reported amount; null/invalid remains unavailable. Provider holder count is labeled as reported, not “eligible holders.” The image retains the distinction between aggregate lifetime distributions and holder profit/APR; it is not an interval-return, yield or ranking calculation.

The footer shows each source's actual API `fetchedAt` to UTC minute precision, not image-generation time. These are **retrieval timestamps**, not market observation times, verified payout coverage or onchain reconciliation. Invalid/future timestamps remain explicitly unknown. The existing source APIs and their time limitations are unchanged.

## Genuine HTTP and browser evidence

[After evidence](evidence/token-og-after.json) includes public source responses, HTTP headers, PNG hash/dimensions and Chromium checks. [Actual returned PNG](screenshots/token-og-after.png) is saved directly from HTTP and fully pixel-decoded with Pillow. It identifies SI by its exact mint and reports the official NVDAX reward unit, separately from market-pool liquidity. Source captures and image generation are separate real requests; live figures can differ between them, even within the same displayed minute. They are not historical observations to add to the archive.

[320px](screenshots/token-og-after-browser-320.png), [390px](screenshots/token-og-after-browser-390.png), and [1280px](screenshots/token-og-after-browser-1280.png) are genuine Chromium screenshots. At each viewport the image loads as 1200×630, the existing `/?mint=...` dossier retains the exact input mint, and Open Graph/Twitter metadata target the matching `/api/og?mint=...` URL. Desktop clipboard sharing copies that exact dossier URL. No frontend components are edited.

The OG-specific regression suite uses explicitly synthetic offline API fixtures and Next's **real PNG renderer**. It checks Satori layout, signature/IHDR/IEND, source identity, quote-side matches, actual source times, zero versus missing rewards, mode/unit gates, unsupported labels, malformed/oversized responses, no-store errors and rendering-stream failure. Its loopback HTTP test injects source/renderer failures and verifies complete 503 responses plus recovery to PNG. Those 503 tests are controlled fault injection, **not evidence of a real provider outage or a deployed edge runtime**.

## Reproduce safely

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
# In a separate shell; only after build completes:
npm start -- --hostname 127.0.0.1 --port 3191
# Needs Python Playwright, Chromium and Pillow; no repository dependency changes:
python3 tests/og-browser.py --base-url http://127.0.0.1:3191
```

In this managed cloud environment, app checks used Node 20.20.2/npm 11.9.0. The production server used Node 24.19.0 with `node --use-env-proxy node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3191`, preserving the session proxy and CA for read-only provider access. The QA client bypasses the proxy **only for loopback**.

## Checks, risks and human gates

`npm ci`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, archive append-only/reproduction check and local publication dry run all exited 0. Final full test totals: 375 application JavaScript tests (including nine OG cases), 62 Python tests and 15 scheduler tests; no failures/skips. Existing warnings: deprecated installed ESLint and edge runtime disables static generation. No dependencies were updated.

Buffering costs memory for one bounded 1200×630 PNG and delays headers until rendering completes; this deliberately makes errors recoverable. A provider outage can temporarily yield a partial card or a noncached 503. Bundled-font fallback can omit non-Latin symbols; full mint identity remains authoritative. Short caching does not guarantee downstream social-app caches honor refreshes.

**Still separate QA:** physical X/Telegram/Discord/iMessage unfurling and deployed edge-runtime latency/cache behavior. Nothing was deployed or dispatched, and no social message was sent. After human review/merge and the owner's normal release process, validate one exact-mint dossier from a physical social app. Coordinate PR #60's full browser rerun against the merged fix; do not treat targeted frontend checks as full combined validation.

Rollback: revert this PR's endpoint, OG tests/test-runner additions and documentation in a reviewed PR. The previous endpoint would regain its known runtime failure; use a follow-up reviewed fix rather than silently claiming sharing works. There are no data migrations, credential changes or activation flags to reverse. Stop at human review; no merge or deployment is authorized.
