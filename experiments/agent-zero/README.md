# SCOUT / AGENT 0 — private offline foundation

Issue [#149](https://github.com/fuzzysniper/scout-stonk-intel/issues/149). This is a separate loopback-only application, not a public Next.js route. It reads two existing repository files; it cannot acquire market data, query a wallet, sign, execute, reconcile a transaction or authorize capital movements. No changes to the consumer release stack or Agent B infrastructure.

**Works:** explicitly import the seven tracked exact mints; inspect original clocks and hashes; record WAIT / REJECT / SHADOW dossiers before outcomes; preserve original criteria, policy and all known evidence; register conditional paper plans; record unconfirmed manual net-asset claims; export a private hash-chained journal. Readiness blockers are interpretable, with no opportunity score or token ranking.

**Does not work yet:** genuine opportunity qualification, market-price outcomes, NAV, investment returns, SOL/cohort comparisons or independent transaction confirmation. All actual candidates are INSUFFICIENT EVIDENCE. ELIGIBLE FOR FOUNDER REVIEW is deliberately unreachable in this version. Real paper plans remain UNPRICED. The example arithmetic lives in a different, conspicuously synthetic journal.

## Run locally

Use Node 20+, run from the repository root after the normal root `npm ci`. No extra runtime dependency or credential is needed.

```sh
node experiments/agent-zero/build.mjs
node experiments/agent-zero/node_modules/.cache/build/experiments/agent-zero/server.js --ledger-dir /absolute/private/path/outside-this-checkout --port 4190
```

Windows PowerShell, from the repository root:

```powershell
node experiments/agent-zero/build.mjs
node experiments/agent-zero/node_modules/.cache/build/experiments/agent-zero/server.js --ledger-dir "$env:USERPROFILE\UNFARMD-Agent0-PRIVATE" --port 4190
```

Open **http://127.0.0.1:4190**, not `localhost`. Stop with Ctrl+C. Do not expose/tunnel this port, bind a public address, host it on Vercel or place journals in a shared/cloud-synced folder. Use a dedicated owner-only directory outside any Git checkout. POSIX files are created 0600 and directory 0700; existing directory permissions and Windows ACLs remain the owner's responsibility. These are unencrypted local files, not a multiuser authentication service.

Opening the app creates only its private directory; it does not seed either journal. Import and every record require an explicit gesture. The importer copies only earliest/latest metadata from the fixed tracked sample. No financial reward quantities are redistributed. A later explicit import can add changed/new endpoints without patching old entries.

## Four views, five research functions

- **Research:** discover the retained universe, qualify by missing evidence, inspect exact-mint dossiers, record wait/reject/shadow decisions. Mint order is lexicographic, never opportunity rank.
- **Shadow:** preregister exact token/pool/quote identity, quantity, latency, wait, horizon, gap, fee/slippage and quote budget. These are assumptions, not fills. Recorded-source outcomes remain withheld. Synthetic arithmetic demonstrates losses and constraints only.
- **Founder:** append manually checked transaction claims with original time, signature, custody label, direction and exact unsigned base units. No custody addresses/keys are needed. Every claim remains UNCONFIRMED and UNPRICED; a negative net claim signals incomplete history. One net asset leg per signature/mint; token-denominated fees may be recorded as a separate asset leg. Native SOL/lamport fee accounting and USD conversions are not implemented; never relabel native SOL as a wrapped-token mint. This is not a tax ledger or cost-basis engine.
- **Learn & evidence:** retain every admitted mint, undecided/rejected cases and missing outcomes; see ranked missing capabilities, absent benchmarks and journal head/export.

The $50 / $40 reserve / $10 sleeve / $0 live allocation is a **draft proposal, not a deposit**. The initial sleeve cannot exceed $10 or 20% of planning capital. The per-token ceiling cannot exceed the sleeve. No USD-to-quote conversion or live aggregate exposure is established. Reserve means a policy label, not an onchain lock. No leverage, required trades or automatic restart after loss.

## Verification

```sh
node experiments/agent-zero/build.mjs
node --test experiments/agent-zero/tests/engine.test.mjs experiments/agent-zero/tests/server.test.mjs
# Uses the repository's already installed consumer QA Playwright/axe packages and Chromium:
node experiments/agent-zero/tests/browser.mjs
```

No new package or root workflow is introduced. The dedicated suite is run explicitly; existing GitHub CI additionally runs the normal root tests, lint, typecheck, production build and archive check. Agent 0 is not imported by production Next.js routes. Browser QA uses disposable private journals, original repository metadata and separately labeled invented fixtures; it never records genuine founder positions.

Read [source audit](docs/SOURCES.md), [October 22 workflow](docs/DAY_ONE.md), [forward protocol and fictional dossier](docs/FORWARD_PROTOCOL.md), and [security / recovery](docs/SECURITY.md). Recorded check results and screenshots are in [QA](docs/QA.md).
