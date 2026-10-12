# SCOUT AutoDev: rollout plan

## Phase 1 — Safe automation
GitHub Actions already collects reward snapshots and checks builds. Add a small issue backlog and PR-only coding agent. Protect main with required CI and human review.

## Phase 2 — Bounded coding runs
Use a connected coding agent with least-privilege GitHub access, branch-only writes, and a per-task budget. Trigger it only for labeled, approved issues; don't run a costly LLM every hour. Allow one active coding task at a time.

## Phase 3 — Continuous product learning
Gather privacy-conscious, aggregated usage telemetry and opt-in user feedback. Summarize trends daily or weekly, propose issues, and require human approval before implementation.

## Cost controls
- Use deterministic scripts for fetching, transformations, and calculations.
- Cache third-party API results and avoid repeated calls.
- Batch similar small fixes into one PR.
- Use lower-cost model settings for triage and straightforward tasks; stronger reasoning for high-risk changes.
- Limit retries and cap agent runtime, tokens, and external calls.
- Run typecheck/tests/build before requesting review.

## Required safety boundaries
No production secrets in agent prompts or pull-request logs. No autonomous transfers, trading, payments, token issuance, or production deployment. Maintain rollback instructions.

## Setup still required
1. Choose and connect an authorized coding agent.
2. Configure GitHub branch protection and required checks.
3. Define agent budget and allowed issue labels.
4. Validate the first branch-only PR end to end.
