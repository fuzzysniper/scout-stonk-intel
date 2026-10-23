# The Outlier — focused final refinement

**Recommendation: advance the refined master for founder selection.** The original's pointed zigzag can resemble a horn or lightning cut. The refinement keeps the rounded sideways ear and replaces those points with a short rectangular tag with one missing corner. The negative-space step is blunt and downward-facing. The wool crown is unchanged; the face is slightly fuller and two design units shorter, ending at y=56 rather than y=58 in the same 64×64 coordinate space. One filled path, no added facial features.

## Deliverables

- Final [black master](../final/outlier.svg) and [bone master](../final/outlier-reversed.svg), identical geometry.
- Transparent browser-rasterized PNG samples at [16](../final/outlier-16.png), [24](../final/outlier-24.png), [32](../final/outlier-32.png), [64](../final/outlier-64.png) pixels; matching `-reversed-<size>.png` files included.
- [Responsive before/after sheet](index.html), including unchanged-wordmark pairings.
- Actual Chromium screenshots: [320px](before-after-320.png), [390px](before-after-390.png), [1280px](before-after-1280.png).
- Compact [masters and wordmark pairings](masters-and-pairings-1x.png), and [native-size pairs](native-pairs-1x.png). In each native-size pair, original is left and refined is right.

## True-size assessment

All screenshots use 100% browser zoom and device scale factor 1. The direct comparison renders both marks at 16/24/32/64 CSS pixels, not enlarged approximations. The larger 160px views explain construction; they are not the sole legibility evidence.

At 16px the refined solid face, crown and ears remain readable, with a compact asymmetric tag edge. It does **not** communicate every missing-corner detail at this size. At 24px the tag is blunter than the reviewed original; at 32–64px its downward rectangular shape reads distinctly from the curved ear. The fuller face also balances the existing bold wordmark at the unchanged 36px symbol pairing size. No alternate micro-mark, eye, scanner or new candidate has been introduced. This is a designer's visual assessment, not an uncoached human-recognition result.

## Checks and provenance

`check-final.py` verifies the six reviewed originals against their existing SHA-256 hashes, both final vectors' geometry and accessible naming, and the exact dimensions and transparent RGBA format of all eight PNG samples. [Results and final hashes](asset-checks.json). `capture.mjs` checks 32 native-size samples per viewport, image loading, no overflow, no page errors and zero external requests; [browser results](browser-results.json) identify the actual Chromium version.

Reproduce from repository root with the existing local server and QA dependencies:

```sh
python -m http.server 8141 --bind 127.0.0.1
# In another terminal:
node docs/brand/unfarmd-symbols/refinement/capture.mjs
python docs/brand/unfarmd-symbols/refinement/check-final.py
python docs/brand/unfarmd-symbols/check-assets.py
```

Original source masters, original screenshots, the original vector comparison and The Skeptic/The Escape remain unchanged. Final master geometry was authored directly for this refinement; no traced reference or third-party artwork. Founder selection and independent trademark clearance remain pending. This is not a clearance opinion or permission to publish the mark.

No app, favicon installation, production asset, backend, infrastructure or PR #137/#143 changes. All work remains in draft PR #144. Rollback: remove this refinement/final directory and the README/index links; retained original assets need no restoration. Local types/lint/build and exact-head CI outcomes are recorded in the PR.
