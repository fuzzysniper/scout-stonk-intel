# UNFARMD — independent sheep symbol study

> **Current preferred candidate:** [The Outlier refinement](refinement/README.md), with final black/bone masters and true-size before/after evidence. The original study below is retained unchanged as the reviewed baseline.

Three original, manually authored vector directions for the founder's P0 symbol brief. **Exploration only; nothing is installed into the product.** Latest main at creation: `dfd903b0a3a62966bbbc8f545a27c118048ad1ef`. PR #137 and #143 remain untouched.

## Open the work

- [Vector comparison sheet](comparison.svg): both monochrome treatments, native 16/24/32/64px samples and existing-wordmark pairings.
- [Responsive browser sheet](index.html): full art direction and rationale.
- Actual Chromium screenshots: [desktop](screenshots/comparison-1280.png), [390px](screenshots/comparison-390.png), [320px](screenshots/comparison-320.png), [native-size vector sheet](screenshots/vector-sheet-1200.png).

| Direction | Original black master | Reversed bone | Construction / intent |
| --- | --- | --- | --- |
| The Outlier | [SVG](assets/outlier.svg) | [SVG](assets/outlier-reversed.svg) | One solid path; three restrained wool lobes, long ovine face, sideways ears and a broken tag cut into the right ear. Rebellion through the silhouette. |
| The Skeptic | [SVG](assets/skeptic.svg) | [SVG](assets/skeptic-reversed.svg) | One even-odd path; reduced crown and one negative-space half-lidded eye. Doubt without a grin or cartoon expression. |
| The Escape | [SVG](assets/escape.svg) | [SVG](assets/escape-reversed.svg) | One uninterrupted open stroke, 4/64 units wide. The contour starts and ends at the interrupted right ear. Asymmetric crown and face. |

## Recommendation: The Outlier

The original solid silhouette is the most dependable primary mark. At native 16px the ears, tapering face and crown remain readable as one mass. The tag break becomes a small asymmetric edge; its full broken-tag interpretation reads better at 24px and above. Do not pretend every concept detail survives a favicon.

The Skeptic's eye is legible at 32/64px but becomes an ambiguous light pixel at 16px. The Escape remains an ovine outline at 16px, but its one-pixel stroke and ear interruption are more sensitive to rasterization. Prefer it for larger editorial applications rather than the primary favicon. These are design observations from the supplied Chromium images, **not measured human-recognition results**.

At the 36px wordmark pairing size, The Outlier's solid weight balances the existing bold UNFARMD type better than the outline. Its detail stays in the periphery rather than competing with the name. The pairing retains PR #137's Arial 800, 27px/1, −1.7px tracking, 4px arrow gap and original diagonal arrow geometry. Only monochrome color is applied for this study; the wordmark is not redesigned. Existing illustrations, scanner, homepage and approved identity are unchanged.

## Geometry and provenance

Each master uses a 64×64 coordinate space with optical margins. No font, raster image, external resource, stock vector, filter, gradient, mask or script is embedded. The black versions use `#000`; reversed versions use approved bone `#e8e0cd` on approved charcoal `#191e18`. Reversed copies have identical path geometry. All six symbols are 374–447 bytes, with meaningful accessible names. Source geometry is editable directly in the masters; no vector optimization dependency or generator is required.

Created as original path geometry for this request; not traced from a supplied screenshot or third-party mark. [Asset checks and SHA-256 hashes](asset-checks.json) identify the reviewed files. Original authorship is **not** a commercial-rights opinion or trademark clearance. Founder selection and independent similarity/trademark review remain required before public adoption. No uniqueness search or clearance is claimed. No new brand application, live data or product capability is asserted.

## Reproduce

From repository root:

```sh
python docs/brand/unfarmd-symbols/check-assets.py
python -m http.server 8141 --bind 127.0.0.1
# In a second terminal, using the existing consumer QA dependencies:
node docs/brand/unfarmd-symbols/capture.mjs
```

The capture script uses existing Playwright and system `/usr/bin/chromium`, with device scale factor 1, so the 16px samples really render at 16 device pixels. It asserts 24 native-size samples per viewport, successful image loading, no horizontal overflow, no page errors and zero non-local requests. It also captures the standalone SVG sheet at its intrinsic 1200×920px. [Machine-readable browser results](browser-results.json) identify the tested Chromium version. No physical-device or human comprehension testing is claimed.

## Release isolation and rollback

All changes live under this documentation directory. No app import, public asset, favicon, package, dependency, runtime route, provider, permission, workflow or deployment changes. This does not gate or delay the authentic SCOUT IT launch. Reject/delete the exploration branch or revert its documentation commit; no runtime rollback is needed. Any future implementation needs a separate, explicitly approved change.

## Repository verification

Local `npx tsc --noEmit`, `npm run lint` and `npm run build` pass using the existing Node 20 toolchain. Full `npm test` and append-only archive results are reported on the draft PR. The first regression invocation stopped because this environment's PostgreSQL binary directory was not set; the rerun uses the existing isolated PostgreSQL 17 fixture via `SCOUT_TEST_PG_BIN` (synthetic/local data only). No repository configuration was changed to accommodate the environment. The generated `next-env.d.ts` build change was discarded, keeping the diff documentation-only.
