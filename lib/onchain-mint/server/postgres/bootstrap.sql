-- ONE-TIME owner action on a reviewed empty dedicated schema. Never application startup.
-- A missing policy after bootstrap is an outage; do not rerun to reset quotas/circuit/fences.
INSERT INTO scout_mint.policy(id) VALUES('scout-helius-mint/production-v1');
