# SCOUT V3 — exact-mint trader brief

Issue #126. Base: `8df27bda59d29901d8996920fbe5f0cd6892ad3d` (latest main at branch creation). Consumer presentation only: `home.tsx`, `trader.tsx`, `consumer.css`, scoped consumer QA and this directory. No backend, contract, infrastructure, dependency or activation changes.

## What changed

1. **Discover:** an ink-and-citrus SCOUT entry, one 16px exact-address field, deliberate Paste → Analyze token, and a compact three-step guide. Clipboard refusal retains native paste/type recovery. The existing three explicitly stale examples remain available, with CARDS research and the terminal secondary.
2. **Understand:** a first-screen **SCOUT Brief** reports accepted-source status, the original checked timestamp/finalized context slot, and three compact control indicators. Concerns precede the full account readout. A single action focuses and scrolls to the concern cards (or to dated examples when no facts are available); each card exposes the precise triggering field, value, exact mint and source receipt.
3. **Verify:** a direct evidence action reaches the unchanged exact-supply, program, authority and Token-2022 renderer. Receipts stay progressively disclosed. Markets retain independent recovery, pool/source navigation and the existing financial withholding boundary.

The design uses system fonts, small inline SVGs, local CSS and native disclosures. No font service, paid asset, animation library, remote image or new dependency. Motion is limited to a loading skeleton and button feedback; reduced-motion disables both. No fake progress, confidence percentage, token safety score or market statistic.

## Runtime truth

**Public UI availability is not live source availability.** Current main restricts live acquisition to a separately controlled, owner-operated USDC POST canary. Ordinary GET mint lookups stay disabled, even with credentials configured. The consumer continues using its existing GET client and never invokes the canary POST. This PR cannot demonstrate a genuine successful Helius observation and does not enable one.

The actual local production endpoint returns **403 `access_denied`**, with `facts:null` and `source:null`, because the localhost origin is outside the approved origin. This is an actual local API denial, not a simulated outage or proof that a mint is invalid. Code inspection confirms the existing server's non-POST disabled branch; no approved-host request or provider probe was made. Browser acceptance receipts record this actual denial separately from fixtures.

Successful screenshots are **synthetic offline replays**, visibly labeled in the captured browser. Invented test values exercise the real production page, HTTP client and MintFactsV1 validator via Playwright interception; they are not Helius data, USDC canary results, live market quotes or public examples. Production has no URL switch to these fixtures. The existing test-only harness also retains its synthetic warning.

## Evidence interpretation

| Indicator | Trigger from an accepted, unexpired MintFactsV1 | Limits |
| --- | --- | --- |
| New supply | Standard mint authority present/absent | Presence is a control, not proof of intended issuance; absence is not a safety verdict. |
| Freezing | Standard freeze authority present/absent | Does not identify the person behind an address or establish all transfer controls. |
| Extensions | None in supported layout / MetadataPointer only reviewed / unreviewed | Token-2022 extensions can leave additional controls unknown even with absent standard authorities. |
| Attention count | Existing `tokenConcerns` deterministic rules | Counts observed concerns, not severity, completeness or investment suitability. |
| Source status/time | Existing validated acquisition, original `checkedAt`, finalized context slot | RPC-reported snapshot, not independently replayed; slot wall time and last account change are unknown. |

The Brief calls existing `usableMintFacts` and `tokenConcerns`; it adds no acquisition or validation path. After source expiry, the original clock is not renewed, indicators become unknown and derived concern cards disappear. Invalid, denied, unsupported, incomplete, synthetic-in-production and wrong-mint responses cannot create concerns. Rate limits retain existing manual cooldowns and independent market/onchain recovery; nothing automatically retries.

Holder concentration, insider allocation, LP control, sellability and holder payout rights remain unknown. Authority addresses are not identified people. Exact supply remains decimal/string based in the original renderer; no Number conversion or rounding is introduced.

## Market and historical publication review

Market values remain withheld: price, capitalization, liquidity, volume and movement have no approved display-rights/observation-time basis here. Existing pool identity and exact-mint provider links remain useful; a response retrieval clock is never labeled as a market tick. The market section is the future insertion point **only after separate source rights, exact identity and clock review**. The unchanged existing API can still contain financial fields in Network; this frontend-only task does not assert that API publication rights were resolved.

The three StonkFun examples retain original **14 Oct 2026** dates, exact quote identities, source URLs, hashes and rights warnings. They are explicitly stale. Current facts, when accepted through a separately approved backend in the future, lead the page while dated StonkFun statements remain in their separate disclosure. No financial quantities, ROI, backing, equity ownership or holder-return claims are added. No source-derived financial response body or founder watch history is committed in screenshots or evidence.

## Browser evidence

Actual Chromium, Next.js **production build**, 320×740, 390×844 and 1280×900. Touch/mobile emulation at 320/390 is not a physical iPhone test. See [QA](QA.md), [founder checklist](IPHONE.md) and the machine-readable actual-GET/synthetic-layout receipts in this directory.

| State | 320px | 390px | 1280px |
| --- | --- | --- | --- |
| Before · idle | [image](screenshots/before-idle-320.png) | [image](screenshots/before-idle-390.png) | [image](screenshots/before-idle-1280.png) |
| After · idle | [image](screenshots/after-idle-320.png) | [image](screenshots/after-idle-390.png) | [image](screenshots/after-idle-1280.png) |
| Before · synthetic success | [image](screenshots/before-synthetic-320.png) | [image](screenshots/before-synthetic-390.png) | [image](screenshots/before-synthetic-1280.png) |
| After · synthetic success | [image](screenshots/after-synthetic-accepted-320.png) | [image](screenshots/after-synthetic-accepted-390.png) | [image](screenshots/after-synthetic-accepted-1280.png) |
| Before · actual GET denied | [image](screenshots/before-unavailable-320.png) | [image](screenshots/before-unavailable-390.png) | [image](screenshots/before-unavailable-1280.png) |
| After · actual GET denied | [image](screenshots/after-unavailable-actual-get-320.png) | [image](screenshots/after-unavailable-actual-get-390.png) | [image](screenshots/after-unavailable-actual-get-1280.png) |
| After · synthetic receipts | [image](screenshots/after-synthetic-evidence-320.png) | [image](screenshots/after-synthetic-evidence-390.png) | [image](screenshots/after-synthetic-evidence-1280.png) |
| After · synthetic loading, reduced motion | [image](screenshots/after-synthetic-loading-reduced-motion-320.png) | [image](screenshots/after-synthetic-loading-reduced-motion-390.png) | [image](screenshots/after-synthetic-loading-reduced-motion-1280.png) |

## Risks, review and rollback

The source status accent means an RPC snapshot passed the existing acceptance boundary; it does not mean a safe or verified project. The nearby unknowns and per-control labels make that distinction explicit. A short mint in the Brief is orientation only; the full exact address remains in the account readout and receipt. Concerns moving earlier makes the full supply readout further down; the direct Onchain evidence action avoids a long search. Historical results remain compact and lead with their dated explanation.

The page can be long when every concern receipt is expanded. This is intentional optional evidence density, not a mandatory reading path. Automated checks cannot establish five-second human comprehension, VoiceOver quality or physical Safari behavior. Those remain founder acceptance work.

Review/merge belongs to the owner. **No merge or manual deployment was performed.** If the merged presentation regresses, the owner can revert this PR's merge commit through the normal reviewed release path. There is no migration, data rewrite, environment variable, credential, server permission or collection change to undo. Do not use rollback as a reason to activate GET lookup, the canary, a scheduler or archive publication.
