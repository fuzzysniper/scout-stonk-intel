-- OWNER REVIEW ONLY. Additive, atomic, initially unapproved. Never executed at deploy/startup.
BEGIN;
CREATE ROLE scout_continuous_worker LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
CREATE ROLE scout_continuous_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
CREATE ROLE scout_continuous_stop LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
CREATE ROLE scout_continuous_maintenance LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
GRANT CONNECT ON DATABASE neondb TO scout_continuous_worker,scout_continuous_reader,scout_continuous_stop,scout_continuous_maintenance;
CREATE SCHEMA scout_continuous;
REVOKE ALL ON SCHEMA scout_continuous FROM PUBLIC;
GRANT USAGE ON SCHEMA scout_continuous TO scout_continuous_worker,scout_continuous_reader,scout_continuous_stop,scout_continuous_maintenance;
CREATE TABLE scout_continuous.control (
 id boolean PRIMARY KEY CHECK(id), approval jsonb, grant_hash text,
 database_epoch timestamptz,
 stopped boolean NOT NULL DEFAULT false, reason text,
 worker uuid, fence uuid, lease_until timestamptz, child uuid, connected boolean NOT NULL DEFAULT false,
 usage jsonb NOT NULL DEFAULT '{"credits":0,"bytes":0,"frames":0,"rpc":0,"connections":0,"children":0,"auditRecords":0,"framesReceived":0,"bytesReceived":0}',
 ticket bigint NOT NULL DEFAULT 0, heartbeat_at timestamptz, health jsonb,
 gap_count bigint NOT NULL DEFAULT 0, error_count bigint NOT NULL DEFAULT 0,
 gap_since timestamptz, gap_ended_at timestamptz, last_persisted_at timestamptz,
 meter_at timestamptz, meter_balance bigint, meter_attributed boolean NOT NULL DEFAULT false,
 meter_mismatch boolean NOT NULL DEFAULT false, hard_cap_until timestamptz, meter_receipt text,
 delete_through timestamptz, physical_through timestamptz, backups_excluded boolean NOT NULL DEFAULT false, retention_receipt text,
 watchdog_at timestamptz, independent_watchdog boolean NOT NULL DEFAULT false, shutdown_capable boolean NOT NULL DEFAULT false, watchdog_receipt text,
 notification_at timestamptz, notice_attempts integer NOT NULL DEFAULT 0,
 CHECK ((worker IS NULL AND fence IS NULL AND lease_until IS NULL AND child IS NULL AND NOT connected) OR (worker IS NOT NULL AND fence IS NOT NULL AND lease_until IS NOT NULL)),
 CHECK ((approval IS NULL AND grant_hash IS NULL) OR (approval IS NOT NULL AND grant_hash ~ '^[a-f0-9]{64}$'))
);
INSERT INTO scout_continuous.control(id) VALUES(true);
CREATE TABLE scout_continuous.children (
 id uuid PRIMARY KEY, starts_at timestamptz NOT NULL, ends_at text NOT NULL,
 status text NOT NULL CHECK(status IN ('open','closed')), closed_at timestamptz,
 connections integer NOT NULL DEFAULT 0 CHECK(connections BETWEEN 0 AND 3),
 rpc integer NOT NULL DEFAULT 0 CHECK(rpc BETWEEN 0 AND 40), finalized integer NOT NULL DEFAULT 0 CHECK(finalized BETWEEN 0 AND 20),
 records integer NOT NULL DEFAULT 0 CHECK(records BETWEEN 0 AND 200)
);
CREATE UNIQUE INDEX ON scout_continuous.children(status) WHERE status='open';
CREATE TABLE scout_continuous.tickets (id bigint PRIMARY KEY,child uuid NOT NULL REFERENCES scout_continuous.children(id),resource text NOT NULL CHECK(resource IN ('connection','rpc')),credits bigint NOT NULL,bytes bigint NOT NULL,frames bigint NOT NULL,at timestamptz NOT NULL);
-- Rights-gated compact first-seen metadata, <=owner auditRecords. No raw source bodies.
CREATE TABLE scout_continuous.first_seen (signature text PRIMARY KEY,slot bigint NOT NULL,received_at text NOT NULL,notification_hash text NOT NULL,identity_hash text NOT NULL,finalized boolean NOT NULL DEFAULT false,final_hash text,CHECK((NOT finalized AND final_hash IS NULL) OR (finalized AND final_hash ~ '^[a-f0-9]{64}$')));
CREATE TABLE scout_continuous.events (signature text PRIMARY KEY REFERENCES scout_continuous.first_seen(signature),received_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,payload jsonb NOT NULL CHECK(pg_column_size(payload)<4096));
CREATE INDEX ON scout_continuous.events(received_at DESC,signature);
CREATE TABLE scout_continuous.notices (id uuid PRIMARY KEY,kind text UNIQUE NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL,status text NOT NULL CHECK(status IN ('pending','inflight','delivered','uncertain')),lease uuid,lease_until timestamptz,occurrences bigint NOT NULL DEFAULT 1);
CREATE TABLE scout_continuous.deliveries (id uuid PRIMARY KEY,delivered_at timestamptz NOT NULL,receipt_hash text NOT NULL);

CREATE FUNCTION scout_continuous.b58(s text,expected integer) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $fn$
DECLARE n numeric:=0; bytes integer:=0; zeros integer:=0; i integer; d integer; alphabet text:='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
BEGIN
 IF s IS NULL OR length(s)<1 OR length(s)>88 THEN RETURN false; END IF;
 FOR i IN 1..length(s) LOOP d:=strpos(alphabet,substr(s,i,1))-1;IF d<0 THEN RETURN false;END IF;n:=n*58+d;END LOOP;
 WHILE n>0 LOOP bytes:=bytes+1;n:=trunc(n/256);END LOOP;
 FOR i IN 1..length(s) LOOP EXIT WHEN substr(s,i,1)<>'1';zeros:=zeros+1;END LOOP;
 RETURN bytes+zeros=expected;
END
$fn$;
CREATE FUNCTION scout_continuous.utc(t timestamptz) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $fn$
 SELECT to_char(t AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$fn$;
CREATE FUNCTION scout_continuous.valid_clock(j jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $fn$
 SELECT coalesce(jsonb_typeof(j)='string' AND (j#>>'{}')~'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3,6})?Z$',false)
$fn$;
CREATE FUNCTION scout_continuous.canonical(j jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $fn$
 SELECT CASE jsonb_typeof(j)
 WHEN 'object' THEN '{'||coalesce((SELECT string_agg(to_jsonb(key)::text||':'||scout_continuous.canonical(value),',' ORDER BY key COLLATE "C") FROM jsonb_each(j)),'')||'}'
 WHEN 'array' THEN '['||coalesce((SELECT string_agg(scout_continuous.canonical(value),',' ORDER BY ord) FROM jsonb_array_elements(j) WITH ORDINALITY a(value,ord)),'')||']'
 ELSE j::text END
$fn$;
CREATE FUNCTION scout_continuous.retired() RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $fn$
 SELECT coalesce((SELECT stopped AND NOT connected AND source_state='closed' AND worker IS NULL AND fence IS NULL AND lease_until IS NULL FROM scout_live.control WHERE id),false)
$fn$;
CREATE FUNCTION scout_continuous.enqueue(k text,why text,t timestamptz) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
 INSERT INTO scout_continuous.notices(id,kind,reason,created_at,status) VALUES(gen_random_uuid(),k,why,t,'pending')
 ON CONFLICT(kind) DO UPDATE SET reason=excluded.reason,occurrences=scout_continuous.notices.occurrences+1;
END
$fn$;
CREATE FUNCTION scout_continuous.assurance(c scout_continuous.control,t timestamptz) RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $fn$
 SELECT jsonb_build_object('meterAt',scout_continuous.utc(c.meter_at),'meterBalance',c.meter_balance,'meterAttributed',c.meter_attributed,'meterMismatch',c.meter_mismatch,'hardCapUntil',scout_continuous.utc(c.hard_cap_until),
 'purgeThrough',CASE WHEN c.delete_through IS NULL OR c.physical_through IS NULL THEN NULL ELSE scout_continuous.utc(least(c.delete_through,c.physical_through)) END,
 'purgeHealthy',c.delete_through IS NOT NULL AND c.physical_through IS NOT NULL AND least(c.delete_through,c.physical_through)>=t-interval '60 seconds',
 'backupsExcluded',c.backups_excluded,'notificationAt',scout_continuous.utc(c.notification_at),
 'notificationHealthy',c.notification_at IS NOT NULL AND c.notification_at>=t-interval '5 minutes' AND NOT EXISTS(SELECT 1 FROM scout_continuous.notices WHERE status='uncertain' OR status='inflight' AND lease_until<=t),
 'independentWatchdog',c.independent_watchdog AND c.shutdown_capable AND c.watchdog_at IS NOT NULL AND c.watchdog_at>=t-interval '30 seconds','legacyRetired',scout_continuous.retired())
$fn$;
CREATE FUNCTION scout_continuous.gate(c scout_continuous.control,t timestamptz) RETURNS text LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $fn$
DECLARE a jsonb:=scout_continuous.assurance(c,t);
BEGIN
 IF c.approval IS NULL THEN RETURN 'unapproved'; END IF;
 IF t<(c.approval->>'startsAt')::timestamptz THEN RETURN 'not_started'; END IF;
 IF t>=(c.approval->>'endsAt')::timestamptz THEN RETURN 'parent_expired'; END IF;
 IF c.database_epoch IS DISTINCT FROM pg_postmaster_start_time() THEN RETURN 'database_epoch_changed'; END IF;
 IF c.worker IS NOT NULL AND t>=c.lease_until THEN RETURN 'unclean_lease'; END IF;
 IF c.child IS NOT NULL AND t>=(SELECT ends_at::timestamptz FROM scout_continuous.children WHERE id=c.child) THEN RETURN 'uncertain_child_expiry'; END IF;
 IF NOT (a->>'legacyRetired')::boolean THEN RETURN 'legacy_not_retired'; END IF;
 IF c.meter_at IS NULL OR c.meter_balance IS NULL OR c.meter_at<t-interval '5 minutes' OR NOT c.meter_attributed OR c.meter_mismatch OR c.hard_cap_until IS NULL OR c.hard_cap_until<(c.approval->>'endsAt')::timestamptz OR c.meter_balance<(c.approval->'limits'->>'credits')::bigint-(c.usage->>'credits')::bigint+(c.approval->>'incidentReserveCredits')::bigint THEN RETURN 'meter_unproven'; END IF;
 IF NOT (a->>'purgeHealthy')::boolean OR NOT c.backups_excluded THEN RETURN 'retention_unproven'; END IF;
 IF NOT (a->>'notificationHealthy')::boolean THEN RETURN 'notification_unproven'; END IF;
 IF NOT (a->>'independentWatchdog')::boolean THEN RETURN 'watchdog_unproven'; END IF;
 RETURN NULL;
END
$fn$;
CREATE FUNCTION scout_continuous.reply(c scout_continuous.control,good boolean,why text,t timestamptz,extra jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $fn$
 SELECT jsonb_build_object('v',2,'ok',good,'reason',why,'parent',c.approval->>'parent','head',c.approval->>'head','scope',c.approval->>'policyHash','grantHash',c.grant_hash,'worker',c.worker,'fence',c.fence,'stopped',c.stopped,'connected',c.connected,'serverTime',scout_continuous.utc(t),'leaseUntil',scout_continuous.utc(c.lease_until),'parentEndsAt',c.approval->>'endsAt',
 'child',(SELECT jsonb_build_object('id',id,'startsAt',scout_continuous.utc(starts_at),'endsAt',ends_at) FROM scout_continuous.children WHERE id=c.child),'usage',c.usage,'assurance',scout_continuous.assurance(c,t))||extra
$fn$;

CREATE FUNCTION scout_continuous.initialize(g jsonb) RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE c scout_continuous.control; field_name text; gh text;
BEGIN
 SELECT * INTO STRICT c FROM scout_continuous.control WHERE id FOR UPDATE;
 -- Lock legacy row too. No source/history/policy is modified; v1 STOP must already be permanent.
 PERFORM 1 FROM scout_live.control WHERE id FOR UPDATE;
 IF c.approval IS NOT NULL OR c.stopped OR c.worker IS NOT NULL OR c.ticket<>0 OR NOT scout_continuous.retired() OR EXISTS(SELECT 1 FROM scout_continuous.children) THEN RAISE EXCEPTION 'NO_GO_initial_only'; END IF;
 IF jsonb_typeof(g)<>'object' OR octet_length(g::text)>8192 OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(g) key) IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(ARRAY['version','parent','head','service','policyHash','sourcePolicyHash','startsAt','endsAt','resetAt','allowanceCredits','otherReserveCredits','incidentReserveCredits','limits','connectionCredits','rpcCredits','rightsHash','accountHash','retentionHash','notificationHash','mobileHash','sourceGo','hostingGo','rightsGo','spendGo','retentionGo','notificationGo','mobileGo']) k)
 OR g->>'version' IS DISTINCT FROM 'unfarmd-continuous/1' OR g->>'policyHash' IS DISTINCT FROM 'a3707b38dbe3cc89aa1aa9f239e0cc7f28df8dbb98d119658c9ee75b90152a86' OR g->>'sourcePolicyHash' IS DISTINCT FROM 'e39733b2703536cfbae9381c19cafc016a38c2dff907b71af359b5c6aa534202' OR (g->>'parent') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' OR (g->>'head') !~ '^[a-f0-9]{40}$' OR (g->>'service') !~ '^srv-[a-z0-9]+$' THEN RAISE EXCEPTION 'invalid_grant'; END IF;
 FOR field_name IN SELECT unnest(ARRAY['parent','head','service','version','policyHash','sourcePolicyHash']) LOOP IF jsonb_typeof(g->field_name) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_grant';END IF;END LOOP;
 FOR field_name IN SELECT unnest(ARRAY['sourceGo','hostingGo','rightsGo','spendGo','retentionGo','notificationGo','mobileGo']) LOOP IF g->field_name IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'owner_GO_required'; END IF; END LOOP;
 FOR field_name IN SELECT unnest(ARRAY['rightsHash','accountHash','retentionHash','notificationHash','mobileHash']) LOOP IF jsonb_typeof(g->field_name) IS DISTINCT FROM 'string' OR (g->>field_name)!~ '^[a-f0-9]{64}$' OR (g->>field_name)~ '^0+$' THEN RAISE EXCEPTION 'evidence_required'; END IF; END LOOP;
 FOR field_name IN SELECT unnest(ARRAY['startsAt','endsAt','resetAt']) LOOP IF jsonb_typeof(g->field_name) IS DISTINCT FROM 'string' OR (g->>field_name)!~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3,6})?Z$' THEN RAISE EXCEPTION 'invalid_clock'; END IF; END LOOP;
 IF (g->>'endsAt')::timestamptz<=(g->>'startsAt')::timestamptz OR (g->>'endsAt')::timestamptz>(g->>'startsAt')::timestamptz+interval '7 days' OR (g->>'endsAt')::timestamptz>(g->>'resetAt')::timestamptz OR (g->>'endsAt')::timestamptz<clock_timestamp()+interval '1 minute' THEN RAISE EXCEPTION 'parent_time'; END IF;
 IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(g->'limits') key) IS DISTINCT FROM ARRAY['auditRecords','bytes','children','connections','credits','frames','rpc']::text[] THEN RAISE EXCEPTION 'invalid_limits'; END IF;
 FOR field_name IN SELECT unnest(ARRAY['credits','bytes','frames','rpc','connections','children','auditRecords']) LOOP IF jsonb_typeof(g->'limits'->field_name) IS DISTINCT FROM 'number' OR (g->'limits'->>field_name)!~ '^[1-9][0-9]*$' OR (g->'limits'->>field_name)::numeric>9007199254740991 THEN RAISE EXCEPTION 'invalid_limits'; END IF; END LOOP;
 FOR field_name IN SELECT unnest(ARRAY['allowanceCredits','otherReserveCredits','incidentReserveCredits','connectionCredits','rpcCredits']) LOOP IF jsonb_typeof(g->field_name) IS DISTINCT FROM 'number' OR (g->>field_name)!~ '^[0-9]+$' OR (g->>field_name)::numeric>9007199254740991 THEN RAISE EXCEPTION 'invalid_credits'; END IF; END LOOP;
 IF (g->>'connectionCredits')::bigint<1 OR (g->>'rpcCredits')::bigint<1 OR (g->'limits'->>'credits')::bigint>(g->>'allowanceCredits')::bigint-(g->>'otherReserveCredits')::bigint-(g->>'incidentReserveCredits')::bigint OR (g->>'connectionCredits')::bigint>(g->'limits'->>'credits')::bigint OR (g->'limits'->>'bytes')::bigint<16777216 OR (g->'limits'->>'frames')::bigint<20000 OR (g->'limits'->>'children')::bigint>100000 OR (g->'limits'->>'auditRecords')::bigint>10000000 THEN RAISE EXCEPTION 'credit_allocation'; END IF;
 gh:=encode(sha256(convert_to(scout_continuous.canonical(g),'UTF8')),'hex');
 UPDATE scout_continuous.control SET approval=g,grant_hash=gh,database_epoch=pg_postmaster_start_time() WHERE id;
 PERFORM scout_continuous.enqueue('health','INITIAL_CHANNEL_CHECK',clock_timestamp());
 RETURN gh;
END
$fn$;

CREATE FUNCTION scout_continuous.step(cmd jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE c scout_continuous.control; ch scout_continuous.children; t timestamptz; op text:=cmd->>'op'; expected text[]:=ARRAY['v','op','parent','head','scope','grantHash','worker']; why text; cleanup boolean; next jsonb; cost bigint; field_name text; r jsonb; prior scout_continuous.first_seen; disposition text; used bigint; received timestamptz;
BEGIN
 IF jsonb_typeof(cmd) IS DISTINCT FROM 'object' OR octet_length(cmd::text)>8192 OR cmd->'v' IS DISTINCT FROM '2'::jsonb THEN RAISE EXCEPTION 'invalid_command'; END IF;
 IF op<>'claim' THEN expected:=expected||ARRAY['fence']; END IF;
 CASE op WHEN 'claim' THEN NULL; WHEN 'beginChild' THEN expected:=expected||ARRAY['child','endsAt']; WHEN 'reserve' THEN expected:=expected||ARRAY['child','resource']; WHEN 'append' THEN expected:=expected||ARRAY['child','record']; WHEN 'heartbeat' THEN expected:=expected||ARRAY['child','health']; WHEN 'gap' THEN expected:=expected||ARRAY['child','phase','reason','observedAt','lastPersistedAt']; WHEN 'closeChild','connectionClosed' THEN expected:=expected||ARRAY['child','connectionClosed']; WHEN 'stop','notify' THEN expected:=expected||ARRAY['reason']; WHEN 'release' THEN expected:=expected||ARRAY['connectionClosed']; ELSE RAISE EXCEPTION 'invalid_command'; END CASE;
 IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(cmd) k) IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(expected) k) THEN RAISE EXCEPTION 'invalid_command'; END IF;
 SELECT * INTO STRICT c FROM scout_continuous.control WHERE id FOR UPDATE;
 t:=date_trunc('milliseconds',clock_timestamp());
 IF c.approval IS NULL OR cmd->>'parent' IS DISTINCT FROM c.approval->>'parent' OR cmd->>'head' IS DISTINCT FROM c.approval->>'head' OR cmd->>'scope' IS DISTINCT FROM c.approval->>'policyHash' OR cmd->>'grantHash' IS DISTINCT FROM c.grant_hash OR (cmd->>'worker') IS NULL OR (cmd->>'worker')!~ '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' THEN RAISE EXCEPTION 'scope_mismatch'; END IF;
 IF op<>'claim' AND (c.worker IS NULL OR c.worker IS DISTINCT FROM (cmd->>'worker')::uuid OR c.fence IS DISTINCT FROM (cmd->>'fence')::uuid) THEN RETURN scout_continuous.reply(c,false,'fenced',t); END IF;
 cleanup:=op IN ('closeChild','connectionClosed','stop','notify','release','gap','heartbeat');
 IF c.stopped AND NOT cleanup THEN RETURN scout_continuous.reply(c,false,'stopped',t); END IF;
 IF NOT cleanup THEN
  PERFORM 1 FROM scout_live.control WHERE id FOR UPDATE;
  why:=scout_continuous.gate(c,t);
  IF why IS NOT NULL THEN
   IF c.worker IS NOT NULL OR (c.usage->>'children')::bigint>0 OR why IN ('parent_expired','unclean_lease','uncertain_child_expiry','database_epoch_changed') THEN
    UPDATE scout_continuous.control SET stopped=true,reason=coalesce(reason,why),error_count=error_count+CASE WHEN stopped THEN 0 ELSE 1 END,gap_since=coalesce(gap_since,last_persisted_at,t),gap_count=gap_count+CASE WHEN gap_since IS NULL THEN 1 ELSE 0 END WHERE id RETURNING * INTO c;
    PERFORM scout_continuous.enqueue('stop',why,t);
   END IF;
   RETURN scout_continuous.reply(c,false,why,t);
  END IF;
 END IF;
 IF cleanup AND NOT c.stopped AND op IN ('heartbeat','gap') THEN
  why:=scout_continuous.gate(c,t);
  IF why IS NOT NULL THEN UPDATE scout_continuous.control SET stopped=true,reason=coalesce(reason,why),error_count=error_count+CASE WHEN stopped THEN 0 ELSE 1 END,gap_since=coalesce(gap_since,last_persisted_at,t),gap_count=gap_count+CASE WHEN gap_since IS NULL THEN 1 ELSE 0 END WHERE id RETURNING * INTO c;PERFORM scout_continuous.enqueue('stop',why,t);END IF;
 END IF;
 IF op='claim' THEN
  IF c.worker IS NOT NULL THEN RETURN scout_continuous.reply(c,false,'occupied',t); END IF;
  UPDATE scout_continuous.control SET worker=(cmd->>'worker')::uuid,fence=gen_random_uuid(),lease_until=least(t+interval '12 seconds',(approval->>'endsAt')::timestamptz),heartbeat_at=t,database_epoch=pg_postmaster_start_time() WHERE id RETURNING * INTO c;
  RETURN scout_continuous.reply(c,true,NULL,t);
 END IF;
 IF cmd ? 'child' AND cmd->'child'<>'null'::jsonb AND op<>'beginChild' AND c.child IS DISTINCT FROM (cmd->>'child')::uuid THEN RETURN scout_continuous.reply(c,false,'child_fenced',t); END IF;
 IF c.child IS NOT NULL THEN SELECT * INTO STRICT ch FROM scout_continuous.children WHERE id=c.child FOR UPDATE; END IF;
 CASE op
 WHEN 'beginChild' THEN
  IF c.child IS NOT NULL OR c.connected OR EXISTS(SELECT 1 FROM scout_continuous.children WHERE id=(cmd->>'child')::uuid) THEN RETURN scout_continuous.reply(c,false,'child_overlap_or_replay',t); END IF;
  IF (cmd->>'endsAt')::timestamptz<t+interval '30 seconds' OR (cmd->>'endsAt')::timestamptz>t+interval '1 hour' OR (cmd->>'endsAt')::timestamptz>(c.approval->>'endsAt')::timestamptz THEN RAISE EXCEPTION 'child_time'; END IF;
  IF (c.usage->>'children')::bigint>=(c.approval->'limits'->>'children')::bigint THEN why:='child_budget'; ELSE
   INSERT INTO scout_continuous.children(id,starts_at,ends_at,status) VALUES((cmd->>'child')::uuid,t,cmd->>'endsAt','open');
   UPDATE scout_continuous.control SET child=(cmd->>'child')::uuid,usage=jsonb_set(usage,'{children}',to_jsonb((usage->>'children')::bigint+1)),lease_until=least(lease_until,(cmd->>'endsAt')::timestamptz) WHERE id RETURNING * INTO c;
  END IF;
 WHEN 'reserve' THEN
  IF c.child IS NULL OR cmd->>'resource' IS NULL OR cmd->>'resource' NOT IN ('connection','rpc') OR (cmd->>'resource'='connection' AND c.connected) OR (cmd->>'resource'='rpc' AND NOT c.connected) THEN RETURN scout_continuous.reply(c,false,'connection_state',t); END IF;
  next:=c.usage;
  cost:=CASE WHEN cmd->>'resource'='connection' THEN (c.approval->>'connectionCredits')::bigint ELSE (c.approval->>'rpcCredits')::bigint END;
  next:=jsonb_set(next,'{credits}',to_jsonb((next->>'credits')::bigint+cost));
  IF cmd->>'resource'='connection' THEN
   next:=jsonb_set(jsonb_set(jsonb_set(next,'{connections}',to_jsonb((next->>'connections')::bigint+1)),'{bytes}',to_jsonb((next->>'bytes')::bigint+16777216)),'{frames}',to_jsonb((next->>'frames')::bigint+20000));
  ELSE next:=jsonb_set(next,'{rpc}',to_jsonb((next->>'rpc')::bigint+1)); END IF;
  IF (cmd->>'resource'='connection' AND ch.connections>=3) OR (cmd->>'resource'='rpc' AND ch.rpc>=40) OR EXISTS(SELECT 1 FROM jsonb_each(c.approval->'limits') l WHERE (next->>l.key)::bigint>l.value::text::bigint) THEN why:='budget'; ELSE
   UPDATE scout_continuous.children SET connections=connections+CASE WHEN cmd->>'resource'='connection' THEN 1 ELSE 0 END,rpc=rpc+CASE WHEN cmd->>'resource'='rpc' THEN 1 ELSE 0 END WHERE id=c.child;
   UPDATE scout_continuous.control SET usage=next,ticket=ticket+1,connected=true WHERE id RETURNING * INTO c;
   INSERT INTO scout_continuous.tickets VALUES(c.ticket,c.child,cmd->>'resource',cost,CASE WHEN cmd->>'resource'='connection' THEN 16777216 ELSE 0 END,CASE WHEN cmd->>'resource'='connection' THEN 20000 ELSE 0 END,t);
   RETURN scout_continuous.reply(c,true,NULL,t,jsonb_build_object('ticket',c.ticket));
  END IF;
 WHEN 'append' THEN
  IF c.child IS NULL OR NOT c.connected THEN RETURN scout_continuous.reply(c,false,'connection_state',t); END IF;
  r:=cmd->'record';
  IF jsonb_typeof(r) IS DISTINCT FROM 'object' OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(r) k) IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(ARRAY['version','signature','slot','receivedAt','finality','verification','mint','quoteMint','curve','tokenProgram','eventAt','blockTime','checkedAt','finalizedContextSlot','sourceClockVerified','notificationHash','identityHash','transactionHash','statusHash','reason']) k) OR r->>'version' IS DISTINCT FROM 'scout-creation/1' OR r->'sourceClockVerified' IS DISTINCT FROM 'false'::jsonb OR jsonb_typeof(r->'signature') IS DISTINCT FROM 'string' OR NOT scout_continuous.b58(r->>'signature',64) OR jsonb_typeof(r->'slot') IS DISTINCT FROM 'number' OR (r->>'slot')!~ '^[1-9][0-9]*$' OR (r->>'slot')::numeric>9007199254740991 THEN RAISE EXCEPTION 'invalid_record'; END IF;
  FOR field_name IN SELECT unnest(ARRAY['notificationHash','identityHash']) LOOP IF jsonb_typeof(r->field_name) IS DISTINCT FROM 'string' OR (r->>field_name)!~ '^[a-f0-9]{64}$' OR (r->>field_name)~ '^0+$' THEN RAISE EXCEPTION 'invalid_hash'; END IF; END LOOP;
  IF jsonb_typeof(r->'receivedAt') IS DISTINCT FROM 'string' OR (r->>'receivedAt')!~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3,6})?Z$' OR jsonb_typeof(r->'reason') IS DISTINCT FROM 'string' OR (r->>'reason')!~ '^[A-Za-z0-9_:-]{1,100}$' THEN RAISE EXCEPTION 'invalid_record'; END IF;
  received:=(r->>'receivedAt')::timestamptz;
  IF received>t+interval '5 seconds' OR received<t-interval '1 hour' THEN RAISE EXCEPTION 'invalid_clock'; END IF;
  IF r->>'finality'='provisional' THEN
   IF r->>'verification' IS DISTINCT FROM 'notification_only' OR EXISTS(SELECT 1 FROM unnest(ARRAY['mint','quoteMint','curve','tokenProgram','eventAt','blockTime','checkedAt','finalizedContextSlot','transactionHash','statusHash']) k WHERE r->k IS DISTINCT FROM 'null'::jsonb) THEN RAISE EXCEPTION 'unverified_identity'; END IF;
  ELSIF r->>'finality'='finalized' THEN
   IF r->>'verification' IS DISTINCT FROM 'rpc_reported_finalized_same_provider' OR NOT scout_continuous.b58(r->>'mint',32) OR NOT scout_continuous.b58(r->>'curve',32) OR r->>'mint'=r->>'quoteMint' OR r->>'quoteMint' IS NULL OR r->>'quoteMint' NOT IN ('11111111111111111111111111111111','EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') OR r->>'tokenProgram' IS NULL OR r->>'tokenProgram' NOT IN ('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') OR jsonb_typeof(r->'finalizedContextSlot') IS DISTINCT FROM 'number' OR (r->>'finalizedContextSlot')!~ '^[0-9]+$' OR (r->>'finalizedContextSlot')::numeric<(r->>'slot')::numeric OR (r->>'finalizedContextSlot')::numeric>9007199254740991 THEN RAISE EXCEPTION 'invalid_finality'; END IF;
   FOR field_name IN SELECT unnest(ARRAY['mint','curve','quoteMint','tokenProgram']) LOOP IF jsonb_typeof(r->field_name) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_finality';END IF;END LOOP;
   FOR field_name IN SELECT unnest(ARRAY['transactionHash','statusHash']) LOOP IF jsonb_typeof(r->field_name) IS DISTINCT FROM 'string' OR (r->>field_name)!~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_hash'; END IF; END LOOP;
   FOR field_name IN SELECT unnest(ARRAY['eventAt','checkedAt']) LOOP IF jsonb_typeof(r->field_name) IS DISTINCT FROM 'string' OR (r->>field_name)!~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3,6})?Z$' THEN RAISE EXCEPTION 'invalid_clock'; END IF; END LOOP;
   IF (r->>'eventAt')::timestamptz>received OR (r->>'eventAt')::timestamptz<received-interval '120 seconds' OR (r->>'checkedAt')::timestamptz<received OR (r->>'checkedAt')::timestamptz>t+interval '5 seconds' OR (r->>'checkedAt')::timestamptz<t-interval '120 seconds' OR (r->'blockTime'<>'null'::jsonb AND (NOT scout_continuous.valid_clock(r->'blockTime') OR (r->>'blockTime')::timestamptz>received OR (r->>'blockTime')::timestamptz<received-interval '120 seconds')) THEN RAISE EXCEPTION 'invalid_clock'; END IF;
  ELSE RAISE EXCEPTION 'invalid_finality'; END IF;
  SELECT * INTO prior FROM scout_continuous.first_seen WHERE signature=r->>'signature';
  IF FOUND THEN
   IF prior.slot<>(r->>'slot')::bigint OR prior.identity_hash<>r->>'identityHash' OR received<prior.received_at::timestamptz THEN RAISE EXCEPTION 'identity_revision'; END IF;
   IF prior.finalized AND r->>'finality'='finalized' AND prior.final_hash IS DISTINCT FROM encode(sha256(convert_to(scout_continuous.canonical(r),'UTF8')),'hex') THEN RAISE EXCEPTION 'final_identity_revision'; END IF;
   IF r->>'finality'='provisional' OR prior.finalized THEN
    RETURN scout_continuous.reply(c,true,NULL,t,jsonb_build_object('disposition','duplicate','firstReceivedAt',prior.received_at,'firstNotificationHash',prior.notification_hash));
   END IF;
   IF prior.received_at<>r->>'receivedAt' OR prior.notification_hash<>r->>'notificationHash' OR NOT EXISTS(SELECT 1 FROM scout_continuous.events WHERE signature=prior.signature AND expires_at>t) THEN RAISE EXCEPTION 'original_evidence_missing'; END IF;
   IF ch.finalized>=20 OR ch.rpc<(ch.finalized+1)*2 THEN RAISE EXCEPTION 'uncharged_verification'; END IF;
   UPDATE scout_continuous.first_seen SET finalized=true,final_hash=encode(sha256(convert_to(scout_continuous.canonical(r),'UTF8')),'hex') WHERE signature=prior.signature;
   UPDATE scout_continuous.children SET finalized=finalized+1 WHERE id=c.child;disposition:='promoted';
  ELSE
   IF r->>'finality'<>'provisional' THEN RAISE EXCEPTION 'missing_notification'; END IF;
   IF ch.records>=200 OR (c.usage->>'auditRecords')::bigint>=(c.approval->'limits'->>'auditRecords')::bigint THEN why:='audit_budget'; ELSE
    INSERT INTO scout_continuous.first_seen(signature,slot,received_at,notification_hash,identity_hash) VALUES(r->>'signature',(r->>'slot')::bigint,r->>'receivedAt',r->>'notificationHash',r->>'identityHash');
    UPDATE scout_continuous.children SET records=records+1 WHERE id=c.child;
    UPDATE scout_continuous.control SET usage=jsonb_set(usage,'{auditRecords}',to_jsonb((usage->>'auditRecords')::bigint+1)) WHERE id RETURNING * INTO c;disposition:='inserted';
   END IF;
  END IF;
  IF why IS NULL THEN
   INSERT INTO scout_continuous.events VALUES(r->>'signature',received,received+interval '1 hour',r) ON CONFLICT(signature) DO UPDATE SET payload=excluded.payload;
   DELETE FROM scout_continuous.events WHERE signature IN (SELECT signature FROM scout_continuous.events ORDER BY received_at DESC,signature OFFSET 200);
   UPDATE scout_continuous.control SET last_persisted_at=greatest(last_persisted_at,received) WHERE id RETURNING * INTO c;
   RETURN scout_continuous.reply(c,true,NULL,t,jsonb_build_object('disposition',disposition,'firstReceivedAt',r->>'receivedAt','firstNotificationHash',r->>'notificationHash'));
  END IF;
 WHEN 'heartbeat' THEN
  r:=cmd->'health';
  IF jsonb_typeof(r) IS DISTINCT FROM 'object' OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(r) k) IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(ARRAY['state','sourceState','reason','frames','bytes','ignored','duplicates','provisional','finalized','withheld','rpcAttempts','rpcBytes','connections','lastFrameAt','lastPongAt','lastRpcRoundTripMs']) k) OR r->>'sourceState' IS NULL OR r->>'sourceState' NOT IN ('connecting','open','closed') THEN RAISE EXCEPTION 'invalid_health'; END IF;
  FOR field_name IN SELECT unnest(ARRAY['frames','bytes']) LOOP
   used:=(c.usage->>CASE field_name WHEN 'frames' THEN 'framesReceived' ELSE 'bytesReceived' END)::bigint;
   IF jsonb_typeof(r->field_name) IS DISTINCT FROM 'number' OR (r->>field_name)!~ '^[0-9]+$' OR (r->>field_name)::numeric<used OR (r->>field_name)::numeric>(c.usage->>field_name)::bigint THEN RAISE EXCEPTION 'counter_regression_or_uncharged'; END IF;
  END LOOP;
  FOR field_name IN SELECT unnest(ARRAY['lastFrameAt','lastPongAt']) LOOP IF r->field_name IS DISTINCT FROM 'null'::jsonb AND (jsonb_typeof(r->field_name) IS DISTINCT FROM 'string' OR (r->>field_name)!~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3,6})?Z$' OR (r->>field_name)::timestamptz>t+interval '5 seconds') THEN RAISE EXCEPTION 'invalid_clock'; END IF; END LOOP;
  FOR field_name IN SELECT unnest(ARRAY['ignored','duplicates','provisional','finalized','withheld','rpcAttempts','rpcBytes','connections']) LOOP IF jsonb_typeof(r->field_name) IS DISTINCT FROM 'number' OR (r->>field_name)!~ '^[0-9]+$' OR (r->>field_name)::numeric>9007199254740991 THEN RAISE EXCEPTION 'invalid_health';END IF;END LOOP;
  IF jsonb_typeof(r->'state') IS DISTINCT FROM 'string' OR (r->>'state')!~ '^[A-Za-z0-9_:-]{1,100}$' OR jsonb_typeof(r->'reason') IS DISTINCT FROM 'string' OR (r->>'reason')!~ '^[A-Za-z0-9_:-]{1,100}$' OR (r->'lastRpcRoundTripMs'<>'null'::jsonb AND (jsonb_typeof(r->'lastRpcRoundTripMs') IS DISTINCT FROM 'number' OR (r->>'lastRpcRoundTripMs')!~ '^[0-9]+$' OR (r->>'lastRpcRoundTripMs')::numeric>5000)) THEN RAISE EXCEPTION 'invalid_health';END IF;
  UPDATE scout_continuous.control SET usage=jsonb_set(jsonb_set(usage,'{framesReceived}',r->'frames'),'{bytesReceived}',r->'bytes'),health=r,heartbeat_at=t,
   lease_until=CASE WHEN stopped THEN lease_until ELSE least(t+interval '12 seconds',(approval->>'endsAt')::timestamptz,coalesce(ch.ends_at::timestamptz,(approval->>'endsAt')::timestamptz)) END WHERE id RETURNING * INTO c;
 WHEN 'gap' THEN
  IF cmd->>'phase' IS NULL OR cmd->>'phase' NOT IN ('begin','end') OR (cmd->>'reason') IS NULL OR (cmd->>'reason')!~ '^[A-Za-z0-9_:-]{1,100}$' OR NOT scout_continuous.valid_clock(cmd->'observedAt') OR (cmd->>'observedAt')::timestamptz>t+interval '5 seconds' OR (cmd->'lastPersistedAt'<>'null'::jsonb AND (NOT scout_continuous.valid_clock(cmd->'lastPersistedAt') OR (cmd->>'lastPersistedAt')::timestamptz>(cmd->>'observedAt')::timestamptz)) OR (cmd->>'phase'='end' AND (cmd->>'observedAt')::timestamptz<c.gap_since) THEN RAISE EXCEPTION 'invalid_gap'; END IF;
  UPDATE scout_continuous.control SET gap_since=CASE WHEN cmd->>'phase'='begin' THEN least(coalesce(gap_since,(cmd->>'observedAt')::timestamptz),coalesce((cmd->>'lastPersistedAt')::timestamptz,(cmd->>'observedAt')::timestamptz)) ELSE NULL END,
   gap_ended_at=CASE WHEN cmd->>'phase'='end' THEN (cmd->>'observedAt')::timestamptz ELSE gap_ended_at END,
   gap_count=gap_count+CASE WHEN cmd->>'phase'='begin' AND gap_since IS NULL THEN 1 ELSE 0 END WHERE id RETURNING * INTO c;
 WHEN 'connectionClosed' THEN
  IF c.child IS NULL OR cmd->'connectionClosed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'close_unconfirmed'; END IF;
  UPDATE scout_continuous.control SET connected=false WHERE id RETURNING * INTO c;
 WHEN 'closeChild' THEN
  IF c.child IS NULL OR cmd->'connectionClosed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'close_unconfirmed'; END IF;
  UPDATE scout_continuous.children SET status='closed',closed_at=t WHERE id=c.child;
  UPDATE scout_continuous.control SET connected=false,child=NULL WHERE id RETURNING * INTO c;
 WHEN 'stop' THEN
  IF cmd->>'reason' IS NULL OR (cmd->>'reason')!~ '^[A-Za-z0-9_:-]{1,100}$' THEN RAISE EXCEPTION 'invalid_reason'; END IF;
  UPDATE scout_continuous.control SET stopped=true,reason=coalesce(reason,cmd->>'reason'),gap_since=coalesce(gap_since,last_persisted_at,t),gap_count=gap_count+CASE WHEN gap_since IS NULL THEN 1 ELSE 0 END WHERE id RETURNING * INTO c;
  PERFORM scout_continuous.enqueue('stop',c.reason,t);
 WHEN 'notify' THEN
  IF cmd->>'reason' IS NULL OR (cmd->>'reason')!~ '^[A-Za-z0-9_:-]{1,100}$' THEN RAISE EXCEPTION 'invalid_reason'; END IF;
  PERFORM scout_continuous.enqueue(CASE WHEN c.stopped THEN 'stop' ELSE 'lifecycle' END,cmd->>'reason',t);
 WHEN 'release' THEN
  IF NOT c.stopped OR c.connected OR c.child IS NOT NULL OR cmd->'connectionClosed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'release_unconfirmed'; END IF;
  UPDATE scout_continuous.control SET worker=NULL,fence=NULL,lease_until=NULL WHERE id RETURNING * INTO c;
 END CASE;
 IF why IS NOT NULL THEN
  UPDATE scout_continuous.control SET stopped=true,reason=coalesce(reason,why),error_count=error_count+CASE WHEN stopped THEN 0 ELSE 1 END,gap_since=coalesce(gap_since,last_persisted_at,t),gap_count=gap_count+CASE WHEN gap_since IS NULL THEN 1 ELSE 0 END WHERE id RETURNING * INTO c;
  PERFORM scout_continuous.enqueue('stop',why,t);RETURN scout_continuous.reply(c,false,why,t);
 END IF;
 RETURN scout_continuous.reply(c,true,NULL,t);
END
$fn$;

CREATE FUNCTION scout_continuous.maintain(cmd jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE c scout_continuous.control; t timestamptz; op text:=cmd->>'op'; expected text[]:=ARRAY['op','parent','grantHash']; why text; n scout_continuous.notices; purged integer:=0; field_name text;
BEGIN
 IF jsonb_typeof(cmd) IS DISTINCT FROM 'object' OR octet_length(cmd::text)>8192 THEN RAISE EXCEPTION 'invalid_maintenance'; END IF;
 CASE op WHEN 'tick','leaseNotice' THEN NULL; WHEN 'incident' THEN expected:=expected||ARRAY['reason']; WHEN 'meter' THEN expected:=expected||ARRAY['observedAt','balance','attributed','mismatch','hardCapUntil','receiptHash','throughTicket','throughCredits']; WHEN 'retention' THEN expected:=expected||ARRAY['observedAt','physicalThrough','backupsExcluded','receiptHash']; WHEN 'watchdog' THEN expected:=expected||ARRAY['observedAt','independent','shutdownCapable','receiptHash','throughTicket','throughCredits']; WHEN 'ackNotice' THEN expected:=expected||ARRAY['id','lease','deliveredAt','receiptHash']; ELSE RAISE EXCEPTION 'invalid_maintenance'; END CASE;
 IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(cmd) k) IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(expected) k) THEN RAISE EXCEPTION 'invalid_maintenance'; END IF;
 SELECT * INTO STRICT c FROM scout_continuous.control WHERE id FOR UPDATE;t:=date_trunc('milliseconds',clock_timestamp());
 IF c.approval IS NULL OR cmd->>'parent' IS DISTINCT FROM c.approval->>'parent' OR cmd->>'grantHash' IS DISTINCT FROM c.grant_hash THEN RAISE EXCEPTION 'scope_mismatch'; END IF;
 -- Actual row purge works after source STOP/outage/restart. It does NOT prove WAL/PITR erasure.
 DELETE FROM scout_continuous.events WHERE expires_at<=t;GET DIAGNOSTICS purged=ROW_COUNT;
 IF t>=(c.approval->>'endsAt')::timestamptz+interval '1 hour' THEN DELETE FROM scout_continuous.events;DELETE FROM scout_continuous.first_seen; END IF;
 UPDATE scout_continuous.control SET delete_through=t WHERE id RETURNING * INTO c;
 IF op IN ('meter','retention','watchdog') THEN
  IF jsonb_typeof(cmd->'receiptHash') IS DISTINCT FROM 'string' OR (cmd->>'receiptHash')!~ '^[a-f0-9]{64}$' OR (cmd->>'receiptHash')~ '^0+$' OR NOT scout_continuous.valid_clock(cmd->'observedAt') OR (cmd->>'observedAt')::timestamptz>t OR (cmd->>'observedAt')::timestamptz<t-interval '5 minutes' THEN RAISE EXCEPTION 'invalid_evidence_clock'; END IF;
 END IF;
 IF op IN ('meter','watchdog') THEN
  FOR field_name IN SELECT unnest(ARRAY['throughTicket','throughCredits']) LOOP
   IF jsonb_typeof(cmd->field_name) IS DISTINCT FROM 'number' OR (cmd->>field_name)!~ '^[0-9]+$' OR (cmd->>field_name)::numeric>9007199254740991 THEN RAISE EXCEPTION 'invalid_anchor';END IF;
  END LOOP;
 END IF;
 CASE op
 WHEN 'tick' THEN NULL;
 WHEN 'incident' THEN
  IF cmd->>'reason' IS NULL OR cmd->>'reason' NOT IN ('notification_uncertain','observer_unavailable','retention_failed','meter_mismatch','shutdown_unconfirmed') THEN RAISE EXCEPTION 'invalid_incident';END IF;
  why:=cmd->>'reason';
 WHEN 'meter' THEN
  IF jsonb_typeof(cmd->'attributed') IS DISTINCT FROM 'boolean' OR jsonb_typeof(cmd->'mismatch') IS DISTINCT FROM 'boolean' OR jsonb_typeof(cmd->'balance') IS DISTINCT FROM 'number' OR (cmd->>'balance')!~ '^[0-9]+$' OR (cmd->>'balance')::numeric>9007199254740991 OR NOT scout_continuous.valid_clock(cmd->'hardCapUntil') OR (cmd->>'observedAt')::timestamptz<=coalesce(c.meter_at,'-infinity'::timestamptz) THEN RAISE EXCEPTION 'invalid_meter'; END IF;
  IF (cmd->>'throughTicket')::bigint<>c.ticket OR (cmd->>'throughCredits')::bigint<>(c.usage->>'credits')::bigint OR cmd->'mismatch'='true'::jsonb OR cmd->'attributed'<>'true'::jsonb THEN why:='meter_or_anchor_mismatch'; END IF;
  UPDATE scout_continuous.control SET meter_at=(cmd->>'observedAt')::timestamptz,meter_balance=(cmd->>'balance')::bigint,meter_attributed=(cmd->>'attributed')::boolean,meter_mismatch=meter_mismatch OR why IS NOT NULL,hard_cap_until=(cmd->>'hardCapUntil')::timestamptz,meter_receipt=cmd->>'receiptHash' WHERE id RETURNING * INTO c;
 WHEN 'retention' THEN
  IF jsonb_typeof(cmd->'backupsExcluded') IS DISTINCT FROM 'boolean' OR NOT scout_continuous.valid_clock(cmd->'physicalThrough') OR (cmd->>'physicalThrough')::timestamptz>(cmd->>'observedAt')::timestamptz OR (cmd->>'physicalThrough')::timestamptz<=coalesce(c.physical_through,'-infinity'::timestamptz) THEN RAISE EXCEPTION 'invalid_retention'; END IF;
  UPDATE scout_continuous.control SET physical_through=(cmd->>'physicalThrough')::timestamptz,backups_excluded=(cmd->>'backupsExcluded')::boolean,retention_receipt=cmd->>'receiptHash' WHERE id RETURNING * INTO c;
 WHEN 'watchdog' THEN
  IF jsonb_typeof(cmd->'independent') IS DISTINCT FROM 'boolean' OR jsonb_typeof(cmd->'shutdownCapable') IS DISTINCT FROM 'boolean' OR (cmd->>'observedAt')::timestamptz<=coalesce(c.watchdog_at,'-infinity'::timestamptz) THEN RAISE EXCEPTION 'invalid_watchdog'; END IF;
  IF (cmd->>'throughTicket')::bigint<>c.ticket OR (cmd->>'throughCredits')::bigint<>(c.usage->>'credits')::bigint THEN why:='watchdog_anchor_mismatch'; END IF;
  UPDATE scout_continuous.control SET watchdog_at=(cmd->>'observedAt')::timestamptz,independent_watchdog=(cmd->>'independent')::boolean,shutdown_capable=(cmd->>'shutdownCapable')::boolean,watchdog_receipt=cmd->>'receiptHash' WHERE id RETURNING * INTO c;
 WHEN 'leaseNotice' THEN
  IF c.notice_attempts>=10000 THEN why:='notification_budget'; ELSE
   SELECT * INTO n FROM scout_continuous.notices WHERE status='pending' ORDER BY CASE kind WHEN 'stop' THEN 0 ELSE 1 END,created_at LIMIT 1 FOR UPDATE;
   IF FOUND THEN
    UPDATE scout_continuous.notices SET status='inflight',lease=gen_random_uuid(),lease_until=t+interval '30 seconds' WHERE id=n.id RETURNING * INTO n;
    UPDATE scout_continuous.control SET notice_attempts=notice_attempts+1 WHERE id;
    RETURN jsonb_build_object('version','unfarmd-continuous-maintenance/1','status','leased','id',n.id,'lease',n.lease,'expiresAt',scout_continuous.utc(n.lease_until),'kind',n.kind,'reason',n.reason,'parent',c.approval->>'parent');
   END IF;
  END IF;
 WHEN 'ackNotice' THEN
  SELECT * INTO STRICT n FROM scout_continuous.notices WHERE id=(cmd->>'id')::uuid FOR UPDATE;
  IF n.status<>'inflight' OR n.lease IS DISTINCT FROM (cmd->>'lease')::uuid OR n.lease_until<=t OR NOT scout_continuous.valid_clock(cmd->'deliveredAt') OR (cmd->>'deliveredAt')::timestamptz<n.created_at OR (cmd->>'deliveredAt')::timestamptz>t OR (cmd->>'deliveredAt')::timestamptz<t-interval '5 minutes' OR jsonb_typeof(cmd->'receiptHash') IS DISTINCT FROM 'string' OR (cmd->>'receiptHash')!~ '^[a-f0-9]{64}$' OR (cmd->>'receiptHash')~ '^0+$' THEN RAISE EXCEPTION 'delivery_unconfirmed'; END IF;
  INSERT INTO scout_continuous.deliveries VALUES(n.id,(cmd->>'deliveredAt')::timestamptz,cmd->>'receiptHash');
  UPDATE scout_continuous.notices SET status='delivered',lease=NULL,lease_until=NULL WHERE id=n.id;
  UPDATE scout_continuous.control SET notification_at=(cmd->>'deliveredAt')::timestamptz WHERE id RETURNING * INTO c;
 END CASE;
 UPDATE scout_continuous.notices SET status='uncertain' WHERE status='inflight' AND lease_until<=t;
 IF NOT EXISTS(SELECT 1 FROM scout_continuous.notices WHERE kind='health' AND status IN ('pending','inflight','uncertain')) AND (c.notification_at IS NULL OR c.notification_at<t-interval '2 minutes') THEN
  DELETE FROM scout_continuous.notices WHERE kind='health' AND status='delivered';PERFORM scout_continuous.enqueue('health','INDEPENDENT_CHANNEL_CHECK',t);
 END IF;
 -- No startup assumption: an unclaimed parent may wait for real independent evidence.
 IF c.worker IS NOT NULL OR (c.usage->>'children')::bigint>0 THEN why:=coalesce(why,scout_continuous.gate(c,t)); END IF;
 IF why IS NOT NULL THEN UPDATE scout_continuous.control SET stopped=true,reason=coalesce(reason,why),error_count=error_count+CASE WHEN stopped THEN 0 ELSE 1 END,gap_since=coalesce(gap_since,last_persisted_at,t),gap_count=gap_count+CASE WHEN gap_since IS NULL THEN 1 ELSE 0 END WHERE id RETURNING * INTO c;PERFORM scout_continuous.enqueue('stop',why,t); END IF;
 RETURN jsonb_build_object('version','unfarmd-continuous-maintenance/1','status',CASE WHEN c.stopped THEN 'stopped' ELSE 'checked' END,'observedAt',scout_continuous.utc(t),'purgedRows',purged,'stopped',c.stopped,'reason',c.reason,'ticket',c.ticket,'usage',c.usage,'assurance',scout_continuous.assurance(c,t));
END
$fn$;

CREATE FUNCTION scout_continuous.stop(parent text,gh text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE c scout_continuous.control; t timestamptz:=date_trunc('milliseconds',clock_timestamp());
BEGIN
 SELECT * INTO STRICT c FROM scout_continuous.control WHERE id FOR UPDATE;
 IF c.approval IS NULL OR parent IS DISTINCT FROM c.approval->>'parent' OR gh IS DISTINCT FROM c.grant_hash THEN RAISE EXCEPTION 'scope_mismatch'; END IF;
 UPDATE scout_continuous.control SET stopped=true,reason=coalesce(reason,'owner_global_stop'),gap_since=coalesce(gap_since,last_persisted_at,t),gap_count=gap_count+CASE WHEN gap_since IS NULL THEN 1 ELSE 0 END WHERE id RETURNING * INTO c;
 PERFORM scout_continuous.enqueue('stop',c.reason,t);
 RETURN jsonb_build_object('version','unfarmd-continuous-stop/1','parent',parent,'grantHash',gh,'status','stopped','observedAt',scout_continuous.utc(t),'closureAcknowledged',NOT c.connected AND c.child IS NULL AND c.worker IS NULL);
END
$fn$;
CREATE FUNCTION scout_continuous.snapshot() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
 SELECT jsonb_build_object('version','unfarmd-continuous-feed/1','parent',approval->>'parent','grantHash',grant_hash,'head',approval->>'head','observedAt',scout_continuous.utc(clock_timestamp()),'stopped',stopped,'reason',reason,'connected',connected,'worker',worker,'fence',fence,'leaseUntil',scout_continuous.utc(lease_until),
 'child',(SELECT jsonb_build_object('id',id,'startsAt',scout_continuous.utc(starts_at),'endsAt',ends_at) FROM scout_continuous.children WHERE id=child),
 'endsAt',approval->>'endsAt','usage',usage,'limits',approval->'limits','assurance',scout_continuous.assurance(c,clock_timestamp()),'gate',scout_continuous.gate(c,clock_timestamp()),
 'health',jsonb_build_object('heartbeatAt',scout_continuous.utc(heartbeat_at),'source',health,'gaps',gap_count,'errors',error_count,'gapSince',scout_continuous.utc(gap_since),'gapEndedAt',scout_continuous.utc(gap_ended_at),'lastPersistedAt',scout_continuous.utc(last_persisted_at)),
 'events',coalesce((SELECT jsonb_agg(payload ORDER BY received_at DESC,signature) FROM (SELECT * FROM scout_continuous.events WHERE expires_at>clock_timestamp() ORDER BY received_at DESC,signature LIMIT 20) e),'[]'::jsonb),
 'counts',jsonb_build_object('provisional',(SELECT count(*) FROM scout_continuous.events WHERE expires_at>clock_timestamp() AND payload->>'finality'='provisional'),'finalized',(SELECT count(*) FROM scout_continuous.events WHERE expires_at>clock_timestamp() AND payload->>'finality'='finalized')),
 'maintenance',jsonb_build_object('deleteThrough',scout_continuous.utc(delete_through),'physicalThrough',scout_continuous.utc(physical_through),'watchdogAt',scout_continuous.utc(watchdog_at),'noticeAttempts',notice_attempts,'pending',(SELECT count(*) FROM scout_continuous.notices WHERE status='pending'),'uncertain',(SELECT count(*) FROM scout_continuous.notices WHERE status='uncertain')),
 'retention',jsonb_build_object('normalizedSeconds',3600,'normalizedMax',200,'firstSeenUntil',scout_continuous.utc((approval->>'endsAt')::timestamptz+interval '1 hour'),'physicalDeletionProvenBySQL',false)) FROM scout_continuous.control c WHERE id
$fn$;
REVOKE ALL ON ALL TABLES IN SCHEMA scout_continuous FROM PUBLIC,scout_continuous_worker,scout_continuous_reader,scout_continuous_stop,scout_continuous_maintenance;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA scout_continuous FROM PUBLIC,scout_continuous_worker,scout_continuous_reader,scout_continuous_stop,scout_continuous_maintenance;
GRANT EXECUTE ON FUNCTION scout_continuous.step(jsonb) TO scout_continuous_worker;
GRANT EXECUTE ON FUNCTION scout_continuous.snapshot() TO scout_continuous_reader;
GRANT EXECUTE ON FUNCTION scout_continuous.stop(text,text) TO scout_continuous_stop;
GRANT EXECUTE ON FUNCTION scout_continuous.maintain(jsonb) TO scout_continuous_maintenance;
DO $acl$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='scout_continuous' AND a.grantee<>n.nspowner AND (a.grantee NOT IN ('scout_continuous_worker'::regrole,'scout_continuous_reader'::regrole,'scout_continuous_stop'::regrole,'scout_continuous_maintenance'::regrole) OR a.privilege_type<>'USAGE' OR a.is_grantable))
 OR EXISTS(SELECT 1 FROM pg_class p JOIN pg_namespace n ON n.oid=p.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(p.relacl,acldefault('r',p.relowner))) a WHERE n.nspname='scout_continuous' AND a.grantee<>p.relowner)
 OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname='scout_continuous' AND a.grantee<>p.proowner AND (a.grantee=0 OR a.grantee<>CASE p.proname WHEN 'step' THEN 'scout_continuous_worker'::regrole WHEN 'snapshot' THEN 'scout_continuous_reader'::regrole WHEN 'stop' THEN 'scout_continuous_stop'::regrole WHEN 'maintain' THEN 'scout_continuous_maintenance'::regrole ELSE 0 END OR a.is_grantable)) THEN RAISE EXCEPTION 'unexpected_continuous_acl'; END IF;
END $acl$;
COMMIT;
