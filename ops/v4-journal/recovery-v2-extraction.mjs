// Definitions only: no driver, environment, connection, signing, execution or hosted access.
// Use a dedicated idle approved client. SET LOCAL ROLE uses existing SET memberships, never GRANT.
const journal=`SELECT jsonb_build_object(
 'journal',coalesce((SELECT jsonb_agg(jsonb_build_object('id',encode(sha256(convert_to(owner_id::text||'/'||journal_id::text,'UTF8')),'hex'),'revision',revision,'head',head,'metadataHash',encode(sha256(convert_to(to_jsonb(j)::text,'UTF8')),'hex')) ORDER BY owner_id,journal_id) FROM unfarmd_journal.journals j WHERE head IS NOT NULL),'[]'::jsonb),
 'owners',coalesce((SELECT jsonb_agg(jsonb_build_object('id',encode(sha256(convert_to(owner_id::text,'UTF8')),'hex'),'journals',journals,'events',lifetime_events) ORDER BY owner_id) FROM unfarmd_journal.owners),'[]'::jsonb)) AS part`;
const deploy=`SELECT jsonb_build_object(
 'tombstones',coalesce((SELECT jsonb_agg(jsonb_build_object('id',encode(sha256(convert_to(owner_id::text||'/'||journal_id::text,'UTF8')),'hex'),'head',head,'metadataHash',encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')) ORDER BY owner_id,journal_id) FROM unfarmd_v4_deploy.tombstones t),'[]'::jsonb),
 'rates',coalesce((SELECT jsonb_agg(jsonb_build_object('id',encode(sha256(convert_to(owner_id::text,'UTF8')),'hex'),'windowAt',floor(extract(epoch FROM window_at)*1000)::bigint,'lastAt',floor(extract(epoch FROM last_at)*1000)::bigint,'reads',reads,'writes',writes) ORDER BY owner_id) FROM unfarmd_thesis_rate.usage),'[]'::jsonb)) AS part`;
const boundary=`SELECT jsonb_build_object(
 'authHash',encode(sha256(convert_to(jsonb_build_object('users',(SELECT jsonb_agg(encode(sha256(convert_to(to_jsonb(u)::text,'UTF8')),'hex') ORDER BY id) FROM public.v4_owner_user u),'accounts',(SELECT jsonb_agg(encode(sha256(convert_to(to_jsonb(a)::text,'UTF8')),'hex') ORDER BY id) FROM public.v4_owner_account a),'verification',(SELECT jsonb_agg(encode(sha256(convert_to(to_jsonb(v)::text,'UTF8')),'hex') ORDER BY id) FROM public.v4_owner_verification v),'policy',(SELECT jsonb_agg(to_jsonb(p)) FROM unfarmd_v4_owner.policy p),'sessionDigests',(SELECT jsonb_agg(encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex') ORDER BY id) FROM public.v4_owner_session s))::text,'UTF8')),'hex'),
 'pilot',(SELECT jsonb_build_object('policyHash',p.hash,'reads',s.reads,'attempts',s.attempts,'credits',s.credits,'stopped',s.stopped,'fence',CASE WHEN s.fence IS NULL THEN NULL ELSE encode(sha256(convert_to(s.fence::text,'UTF8')),'hex') END,'leaseHash',CASE WHEN s.lease IS NULL THEN NULL ELSE encode(sha256(convert_to(s.lease::text,'UTF8')),'hex') END,'historyHash',encode(sha256(convert_to(jsonb_build_object('state',to_jsonb(s),'history',(SELECT jsonb_agg(to_jsonb(h) ORDER BY seq) FROM unfarmd_v4_pilot.history h),'permits',(SELECT jsonb_agg(to_jsonb(m) ORDER BY id) FROM unfarmd_v4_pilot.permits m),'reports',(SELECT jsonb_agg(to_jsonb(r) ORDER BY mint) FROM unfarmd_v4_pilot.reports r))::text,'UTF8')),'hex')) FROM unfarmd_v4_pilot.policy p JOIN unfarmd_v4_pilot.state s USING(singleton))) AS part`;
const ca=`WITH p AS (SELECT * FROM unfarmd_v4_ca_budget.policy ORDER BY singleton LIMIT 2),s AS (SELECT * FROM unfarmd_v4_ca_budget.state ORDER BY singleton LIMIT 2),
 l AS (SELECT * FROM unfarmd_v4_ca_budget.lookups ORDER BY encode(sha256(convert_to(id,'UTF8')),'hex') LIMIT 4),h AS (SELECT * FROM unfarmd_v4_ca_budget.history ORDER BY seq LIMIT 65)
SELECT CASE WHEN (SELECT count(*) FROM p)<=1 AND (SELECT count(*) FROM s)<=1 THEN jsonb_build_object(
 'policy',(SELECT jsonb_build_object('policyHash',hash,'recordSha256',encode(sha256(convert_to(record_text,'UTF8')),'hex'),'rowSha256',encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex'),
 'ownerSha256',encode(sha256(convert_to(owner_subject::text,'UTF8')),'hex'),'originSha256',encode(sha256(convert_to(origin,'UTF8')),'hex'),'releaseHash',release_hash,'runtimeKind',runtime_kind,
 'startsMs',starts_ms::text,'expiresMs',expires_ms::text,'maxLookups',max_lookups,'maxAttempts',max_attempts,'maxCredits',max_credits,'debitJupiter',debit_jupiter,'debitHelius',debit_helius) FROM p),
 'state',(SELECT jsonb_build_object('lookups',lookups,'attempts',attempts,'credits',credits,'stopped',stopped,'fenceSha256',CASE WHEN fence IS NULL THEN NULL ELSE encode(sha256(convert_to(fence::text,'UTF8')),'hex') END,
 'leaseSha256',CASE WHEN lease IS NULL THEN NULL ELSE encode(sha256(convert_to(lease::text,'UTF8')),'hex') END,'lastClientMs',last_client::text,'lastServerMs',last_server::text,'nextJupiterMs',next_jupiter::text,'nextHeliusMs',next_helius::text,'rowSha256',encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex')) FROM s),
 'lookups',coalesce((SELECT jsonb_agg(jsonb_build_object('idSha256',encode(sha256(convert_to(id,'UTF8')),'hex'),'mintSha256',encode(sha256(convert_to(mint,'UTF8')),'hex'),'rowSha256',encode(sha256(convert_to(to_jsonb(l)::text,'UTF8')),'hex')) ORDER BY encode(sha256(convert_to(id,'UTF8')),'hex')) FROM l),'[]'::jsonb),
 'history',coalesce((SELECT jsonb_agg(jsonb_build_object('seq',seq::text,'serverMs',server_ms::text,'kind',kind,'receiptSha256',encode(sha256(convert_to(receipt::text,'UTF8')),'hex'),'rowSha256',encode(sha256(convert_to(to_jsonb(h)::text,'UTF8')),'hex')) ORDER BY seq) FROM h),'[]'::jsonb),
 'sequence',(SELECT jsonb_build_object('lastValue',last_value::text,'isCalled',is_called) FROM unfarmd_v4_ca_budget.history_seq_seq)) ELSE NULL END AS part`;
// At most 64 history and 3 lookup rows are valid. Read one extra to DETECT overflow, never accept a prefix.
export const RECOVERY_CAPTURE_V2_PLAN=Object.freeze([
 {name:'begin',sql:'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'},
 {name:'limits',sql:"SET LOCAL search_path=pg_catalog; SET LOCAL statement_timeout='800ms'; SET LOCAL lock_timeout='100ms'"},
 {name:'metadata',sql:"SELECT current_database() AS database,current_setting('transaction_read_only')='on' AS \"readOnly\",current_setting('transaction_isolation') AS isolation,floor(extract(epoch FROM clock_timestamp())*1000)::bigint::text AS \"atMs\",pg_current_wal_lsn()::text AS lsn,pg_current_snapshot()::text AS \"readSnapshot\""},
 {name:'journalRole',sql:'SET LOCAL ROLE unfarmd_journal_owner'}, {name:'journal',sql:journal},
 {name:'deployRole',sql:'SET LOCAL ROLE unfarmd_v4_deploy_owner'}, {name:'deploy',sql:deploy},
 {name:'boundaryRole',sql:'SET LOCAL ROLE unfarmd_v4_boundary_owner'}, {name:'boundary',sql:boundary},
 {name:'caRole',sql:'SET LOCAL ROLE unfarmd_v4_ca_owner'}, {name:'ca',sql:ca},
 {name:'rollback',sql:'ROLLBACK'}
].map(Object.freeze));
// Caller assembles { ...metadata,legacy:{...journal.part,...deploy.part,...boundary.part},ca:ca.part }.
// Missing CA/schema/privilege/query error must abort and ROLLBACK; no partial manifest or fallback to v1.
