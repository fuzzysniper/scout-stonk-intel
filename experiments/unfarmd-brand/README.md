# UNFARMD · three private brand studies

Issue [#132](https://github.com/fuzzysniper/scout-stonk-intel/issues/132). This is a **standalone offline design prototype**, not a Next.js route, public rebrand or new product backend. The live SCOUT app is unchanged. Original SVG animals are composition placeholders for art direction, not final cleared production assets.

Use Node 20.19+ (verified with 20.20.2). From repository root:

```sh
npm ci
npm ci --prefix experiments/consumer-mvp/web
node experiments/consumer-mvp/web/node_modules/vite/bin/vite.js build --config experiments/unfarmd-brand/vite.config.mjs
node experiments/consumer-mvp/web/node_modules/vite/bin/vite.js preview --config experiments/unfarmd-brand/vite.config.mjs
```

Open only localhost:

- `http://127.0.0.1:4192/?direction=escape` — cinematic escape; recommended brand-world candidate.
- `http://127.0.0.1:4192/?direction=squad` — punk editorial; ensemble / goat-led alternative.
- `http://127.0.0.1:4192/?direction=quiet` — minimal black-sheep identity.

The existing pinned consumer-prototype toolchain supplies Vite, Chromium automation and axe. No new dependency/lockfile/root script/configuration. Build output is in an ignored `node_modules/.cache` directory. No credentials, environment file, market provider, RPC or database is needed. Production preview uses a `connect-src 'none'` CSP. `vite dev` is not the review target (its HMR connection is intentionally absent from the production preview).

## What works

Direction switching, local exact-mint validation, deliberate paste and submit, invalid/empty/duplicate query recovery, preserved exact address and direction in share links, copy fallback, browser back/forward, evidence disclosures, keyboard navigation and reduced motion. The mint guard is imported directly from the existing evidence engine; it is not a looser regex or ticker resolver.

**No token facts are looked up.** A valid address gets an explicit address-only result: existence, account type, supply, controls, safety, prices and returns remain unverified. This prototype does not mount the production API clients or invent a success fixture. PULSE is labeled future research; RECEIPTS explains evidence requirements, never creates a pretend receipt. Existing API/client contracts, source-rights/freshness gates and the current three dated StonkFun examples are untouched.

## Verification

First stop any manually running 4192 preview. From root:

```sh
bash experiments/unfarmd-brand/test/run.sh
npx tsc --noEmit
npm run lint
npm run build
node experiments/consumer-mvp/web/node_modules/vite/bin/vite.js build --config experiments/unfarmd-brand/vite.config.mjs
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test --config experiments/unfarmd-brand/test/playwright.config.mjs
```

Browser QA starts both the **built static prototype** and the **actual Next production homepage** for before captures. Every browser test blocks and rejects external/API traffic; it never submits the production homepage. Screenshots and machine-readable QA go in `docs/unfarmd-brand/` only. Full repository tests and archive integrity commands/results are documented in [QA](../../docs/unfarmd-brand/QA.md).

Reproduce the original SVGs with `node experiments/unfarmd-brand/art/create-art.mjs`. They contain no script, external resources, imported art or token metrics. See the [founder review](../../docs/unfarmd-brand/README.md), [character sheet](art/character-sheet.svg) and [Midjourney briefs](../../docs/unfarmd-brand/MIDJOURNEY.md).

## Removal / rollback

This directory and `docs/unfarmd-brand/` are the entire change. Removing them removes the prototype; nothing is wired into production. No migration, setting, activation, domain or credential needs reversing. Any eventual public rebrand requires a separate selected-direction implementation and explicit owner approval.
