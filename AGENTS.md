# SCOUT Autonomous Development Contract

## Mission
Build verifiable StonkFun ecosystem intelligence. Optimize for reproducible data, accessible mobile UX, and real user value. No speculative token launches, trading execution, wallet signing, or misleading yield claims.

## Working rules
1. Work on a feature branch and open a pull request. Never commit directly to main from an autonomous coding agent.
2. Keep changes narrow and reference a GitHub issue with acceptance criteria.
3. Inspect existing code and tests before modifying anything.
4. Do not fabricate historical data, API responses, payout rates, or performance statistics.
5. Never commit credentials or expose provider keys in client-side code.
6. Include source, observation window, freshness, and limitations for all financial metrics.
7. Add tests for calculations, missing-data handling, and edge cases.
8. Run typecheck and production build; attach results to the PR.
9. Never auto-merge, deploy production, alter DNS, touch treasury, launch tokens, or make payments.
10. Escalate security, financial claims, schema changes, and dependency changes for explicit human approval.

## Agent output format
Every PR must contain: problem, change summary, evidence, tests run, risk assessment, screenshots for UI work, rollback plan, and outstanding limitations.

## First priorities
- Historical reward observations and safe cumulative deltas
- Cross-token research radar
- Evidence-linked anomalies with coverage requirements
- Subscription architecture design only (no payments or token gating)
