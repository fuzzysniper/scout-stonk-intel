/**
 * SCOUT one-shot read-only Neon check. PREPARED ONLY; no production execution approved.
 * Not imported by any HTTP route, build hook, scheduler or deployment process.
 * Runs only with two explicit CLI flags and matching Vercel production identity.
 * NEVER invokes scout_mint.step: doing so would persist admission/quota state.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXPECTED = Object.freeze({
  host: 'ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech',
  database: 'neondb',
  role: 'scout_mint_app',
  vercelProjectId: 'prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q',
});
export const EXECUTION_FLAGS = Object.freeze(['--execute', '--approve-production-read-only']);
export const SELECT_ONLY_SQL = [
  'SELECT',
  " (current_user = 'scout_mint_app' AND session_user = 'scout_mint_app') AS identity_ok,",
  " (current_database() = 'neondb') AS database_ok,",
  " (current_setting('transaction_read_only') = 'on') AS read_only,",
  " (NOT pg_is_in_recovery()) AS primary_ok,",
  " (SELECT s.ssl AND s.version IN ('TLSv1.2','TLSv1.3') FROM pg_stat_ssl s WHERE s.pid = pg_backend_pid()) AS tls_ok,",
  " (SELECT NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls) FROM pg_roles r WHERE r.rolname = current_user) AS least_privilege_ok,",
  " pg_has_role(current_user, 'scout_mint_runtime', 'USAGE') AS runtime_group_ok,",
  " has_schema_privilege(current_user, 'scout_mint', 'USAGE') AS schema_usage_ok,",
  " (NOT has_schema_privilege(current_user, 'scout_mint', 'CREATE')) AS schema_create_denied,",
  " has_function_privilege(current_user, 'scout_mint.step(jsonb)', 'EXECUTE') AS function_execute_ok,",
  " (NOT has_database_privilege(current_user, current_database(), 'CREATE')) AS database_create_denied,",
  " (NOT has_table_privilege(current_user, 'scout_mint.policy', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS policy_table_denied,",
  " (NOT has_table_privilege(current_user, 'scout_mint.clients', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS clients_table_denied,",
  " (NOT has_table_privilege(current_user, 'scout_mint.cache', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS cache_table_denied"
].join('\n');

export function validateIntent(argv, env) {
  if (argv.length !== EXECUTION_FLAGS.length || !EXECUTION_FLAGS.every(flag => argv.includes(flag))) throw Error('approval_required');
  if (env.VERCEL !== '1' || env.VERCEL_ENV !== 'production' || env.VERCEL_PROJECT_ID !== EXPECTED.vercelProjectId) throw Error('hosting_identity_unverified');
  const raw = env.SCOUT_MINT_STORE_DATABASE_URL;
  if (typeof raw !== 'string' || raw.length > 2048 || /[\x00-\x20\x7f]/.test(raw)) throw Error('invalid_secret');
  let url;
  try { url = new URL(raw); } catch { throw Error('invalid_secret'); }
  if (url.protocol !== 'postgresql:' || url.host !== EXPECTED.host || url.pathname !== '/' + EXPECTED.database ||
      (url.search && url.search !== '?sslmode=require') || url.hash || url.password.length < 16 || url.password.length > 768) throw Error('unapproved_store_target');
  const user = decodeURIComponent(url.username), pass = decodeURIComponent(url.password);
  if (user !== EXPECTED.role || pass.length < 16 || pass.length > 256 || /[\x00-\x1f\x7f]/.test(pass)) throw Error('unapproved_store_role');
  return Object.freeze({host: EXPECTED.host, user, password: pass, database: EXPECTED.database});
}

export function poolOptions(target) {
  // Same native transport parameters as server/production-config.ts; review for drift.
  return {
    ...target, port: 5432,
    ssl: {rejectUnauthorized: true, servername: target.host}, enableChannelBinding: true,
    max: 1, idleTimeoutMillis: 10000, connectionTimeoutMillis: 1000,
    query_timeout: 1000, statement_timeout: 500, lock_timeout: 100,
    idle_in_transaction_session_timeout: 1000, client_encoding: 'UTF8', sslnegotiation: 'postgres',
    options: '-c synchronous_commit=on', application_name: 'scout_mint', allowExitOnIdle: true,
  };
}

export async function runReadOnlySmoke({argv, env, openPool}) {
  const target = validateIntent(argv, env); // no pg import, DNS or socket before gates
  const pool = await openPool(poolOptions(target));
  let client, inTransaction = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN TRANSACTION READ ONLY');
    inTransaction = true;
    const result = await client.query(SELECT_ONLY_SQL);
    if (result.rowCount !== 1 || !result.rows?.[0] ||
        Object.keys(result.rows[0]).length !== 14 || !Object.values(result.rows[0]).every(v => v === true))
      throw Error('read_only_assertions_failed');
    await client.query('ROLLBACK');
    inTransaction = false;
    return Object.freeze({ok: true, checks: 14, persistentWrites: 0});
  } finally {
    if (client) {
      if (inTransaction) {
        try { await client.query('ROLLBACK'); } catch { /* destroy client */ }
        client.release(true);
      } else client.release();
    }
    await pool.end();
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('SCOUT Neon read-only probe: requires approved one-shot Vercel production execution. No HTTP route.');
    return 0;
  }
  try {
    validateIntent(argv, env);
    const {Pool} = await import('pg'); // lazy, NEVER in unauthorized CI/build
    const result = await runReadOnlySmoke({argv, env, openPool: cfg => new Pool(cfg)});
    if (!result.ok) throw Error('no_proof');
    console.log('PASS: 14 native PG/TLS/role assertions; read-only rollback, no Helius.');
    return 0;
  } catch {
    // Never print exceptions, connection strings, SQL results, passwords, or stack traces.
    console.error('FAIL: SCOUT read-only probe could not establish all proofs; details suppressed.');
    return 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
