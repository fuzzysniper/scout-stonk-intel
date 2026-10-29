-- REVIEW + DISPOSABLE LOCAL TEST ONLY. No hosted migration/activation is authorized.
-- Fresh ISOLATED database proposal: never scout_live / existing production branch.
BEGIN;
CREATE ROLE unfarmd_v4_boundary_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE unfarmd_v4_auth_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE unfarmd_v4_pilot_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA unfarmd_v4_owner AUTHORIZATION unfarmd_v4_boundary_owner;
CREATE SCHEMA unfarmd_v4_pilot AUTHORIZATION unfarmd_v4_boundary_owner;
REVOKE ALL ON SCHEMA unfarmd_v4_owner,unfarmd_v4_pilot FROM PUBLIC;
-- Fixed unique Better Auth base schema; account/verification stay EMPTY, with no login/signup/issuer route.
CREATE TABLE public.v4_owner_user(id text PRIMARY KEY,name text NOT NULL,email text NOT NULL UNIQUE,"emailVerified" boolean NOT NULL,"image" text,"createdAt" timestamptz NOT NULL,"updatedAt" timestamptz NOT NULL);
CREATE TABLE public.v4_owner_session(id text PRIMARY KEY,token text NOT NULL UNIQUE,"userId" text NOT NULL REFERENCES public.v4_owner_user,"expiresAt" timestamptz NOT NULL,"createdAt" timestamptz NOT NULL,"updatedAt" timestamptz NOT NULL,"ipAddress" text,"userAgent" text,issuer text NOT NULL,audience text NOT NULL,
 CHECK("expiresAt">"createdAt" AND "expiresAt"<="createdAt"+interval '15 minutes'));
CREATE INDEX v4_owner_session_user ON public.v4_owner_session("userId");
CREATE TABLE public.v4_owner_account(id text PRIMARY KEY,"accountId" text NOT NULL,"providerId" text NOT NULL,"userId" text NOT NULL REFERENCES public.v4_owner_user,"accessToken" text,"refreshToken" text,"idToken" text,"accessTokenExpiresAt" timestamptz,"refreshTokenExpiresAt" timestamptz,scope text,password text,"createdAt" timestamptz NOT NULL,"updatedAt" timestamptz NOT NULL);
CREATE INDEX v4_owner_account_user ON public.v4_owner_account("userId");
CREATE TABLE public.v4_owner_verification(id text PRIMARY KEY,identifier text NOT NULL,value text NOT NULL,"expiresAt" timestamptz NOT NULL,"createdAt" timestamptz NOT NULL,"updatedAt" timestamptz NOT NULL);
CREATE INDEX v4_owner_verification_identifier ON public.v4_owner_verification(identifier);
ALTER TABLE public.v4_owner_account OWNER TO unfarmd_v4_boundary_owner;
ALTER TABLE public.v4_owner_verification OWNER TO unfarmd_v4_boundary_owner;
ALTER TABLE public.v4_owner_user OWNER TO unfarmd_v4_boundary_owner;
ALTER TABLE public.v4_owner_session OWNER TO unfarmd_v4_boundary_owner;
REVOKE ALL ON public.v4_owner_user,public.v4_owner_session,public.v4_owner_account,public.v4_owner_verification FROM PUBLIC;
SET LOCAL ROLE unfarmd_v4_boundary_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA unfarmd_v4_pilot REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE unfarmd_v4_owner.policy(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),owner_subject uuid NOT NULL,journal_owner_id uuid NOT NULL,issuer text NOT NULL,audience text NOT NULL,secret_sha256 text NOT NULL CHECK(secret_sha256~'^[a-f0-9]{64}$'),enabled boolean NOT NULL DEFAULT false);
-- Empty by default. Even a real signed nonowner session cannot pass this single-owner binding.
CREATE FUNCTION unfarmd_v4_pilot.valid_mint(m text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $f$
DECLARE v numeric:=0; n integer:=0; z integer:=0; c text; i integer; alphabet constant text:='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
BEGIN
 IF m IS NULL OR m!~'^[1-9A-HJ-NP-Za-km-z]{32,44}$' THEN RETURN false; END IF;
 FOR i IN 1..length(m) LOOP c:=substr(m,i,1); v:=v*58+strpos(alphabet,c)-1; END LOOP;
 WHILE substr(m,z+1,1)='1' LOOP z:=z+1; END LOOP;
 WHILE v>0 LOOP n:=n+1;v:=trunc(v/256);END LOOP;
 RETURN n+z=32;
END $f$;
CREATE TABLE unfarmd_v4_pilot.policy(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),profile_text text NOT NULL CHECK(octet_length(profile_text)<=4096),
 hash text NOT NULL UNIQUE CHECK(hash=encode(sha256(convert_to(profile_text,'UTF8')),'hex')),
 owner_subject text NOT NULL, starts_ms bigint NOT NULL,expires_ms bigint NOT NULL,
 mints jsonb NOT NULL CHECK(jsonb_typeof(mints)='array' AND jsonb_array_length(mints)=3),
 credit_debit integer NOT NULL CHECK(credit_debit BETWEEN 1 AND 1000000),credit_limit bigint NOT NULL,
 CHECK(starts_ms>=0 AND expires_ms>starts_ms AND expires_ms-starts_ms<=900000),CHECK(credit_limit>=credit_debit AND credit_limit<=10*credit_debit),
 CHECK(profile_text::jsonb->>'ownerSubject'=owner_subject AND (profile_text::jsonb->>'startsAt')::bigint=starts_ms AND (profile_text::jsonb->>'expiresAt')::bigint=expires_ms AND profile_text::jsonb->'mints'=mints
 AND (profile_text::jsonb->>'creditsPerAttempt')::int=credit_debit AND (profile_text::jsonb->>'maxCredits')::bigint=credit_limit),
 CHECK(unfarmd_v4_pilot.valid_mint(mints->>0) AND unfarmd_v4_pilot.valid_mint(mints->>1) AND unfarmd_v4_pilot.valid_mint(mints->>2) AND mints->>0<>mints->>1 AND mints->>0<>mints->>2 AND mints->>1<>mints->>2)
);
CREATE TABLE unfarmd_v4_pilot.state(
 singleton boolean PRIMARY KEY REFERENCES unfarmd_v4_pilot.policy CHECK(singleton),fence uuid,
 reads integer NOT NULL DEFAULT 0 CHECK(reads BETWEEN 0 AND 30), attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10),
 credits bigint NOT NULL DEFAULT 0 CHECK(credits BETWEEN 0 AND 10000000),stopped boolean NOT NULL DEFAULT false,
 client_ms bigint NOT NULL DEFAULT 0,server_ms bigint NOT NULL DEFAULT 0,lease jsonb,highest_slot bigint NOT NULL DEFAULT 0);
CREATE TABLE unfarmd_v4_pilot.permits(id text PRIMARY KEY,permit jsonb NOT NULL,reserved boolean NOT NULL DEFAULT false,finished boolean NOT NULL DEFAULT false);
CREATE TABLE unfarmd_v4_pilot.reports(mint text PRIMARY KEY,report jsonb NOT NULL);
CREATE TABLE unfarmd_v4_pilot.history(seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,kind text NOT NULL,server_ms bigint NOT NULL,receipt jsonb NOT NULL);
-- No runtime bootstrap/reset/refund/reclaim/migration or DELETE entry. Only reviewed owner provisions once.
CREATE FUNCTION unfarmd_v4_pilot.step(c jsonb, caller uuid, expected_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE p unfarmd_v4_pilot.policy;s unfarmd_v4_pilot.state; stored unfarmd_v4_pilot.permits;
 k text:=c->>'kind';t bigint;server_t bigint;pol text;own text;m text;v_permit jsonb;l jsonb;r jsonb;reply jsonb;why text;
BEGIN
 IF octet_length(c::text)>8192 OR caller IS NULL OR expected_hash IS NULL OR expected_hash!~'^[a-f0-9]{64}$' OR jsonb_typeof(c)<>'object' THEN RAISE EXCEPTION 'pilot_invalid'; END IF;
 IF k IS NULL OR k NOT IN ('admit','reserve','finish','stop') THEN RAISE EXCEPTION 'pilot_invalid';END IF;
 IF NOT c ?& (CASE WHEN k='admit' THEN ARRAY['kind','policyHash','ownerSubject','mint','now'] WHEN k='stop' THEN ARRAY['kind','policyHash','ownerSubject','reason','now'] WHEN k='reserve' THEN ARRAY['kind','permit','now'] ELSE ARRAY['kind','permit','lease','report','now'] END) THEN RAISE EXCEPTION 'pilot_invalid';END IF;
 SELECT * INTO p FROM unfarmd_v4_pilot.policy WHERE singleton=true;
 IF NOT FOUND OR p.hash<>expected_hash THEN RAISE EXCEPTION 'pilot_unconfigured'; END IF;
 SELECT * INTO s FROM unfarmd_v4_pilot.state WHERE singleton=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pilot_unconfigured';END IF;
 server_t:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 pol:=CASE WHEN k IN ('admit','stop') THEN c->>'policyHash' ELSE c->'permit'->>'policyHash' END;
 own:=CASE WHEN k IN ('admit','stop') THEN c->>'ownerSubject' ELSE c->'permit'->>'ownerSubject' END;
 IF pol IS DISTINCT FROM p.hash OR own IS DISTINCT FROM p.owner_subject THEN RAISE EXCEPTION 'pilot_denied';END IF;
 -- STOP is monotone, valid after expiry and from any replica. Never releases or refunds a lease.
 IF k='stop' THEN
  IF c->>'reason' NOT IN ('owner_stop','uncertain') OR c-'kind'-'policyHash'-'ownerSubject'-'reason'-'now'<>'{}'::jsonb THEN RAISE EXCEPTION 'pilot_invalid';END IF;
  IF NOT s.stopped THEN UPDATE unfarmd_v4_pilot.state SET stopped=true WHERE singleton=true;
   INSERT INTO unfarmd_v4_pilot.history(kind,server_ms,receipt) VALUES('stop',server_t,jsonb_build_object('reason',c->>'reason'));END IF;
  RETURN jsonb_build_object('kind','stopped','policyHash',p.hash);
 END IF;
 IF s.stopped THEN RETURN jsonb_build_object('kind','denied','reason','stopped');END IF;
 -- A fresh process must NOT take over an ambiguous crashed instance. No fence reuse API.
 IF s.fence IS NOT NULL AND s.fence<>caller THEN why:='stopped';
 ELSIF jsonb_typeof(c->'now') IS DISTINCT FROM 'number' OR (c->>'now')!~'^[0-9]{1,15}$' THEN why:='invalid_clock';
 ELSE t:=(c->>'now')::bigint;
  IF t<s.client_ms OR server_t<s.server_ms OR abs(t-server_t)>1000 THEN why:='invalid_clock';END IF;
 END IF;
 IF why IS NOT NULL THEN
  UPDATE unfarmd_v4_pilot.state SET stopped=true WHERE singleton=true;
  INSERT INTO unfarmd_v4_pilot.history(kind,server_ms,receipt) VALUES('stop',server_t,jsonb_build_object('reason',why));
  RETURN jsonb_build_object('kind','denied','reason',why);
 END IF;
 UPDATE unfarmd_v4_pilot.state SET fence=caller,client_ms=t,server_ms=server_t WHERE singleton=true;
 IF t<p.starts_ms OR server_t<p.starts_ms OR t>=p.expires_ms OR server_t>=p.expires_ms THEN RETURN jsonb_build_object('kind','denied','reason','expired');END IF;
 IF s.lease IS NOT NULL AND (t>=(s.lease->>'expiresAt')::bigint OR server_t>=(s.lease->>'expiresAt')::bigint) THEN
  UPDATE unfarmd_v4_pilot.state SET stopped=true WHERE singleton=true;
  INSERT INTO unfarmd_v4_pilot.history(kind,server_ms,receipt) VALUES('stop',server_t,'{"reason":"unresolved_expired_lease"}');
  RETURN jsonb_build_object('kind','denied','reason','stopped');END IF;
 IF k='admit' THEN
  IF c-'kind'-'policyHash'-'ownerSubject'-'mint'-'now'<>'{}'::jsonb OR NOT (p.mints ? (c->>'mint')) THEN RAISE EXCEPTION 'pilot_invalid';END IF;
  IF s.reads>=30 THEN RETURN jsonb_build_object('kind','denied','reason','read_limited');END IF;
  v_permit:=jsonb_build_object('policyHash',p.hash,'id','read-'||(s.reads+1),'ownerSubject',p.owner_subject,'mint',c->>'mint','admittedAt',t);
  INSERT INTO unfarmd_v4_pilot.permits(id,permit) VALUES(v_permit->>'id',v_permit);
  UPDATE unfarmd_v4_pilot.state SET reads=reads+1 WHERE singleton=true;
  reply:=jsonb_build_object('kind','permit','permit',v_permit);
 ELSIF k IN ('reserve','finish') THEN
  v_permit:=c->'permit'; SELECT * INTO stored FROM unfarmd_v4_pilot.permits WHERE id=v_permit->>'id';
  IF NOT FOUND OR stored.finished OR stored.permit<>v_permit THEN RAISE EXCEPTION 'pilot_invalid';END IF;
  m:=v_permit->>'mint';
  IF k='reserve' THEN
   IF c-'kind'-'permit'-'now'<>'{}'::jsonb OR stored.reserved THEN RAISE EXCEPTION 'pilot_invalid';END IF;
   IF s.lease IS NOT NULL THEN RETURN jsonb_build_object('kind','denied','reason','busy');END IF;
   IF s.attempts>=10 OR s.credits+p.credit_debit>p.credit_limit THEN RETURN jsonb_build_object('kind','denied','reason','exhausted');END IF;
   l:=jsonb_build_object('policyHash',p.hash,'permitId',v_permit->>'id','id',s.attempts+1,'mint',m,'issuedAt',t,'expiresAt',least(t+5000,p.expires_ms),'attemptsReserved',s.attempts+1,'creditsReserved',s.credits+p.credit_debit);
   UPDATE unfarmd_v4_pilot.state SET attempts=attempts+1,credits=credits+p.credit_debit,lease=l WHERE singleton=true;
   UPDATE unfarmd_v4_pilot.permits SET reserved=true WHERE id=v_permit->>'id';
   reply:=jsonb_build_object('kind','lease','lease',l);
  ELSE
   IF c-'kind'-'permit'-'lease'-'report'-'now'<>'{}'::jsonb OR NOT c ? 'lease' THEN RAISE EXCEPTION 'pilot_invalid';END IF;
   r:=c->'report';
   IF jsonb_typeof(r) IS DISTINCT FROM 'object' OR jsonb_typeof(r->'responseSha256') IS DISTINCT FROM 'string' OR jsonb_typeof(r->'contextSlot') IS DISTINCT FROM 'string' OR jsonb_typeof(r->'receivedAt') IS DISTINCT FROM 'number' OR r-'responseSha256'-'contextSlot'-'receivedAt'<>'{}'::jsonb OR (r->>'responseSha256')!~'^[a-f0-9]{64}$'
    OR (r->>'contextSlot')!~'^[1-9][0-9]{0,15}$' OR (r->>'receivedAt')!~'^[0-9]{1,15}$' OR NOT(r ?& ARRAY['responseSha256','contextSlot','receivedAt']) THEN RAISE EXCEPTION 'pilot_invalid';END IF;
   IF (r->>'receivedAt')::bigint>t OR (r->>'receivedAt')::bigint<p.starts_ms OR t-(r->>'receivedAt')::bigint>60000 THEN RAISE EXCEPTION 'pilot_invalid';END IF;
   IF c->'lease'<>'null'::jsonb THEN
    IF s.lease IS NULL OR c->'lease'<>s.lease OR s.lease->>'permitId'<>v_permit->>'id' OR NOT stored.reserved OR (r->>'receivedAt')::bigint<(s.lease->>'issuedAt')::bigint THEN RAISE EXCEPTION 'pilot_invalid';END IF;
    IF (r->>'contextSlot')::bigint<s.highest_slot THEN
     UPDATE unfarmd_v4_pilot.state SET stopped=true WHERE singleton=true;
     INSERT INTO unfarmd_v4_pilot.history(kind,server_ms,receipt) VALUES('stop',server_t,'{"reason":"slot_regression"}');RETURN jsonb_build_object('kind','denied','reason','invalid_clock');END IF;
    UPDATE unfarmd_v4_pilot.state SET lease=null,highest_slot=(r->>'contextSlot')::bigint WHERE singleton=true;
    INSERT INTO unfarmd_v4_pilot.reports(mint,report) VALUES(m,r) ON CONFLICT(mint) DO UPDATE SET report=excluded.report;
   ELSE
    IF stored.reserved OR t-(r->>'receivedAt')::bigint>30000 OR NOT EXISTS(SELECT 1 FROM unfarmd_v4_pilot.reports WHERE mint=m AND report=r) THEN RAISE EXCEPTION 'pilot_invalid';END IF;
   END IF;
   UPDATE unfarmd_v4_pilot.permits SET finished=true WHERE id=v_permit->>'id';
   reply:=jsonb_build_object('kind','published','policyHash',p.hash,'permitId',v_permit->>'id','leaseId',c->'lease'->'id','report',r,'committedAt',t);
  END IF;
 ELSE RAISE EXCEPTION 'pilot_invalid';END IF;
 INSERT INTO unfarmd_v4_pilot.history(kind,server_ms,receipt) VALUES(k,server_t,reply);
 RETURN reply;
END $f$;
REVOKE ALL ON ALL TABLES IN SCHEMA unfarmd_v4_owner,unfarmd_v4_pilot FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unfarmd_v4_pilot FROM PUBLIC;
GRANT USAGE ON SCHEMA unfarmd_v4_owner TO unfarmd_v4_auth_reader;
GRANT SELECT ON unfarmd_v4_owner.policy,public.v4_owner_user,public.v4_owner_session,public.v4_owner_account,public.v4_owner_verification TO unfarmd_v4_auth_reader;
GRANT USAGE ON SCHEMA unfarmd_v4_pilot TO unfarmd_v4_pilot_app;
GRANT EXECUTE ON FUNCTION unfarmd_v4_pilot.step(jsonb,uuid,text) TO unfarmd_v4_pilot_app;
COMMIT;
