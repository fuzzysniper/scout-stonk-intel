import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { GlobalLedgerPort, LedgerCommand, LedgerReply } from '../v4-helius-pilot/server/contract';
import { prepareProfile } from '../v4-helius-pilot/server/profile';
import { verifiedPool, unavailable } from './postgres';
import { snapshotCommand, validateReply } from './commands';
import { PROOF_SQL, STEP_SHA } from './sql-proof';
/** Real PG/TLS adapter. No environment/DSN read, SQL provisioning, reset, retry or memory fallback. */
export function createPostgresPilotLedger(pool: Pool, host: string, profileInput: unknown): GlobalLedgerPort {
  const prepared = prepareProfile(profileInput); if (!prepared) throw unavailable();
  const { hash, profile } = prepared, db = verifiedPool(pool, host), fence = randomUUID();
  // Deliberately process-local FAIL-CLOSED latch; all counters/STOP/fence are durable in PG.
  let terminal = false, stopAttempt: Promise<unknown> | undefined;
  const transaction = async (command: LedgerCommand): Promise<LedgerReply> => {
    if (pool.waitingCount > 4) throw unavailable();
    const c = await db.connect(); let committed = false;
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL synchronous_commit=on; SET LOCAL statement_timeout='500ms'; SET LOCAL lock_timeout='100ms'; SET LOCAL search_path=pg_catalog");
      const proof = await c.query(PROOF_SQL,[STEP_SHA]);
      if (proof.rowCount !== 1 || proof.rows[0]?.durable !== true) throw unavailable();
      const json = JSON.stringify(command); if (Buffer.byteLength(json)>8192) throw unavailable();
      const r = await c.query<{reply: LedgerReply}>('SELECT unfarmd_v4_pilot.step($1::jsonb,$2::uuid,$3::text) AS reply',[json,fence,hash]);
      if (r.rowCount !== 1 || !r.rows[0]?.reply) throw unavailable();
      validateReply(r.rows[0].reply,command);
      await c.query('COMMIT'); committed = true;
      return r.rows[0].reply;
    } finally { c.release(!committed); }
  };
  return Object.freeze({ scope: 'global_atomic_durable' as const, async transact(command: LedgerCommand): Promise<LedgerReply> {
    let isStop = false;
    try {
      // Snapshot plain JSON before await; no mutable request object crosses the DB boundary.
      const stable = snapshotCommand(command); isStop = stable.kind === 'stop';
      if (terminal && !isStop) return { kind:'denied',reason:'stopped' };
      const reply = await transaction(stable);
      if (terminal && !isStop) throw unavailable();
      if (reply.kind==='stopped' || reply.kind==='denied' && ['stopped','invalid_clock'].includes(reply.reason)) terminal=true;
      return reply;
    } catch {
      terminal = true;
      // One best-effort terminal write. Unknown ACK is NEVER retried as the original operation.
      if (!isStop) {
        stopAttempt ??= transaction({kind:'stop',policyHash:hash,ownerSubject:profile.ownerSubject,reason:'uncertain',now:0}).catch(() => undefined);
        await stopAttempt; // One attempt total, even with multiple simultaneous failures. Never an ACK claim.
      }
      throw unavailable();
    }
  } });
}
