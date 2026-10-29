-- REVIEW/LOCAL REHEARSAL ONLY. Not a production migration or activation.
-- Run once in a fresh database by an independently authorized migration owner.
BEGIN;
CREATE ROLE unfarmd_journal_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE unfarmd_journal_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE unfarmd_journal_erasure NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA unfarmd_journal AUTHORIZATION unfarmd_journal_owner;
REVOKE ALL ON SCHEMA unfarmd_journal FROM PUBLIC;
SET LOCAL ROLE unfarmd_journal_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA unfarmd_journal REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE unfarmd_journal.owners(
 owner_id uuid PRIMARY KEY, journals integer NOT NULL DEFAULT 0 CHECK(journals BETWEEN 0 AND 32),
 lifetime_events integer NOT NULL DEFAULT 0 CHECK(lifetime_events BETWEEN 0 AND 2048)
);
CREATE TABLE unfarmd_journal.journals(
 owner_id uuid NOT NULL REFERENCES unfarmd_journal.owners, journal_id uuid NOT NULL,
 mint text NOT NULL CHECK(mint ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
 revision integer NOT NULL DEFAULT 0 CHECK(revision BETWEEN 0 AND 64),
 head text CHECK(head ~ '^[a-f0-9]{64}$'), bytes integer NOT NULL DEFAULT 0 CHECK(bytes BETWEEN 0 AND 524288),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '30 days',
 revoked_at timestamptz, erase_after timestamptz,
 PRIMARY KEY(owner_id,journal_id), CHECK((revision=0)=(head IS NULL)),
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '30 days 1 second'),
 CHECK((revoked_at IS NULL)=(erase_after IS NULL)), CHECK(erase_after IS NULL OR erase_after>=revoked_at)
);
CREATE TABLE unfarmd_journal.events(
 owner_id uuid NOT NULL, journal_id uuid NOT NULL, sequence integer NOT NULL CHECK(sequence BETWEEN 1 AND 64),
 request_id uuid NOT NULL, previous_head text CHECK(previous_head ~ '^[a-f0-9]{64}$'),
 head text NOT NULL CHECK(head ~ '^[a-f0-9]{64}$'), payload text NOT NULL CHECK(octet_length(payload) BETWEEN 1 AND 32768),
 PRIMARY KEY(owner_id,journal_id,sequence), UNIQUE(owner_id,request_id),
 FOREIGN KEY(owner_id,journal_id) REFERENCES unfarmd_journal.journals ON DELETE CASCADE
);
CREATE INDEX journal_expiry ON unfarmd_journal.journals(expires_at);
CREATE INDEX journal_erasure ON unfarmd_journal.journals(erase_after) WHERE erase_after IS NOT NULL;
-- RLS is defense in depth for missed predicates, not an independent identity provider.
-- Only the server sets this transaction-local scope after verifying its opaque principal.
ALTER TABLE unfarmd_journal.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE unfarmd_journal.owners FORCE ROW LEVEL SECURITY;
ALTER TABLE unfarmd_journal.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE unfarmd_journal.journals FORCE ROW LEVEL SECURITY;
ALTER TABLE unfarmd_journal.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE unfarmd_journal.events FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_isolation ON unfarmd_journal.owners USING(owner_id::text=current_setting('unfarmd.owner_id',true)) WITH CHECK(owner_id::text=current_setting('unfarmd.owner_id',true));
CREATE POLICY journal_isolation ON unfarmd_journal.journals USING(owner_id::text=current_setting('unfarmd.owner_id',true)) WITH CHECK(owner_id::text=current_setting('unfarmd.owner_id',true));
CREATE POLICY event_isolation ON unfarmd_journal.events USING(owner_id::text=current_setting('unfarmd.owner_id',true) AND EXISTS(SELECT 1 FROM unfarmd_journal.journals j WHERE j.owner_id=events.owner_id AND j.journal_id=events.journal_id AND j.revoked_at IS NULL AND j.expires_at>clock_timestamp()));
CREATE POLICY erasure_journals ON unfarmd_journal.journals TO unfarmd_journal_erasure USING(true);
-- Per-owner lock serializes CAS and quotas across processes/connections, including new journals.
CREATE FUNCTION unfarmd_journal.lock_journal(o uuid,j uuid,m text) RETURNS SETOF unfarmd_journal.journals
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE r unfarmd_journal.journals;
BEGIN
 IF o::text IS DISTINCT FROM current_setting('unfarmd.owner_id',true) OR j IS NULL OR m IS NULL THEN RAISE EXCEPTION 'journal_invalid'; END IF;
 INSERT INTO unfarmd_journal.owners(owner_id) VALUES(o) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM unfarmd_journal.owners WHERE owner_id=o FOR UPDATE;
 SELECT * INTO r FROM unfarmd_journal.journals WHERE owner_id=o AND journal_id=j FOR UPDATE;
 IF NOT FOUND THEN
  UPDATE unfarmd_journal.owners SET journals=journals+1 WHERE owner_id=o AND journals<32;
  IF NOT FOUND THEN RAISE EXCEPTION 'journal_limit'; END IF;
  INSERT INTO unfarmd_journal.journals(owner_id,journal_id,mint) VALUES(o,j,m) RETURNING * INTO r;
 END IF;
 IF r.mint<>m THEN RAISE EXCEPTION 'journal_conflict'; END IF;
 IF r.revoked_at IS NOT NULL OR r.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'journal_unavailable'; END IF;
 RETURN NEXT r;
END $f$;
CREATE FUNCTION unfarmd_journal.append_event(o uuid,j uuid,expected text,request uuid,body text,revoke_access boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE r unfarmd_journal.journals; digest text; t timestamptz:=clock_timestamp();
BEGIN
 IF o::text IS DISTINCT FROM current_setting('unfarmd.owner_id',true) OR body IS NULL OR request IS NULL OR revoke_access IS NULL THEN RAISE EXCEPTION 'journal_invalid'; END IF;
 PERFORM 1 FROM unfarmd_journal.owners WHERE owner_id=o FOR UPDATE;
 SELECT * INTO STRICT r FROM unfarmd_journal.journals WHERE owner_id=o AND journal_id=j FOR UPDATE;
 IF r.revoked_at IS NOT NULL OR r.expires_at<=t THEN RAISE EXCEPTION 'journal_unavailable'; END IF;
 IF r.head IS DISTINCT FROM expected THEN RAISE EXCEPTION 'journal_conflict'; END IF;
 IF r.revision>=64 OR r.bytes+octet_length(body)>524288 THEN RAISE EXCEPTION 'journal_limit'; END IF;
 UPDATE unfarmd_journal.owners SET lifetime_events=lifetime_events+1 WHERE owner_id=o AND lifetime_events<2048;
 IF NOT FOUND THEN RAISE EXCEPTION 'journal_limit'; END IF;
 digest:=encode(sha256(convert_to(body,'UTF8')),'hex');
 INSERT INTO unfarmd_journal.events VALUES(o,j,r.revision+1,request,r.head,digest,body);
 UPDATE unfarmd_journal.journals SET revision=revision+1,head=digest,bytes=bytes+octet_length(body),
  revoked_at=CASE WHEN revoke_access THEN t ELSE NULL END,
  erase_after=CASE WHEN revoke_access THEN t+interval '24 hours' ELSE NULL END
  WHERE owner_id=o AND journal_id=j;
 RETURN digest;
END $f$;
GRANT USAGE ON SCHEMA unfarmd_journal TO unfarmd_journal_app,unfarmd_journal_erasure;
GRANT SELECT ON unfarmd_journal.journals,unfarmd_journal.events TO unfarmd_journal_app;
GRANT EXECUTE ON FUNCTION unfarmd_journal.lock_journal(uuid,uuid,text),unfarmd_journal.append_event(uuid,uuid,text,uuid,text,boolean) TO unfarmd_journal_app;
-- Separate erasure capability: can remove only expired/revoked rows, never append/reset quotas.
CREATE FUNCTION unfarmd_journal.purge(take integer) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE n integer;
BEGIN
 IF take IS NULL OR take<1 OR take>20 THEN RAISE EXCEPTION 'journal_invalid'; END IF;
 WITH due AS(SELECT owner_id,journal_id FROM unfarmd_journal.journals WHERE expires_at<=clock_timestamp() OR erase_after<=clock_timestamp() ORDER BY expires_at,owner_id,journal_id LIMIT take),
 removed AS(DELETE FROM unfarmd_journal.journals j USING due d WHERE j.owner_id=d.owner_id AND j.journal_id=d.journal_id RETURNING 1)
 SELECT count(*) INTO n FROM removed; RETURN n;
END $f$;
GRANT SELECT,DELETE ON unfarmd_journal.journals TO unfarmd_journal_erasure;
-- DELETE must be constrained even when the maintenance role issues SQL directly.
DROP POLICY erasure_journals ON unfarmd_journal.journals;
CREATE POLICY erasure_read ON unfarmd_journal.journals FOR SELECT TO unfarmd_journal_erasure USING(true);
CREATE POLICY erasure_delete ON unfarmd_journal.journals FOR DELETE TO unfarmd_journal_erasure USING(expires_at<=clock_timestamp() OR erase_after<=clock_timestamp());
GRANT EXECUTE ON FUNCTION unfarmd_journal.purge(integer) TO unfarmd_journal_erasure;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unfarmd_journal FROM PUBLIC;
RESET ROLE;
COMMIT;
