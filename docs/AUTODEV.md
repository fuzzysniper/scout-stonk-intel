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

## Data Health operational monitoring

[Data Health V1](DATA_HEALTH.md) documents per-token freshness/coverage, dated scheduler evidence, bounded collection summaries, optional daily operational alerts and human-approved verification. This operational view does not change the historical or Signal Lab calculations.

## Proposed independent collection trigger

[ADR 0001](decisions/0001-collection-trigger.md) compares scheduler alternatives, App privileges, costs and threats, with inactive offline preparation, mandatory setup gates, a 48-hour proving period and rollback. This is a recommendation for human review; no external scheduler, credentials, live workflow changes or activation is authorized by it.

[ADR 0002](decisions/0002-staged-trigger-adapter.md) documents the inactive Cloudflare/SQLite adapter, shared claim-before-collect policy, local CPU evidence, maximum $5/month engineering target and separate human setup/activation blockers.

[Shared collection gate](COLLECTION_GATE.md), issue #28, adds opt-in authenticated Git claim/confirmation wiring. Ordinary native/manual collection skips the integration while its flag is unset/false. The Cloudflare adapter remains inactive, and enabling the guard or any external pilot requires separate explicit human approval.

## Inactive Cloudflare staging preparation

[Issue #32 staging runbook](CLOUDFLARE_STAGING.md) prepares a standalone, SQLite-backed Worker package with current Wrangler, local-only dry-run and separate human PC deployment/removal instructions. No Cron, routes, credentials, dispatch or collection-gate activation is included. App CI and collector workflows remain unchanged.
