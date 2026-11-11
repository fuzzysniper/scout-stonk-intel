# Source-disabled mobile operations clarity — issue 177

Draft only, 24 October 2026. Base: latest main `eca3ad2dcead406f9aff32379c8a2bc7b0aa081f`. **Source/parent activation remains NO-GO. No production, hosted SQL, credential, deployment, host/protection or STOP action was performed.**

## Minimal presentation change

- Original feed/status and STOP are visibly **bounded v1 only**. The existing v1 request/STOP lifecycle is byte-identical; a v1 acknowledgment does not imply continuous-parent STOP.
- A separate operations card links to the existing same-origin `/api/live-events/continuous/control` shell through explicit native navigation. No prefetch, availability probe, automatic API call, token transfer or new parent capability is added. Availability is **not checked**, never inferred from a loaded dashboard.
- The existing server flags/auth/host checks and CSP still govern that shell. Default flags still produce HTTP503 **Control disabled**, not an enabled parent control. That response proves neither production SSO nor STOP.
- Manual fallback points to the owner-approved suspension of the **dedicated UNFARMD Render worker**, with service verification and independent native-closure confirmation. No Render API or Resume/start/reset action is added.

No changes to `app/api/**`, `lib/**`, A's workers, B's watchdog/scripts/SQL/auth/origin/protection, collector/data/scheduler, dependencies or deployment settings. Outlier and current consumer layout remain. Bearer, Origin, immutable-host and STOP intent contracts are unchanged. No local SQL was needed by the UI verification below.

## Verification and evidence

- Typecheck, lint (zero warnings/errors) and optimized Next production build: **PASS**.
- Existing frontend contract/transport units: **16 PASS**.
- Combined existing viewer + new operations browser checks at **320×740 and 390×844: 34 PASS** in one36.9s run. Includes source-disabled behavior, existing v1 STOP contract, token lifecycle, keyboard/focus, 200% zoom/reflow, reduced motion and asserted WCAG axe states. No external browser requests/page errors.
- Narrow operations recheck after screenshot-only focus/label cleanup: **8 PASS** in9.4s. Those are repeat checks, not eight additional distinct scenarios.
- Actual loopback parent shell navigation: HTTP503/Control disabled, private/no-store, exact existing script-hash CSP/frame denial, no query/bearer/referrer forwarding and no parent read/STOP request. [320 receipt](control-disabled-320.json) · [390 receipt](control-disabled-390.json).

| LOCAL TEST screenshots | 320 | 390 |
| --- | --- | --- |
| Parent guide and manual fallback, source disabled | [PNG](screenshots/parent-guidance-320.png) | [PNG](screenshots/parent-guidance-390.png) |
| Original v1 scope, **mocked v1 acknowledgment only** | [PNG](screenshots/v1-scope-mock-320.png) | [PNG](screenshots/v1-scope-mock-390.png) |

Visible LOCAL TEST labels distinguish these from production or physical iPhone evidence. The v1 success case uses only existing offline HTTP fixtures; it is not a genuine STOP, source observation or parent result. No accepted feed screenshot is presented as authentic. Old release screenshots were restored after regression tests.

Reproduce without SQL or source access:

```sh
bash tests/live-feed/run.sh
npx tsc --noEmit
npm run lint
npm run build
node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs --project=320 --project=390
```

## Blockers and owner decisions

1. **Inherited root-CI scope guard:** `tests/continuous-ledger/scope.test.mjs`, “original bounded beta, consumer, mint gates, collector and scheduler remain byte-identical to main ancestor,” compares all `app/consumer` bytes with the current merge base. It necessarily rejects the presentation change requested by #177. The guard's A/B checks and all source/auth gates are preserved. This draft does **not** weaken, skip or change that backend-owned test. B/owner needs to review a guard scoped to the historical aggregate or an exact presentation exception while retaining protected backend/auth/STOP checks. Until resolved, the PR is **not merge-ready**, despite passing mobile checks.
2. **Physical acceptance:** real Safari/VoiceOver, protected control navigation, authorized parent read/STOP and native closure remain unverified by this PR. Owner previously reported protected `unfarmd.com` loading, a visible unexercised v1 STOP, Control disabled and Render suspend/resume fallback. These reports are not new tests here and do not prove effective API SSO or live socket closure.
3. **Continuous-source gates:** retention/PITR rights, attributed meter/hard cutoff, independent watchdog/notifications and exact production protection/review pins remain governed by [continuous-final-gates](../operations/continuous-final-gates.md). This UI supplies no missing assurance and changes no flags.

Use the [iPhone acceptance card](IPHONE.md). Do not STOP an unused production ledger to test a screen. No requested permission to merge, deploy, change flags, execute SQL or activate a source is implied.

## Rollback

Before release, hold/close the draft. If this presentation-only commit is later independently approved and released, revert only that commit through review. This removes the link/guidance and restores prior labels; it does not stop a source or change any gate, control row, capability, CSP, counter or history. An actual incident still requires the separately approved parent STOP/manual Render procedure; never reset STOP or replay a grant.
