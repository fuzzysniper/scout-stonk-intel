import 'server-only';
// Exact reviewed SQL function body, not a self-healing or automatic migration check.
export const STEP_SHA = 'deda6ec6b8e3bbf6df9c405e69815fc67a112d58e10f753fd4ae7a01b835e35e';
export const PROOF_SQL = `SELECT
 current_setting('fsync')='on' AND current_setting('synchronous_commit')='on' AND NOT pg_is_in_recovery()
 AND EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner
  WHERE n.nspname='unfarmd_v4_pilot' AND p.proname='step' AND p.oid='unfarmd_v4_pilot.step(jsonb,uuid,text)'::regprocedure
  AND r.rolname='unfarmd_v4_boundary_owner' AND NOT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls
  AND p.prosecdef AND NOT p.proleakproof AND p.proconfig=ARRAY['search_path=pg_catalog']
  AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')=$1)
 AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication)
 AND pg_has_role(current_user,'unfarmd_v4_pilot_app','member')
 AND NOT pg_has_role(current_user,'unfarmd_v4_boundary_owner','member')
 AND NOT has_table_privilege(current_user,'unfarmd_v4_pilot.state','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
 AS durable`;
