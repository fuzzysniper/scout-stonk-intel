import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {completeness, decisionBlockers, emptyDraft, fields} from '../../app/desk/draft.mjs';
test('PLAN fails closed for empty and fully entered manual drafts', () => {
 assert.equal(completeness(emptyDraft(), false).every(c => !c.complete), true);
 const full = Object.fromEntries(fields.map(([key]) => [key, 'MANUAL TEST ASSUMPTION']));
 assert.deepEqual(decisionBlockers('PLAN', full, true), ['Reviewed evidence integration', 'Reviewed risk evaluation']);
 assert.ok(decisionBlockers('PLAN', full, false).includes('Manual assumptions acknowledged'));
});
test('PASS and WATCH need a reason, allow missing asset and research', () => {
 for (const decision of ['WATCH', 'PASS']) {
  assert.deepEqual(decisionBlockers(decision, emptyDraft(), false), ['Write a decision reason.']);
  assert.deepEqual(decisionBlockers(decision, {...emptyDraft(), reason: '   '}, true), ['Write a decision reason.']);
  assert.deepEqual(decisionBlockers(decision, {...emptyDraft(), reason: 'Insufficient evidence.'}, false), []);
 }
 assert.ok(decisionBlockers('BUY', emptyDraft(), true).length);
});
test('draft factories are isolated; no source, persistence or cross-agent runtime imports', () => {
 const first = emptyDraft(); first.asset = 'MANUAL'; assert.equal(emptyDraft().asset, '');
 const code = readdirSync('app/desk').filter(p => /\.(tsx|mjs)$/.test(p)).map(p => readFileSync(`app/desk/${p}`, 'utf8')).join('\n');
 assert.doesNotMatch(code, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|sendBeacon)\s*[.(]|document\.cookie|from ['"](?:@\/lib|\.\.\/)/);
});
