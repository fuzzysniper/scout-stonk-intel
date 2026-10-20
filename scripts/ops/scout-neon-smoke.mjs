/** REVIEW ONLY. Inert on import; no HTTP route, build hook, app store or RPC import. */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

export const EXPECTED = Object.freeze({
  host: 'ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech', database: 'neondb',
  role: 'scout_mint_app', vercelProjectId: 'prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q',
});
export const EXECUTION_FLAGS = Object.freeze(['--execute', '--approve-production-read-only']);
export const CHECKS = Object.freeze([
  'identity_ok', 'database_ok', 'read_only', 'isolation_ok', 'search_path_ok', 'primary_ok',
  'tls_ok', 'least_privilege_ok', 'runtime_group_ok', 'membership_ok', 'runtime_role_ok', 'delegation_denied',
  'schema_usage_ok', 'schema_create_denied', 'function_execute_ok', 'database_create_denied',
  'policy_table_denied', 'clients_table_denied', 'cache_table_denied',
]);
export const BEGIN_SQL = 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY';
// Fixed pg_catalog calls only. The step name below is a privilege lookup STRING, never a call.
export const SELECT_ONLY_SQL = `SELECT
 (current_user = 'scout_mint_app' AND session_user = 'scout_mint_app') AS identity_ok,
 (pg_catalog.current_database() = 'neondb') AS database_ok,
 (pg_catalog.current_setting('transaction_read_only') = 'on') AS read_only,
 (pg_catalog.current_setting('transaction_isolation') = 'repeatable read') AS isolation_ok,
 (pg_catalog.current_setting('search_path') = 'pg_catalog') AS search_path_ok,
 (NOT pg_catalog.pg_is_in_recovery()) AS primary_ok,
 (SELECT s.ssl AND s.version IN ('TLSv1.2','TLSv1.3') FROM pg_catalog.pg_stat_ssl s WHERE s.pid = pg_catalog.pg_backend_pid()) AS tls_ok,
 (SELECT r.rolcanlogin AND r.rolinherit AND NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
  FROM pg_catalog.pg_roles r WHERE r.rolname = current_user) AS least_privilege_ok,
 pg_catalog.pg_has_role(current_user, 'scout_mint_runtime', 'USAGE') AS runtime_group_ok,
 (NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname NOT IN (current_user, 'scout_mint_runtime')
  AND pg_catalog.pg_has_role(current_user, r.oid, 'MEMBER'))) AS membership_ok,
 (SELECT NOT (r.rolcanlogin OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
  FROM pg_catalog.pg_roles r WHERE r.rolname = 'scout_mint_runtime') AS runtime_role_ok,
 (NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.admin_option AND pg_catalog.pg_has_role(current_user, m.member, 'MEMBER'))
  AND NOT pg_catalog.has_schema_privilege(current_user, 'scout_mint', 'USAGE WITH GRANT OPTION')
  AND NOT pg_catalog.has_function_privilege(current_user, 'scout_mint.step(jsonb)', 'EXECUTE WITH GRANT OPTION')) AS delegation_denied,
 pg_catalog.has_schema_privilege(current_user, 'scout_mint', 'USAGE') AS schema_usage_ok,
 (NOT pg_catalog.has_schema_privilege(current_user, 'scout_mint', 'CREATE')) AS schema_create_denied,
 pg_catalog.has_function_privilege(current_user, 'scout_mint.step(jsonb)', 'EXECUTE') AS function_execute_ok,
 (NOT pg_catalog.has_database_privilege(current_user, pg_catalog.current_database(), 'CREATE')) AS database_create_denied,
 ${['policy','clients','cache'].map(table => `(NOT pg_catalog.has_table_privilege(current_user, 'scout_mint.${table}', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  AND CASE WHEN pg_catalog.current_setting('server_version_num')::integer >= 170000
  THEN NOT pg_catalog.has_table_privilege(current_user, 'scout_mint.${table}', 'MAINTAIN') ELSE true END) AS ${table}_table_denied`).join(',\n ')},
 pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.clock_timestamp()) * 1000)::text AS server_now_ms`;

const secrets = new WeakMap();
const clock = Object.freeze({now: () => Date.now(), monotonic: () => performance.now()});
const failure = () => Error('smoke_failed');
function requireProof(value) { if (!value) throw failure(); }

export function validateIntent(argv, env) {
  requireProof(Array.isArray(argv) && argv.length === EXECUTION_FLAGS.length && EXECUTION_FLAGS.every(flag => argv.includes(flag)));
  // Configuration gates, NOT platform attestation. See the separate deployment approval runbook.
  requireProof(env.VERCEL === '1' && env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_ID === EXPECTED.vercelProjectId);
  requireProof(env.NODE_TLS_REJECT_UNAUTHORIZED !== '0');
  const raw = env.SCOUT_MINT_STORE_DATABASE_URL; // ONLY this credential is read, after nonsecret gates.
  requireProof(typeof raw === 'string' && raw.length <= 2048 && !/[\x00-\x20\x7f]/.test(raw));
  try {
    const url = new URL(raw);
    requireProof(url.protocol === 'postgresql:' && url.hostname === EXPECTED.host && (!url.port || url.port === '5432') &&
      url.pathname === '/' + EXPECTED.database && (!url.search || url.search === '?sslmode=require') && !url.hash);
    const user = decodeURIComponent(url.username), password = decodeURIComponent(url.password);
    requireProof(user === EXPECTED.role && password.length >= 16 && password.length <= 256 && !/[\x00-\x1f\x7f]/.test(password));
    const handle = Object.freeze({...EXPECTED});
    secrets.set(handle, {host: EXPECTED.host, user, password, database: EXPECTED.database});
    return handle; // No enumerable credential or connection URL.
  } catch { throw failure(); }
}

export function clientOptions(handle) {
  const target = secrets.get(handle); requireProof(target);
  return {
    ...target, port: 5432,
    ssl: {rejectUnauthorized: true, servername: target.host, minVersion: 'TLSv1.2'}, enableChannelBinding: true,
    connectionTimeoutMillis: 1000, query_timeout: 1000, statement_timeout: 500, lock_timeout: 100,
    idle_in_transaction_session_timeout: 1000, client_encoding: 'UTF8', sslnegotiation: 'postgres',
    // Deliberately stricter than app pg startup: read-only before the FIRST query, trusted resolution.
    options: '-c synchronous_commit=on -c default_transaction_read_only=on -c search_path=pg_catalog',
    application_name: 'scout_neon_readonly_smoke',
  };
}

function bounded(work, ms, onTimeout = () => {}) {
  let timer;
  return Promise.race([work, new Promise((_, reject) => {timer = setTimeout(() => {onTimeout(); reject(failure());}, ms);})])
    .finally(() => clearTimeout(timer));
}

/** Dependency injection is for offline tests; executable main ALWAYS constructs native pg.Client. */
export async function runReadOnlySmoke({argv, env, openClient, sourceClock = clock, executionGuard = () => true}) {
  requireProof(executionGuard());
  const options = clientOptions(validateIntent(argv, env)); // No driver import/DNS/socket before gates.
  let client, transaction = false, rollbackAttempted = false, errored = false, stopped = false, report;
  const onError = () => {errored = true;}; // Suppress raw pg error events; never log exception objects.
  const started = sourceClock.now(), mono = sourceClock.monotonic();
  const validTime = t => Number.isSafeInteger(t) && t >= 0 && t <= 253402300799999;
  requireProof(validTime(started) && Number.isFinite(mono) && mono >= 0);
  try {
    requireProof(executionGuard());
    client = openClient(options);
    client.on('error', onError);
    report = await bounded((async () => {
      await client.connect();
      requireProof(!stopped && !errored && executionGuard());
      // Pinned pg 8.23.1 native TLSSocket. No certificate contents or auth messages are retained.
      const socket = client.connection?.stream;
      requireProof(socket?.encrypted === true && socket.authorized === true && socket.servername === EXPECTED.host);
      const tls = socket.getProtocol(); requireProof(tls === 'TLSv1.2' || tls === 'TLSv1.3');
      const begin = await client.query(BEGIN_SQL);
      requireProof(!stopped && !errored && begin.command === 'BEGIN'); transaction = true;
      requireProof(executionGuard());
      const result = await client.query(SELECT_ONLY_SQL), row = result.rows?.[0];
      requireProof(!stopped && !errored && result.command === 'SELECT' && result.rowCount === 1 && row &&
        Object.keys(row).length === CHECKS.length + 1 && CHECKS.every(key => row[key] === true) &&
        typeof row.server_now_ms === 'string' && /^[0-9]{1,15}$/.test(row.server_now_ms));
      const received = sourceClock.now(), elapsed = sourceClock.monotonic() - mono, server = Number(row.server_now_ms);
      requireProof(validTime(received) && validTime(server) && received >= started && elapsed >= 0 && elapsed <= 5000 &&
        Math.abs(received - started - elapsed) <= 1000 && server >= started - 1000 && server <= received + 1000);
      rollbackAttempted = true;
      requireProof((await client.query('ROLLBACK')).command === 'ROLLBACK' && !stopped); transaction = false;
      requireProof(!errored);
      return Object.freeze({version: 'scout-neon-smoke/1', ok: true, checks: CHECKS.length,
        tls, rollback: 'acknowledged', authenticationMechanism: 'not_observed',
        requestStartedAt: new Date(started).toISOString(), metadataReceivedAt: new Date(received).toISOString(),
        serverObservedAt: new Date(server).toISOString()});
    })(), 5000, () => {stopped = true;});
  } catch {
    // One cleanup rollback only for an acknowledged transaction; no retry after an uncertain rollback.
    // Ending the connection also aborts any unacknowledged/in-flight transaction.
    if (transaction && !rollbackAttempted && !errored && !stopped) {
      try {await bounded(client.query('ROLLBACK'), 1000);} catch { /* close below */ }
    }
    throw failure();
  } finally {
    if (client) {
      try {await bounded(client.end(), 1000);} catch {throw failure();}
      client.removeListener('error', onError);
    }
  }
  requireProof(!errored);
  return report; // Only allowlisted, validated evidence after rollback AND connection close.
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('SCOUT Neon read-only probe: separate approved Vercel production execution required. No HTTP route.');
    return 0;
  }
  try {
    validateIntent(argv, env);
    const {Client} = await import('pg');
    const result = await runReadOnlySmoke({argv, env, openClient: cfg => new Client(cfg)});
    console.log(JSON.stringify(result));
    return 0;
  } catch {
    console.error('FAIL: SCOUT read-only probe could not establish all proofs; details suppressed.');
    return 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
