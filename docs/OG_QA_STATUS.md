# OG QA status — separate from frontend reward evidence

Issue [#62](https://github.com/fuzzysniper/scout-stonk-intel/issues/62) and Agent A's fix [PR #63](https://github.com/fuzzysniper/scout-stonk-intel/pull/63) own `app/api/og/route.tsx` and its tests. Frontend PR #60 does not edit that route or consume an unmerged fix.

Current result on `c50569b`: **103 frontend browser checks pass; the real token OG request fails; full browser QA exits 1.** Latest main was re-fetched at 2026-10-15 00:59 UTC and still did not include #63. The post-merge combined rerun is pending that human-reviewed merge; no image-delivery pass is claimed.

The original failure was independently reproduced on unchanged main `49ab560`: the token image request terminated, with Satori requiring explicit display on a multi-child div. [Pinned baseline evidence](evidence/reward-clarity-baseline-social-preview.json). Merged #61 (`c50569b`) did not change that route. A release/archive smoke pass is not evidence that token OG images render.

The current integration browser run requests the real existing `/api/og?mint=<exact token mint>` URL, checks HTTP200, image/png and actual PNG bytes, and writes its outcome to [the separate OG probe](evidence/reward-integration-og.json). It finishes all independent frontend checks and records their [QA result](evidence/reward-integration-qa.json), but exits 1 if image delivery fails. No exception is converted into a success or a mocked image.

Agent A reported a working separately built renderer in PR #63. This is **not** merged combined validation for #60. After the human-reviewed fix is merged into main:

1. Fetch latest main and rebase the existing #60 feature branch. Do not merge/cherry-pick an unreviewed OG branch or edit its API files from this frontend task.
2. Reinstall locked dependencies if changed; rerun app/reward tests, typecheck, lint, clean production build, archive checks and release smoke.
3. Start that merged production build, refresh genuine mobile/desktop captures and run the full browser command from [the integration report](REWARD_EVIDENCE_INTEGRATION.md), including all reward fixtures and the real OG request. Preserve pre-fix evidence separately before refreshing current results.
4. Only a successful combined run can mark PNG delivery passing. A physical social-app unfurl, deployed edge/cache behavior and real VoiceOver remain separate human QA; no share is sent externally by the browser test.

No auto-merge, deployment, scheduling/Cloudflare activation, wallet or treasury action is part of this process. The latest actual outcomes and baseline revision are in [verification evidence](evidence/reward-integration-verification.json).
