# Residual development-tool advisories

The requested production audit is clean. An additional **full root audit** including development dependencies returns **exit 1: 8 high + 1 moderate affected packages**. These are not nine distinct vulnerabilities: transitive parent entries repeat underlying advisory exposure. Exact output: [audit-all-after.json](audit-all-after.json); installed paths: [development-tree.txt](development-tree.txt).

The installed vulnerable leaf packages below are exclusively in `miniflare@3.20250718.3` (local scheduler/SQLite test harness) and `eslint-config-next@15.5.28` (lint glob matching). No application/server import of these tooling packages was found, and no listed package appears in the generated Next server file traces. This is evidence of the dependency boundary, not permission to run tooling on untrusted inputs or a guarantee covering Next’s separately bundled internal code.

They remain **unresolved development risks**, not waived or described as harmless. Miniflare’s offered audit fix is a major-version 4 migration; blindly applying it would change the scheduler test runtime, outside the requested security patch scope. The linter fix suggestion is a major-version downgrade to eslint-config-next 14.2.35; it is not accepted as a safe remediation for Next 15. Keep local emulators loopback-only, run tests without production credentials, and do not feed attacker-controlled patterns, multipart/HTTP/WebSocket bodies into these tools. Any hosted build/test secret access needs separate owner security review. Do not run `npm audit fix --force`.

| Leaf package / installed version | Advisory | Severity | Residual disposition |
| --- | --- | --- | --- |
| `@fastify/busboy@2.1.1` | [GHSA-x8mw-p69m-v3mx](https://github.com/advisories/GHSA-x8mw-p69m-v3mx) | high | Unresolved; Local Miniflare harness; excluded from production audit |
| `@fastify/busboy@2.1.1` | [GHSA-gxm5-99cw-xjw9](https://github.com/advisories/GHSA-gxm5-99cw-xjw9) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `braces@3.0.3` | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | high | Unresolved; Lint glob matching; excluded from production audit |
| `undici@5.29.0` | [GHSA-g9mf-h72j-4rw9](https://github.com/advisories/GHSA-g9mf-h72j-4rw9) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-2mjp-6q6p-2qxm](https://github.com/advisories/GHSA-2mjp-6q6p-2qxm) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-vrm6-8vpv-qv8q](https://github.com/advisories/GHSA-vrm6-8vpv-qv8q) | high | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-v9p9-hfj2-hcw8](https://github.com/advisories/GHSA-v9p9-hfj2-hcw8) | high | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-4992-7rv2-5pvq](https://github.com/advisories/GHSA-4992-7rv2-5pvq) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-p88m-4jfj-68fv](https://github.com/advisories/GHSA-p88m-4jfj-68fv) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q) | high | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-g8m3-5g58-fq7m](https://github.com/advisories/GHSA-g8m3-5g58-fq7m) | low | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-35p6-xmwp-9g52](https://github.com/advisories/GHSA-35p6-xmwp-9g52) | low | Unresolved; Local Miniflare harness; excluded from production audit |
| `undici@5.29.0` | [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) | low | Unresolved; Local Miniflare harness; excluded from production audit |
| `ws@8.18.0` | [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) | moderate | Unresolved; Local Miniflare harness; excluded from production audit |
| `ws@8.18.0` | [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) | high | Unresolved; Local Miniflare harness; excluded from production audit |

Aggregate affected entries are `@fastify/busboy`, `undici`, `ws`, `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next` (all high) and `miniflare` (moderate). Owner follow-up: separately review a compatible linter dependency resolution and the Miniflare major migration without altering deployed scheduling. A zero-production audit must never be represented as a clean full-development audit.
