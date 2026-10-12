import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NextRequest } from 'next/server.js';
const { GET } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, 'app/api/history/route.js')).href);
const mint = '8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS';
const request = query => new NextRequest('http://localhost/api/history' + query);

test('history API rejects invalid parameters before accessing the source', async () => {
 const original = globalThis.fetch;
 globalThis.fetch = async () => { throw Error('must not fetch'); };
 try {
  for (const query of ['', '?mint=invalid', '?mint=../data', '?mint='+mint+'&mint='+mint]) {
   const response=await GET(request(query));assert.equal(response.status,400);
   assert.deepEqual(await response.json(),{error:'Invalid Solana mint address'});
  }
 } finally {globalThis.fetch=original;}
});
test('cold failure, real records, missing mint and degraded cache have safe API semantics', async () => {
 const original=globalThis.fetch, originalNow=Date.now;
 let clock=originalNow(), fail=true;
 globalThis.fetch=async()=>{if(fail)throw Error('secret/path/token');return new Response(await fs.readFile(new URL('../data/reward-snapshots.json',import.meta.url),'utf8'));};
 Date.now=()=>clock;
 try {
  let response=await GET(request('?mint='+mint));
  assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
  let report=await response.json();assert.equal(report.dataset.sourceStatus,'unavailable');
  assert.equal(report.latestObservedAt,null);assert.equal(report.dataFetchedAt,null);
  assert.ok(!JSON.stringify(report).includes('secret'));
  clock+=60000;fail=false;
  response=await GET(request('?mint='+mint));assert.equal(response.status,200);
  report=await response.json();assert.equal(report.dataset.kind,'github_snapshot');
  assert.match(report.dataset.revision,/^sha256:[a-f0-9]{64}$/);
  const stored=JSON.parse(await fs.readFile(new URL('../data/reward-snapshots.json',import.meta.url),'utf8'));
  assert.equal(report.latestLifetimeTotal,stored[mint].at(-1).distributedTokens);
  assert.equal(report.latestObservedAt,report.endAt);assert.equal(report.dataFetchedAt,report.dataset.dataFetchedAt);
  const fetchedAt=report.dataFetchedAt;
  const empty=await GET(request('?mint=So11111111111111111111111111111111111111112'));
  assert.equal((await empty.json()).status,'no_history');
  clock+=300000;fail=true;
  report=await (await GET(request('?mint='+mint))).json();
  assert.equal(report.dataset.sourceStatus,'degraded');assert.equal(report.dataFetchedAt,fetchedAt);
  for(const window of Object.values(report.windows)){assert.equal(window.status,'source_unavailable');assert.equal(window.distributedTokens,null);}
 } finally {globalThis.fetch=original;Date.now=originalNow;}
});
