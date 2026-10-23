-- OWNER ONLY after separate continuous GO. reviewed_grant is NONSECRET reviewed JSON.
-- No reset, rearm, old policy mutation, schema install, defaults or credential values.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='2s';
SET LOCAL lock_timeout='500ms';
SELECT scout_continuous.initialize(:'reviewed_grant'::jsonb) AS immutable_grant_sha256;
COMMIT;
