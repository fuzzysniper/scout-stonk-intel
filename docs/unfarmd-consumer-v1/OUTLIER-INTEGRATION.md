# Outlier integration — review only

**Source of geometry:** the refined black/bone master in draft brand PR #144 at `8d1bbdf13273cff03b962208b0ba87657607cba2`. Founder selected the candidate for integration only; **commercial adoption requires independent trademark/similarity clearance**. The original SVGs and comparison assets in #144 are unchanged.

**Dependency:** this draft is based directly on PR #143 (`09c026792ec3f89f0fc72f301424b90512925dd4`), which itself depends on #137. The parent branches remain unchanged. Retarget only after explicit founder authorization and normal sequential parent merges; never force push or silently include unrelated frontend/backend changes.

**Surface:** one decorative, inline Outlier mark at the start of the existing accessible wordmark link; same exact path in file-based `app/icon.svg` and generated, statically optimized `app/apple-icon.tsx` (180×180 PNG). Existing conflicting root `favicon.ico` is retired so the browser uses the new icon. Next owns metadata icon links; no new background provider requests. Existing cinematic mascot, wordmark lettering and arrow, and Control Receipt remain unchanged.

**Founder QA:** inspect the full first screen and result-state header at 320/390/1280 and iPhone Safari (including Add to Home Screen); confirm logo balance, original mascot and normal keyboard/VoiceOver navigation. Confirm favicon icon.svg, browser tab and Apple touch icon show the same sheep on charcoal. For visibility on old cached icons, use a fresh/incognito browser rather than manipulating production settings.

**Do not merge, manually deploy, change domains or protection, invoke the preflight, activate sources or publish the new mark as cleared.** GitHub/Vercel may perform their existing automatic PR preview checks; a passing preview does not grant production release approval.
