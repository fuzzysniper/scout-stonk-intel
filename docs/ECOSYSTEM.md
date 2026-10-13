# SCOUT and the STORK ecosystem

SCOUT offers an optional informational link to https://storkcoin.xyz. It remains an independent, read-only tool for researching StonkFun ecosystem evidence. STORK ownership is not required to use SCOUT; there is no wallet connection, ownership check or token-gated research.

The relationship is not an investment recommendation or a promise of STORK token profit, individual returns or future yield. It does not change tracked-token selection, evidence requirements, source handling or reward calculations. Research remains available without visiting STORK or receiving a successful data response.

## Architecture and scope

The existing Next.js App Router root layout renders a static server component, `app/ecosystem-footer.tsx`, after page content. It adds no provider calls, client JavaScript, cookies, storage, telemetry, STORK assets or SDK dependencies. The same-tab external anchor labels its destination and suppresses the referrer; browser Back returns to SCOUT. The internal link opens `/research#stork-relationship`, where the independence and access boundaries are explained.

Footer CSS wraps on small screens and provides 44px link heights and existing visible keyboard focus. The primary navigation and research entry points stay in place.

Reward calculations, archives, workflows, wallets, tokenomics and treasury assets are outside this change. No files in `stork-post-office` are read or changed.

## Verification

- `npm test`: server-rendered connection and relationship tests alongside existing regressions.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- `bash scripts/archive-tool.sh check 38d74112461bb96d7bad08a6c306e25bdccf3a6b`: unchanged archive boundary against reviewed main.
- `python scripts/verify-ecosystem-browser.py --base http://127.0.0.1:3137`: built local Chromium preview at 320px, 390px and 1280px, checking every main research route, link destinations, touch targets, focus, internal navigation, browser Back and enlarged-text reflow. Browser API requests are deliberately aborted; no substitute financial data is supplied.
- Screenshots: `docs/screenshots/ecosystem-home-320.png`, `ecosystem-home-390.png`, and `ecosystem-relationship-390.png`. Machine-readable results: `docs/evidence/ecosystem-browser.json`.

## Limitations and rollback

Local Chromium screenshots are not production or physical-phone proof, accessibility certification or a check of STORK's site availability/content. This connection makes no claims about external site security or ongoing operations. No production deployment is performed. Human review is required before merge.

Revert this PR to remove the footer, guide section and documentation. No data migration or financial state rollback is needed.
