// REAL temporary local PostgreSQL, SYNTHETIC data/passwords only. Never uses a hosted URL or PG* env.
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const { Pool } = createRequire(import.meta.url)("pg");
const PASSWORD = "SYNTHETIC_LOCAL_TEST_PASSWORD_111";

export async function localPostgres({tls,database='postgres',runtimeRole='scout_test_runtime'} = {}) {
  if (process.env.NODE_ENV !== "test") throw new Error("local PostgreSQL harness requires NODE_ENV=test");
  if(!['postgres','neondb'].includes(database) || !['scout_test_runtime','scout_mint_app'].includes(runtimeRole))throw Error('invalid_synthetic_fixture_identity');
  const candidates = [process.env.SCOUT_TEST_PG_BIN, ...[18,17,16,15].map(v => `/usr/lib/postgresql/${v}/bin`)];
  const bin = candidates.find(p => p && existsSync(join(p, "initdb")) && existsSync(join(p, "pg_ctl")));
  if (!bin) throw new Error("PostgreSQL 15+ binaries required (no silent skip). Install PostgreSQL or set SCOUT_TEST_PG_BIN; see lib/onchain-mint/server/PRODUCTION.md.");
  const dir = mkdtempSync(join(tmpdir(), "scout-pg-")), data = join(dir, "data"), port = tls?.port ?? 55431;
  const env = { PATH: "/usr/bin:/bin", LANG: "C", LD_LIBRARY_PATH: resolve(bin, "../../../x86_64-linux-gnu") };
  const run = (name, args) => {
    const r = spawnSync(join(bin, name), args, { env, encoding: "utf8", timeout: 20000 });
    if (r.status !== 0) throw new Error(`Local test ${name} failed: ${r.error?.message ?? r.stderr ?? r.stdout}`);
  };
  const share = process.env.SCOUT_TEST_PG_SHARE ?? resolve(bin, "../../../../share/postgresql", bin.split("/").at(-2));
  let running = false; const pools = new Set(); let owner;
  const start = () => {
    const ssl=tls?` -c ssl=on -c ssl_cert_file=${tls.cert} -c ssl_key_file=${tls.key}`:'';
    run("pg_ctl", ["-D", data, "-l", join(dir, "server.log"), "-o", `-k ${dir} -h ${tls?'127.0.0.1':"''"} -p ${port} -c shared_buffers=16MB -c max_connections=20 -c fsync=on -c synchronous_commit=on${ssl}`, "-w", "start"]);
    running = true;
  };
  const pool = (user = runtimeRole, password = PASSWORD, dbname = database) => {
    const p = new Pool({ host: dir, port, user, password, database: dbname, max: 1,
      connectionTimeoutMillis: 800, query_timeout: 1200, statement_timeout: 800, allowExitOnIdle: true });
    p.on("error", () => {}); pools.add(p); return p;
  };
  const closePools = async () => { await Promise.all([...pools].map(p => p.end())); pools.clear(); };
  const stop = () => { if (running) { run("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"]); running = false; } };
  const close = async () => { try { await closePools(); stop(); } finally { if (!running) rmSync(dir, { recursive: true, force: true }); } };
  try {
    run("initdb", ["-D", data, ...(existsSync(share) ? ["-L", share] : []), "-U", "scout_test_owner", "--auth=trust", "--no-locale", "-E", "UTF8"]);
    writeFileSync(join(data, "pg_hba.conf"), "local all scout_test_owner trust\nlocal all all scram-sha-256\n"+(tls?'hostssl all all 127.0.0.1/32 scram-sha-256\n':'')+"host all all 0.0.0.0/0 reject\nhost all all ::/0 reject\n");
    start();
    if(database!=='postgres') {
      const setup=pool('scout_test_owner',PASSWORD,'postgres');
      await setup.query('CREATE DATABASE neondb');await setup.end();pools.delete(setup);
    }
    owner = pool("scout_test_owner");
    await owner.query(readFileSync("lib/onchain-mint/server/postgres/schema.sql", "utf8"));
    await owner.query(`CREATE ROLE ${runtimeRole} LOGIN PASSWORD '${PASSWORD}'; GRANT scout_mint_runtime TO ${runtimeRole}`);
    const reset = async () => {
      // Test-owner fixture isolation ONLY. The production adapter cannot run this SQL.
      await closePools(); owner = pool("scout_test_owner");
      await owner.query("TRUNCATE scout_mint.policy CASCADE");
      await owner.query(readFileSync("lib/onchain-mint/server/postgres/bootstrap.sql", "utf8"));
    };
    await reset();
    return { pool, get owner() { return owner; }, reset, close,
      async crashRestart() { await closePools(); stop(); start(); owner = pool("scout_test_owner"); },
      async outage() { await closePools(); stop(); },
      async restore() { start(); owner = pool("scout_test_owner"); },
      log: () => readFileSync(join(dir, "server.log"), "utf8"),
    };
  } catch (error) { await close(); throw error; }
}
