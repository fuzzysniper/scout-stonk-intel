import 'server-only';
import type { Pool, PoolClient } from 'pg';
import type { TLSSocket } from 'node:tls';
export const unavailable = () => new Error('v4_owner_ledger_unavailable');
/** No credential/error/SQL logging. Verify the actual native socket, not an ssl flag. */
export function checkedClient(client: PoolClient, host: string): PoolClient {
  const s = (client as unknown as { connection?: { stream?: TLSSocket & { servername?: string } } }).connection?.stream;
  if (!s?.encrypted || !s.authorized || s.servername !== host || !['TLSv1.2', 'TLSv1.3'].includes(s.getProtocol() ?? '')) {
    client.release(true); throw unavailable();
  }
  return client;
}
/** Better Auth/Kysely uses Promise-based Pool.connect. No alternate/memory adapter. */
export function verifiedPool(pool: Pool, host: string): Pool {
  if (pool.options.database !== 'unfarmd_v4_pilot' || !host || !/^[a-z0-9.-]{1,253}$/.test(host)) throw unavailable();
  for (const [key, max] of Object.entries({max:4,connectionTimeoutMillis:1000,query_timeout:1200,statement_timeout:800})) {
    const value = (pool.options as unknown as Record<string,unknown>)[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) throw unavailable();
  }
  return new Proxy(pool, { get(target, key) {
    if (key === 'connect') return async () => {
      if (target.waitingCount >= 4) throw unavailable();
      const c = checkedClient(await target.connect(), host);
      try { await c.query('SET search_path=pg_catalog,public,pg_temp'); return c; } catch { c.release(true); throw unavailable(); }
    };
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  } });
}
