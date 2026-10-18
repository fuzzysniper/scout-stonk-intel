-- Owner-reviewed migration; NEVER run automatically by the API. PostgreSQL 15+.
BEGIN;
CREATE SCHEMA scout_mint;
REVOKE ALL ON SCHEMA scout_mint FROM PUBLIC;
CREATE ROLE scout_mint_runtime NOLOGIN;
GRANT USAGE ON SCHEMA scout_mint TO scout_mint_runtime;
CREATE TABLE scout_mint.policy (
 id text PRIMARY KEY CHECK(id='scout-helius-mint/production-v1'),
 seq bigint NOT NULL DEFAULT 0 CHECK(seq BETWEEN 0 AND 9007199254740991),
 highest_slot bigint NOT NULL DEFAULT 0 CHECK(highest_slot BETWEEN 0 AND 9007199254740991),
 last_clock bigint NOT NULL DEFAULT 0 CHECK(last_clock BETWEEN 0 AND 253402300799999), circuit text,
 lease_id bigint, lease_mint text, lease_until bigint, last_rpc bigint,
 minute bigint NOT NULL DEFAULT -1 CHECK(minute>=-1), reads integer NOT NULL DEFAULT 0 CHECK(reads BETWEEN 0 AND 30),
 rpc_min integer NOT NULL DEFAULT 0 CHECK(rpc_min BETWEEN 0 AND 3),
 day bigint NOT NULL DEFAULT -1 CHECK(day>=-1), rpc_day integer NOT NULL DEFAULT 0 CHECK(rpc_day BETWEEN 0 AND 120),
 CHECK(last_rpc IS NULL OR last_rpc>=0),
 CHECK ((lease_id IS NULL AND lease_mint IS NULL AND lease_until IS NULL) OR
        (lease_id IS NOT NULL AND lease_id=seq AND lease_mint IS NOT NULL AND lease_until IS NOT NULL AND last_rpc IS NOT NULL AND lease_until=last_rpc+15000))
);
CREATE TABLE scout_mint.clients (
 policy text NOT NULL REFERENCES scout_mint.policy(id), client text NOT NULL CHECK(client ~ '^[a-f0-9]{64}$'),
 minute bigint NOT NULL, reads integer NOT NULL CHECK(reads BETWEEN 0 AND 6), expires bigint NOT NULL,
 PRIMARY KEY(policy,client)
);
CREATE INDEX clients_expiry ON scout_mint.clients(policy,expires);
CREATE TABLE scout_mint.cache (
 policy text NOT NULL REFERENCES scout_mint.policy(id), mint text NOT NULL,
 entry jsonb NOT NULL CHECK(octet_length(entry::text)<=20000), expires bigint NOT NULL,
 PRIMARY KEY(policy,mint)
);
CREATE INDEX cache_expiry ON scout_mint.cache(policy,expires);
REVOKE ALL ON ALL TABLES IN SCHEMA scout_mint FROM PUBLIC,scout_mint_runtime;

CREATE FUNCTION scout_mint.step(c jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,scout_mint SET lock_timeout='100ms'
AS $function$
DECLARE
 p scout_mint.policy%ROWTYPE; cl scout_mint.clients%ROWTYPE;
 n bigint; minute_now bigint; day_now bigint; base jsonb; result jsonb;
 kind text; input_mint text; client_key text; reason text; cached jsonb; e jsonb; slot_now bigint;
 reasons text[]:=ARRAY['disabled','server_only','invalid_mint','admission_limited','development_budget','circuit_open','timeout','access_denied','rate_limited','upstream_unavailable','network_unavailable','invalid_response','response_too_large','rpc_error','stale_source','invalid_clock','not_found','wrong_owner','not_mint','uninitialized','unparsed_account'];
BEGIN
 IF octet_length(c::text)>40000 OR jsonb_typeof(c)<>'object' THEN RAISE EXCEPTION 'invalid_command'; END IF;
 -- The client uses explicit BEGIN / SET LOCAL synchronous_commit=on / SELECT / COMMIT.
 IF current_setting('synchronous_commit')<>'on' OR pg_is_in_recovery() THEN RAISE EXCEPTION 'durability_required'; END IF;
 SELECT * INTO p FROM scout_mint.policy WHERE id='scout-helius-mint/production-v1' FOR UPDATE;
 n:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 base:=jsonb_build_object('policy','scout-helius-mint/production-v1','now',n);
 IF NOT FOUND THEN RETURN base||jsonb_build_object('kind','denied','reason','upstream_unavailable','retryAfter',NULL); END IF;
 IF c->>'policy' IS DISTINCT FROM p.id THEN reason:='invalid_response';
 ELSIF n<p.last_clock THEN reason:='invalid_clock';
 ELSIF p.minute>n/60000 OR p.day>n/86400000 OR p.last_rpc>n THEN reason:='invalid_clock';
 ELSIF p.circuit IS NOT NULL THEN RETURN base||jsonb_build_object('kind','denied','reason','circuit_open','retryAfter',NULL);
 ELSIF p.lease_until IS NOT NULL AND n>=p.lease_until THEN reason:='circuit_open'; END IF;
 kind:=c->>'kind'; input_mint:=c->>'mint';
 IF reason IS NULL AND kind IN ('stop','fail') THEN
  IF kind='fail' AND (c#>>'{lease,id}' IS DISTINCT FROM p.lease_id::text OR c#>>'{lease,mint}' IS DISTINCT FROM p.lease_mint OR c#>>'{lease,expiresAt}' IS DISTINCT FROM p.lease_until::text) THEN reason:='invalid_response';
  ELSE reason:=CASE WHEN c->>'reason'=ANY(reasons) THEN c->>'reason' ELSE 'invalid_response' END; END IF;
 END IF;
 IF reason IS NULL AND kind='complete' THEN
  IF p.lease_id IS NULL OR c#>>'{lease,id}' IS DISTINCT FROM p.lease_id::text OR c#>>'{lease,mint}' IS DISTINCT FROM p.lease_mint OR c#>>'{lease,expiresAt}' IS DISTINCT FROM p.lease_until::text THEN reason:='invalid_response';
  ELSIF coalesce(c->>'slot','') !~ '^[1-9][0-9]{0,15}$' OR (c->>'slot')::numeric>9007199254740991 THEN reason:='invalid_response';
  ELSE
   slot_now:=(c->>'slot')::bigint;
   IF slot_now<p.highest_slot THEN reason:='stale_source'; END IF;
  END IF;
  e:=c->'cache';
  IF reason IS NULL AND e IS NOT NULL AND e<>'null'::jsonb THEN
   IF jsonb_typeof(e)<>'object' OR e->>'mint' IS DISTINCT FROM p.lease_mint OR e->>'slot' IS DISTINCT FROM c->>'slot'
    OR jsonb_typeof(e->'json')<>'string' OR octet_length(e->>'json')>16384 OR coalesce(e->>'mac','') !~ '^[a-f0-9]{64}$'
    OR coalesce(e->>'checkedAt','') !~ '^[0-9]{1,15}$' OR coalesce(e->>'expiresAt','') !~ '^[0-9]{1,15}$'
    OR (e->>'checkedAt')::bigint>n OR (e->>'expiresAt')::bigint<>(e->>'checkedAt')::bigint+30000 OR n>=(e->>'expiresAt')::bigint
   THEN reason:='stale_source'; END IF;
  END IF;
  IF reason IS NULL THEN
   DELETE FROM scout_mint.cache WHERE policy=p.id AND expires<=n;
   IF e IS NOT NULL AND e<>'null'::jsonb THEN
    DELETE FROM scout_mint.cache WHERE policy=p.id AND mint=p.lease_mint;
    IF (SELECT count(*) FROM scout_mint.cache WHERE policy=p.id)>=8 THEN
     DELETE FROM scout_mint.cache WHERE policy=p.id AND mint=(SELECT x.mint FROM scout_mint.cache x WHERE x.policy=p.id ORDER BY x.expires,x.mint LIMIT 1);
    END IF;
    INSERT INTO scout_mint.cache VALUES(p.id,p.lease_mint,e,(e->>'expiresAt')::bigint);
   END IF;
   result:=base||jsonb_build_object('kind','committed','leaseId',p.lease_id);
   UPDATE scout_mint.policy SET highest_slot=slot_now,last_clock=n,lease_id=NULL,lease_mint=NULL,lease_until=NULL WHERE id=p.id;
   RETURN result;
  END IF;
 END IF;
 IF reason IS NOT NULL THEN
  UPDATE scout_mint.policy SET circuit=reason,last_clock=greatest(last_clock,n),lease_id=NULL,lease_mint=NULL,lease_until=NULL WHERE id=p.id;
  DELETE FROM scout_mint.cache WHERE policy=p.id;
  RETURN base||jsonb_build_object('kind','denied','reason',reason,'retryAfter',NULL);
 END IF;
 IF kind IS DISTINCT FROM 'admit' OR coalesce(input_mint,'') !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$' OR coalesce(c->>'client','') !~ '^[a-f0-9]{64}$' THEN
  RETURN base||jsonb_build_object('kind','denied','reason','invalid_response','retryAfter',NULL);
 END IF;
 DELETE FROM scout_mint.cache WHERE policy=p.id AND expires<=n;
 DELETE FROM scout_mint.clients WHERE policy=p.id AND expires<=n;
 minute_now:=n/60000; day_now:=n/86400000; client_key:=c->>'client';
 IF p.minute<>minute_now THEN p.minute:=minute_now; p.reads:=0; p.rpc_min:=0; END IF;
 IF p.day<>day_now THEN p.day:=day_now; p.rpc_day:=0; END IF;
 UPDATE scout_mint.policy SET minute=p.minute,reads=p.reads,rpc_min=p.rpc_min,day=p.day,rpc_day=p.rpc_day,last_clock=n WHERE id=p.id;
 IF p.reads>=30 THEN RETURN base||jsonb_build_object('kind','denied','reason','admission_limited','retryAfter',60-(n%60000)/1000); END IF;
 SELECT * INTO cl FROM scout_mint.clients WHERE policy=p.id AND client=client_key;
 IF NOT FOUND THEN
  IF (SELECT count(*) FROM scout_mint.clients WHERE policy=p.id)>=128 THEN RETURN base||jsonb_build_object('kind','denied','reason','admission_limited','retryAfter',120); END IF;
  cl.minute:=minute_now; cl.reads:=0;
 END IF;
 IF cl.minute<>minute_now THEN cl.minute:=minute_now; cl.reads:=0; END IF;
 IF cl.reads>=6 THEN RETURN base||jsonb_build_object('kind','denied','reason','admission_limited','retryAfter',60-(n%60000)/1000); END IF;
 INSERT INTO scout_mint.clients VALUES(p.id,client_key,minute_now,cl.reads+1,n+120000)
 ON CONFLICT(policy,client) DO UPDATE SET minute=excluded.minute,reads=excluded.reads,expires=excluded.expires;
 UPDATE scout_mint.policy SET reads=reads+1 WHERE id=p.id;
 SELECT entry INTO cached FROM scout_mint.cache WHERE policy=p.id AND scout_mint.cache.mint=input_mint AND expires>n;
 IF FOUND THEN RETURN base||jsonb_build_object('kind','cached','entry',cached,'highestSlot',p.highest_slot::text); END IF;
 IF p.lease_id IS NOT NULL THEN RETURN base||jsonb_build_object('kind','denied','reason','admission_limited','retryAfter',greatest(1,ceil((p.lease_until-n)/1000.0)::integer)); END IF;
 IF p.rpc_day>=120 THEN RETURN base||jsonb_build_object('kind','denied','reason','admission_limited','retryAfter',3600); END IF;
 IF p.rpc_min>=3 THEN RETURN base||jsonb_build_object('kind','denied','reason','admission_limited','retryAfter',60-(n%60000)/1000); END IF;
 IF p.last_rpc IS NOT NULL AND n-p.last_rpc<10000 THEN RETURN base||jsonb_build_object('kind','denied','reason','admission_limited','retryAfter',ceil((10000-n+p.last_rpc)/1000.0)::integer); END IF;
 IF p.seq>=9007199254740991 THEN RAISE EXCEPTION 'sequence_exhausted'; END IF;
 UPDATE scout_mint.policy SET seq=seq+1,lease_id=seq+1,lease_mint=input_mint,lease_until=n+15000,last_rpc=n,rpc_min=rpc_min+1,rpc_day=rpc_day+1 WHERE id=p.id;
 RETURN base||jsonb_build_object('kind','lease','lease',jsonb_build_object('id',p.seq+1,'mint',input_mint,'expiresAt',n+15000));
END;
$function$;
REVOKE ALL ON FUNCTION scout_mint.step(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION scout_mint.step(jsonb) TO scout_mint_runtime;
COMMIT;
