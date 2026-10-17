# Consumer MVP validation and critical review

Issue #88, founder deadline **20 October 2026**. Local Chromium checks use the actual production-built frontend + unchanged Agent B engine at its default evaluation clock. No human usability session or consumer deployment is claimed.

## Repeatable checks

From `experiments/consumer-mvp/web/`:

```sh
npm ci
npm test
npm run build
npm run test:browser
```

Eight unit tests cover exact 32-byte mint validation, no aliases/whitespace normalization, the real other SI mint, source/quote/citation integrity, null/rights/entitlement/settlement gates, unavailable handling, private error suppression, exact-mint URL cleanup and byte-identical upstream files. The typed fixtures are B's real metadata-only projections; their explicit simulated input is not a simulated provider response.

Eighteen production browser tests: six cases × 320/390/1280. All three supported tokens are exercised at each width. Checks include zero console/page errors and zero runtime external requests in every case; overflow on answers/expanded evidence; sources and original clocks; visible ownership/rights/unknowns; exact query/reload/back/forward; keyboard native disclosures; real clipboard success and denied-clipboard fallback; local-only unsent feedback; unsupported/empty/ticker/malformed input; the distinct SI; and unavailable evidence caused by a real pre-capture device clock, recovered only after clock correction and explicit retry. Nine normal-answer and three expanded-Evidence axe scans cover WCAG2A/AA, 2.1AA and 2.2AA rule tags with zero violations. That is automated coverage, not a complete WCAG certification.

Screenshots are genuine Chromium viewport captures, not edited compositions, annotated renders or live-market examples. The three landing/answer pairs and three Evidence views are under `screenshots/`; file hashes/dimensions and measured risk-heading positions are in `validation.json`. There was no prior consumer page, so these are **landing → answer** images, not a fabricated before/after comparison to production.

| Width | Landing | Answer | Evidence |
| --- | --- | --- | --- |
| 320 | [landing](screenshots/landing-320.png) | [answer](screenshots/answer-320.png) | [source details](screenshots/evidence-320.png) |
| 390 | [landing](screenshots/landing-390.png) | [answer](screenshots/answer-390.png) | [source details](screenshots/evidence-390.png) |
| 1280 | [landing](screenshots/landing-1280.png) | [answer](screenshots/answer-1280.png) | [source details](screenshots/evidence-1280.png) |

The unchanged root app also passes npm ci/test/typecheck/lint/production build and append-only archive/dry-run checks. The prototype's own locked toolchain is independent. No production configuration is needed to run it. Chromium154/Linux was tested; physical phones, Safari/iOS, Firefox, Windows and assistive-technology sessions remain unrun.

## Five-second comprehension script — for real testers, not executed here

Recruit at least three people unfamiliar with the project. Do not explain the product, stock-linked quotes, rewards or the desired answers first. Record consent, device, actual elapsed time and the person's words; use anonymized notes, not recordings or identifiers by default.

1. Show the landing page for **five seconds**, then hide it. Ask: “What does this do?” and “What would you do first?” Pass only if they describe understanding a token by address/choosing an example, not buying, a wallet scan, live prices or a token ranking.
2. Restore the page. Give the exact SI mint or let them choose SI. Ask them to get an explanation. Target **under 30 seconds**, with no coaching. Record actual time/errors; automated browser duration is not a human completion time.
3. Show the answer for five seconds, then hide it. Ask: “What asset would a holder have?”, “Does this show NVIDIA shares?”, “What did this verify?”, “Is a payout or personal return established?” and “Is the evidence current?” Fail on equity ownership, quote-token ownership, guaranteed payouts/ROI or a live-data inference.
4. Ask them to reveal a source and find its capture date. They should distinguish original capture, provider generation and evaluation time. A mutable source endpoint must not be treated as a refreshed receipt.
5. Ask them to copy the URL and open it again. It must show the same exact base/quote identity and dated limitations. Try `SI`, the other real SI mint and an unsupported address; they must understand unsupported does not mean nonexistent.
6. Ask what remains unclear. Use **Tester feedback → Copy feedback**; make clear it submits nothing. The owner records anonymized outcomes manually. Do not enable third-party tracking to meet the deadline.

Stop launch readiness if any tester believes a reward setting proves payment, a stock-linked quote proves shares, unknown equals zero, source hashes grant rights or this is complete market coverage. Fix copy/interaction rather than adding metrics or breadth. Owner must sign off actual results and source-rights decisions separately.

## Critical UX self-review

- The first screen has one promise, one input, one action and source-grounded examples. No terminal navigation, token scores, financial tables, decorative charts or trading prompts. One known mint is enough to complete the useful path.
- The initial 320px prototype put risks below the first screen. The final answer uses shorter ownership copy and compact verified rows. Automated geometry now requires the **risk heading inside the first viewport for all three tokens at all three sizes**. At 320 the rest of the risk list and source details still require scrolling; this is recorded, not described as all content fitting at once. Ownership/payout caveats and dated status are already visible above it.
- At 320 the third curated option can require a short scroll; the first two examples and primary action are visible. This preserves readable controls instead of compressing every item into tiny chips. At 390 all three choices fit in the captured first screen.
- Exact mints and hashes are long and technical; they are intentionally one native disclosure deeper, with wrapping and original UTC clocks. Unknown/rights/coverage qualifiers stay in the open risk panel. Expanded Evidence preserves B's full mechanism/ownership limitations without crowding the primary answer.
- “Verified” is scoped to dated provider identity/configuration. The default page explicitly says the reward setting is not a payout. No checkmark is used for settlement, returns, current state or commercial permission.
- Names such as RuneScape Gold and stock-linked labels can carry misleading associations. The source-backed name is retained as an identifier; copy establishes neither affiliation nor ownership of an underlying asset. Human testing must verify that this distinction lands.
- Browser/axe success cannot establish five-second human comprehension, legal rights, live-source correctness or production readiness. Those are explicit remaining gates. Deadline pressure does not turn stale evidence into a current claim.

## Scope freeze and limitations

Only SI/NVDAX, GP/GLDX and GROK/SPCXX. No live adapter, current prices/liquidity/volume, numeric rewards, holder entitlements/returns, broad catalog, wallet or accounts. Captured financial figures remain withheld. The engine is a pinned copy of a separately reviewed PR; changing its source/contract requires another reviewed update. Shared links work only where this app is actually running; they are not an independent hosting service. No consumer preview was deployed.
