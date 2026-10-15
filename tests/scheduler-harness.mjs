// Test/benchmark harness only. Temporary HTTP facade is NOT a deployment entrypoint.
import { Miniflare, Response } from 'miniflare';
import { generateKeyPairSync, verify } from 'node:crypto';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

export const AT = Date.parse('2099-10-13T18:17:00Z');
export const TARGET = 'fuzzysniper/scout-stonk-intel|reward-snapshots.yml|main';
const mockKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
// Ephemeral mock signing material, generated only in memory; never a real GitHub App key.
const privatePem = mockKey.privateKey.export({ type: 'pkcs8', format: 'pem' });
export async function harness(options = {}) {
  const directory = options.directory || await mkdtemp(join(tmpdir(), 'scout-scheduler-'));
  const source = await readFile(join(process.env.SCHEDULER_TEST_BUILD, 'worker.js'), 'utf8');
  await writeFile(join(directory, 'worker.mjs'), source);
  await writeFile(join(directory, 'harness.mjs'), `
import worker, {SlotCoordinator, appJwt, inspectAppReadiness} from './worker.mjs';
export class TestCoordinator extends SlotCoordinator {
  clock() { return this.testTime ?? ${AT}; }
  async fetch(request) {
    this.testTime = Number(request.headers.get('x-test-time') || ${AT});
    if (new URL(request.url).pathname === '/test-storage') {
      const body = await request.json();
      if (body.drop) this.storage.sql.exec('DROP TABLE slots');
      if (body.seed) this.storage.sql.exec('INSERT INTO slots VALUES(?,?,?,?,?,?,?,?,?)',
        body.seed.slot, body.seed.scheduled, body.seed.state, 'synthetic-private-nonce', body.seed.attempt || 1,
        body.seed.claimed, body.seed.updated, body.seed.retry || null, null);
      if (body.alarm) await this.alarm();
      return Response.json({rows: [...this.storage.sql.exec('SELECT COUNT(*) AS n FROM slots')][0].n});
    }
    return super.fetch(request);
  }
}
export default { async fetch(request, env) {
  if (new URL(request.url).pathname === '/auth-readiness') {
    try { return Response.json(await inspectAppReadiness(env, ${AT})); }
    catch { return Response.json({error:'auth_readiness_unavailable'},{status:503}); }
  }
  if (new URL(request.url).pathname === '/jwt') {
    return new Response(await appJwt(env.APP_PRIVATE_KEY, Number(env.APP_ID), ${AT}));
  }
  if (new URL(request.url).pathname === '/scheduled') {
    await worker.scheduled(await request.json(), env);
    return new Response('scheduled');
  }
  const stub = env.SLOTS.get(env.SLOTS.idFromName(new URL(request.url).searchParams.get('coordinator') || '${TARGET}'));
  return stub.fetch(request);
}};
`);
  const calls = [];
  let dispatchCount = 0;
  const fetchHandler = async request => {
    const url = new URL(request.url);
    assert.equal(url.origin, 'https://api.github.com');
    assert.equal(request.headers.get('x-github-api-version'), '2026-03-10');
    const path = url.pathname;
    const body = request.method === 'POST' ? await request.json() : undefined;
    calls.push({ path, method: request.method, body }); // Never capture authorization/secrets.
    if (path.endsWith('/dispatches')) {
      dispatchCount++;
      assert.equal(body.ref, 'main'); assert.equal(body.return_run_details, true);
      assert.equal(body.inputs.trigger_source, 'external');
      assert.match(body.inputs.collection_slot, /^fuzzysniper\/scout-stonk-intel\|reward-snapshots.yml\|main\|\d{4}-\d{2}-\d{2}T\d{2}:17:00Z$/);
      if (options.dispatch) return options.dispatch(dispatchCount, request, body);
      return Response.json({ workflow_run_id: 123456789 }, { status: 200 });
    }
    if (path === '/app/installations/22') {
      const jwt = request.headers.get('authorization').replace('Bearer ', '');
      const [header, payload, signature] = jwt.split('.');
      assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + payload), mockKey.publicKey, Buffer.from(signature, 'base64url')), true);
      const claims = JSON.parse(Buffer.from(payload, 'base64url'));
      assert.equal(claims.iss, '11');
      assert.ok(claims.exp - claims.iat <= 600);
      return Response.json(options.installation || { id: 22, app_id: 11, repository_selection: 'selected', suspended_at: null,
        account: { login: 'fuzzysniper' }, permissions: { actions: 'write', metadata: 'read' } });
    }
    if (path === '/app/installations/22/access_tokens') {
      assert.deepEqual(body, { repository_ids: [33], permissions: { actions: 'write' } });
      return Response.json(options.token || { token: 'synthetic-opaque-token-variable-length',
        expires_at: new Date(AT + 3600_000).toISOString(), permissions: { actions: 'write', metadata: 'read' } }, { status: 201 });
    }
    if (path === '/repos/fuzzysniper/scout-stonk-intel/actions/workflows/reward-snapshots.yml') {
      return options.workflowResponse || Response.json({id:44,path:'.github/workflows/reward-snapshots.yml',state:'active'});
    }
    if (path === '/installation/token' && request.method === 'DELETE') return options.revokeResponse || new Response(null,{status:204});
    if (path === '/installation/repositories') {
      assert.equal(url.search, '?per_page=2');
      return Response.json(options.repositories || { total_count: 1, repositories: [{ id: 33, full_name: 'fuzzysniper/scout-stonk-intel' }] });
    }
    throw new Error('unexpected_mock_route');
  };
  const mf = new Miniflare({ modules: true, modulesRoot: directory, scriptPath: join(directory, 'harness.mjs'),
    compatibilityDate: '2025-07-18', durableObjects: { SLOTS: { className: 'TestCoordinator', useSQLite: true } },
    durableObjectsPersist: join(directory, 'state'),
    bindings: { ACTIVATION: options.activation ?? 'human-approved', APP_ID: '11', INSTALLATION_ID: '22', REPOSITORY_ID: '33', APP_PRIVATE_KEY: privatePem, ...options.bindings },
    outboundService: fetchHandler,
  });
  async function send(operation, now = AT, scheduledTime = AT) {
    const response = await mf.dispatchFetch('https://test.invalid/', { method: 'POST', headers: { 'x-test-time': String(now) }, body: JSON.stringify({ operation, scheduledTime }) });
    return { status: response.status, body: await response.json() };
  }
  return { mf, directory, calls, send, dispatchCount: () => dispatchCount,
    async close(keep = false) { await mf.dispose(); if (!keep) await rm(directory, { recursive: true, force: true }); } };
}
