# PR #60: merged reward-evidence integration

This continues the existing frontend PR after rebasing onto main `c50569bbddd43a21638a7bec2113c340dbba7a48`, including merged backend PR #61. It consumes optional `PairToken.rewardEvidence` without changing lib/API, the frontend adapter, source requests, actual application data or reward mathematics. [Backend contract and methodology](REWARD_EVIDENCE.md). [The independent OG blocker and post-merge QA procedure](OG_QA_STATUS.md).

## Compact screen and evidence meaning

The homepage, pair selector/search, 65px row geometry, default sampled-liquidity ordering, volume/name sorts and exact quote-mint boundaries are preserved. Only one neutral evidence label appears per row; financial amounts remain the sourced USD liquidity/volume snapshots. Reward amounts and their full provenance are one disclosure deeper.

| Contract state | Row label | Meaning in Details |
| --- | --- | --- |
| `interval.state: covered` | Interval covered | **Covered interval flow:** current and previous adjacent 24h counter windows passed the unchanged backend Pulse gates. Exact actual/provider boundaries, seconds, observations, maximum gaps, raw amounts and original history/mode/catalog receipts remain visible. Counter activity is not reconciled holder payment. |
| `lifetime.state: reported` with no covered interval | Lifetime reported | **Reported lifetime distribution:** the cumulative provider ledger total in exact quote-token units. Start and reconciliation cutoff are unknown. Original generation/retrieval, raw integer, decimals, reported event/recipient counts and last reported payout time are distinct fields. Not a recent earning rate. |
| `mechanism.state: verified_reward` without usable amounts | Settings verified | Official settings and exact mint identity only. No distribution amount or holder receipt is inferred. |
| `mechanism.state: verified_standard` | No reward mode | Official standard mode, without a holder reward mechanism. |
| Unverified or malformed optional evidence | Unverified | Missing/stale/unavailable claims are withheld; malformed optional evidence does not regain a stronger legacy label. |
| `holderReturn: unavailable/null` | One persistent key: Holder returns unavailable | Holder entitlement, costs and cashflows are missing. No paid-holder verification, ROI/APY, earning score or universal ranking. |

The persistent key uses the same short labels and explains all four distinctions. Its native disclosure expands the meanings, zero/unknown handling, generated-mark limits and exact-token research-link scope. Material exceptional quality keeps an amber `!`, accessible description and its specific reason in row Details. A valid settings check can coexist with unavailable lifetime/interval evidence. A partial catalog can support a named token's reported lifetime value without supporting complete coverage or any covered interval.

Lifetime/interval values stay canonical decimal **strings**; they are never converted through JavaScript floating-point numbers or annualized. A genuinely reported lifetime or interval zero remains zero, with no inference that a holder was paid. Null values remain unavailable. Source retrieval/evaluation times are never substituted for actual payout/observation boundaries. The current-minus-previous counter difference is labeled as such, not a return.

## Frontend boundary and legacy compatibility

`readRewardEvidence` in `app/pairs/results.ts` validates the optional object against the already validated selected catalog. It checks the exact token/quote mint, symbol/registry decimals, source receipt/revision membership, fixed lookup URL, source dates as of the server evaluation, state/value consistency, canonical raw/string amounts, ledger bounds and counts, window continuity/metadata, history revision, unknown holder returns, incomplete/non-atomic scope and withheld rankings. It does not request providers or recalculate history from fabricated points; the backend's strict eligibility gates remain authoritative. Genuine browser coverage includes reported lifetime evidence within a degraded/partial sample; unit coverage also checks an isolated partial-source case and independent source/identity and period failures.

Absent field means an older compatible response: use dated legacy settings; no new lifetime or covered-interval figure is inferred. Gated legacy counter observations remain separately labeled **Legacy recorded counter change** in Details, with their actual interval; they cannot promote the row to Interval covered. Present-but-invalid/null/unknown-version optional evidence is different: show Unverified with a validation warning, withhold optional values and retain the independently sourced market row. A present explicit stale/unavailable result takes precedence over legacy flags. Tests include an old `rewardModeVerified: true` with newly stale evidence; it stays Unverified.

Only type imports refer to the merged lib contract. Production integration edits are in `app/pairs/explorer.tsx` and `app/pairs/results.ts`; existing PR CSS/mint marks stay unchanged. No backend/lib/API/OG, data, collector/scheduler, workflow, Cloudflare, wallet or treasury edits.

## Genuine before/after and critical review

Before is the previous PR #60 UI rebased onto #61 (`8c579fd`), built separately from a git archive before integration edits. After is the integrated UI. Both use real production requests with exact NVDAX mint `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh`. No route interception, injected values, image editing or fixture screenshots. The scripts preserve the earlier `reward-clarity-*` evidence and use a distinct `reward-integration-*` prefix.

| Viewport | Before | After |
| --- | --- | --- |
| 320 × 844 | [Before](screenshots/reward-integration-before-320.png) | [After](screenshots/reward-integration-after-320.png) |
| 390 × 844 | [Before](screenshots/reward-integration-before-390.png) | [After](screenshots/reward-integration-after-390.png) |
| 1280 × 844 | [Before](screenshots/reward-integration-before-1280.png) | [After](screenshots/reward-integration-after-1280.png) |

390px before:

![Previous PR compact results before optional evidence consumption](screenshots/reward-integration-before-390.png)

390px after:

![Integrated NVDAX results with reported lifetime evidence and no claimed returns](screenshots/reward-integration-after-390.png)

[Expanded key](screenshots/reward-integration-after-key-390.png) · [Real reward/source Details](screenshots/reward-integration-after-details-390.png) · [Volume view](screenshots/reward-integration-after-volume-390.png).

[Before source/geometry recording](evidence/reward-integration-before.json) began at 2026-10-15 00:53:26 UTC: only 25 rows from one of two bounded pages because a page was unavailable; 11 mode-check attempts, three reported lifetimes in the response, but the old UI did not consume them. [After recording](evidence/reward-integration-after.json) began at 00:54:25 UTC: 50 rows from two bounded pages, 12 mode-check attempts, seven reported lifetimes and 43 unverified rows. The sample remains degraded, incomplete and non-atomic; no covered interval or holder return is supported. These are independent changing source captures, not a fixed-universe return comparison or evidence that this frontend increased coverage. The first six rows remain 65px and fully visible at every width; raw identities, receipts, coverage and geometry are preserved in the recordings.

The real journey still opens SI and CHONK evidence and exact existing dossier links. Links share the current individual token dossier, not a frozen pair sample or two-token comparison. Clipboard denial/missing capability has a selectable exact-URL fallback, and native share testing stubs the picker without sending a report externally. The unchanged token OG image is tested separately, never conflated with reward evidence.

Critical five-second self-review, not a human acceptance pass:

- Lifetime reported is visibly different from Settings verified and Unverified while preserving the compact market scan. The key explicitly says cumulative and unavailable returns; no positive-rate badge or green profit state appears.
- Seven supported cumulative totals are useful research evidence, but the live capture still cannot answer recent earning pace, eligible holder payments or ROI. Opening Details exposes this limit and the original receipts.
- At 320px, long names truncate; accessible names, titles and Details preserve full identity. The longer key adds one text line while six rows remain visible. Generated mint marks remain visual aids, not official token artwork or identity proof.
- Full interval display is tested only with clearly synthetic covered/zero fixtures; the genuine source sample supplies none. Do not present those fixtures as live screenshots or claim live interval availability.
- Human comprehension of the final integrated screen, physical iPhone/VoiceOver testing and social-app unfurl validation remain pending. Prior feedback (“Hasn’t verified much ... memecoin icons ...”) is not a pass for these acceptance criteria.

## Validation and reproduction

Completed locally: 411 app JavaScript tests, 62 Python tests and 15 scheduler tests; zero failures. The full browser command passed 103 frontend checks and failed the independent existing OG probe (exit 1). Homepage PNGs match the rebased previous PR exactly at all three widths. These results do not claim a human comprehension pass or a working social-app preview.

`npm ci`, all app/Python/scheduler tests, typecheck, lint, production build, archive append-only/reproduction, archive dry-run and local release/archive smoke are required. The complete [verification record](evidence/reward-integration-verification.json) records actual command outcomes; [mobile/reward QA](evidence/reward-integration-qa.json) records each frontend check. The OG outcome has its own [probe record](evidence/reward-integration-og.json), and a failed image request leaves full browser QA nonzero.

```sh
npm ci --cache /tmp/scout59-npm-cache
SCOUT_REWARD_UI_FIXTURES=/tmp/scout60-ui-fixtures.json npm test
npx tsc --noEmit
npm run lint
npm run build
bash scripts/archive-tool.sh check origin/main
npm run archive:dry-run
NODE_USE_ENV_PROXY=1 npm run start -- --hostname 127.0.0.1 --port 3174
# Other terminal; before was separately built/served on port 3173.
SCOUT_VERIFY_ENV_PROXY=1 npm run verify:release -- --base http://127.0.0.1:3174 --target preview
python3 tests/reward-clarity-capture.py --base http://127.0.0.1:3174 --phase after --prefix reward-integration
python3 tests/reward-clarity-browser.py --base http://127.0.0.1:3174 --axe /tmp/scout-qa/package/axe.min.js --prefix reward-integration --reward-fixtures /tmp/scout60-ui-fixtures.json
```

Synthetic frontend scenarios are generated with the merged backend and an offline synthetic fetcher through `tests/reward-evidence-ui-fixtures.mjs`. The optional `/tmp` export is only test input. It includes covered/zero windows, lifetime/zero/precise strings, settings-only, standard, stale source/evaluation/lifetime and 429. Mutations cover invalid mint/source/return/amount/null evidence. All three widths exercise sorting without requests, source Details, 200% reflow, keyboard/touch, 44px targets and axe A/AA. Network permission is needed for local Chromium/Miniflare sockets and the genuine app's bounded upstream reads; no provider budgets or app requests are widened. Environment tools only: Playwright, Chromium, axe 4.10.3 and Pillow; no dependency change.

Rollback is reverting the integration commit to return to the previous #60 UI; reverting the entire feature PR restores main's frontend. No migration or external financial state needs undoing. PR #60 remains human-review only; no merge, deployment or activation.
