import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const { summarizeHistory } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, 'lib/history.js')).href);
const { isSolanaMint } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, 'lib/solana.js')).href);
const mint = '8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS';
const source = `https://www.stonkfun.xyz/api/public/v1/tokens/${mint}/rewards`;
const end = Date.parse('2026-10-12T16:00:00Z');
const now = new Date(end);
// Explicitly artificial unit-test counters. Never inserted in the historical store or UI.
const point = (hours, total, extra = {}) => ({ observedAt: new Date(end + hours * 3600000).toISOString(), distributedTokens: total, quoteSymbol: 'TEST', source, ...extra });
const report = rows => summarizeHistory({ [mint]: rows }, mint, now);
const hours = n => Array.from({ length: n + 1 }, (_, i) => point(i - n, i));

test('strict mint validation rejects non-base58, wrong byte length and traversal', () => {
 assert.equal(isSolanaMint(mint), true);
 for (const invalid of ['', '../data', '0'.repeat(44), '1'.repeat(31), '1'.repeat(33)]) assert.equal(isSolanaMint(invalid), false);
});
test('two real recorded points produce a nonnegative delta with their actual interval', () => {
 const r = report([point(0, 17), point(-1, 10)]);
 assert.equal(r.observationCount, 2);
 assert.equal(r.latestLifetimeTotal, 17);
 assert.equal(r.changes[0].distributedTokens, 7);
 assert.equal(r.changes[0].observedSeconds, 3600);
 assert.equal(r.windows['24h'].status, 'insufficient_history');
});
test('missing history never produces zero totals or invented observations', () => {
 const r = summarizeHistory({}, mint, now);
 assert.equal(r.status, 'no_history');
 assert.equal(r.latestLifetimeTotal, null);
 assert.equal(r.windows['7d'].distributedTokens, null);
 assert.equal(r.observationCount, 0);
 assert.equal(report([point(0, null)]).latestLifetimeTotal, null);
});
test('identical duplicates collapse; conflicting duplicates prevent comparison', () => {
 const r = report([point(-1, 10), point(-1, 10), point(0, 12)]);
 assert.equal(r.observationCount, 2);
 assert.ok(r.issues.includes('duplicate_timestamp'));
 assert.equal(r.changes[0].distributedTokens, 2);
 const conflict = report([point(-1, 10), point(-1, 11), point(0, 12)]);
 assert.ok(conflict.issues.includes('conflicting_duplicate'));
 assert.equal(conflict.changes[0].distributedTokens, null);
});
test('counter resets are not clamped to zero or bridged by window endpoints', () => {
 const rows = hours(24); rows[10].distributedTokens = 0;
 const r = report(rows);
 assert.ok(r.issues.includes('counter_decrease'));
 assert.equal(r.windows['24h'].status, 'invalid_data');
 assert.equal(r.windows['24h'].distributedTokens, null);
 assert.equal(r.changes[9].distributedTokens, null);
});
test('payout counter decrease also invalidates a comparison', () => {
 const r = report([point(-1, 1, { payoutCount: 10 }), point(0, 2, { payoutCount: 9 })]);
 assert.ok(r.issues.includes('counter_decrease'));
 assert.equal(r.changes[0].distributedTokens, null);
});
test('23-hour coverage and sparse endpoints cannot claim 24 hours', () => {
 for (const rows of [hours(23), [point(-24, 1), point(0, 2)]]) {
  const w = report(rows).windows['24h'];
  assert.equal(w.status, 'insufficient_history');
  assert.equal(w.distributedTokens, null);
 }
});
test('hourly recorded coverage supports exact 24h and 7d comparisons', () => {
 const r = report(hours(168));
 for (const [key, delta] of [['24h', 24], ['7d', 168]]) {
  assert.equal(r.windows[key].status, 'available');
  assert.equal(r.windows[key].timing, 'exact');
  assert.equal(r.windows[key].distributedTokens, delta);
  assert.equal(r.windows[key].observedSeconds, delta * 3600);
 }
});
test('nearest boundary is at or before target and reports actual extended interval', () => {
 const rows = hours(25); rows.splice(1, 1);
 const w = report(rows).windows['24h'];
 assert.equal(w.status, 'available');
 assert.equal(w.timing, 'nearest_snapshot');
 assert.equal(w.observedSeconds, 25 * 3600);
 assert.equal(w.boundaryOffsetSeconds, -3600);
 assert.equal(w.distributedTokens, 25);
});
test('missing counters and quote changes block bridging invalid records', () => {
 for (const extra of [{ distributedTokens: null }, { quoteSymbol: 'OTHER' }, { quoteSymbol: null }, { source: 'https://evil.example' }]) {
  const rows = hours(24); Object.assign(rows[12], extra);
  const r = report(rows);
  assert.equal(r.windows['24h'].status, 'invalid_data');
  assert.equal(r.windows['24h'].distributedTokens, null);
 }
});
test('malformed, calendar-invalid and future timestamps are detected, never guessed', () => {
 for (const observedAt of ['not a date', '2026-02-30T16:00:00Z', '2026-10-12', '2026-10-13T16:00:00Z']) {
  const r = report([...hours(24), point(0, 10, { observedAt })]);
  assert.equal(r.windows['24h'].status, 'invalid_data');
  assert.ok(r.issues.includes('malformed_timestamp') || r.issues.includes('future_timestamp'));
 }
});
test('stale data has an explicit age and does not claim a current complete period', () => {
 const r = summarizeHistory({ [mint]: hours(24) }, mint, new Date(end + 4 * 3600000));
 assert.equal(r.freshness.status, 'stale');
 assert.equal(r.freshness.ageSeconds, 4 * 3600);
 assert.equal(r.windows['24h'].status, 'stale_data');
 assert.equal(r.windows['24h'].distributedTokens, null);
});
test('zero delta is valid; NaN, Infinity, negatives, booleans and numeric strings are missing', () => {
 assert.equal(report([point(-1, 0), point(0, 0)]).changes[0].distributedTokens, 0);
 for (const value of [NaN, Infinity, -1, true, '12']) assert.equal(report([point(0, value)]).latestLifetimeTotal, null);
});
test('UTC offsets from the actual collector are normalized and the real store is not synthesized', () => {
 const store = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../data/reward-snapshots.json'), 'utf8'));
 const latest = Math.max(...store[mint].map(row => Date.parse(row.observedAt)));
 const r = summarizeHistory(store, mint, new Date(latest + 60000));
 assert.equal(r.observationCount, new Set(store[mint].map(row => Date.parse(row.observedAt))).size);
 assert.equal(r.latestLifetimeTotal, store[mint].at(-1).distributedTokens);
 for (const window of Object.values(r.windows)) {
  if (window.status === 'available') {
   const baseline = store[mint].find(row => new Date(row.observedAt).toISOString() === window.startAt);
   assert.ok(baseline);
   assert.equal(window.distributedTokens, r.latestLifetimeTotal - baseline.distributedTokens);
  } else assert.equal(window.distributedTokens, null);
 }
 assert.ok(r.endAt.endsWith('Z'));
});

test('changed quote mint and unverified source never produce a comparable asset total', () => {
 const r = report([point(-1, 1, { quoteMint: mint }), point(0, 2)]);
 assert.ok(r.issues.includes('inconsistent_quote_asset'));
 assert.equal(r.changes[0].distributedTokens, null);
 const malformed = report([point(0, 2, { quoteMint: '0'.repeat(44) })]);
 assert.equal(malformed.quote, null);
 assert.equal(report([point(0, 2, { source: source + '?different' })]).latestLifetimeTotal, null);
});
test('malformed stores and all-invalid rows are distinguished from absent history', () => {
 for (const store of [null, [], { [mint]: 'invalid' }, { [mint]: [{ observedAt: 'bad' }] }]) {
  const r = summarizeHistory(store, mint, now);
  assert.equal(r.status, 'invalid_data');
  assert.equal(r.latestLifetimeTotal, null);
 }
});
test('coverage metadata exposes gaps and boundary approximation limits', () => {
 const rows = hours(27); rows.splice(1, 3);
 const w = report(rows).windows['24h'];
 assert.equal(w.status, 'insufficient_history');
 assert.equal(w.observedSeconds, 27 * 3600);
 assert.equal(w.maxGapSeconds, 4 * 3600);
 assert.equal(w.distributedTokens, null);
});

test('three-hour freshness boundary and stale incomplete windows are explicit', () => {
 for (const elapsed of [3 * 3600000, 3 * 3600000 + 1]) {
  const r = summarizeHistory({ [mint]: [point(0, 1)] }, mint, new Date(end + elapsed));
  assert.equal(r.freshness.status, elapsed > 3 * 3600000 ? 'stale' : 'fresh');
  for (const window of Object.values(r.windows)) {
   assert.equal(window.status, elapsed > 3 * 3600000 ? 'stale_data' : 'insufficient_history');
   assert.equal(window.distributedTokens, null);
  }
 }
});
