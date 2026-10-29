-- Separate, uninstalled local rehearsal. No legacy journal/source schema mutation.
BEGIN;
CREATE ROLE unfarmd_thesis_rate_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA unfarmd_thesis_rate;
REVOKE ALL ON SCHEMA unfarmd_thesis_rate FROM PUBLIC;
CREATE TABLE unfarmd_thesis_rate.usage(owner_id uuid PRIMARY KEY, window_at timestamptz NOT NULL, last_at timestamptz NOT NULL, reads integer NOT NULL DEFAULT 0 CHECK(reads BETWEEN 0 AND 60),writes integer NOT NULL DEFAULT 0 CHECK(writes BETWEEN 0 AND 20));
CREATE FUNCTION unfarmd_thesis_rate.reserve(o uuid,op text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE r unfarmd_thesis_rate.usage; t timestamptz:=clock_timestamp();
BEGIN
 IF o IS NULL OR op IS NULL OR op NOT IN ('read','write') THEN RAISE EXCEPTION 'invalid_rate_ticket'; END IF;
 INSERT INTO unfarmd_thesis_rate.usage(owner_id,window_at,last_at) VALUES(o,t,t) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT r FROM unfarmd_thesis_rate.usage WHERE owner_id=o FOR UPDATE;
 t:=clock_timestamp();
 IF t<r.last_at THEN RETURN false; END IF;
 IF t>=r.window_at+interval '1 hour' THEN r.window_at:=t;r.reads:=0;r.writes:=0; END IF;
 IF (op='read' AND r.reads>=60) OR (op='write' AND r.writes>=20) THEN RETURN false; END IF;
 UPDATE unfarmd_thesis_rate.usage SET window_at=r.window_at,last_at=t,reads=r.reads+CASE WHEN op='read' THEN 1 ELSE 0 END,writes=r.writes+CASE WHEN op='write' THEN 1 ELSE 0 END WHERE owner_id=o;
 RETURN true;
END $f$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unfarmd_thesis_rate FROM PUBLIC;
GRANT USAGE ON SCHEMA unfarmd_thesis_rate TO unfarmd_thesis_rate_app;
GRANT EXECUTE ON FUNCTION unfarmd_thesis_rate.reserve(uuid,text) TO unfarmd_thesis_rate_app;
COMMIT;
