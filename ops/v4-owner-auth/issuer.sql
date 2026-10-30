-- UNEXECUTED ADDITIVE AUTH SUPPLEMENT. Separate founder approval after exact #242 install.
-- No users, passwords, owner/source policy enrollment, LOGIN activation, budget or STOP reset.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $check$ BEGIN IF current_database()<>'unfarmd_v4_pilot' OR to_regclass('unfarmd_v4_owner.policy') IS NULL OR to_regclass('unfarmd_v4_deploy.installation') IS NULL THEN RAISE EXCEPTION 'approved_base_required';END IF;END $check$;
CREATE ROLE unfarmd_v4_issuer_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE unfarmd_v4_issuer_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
GRANT CONNECT ON DATABASE unfarmd_v4_pilot TO unfarmd_v4_issuer_login;
GRANT USAGE ON SCHEMA public,unfarmd_v4_owner,unfarmd_v4_deploy TO unfarmd_v4_issuer_login;
GRANT SELECT ON unfarmd_v4_owner.policy TO unfarmd_v4_issuer_login;
GRANT SELECT ON public.v4_owner_user,public.v4_owner_account TO unfarmd_v4_issuer_login;
GRANT SELECT,INSERT,DELETE ON public.v4_owner_session TO unfarmd_v4_issuer_login;
ALTER ROLE unfarmd_v4_issuer_login SET search_path=pg_catalog,public;
CREATE ROLE unfarmd_v4_enroll_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
GRANT CONNECT ON DATABASE unfarmd_v4_pilot TO unfarmd_v4_enroll_login;
GRANT USAGE ON SCHEMA public,unfarmd_v4_owner,unfarmd_v4_deploy TO unfarmd_v4_enroll_login;
GRANT SELECT ON unfarmd_v4_owner.policy TO unfarmd_v4_enroll_login;
GRANT SELECT,INSERT ON public.v4_owner_user,public.v4_owner_account TO unfarmd_v4_enroll_login;
ALTER ROLE unfarmd_v4_enroll_login SET search_path=pg_catalog,public;
DO $grant$ BEGIN IF to_regprocedure('unfarmd_v4_deploy.neon_durability_admitted(text)') IS NOT NULL THEN GRANT EXECUTE ON FUNCTION unfarmd_v4_deploy.neon_durability_admitted(text) TO unfarmd_v4_issuer_login,unfarmd_v4_enroll_login;END IF;END $grant$;
-- Enrollment identity is never supplied to the installed application. Disable LOGIN after setup.
CREATE SCHEMA unfarmd_v4_auth_ops AUTHORIZATION unfarmd_v4_issuer_owner;
REVOKE ALL ON SCHEMA unfarmd_v4_auth_ops FROM PUBLIC;
SET LOCAL ROLE unfarmd_v4_issuer_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA unfarmd_v4_auth_ops REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE unfarmd_v4_auth_ops.attempts(singleton boolean PRIMARY KEY CHECK(singleton),window_at timestamptz NOT NULL,last_at timestamptz NOT NULL,attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 20));
CREATE FUNCTION unfarmd_v4_auth_ops.reserve_attempt() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE t timestamptz:=clock_timestamp();r unfarmd_v4_auth_ops.attempts%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(243,1);
 SELECT * INTO r FROM unfarmd_v4_auth_ops.attempts WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN INSERT INTO unfarmd_v4_auth_ops.attempts VALUES(true,t,t,1);RETURN true;END IF;
 IF t<r.last_at THEN RETURN false;END IF;
 IF t-r.window_at>=interval '15 minutes' THEN UPDATE unfarmd_v4_auth_ops.attempts SET window_at=t,last_at=t,attempts=1;RETURN true;END IF;
 IF r.attempts>=20 THEN RETURN false;END IF;
 UPDATE unfarmd_v4_auth_ops.attempts SET last_at=t,attempts=attempts+1;RETURN true;
END $fn$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unfarmd_v4_auth_ops FROM PUBLIC;
RESET ROLE;
GRANT USAGE ON SCHEMA unfarmd_v4_auth_ops TO unfarmd_v4_issuer_login;
GRANT EXECUTE ON FUNCTION unfarmd_v4_auth_ops.reserve_attempt() TO unfarmd_v4_issuer_login;
-- Existing reader/J/erasure/pilot/STOP roles, crypto, rates and tombstones remain unchanged.
COMMIT;
