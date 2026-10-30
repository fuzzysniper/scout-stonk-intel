-- UNEXECUTED Neon-specific candidate; only installed by separately reviewed owner SQL.
-- No contract row, users, keys, source policy, database or login is created.
SET LOCAL ROLE unfarmd_v4_deploy_owner;
CREATE TABLE unfarmd_v4_deploy.neon_durability_contract(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),record_text text NOT NULL CHECK(octet_length(record_text) BETWEEN 1 AND 4096),
 hash text NOT NULL CHECK(hash=encode(sha256(convert_to(record_text,'UTF8')),'hex')),
 CHECK(record_text::jsonb->>'version'='unfarmd-neon-durability/1'),
 CHECK(record_text::jsonb->>'mode'='neon-safekeeper-quorum/v1'),
 CHECK(record_text::jsonb->>'projectId'='twilight-hall-57571802'),
 CHECK(record_text::jsonb->>'branchId'='br-sweet-voice-b4x4et5q'),
 CHECK(record_text::jsonb->>'database'='unfarmd_v4_pilot'),
 CHECK(record_text::jsonb->>'postgresMajor'='18')
);
CREATE FUNCTION unfarmd_v4_deploy.neon_durability_admitted(expected text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $neon$
DECLARE r unfarmd_v4_deploy.neon_durability_contract; p jsonb;
BEGIN
 SELECT * INTO r FROM unfarmd_v4_deploy.neon_durability_contract WHERE singleton=true;
 IF NOT FOUND OR (expected IS NOT NULL AND expected IS DISTINCT FROM r.hash) THEN RETURN false;END IF;
 p:=r.record_text::jsonb;
 IF p->>'version' IS DISTINCT FROM 'unfarmd-neon-durability/1' OR p->>'mode' IS DISTINCT FROM 'neon-safekeeper-quorum/v1'
 OR p->>'projectId' IS DISTINCT FROM 'twilight-hall-57571802' OR p->>'branchId' IS DISTINCT FROM 'br-sweet-voice-b4x4et5q'
 OR p->>'database' IS DISTINCT FROM current_database() OR current_database()<>'unfarmd_v4_pilot'
 OR p->>'postgresMajor' IS DISTINCT FROM '18' OR current_setting('server_version_num')::int/10000<>18
 OR pg_is_in_recovery() OR current_setting('transaction_read_only')<>'off'
 OR current_setting('synchronous_commit')<>'on' OR current_setting('synchronous_standby_names')<>'walproposer'
 OR current_setting('fsync')<>'off' OR current_setting('full_page_writes')<>'off'
 OR current_setting('neon.project_id',true) IS DISTINCT FROM 'twilight-hall-57571802'
 OR current_setting('neon.branch_id',true) IS DISTINCT FROM 'br-sweet-voice-b4x4et5q'
 OR NOT EXISTS(SELECT 1 FROM pg_settings WHERE name='neon.project_id' AND context='postmaster')
 OR NOT EXISTS(SELECT 1 FROM pg_settings WHERE name='neon.branch_id' AND context='postmaster')
 OR p->>'nativeAcceptanceSha256' IS NULL OR p->>'nativeAcceptanceSha256'!~'^[a-f0-9]{64}$'
 OR p->>'recoveryAnchorPolicySha256' IS NULL OR p->>'recoveryAnchorPolicySha256'!~'^[a-f0-9]{64}$'
 OR p->>'host' IS NULL OR p->>'host'!~'^ep-[a-z0-9-]+\.us-east-2\.aws\.neon\.tech$' OR p->>'host' LIKE '%-pooler.%'
 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND c.relpersistence='p' AND (n.nspname IN ('unfarmd_journal','unfarmd_thesis_rate','unfarmd_v4_owner','unfarmd_v4_pilot','unfarmd_v4_deploy') OR (n.nspname='public' AND c.relname LIKE 'v4_owner_%')))<>17
 OR p->>'tenantId' IS NULL OR p->>'tenantId'!~'^[a-f0-9]{32}$' OR p->>'timelineId' IS NULL OR p->>'timelineId'!~'^[a-f0-9]{32}$'
 OR p->>'tenantId' IS DISTINCT FROM current_setting('neon.tenant_id',true)
 OR p->>'timelineId' IS DISTINCT FROM current_setting('neon.timeline_id',true)
 OR NOT EXISTS(SELECT 1 FROM pg_settings WHERE name='neon.tenant_id' AND context='postmaster')
 OR NOT EXISTS(SELECT 1 FROM pg_settings WHERE name='neon.timeline_id' AND context='postmaster') THEN RETURN false;END IF;
 RETURN true;
END $neon$;
CREATE FUNCTION unfarmd_v4_deploy.assert_neon_durability() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $gate$
BEGIN
 IF unfarmd_v4_deploy.neon_durability_admitted(NULL) IS DISTINCT FROM true THEN RAISE EXCEPTION 'neon_durability_required';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $gate$;
CREATE FUNCTION unfarmd_v4_deploy.keep_neon_contract() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $keep$
BEGIN RAISE EXCEPTION 'neon_contract_immutable';END $keep$;
CREATE TRIGGER neon_contract_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON unfarmd_v4_deploy.neon_durability_contract FOR EACH STATEMENT EXECUTE FUNCTION unfarmd_v4_deploy.keep_neon_contract();
REVOKE ALL ON unfarmd_v4_deploy.neon_durability_contract FROM PUBLIC;
REVOKE ALL ON FUNCTION unfarmd_v4_deploy.neon_durability_admitted(text),unfarmd_v4_deploy.assert_neon_durability(),unfarmd_v4_deploy.keep_neon_contract() FROM PUBLIC;
GRANT USAGE ON SCHEMA unfarmd_v4_deploy TO unfarmd_v4_pilot_app,unfarmd_v4_boundary_owner,unfarmd_journal_owner,unfarmd_journal_app,unfarmd_thesis_rate_app;
GRANT EXECUTE ON FUNCTION unfarmd_v4_deploy.neon_durability_admitted(text) TO unfarmd_v4_pilot_app,unfarmd_v4_boundary_owner,unfarmd_journal_owner,unfarmd_journal_app,unfarmd_thesis_rate_app;
RESET ROLE;
-- Covers J appends/owner quotas, rate reservations and all pilot ledger mutations.
-- The original monotone STOP/fence/counter/erasure guards remain installed unchanged.
CREATE TRIGGER neon_journals BEFORE INSERT OR UPDATE OR DELETE ON unfarmd_journal.journals FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
CREATE TRIGGER neon_events BEFORE INSERT ON unfarmd_journal.events FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
CREATE TRIGGER neon_owners BEFORE INSERT OR UPDATE ON unfarmd_journal.owners FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
CREATE TRIGGER neon_rates BEFORE INSERT OR UPDATE ON unfarmd_thesis_rate.usage FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
CREATE TRIGGER neon_pilot_state BEFORE INSERT OR UPDATE ON unfarmd_v4_pilot.state FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
CREATE TRIGGER neon_pilot_permits BEFORE INSERT OR UPDATE ON unfarmd_v4_pilot.permits FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
CREATE TRIGGER neon_pilot_reports BEFORE INSERT OR UPDATE ON unfarmd_v4_pilot.reports FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
CREATE TRIGGER neon_pilot_history BEFORE INSERT ON unfarmd_v4_pilot.history FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
CREATE TRIGGER neon_tombstones BEFORE INSERT ON unfarmd_v4_deploy.tombstones FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.assert_neon_durability();
