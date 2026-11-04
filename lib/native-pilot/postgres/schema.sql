-- UNEXECUTED native-only delta; existing schemas/installers/grants are NOT modified.
-- PostgreSQL18 non-superuser database owner with CREATEROLE; no LOGIN or policy enrolled.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='15s';
DO $guard$ BEGIN
 IF current_database()<>'unfarmd_v4_pilot' OR current_setting('server_version_num')::int/10000<>18 OR pg_is_in_recovery() THEN RAISE EXCEPTION 'native_install_held'; END IF;
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='unfarmd_native') OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('unfarmd_native_owner','unfarmd_native_app','unfarmd_native_stopper')) THEN RAISE EXCEPTION 'native_install_not_fresh'; END IF;
 PERFORM set_config('createrole_self_grant','set',true);
END $guard$;
CREATE ROLE unfarmd_native_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE unfarmd_native_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE unfarmd_native_stopper NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT unfarmd_native_owner TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
GRANT CREATE ON DATABASE unfarmd_v4_pilot TO unfarmd_native_owner;
CREATE SCHEMA unfarmd_native AUTHORIZATION unfarmd_native_owner;
SET LOCAL ROLE unfarmd_native_owner;
REVOKE ALL ON SCHEMA unfarmd_native FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA unfarmd_native REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE FUNCTION unfarmd_native.canon(v jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $body$
 SELECT CASE jsonb_typeof(v)
 WHEN 'object' THEN '{'||coalesce((SELECT string_agg(to_jsonb(key)::text||':'||unfarmd_native.canon(value),',' ORDER BY key COLLATE "C") FROM jsonb_each(v)),'')||'}'
 WHEN 'array' THEN '['||coalesce((SELECT string_agg(unfarmd_native.canon(value),',' ORDER BY ord) FROM jsonb_array_elements(v) WITH ORDINALITY a(value,ord)),'')||']'
 ELSE v::text END
$body$;
CREATE TABLE unfarmd_native.policies(
 policy_hash text PRIMARY KEY CHECK(policy_hash~'^[a-f0-9]{64}$'), record_text text NOT NULL CHECK(octet_length(record_text)<=4096),
 durability jsonb NOT NULL, state jsonb NOT NULL, head text NOT NULL CHECK(head~'^[a-f0-9]{64}$'), state_hash text NOT NULL CHECK(state_hash~'^[a-f0-9]{64}$')
);
CREATE TABLE unfarmd_native.history(
 policy_hash text REFERENCES unfarmd_native.policies(policy_hash), seq integer CHECK(seq BETWEEN 0 AND 8), operation text NOT NULL CHECK(operation IN ('seed','reserve','finish','stop')),
 previous text NOT NULL, head text NOT NULL, state_hash text NOT NULL, state jsonb NOT NULL, PRIMARY KEY(policy_hash,seq)
);
CREATE FUNCTION unfarmd_native.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $body$
BEGIN
 IF TG_TABLE_NAME='policies' AND TG_OP='UPDATE' AND NEW.policy_hash=OLD.policy_hash AND NEW.record_text=OLD.record_text AND NEW.durability=OLD.durability
 AND (NEW.state->>'seq')::int=(OLD.state->>'seq')::int+1
 AND (NEW.state->>'attempts')::int>=(OLD.state->>'attempts')::int AND (NEW.state->>'credits')::int>=(OLD.state->>'credits')::int
 AND (NEW.state->>'completed')::int>=(OLD.state->>'completed')::int AND (NEW.state->>'lastClock')::bigint>=(OLD.state->>'lastClock')::bigint
 AND (NOT (OLD.state->>'stopped')::boolean OR (NEW.state->>'stopped')::boolean) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'native_history_immutable';
END
$body$;
CREATE TRIGGER policy_monotone BEFORE UPDATE OR DELETE ON unfarmd_native.policies FOR EACH ROW EXECUTE FUNCTION unfarmd_native.immutable();
CREATE TRIGGER policy_no_truncate BEFORE TRUNCATE ON unfarmd_native.policies FOR EACH STATEMENT EXECUTE FUNCTION unfarmd_native.immutable();
CREATE TRIGGER history_no_rewrite BEFORE UPDATE OR DELETE ON unfarmd_native.history FOR EACH ROW EXECUTE FUNCTION unfarmd_native.immutable();
CREATE TRIGGER history_no_truncate BEFORE TRUNCATE ON unfarmd_native.history FOR EACH STATEMENT EXECUTE FUNCTION unfarmd_native.immutable();
CREATE FUNCTION unfarmd_native.step(op text, binding text, input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $body$
DECLARE p unfarmd_native.policies%ROWTYPE; s jsonb; r jsonb; h record; prior text:=repeat('0',64); n integer:=-1; now_ms bigint;
 seq integer; method text; debit integer; changed boolean:=false; status text:='held'; operation text:=op; d jsonb; next_head text; next_state_hash text;
BEGIN
 IF op NOT IN ('inspect','reserve','finish','stop') OR octet_length(input::text)>4096 THEN RAISE EXCEPTION 'native_held'; END IF;
 SELECT * INTO STRICT p FROM unfarmd_native.policies WHERE policy_hash=binding FOR UPDATE;
 s:=p.state; r:=p.record_text::jsonb; d:=p.durability; next_head:=p.head;next_state_hash:=p.state_hash;
 IF d IS DISTINCT FROM input->'durability' THEN RAISE EXCEPTION 'native_durability_binding'; END IF;
 IF binding<>encode(sha256(convert_to(p.record_text,'UTF8')),'hex') OR r->>'version'<>'native-pilot-policy/1' THEN RAISE EXCEPTION 'native_binding'; END IF;
 IF current_setting('synchronous_commit')<>'on' OR pg_is_in_recovery() OR current_setting('server_version_num')::int/10000<>18 THEN RAISE EXCEPTION 'native_durability'; END IF;
 IF d->>'mode'='local-fsync' THEN
  IF current_setting('fsync')<>'on' OR coalesce(current_setting('neon.tenant_id',true),'')<>'' THEN RAISE EXCEPTION 'native_durability'; END IF;
 ELSIF d->>'mode'='neon-safekeeper-quorum/v1' THEN
  IF current_setting('neon.tenant_id',true) IS DISTINCT FROM d->>'tenantId' OR current_setting('neon.timeline_id',true) IS DISTINCT FROM d->>'timelineId'
   OR d->>'admissionSha256'!~'^[a-f0-9]{64}$' OR d->>'custodySha256'!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'native_durability'; END IF;
 ELSE RAISE EXCEPTION 'native_durability'; END IF;
 -- Verify COMPLETE ordered history and critical state, including STOP/uncertain lease.
 FOR h IN SELECT * FROM unfarmd_native.history WHERE policy_hash=binding ORDER BY seq LOOP
  n:=n+1;
  IF h.seq<>n OR h.previous<>prior OR h.state_hash<>encode(sha256(convert_to(unfarmd_native.canon(h.state),'UTF8')),'hex')
   OR (n=0 AND (h.operation<>'seed' OR h.head<>repeat('0',64) OR h.state<>jsonb_build_object('seq',0,'policyHash',binding,'stopped',false,'attempts',0,'credits',0,'lastClock',(r->>'startsAt')::bigint,'lease',NULL,'completed',0,'receipts','[]'::jsonb)))
   OR (n>0 AND h.head<>encode(sha256(convert_to(prior||':'||n::text||':'||h.operation||':'||h.state_hash,'UTF8')),'hex')) THEN RAISE EXCEPTION 'native_history'; END IF;
  prior:=h.head;
 END LOOP;
 IF n<>(s->>'seq')::int OR prior<>p.head OR h.state IS DISTINCT FROM s OR h.state_hash<>p.state_hash THEN RAISE EXCEPTION 'native_history'; END IF;
 -- STOP may persist even if the independent custodian is unavailable. No source ACK follows that uncertainty.
 IF op<>'stop' AND (input->>'anchorSeq' IS DISTINCT FROM (s->>'seq') OR input->>'anchorHead' IS DISTINCT FROM p.head OR input->>'anchorStateHash' IS DISTINCT FROM p.state_hash) THEN RAISE EXCEPTION 'native_currentness'; END IF;
 now_ms:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 IF op='stop' OR ((s->>'stopped')::boolean IS FALSE AND (now_ms<(s->>'lastClock')::bigint OR now_ms<(r->>'startsAt')::bigint OR now_ms>=(r->>'expiresAt')::bigint
 OR input->>'at' IS NULL OR input->>'at'!~'^[0-9]{1,16}$' OR abs((input->>'at')::numeric-now_ms)>1000 OR (input->>'at')::bigint<(s->>'lastClock')::bigint
 OR (s->'lease'<>'null'::jsonb AND now_ms-(s->'lease'->>'at')::bigint>5000))) THEN
  IF NOT (s->>'stopped')::boolean THEN s:=s||jsonb_build_object('stopped',true,'lastClock',greatest(now_ms,(s->>'lastClock')::bigint));changed:=true; END IF;
  operation:='stop';status:='stopped';
 ELSIF NOT (s->>'stopped')::boolean AND op='reserve' THEN
  method:=input->>'method';debit:=(r->'debit'->>method)::int;
  IF s->'lease'<>'null'::jsonb THEN
   s:=s||jsonb_build_object('stopped',true,'lastClock',greatest(now_ms,(s->>'lastClock')::bigint));changed:=true;operation:='stop';status:='stopped';
  ELSIF method= (ARRAY['getTokenLargestAccounts','getMultipleAccounts','getBlockTime'])[(s->>'completed')::int+1]
   AND (s->>'attempts')::int=(s->>'completed')::int AND (s->>'attempts')::int<3 AND debit BETWEEN 1 AND 100
   AND (s->>'credits')::int+debit<=(r->>'credits')::int AND input->>'requestHash'~'^[a-f0-9]{64}$'
   AND ((s->>'attempts')::int=0 OR now_ms-(s->>'lastClock')::bigint>=2500) THEN
   s:=s||jsonb_build_object('attempts',(s->>'attempts')::int+1,'credits',(s->>'credits')::int+debit,'lastClock',now_ms,
    'lease',jsonb_build_object('fence',(s->>'attempts')::int+1,'method',method,'requestHash',input->>'requestHash','at',now_ms));changed:=true;status:='committed';
  END IF;
 ELSIF NOT (s->>'stopped')::boolean AND op='finish' THEN
  IF s->'lease'<>'null'::jsonb AND input->>'fence'=s->'lease'->>'fence' AND input->>'responseHash'~'^[a-f0-9]{64}$' THEN
   s:=s||jsonb_build_object('lease',NULL,'completed',(s->>'completed')::int+1,'lastClock',now_ms,'receipts',(s->'receipts')||to_jsonb(input->>'responseHash'));changed:=true;status:='committed';
  ELSE s:=s||jsonb_build_object('stopped',true,'lastClock',greatest(now_ms,(s->>'lastClock')::bigint));changed:=true;operation:='stop';status:='stopped'; END IF;
 END IF;
 IF changed THEN
  seq:=(s->>'seq')::int+1;IF seq>8 THEN RAISE EXCEPTION 'native_history_limit'; END IF;
  s:=s||jsonb_build_object('seq',seq);next_state_hash:=encode(sha256(convert_to(unfarmd_native.canon(s),'UTF8')),'hex');
  prior:=p.head;next_head:=encode(sha256(convert_to(prior||':'||seq::text||':'||operation||':'||next_state_hash,'UTF8')),'hex');
  UPDATE unfarmd_native.policies SET state=s,head=next_head,state_hash=next_state_hash WHERE policy_hash=binding;
  INSERT INTO unfarmd_native.history VALUES(binding,seq,operation,prior,next_head,next_state_hash,s);
 END IF;
 RETURN jsonb_build_object('status',status,'operation',operation,'state',s,'head',next_head,'stateHash',next_state_hash);
END
$body$;
CREATE FUNCTION unfarmd_native.stop(binding text,input jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $body$
 SELECT unfarmd_native.step('stop',binding,input)
$body$;
REVOKE ALL ON ALL TABLES IN SCHEMA unfarmd_native FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unfarmd_native FROM PUBLIC;
GRANT USAGE ON SCHEMA unfarmd_native TO unfarmd_native_app,unfarmd_native_stopper;
GRANT EXECUTE ON FUNCTION unfarmd_native.step(text,text,jsonb) TO unfarmd_native_app;
GRANT EXECUTE ON FUNCTION unfarmd_native.stop(text,jsonb) TO unfarmd_native_app,unfarmd_native_stopper;
RESET ROLE;
REVOKE CREATE ON DATABASE unfarmd_v4_pilot FROM unfarmd_native_owner;
-- Keep explicit maintenance ADMIN custody, remove automatic inheritance/SET.
-- Dropping ADMIN as well would strand non-superuser PG18 future seed authorization.
GRANT unfarmd_native_owner TO CURRENT_USER WITH INHERIT FALSE, SET FALSE;
COMMIT;
-- No login/password/policy/owner session/source gate/checkpoint is installed.
