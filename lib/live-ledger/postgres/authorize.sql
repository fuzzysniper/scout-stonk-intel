-- SEPARATE OWNER SOURCE GO ONLY. psql variables are nonsecret metadata, never credentials.
-- Supply session UUID, actual Render head, start_utc/end_utc (<=1h), verified integer credit weights/cap.
-- Do not run with mint-proof role. No resets, reauthorization, migration or credential provisioning here.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='2s';
SET LOCAL lock_timeout='500ms';
SET LOCAL search_path=pg_catalog;
CREATE TEMP TABLE scout_live_authorized(id boolean) ON COMMIT DROP;
WITH authorized AS (
 UPDATE scout_live.control SET approved=true,session=:'session'::uuid,head=:'head',
 starts_at=:'start_utc'::timestamptz,expires_at=:'end_utc'::timestamptz,
 connection_credits=:'connection_credits'::bigint,rpc_credits=:'rpc_credits'::bigint,
 credit_limit=:'credit_limit'::bigint,terms_approved=true,quota_approved=true
 WHERE id AND NOT approved AND NOT stopped AND session IS NULL AND worker IS NULL AND fence IS NULL
 AND connections=0 AND rpc=0 AND finalized=0 AND credits=0 AND ticket=0
 AND gaps=0 AND errors=0 AND frames_received=0 AND bytes_received=0
 AND :'start_utc'::timestamptz>=clock_timestamp()-interval '30 seconds'
 AND :'end_utc'::timestamptz>clock_timestamp()+interval '1 minute'
 AND NOT EXISTS(SELECT 1 FROM scout_live.events)
 RETURNING id
) INSERT INTO pg_temp.scout_live_authorized SELECT id FROM authorized;
DO $check$
BEGIN
 IF (SELECT count(*) FROM pg_temp.scout_live_authorized)<>1 THEN RAISE EXCEPTION 'NO_GO_initial_authorization_only'; END IF;
END $check$;
COMMIT;
