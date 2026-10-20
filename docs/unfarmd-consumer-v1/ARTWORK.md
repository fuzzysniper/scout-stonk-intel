# Replaceable art / owner handoff

The final selected Midjourney original has **not been imported**. No chat screenshot was downloaded, reconstructed, scraped or passed to an image service. The current artwork is original locally authored SVG geometry, visibly labeled **“Original vector placeholder · final artwork pending”**. It is not presented as a licensed final production file or a cleared trademark.

## One explicit seam

[`app/consumer/brand/art.ts`](../../app/consumer/brand/art.ts) supplies local desktop/mobile/avatar/crew paths, intrinsic dimensions, alt text, placeholder status and caption. [`identity.tsx`](../../app/consumer/brand/identity.tsx) renders a native `<picture>` with an original high-priority desktop/mobile hero, no remote image host or backend dependency. The CSS reserves its aspect ratio to avoid loading shifts. Hero art renders only on idle; no mascot or marketing image pushes real result evidence down.

| Asset | Current dimensions | Usage / replacement specification |
| --- | --- | --- |
| `escape-desktop.svg` | 800×720 | Single sheep, full readable silhouette, reserved right-side visual on desktop. Supply an optimized owner-approved 1600×1440 WebP/AVIF/PNG master or conforming ratio; suggested compressed delivery ≤150 kB. |
| `escape-mobile.svg` | 720×380 | Recompose, do not blindly crop desktop. Keep amber eyes, broken tag and optical scanner legible at 284/346px. Suggested 1440×760 master, compressed ≤75 kB. |
| `sheep-avatar.svg` | 240×230 | Same head/eyes/tag reduced to an icon; no scanner detail required at 32px. Homepage icon only; existing global favicon and legacy routes stay intact. Review optical reductions at 16/32/64px. |
| `crew.svg` | 640×180 | Optional supporting cast in a closed below-fold lore disclosure. No second primary mascot above the fold. Keep separate from the hero asset. |

The byte targets are handoff goals, not a paid-service requirement or an assertion about an asset not supplied. Keep filenames local under `public/consumer/unfarmd/`. Do not hotlink a generator CDN, introduce a remote-image config, embed base64, add runtime filesystem reads or put text/CTA/token metrics in the illustration. No wallet/portfolio details, copied meme-IP, weapons, named villains or implied safety/financial approval seals.

## Owner steps, before committing final art

1. Supply the original downloaded/upscaled output, not a chat/portfolio screenshot. Record creator/tool/model, generation date, source original SHA-256 and artist revisions. Do not provide keys, accounts or secrets.
2. Review current tool/subscription terms, any artist agreement and actual intended public/commercial usage. Confirm no recognizable third-party IP or private information. This branch has not established legal clearance, exclusivity or commercial permission for a future image.
3. Deliver separate optimized mobile and desktop compositions. Lock skeptical amber half-lidded eyes, thick charcoal wool, broken tag and compact acid-lime **optical** scanner. Supporting animals stay secondary/below fold; dusty coral remains restrained.
4. Add the approved files locally and edit `art.ts` paths, truthful alt text and caption together. Change `status` and remove the placeholder caption only in a separately reviewed owner-approved change with documented provenance/rights. If ratio changes, update intrinsic sizes and the two reserved CSS aspect ratios deliberately; rerun the first-viewport checks.
5. Recheck at 320/390/1280, reduced motion, increased text, slow/missing-image load and VoiceOver. Text/input/CTA/source status must work even without the illustration. Final art never becomes evidence about a token.
6. Name/trademark/domain review and a separate production deployment GO remain independent. Do not alter existing routing, canonical domain, source permissions or acquisition budgets when replacing art.

## Reproduce current originals

```sh
node app/consumer/brand/generate-placeholder.mjs
```

This writes only the four local SVG placeholders. The generator is not imported by a runtime component, does not access a source service or need credentials, and creates no token observations. The current avatar and both hero compositions share the same authored head geometry so their eyes/tag remain consistent.
