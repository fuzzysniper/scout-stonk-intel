# First-user readiness

Issue [#17](https://github.com/fuzzysniper/scout-stonk-intel/issues/17), based on latest main `fdce3c1` including merged PR #18. This release changes navigation, starting guidance and research help only. Existing financial calculations, API contracts, source readers, snapshot history, archive generation, workflows, permissions and publication automation are unchanged.

## Reading path and architecture

The shared root-layout navigation links Home, Radar, Daily Brief and Data Health on every page, plus a research guide. Current-page state treats nested dated/edition URLs as Daily Brief, without rewriting those URLs. A keyboard skip link targets each page's main landmark. Links wrap at narrow widths; controls have visible keyboard focus and at least 44px navigation height. Existing local links remain available.

Home now suggests browsing Radar without a mint, reading a UTC brief and checking Data Health when evidence is missing. `/research` is static server-rendered guidance, independent of successful source responses. It links the existing [history](HISTORY.md), [Radar](RADAR.md), [Signal Lab](SIGNALS.md), [brief](BRIEFS.md), [archive](ARCHIVES.md) and [Data Health](DATA_HEALTH.md) methodology. No data fetch, telemetry, feedback submission, browser storage or external form is added by these components. Next.js's existing link prefetch/navigation behavior still applies; this is not a zero-network application.

The guide distinguishes actual observation timestamps from retrieval, coverage from freshness, provisional versions from preserved editions, and missing from zero. Counter reports are not independently reconciled transfers, individual profit, APY or promised returns. Different quote units remain separate. A finalized historical edition does not establish current collector health. Methodology help stays reachable during loading and failed/empty responses; it never supplies substitute records.

## Consent-based first-user pilot (not launched)

An owner may propose three to five consenting first-time participants on a specifically approved preview. Before recruitment, approve the host/revision, facilitator, consent wording, storage access and deletion date. No automated invitation or public post is authorized by this plan. No analytics SDK, third-party form, tracking identifier or feedback endpoint exists.

Suggested consent: “This optional session tests whether SCOUT's navigation and evidence explanations are clear. You can skip questions or stop at any time. We will note task outcomes and confusion without your name, contact details or financial information. No recording is needed. We will delete session notes after 30 days and retain only a non-identifying summary. Do you agree?” Do not collect anything before agreement. Do not interpret consent to participate as consent to publish quotes or recordings.

Ask participants to:

1. Find Radar from Home without pasting an address or connecting a wallet.
2. Open a Daily Brief and identify its UTC date and provisional/finalized state.
3. Explain “missing data is not zero rewards,” then find Data Health.
4. Locate an actual observation time, interval and source link; explain why a reward counter is not personal profit.
5. Return to Home and find the research guide from another page.

Use participant codes P1–P5 without a name/contact mapping. Notes may contain consent yes/no, app revision, coarse device/browser class, task completed/assisted/not completed, confusion category and an optional paraphrase. Do not request wallet addresses, balances, trades, payments, holdings, screenshots of personal apps, IPs or browsing histories. Stop/redact if sensitive information is volunteered. No screen/audio recording by default. Do not store notes in a public GitHub issue; keep a local owner-controlled document with access limited to the facilitator, delete within 30 days, and offer deletion during the session. This is a proposed retention policy requiring owner approval, not an active collection process.

Publish only a separately approved non-identifying aggregate summary, without raw notes or quotes unless explicit separate consent allows them. Such a small sample supports usability observations, not population conversion rates or investment claims. The owner reviews confusion points and creates follow-up issues; there is no automatic outreach, telemetry or product change. First question: can readers distinguish preserved historical evidence from current freshness?

## Verification and approval gates

The user reports that human iPhone spot checks passed for the existing archived edition: it renders, the no-finding disclaimer is visible, the permanent link copies/reopens, and Data Health shows seven tokens. These are **user-reported prior-release QA**, not automated production smoke, not dated/device-documented full QA, and not verification of this new navigation release. Preserve the distinct production HTTP incomplete evidence in [RELEASE_VERIFICATION.md](RELEASE_VERIFICATION.md); do not relabel it PASS.

Before approving this release:

- Inspect the PR's local mobile screenshots and automated test/browser evidence. Fixture failures must be labelled simulated.
- On an approved preview, a human checks Safari/iPhone navigation, text zoom, keyboard/VoiceOver focus, landmarks, touch targets, active state and back/deep-link behavior. Reuse the existing release runbook for evidence/copy/share checks; do not dispatch publication workflows to test navigation.
- Independently record production HTTP smoke from an accessible approved environment when needed, including deployment identity/URLs/UTC and failures. Prior user observations do not replace it.
- Approve this PR's wording and merge separately. Deployment remains a separate human decision. Feedback recruitment/storage/consent requires separate approval; publication automation remains disabled and unchanged.

Read-only preview procedure: install/build with the five required commands; start the local built app; visit `/`, `/radar`, `/brief`, `/status`, `/research` and a reviewed `/brief/DATE/editions/ID`. Check one current navigation destination, research guide during simulated client API failure, skip-link focus, keyboard traversal, wrapping at 320/390px and enlarged text. Do not simulate outages by modifying production data/DNS. Use only real main-backed records for ordinary screenshots; label browser-aborted requests as simulated failures without invented data.

## Rollback

Revert the first-user UI/docs/tests commit through a reviewed PR and a separately approved application rollout. Shared navigation, Home onboarding and `/research` are removed; existing routes and dated archive IDs remain. Preserve all observations, editions and method adapters. No data migration, workflow/permission/variable rollback, dependency change, asset operation or telemetry teardown is needed. Saved `/research` links would become unavailable; do not silently substitute claims.

## Recorded results

All five required checks passed on Node 20.20.2/npm 11.9.0: `npm ci` (310 packages), `npm test` (107 JavaScript cases across 14 files and 14 Python tests, none failed/cancelled/skipped), `npx tsc --noEmit`, `npm run lint`, `npm run build`, all exit 0. Existing ESLint deprecation and edge-runtime static-generation warnings remain. Initial new tests failed on CJS default import interop and HTML attribute ordering, corrected without app behavior changes; the final suite passed.

The local production build used Node 24.19.0 `--use-env-proxy` for this managed environment only; unchanged source readers fetched real main-backed data. Browser QA passed at 320/390/1280px: four destination links/current-page state on Home, Radar, UTC-today Brief, Data Health, research and permanent edition URLs; one main landmark/skip target; actual Tab/Enter skip focus and visible outline; ≥44px primary navigation targets; no horizontal overflow; Home onboarding clicks, navigation and browser back; 200% text-size simulation reflow on the guide/navigation. A separate browser-aborted Radar API request produced an honest no-rows failure while the guide stayed reachable. This is a simulated client failure, not a production incident. No mocked data was used for normal screenshots. Keyboard and reflow checks are bounded accessibility tests, not WCAG certification or VoiceOver proof.

[Browser evidence](evidence/readiness-browser.json) and labelled screenshots: [mobile Home](screenshots/readiness-home-390.png), [desktop Home](screenshots/readiness-home-1280.png), [mobile guide](screenshots/readiness-guide-390.png), [simulated Radar failure](screenshots/readiness-radar-failure-390.png). The reproducible local-only harness is `scripts/verify-readiness-browser.py`; it requires an existing Python Playwright installation and Chromium, with no project dependency change. After building, start `node --use-env-proxy node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3137` only where Node 24/inherited proxy is required (otherwise use normal `npm start -- --hostname 127.0.0.1 --port 3137`). Run `python scripts/verify-readiness-browser.py --base http://127.0.0.1:3137 --chromium /usr/bin/chromium`; it refuses remote hosts and saves dated evidence/screenshots. Native sharing and external submission are not invoked. Physical-phone QA of the new UI, automated production HTTP proof and consented participant feedback remain pending. No recruitment or data collection has occurred.

## UX V2 presentation

[UX V2](UX_V2.md) supersedes the original Home onboarding and expanded Radar card presentation. Compact rows retain quote units, actual observation times and withholding reasons; existing research calculations and provenance remain behind Evidence / Details. Source/API/calculation policies in this document are unchanged.
