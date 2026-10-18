# Production advisory dispositions — Issue #114

Captured 18 October 2026 on `a45f50af65484122c181f6aeb64adf330f1cefde`. Raw inputs: [before](audit-before.json), [after](audit-after.json). Audit reports **3 affected packages**, containing **37 distinct advisory objects**; the Next entry also refers to its sharp/PostCSS dependencies. Package-level aggregate severity is not an individual advisory severity.

Every entry below is removed from the installed production audit by the stated pinned version. No finding is waived on an applicability assumption. Assessment is a repository/runtime review, not an exploit reproduction or an assertion about the currently deployed service.

## Next.js 15.5.9 → 15.5.28

Repository exposure codes:

- **I — Image optimizer:** framework endpoint is reachable even without UI `<Image>` usage. Default remote allowlist is empty; SVG optimization is refused. Local benign AVIF/PNG optimization and SVG/remote refusal are tested over actual HTTP. AVIF input is supported with the patched native decoder; WebP output alone is not a mitigation.
- **R — RSC:** App Router/Server Components are used; treat framework deserialization/DoS patches as applicable.
- **C — Caching:** App Router RSC and static routes exist; do not assume framework cache advisories are unreachable.
- **W — Rewrites:** no custom Next rewrites/configuration found; patched regardless.
- **M — Middleware:** no middleware/proxy authorization layer or Pages Router i18n found; patched regardless.
- **A — Server Actions/functions:** no application `use server` action declarations or custom server found; framework remains patched.
- **N — Script/nonce:** no untrusted `beforeInteractive` script or CSP nonce usage found; patched regardless.
- **K — Cache Components:** no Cache Components configuration found; patched regardless.
- **U — Upgrade proxy:** no application WebSocket upgrade proxy found; patched framework boundary rather than relying on deployment topology.
- **X — Windows:** local/CI checks run on Linux; deployed OS was not independently inspected. Windows-specific advisory still removed by patch.

| Advisory | Individual severity | Affected installed version range | Exposure | Disposition |
| --- | --- | --- | --- | --- |
| [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | moderate | `>=10.0.0 <15.5.10` | I | Patched: 15.5.28 |
| [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | high | `>=15.5.1-canary.0 <15.5.10` | R | Patched: 15.5.28 |
| [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | moderate | `>=9.5.0 <15.5.13` | W | Patched: 15.5.28 |
| [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | moderate | `>=10.0.0 <15.5.14` | I | Patched: 15.5.28 |
| [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) | high | `>=13.0.0 <15.5.15` | R | Patched: 15.5.28 |
| [GHSA-8h8q-6873-q5fj](https://github.com/advisories/GHSA-8h8q-6873-q5fj) | high | `>=13.0.0 <15.5.16` | R | Patched: 15.5.28 |
| [GHSA-26hh-7cqf-hhc6](https://github.com/advisories/GHSA-26hh-7cqf-hhc6) | high | `>=15.2.0 <15.5.18` | M | Patched: 15.5.28 |
| [GHSA-3g8h-86w9-wvmq](https://github.com/advisories/GHSA-3g8h-86w9-wvmq) | low | `>=12.2.0 <15.5.16` | M | Patched: 15.5.28 |
| [GHSA-ffhc-5mcf-pf4q](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q) | moderate | `>=13.4.0 <15.5.16` | N | Patched: 15.5.28 |
| [GHSA-vfv6-92ff-j949](https://github.com/advisories/GHSA-vfv6-92ff-j949) | low | `>=13.4.6 <15.5.16` | C | Patched: 15.5.28 |
| [GHSA-gx5p-jg67-6x7h](https://github.com/advisories/GHSA-gx5p-jg67-6x7h) | moderate | `>=13.0.0 <15.5.16` | N | Patched: 15.5.28 |
| [GHSA-mg66-mrh9-m8jx](https://github.com/advisories/GHSA-mg66-mrh9-m8jx) | high | `>=15.0.0 <15.5.16` | K | Patched: 15.5.28 |
| [GHSA-h64f-5h5j-jqjh](https://github.com/advisories/GHSA-h64f-5h5j-jqjh) | moderate | `>=10.0.0 <15.5.16` | I | Patched: 15.5.28 |
| [GHSA-c4j6-fc7j-m34r](https://github.com/advisories/GHSA-c4j6-fc7j-m34r) | high | `>=13.4.13 <15.5.16` | U | Patched: 15.5.28 |
| [GHSA-492v-c6pp-mqqv](https://github.com/advisories/GHSA-492v-c6pp-mqqv) | high | `>=15.4.0 <15.5.16` | M | Patched: 15.5.28 |
| [GHSA-wfc6-r584-vfw7](https://github.com/advisories/GHSA-wfc6-r584-vfw7) | moderate | `>=14.2.0 <15.5.16` | C | Patched: 15.5.28 |
| [GHSA-267c-6grr-h53f](https://github.com/advisories/GHSA-267c-6grr-h53f) | high | `>=15.2.0 <15.5.16` | M | Patched: 15.5.28 |
| [GHSA-36qx-fr4f-26g5](https://github.com/advisories/GHSA-36qx-fr4f-26g5) | high | `>=12.2.0 <15.5.16` | M | Patched: 15.5.28 |
| [GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) | high | `>=13.0.0 <15.5.21` | A | Patched: 15.5.28 |
| [GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x) | high | `>=14.1.1 <15.5.21` | A | Patched: 15.5.28 |
| [GHSA-68g3-v927-f742](https://github.com/advisories/GHSA-68g3-v927-f742) | moderate | `>=13.0.0 <15.5.21` | C | Patched: 15.5.28 |
| [GHSA-4633-3j49-mh5q](https://github.com/advisories/GHSA-4633-3j49-mh5q) | moderate | `>=13.0.0 <15.5.21` | C | Patched: 15.5.28 |
| [GHSA-4c39-4ccg-62r3](https://github.com/advisories/GHSA-4c39-4ccg-62r3) | moderate | `>=13.0.0 <15.5.21` | A | Patched: 15.5.28 |
| [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) | high | `>=12.0.0 <15.5.21` | W | Patched: 15.5.28 |
| [GHSA-q8wf-6r8g-63ch](https://github.com/advisories/GHSA-q8wf-6r8g-63ch) | moderate | `>=15.5.0 <15.5.21` | I | Patched: 15.5.28 |
| [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp) | moderate | `>=13.0.0 <15.5.21` | A | Patched: 15.5.28 |
| [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) | critical | `>=13.4.0 <15.5.24` | X | Patched: 15.5.28 |
| [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) | critical | `>=10.0.0 <15.5.24` | I | Patched: 15.5.28 |
| [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) | moderate | `>=15.0.0 <15.5.27` | C | Patched: 15.5.28 |
| [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) | moderate | `>=15.0.0 <15.5.27` | C | Patched: 15.5.28 |

## sharp → 0.35.5

| Advisory | Individual severity | Affected version range | Disposition |
| --- | --- | --- | --- |
| [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | high | `<0.35.0` | Patched: 0.35.5 |
| [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | high | `<0.35.4` | Patched: 0.35.5 |
| [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | high | `<0.35.5` | Patched: 0.35.5 |

## postcss → 8.5.23

| Advisory | Individual severity | Affected version range | Disposition |
| --- | --- | --- | --- |
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | moderate | `<8.5.10` | Patched: 8.5.23 |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | high | `<=8.5.11` | Patched: 8.5.23 |
| [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | moderate | `<=8.5.22` | Patched: 8.5.23 |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | high | `<=8.5.17` | Patched: 8.5.23 |

**sharp applicability:** Next loads sharp as its native image processor. Its bundled libvips/libheif/librsvg versions matter even if the app currently has no image uploads. Before: sharp 0.34.5 / libvips 8.17.3 / libheif 1.20.2 / librsvg 2.61.2. After: 0.35.5 / 8.18.7 / 1.23.5 / 2.63.2. Native benign AVIF and SVG tests exercise the loaded libraries. Do not substitute an older global libvips/librsvg build on a future host.

**PostCSS applicability:** Next’s webpack CSS loader resolves this PostCSS core. App CSS is repository-controlled; no user CSS processing, `unsafeMap`, or custom PostCSS config found. Still fix all four advisories. The follow-up GHSA-fxqj-rqcc-2cmp is **moderate**, not high; high is the package aggregate because GHSA-6g55-p6wh-862q and GHSA-r28c-9q8g-f849 are high. Tests prove an untrusted absolute `.map` without `from` and traversal from a known CSS file do not disclose a generated non-secret sentinel. Adjacent maps with `from` still work; actual production CSS build and browser styling also pass.

**Severity precision:** npm supplies severity but zero/empty CVSS fields for several of these advisories; those zeros are not risk scores. Public GitHub advisory pages read during this review list CVSS 4.0 9.5 for GHSA-2xp9-vwfh-vxw4, 8.9 for GHSA-wq5f-xc86-pv6w, and 6.3 for GHSA-fxqj-rqcc-2cmp. The exact npm JSON is retained unmodified; no scores are manufactured.

All known critical/high production entries now have the disposition **patched; zero remaining audit entries**. No owner risk acceptance exception is requested. Independent activation review is still required.
