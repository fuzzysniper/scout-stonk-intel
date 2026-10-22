# UNFARMD / verification and founder acceptance

## Scope

Standalone static prototype at localhost:4192, production-built with the already pinned Vite toolchain. Before screenshots use the unchanged actual Next.js production homepage at localhost:4180 **without submitting an address**. Every browser test blocks external destinations and `/api/**`, then asserts **zero external requests, zero API requests and zero page errors**. No provider call, live POST, incident retry, hosted SQL, secret or protection bypass.

Browser evidence is Chromium touch emulation at **320×740, 390×844 and 1280×900**. It is not physical iPhone/Safari testing, a human usability study or a production deployment. Successful local address-format validation is not a successful token observation. There are no synthetic financial or onchain facts in any capture.

## Commands and outcomes

Verified locally on 20 October 2026: Node **20.20.2**, npm **11.9.0**, TypeScript **5.9.3**, Next **15.5.28**, Vite **8.3.4**, Chromium **154.0.8037.57**. Reproduction commands are in the [prototype README](../../experiments/unfarmd-brand/README.md).

| Command | Actual result |
| --- | --- |
| `npm ci` | Exit 0; 356 packages installed. Existing ESLint deprecation notice; no dependency changes. |
| `SCOUT_TEST_PG_BIN=/tmp/scout-v16-pg/usr/lib/postgresql/17/bin npm test` | Exit 0; **1,130 passed** = 1,023 Node + 107 Python. No failures/skips. PostgreSQL tests used a disposable **local** PostgreSQL 17 installation, not Neon/hosted SQL. |
| `bash experiments/unfarmd-brand/test/run.sh` | Exit 0; **4 passed**, no failures/skips. |
| `npx tsc --noEmit` | Exit 0. |
| `npm run lint` | Exit 0; no errors/warnings in the final run. |
| `npm run build` | Exit 0; optimized Next production build, 14 static pages generated. Existing edge-runtime static-generation notice. No prototype route added to Next. |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; **Archive append-only/reproduction check passed**. No archive/data edits or publication authorization. |
| `node experiments/consumer-mvp/web/node_modules/vite/bin/vite.js build --config experiments/unfarmd-brand/vite.config.mjs` | Exit 0; real static production artifact. JS **6.50 kB gzip**, CSS **5.66 kB gzip**; original SVGs/local assets, no fonts or remote images. Build-tool sizes, not field-performance claims. |
| `node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config experiments/unfarmd-brand/test/playwright.config.mjs` | Exit 0; **27 passed in 1.1m**, no failures/skips. Three widths, all three directions, real current-Next idle baseline. **0 axe violations, 0 API requests, 0 external/provider requests, 0 page errors** in the asserted browser states. |
| `git diff --check` | Exit 0. |

The focused prototype tests are invoked explicitly; no workflow/root test-runner change is hidden in this branch. Existing GitHub CI results belong to the PR check list. An automatic hosting check is not a manual deployment or a public UNFARMD route; this study is outside the Next application.

There are **30 actual screenshots**: three unchanged-home baselines, nine concept first viewports, nine full pages and nine address-only interactions. Nine `qa-{direction}-{width}.json` receipts record geometry, axe passes and the no-source state. Address-only captures deliberately retain the visible focus outline. No screenshot contains a founder position/watch history or a simulated token value.

### Initial-viewport geometry

Measured bottom edges in CSS pixels; both the action and offline warning remain within the viewport. This is evidence for the tested browser sizes, not a physical Safari guarantee.

| Direction | 320px / 740 high: CTA / warning | 390px / 844 high: CTA / warning | 1280px / 900 high: CTA / warning |
| --- | --- | --- | --- |
| Escape | 701.6 / 722.6 | 777.2 / 799.8 | 780.0 / 805.0 |
| Squad | 712.9 / 733.9 | 786.5 / 809.0 | 760.5 / 785.5 |
| Minimal | 632.5 / 653.5 | 682.2 / 704.8 | 758.6 / 783.6 |

### Findings fixed before the final pass

The first visual pass exposed a four-line mobile tagline and a missing arrow glyph; final mobile type keeps “Start scouting.” together and uses an original SVG arrow. The first automated pass found squad tool labels at **4.27:1** contrast, and changing direction after submitting a mint lost that identity. Labels were darkened, and direction links now update only with a currently accepted exact address. A fresh address also clears prior manual-copy fallback/status. The final full browser run passes all 27 checks, including delayed clipboard cancellation, denied copy, case-distinct valid addresses and direction switching. No validator, evidence gate or warning was weakened to pass.

## Automated acceptance

- Three distinct rendered layouts; current direction announced, one main heading, explicit private/offline banner.
- Address field uses at least 16px text; submit and offline boundary fit in each tested initial viewport; no horizontal overflow.
- Imported existing 32-byte exact Solana guard; empty/ticker/URL/whitespace/phrase/duplicate inputs rejected; no coercion or name resolution.
- Paste only on gesture, never auto-submit. Clipboard denial offers native paste/type. A delayed clipboard result cannot overwrite subsequent typing.
- Accepted format preserves every original byte in result and share URL. No account existence, onchain fact, receipt, source date, price, return, rank or safety verdict is invented.
- Browser history, reload, direction switching, copy and denied-copy manual fallback preserve address identity. Invalid input is excluded from generated share links.
- Keyboard submission, focused result, skip link, native disclosures, Escape-to-close, reduced-motion behavior and WCAG 2 A/AA, 2.1 AA, 2.2 AA axe scans in landing/address-only/evidence/fallback states.
- Source wording distinguishes future PULSE, unavailable receipts, Token-2022 unknown controls, separate stale 14 Oct StonkFun evidence and unverified publication rights.
- Script-free original SVGs; preview CSP disallows connections, form network submission, remote images, objects and framing. No local/session storage, analytics, production-client import or request API in prototype.

## Uncoached five-second comparison

Prepared protocol; **not conducted**. Show the 390px first viewport for five seconds without explaining the farm metaphor. Randomize direction order for each participant; don’t show earlier labels as recommendations. Ask:

1. “What do you think this helps you do?”
2. “What would you do next with a token you’re curious about?”
3. “Is it showing live token information right now? What tells you that?”
4. “Who is escaping the farm, and why?”
5. After one local address submission: “What was actually checked? Does this tell you the token is safe?”

Record exact words, first action, time to locate input, any game/token-launch/safety misunderstanding and whether the offline boundary was seen. Do not lead with “research,” “scam,” “sheep” or “safe.” Compare comprehension before aesthetic preference. Acceptance: participants can identify token research, deliberate exact-address entry, no live study data and no safety guarantee. A preference vote alone is not a comprehension result.

## Physical iPhone Safari / owner acceptance

Prepared checklist; **not performed**. Owner runs the same static build in a separately approved local device-testing setup; no credentials or live provider needed. The review server binds loopback by default; this PR does not create a public tunnel or deployed preview.

1. On a real small-screen iPhone, portrait: all three directions fit, input and offline warning are visible, no horizontal drag; try landscape and Dynamic Type/text zoom too.
2. Safari: tap Paste (grant and deny), native long-press Paste and type. The 16px field should avoid focus zoom. Keyboard/autofill must not hide the explicit SCOUT action or leave a stuck focus trap.
3. With VoiceOver: hear label, offline scope, errors, focused address-only heading and exact address; open/close evidence. Confirm no token facts or safety claim is announced.
4. Copy address and study link, deny clipboard and use the manual fallback. Reopen the link, use back/forward, switch direction and confirm unchanged exact mint.
5. Reduce Motion, increased contrast and 200% zoom: meaningful order and controls persist. Confirm all imagery has useful alt text and small art annotations are supplementary, not the only limitation warning.
6. Use Safari’s network inspection with the local prototype: no provider/API/RPC requests. Never substitute a live canary to test the branding.
7. Record device, iOS/Safari version, direction and observed issues. Founder selects identity only after these checks and rights/art review; no public rebrand implied.

## Known limits

System fonts vary between Chromium/Linux and iOS; SF is not bundled or claimed to have been tested. CSS/DOM and original geometric art establish hierarchy and world-building, not final commissioned illustration quality. Automated axe does not replace VoiceOver or human judgment. Existing API permissions, incident status, source coverage and financial display rights remain outside this offline study.
