# Issue181 — reviewed A+B+C composition, source NO-GO

This aggregate is a **draft for human code review**, not a source/host/SQL/STOP grant. No production change, credential installation/read, hosted SQL, Helius/Telegram/Render request, paid host, merge or activation was performed. No new session/window is selected. Preserve all existing bounded and expired mint-proof history.

## Immutable inputs

| Input | Reviewed SHA | Base→input binary/full-index diff SHA-256 |
| --- | --- | --- |
| Main (includes scheduled collector history) | `eca3ad2dcead406f9aff32379c8a2bc7b0aa081f` | unchanged data/workflows |
| [A#179](https://github.com/fuzzysniper/scout-stonk-intel/pull/179) | `0cb2fe813239fc81c73a6f38d2c2c4977ed00a41` | `0958e6e4098fac81326d5d88d64df90b63543833d00e0bf478ec8d87b8b35b86` |
| [B#180](https://github.com/fuzzysniper/scout-stonk-intel/pull/180) | `e045133c3cd94bf2be743e0c3fbdd12090212953` | `5e282b8b3b18068616b9b2b12486575fd645318fceb028f8d999eaaea24d6325` |
| [C#178](https://github.com/fuzzysniper/scout-stonk-intel/pull/178) | `6d978a468c9fb9ab6365a8d169866899acc13ba1` | `c9fbee48266d1c88b73394f541830610384260abafd24bb68b1e9097e6eade39` |

All three exact source commits are merge parents/ancestors of this new branch. Their original PRs remain untouched, unmerged drafts. No source bytes are rewritten:32 source files =A7+B10+C15. Six integration-only paths add this record, a32-file SHA-256/mode manifest, test helpers/mutation tests and the two narrow historical guard corrections. The aggregate PR/checks identify its final immutable head; a future source-head change requires a new independent review, never automatic repinning.

## Why two historical guards failed

The original scope test froze the entire bounded worker and consumer against main. A adds only offline audit/test files and edits three documents; C changes only three presentation files. Both therefore fail that historical assertion. The legacy release contract separately freezes the same consumer against `0111d06672cd8a30a7416534a7ceddd70255e19e`; C also correctly trips it. We reproduced both failures on the combined tree before adaptation. They are not runtime/provider failures.

The original tests remain active. They now require **exact old AND exact new content/mode for every reviewed exception**; all other protected paths remain byte-identical. The manifest is independently compared against the three original Git commits and pinned full-diff hashes. It is not an arbitrary allowlist or a replacement baseline. Unexpected files, altered checkpoint, changed same-name bytes, deletion, executable-mode drift and API/worker additions fail closed. Full32-file comparison catches changes outside the historical scopes. New tests also prove:

- C's entire non-render `LiveHome` logic, token/polling/STOP lifecycle and all other consumer modules are byte-identical; the guide has no imports/hooks/calls/event handlers/capabilities and only an explicit same-origin `no-referrer` native anchor. No speculative parent availability check or Next prefetch.
- A's audit is additive, report-only, statically imports only unchanged policy/reconciliation, and is unreachable from runtime imports. All worker/controller/runtime/dependencies/grant examples remain identical, including source flags, caps and SQL fingerprints.
- All APIs/auth/host/CSP/STOP, native TLS, old mint gates, data/collector/scheduler, deployment files and workflows remain identical. B's only kernel change is the already-reviewed independently reserved parallel emergency effects; no SQL/admission mutation was added.

## Offline verification

Run with locked dependencies, no service credentials, only disposable local native PG/TLS fixtures and labeled synthetic inputs:

```sh
npm ci --ignore-scripts
npm ci --prefix experiments/live-stream --ignore-scripts
npm ci --prefix experiments/consumer-mvp/web --ignore-scripts
npm test
bash experiments/live-stream/test.sh
npm run --prefix experiments/live-stream build
node experiments/live-stream/run.mjs
bash experiments/continuous-stream/test.sh
node experiments/continuous-stream/build.mjs
node experiments/continuous-stream/run.mjs
bash tests/continuous-ledger/controller.sh
node --test tests/live-release/contracts.test.mjs
bash tests/live-release/combined.sh
bash tests/live-release/end-to-end.sh
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
node tests/continuous-ledger/built-api.mjs
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/consumer-homepage/playwright.config.mjs
NODE_ENV=test NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node tests/continuous-ledger/mobile.test.mjs
bash scripts/archive-tool.sh check origin/main
```

The source-disabled browser checks include320/390/1280, token isolation, no unintended API calls, the actual local503 control shell, mock v1 STOP, keyboard/zoom/focus and axe. C's committed screenshots remain exact original **LOCAL TEST/MOCK** evidence; they are not live iPhone screenshots. Browser-generated evidence is transient and never used to repin reviewed hashes. Inspect exact-head GitHub job logs and Vercel **preview** status in the aggregate PR; preview success proves neither production protection nor actual source operation.

The frozen `continuous-offline.yml` workflow is path-filtered to the unchanged controller tree and will not newly trigger for this aggregate. Its offline worker/controller/build/default-OFF steps must still be run locally; the backend workflow also tests the exact reviewed controller against actual disposable durable B and C. Do not edit protected workflows merely to force an event. Archive generation/collector schedules are not dispatched.

## Operations: still NO-GO

1. **Meter/rights/retention:** A's arithmetic report is not authentic DATA-key usage, settlement or permission. Actual units/rounding, method pricing, per-key settled watermark, hard cutoff including already-open sockets, account allowance/reset and physical PITR/backup rights remain unproven. Six-hour recovery history does not establish1h physical erasure. Do not fabricate a provider endpoint or use project totals as per-key spend. [A packet](../live-feed-167/PILOT_EVIDENCE.md).
2. **Independent watchdog:** signed peer receipt validation, exclusive lock, file/directory fsync and high-water floors are implemented and offline-tested; no two hosts, peer signer/carrier, independent retained floor, persistent disks or timed operational acceptance is installed/proven. Synchronous stalls cannot be preempted by Node's timer. Separate10s host monitoring must actually detect them. No mobile-week coverage claim. [B acceptance](watchdog-acceptance.md).
3. **Render authority:** the fixed adapter targets only `srv-dbe1vc8m7kps73c2jju0`; code pinning does not constrain a stolen user-wide Render API key. No broad founder/old-bot/Gem Bot/Redis token may be installed. Suitable minimum identity isolation is unresolved. Control-plane suspension is not proof of native socket closure.
4. **Notification/mobile:** founder-reported manual Telegram/iPhone delivery and manual Render suspension are historical owner observations, not runtime-watchdog or automated STOP proof. Telegram `ok` proves provider acceptance only. Need independent actual delivery, monitor-loss and suspension/closure acceptance, recipient volume approval and authenticated protected-host parent STOP. C's separate navigation does not establish production SSO or authorize an incident action. [C card](../mobile-ops-177/IPHONE.md).
5. **Release/source:** no production merge/deploy, SQL, service settings, secret installation, source grant or traffic is authorized. Current Render deployed SHA `09c0916cc33ebdb2a0039f1fbb6ac68fdbf31042` and auto-deployOff are issue181 owner inventory, not a new control-plane observation. Do not relabel it with this aggregate's head. All separate owner GOs remain necessary.

## Mobile approval card / rollback

- [ ] Code-review ONLY: final aggregate SHA matches the PR; original source heads and collector bytes are preserved; all required exact-head jobs are green, with logs reviewed.
- [ ] Acknowledge source/continuous/mobile-week **NO-GO** and the five unresolved operational groups above. A green draft does not authorize activation.
- [ ] Any later release, database/identity/hosting change, notification/suspension test or source run needs its own exact-scope approval. No automatic retry/reset, boot/restart, window extension, fallback provider or paid service.

Before any authorized release, hold/close this draft to roll back preparation. After a separately approved release, revert the reviewed aggregate through a new reviewed PR; no state was changed here. An actual incident needs the separately approved permanent parent STOP/precise source suspension procedure and independent closure evidence. Preserve SQL counters/fences, spent sessions, original clocks and all journals/uncertain locks. Never clear or reinitialize them to regain a green status.
