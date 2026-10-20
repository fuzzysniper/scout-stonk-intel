import "server-only";
/** SHA-256 of exact prosrc bytes between $function$ delimiters in the reviewed schema.sql.
 * No migration/repair is attempted on mismatch. Tests pin this against the actual SQL file.
 */
export const STEP_BODY_SHA256 = "f74e435a29fc18d6cf7d92bc415da8f2ad245b41a37ba8cd67bf998fa53f19f9";
/** Catalog-only compatibility proof, run INSIDE each native transaction before step().
 * No application table SELECT, owner password, verifier, secret or arbitrary SQL input.
 * Client TLS is mandatory in postgres-store's actual socket proof. pg_stat_ssl
 * describes the backend hop after a provider proxy, not that verified client hop;
 * requiring backend TLS here falsely rejects legitimate TLS-terminating proxies.
 * Internal provider-hop encryption and negotiated SCRAM remain unobserved.
 */
export const POSTGRES_COMPATIBILITY_SQL = `SELECT (
 current_user='scout_mint_app' AND session_user='scout_mint_app'
 AND pg_catalog.current_database()='neondb'
 AND NOT pg_catalog.pg_is_in_recovery()
 AND pg_catalog.current_setting('synchronous_commit')='on'
 AND pg_catalog.current_setting('transaction_read_only')='off'
 AND pg_catalog.current_setting('search_path')='pg_catalog'
 AND (SELECT r.rolcanlogin AND r.rolinherit AND NOT(r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
      FROM pg_catalog.pg_roles r WHERE r.rolname=current_user)
 AND pg_catalog.pg_has_role(current_user,'scout_mint_runtime','USAGE')
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname NOT IN(current_user,'scout_mint_runtime')
      AND pg_catalog.pg_has_role(current_user,r.oid,'MEMBER'))
 AND (SELECT NOT(r.rolcanlogin OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
      FROM pg_catalog.pg_roles r WHERE r.rolname='scout_mint_runtime')
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.admin_option AND pg_catalog.pg_has_role(current_user,m.member,'MEMBER'))
 AND pg_catalog.has_schema_privilege(current_user,'scout_mint','USAGE')
 AND NOT pg_catalog.has_schema_privilege(current_user,'scout_mint','CREATE')
 AND NOT pg_catalog.has_schema_privilege(current_user,'scout_mint','USAGE WITH GRANT OPTION')
 AND NOT pg_catalog.has_database_privilege(current_user,pg_catalog.current_database(),'CREATE')
 AND pg_catalog.has_function_privilege(current_user,'scout_mint.step(jsonb)','EXECUTE')
 AND NOT pg_catalog.has_function_privilege(current_user,'scout_mint.step(jsonb)','EXECUTE WITH GRANT OPTION')
 AND p.prosecdef AND p.provolatile='v' AND l.lanname='plpgsql'
 AND p.proowner=(SELECT n.nspowner FROM pg_catalog.pg_namespace n WHERE n.nspname='scout_mint')
 AND p.proowner<>current_user::pg_catalog.regrole
 AND p.proconfig @> ARRAY['search_path=pg_catalog, scout_mint','lock_timeout=100ms']
 AND pg_catalog.cardinality(p.proconfig)=2
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
                WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
 AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')=$1
 ${['policy','clients','cache'].map(t=>`AND NOT pg_catalog.has_table_privilege(current_user,'scout_mint.${t}','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
 AND CASE WHEN pg_catalog.current_setting('server_version_num')::integer>=170000
 THEN NOT pg_catalog.has_table_privilege(current_user,'scout_mint.${t}','MAINTAIN') ELSE true END`).join('\n')}
 ) AS compatible
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE p.oid='scout_mint.step(jsonb)'::pg_catalog.regprocedure`;

/** Same least-privilege/catalog proof, statically bound to the additive lookup schema.
 * Role stays scout_mint_runtime; no caller-supplied identifier or alternate SQL.
 */
export const LOOKUP_STEP_BODY_SHA256 = "c5aedb841dc23f6012bd1ef2935262f2a3899e6b11b62c0386d7f45fc436e0c0";
export const LOOKUP_COMPATIBILITY_SQL = POSTGRES_COMPATIBILITY_SQL
  .replaceAll("scout_mint.", "scout_lookup.")
  .replaceAll("'scout_mint'", "'scout_lookup'")
  .replace("search_path=pg_catalog, scout_mint", "search_path=pg_catalog, scout_lookup");
