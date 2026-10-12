import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NextRequest } from 'next/server.js';
const { GET } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, 'app/api/history/route.js')).href);
const mint = '8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS';
const request = query => new NextRequest('http://localhost/api/history' + query);

test('history API rejects invalid, absent, repeated and traversal mint parameters', async () => {
 for (const query of ['', '?mint=invalid', '?mint=../data', '?mint=' + mint + '&mint=' + mint]) {
  const response = await GET(request(query));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid Solana mint address' });
 }
});
test('history API serves only recorded points and returns no-history for an unrecorded mint', async () => {
 const response = await GET(request('?mint=' + mint));
 assert.equal(response.status, 200);
 assert.equal(response.headers.get('cache-control'), 'no-store');
 const r = await response.json();
 const store = JSON.parse(await fs.readFile(new URL('../data/reward-snapshots.json', import.meta.url), 'utf8'));
 assert.equal(r.observationCount, store[mint].length);
 assert.equal(r.latestLifetimeTotal, store[mint].at(-1).distributedTokens);
 for (const window of Object.values(r.windows)) {
  if (window.status !== 'available') assert.equal(window.distributedTokens, null);
 }
 const empty = await GET(request('?mint=So11111111111111111111111111111111111111112'));
 assert.equal(empty.status, 200);
 assert.equal((await empty.json()).status, 'no_history');
});
test('missing or malformed store returns sanitized 503, never a path or parser exception', async () => {
 const original = process.cwd();
 const root = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-history-api-test-'));
 try {
  process.chdir(root);
  await fs.mkdir('data');
  for (const contents of [null, '{bad JSON', '[]']) {
   if (contents !== null) await fs.writeFile('data/reward-snapshots.json', contents);
   const response = await GET(request('?mint=' + mint));
   assert.equal(response.status, 503);
   const data = await response.json();
   assert.equal(data.error, 'Recorded reward history is unavailable');
   assert.equal(data.status, 'unavailable');
   assert.deepEqual(Object.keys(data).sort(), ['error', 'fetchedAt', 'status']);
  }
 } finally { process.chdir(original); await fs.rm(root, { recursive: true, force: true }); }
});
