import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { GET }=await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'app/api/status/route.js')).href);
const bundledAudit=JSON.parse(await fs.readFile(new URL('../data/collector-audit.json',import.meta.url),'utf8'));
test('status exposes missing diagnostics honestly, recovers history, and never implies workflow success from source success',async()=>{
 const original=globalThis.fetch,originalNow=Date.now;let clock=Date.now(),fail=true;
 Date.now=()=>clock;
 globalThis.fetch=async url=>{
  if(fail)throw Error('private provider failure');
  if(url.includes('/reward-snapshots.json'))return new Response(await fs.readFile(new URL('../data/reward-snapshots.json',import.meta.url),'utf8'));
  return new Response('missing',{status:404});
 };
 try{
  let response=await GET();assert.equal(response.status,503);let report=await response.json();assert.equal(report.rows.length,7);assert.equal(report.collector.attemptState,'missing');
  assert.equal(report.collector.auditOrigin,'dated_investigation');assert.ok(!JSON.stringify(report).includes('private provider'));
  clock+=60000;fail=false;response=await GET();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');report=await response.json();
  assert.equal(report.rows.length,7);assert.equal(report.collector.attempt,null);
  assert.deepEqual(report.collector.audit.runs.map(run=>run.id),bundledAudit.runs.map(run=>run.id));
  assert.equal(report.collector.audit.checkedAt,bundledAudit.checkedAt);
  assert.equal(report.collector.audit.scheduledRunCount,bundledAudit.scheduledRunCount);assert.match(report.dataset.revision,/^sha256:[a-f0-9]{64}$/);
 }finally{globalThis.fetch=original;Date.now=originalNow;}
});
