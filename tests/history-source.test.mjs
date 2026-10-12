import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const { createHistorySource, CACHE_MS, RETRY_MS, FALLBACK_MS, MAX_BYTES, SNAPSHOT_URL } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, 'lib/history-source.js')).href);
const { summarizeHistory } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, 'lib/history.js')).href);
const mint = '8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS';
// Artificial source fixtures; never written to checked-in snapshots or used in screenshots.
const time = Date.parse('2026-10-12T16:00:00Z');
const row = (observedAt, distributedTokens = 1) => ({ observedAt: new Date(observedAt).toISOString(), distributedTokens, quoteSymbol: 'TEST', source: `https://www.stonkfun.xyz/api/public/v1/tokens/${mint}/rewards` });
const response = store => new Response(JSON.stringify(store));

test('same deployed reader discovers new snapshots after bounded cache expires', async () => {
 let now = time, calls = 0;
 const old = { [mint]: [row(time)] }, newer = { [mint]: [row(time), row(time + CACHE_MS, 2)] };
 const read = createHistorySource(async (url, options) => {
  assert.ok(url.startsWith(SNAPSHOT_URL + '?scout_refresh='));
  assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
  assert.equal(options.headers['cache-control'], 'no-cache, no-store');
  return response(++calls === 1 ? old : newer);
 }, () => now);
 const initial = await read();
 assert.equal(initial.dataset.revision, 'sha256:' + createHash('sha256').update(JSON.stringify(old)).digest('hex'));
 now += CACHE_MS - 1;
 assert.equal((await read()).dataset.sourceStatus, 'cached'); assert.equal(calls, 1);
 now++;
 const next = await read();
 assert.equal(calls, 2); assert.equal(next.store[mint].length, 2);
 assert.notEqual(next.dataset.revision, initial.dataset.revision);
 assert.equal(next.dataset.dataFetchedAt, new Date(now).toISOString());
 assert.equal(summarizeHistory(next.store, mint, new Date(now)).latestObservedAt, row(now).observedAt);
});
test('fresh retrieval of stale observations never makes complete windows fresh', async () => {
 const rows = Array.from({length:25}, (_, i) => row(time - (28-i)*3600000, i));
 const result = await createHistorySource(async () => response({[mint]:rows}), () => time)();
 assert.equal(result.dataset.sourceStatus, 'available');
 const report = summarizeHistory(result.store, mint, new Date(time));
 assert.equal(report.freshness.status, 'stale');
 assert.equal(report.windows['24h'].status, 'stale_data');
 assert.equal(report.windows['24h'].distributedTokens, null);
});
test('outages retain original retrieval time briefly, back off, expire, and recover', async () => {
 let now = time, fail = false, calls = 0;
 const read = createHistorySource(async () => { calls++; if (fail) throw Error('private details'); return response({[mint]:[row(now)]}); }, () => now);
 const original = await read(); fail = true; now += CACHE_MS;
 const fallback = await read();
 assert.equal(fallback.dataset.sourceStatus, 'degraded');
 assert.equal(fallback.dataset.dataFetchedAt, original.dataset.dataFetchedAt);
 assert.equal(fallback.dataset.revision, original.dataset.revision);
 await read(); assert.equal(calls, 2);
 now = time + FALLBACK_MS + 1;
 const expired = await read(); assert.equal(expired.store, null); assert.equal(expired.dataset.sourceStatus, 'unavailable');
 now += RETRY_MS; fail = false;
 assert.equal((await read()).dataset.sourceStatus, 'available');
});
test('cold outage never falls back to the deployment checkout', async () => {
 const result = await createHistorySource(async () => { throw Error('secret path'); }, () => time)();
 assert.equal(result.store, null); assert.equal(result.dataset.revision, null);
 assert.equal(result.dataset.dataFetchedAt, null);
});
test('invalid responses, missing files, redirects and oversized bodies fail closed', async () => {
 const factories = [
  () => new Response('missing', {status:404}), () => new Response('limited', {status:429}),
  () => new Response('', {status:302}), () => new Response('{broken'),
  () => response(null), () => response([]), () => response({[mint]:null}),
  () => response({'../path':[]}), () => new Response('{}', {headers:{age:'301'}}),
  () => new Response('{}', {headers:{age:'bad'}}),
  () => new Response('{}', {headers:{'source-age':'301'}}),
  () => new Response('{}', {headers:{'content-length':String(MAX_BYTES+1)}}),
  () => new Response(' '.repeat(MAX_BYTES+1)),
 ];
 for (const make of factories) {
  const result = await createHistorySource(async () => make(), () => time)();
  assert.equal(result.dataset.sourceStatus, 'unavailable'); assert.equal(result.store, null);
 }
});
test('empty/missing mints and invalid observations preserve calculator safeguards', async () => {
 for (const store of [{}, {[mint]:[]}, {[mint]:[null, row(time, 'not a number')]}]) {
  const result = await createHistorySource(async () => response(store), () => time)();
  const report = summarizeHistory(result.store, mint, new Date(time));
  assert.equal(report.latestLifetimeTotal, null);
  for (const window of Object.values(report.windows)) assert.equal(window.distributedTokens, null);
 }
});
test('concurrent requests share one refresh and distinct refreshes use distinct CDN keys', async () => {
 let release; let calls=0, now=time; const urls=[];
 const read = createHistorySource(async url => {calls++;urls.push(url); await new Promise(r=>{release=r;});return response({});},()=>now);
 const first=read(), second=read(); assert.equal(calls,1); release(); await Promise.all([first,second]);
 now+=CACHE_MS; const third=read();release();await third;
 assert.equal(calls,2);assert.notEqual(urls[0],urls[1]);
});
test('aborted body read does not replace the last successful dataset', async () => {
 let now=time, fail=false;
 const read=createHistorySource(async()=>fail ? new Response(new ReadableStream({start(c){c.error(Error('aborted'));}})) : response({}),()=>now);
 const initial=await read();now+=CACHE_MS;fail=true;
 const result=await read();assert.equal(result.dataset.sourceStatus,'degraded');assert.equal(result.dataset.revision,initial.dataset.revision);
});

test('network deadline aborts an unresponsive fetch and returns sanitized unavailability', async () => {
 const read=createHistorySource(async (_url,options)=>new Promise((_resolve,reject)=>{
  options.signal.addEventListener('abort',()=>reject(Error('private timeout details')),{once:true});
 }),()=>time);
 const result=await read();
 assert.equal(result.dataset.sourceStatus,'unavailable');assert.equal(result.store,null);
 assert.ok(!JSON.stringify(result).includes('private'));
});
