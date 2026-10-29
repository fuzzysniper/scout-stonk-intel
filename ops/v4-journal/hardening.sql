-- Additive package-only hardening. No runtime binding or policy enrollment.
REVOKE ALL ON DATABASE unfarmd_v4_pilot FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE ROLE unfarmd_v4_deploy_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE unfarmd_v4_journal_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
CREATE ROLE unfarmd_v4_auth_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
CREATE ROLE unfarmd_v4_pilot_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
CREATE ROLE unfarmd_v4_erasure_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1;
CREATE ROLE unfarmd_v4_stopper_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1;
GRANT CONNECT ON DATABASE unfarmd_v4_pilot TO unfarmd_v4_journal_login,unfarmd_v4_auth_login,unfarmd_v4_pilot_login,unfarmd_v4_erasure_login,unfarmd_v4_stopper_login;
GRANT unfarmd_journal_app,unfarmd_thesis_rate_app TO unfarmd_v4_journal_login;
GRANT unfarmd_v4_auth_reader TO unfarmd_v4_auth_login;
GRANT unfarmd_v4_pilot_app TO unfarmd_v4_pilot_login;
GRANT unfarmd_journal_erasure TO unfarmd_v4_erasure_login;
ALTER ROLE unfarmd_v4_journal_login SET search_path=pg_catalog;
ALTER ROLE unfarmd_v4_auth_login SET search_path=pg_catalog,public;
ALTER ROLE unfarmd_v4_pilot_login SET search_path=pg_catalog;
ALTER ROLE unfarmd_v4_erasure_login SET search_path=pg_catalog;
ALTER ROLE unfarmd_v4_stopper_login SET search_path=pg_catalog;
-- Rate SECURITY DEFINER objects must not be owned by the migration administrator.
ALTER SCHEMA unfarmd_thesis_rate OWNER TO unfarmd_v4_deploy_owner;
ALTER TABLE unfarmd_thesis_rate.usage OWNER TO unfarmd_v4_deploy_owner;
ALTER FUNCTION unfarmd_thesis_rate.reserve(uuid,text) OWNER TO unfarmd_v4_deploy_owner;
CREATE SCHEMA unfarmd_v4_deploy AUTHORIZATION unfarmd_v4_deploy_owner;
REVOKE ALL ON SCHEMA unfarmd_v4_deploy FROM PUBLIC;
SET LOCAL ROLE unfarmd_v4_deploy_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA unfarmd_v4_deploy REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE unfarmd_v4_deploy.installation(singleton boolean PRIMARY KEY CHECK(singleton),release_digest text NOT NULL,catalog_digest text NOT NULL);
-- Minimal durable tombstones, not private prose or a claim of physical erasure.
CREATE TABLE unfarmd_v4_deploy.tombstones(owner_id uuid NOT NULL,journal_id uuid NOT NULL,revision integer NOT NULL,head text NOT NULL,revoked_at timestamptz,expires_at timestamptz NOT NULL,erased_at timestamptz NOT NULL,PRIMARY KEY(owner_id,journal_id));
CREATE FUNCTION unfarmd_v4_deploy.remember_erasure() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
BEGIN
 IF OLD.head IS NOT NULL THEN
  INSERT INTO unfarmd_v4_deploy.tombstones VALUES(OLD.owner_id,OLD.journal_id,OLD.revision,OLD.head,OLD.revoked_at,OLD.expires_at,clock_timestamp());
 END IF;
 RETURN OLD;
END $f$;
CREATE FUNCTION unfarmd_v4_deploy.reject_resurrection() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM unfarmd_v4_deploy.tombstones WHERE owner_id=NEW.owner_id AND journal_id=NEW.journal_id) THEN RAISE EXCEPTION 'journal_unavailable';END IF;
 RETURN NEW;
END $f$;
CREATE FUNCTION unfarmd_v4_deploy.monotone_pilot() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $f$
BEGIN
 IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'pilot_history_preserved';END IF;
 IF NEW.reads<OLD.reads OR NEW.attempts<OLD.attempts OR NEW.credits<OLD.credits OR NEW.highest_slot<OLD.highest_slot OR NEW.client_ms<OLD.client_ms OR NEW.server_ms<OLD.server_ms OR (OLD.stopped AND NOT NEW.stopped) OR (OLD.fence IS NOT NULL AND NEW.fence IS DISTINCT FROM OLD.fence) THEN RAISE EXCEPTION 'pilot_history_preserved';END IF;
 RETURN NEW;
END $f$;
CREATE FUNCTION unfarmd_v4_deploy.stop_pilot() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE changed boolean;
BEGIN
 UPDATE unfarmd_v4_pilot.state SET stopped=true WHERE singleton=true AND NOT stopped;
 changed:=FOUND;
 IF NOT EXISTS(SELECT 1 FROM unfarmd_v4_pilot.state WHERE singleton=true) THEN RAISE EXCEPTION 'pilot_unconfigured';END IF;
 IF changed THEN INSERT INTO unfarmd_v4_pilot.history(kind,server_ms,receipt) VALUES('stop',floor(extract(epoch FROM clock_timestamp())*1000)::bigint,'{"reason":"owner_stop"}');END IF;
 RETURN true;
END $f$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unfarmd_v4_deploy FROM PUBLIC;
GRANT USAGE ON SCHEMA unfarmd_v4_deploy TO unfarmd_v4_stopper_login;
GRANT EXECUTE ON FUNCTION unfarmd_v4_deploy.stop_pilot() TO unfarmd_v4_stopper_login;
RESET ROLE;
-- These exact privileges are available only to the non-login function owner.
GRANT USAGE ON SCHEMA unfarmd_v4_pilot TO unfarmd_v4_deploy_owner;
GRANT SELECT,UPDATE ON unfarmd_v4_pilot.state TO unfarmd_v4_deploy_owner;
GRANT INSERT ON unfarmd_v4_pilot.history TO unfarmd_v4_deploy_owner;
GRANT USAGE ON SEQUENCE unfarmd_v4_pilot.history_seq_seq TO unfarmd_v4_deploy_owner;
CREATE TRIGGER journal_erasure_tombstone BEFORE DELETE ON unfarmd_journal.journals FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.remember_erasure();
CREATE TRIGGER journal_no_resurrection BEFORE INSERT ON unfarmd_journal.journals FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.reject_resurrection();
CREATE TRIGGER pilot_monotone BEFORE UPDATE OR DELETE ON unfarmd_v4_pilot.state FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_deploy.monotone_pilot();
CREATE TRIGGER pilot_no_truncate BEFORE TRUNCATE ON unfarmd_v4_pilot.state FOR EACH STATEMENT EXECUTE FUNCTION unfarmd_v4_deploy.monotone_pilot();
