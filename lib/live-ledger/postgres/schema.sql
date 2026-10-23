-- OWNER REVIEW/EXECUTION ONLY. Never run from the app/worker. No passwords, no existing schema changes.
BEGIN;
CREATE ROLE scout_live_worker LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
CREATE ROLE scout_live_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
CREATE ROLE scout_live_stop LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
GRANT CONNECT ON DATABASE neondb TO scout_live_worker,scout_live_reader,scout_live_stop;
CREATE SCHEMA scout_live;
REVOKE ALL ON SCHEMA scout_live FROM PUBLIC;
GRANT USAGE ON SCHEMA scout_live TO scout_live_worker, scout_live_reader, scout_live_stop;
CREATE TABLE scout_live.control (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 approved boolean NOT NULL DEFAULT false,
 session uuid, head text CHECK(head ~ '^[a-f0-9]{40}$'),
 scope text NOT NULL DEFAULT '694b38b4a0046ad1173d521c83932f7af6050b69ed666592e3d0e0d0c7289442' CHECK(scope='694b38b4a0046ad1173d521c83932f7af6050b69ed666592e3d0e0d0c7289442'),
 starts_at timestamptz, expires_at timestamptz,
 connection_credits bigint, rpc_credits bigint, credit_limit bigint,
 terms_approved boolean NOT NULL DEFAULT false, quota_approved boolean NOT NULL DEFAULT false,
 stopped boolean NOT NULL DEFAULT false, reason text,
 worker uuid, fence uuid, lease_until timestamptz, heartbeat_at timestamptz,
 connected boolean NOT NULL DEFAULT false,
 source_state text NOT NULL DEFAULT 'closed' CHECK(source_state IN ('connecting','open','closed')),
 last_frame_at timestamptz, last_pong_at timestamptz, last_rpc_elapsed_ms integer, gap_since timestamptz, gap_ended_at timestamptz,
 connections integer NOT NULL DEFAULT 0 CHECK(connections BETWEEN 0 AND 3),
 rpc integer NOT NULL DEFAULT 0 CHECK(rpc BETWEEN 0 AND 40),
 finalized integer NOT NULL DEFAULT 0 CHECK(finalized BETWEEN 0 AND 20),
 frames_received integer NOT NULL DEFAULT 0 CHECK(frames_received BETWEEN 0 AND 60000),
 bytes_received bigint NOT NULL DEFAULT 0 CHECK(bytes_received BETWEEN 0 AND 50331648),
 credits bigint NOT NULL DEFAULT 0 CHECK(credits>=0), ticket bigint NOT NULL DEFAULT 0,
 gaps integer NOT NULL DEFAULT 0 CHECK(gaps>=0), errors integer NOT NULL DEFAULT 0 CHECK(errors>=0),
 CHECK ((worker IS NULL AND fence IS NULL AND lease_until IS NULL AND NOT connected) OR (worker IS NOT NULL AND fence IS NOT NULL AND lease_until IS NOT NULL)),
 CHECK (NOT approved OR (session IS NOT NULL AND head IS NOT NULL AND starts_at IS NOT NULL AND expires_at IS NOT NULL AND connection_credits IS NOT NULL AND rpc_credits IS NOT NULL AND credit_limit IS NOT NULL AND expires_at>starts_at AND expires_at<=starts_at+interval '1 hour' AND connection_credits BETWEEN 1 AND 1000000000 AND rpc_credits BETWEEN 1 AND 1000000000 AND credit_limit BETWEEN 1 AND 1000000000 AND terms_approved AND quota_approved))
);
INSERT INTO scout_live.control(id) VALUES(true);
CREATE TABLE scout_live.events (
 signature text PRIMARY KEY,
 received_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 payload jsonb NOT NULL CHECK(pg_column_size(payload)<4096)
);
CREATE INDEX ON scout_live.events(received_at DESC,signature);

CREATE FUNCTION scout_live.b58(s text, expected integer) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $fn$
DECLARE n numeric:=0; bytes integer:=0; zeros integer:=0; i integer; d integer; alphabet text:='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
BEGIN
 IF s IS NULL OR length(s)<1 OR length(s)>88 THEN RETURN false; END IF;
 FOR i IN 1..length(s) LOOP
  d:=strpos(alphabet,substr(s,i,1))-1; IF d<0 THEN RETURN false; END IF; n:=n*58+d;
 END LOOP;
 WHILE n>0 LOOP bytes:=bytes+1; n:=trunc(n/256); END LOOP;
 FOR i IN 1..length(s) LOOP EXIT WHEN substr(s,i,1)<>'1'; zeros:=zeros+1; END LOOP;
 RETURN bytes+zeros=expected;
END $fn$;

CREATE FUNCTION scout_live.reply(c scout_live.control, good boolean, why text, t bigint DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $fn$
 SELECT jsonb_build_object('v',1,'ok',good,'reason',why,'session',c.session,'scope',c.scope,'head',c.head,'worker',c.worker,'fence',c.fence,'stopped',c.stopped,'serverTime',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'leaseUntil',CASE WHEN c.lease_until IS NULL THEN NULL ELSE to_char(c.lease_until AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,'ticket',t,'framesReceived',c.frames_received,'bytesReceived',c.bytes_received)
$fn$;

CREATE FUNCTION scout_live.step(cmd jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE c scout_live.control; now_at timestamptz; op text:=cmd->>'op'; e jsonb; prior jsonb; received timestamptz; checked timestamptz; block_at timestamptz; cost bigint; result_reason text; expected_keys text[];
BEGIN
 IF jsonb_typeof(cmd)<>'object' OR octet_length(cmd::text)>8192 OR cmd->'v'<>'1'::jsonb OR cmd->>'scope'<>'694b38b4a0046ad1173d521c83932f7af6050b69ed666592e3d0e0d0c7289442' OR (cmd->>'head') !~ '^[a-f0-9]{40}$' OR (cmd->>'session') !~ '^[a-f0-9-]{36}$' OR (cmd->>'worker') !~ '^[a-f0-9-]{36}$' THEN RAISE EXCEPTION 'invalid_command'; END IF;
 expected_keys:=ARRAY['v','op','session','scope','head','worker'];
 IF op<>'claim' THEN expected_keys:=expected_keys||ARRAY['fence']; END IF;
 CASE op
 WHEN 'claim' THEN NULL;
 WHEN 'reserve' THEN expected_keys:=expected_keys||ARRAY['resource'];
 WHEN 'append' THEN expected_keys:=expected_keys||ARRAY['event'];
 WHEN 'heartbeat' THEN expected_keys:=expected_keys||ARRAY['framesReceived','bytesReceived','sourceState','lastFrameAt','lastPongAt','lastRpcElapsedMs'];
 WHEN 'gap' THEN expected_keys:=expected_keys||ARRAY['reason','phase'];
 WHEN 'stop' THEN expected_keys:=expected_keys||ARRAY['reason'];
 WHEN 'release' THEN expected_keys:=expected_keys||ARRAY['connectionClosed','terminal'];
 ELSE RAISE EXCEPTION 'invalid_command'; END CASE;
 IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(cmd) k) IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(expected_keys) k) OR cmd->>'session' IS NULL OR cmd->>'worker' IS NULL OR cmd->>'head' IS NULL OR cmd->>'scope' IS NULL OR cmd->>'v' IS NULL THEN RAISE EXCEPTION 'invalid_command'; END IF;
 SELECT * INTO STRICT c FROM scout_live.control WHERE id FOR UPDATE;
 now_at:=clock_timestamp();
 IF c.stopped THEN
  -- Closure-only acknowledgment after STOP; no quota/fence/history reset or acquisition can follow.
  IF op='release' AND cmd->'connectionClosed'='true'::jsonb AND jsonb_typeof(cmd->'terminal')='boolean'
   AND c.session=(cmd->>'session')::uuid AND c.head=cmd->>'head' AND c.scope=cmd->>'scope'
   AND c.worker=(cmd->>'worker')::uuid AND c.fence=(cmd->>'fence')::uuid THEN
   UPDATE scout_live.control SET connected=false,source_state='closed',worker=CASE WHEN (cmd->>'terminal')::boolean THEN NULL ELSE worker END,fence=CASE WHEN (cmd->>'terminal')::boolean THEN NULL ELSE fence END,lease_until=CASE WHEN (cmd->>'terminal')::boolean THEN NULL ELSE lease_until END WHERE id RETURNING * INTO c;
   RETURN scout_live.reply(c,true,'closed_after_stop');
  END IF;
  RETURN scout_live.reply(c,false,'stopped');
 END IF;
 IF NOT c.approved OR c.starts_at IS NULL OR c.expires_at IS NULL OR c.connection_credits IS NULL OR c.rpc_credits IS NULL OR c.credit_limit IS NULL OR NOT c.terms_approved OR NOT c.quota_approved OR c.session IS DISTINCT FROM (cmd->>'session')::uuid OR c.head IS DISTINCT FROM cmd->>'head' OR c.scope IS DISTINCT FROM cmd->>'scope' OR now_at<c.starts_at THEN RETURN scout_live.reply(c,false,'unapproved'); END IF;
 IF now_at>=c.expires_at OR (c.worker IS NOT NULL AND now_at>=c.lease_until) THEN
  UPDATE scout_live.control SET stopped=true,reason=CASE WHEN now_at>=c.expires_at THEN 'session_expired' ELSE 'unclean_lease' END WHERE id RETURNING * INTO c;
  RETURN scout_live.reply(c,false,c.reason);
 END IF;
 DELETE FROM scout_live.events WHERE expires_at<=now_at;
 IF op='claim' THEN
  IF c.worker IS NOT NULL THEN RETURN scout_live.reply(c,false,'occupied'); END IF;
  UPDATE scout_live.control SET worker=(cmd->>'worker')::uuid,fence=gen_random_uuid(),lease_until=least(now_at+interval '12 seconds',expires_at),heartbeat_at=now_at WHERE id RETURNING * INTO c;
  RETURN scout_live.reply(c,true,NULL);
 END IF;
 IF c.worker IS DISTINCT FROM (cmd->>'worker')::uuid OR c.fence IS DISTINCT FROM (cmd->>'fence')::uuid OR c.worker IS NULL THEN RETURN scout_live.reply(c,false,'fenced'); END IF;
 CASE op
 WHEN 'reserve' THEN
  IF cmd->>'resource' NOT IN ('connection','rpc') OR cmd->>'resource' IS NULL THEN RAISE EXCEPTION 'invalid_command'; END IF;
  IF (cmd->>'resource'='connection' AND c.connected) OR (cmd->>'resource'='rpc' AND NOT c.connected) THEN RETURN scout_live.reply(c,false,'connection_state'); END IF;
  cost:=CASE WHEN cmd->>'resource'='connection' THEN c.connection_credits ELSE c.rpc_credits END;
  IF (cmd->>'resource'='connection' AND c.connections>=3) OR (cmd->>'resource'='rpc' AND c.rpc>=40) OR c.credits+cost>c.credit_limit THEN
   UPDATE scout_live.control SET stopped=true,reason='budget' WHERE id RETURNING * INTO c;
   RETURN scout_live.reply(c,false,'budget');
  END IF;
  UPDATE scout_live.control SET credits=credits+cost,ticket=ticket+1,connections=connections+CASE WHEN cmd->>'resource'='connection' THEN 1 ELSE 0 END,rpc=rpc+CASE WHEN cmd->>'resource'='rpc' THEN 1 ELSE 0 END,connected=connected OR cmd->>'resource'='connection' WHERE id RETURNING * INTO c;
 WHEN 'heartbeat' THEN
  IF jsonb_typeof(cmd->'framesReceived')<>'number' OR jsonb_typeof(cmd->'bytesReceived')<>'number' OR (cmd->>'framesReceived')!~ '^[0-9]+$' OR (cmd->>'bytesReceived')!~ '^[0-9]+$' OR (cmd->>'framesReceived')::bigint<c.frames_received OR (cmd->>'framesReceived')::bigint>c.connections*20000 OR (cmd->>'bytesReceived')::bigint<c.bytes_received OR (cmd->>'bytesReceived')::bigint>c.connections::bigint*16777216 THEN RAISE EXCEPTION 'invalid_command'; END IF;
  IF cmd->>'sourceState' IS NULL OR cmd->>'sourceState' NOT IN ('connecting','open','closed') OR (cmd->'lastRpcElapsedMs'<>'null'::jsonb AND ((cmd->>'lastRpcElapsedMs')!~ '^[0-9]+$' OR (cmd->>'lastRpcElapsedMs')::integer>5000)) THEN RAISE EXCEPTION 'invalid_command'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(ARRAY['lastFrameAt','lastPongAt']) k WHERE cmd->k<>'null'::jsonb AND ((cmd->>k)!~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3})?Z$' OR (cmd->>k)::timestamptz>now_at+interval '5 seconds')) THEN RAISE EXCEPTION 'invalid_clock'; END IF;
  UPDATE scout_live.control SET source_state=cmd->>'sourceState',last_frame_at=(cmd->>'lastFrameAt')::timestamptz,last_pong_at=(cmd->>'lastPongAt')::timestamptz,last_rpc_elapsed_ms=(cmd->>'lastRpcElapsedMs')::integer,frames_received=(cmd->>'framesReceived')::integer,bytes_received=(cmd->>'bytesReceived')::bigint,heartbeat_at=now_at,lease_until=least(now_at+interval '12 seconds',expires_at) WHERE id RETURNING * INTO c;
 WHEN 'gap' THEN
  IF cmd->>'reason' NOT IN ('disconnect','verification_failed','invalid_message','transport_error','startup','shutdown') OR cmd->>'reason' IS NULL OR cmd->>'phase' IS NULL OR cmd->>'phase' NOT IN ('begin','end') THEN RAISE EXCEPTION 'invalid_command'; END IF;
  UPDATE scout_live.control SET gap_since=CASE WHEN cmd->>'phase'='begin' THEN coalesce(gap_since,now_at) ELSE NULL END,gap_ended_at=CASE WHEN cmd->>'phase'='end' THEN now_at ELSE gap_ended_at END,gaps=gaps+CASE WHEN cmd->>'phase'='begin' AND gap_since IS NULL THEN 1 ELSE 0 END, errors=errors+CASE WHEN cmd->>'phase'='begin' AND cmd->>'reason' IN ('verification_failed','invalid_message','transport_error') THEN 1 ELSE 0 END WHERE id RETURNING * INTO c;
 WHEN 'release' THEN
  IF cmd->'connectionClosed' IS DISTINCT FROM 'true'::jsonb OR jsonb_typeof(cmd->'terminal') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_command'; END IF;
  UPDATE scout_live.control SET connected=false,source_state='closed',worker=CASE WHEN (cmd->>'terminal')::boolean THEN NULL ELSE worker END,fence=CASE WHEN (cmd->>'terminal')::boolean THEN NULL ELSE fence END,lease_until=CASE WHEN (cmd->>'terminal')::boolean THEN NULL ELSE lease_until END WHERE id RETURNING * INTO c;
 WHEN 'stop' THEN
  IF cmd->>'reason' NOT IN ('owner','budget','storage','shutdown','uncertain') OR cmd->>'reason' IS NULL THEN RAISE EXCEPTION 'invalid_command'; END IF;
  UPDATE scout_live.control SET stopped=true,reason=cmd->>'reason' WHERE id RETURNING * INTO c;
 WHEN 'append' THEN
  IF NOT c.connected THEN RETURN scout_live.reply(c,false,'connection_state'); END IF;
  e:=cmd->'event';
  IF jsonb_typeof(e) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(e))<>14 OR NOT e ?& ARRAY['signature','slot','receivedAt','source','program','notificationHash','finality','mint','quoteMint','tokenProgram','transactionHash','verificationHash','checkedAt','blockTime'] OR NOT scout_live.b58(e->>'signature',64) OR jsonb_typeof(e->'slot') IS DISTINCT FROM 'number' OR (e->>'slot')!~ '^[1-9][0-9]*$' OR (e->>'slot')::numeric>9007199254740991 OR e->>'source' IS DISTINCT FROM 'helius_standard' OR e->>'program' IS DISTINCT FROM '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P' OR (e->>'notificationHash')!~ '^[a-f0-9]{64}$' OR e->>'notificationHash' IS NULL THEN RAISE EXCEPTION 'invalid_event'; END IF;
  IF (e->>'receivedAt')!~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3})?Z$' OR e->>'receivedAt' IS NULL THEN RAISE EXCEPTION 'invalid_event'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(ARRAY['signature','receivedAt','source','program','notificationHash','finality']) k WHERE jsonb_typeof(e->k) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'invalid_event'; END IF;
  received:=(e->>'receivedAt')::timestamptz;
  IF received>now_at+interval '5 seconds' OR received<now_at-interval '1 hour' THEN RAISE EXCEPTION 'invalid_clock'; END IF;
  SELECT payload INTO prior FROM scout_live.events WHERE signature=e->>'signature';
  IF prior=e THEN RETURN scout_live.reply(c,true,'duplicate'); END IF;
  IF e->>'finality'='provisional' THEN
   IF EXISTS(SELECT 1 FROM unnest(ARRAY['mint','quoteMint','tokenProgram','transactionHash','verificationHash','checkedAt','blockTime']) k WHERE e->k IS DISTINCT FROM 'null'::jsonb) THEN RAISE EXCEPTION 'unverified_identity'; END IF;
   IF prior IS NOT NULL THEN
    IF prior->'slot' IS DISTINCT FROM e->'slot' OR prior->'source' IS DISTINCT FROM e->'source' OR prior->'program' IS DISTINCT FROM e->'program' THEN RAISE EXCEPTION 'identity_revision'; END IF;
    RETURN scout_live.reply(c,true,'duplicate'); -- Preserve ORIGINAL hash/clock, never re-sample/reorder/downgrade.
   END IF;
  ELSIF e->>'finality'='rpc_reported_finalized' THEN
   IF NOT scout_live.b58(e->>'mint',32) OR e->>'mint'=e->>'quoteMint' OR e->>'quoteMint' IS NULL OR e->>'quoteMint' NOT IN ('11111111111111111111111111111111','EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') OR e->>'tokenProgram' IS NULL OR e->>'tokenProgram' NOT IN ('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') OR (e->>'transactionHash')!~ '^[a-f0-9]{64}$' OR e->>'transactionHash' IS NULL OR (e->>'verificationHash')!~ '^[a-f0-9]{64}$' OR e->>'verificationHash' IS NULL OR (e->>'checkedAt')!~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3})?Z$' OR e->>'checkedAt' IS NULL THEN RAISE EXCEPTION 'invalid_finality'; END IF;
   IF EXISTS(SELECT 1 FROM unnest(ARRAY['mint','quoteMint','tokenProgram','transactionHash','verificationHash','checkedAt']) k WHERE jsonb_typeof(e->k) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'invalid_finality'; END IF;
   checked:=(e->>'checkedAt')::timestamptz;
   IF checked<received OR checked>now_at+interval '5 seconds' OR checked<now_at-interval '120 seconds' OR c.finalized>=20 OR c.rpc<(c.finalized+1)*2 THEN RAISE EXCEPTION 'invalid_verification_clock'; END IF;
   IF e->'blockTime'<>'null'::jsonb THEN
    IF (e->>'blockTime')!~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3})?Z$' THEN RAISE EXCEPTION 'invalid_clock'; END IF;
    block_at:=(e->>'blockTime')::timestamptz; IF block_at>checked THEN RAISE EXCEPTION 'invalid_clock'; END IF;
   END IF;
  ELSE RAISE EXCEPTION 'invalid_finality'; END IF;
  SELECT payload INTO prior FROM scout_live.events WHERE signature=e->>'signature';
  IF prior IS NOT NULL THEN
   IF prior=e THEN RETURN scout_live.reply(c,true,'duplicate'); END IF;
   IF prior->>'finality'<>'provisional' OR e->>'finality'<>'rpc_reported_finalized' OR (prior-ARRAY['finality','mint','quoteMint','tokenProgram','transactionHash','verificationHash','checkedAt','blockTime']) IS DISTINCT FROM (e-ARRAY['finality','mint','quoteMint','tokenProgram','transactionHash','verificationHash','checkedAt','blockTime']) THEN RAISE EXCEPTION 'identity_revision'; END IF;
  ELSIF e->>'finality'<>'provisional' THEN RAISE EXCEPTION 'missing_notification'; END IF;
  IF e->>'finality'='rpc_reported_finalized' THEN UPDATE scout_live.control SET finalized=finalized+1 WHERE id RETURNING * INTO c; END IF;
  result_reason:=CASE WHEN prior IS NULL THEN 'inserted' ELSE 'promoted' END;
  INSERT INTO scout_live.events VALUES(e->>'signature',received,received+interval '1 hour',e) ON CONFLICT(signature) DO UPDATE SET payload=excluded.payload;
  DELETE FROM scout_live.events WHERE signature IN (SELECT signature FROM scout_live.events ORDER BY received_at DESC,signature OFFSET 200);
 END CASE;
 RETURN scout_live.reply(c,true,result_reason,CASE WHEN op='reserve' THEN c.ticket ELSE NULL END);
END $fn$;

CREATE FUNCTION scout_live.snapshot() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
 SELECT jsonb_build_object('version','scout-live/1','status',CASE WHEN stopped THEN 'stopped' WHEN NOT approved THEN 'waiting' WHEN clock_timestamp()>=expires_at OR (worker IS NOT NULL AND clock_timestamp()>=lease_until) THEN 'stale' WHEN connected AND source_state='open' AND greatest(last_frame_at,last_pong_at)<clock_timestamp()-interval '45 seconds' THEN 'stale' WHEN connected AND source_state='open' AND greatest(last_frame_at,last_pong_at)>clock_timestamp()-interval '45 seconds' THEN 'observing' ELSE 'waiting' END,
 'observedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'events',coalesce((SELECT jsonb_agg(payload ORDER BY received_at DESC,signature) FROM (SELECT * FROM scout_live.events WHERE expires_at>clock_timestamp() ORDER BY received_at DESC,signature LIMIT 20) x),'[]'::jsonb),
 'counts',jsonb_build_object('provisional',(SELECT count(*) FROM scout_live.events WHERE expires_at>clock_timestamp() AND payload->>'finality'='provisional'),'finalized',(SELECT count(*) FROM scout_live.events WHERE expires_at>clock_timestamp() AND payload->>'finality'='rpc_reported_finalized')),
 'health',jsonb_build_object('state',CASE WHEN stopped THEN 'stopped' WHEN NOT approved THEN 'unapproved' WHEN clock_timestamp()>=expires_at OR (worker IS NOT NULL AND clock_timestamp()>=lease_until) THEN 'stale' WHEN connected AND source_state='open' AND greatest(last_frame_at,last_pong_at)<clock_timestamp()-interval '45 seconds' THEN 'stale' WHEN connected AND source_state='open' AND greatest(last_frame_at,last_pong_at)>clock_timestamp()-interval '45 seconds' THEN 'connected' ELSE 'idle' END,'heartbeatAt',CASE WHEN heartbeat_at IS NULL THEN NULL ELSE to_char(heartbeat_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,'leaseUntil',CASE WHEN lease_until IS NULL THEN NULL ELSE to_char(lease_until AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,'sourceState',source_state,'lastFrameAt',CASE WHEN last_frame_at IS NULL THEN NULL ELSE to_char(last_frame_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,'lastPongAt',CASE WHEN last_pong_at IS NULL THEN NULL ELSE to_char(last_pong_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,'gapSince',CASE WHEN gap_since IS NULL THEN NULL ELSE to_char(gap_since AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,'gapEndedAt',CASE WHEN gap_ended_at IS NULL THEN NULL ELSE to_char(gap_ended_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,'lastRpcElapsedMs',last_rpc_elapsed_ms,'gaps',gaps,'errors',errors,'stopped',stopped,'reason',reason),
 'budget',jsonb_build_object('connectionsUsed',connections,'connectionsMax',3,'rpcUsed',rpc,'rpcMax',40,'framesReserved',connections*20000,'bytesReserved',connections::bigint*16777216,'creditsReserved',credits,'creditsMax',credit_limit,'framesReceived',frames_received,'bytesReceived',bytes_received,'expiresAt',CASE WHEN expires_at IS NULL THEN NULL ELSE to_char(expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END),
 'retention',jsonb_build_object('seconds',3600,'maxRecords',200,'expiresOnRead',true)) FROM scout_live.control WHERE id
$fn$;

CREATE FUNCTION scout_live.stop() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
BEGIN
 UPDATE scout_live.control SET stopped=true,reason=coalesce(reason,'owner') WHERE id;
 IF NOT FOUND THEN RAISE EXCEPTION 'missing_control'; END IF;
 RETURN jsonb_build_object('version','scout-live/1','status','stopped','observedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
END $fn$;
REVOKE ALL ON ALL TABLES IN SCHEMA scout_live FROM PUBLIC,scout_live_worker,scout_live_reader,scout_live_stop;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA scout_live FROM PUBLIC,scout_live_worker,scout_live_reader,scout_live_stop;
GRANT EXECUTE ON FUNCTION scout_live.step(jsonb) TO scout_live_worker;
GRANT EXECUTE ON FUNCTION scout_live.snapshot() TO scout_live_reader;
GRANT EXECUTE ON FUNCTION scout_live.stop() TO scout_live_stop;
-- Fail atomically if the owner's preexisting default ACLs would leak this new namespace.
DO $acl$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='scout_live' AND a.grantee<>n.nspowner AND (a.grantee NOT IN ('scout_live_worker'::regrole,'scout_live_reader'::regrole,'scout_live_stop'::regrole) OR a.privilege_type<>'USAGE' OR a.is_grantable))
 OR EXISTS(SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(t.relacl,acldefault('r',t.relowner))) a WHERE n.nspname='scout_live' AND a.grantee<>t.relowner)
 OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname='scout_live' AND a.grantee<>p.proowner AND (a.grantee=0 OR a.grantee<>CASE p.proname WHEN 'step' THEN 'scout_live_worker'::regrole WHEN 'snapshot' THEN 'scout_live_reader'::regrole WHEN 'stop' THEN 'scout_live_stop'::regrole ELSE 0 END OR a.is_grantable))
 THEN RAISE EXCEPTION 'unexpected_live_acl'; END IF;
END $acl$;
COMMIT;
