// REAL temporary local PostgreSQL; no hosted connection, provider or real credentials.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {localPostgres} from './postgres-harness.mjs';

test('fixture DDL has bounded owner-only headroom; runtime statements still cancel', async () => {
  const db = await localPostgres();
  try {
    // Would fail with the old shared 800ms setup timeout. No wall-clock-speed assertion.
    await db.owner.query('SELECT pg_sleep(1.05)');
    assert.equal(db.owner.options.connectionTimeoutMillis, 800);
    assert.equal(db.owner.options.query_timeout, 6000);
    assert.equal((await db.owner.query('SHOW statement_timeout')).rows[0].statement_timeout, '5s');
    await db.reset();
    assert.equal((await db.owner.query('SHOW statement_timeout')).rows[0].statement_timeout, '5s');

    const runtime = db.pool();
    assert.equal(runtime.options.connectionTimeoutMillis, 800);
    assert.equal(runtime.options.query_timeout, 1200);
    assert.equal((await runtime.query('SHOW statement_timeout')).rows[0].statement_timeout, '800ms');
    await assert.rejects(runtime.query('SELECT pg_sleep(1.05)'), error => error.code === '57014');

    // Owner queries remain cancellable too; a fixture error is not swallowed/retried.
    await db.owner.query('BEGIN');
    try {
      await db.owner.query("SET LOCAL statement_timeout='30ms'");
      await assert.rejects(db.owner.query('SELECT pg_sleep(1)'), error => error.code === '57014');
    } finally {
      await db.owner.query('ROLLBACK');
    }
    assert.equal((await db.owner.query('SHOW statement_timeout')).rows[0].statement_timeout, '5s');
  } finally {
    await db.close();
  }
});
