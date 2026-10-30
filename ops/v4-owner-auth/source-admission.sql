-- UNEXECUTED DYNAMIC-CA ADMISSION SUPPLEMENT. SAME isolated PostgreSQL, no market cache.
-- Separate rights/signed-policy/native-source GO required. Existing exact3 ledger is untouched.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$ BEGIN IF current_database()<>'unfarmd_v4_pilot' OR to_regclass('unfarmd_v4_deploy.installation') IS NULL THEN RAISE EXCEPTION 'approved_base_required';END IF;END $guard$;
CREATE ROLE unfarmd_v4_ca_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE unfarmd_v4_ca_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
CREATE ROLE unfarmd_v4_ca_stopper_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1;
GRANT CONNECT ON DATABASE unfarmd_v4_pilot TO unfarmd_v4_ca_login,unfarmd_v4_ca_stopper_login;
GRANT USAGE ON SCHEMA unfarmd_v4_pilot TO unfarmd_v4_ca_owner;
GRANT EXECUTE ON FUNCTION unfarmd_v4_pilot.valid_mint(text) TO unfarmd_v4_ca_owner;
GRANT USAGE ON SCHEMA unfarmd_v4_deploy TO unfarmd_v4_ca_owner;
DO $grant$ BEGIN IF to_regprocedure('unfarmd_v4_deploy.neon_durability_admitted(text)') IS NOT NULL THEN GRANT EXECUTE ON FUNCTION unfarmd_v4_deploy.neon_durability_admitted(text) TO unfarmd_v4_ca_owner;END IF;END $grant$;
CREATE SCHEMA unfarmd_v4_ca_budget AUTHORIZATION unfarmd_v4_ca_owner;
REVOKE ALL ON SCHEMA unfarmd_v4_ca_budget FROM PUBLIC;
SET LOCAL ROLE unfarmd_v4_ca_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA unfarmd_v4_ca_budget REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE unfarmd_v4_ca_budget.policy(
 singleton boolean PRIMARY KEY CHECK(singleton),record_text text NOT NULL CHECK(octet_length(record_text)<=8192),hash text NOT NULL CHECK(hash~'^[a-f0-9]{64}$'),
 owner_subject uuid NOT NULL,origin text NOT NULL,release_hash text NOT NULL CHECK(release_hash~'^[a-f0-9]{64}$'),runtime_kind text NOT NULL CHECK(runtime_kind IN ('private_preview','local_fixture')),
 starts_ms bigint NOT NULL,expires_ms bigint NOT NULL CHECK(expires_ms>starts_ms AND expires_ms-starts_ms<=900000),
 max_lookups integer NOT NULL CHECK(max_lookups BETWEEN 1 AND 3),max_attempts integer NOT NULL CHECK(max_attempts BETWEEN 1 AND 6),max_credits integer NOT NULL CHECK(max_credits BETWEEN 1 AND 6000000),
 debit_jupiter integer NOT NULL CHECK(debit_jupiter BETWEEN 1 AND 1000000),debit_helius integer NOT NULL CHECK(debit_helius BETWEEN 1 AND 1000000),
 CHECK(hash=encode(sha256(convert_to(record_text,'UTF8')),'hex')),
 CHECK((record_text::jsonb->>'ownerSubject')::uuid=owner_subject AND record_text::jsonb->>'origin'=origin AND (record_text::jsonb->>'startsAt')::bigint=starts_ms AND (record_text::jsonb->>'expiresAt')::bigint=expires_ms AND (record_text::jsonb->>'maxLookups')::integer=max_lookups AND (record_text::jsonb->>'maxAttempts')::integer=max_attempts AND (record_text::jsonb->>'maxCredits')::integer=max_credits AND (record_text::jsonb->'debit'->>'jupiter')::integer=debit_jupiter AND (record_text::jsonb->'debit'->>'helius')::integer=debit_helius));
CREATE TABLE unfarmd_v4_ca_budget.state(singleton boolean PRIMARY KEY REFERENCES unfarmd_v4_ca_budget.policy CHECK(singleton),lookups integer NOT NULL DEFAULT 0,attempts integer NOT NULL DEFAULT 0,credits integer NOT NULL DEFAULT 0,stopped boolean NOT NULL DEFAULT false,fence uuid,lease jsonb,last_client bigint NOT NULL DEFAULT 0,last_server bigint NOT NULL DEFAULT 0,next_jupiter bigint NOT NULL DEFAULT 0,next_helius bigint NOT NULL DEFAULT 0,CHECK(lookups>=0 AND attempts>=0 AND credits>=0));
CREATE TABLE unfarmd_v4_ca_budget.lookups(id text PRIMARY KEY,mint text NOT NULL,providers jsonb NOT NULL DEFAULT '[]'::jsonb);
CREATE TABLE unfarmd_v4_ca_budget.history(seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,server_ms bigint NOT NULL,kind text NOT NULL,receipt jsonb NOT NULL CHECK(octet_length(receipt::text)<=2048));
CREATE FUNCTION unfarmd_v4_ca_budget.immutable_policy() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $f$ BEGIN RAISE EXCEPTION 'ca_policy_immutable';END $f$;
CREATE TRIGGER policy_immutable BEFORE UPDATE OR DELETE ON unfarmd_v4_ca_budget.policy FOR EACH STATEMENT EXECUTE FUNCTION unfarmd_v4_ca_budget.immutable_policy();
CREATE TRIGGER policy_no_truncate BEFORE TRUNCATE ON unfarmd_v4_ca_budget.policy FOR EACH STATEMENT EXECUTE FUNCTION unfarmd_v4_ca_budget.immutable_policy();
CREATE FUNCTION unfarmd_v4_ca_budget.monotone() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $f$
BEGIN IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'ca_history_preserved';END IF;
 IF NEW.lookups<OLD.lookups OR NEW.attempts<OLD.attempts OR NEW.credits<OLD.credits OR NEW.last_client<OLD.last_client OR NEW.last_server<OLD.last_server OR NEW.next_jupiter<OLD.next_jupiter OR NEW.next_helius<OLD.next_helius OR (OLD.stopped AND NOT NEW.stopped) OR (OLD.fence IS NOT NULL AND NEW.fence IS DISTINCT FROM OLD.fence) THEN RAISE EXCEPTION 'ca_history_preserved';END IF;RETURN NEW;END $f$;
CREATE TRIGGER state_monotone BEFORE UPDATE OR DELETE ON unfarmd_v4_ca_budget.state FOR EACH ROW EXECUTE FUNCTION unfarmd_v4_ca_budget.monotone();
CREATE TRIGGER state_no_truncate BEFORE TRUNCATE ON unfarmd_v4_ca_budget.state FOR EACH STATEMENT EXECUTE FUNCTION unfarmd_v4_ca_budget.monotone();
CREATE FUNCTION unfarmd_v4_ca_budget.durable(kind text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE verdict boolean;
BEGIN
 IF pg_is_in_recovery() OR current_setting('synchronous_commit')<>'on' THEN RETURN false;END IF;
 IF kind='local_fixture' THEN RETURN current_setting('fsync')='on';END IF;
 IF kind<>'private_preview' OR to_regprocedure('unfarmd_v4_deploy.neon_durability_admitted(text)') IS NULL THEN RETURN false;END IF;
 EXECUTE 'SELECT unfarmd_v4_deploy.neon_durability_admitted(NULL)' INTO verdict;RETURN verdict IS TRUE;
END $f$;
CREATE FUNCTION unfarmd_v4_ca_budget.inspect_policy(expected text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE p unfarmd_v4_ca_budget.policy%ROWTYPE;s unfarmd_v4_ca_budget.state%ROWTYPE;
BEGIN SELECT * INTO p FROM unfarmd_v4_ca_budget.policy WHERE singleton AND hash=expected;IF NOT FOUND THEN RETURN NULL;END IF;SELECT * INTO s FROM unfarmd_v4_ca_budget.state WHERE singleton;IF NOT FOUND OR NOT unfarmd_v4_ca_budget.durable(p.runtime_kind) THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('policyHash',p.hash,'releaseHash',p.release_hash,'ownerSubject',p.owner_subject,'origin',p.origin,'runtimeKind',p.runtime_kind,'stopped',s.stopped,'attempts',s.attempts,'credits',s.credits,'lookups',s.lookups,'leasePending',s.lease IS NOT NULL);END $f$;
CREATE FUNCTION unfarmd_v4_ca_budget.step(c jsonb,f uuid,expected text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE p unfarmd_v4_ca_budget.policy%ROWTYPE;s unfarmd_v4_ca_budget.state%ROWTYPE;l unfarmd_v4_ca_budget.lookups%ROWTYPE;
 k text:=c->>'kind';t bigint;server_t bigint:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint;debit integer;provider text;id text;expiry bigint;next_at bigint;ack jsonb;
BEGIN
 IF jsonb_typeof(c)<>'object' OR octet_length(c::text)>2048 OR f IS NULL OR expected!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'ca_invalid';END IF;
 SELECT * INTO p FROM unfarmd_v4_ca_budget.policy WHERE singleton AND hash=expected;IF NOT FOUND OR c->>'policyHash' IS DISTINCT FROM expected THEN RAISE EXCEPTION 'ca_policy_missing';END IF;
 IF NOT unfarmd_v4_ca_budget.durable(p.runtime_kind) THEN RAISE EXCEPTION 'ca_durability_required';END IF;
 SELECT * INTO s FROM unfarmd_v4_ca_budget.state WHERE singleton FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'ca_state_missing';END IF;
 IF k='stop' THEN
  UPDATE unfarmd_v4_ca_budget.state SET stopped=true WHERE singleton;
  ack:=jsonb_build_object('kind','stopped','policyHash',p.hash);
  IF NOT s.stopped THEN INSERT INTO unfarmd_v4_ca_budget.history(server_ms,kind,receipt) VALUES(server_t,k,ack);END IF;RETURN ack;
 END IF;
 IF session_user='unfarmd_v4_ca_stopper_login' THEN RAISE EXCEPTION 'ca_stop_only';END IF;
 IF s.stopped THEN RETURN jsonb_build_object('kind','denied','reason','stopped');END IF;
 t:=(c->>'now')::bigint;
 IF t IS NULL OR t<0 OR t<s.last_client OR server_t<s.last_server OR abs(t-server_t)>1000 OR s.fence IS NOT NULL AND s.fence<>f OR s.lease IS NOT NULL AND t>=(s.lease->>'expiresAt')::bigint THEN
  UPDATE unfarmd_v4_ca_budget.state SET stopped=true WHERE singleton;RETURN jsonb_build_object('kind','denied','reason','stopped');END IF;
 IF t<p.starts_ms OR t>=p.expires_ms THEN RETURN jsonb_build_object('kind','denied','reason','expired');END IF;
 UPDATE unfarmd_v4_ca_budget.state SET fence=coalesce(fence,f),last_client=t,last_server=server_t WHERE singleton;
 IF k='admit' THEN
  IF (c->>'ownerSubject')::uuid IS DISTINCT FROM p.owner_subject OR unfarmd_v4_pilot.valid_mint(c->>'mint') IS DISTINCT FROM true OR (SELECT count(*) FROM jsonb_object_keys(c))<>5 THEN RAISE EXCEPTION 'ca_invalid';END IF;
  IF s.lease IS NOT NULL THEN RETURN jsonb_build_object('kind','denied','reason','busy');END IF;
  IF s.lookups>=p.max_lookups THEN RETURN jsonb_build_object('kind','denied','reason','exhausted');END IF;
  id:=gen_random_uuid()::text;INSERT INTO unfarmd_v4_ca_budget.lookups(id,mint) VALUES(id,c->>'mint');UPDATE unfarmd_v4_ca_budget.state SET lookups=lookups+1 WHERE singleton;
  ack:=jsonb_build_object('kind','admitted','policyHash',p.hash,'mint',c->>'mint','lookupId',id,'lookupsReserved',s.lookups+1,'committedAt',t);
 ELSIF k IN ('reserve','finish') THEN
  SELECT * INTO l FROM unfarmd_v4_ca_budget.lookups WHERE lookups.id=c->>'lookupId' FOR UPDATE;
  provider:=c->>'provider';IF NOT FOUND OR l.mint IS DISTINCT FROM c->>'mint' OR provider NOT IN ('jupiter','helius') OR NOT ((p.record_text::jsonb->'providers') ? provider) THEN RAISE EXCEPTION 'ca_invalid';END IF;
  IF k='reserve' THEN
   IF (SELECT count(*) FROM jsonb_object_keys(c))<>7 OR l.providers ? provider THEN RAISE EXCEPTION 'ca_invalid';END IF;
   IF s.lease IS NOT NULL THEN RETURN jsonb_build_object('kind','denied','reason','busy');END IF;
   debit:=CASE provider WHEN 'jupiter' THEN p.debit_jupiter ELSE p.debit_helius END;
   next_at:=CASE provider WHEN 'jupiter' THEN s.next_jupiter ELSE s.next_helius END;
   IF (c->>'debit')::integer IS DISTINCT FROM debit THEN RAISE EXCEPTION 'ca_invalid';END IF;
   IF t<next_at THEN RETURN jsonb_build_object('kind','denied','reason','rate_limited');END IF;
   IF s.attempts>=p.max_attempts OR s.credits+debit>p.max_credits THEN RETURN jsonb_build_object('kind','denied','reason','exhausted');END IF;
   id:=gen_random_uuid()::text;expiry:=least(t+5000,p.expires_ms);
   ack:=jsonb_build_object('kind','reserved','policyHash',p.hash,'lookupId',l.id,'mint',l.mint,'provider',provider,'leaseId',id,'attemptsReserved',s.attempts+1,'creditsReserved',s.credits+debit,'expiresAt',expiry,'nextAllowedAt',t+2500,'committedAt',t);
   UPDATE unfarmd_v4_ca_budget.state SET attempts=attempts+1,credits=credits+debit,lease=ack,next_jupiter=CASE WHEN provider='jupiter' THEN t+2500 ELSE next_jupiter END,next_helius=CASE WHEN provider='helius' THEN t+2500 ELSE next_helius END WHERE singleton;
  ELSE
   IF (SELECT count(*) FROM jsonb_object_keys(c))<>9 OR s.lease IS NULL OR s.lease->>'leaseId' IS DISTINCT FROM c->>'leaseId' OR s.lease->>'lookupId' IS DISTINCT FROM l.id OR s.lease->>'provider' IS DISTINCT FROM provider OR (c->>'responseSha256')!~'^[a-f0-9]{64}$' OR (c->>'receivedAt')::bigint<(s.lease->>'committedAt')::bigint OR (c->>'receivedAt')::bigint>t THEN RAISE EXCEPTION 'ca_invalid';END IF;
   UPDATE unfarmd_v4_ca_budget.lookups SET providers=providers||to_jsonb(provider) WHERE lookups.id=l.id;
   UPDATE unfarmd_v4_ca_budget.state SET lease=NULL WHERE singleton;
   ack:=jsonb_build_object('kind','published','policyHash',p.hash,'lookupId',l.id,'leaseId',c->>'leaseId','provider',provider,'responseSha256',c->>'responseSha256','receivedAt',(c->>'receivedAt')::bigint,'committedAt',t);
  END IF;
 ELSE RAISE EXCEPTION 'ca_invalid';END IF;
 INSERT INTO unfarmd_v4_ca_budget.history(server_ms,kind,receipt) VALUES(server_t,k,ack);RETURN ack;
END $f$;
REVOKE ALL ON ALL TABLES IN SCHEMA unfarmd_v4_ca_budget FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unfarmd_v4_ca_budget FROM PUBLIC;
RESET ROLE;
GRANT USAGE ON SCHEMA unfarmd_v4_ca_budget TO unfarmd_v4_ca_login,unfarmd_v4_ca_stopper_login;
GRANT EXECUTE ON FUNCTION unfarmd_v4_ca_budget.inspect_policy(text) TO unfarmd_v4_ca_login;
GRANT EXECUTE ON FUNCTION unfarmd_v4_ca_budget.step(jsonb,uuid,text) TO unfarmd_v4_ca_login,unfarmd_v4_ca_stopper_login;
-- No policy/state INSERT, runtime LOGIN, provider selection or existing-pilot mutation is executed.
COMMIT;
