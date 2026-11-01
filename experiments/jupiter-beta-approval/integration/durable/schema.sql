-- UNEXECUTED isolated database installer. Never run in neondb/unfarmd_v4_pilot.
-- Requires PostgreSQL >=16; installation owner is a non-superuser database owner.
-- No fsync assertion: Neon WAL durability still requires independent signed review.
BEGIN;
DO $$ BEGIN
 IF current_database() <> 'unfarmd_beta_authority' THEN RAISE EXCEPTION 'wrong_database'; END IF;
 IF current_setting('server_version_num')::integer < 160000 THEN RAISE EXCEPTION 'unsupported_version'; END IF;
END $$;
CREATE ROLE unfarmd_beta_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE unfarmd_beta_validator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE unfarmd_beta_consumer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE unfarmd_beta_stopper NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
-- Separate owner-approved role membership/bootstrap required before this installer.
-- Explicitly temporary membership/CREATE is needed for a PG18 non-superuser installer.
GRANT unfarmd_beta_owner TO CURRENT_USER WITH INHERIT TRUE, SET TRUE;
GRANT CREATE ON DATABASE unfarmd_beta_authority TO unfarmd_beta_owner;
CREATE SCHEMA unfarmd_beta AUTHORIZATION unfarmd_beta_owner;
SET LOCAL ROLE unfarmd_beta_owner;
REVOKE ALL ON SCHEMA unfarmd_beta FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA unfarmd_beta REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE unfarmd_beta.policy(id boolean PRIMARY KEY DEFAULT true CHECK(id), armed boolean NOT NULL DEFAULT false, stopped boolean NOT NULL DEFAULT false, epoch integer NOT NULL CHECK(epoch>0), policy_hash text NOT NULL CHECK(policy_hash ~ '^[a-f0-9]{64}$'), signatures integer NOT NULL DEFAULT 0 CHECK(signatures BETWEEN 0 AND 25), uses integer NOT NULL DEFAULT 0 CHECK(uses BETWEEN 0 AND 100), seq bigint NOT NULL DEFAULT 0, head text NOT NULL DEFAULT repeat('0',64), state_hash text NOT NULL CHECK(state_hash ~ '^[a-f0-9]{64}$'), last_clock timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE unfarmd_beta.grants(id uuid PRIMARY KEY, nonce text UNIQUE NOT NULL CHECK(nonce ~ '^[a-f0-9]{64}$'), epoch integer NOT NULL, record jsonb NOT NULL, request_hash text NOT NULL, fence bigint GENERATED ALWAYS AS IDENTITY UNIQUE, state text NOT NULL CHECK(state IN ('pending','active','uncertain','revoked')), calls integer NOT NULL DEFAULT 0 CHECK(calls BETWEEN 0 AND 5), uses integer NOT NULL DEFAULT 0 CHECK(uses BETWEEN 0 AND 4), per_mint jsonb NOT NULL DEFAULT '{}', envelope text, envelope_hash text, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE unfarmd_beta.operations(id uuid PRIMARY KEY, grant_id uuid NOT NULL REFERENCES unfarmd_beta.grants(id), mint text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE unfarmd_beta.events(seq bigint PRIMARY KEY, previous_hash text NOT NULL, event_hash text UNIQUE NOT NULL, payload_hash text NOT NULL, state_hash text NOT NULL, observed_ms bigint NOT NULL, kind text NOT NULL, grant_id uuid, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
-- Critical-state digest is compared to the independently retained current anchor.
CREATE FUNCTION unfarmd_beta.state_digest() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object(
 'policy',(SELECT jsonb_build_object('id',p.id,'armed',p.armed,'stopped',p.stopped,'epoch',p.epoch,'hash',p.policy_hash,'signatures',p.signatures,'uses',p.uses,'clock',(extract(epoch FROM p.last_clock)*1000000)::bigint) FROM unfarmd_beta.policy p WHERE id),
 'grants',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',g.id,'nonce',g.nonce,'epoch',g.epoch,'record',g.record,'requestHash',g.request_hash,'fence',g.fence,'state',g.state,'calls',g.calls,'uses',g.uses,'perMint',g.per_mint,'envelopeHash',g.envelope_hash) ORDER BY g.id),'[]'::jsonb) FROM unfarmd_beta.grants g),
 'operations',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'grant',o.grant_id,'mint',o.mint) ORDER BY o.id),'[]'::jsonb) FROM unfarmd_beta.operations o)
 )::text,'UTF8')),'hex')
$$;
-- One SECURITY DEFINER transaction; row lock serializes all budgets, fences and STOP.
CREATE FUNCTION unfarmd_beta.transition(op text, input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE p unfarmd_beta.policy%ROWTYPE; g unfarmd_beta.grants%ROWTYPE; r jsonb; at_ms bigint; h text; seq_next bigint; gid uuid; state_next text; payload_hash text; previous text; history_seq bigint; e record;
BEGIN
 SELECT * INTO STRICT p FROM unfarmd_beta.policy WHERE id FOR UPDATE;
 IF op='stop' AND p.stopped THEN RETURN jsonb_build_object('status','ok','seq',p.seq::text,'head',p.head,'stateHash',p.state_hash); END IF;
 IF op='stop' THEN UPDATE unfarmd_beta.policy SET stopped=true WHERE id;
 ELSE
  IF clock_timestamp()<p.last_clock THEN RETURN unfarmd_beta.transition('stop','{}'::jsonb); END IF;
  IF p.stopped OR NOT p.armed OR p.seq>=512 THEN RAISE EXCEPTION 'authority_held'; END IF;
  IF input->>'anchorStateHash' IS DISTINCT FROM p.state_hash OR p.state_hash IS DISTINCT FROM unfarmd_beta.state_digest() THEN RAISE EXCEPTION 'state_rollback'; END IF;
  previous=repeat('0',64);history_seq=0;
  FOR e IN SELECT * FROM unfarmd_beta.events ORDER BY seq LOOP
   history_seq=history_seq+1;
   IF e.seq<>history_seq OR e.previous_hash<>previous OR e.event_hash<>encode(sha256(convert_to(previous||':'||e.seq::text||':'||e.kind||':'||coalesce(e.grant_id::text,'global')||':'||e.payload_hash||':'||e.state_hash||':'||e.observed_ms::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'history_invalid'; END IF;
   previous=e.event_hash;
  END LOOP;
  IF history_seq<>p.seq OR previous<>p.head THEN RAISE EXCEPTION 'history_truncated'; END IF;
  IF op<>'check' THEN UPDATE unfarmd_beta.policy SET last_clock=clock_timestamp() WHERE id; END IF;
  IF (input->>'anchorSeq')::bigint IS DISTINCT FROM p.seq OR input->>'anchorHead' IS DISTINCT FROM p.head THEN RAISE EXCEPTION 'untrusted_continuity'; END IF;
  IF input->>'policyHash' IS DISTINCT FROM p.policy_hash OR (input->>'epoch')::integer IS DISTINCT FROM p.epoch THEN RAISE EXCEPTION 'policy_mismatch'; END IF;
  gid=(input->>'grantId')::uuid;
  IF op='prepare' THEN
   r=input->'record'; at_ms=(extract(epoch FROM clock_timestamp())*1000)::bigint;
   IF (p.signatures<25 AND jsonb_typeof(r)='object' AND r->>'version'='unfarmd-jupiter-beta-authorization/3' AND r->>'grantId'=input->>'grantId' AND r->>'policyHash'=p.policy_hash AND (r->>'epoch')::integer=p.epoch AND r->>'nonce' ~ '^[a-f0-9]{64}$' AND input->>'requestHash' ~ '^[a-f0-9]{64}$'
    AND (r->>'issuedAt')::bigint<=(r->>'startsAt')::bigint AND (r->>'startsAt')::bigint<=at_ms AND (r->>'expiresAt')::bigint>at_ms AND (r->>'expiresAt')::bigint-(r->>'issuedAt')::bigint<=600000
    AND jsonb_typeof(r->'scope'->'mints')='array' AND jsonb_array_length(r->'scope'->'mints') BETWEEN 1 AND 4 AND (SELECT count(DISTINCT value)=count(*) FROM jsonb_array_elements_text(r->'scope'->'mints'))
    AND (r->'scope'->>'maxUses')::integer BETWEEN 1 AND 4 AND (r->'scope'->>'perMintLimit')::integer BETWEEN 1 AND (r->'scope'->>'maxUses')::integer
    AND r->'scope'->>'provider'='jupiter-tokens-v2' AND r->'scope'->'retries'='0'::jsonb AND r->'scope'->'native'='false'::jsonb AND r->'scope'->'holders'='false'::jsonb AND r->'scope'->'save'='false'::jsonb AND r->'scope'->'publicDisplay'='false'::jsonb
    AND (r->'rights'->>'expiresAt')::bigint>=(r->>'expiresAt')::bigint AND (r->'edge'->>'expiresAt')::bigint>=(r->>'expiresAt')::bigint) IS NOT TRUE THEN RAISE EXCEPTION 'invalid_grant'; END IF;
   INSERT INTO unfarmd_beta.grants(id,nonce,epoch,record,request_hash,state) VALUES(gid,r->>'nonce',p.epoch,r,input->>'requestHash','pending') RETURNING * INTO g;
   UPDATE unfarmd_beta.policy SET signatures=signatures+1 WHERE id;
  ELSE
   SELECT * INTO STRICT g FROM unfarmd_beta.grants WHERE id=gid;
   IF op='revoke' THEN UPDATE unfarmd_beta.grants SET state='revoked' WHERE id=gid;
   ELSIF op='uncertain' THEN
    IF g.fence IS DISTINCT FROM (input->>'fence')::bigint THEN RAISE EXCEPTION 'fence'; END IF;
    UPDATE unfarmd_beta.grants SET state='uncertain' WHERE id=gid AND state='pending';
   ELSE
    IF g.epoch<>p.epoch OR (g.record->>'expiresAt')::bigint<=(extract(epoch FROM clock_timestamp())*1000)::bigint THEN RAISE EXCEPTION 'expired'; END IF;
    IF op IN ('call','publish') THEN
     IF g.state<>'pending' OR g.fence IS DISTINCT FROM (input->>'fence')::bigint THEN RAISE EXCEPTION 'fence'; END IF;
     IF op='call' THEN
      IF g.calls>=5 THEN RAISE EXCEPTION 'call_budget'; END IF;
      UPDATE unfarmd_beta.grants SET calls=calls+1 WHERE id=gid;
     ELSE
      IF (g.calls=5 AND length(input->>'envelope') BETWEEN 1 AND 65536 AND input->>'envelopeHash'=encode(sha256(convert_to(input->>'envelope','UTF8')),'hex')) IS NOT TRUE THEN RAISE EXCEPTION 'invalid_publish'; END IF;
      UPDATE unfarmd_beta.grants SET state='active',envelope=input->>'envelope',envelope_hash=input->>'envelopeHash' WHERE id=gid;
     END IF;
    ELSIF op IN ('check','reserve') THEN
     IF g.state<>'active' OR g.envelope_hash IS DISTINCT FROM input->>'envelopeHash' OR g.uses>=(g.record->'scope'->>'maxUses')::integer OR p.uses>=100 THEN RAISE EXCEPTION 'unusable_grant'; END IF;
     IF op='reserve' THEN
      IF NOT (g.record->'scope'->'mints' ? (input->>'mint')) OR coalesce((g.per_mint->>(input->>'mint'))::integer,0)>=(g.record->'scope'->>'perMintLimit')::integer THEN RAISE EXCEPTION 'mint_budget'; END IF;
      INSERT INTO unfarmd_beta.operations(id,grant_id,mint) VALUES((input->>'operationId')::uuid,gid,input->>'mint');
      UPDATE unfarmd_beta.grants SET uses=uses+1,per_mint=jsonb_set(per_mint,ARRAY[input->>'mint'],to_jsonb(coalesce((per_mint->>(input->>'mint'))::integer,0)+1)) WHERE id=gid;
      UPDATE unfarmd_beta.policy SET uses=uses+1 WHERE id;
     END IF;
    ELSE RAISE EXCEPTION 'unknown_operation'; END IF;
   END IF;
  END IF;
 END IF;
 state_next=unfarmd_beta.state_digest();
 UPDATE unfarmd_beta.policy SET state_hash=state_next WHERE id;
 IF op<>'check' THEN
  seq_next=p.seq+1;
  IF seq_next>512 AND op<>'stop' THEN RAISE EXCEPTION 'audit_capacity'; END IF;
  payload_hash=encode(sha256(convert_to(input::text,'UTF8')),'hex');at_ms=(extract(epoch FROM clock_timestamp())*1000)::bigint;
  h=encode(sha256(convert_to(p.head||':'||seq_next::text||':'||op||':'||coalesce(gid::text,'global')||':'||payload_hash||':'||state_next||':'||at_ms::text,'UTF8')),'hex');
  INSERT INTO unfarmd_beta.events(seq,previous_hash,event_hash,payload_hash,state_hash,observed_ms,kind,grant_id) VALUES(seq_next,p.head,h,payload_hash,state_next,at_ms,op,gid);
  UPDATE unfarmd_beta.policy SET seq=seq_next,head=h WHERE id;
 ELSE seq_next=p.seq;h=p.head; END IF;
 RETURN jsonb_build_object('status',CASE op WHEN 'prepare' THEN 'prepared' WHEN 'publish' THEN 'published' ELSE 'ok' END,'fence',g.fence::text,'seq',seq_next::text,'head',h,'stateHash',state_next);
END $$;
REVOKE ALL ON FUNCTION unfarmd_beta.transition(text,jsonb) FROM PUBLIC;
CREATE FUNCTION unfarmd_beta.issue(op text,input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN IF op NOT IN ('prepare','call','publish','uncertain','revoke') THEN RAISE EXCEPTION 'operation_denied';END IF;RETURN unfarmd_beta.transition(op,input);END $$;
CREATE FUNCTION unfarmd_beta.consume(op text,input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN IF op NOT IN ('check','reserve') THEN RAISE EXCEPTION 'operation_denied';END IF;RETURN unfarmd_beta.transition(op,input);END $$;
CREATE FUNCTION unfarmd_beta.stop() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT unfarmd_beta.transition('stop','{}'::jsonb) $$;
REVOKE ALL ON ALL TABLES IN SCHEMA unfarmd_beta FROM PUBLIC,unfarmd_beta_validator,unfarmd_beta_consumer,unfarmd_beta_stopper;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA unfarmd_beta FROM PUBLIC,unfarmd_beta_validator,unfarmd_beta_consumer,unfarmd_beta_stopper;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unfarmd_beta FROM PUBLIC;
GRANT USAGE ON SCHEMA unfarmd_beta TO unfarmd_beta_validator,unfarmd_beta_consumer,unfarmd_beta_stopper;
GRANT EXECUTE ON FUNCTION unfarmd_beta.issue(text,jsonb) TO unfarmd_beta_validator;
GRANT EXECUTE ON FUNCTION unfarmd_beta.consume(text,jsonb) TO unfarmd_beta_consumer;
GRANT EXECUTE ON FUNCTION unfarmd_beta.stop() TO unfarmd_beta_stopper;
-- No policy row: every operation fails closed pending separate exact signed bootstrap.
RESET ROLE;
REVOKE CREATE ON DATABASE unfarmd_beta_authority FROM unfarmd_beta_owner;
REVOKE unfarmd_beta_owner FROM CURRENT_USER;
COMMIT;
