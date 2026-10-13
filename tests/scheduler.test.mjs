import test from 'node:test';
import assert from 'node:assert/strict';
import { Response } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { harness, AT } from './scheduler-harness.mjs';

test('adapter has no public fetch entrypoint; disabled means zero GitHub calls', async () => {
  const source = await readFile(new URL('../scheduler/worker.ts', import.meta.url), 'utf8');
  assert.match(source, /const worker = \{\s+async scheduled/);
  const h = await harness({ activation: 'disabled' });
  try { assert.equal((await h.send('tick')).body.action, 'disabled'); assert.equal(h.calls.length, 0); }
  finally { await h.close(); }
});

test('real SQLite Durable Object concurrent claims: one dispatch, redacted durable receipt after restart', async () => {
  let h = await harness();
  const directory = h.directory;
  try {
    await Promise.all(Array.from({ length: 8 }, () => h.send('tick')));
    assert.equal(h.dispatchCount(), 1);
    const receipt = (await h.send('receipt')).body;
    assert.equal(receipt.state, 'accepted'); assert.equal(receipt.run_id, 123456789);
    assert.equal(receipt.attempt, 1); assert.match(receipt.claim_hash, /^[a-f0-9]{64}$/);
    assert.equal(receipt.attempts.length, 1); assert.equal(receipt.attempts[0].state, 'accepted');
    assert.equal('nonce' in receipt, false); assert.equal('token' in receipt, false);
    await h.close(true);
    h = await harness({ directory });
    assert.deepEqual((await h.send('receipt')).body, receipt);
    assert.equal((await h.send('tick')).body.action, 'accepted'); assert.equal(h.dispatchCount(), 0);
  } finally { await h.close(); }
});

test('legacy 204 and malformed 200 remain terminal acceptance, never retried', async () => {
  for (const response of [new Response(null, { status: 204 }), new Response('{broken', { status: 200 }), Response.json({ workflow_run_id: 'not-an-id' })]) {
    const h = await harness({ dispatch: () => response });
    try {
      assert.equal((await h.send('tick')).body.action, 'accepted');
      assert.equal((await h.send('receipt')).body.run_id, null);
      await h.send('tick', AT + 120_000); assert.equal(h.dispatchCount(), 1);
    } finally { await h.close(); }
  }
});

test('ambiguous 5xx/connection failure/redirect cannot authorize retry', async () => {
  for (const dispatch of [() => new Response('secret-provider-body', { status: 503 }),
    () => { throw new Error('synthetic-secret-do-not-export'); },
    () => new Response(null, { status: 302, headers: { Location: 'https://other.invalid/' } })]) {
    const h = await harness({ dispatch });
    try {
      assert.equal((await h.send('tick')).body.action, 'uncertain');
      await h.send('tick', AT + 120_000); assert.equal(h.dispatchCount(), 1);
      assert.doesNotMatch(JSON.stringify((await h.send('receipt')).body), /secret|token|nonce/);
    } finally { await h.close(); }
  }
});

test('explicit 429 permits only one bounded retry; concurrent retries single winner', async () => {
  const h = await harness({ dispatch: () => new Response(null, { status: 429, headers: { 'Retry-After': '300' } }) });
  try {
    assert.equal((await h.send('tick')).body.action, 'retry_wait');
    assert.equal((await h.send('tick', AT + 299_000)).body.action, 'retry_not_due');
    await Promise.all(Array.from({ length: 5 }, () => h.send('tick', AT + 300_000)));
    assert.equal(h.dispatchCount(), 2); assert.equal((await h.send('receipt')).body.attempt, 2);
    assert.deepEqual((await h.send('receipt')).body.attempts.map(row => row.state), ['retry_wait', 'denied']);
    await h.send('tick', AT + 600_000); assert.equal(h.dispatchCount(), 2);
  } finally { await h.close(); }
});

test('invalid retry delays and exhausted original window deny rather than loop', async () => {
  for (const delay of ['0', '301', 'tomorrow', '1.5']) {
    const h = await harness({ dispatch: () => new Response(null, { status: 429, headers: { 'Retry-After': delay } }) });
    try { assert.equal((await h.send('tick')).body.action, 'denied'); await h.send('tick'); assert.equal(h.dispatchCount(), 1); }
    finally { await h.close(); }
  }
  const h = await harness({ dispatch: () => new Response(null, { status: 429, headers: { 'Retry-After': '300' } }) });
  try { assert.equal((await h.send('tick', AT + 14 * 60_000)).body.action, 'denied'); }
  finally { await h.close(); }
});

test('future/late/malformed slots and unavailable storage fail before dispatch', async () => {
  const h = await harness();
  try {
    for (const [now, scheduled] of [[AT - 1, AT], [AT + 900001, AT], [AT, AT + 1]]) {
      await h.send('tick', now, scheduled);
    }
    assert.equal(h.calls.length, 0);
    assert.equal((await h.send('unknown')).status, 400);
    const response = await h.mf.dispatchFetch('https://test.invalid/', { method: 'POST', body: '{invalid' });
    assert.equal(response.status, 503);
  } finally { await h.close(); }
});

test('scope/configuration drift pauses durably without dispatch or secret leakage', async () => {
  const options = [
    { bindings: { APP_PRIVATE_KEY: 'synthetic-invalid-secret' } },
    { installation: { id: 22, app_id: 11, account: { login: 'fuzzysniper' }, repository_selection: 'all', suspended_at: null, permissions: { actions: 'write' } } },
    { token: { token: 'synthetic-secret', expires_at: new Date(AT + 3600_000).toISOString(), permissions: { actions: 'write', contents: 'write' } } },
    { repositories: { total_count: 2, repositories: [{ id: 33, full_name: 'fuzzysniper/scout-stonk-intel' }] } },
  ];
  for (const option of options) {
    let h = await harness(option);
    try {
      assert.equal((await h.send('tick')).body.action, 'denied'); assert.equal(h.dispatchCount(), 0);
      const directory = h.directory;
      await h.close(true); h = await harness({ directory });
      assert.equal((await h.send('tick', AT + 3600_000, AT + 3600_000)).body.action, 'circuit_paused');
      assert.equal(h.calls.length, 0);
    } finally { await h.close(); }
  }
});

test('401/403/404/422 stop circuit and never reinterpret rejection as a rate retry', async () => {
  for (const status of [401, 403, 404, 422]) {
    const h = await harness({ dispatch: () => new Response(null, { status, headers: { 'Retry-After': '1' } }) });
    try { assert.equal((await h.send('tick')).body.action, 'denied'); assert.equal((await h.send('tick')).body.action, 'circuit_paused'); assert.equal(h.dispatchCount(), 1); }
    finally { await h.close(); }
  }
});

test('scheduled handler routes through singleton; wrong cron never invokes credentials', async () => {
  const h = await harness();
  try {
    const send = cron => h.mf.dispatchFetch('https://test.invalid/scheduled', { method: 'POST', body: JSON.stringify({ scheduledTime: AT, cron }) });
    await send('* * * * *'); assert.equal(h.calls.length, 0);
    await send('17 * * * *'); assert.equal(h.dispatchCount(), 1);
    await send('17 * * * *'); assert.equal(h.dispatchCount(), 1);
  } finally { await h.close(); }
});

test('expired reservation remains uncertain after restart; delayed alarm cannot replay', async () => {
  let h = await harness();
  async function control(body, now = AT) {
    return h.mf.dispatchFetch('https://test.invalid/test-storage', { method: 'POST', headers: { 'x-test-time': String(now) }, body: JSON.stringify(body) });
  }
  try {
    await control({ seed: { slot: 'fuzzysniper/scout-stonk-intel|reward-snapshots.yml|main|2099-10-13T18:17:00Z', scheduled: AT, state: 'reserved', claimed: AT, updated: AT } });
    const directory = h.directory; await h.close(true); h = await harness({ directory });
    assert.equal((await h.send('tick', AT + 60_000)).body.action, 'uncertain');
    assert.equal(h.calls.length, 0);
  } finally { await h.close(); }
  h = await harness();
  try {
    await control({ seed: { slot: 'fuzzysniper/scout-stonk-intel|reward-snapshots.yml|main|2099-10-13T18:17:00Z', scheduled: AT, state: 'retry_wait', claimed: AT, updated: AT, retry: AT + 300_000 } });
    await control({ alarm: true }, AT + 901_000);
    assert.equal((await h.send('receipt', AT + 901_000)).body.state, 'denied'); assert.equal(h.calls.length, 0);
  } finally { await h.close(); }
});

test('SQLite capacity, retention, clock regression and lost table fail closed', async () => {
  const h = await harness();
  const control = async (body, now = AT) => h.mf.dispatchFetch('https://test.invalid/test-storage', { method: 'POST', headers: { 'x-test-time': String(now) }, body: JSON.stringify(body) });
  try {
    // Synthetic operational receipts only: no reward observations/data files.
    for (let i = 1; i <= 193; i++) {
      const at = AT - i * 3600_000;
      await control({ seed: { slot: `synthetic-retention-${i}`, scheduled: at, state: 'accepted', claimed: at, updated: at } });
    }
    assert.equal((await h.send('tick')).body.action, 'accepted'); // oldest >8d evicted before new claim
    assert.equal((await (await control({})).json()).rows, 193);
    assert.equal((await h.send('tick', AT - 1)).body.action, 'outside_window');
    await control({ drop: true });
    assert.equal((await h.send('tick')).status, 503);
    assert.equal(h.dispatchCount(), 1);
  } finally { await h.close(); }
  const full = await harness();
  try {
    for (let i = 0; i < 193; i++) await full.mf.dispatchFetch('https://test.invalid/test-storage', { method: 'POST', body: JSON.stringify({ seed: { slot: `synthetic-capacity-${i}`, scheduled: AT, state: 'accepted', claimed: AT, updated: AT } }) });
    assert.equal((await full.send('tick')).body.action, 'capacity_exhausted'); assert.equal(full.calls.length, 0);
  } finally { await full.close(); }
  const regression = await harness();
  try {
    await regression.mf.dispatchFetch('https://test.invalid/test-storage', { method: 'POST', body: JSON.stringify({ seed: {
      slot: 'fuzzysniper/scout-stonk-intel|reward-snapshots.yml|main|2099-10-13T18:17:00Z', scheduled: AT, state: 'reserved', claimed: AT, updated: AT + 1000,
    } }) });
    assert.equal((await regression.send('tick')).body.action, 'clock_regression'); assert.equal(regression.calls.length, 0);
  } finally { await regression.close(); }
});

test('durable alarm after restart retries once; alarm redelivery never repeats accepted dispatch', async () => {
  let h = await harness({ dispatch: () => new Response(null, { status: 429, headers: { 'Retry-After': '300' } }) });
  try {
    await h.send('tick'); const directory = h.directory; await h.close(true);
    h = await harness({ directory });
    const alarm = () => h.mf.dispatchFetch('https://test.invalid/test-storage', { method: 'POST', headers: { 'x-test-time': String(AT + 300_000) }, body: JSON.stringify({ alarm: true }) });
    await alarm(); await alarm();
    assert.equal(h.dispatchCount(), 1);
    const receipt = (await h.send('receipt', AT + 300_000)).body;
    assert.equal(receipt.state, 'accepted'); assert.equal(receipt.attempt, 2);
    assert.deepEqual(receipt.attempts.map(row => row.reason), ['dispatch_rate_rejected', 'accepted_with_run_id']);
  } finally { await h.close(); }
});

test('scope expiry/oversized body cannot reach dispatch', async () => {
  for (const token of [
    { token: 'synthetic-token', expires_at: new Date(AT - 1).toISOString(), permissions: { actions: 'write' } },
    { token: 'x'.repeat(40000), expires_at: new Date(AT + 3600_000).toISOString(), permissions: { actions: 'write' } },
  ]) {
    const h = await harness({ token });
    try { assert.equal((await h.send('tick')).body.action, 'denied'); assert.equal(h.dispatchCount(), 0); }
    finally { await h.close(); }
  }
});
