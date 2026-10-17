// Interpret the real workflow conditions with GitHub's expression library.
// No Actions runner, dispatch, credentials or provider is contacted.
// Keep the inactive actual-job proof and proposal regressions in Node20 app CI.
import '../scheduler/c2/collector-identity.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Lexer, Parser, Evaluator, data } from '@actions/expressions';

const workflow = readFileSync(new URL('../.github/workflows/reward-snapshots.yml', import.meta.url), 'utf8');
function condition(name) {
  const marker = `      - name: ${name}\n`;
  assert.ok(workflow.includes(marker), `missing workflow step: ${name}`);
  const step = workflow.split(marker)[1].split(/\n      - (?:name|uses):/)[0];
  const match = /        if: ([^\n]+)(?:\n|$)/.exec(step);
  assert.ok(match, `missing condition: ${name}`);
  if (match[1] !== '>-') return match[1];
  return step.slice(match.index + match[0].length).split('\n').filter((line, index, lines) =>
    /^          \S/.test(line) && lines.slice(0, index).every(previous => /^          \S/.test(previous))
  ).map(line => line.trim()).join(' ');
}
const gate = condition('Shared claim gate (default off)');
const collect = condition('Collect observations');
const publish = condition('Persist observations and summary');
const evidence = condition('Preserve gate claim evidence');
function convert(value) {
  if (typeof value === 'string') return new data.StringData(value);
  if (typeof value === 'number') return new data.NumberData(value);
  if (typeof value === 'boolean') return new data.BooleanData(value);
  if (value == null) return new data.Null();
  return new data.Dictionary(...Object.entries(value).map(([key, item]) => ({ key, value: convert(item) })));
}
function evaluate(expression, context, successful = true) {
  const functions = [
    { name: 'success', minArgs: 0, maxArgs: 0, call: () => new data.BooleanData(successful) },
    { name: 'always', minArgs: 0, maxArgs: 0, call: () => new data.BooleanData(true) },
  ];
  // GitHub implicitly adds success() if a condition has no status function.
  const actual = /\b(?:success|always|failure|cancelled)\s*\(/.test(expression) ? expression : `success() && (${expression})`;
  const tree = new Parser(new Lexer(actual).lex().tokens, ['vars', 'inputs', 'github', 'steps'], functions).parse();
  return new Evaluator(tree, convert(context), new Map(functions.map(fn => [fn.name, fn]))).evaluate().coerceString() === 'true';
}
function context({ setting, inputs = {}, actor = '123', app, outcome = 'skipped', authorized = 'false', collected = 'skipped' } = {}) {
  return { vars: { ...(setting === undefined ? {} : { SCOUT_COLLECTION_GATE_ENABLED: setting }),
    ...(app === undefined ? {} : { SCOUT_COLLECTION_APP_ACTOR_ID: app }) },
    inputs, github: { actor_id: actor },
    steps: { gate: { outcome, outputs: { collect: authorized } }, collect: { outcome: collected } } };
}

test('real workflow: unset/false, missing schedule inputs and empty manual inputs preserve legacy path', () => {
  for (const setting of [undefined, '', 'false']) {
    for (const inputs of [{}, { collection_slot: '', trigger_source: '' }]) {
      const value = context({ setting, inputs });
      assert.equal(evaluate(gate, value), false);
      assert.equal(evaluate(collect, value), true);
      assert.equal(evaluate(evidence, value), false);
    }
  }
});
test('real workflow: external inputs/configured App actor invoke disabled gate and cannot collect', () => {
  for (const options of [
    { inputs: { trigger_source: 'external', collection_slot: 'synthetic-slot' } },
    { inputs: { collection_slot: 'synthetic-slot' } },
    { actor: '9001', app: '9001' },
    { actor: '342326617', app: '342326617' }, // owner-reported SCOUT App actor; no live call
  ]) {
    const value = context({ ...options, outcome: 'failure' });
    assert.equal(evaluate(gate, value), true);
    assert.equal(evaluate(collect, value, false), false);
    assert.equal(evaluate(publish, value, false), false);
    assert.equal(evaluate(evidence, value, false), true);
  }
});
test('real workflow: opt-in requires successful gate authorization, never skipped/duplicate/failed fallback', () => {
  for (const outcome of ['success', 'failure', 'skipped']) {
    const value = context({ setting: 'true', outcome });
    assert.equal(evaluate(gate, value), true);
    assert.equal(evaluate(collect, value), false);
  }
  assert.equal(evaluate(collect, context({ setting: 'true', outcome: 'success', authorized: 'true' })), true);
});
test('real workflow: gate receipt/output failure blocks even a stray collect=true output', () => {
  const value = context({ setting: 'true', outcome: 'failure', authorized: 'true' });
  assert.equal(evaluate(collect, value, false), false);
  assert.equal(evaluate(publish, value, false), false);
});
test('real workflow: invalid opt-in setting runs gate and has no legacy fallback', () => {
  for (const setting of ['yes', ' true', 'invalid']) {
    const value = context({ setting, outcome: 'failure' });
    assert.equal(evaluate(gate, value), true);
    assert.equal(evaluate(collect, value, false), false);
  }
});
test('real workflow: continue-on-error provider failure retains diagnostic publication; skipped collector cannot publish', () => {
  for (const setting of [undefined, 'true']) {
    for (const collected of ['success', 'failure']) {
      assert.equal(evaluate(publish, context({ setting, collected })), true);
    }
    assert.equal(evaluate(publish, context({ setting, collected: 'skipped' })), false);
  }
});
test('real workflow: existing collector artifact remains separate from outside-checkout gate evidence', () => {
  const original = workflow.split('      - name: Preserve diagnostic evidence\n')[1].split('      - name:')[0];
  assert.match(original, /name: collector-evidence-/);
  assert.match(original, /data\/collection-summary\.json\s+data\/reward-snapshots\.json/);
  assert.doesNotMatch(original, /runner.temp|collection-slots/);
  assert.match(original, /retention-days: 7/);
});
