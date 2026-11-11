# V3 Customer Zero — manual Decision Desk integration

Issue190, draft/human code review only. A functioning **manual PLAN** is an in-memory owner decision record, not an order, verified asset, investment recommendation, source approval or saved journal. WATCH and PASS remain complete outcomes. No live data is needed or connected.

## Exact composition and the necessary route exception

| Input | Reviewed SHA |
| --- | --- |
| Fresh main / collector history | `9e5264b7edd3f37aeb35113ffb8b86aa8a50b7ec` |
| C#187 | `b05095fcc6a0ea7cc9e0a0b4d15ffeb248184005` |
| A#188 | `65c42e8ee41f165c273a5bdcfaa8c63f84bce4bb` |
| B#189 | `36ede0e45046d8dba5a5163cc57ebc94434e2513` |

The three exact commits are retained as separate merge parents/ancestors. All39 nonoverlapping input files are independently matched to their original Git blobs, modes and SHA256 in `tests/desk-integration/source-manifest.json`. **38 current files remain byte-identical**. One explicitly reviewed integration delta changes `app/desk/page.tsx` to import the new integrated view and truthful title/description. Its complete resulting SHA256 is `f4e4ed7f9b8d1fede27315b78ce1c89d0970c2a05bb8706b76a205f90614f54e`; the exact full-index patch hash is pinned separately. Keeping the original route unchanged would serve the intentionally unconnected prototype and could not deliver190. This is a narrow new review, not a silent rebaseline. C's original component/model/styles/tests/screenshots and **all A/B library/test files remain unchanged**.

Additions are confined to `app/desk/integration/**`, `tests/desk-integration/**`, this document and one new read-only CI workflow. Original root/other workflows, homepage/consumer, all API/auth/CSP/Origin/STOP/TLS/source/proof gates, SQL/schema/fingerprints, collector/data/scheduler, deployment files, dependencies and infrastructure are frozen to main. The scope test rejects any other path. No #182 code/history is silently included; all four original PRs remain unmerged drafts.

## Actual flow and honest boundaries

1. **Identity:** call A's real `resolveAssetIdentity` with explicitly selected format/chain or MIC and owner input. Solana address/network stays exact; EVM needs a decimal chain ID, canonical address is lowercase; equity MIC+symbol is only a listing reference. Bare tickers remain ambiguous/null-key. Invalid/conflicting formats block PLAN. A format check does not establish mint/account/listing existence, token controls, security permanence or a supported market. An unresolved ticker may still be an explicitly manual planning reference; no mapping is fabricated.
2. **Evidence:** call A's real `evaluateEvidence` on the actual identity, **empty entries and empty sourcePolicies**. No fictitious IDs, prices, clocks, rights or facts are added from notes. Every report has `sourceGo:false`, `assetVerification:'not_verified'`, zero admitted facts and sourced PLAN component withheld. Notes remain owner assertions in B's private snapshot. No source observation time is invented. This source-evidence withholding does **not veto** a separately labeled manual PLAN.
3. **Risk:** pass owner strings to B's actual `evaluateRiskPlan`. No price/quantity float, USD/stablecoin/FX conversion, filled default risk or guessed zero. Required choices: supported long spot/USD, entry and lower priced invalidation/rationale, explicit UTC assumption time/window, capital/cash/exposure, loss and allocation limits, optional proposed units, explicit or consciously omitted costs and acknowledgement. Fees/slippage are integers in BPS. Canonical integer representation/range errors are linked to the right field; all financial math remains in B.
4. **Decision:** source and risk statuses are independent. PLAN must have actual B `recordable`, non-null bounded calculation, valid adapter/identity links and owner confirmation of manual input, possible loss beyond the plan and no execution. `recordDecision` is called again with the SAME fresh deliberate-action clock. Blank assumptions, omitted acknowledgement, malformed/expired/future/over-budget/unsupported values cannot be promoted by text completeness. WATCH/PASS use their own actual B gates; PASS needs only a reason, incomplete WATCH does not make the PLAN preview recordable. Optional `evidenceRef` has only exact keys/IDs present in A's report; this integration selects no IDs and grants no source rights.
5. **Receipt:** explicit `MANUAL PLAN / WATCH / PASS · recorded in memory`, source-unverified/asset-not-verified, not saved/executed and original record clock. Actual model values use exact strings: proposed or ceiling units, planned loss, entry cash/costs, remaining allocation and tied constraints. A ceiling is never a selected order. Worst-case loss stays **unknown**, not zero or guaranteed. Gaps, liquidity, unmodeled costs, venue lot constraints and failed exits remain unverified.

The input is owner **UTC digits**, even if the browser is in Chicago. The adapter only appends missing seconds/milliseconds and `Z`; it never treats them as local time, shifts timezone, substitutes the evaluation clock or repairs an invalid calendar. B validates the exact resulting clock and window. The clock is checked again on the deliberate record action after any idle pause. There is no periodic feed/clock refresh.

Any field edit clears the immutable receipt and both acknowledgements; the next PLAN needs fresh confirmation. Refresh/close starts empty, and pagehide/persisted-pageshow clears component state. There are no cookies, localStorage/sessionStorage/indexedDB, server actions, SQL, downloads, logging, analytics, wallet/broker connections or provider/API requests from the desk. Browser/OS history, form restoration, screenshots and forensic erasure are outside that memory-only guarantee; never enter secrets or sensitive account identifiers. Existing platform protection is unchanged; the new route does not establish new SSO or public-product authorization.

## Tests, CI and full source guards

`V3 manual Decision Desk offline integration` is a new `pull_request`-only, contents-read workflow, no schedules/dispatch, secret bindings or deploy steps. It explicitly runs both focused suites and combined tests. Existing root CI still runs the complete historical regression/native disposable PG/TLS/types/lint/build/archive suite.

**B's full171 tests are not skipped or patched.** Its historical last test asserts that only B-owned paths changed on a B branch; an aggregate necessarily cannot satisfy that branch identity. `engines.sh` first proves every current B library/test byte matches the exact source, then runs the ENTIRE original suite in a temporary detached worktree at that exact commit with the same locked dependencies. That includes the original branch-wide guard. The actual combined adapter imports those identical B bytes and is tested independently. A's entire118 suite runs directly on the aggregate; C's three original unit checks remain. There is no runtime/security/auth/STOP exception or test-env bypass. C's retained prototype browser specs describe the superseded unconnected route; the new integrated browser suite repeats their safety/decision/privacy/layout scenarios with the190 valid-manual-PLAN behavior and extra real-engine cases. It does not mislabel the old “PLAN always blocked” expectation as a passing integrated test.

Reproduce locally using only reviewed locked dependencies and standard disposable native test prerequisites:

```sh
npm ci --ignore-scripts
npm ci --prefix experiments/consumer-mvp/web --ignore-scripts
bash tests/desk-integration/run.sh
bash tests/desk-integration/engines.sh
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm test
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
node tests/live-ledger/built-api.mjs
node tests/continuous-ledger/built-api.mjs
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/desk-integration/playwright.config.mjs
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs
NODE_ENV=test NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node tests/continuous-ledger/mobile.test.mjs
bash scripts/archive-tool.sh check origin/main
```

The test PostgreSQL harness starts only a disposable local server with invented roles/passwords/events and TLS certificates. It never uses a hosted URL or existing Neon credentials. Those existing regression fixtures are not operational SQL, production compatibility or live-source evidence. Restore only known build-generated `next-env.d.ts`/legacy test screenshot changes before rerunning source-scope checks or committing; never repin original artifacts from generated output. The new screenshots are explicitly reviewed additions. Final exact-head results/counts and actual CI job links are recorded in the aggregate PR; unfinished/red checks are not counted passed. B's250 property scenarios remain250 cases inside one of its171 tests, not250 extra tests.

## Genuine local screenshots

All are captures of the optimized local app in Chromium, with a visible **LOCAL TEST / INVENTED MANUAL ASSUMPTIONS / NO VERIFIED ASSET OR LIVE DATA** label inserted by the test only. Financial values are deliberate synthetic owner entries, never fake provider output. PLAN captures focus on the actual receipt/model column; they do not hide an error or synthesize a result. Existing C images are preserved for comparison: [original mobile](../../tests/desk/screenshots/empty-390.png), [original PASS](../../tests/desk/screenshots/pass-390.png).

| Actual integrated state | 320 | 390 | 1280 |
| --- | --- | --- | --- |
| Empty / source disabled | [PNG](../../tests/desk-integration/screenshots/empty-320.png) | [PNG](../../tests/desk-integration/screenshots/empty-390.png) | [PNG](../../tests/desk-integration/screenshots/empty-1280.png) |
| Actual manual PLAN receipt + model | [PNG](../../tests/desk-integration/screenshots/plan-320.png) | [PNG](../../tests/desk-integration/screenshots/plan-390.png) | [PNG](../../tests/desk-integration/screenshots/plan-1280.png) |
| Reason-only PASS | [PNG](../../tests/desk-integration/screenshots/pass-320.png) | [PNG](../../tests/desk-integration/screenshots/pass-390.png) | [PNG](../../tests/desk-integration/screenshots/pass-1280.png) |

Desktop can compare the plan fields with the decision/model column; mobile folds the long plan form so PASS does not require traversing it. Critical cold-user check: a five-second read of a receipt should identify **manual / source-unverified / not saved or executed**, not “verified investment.” This is a professional calculation form, still longer than a simple watchlist; explicit capital/cost/time fields and BPS may need onboarding. Do not conceal those assumptions merely to reduce clicks. Local emulation/axe/focus are evidence for the implemented flow, **not actual Safari/VoiceOver/user comprehension**. Founder physical validation is pending.

## One Customer Zero mobile review card — no source/control action

- [ ] Verify the exact reviewed aggregate head and separately approved target/protection. No URL/token bypass. This draft authorizes no deployment.
- [ ] Safari/VoiceOver at320/390-equivalent width: labels, field errors, controls and source-unverified distinction read correctly; keyboard does not trap or obscure the active field; zoom and landscape reflow.
- [ ] Reason-only PASS records with no asset or price; incomplete WATCH works without a passed budget; refresh/clear removes the in-memory draft.
- [ ] Enter your own explicit hypothetical long/USD assumptions, not test fixture defaults. A valid manual PLAN records only after cost and owner acknowledgements. Read the planned-loss/cash/allocation model as conditional, not a loss guarantee or selected order.
- [ ] Wrong/old/future reference, excessive proposed size, missing cash/exposure and invalidation block recording with specific reasons. Editing clears the receipt/acknowledgements. Identity is format-only, not mint/listing existence.
- [ ] No source, account, wallet, saved journal, telemetry or trade action occurs. Do not exercise v1/parent STOP or old proof/canary from this review.

Remaining gates: actual iPhone/VoiceOver and ten real manual research sessions, any persistence/privacy/retention design, source adapter identity/rights/coverage/freshness/budgets and commercial/adviser legal review before broader personalized public use. **Unattended/Helius acquisition remains NO-GO**, including outstanding meter/cutoff/physical-retention/independent-monitor acceptance; this manual desk supplies none of those approvals. No new hosting, keys, SQL authorization or activation is requested.

Rollback before release: hold/close this draft. After any separately approved future release, revert only the aggregate through a new review, returning `/desk` to its prior route or removing it. No schema rollback, counter/fence/STOP reset, source retry or credential change is involved. Original PRs187/188/189 and182 remain unmerged; no production merge/deploy, hosted SQL, live provider, trading, paid service or source activation is authorized.
