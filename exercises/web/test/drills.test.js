'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const drills = require('../src/drills');

const REENTRANCY_ID = '13206-multiple-checks-effects-violations-consensys-rocket-pool-atl';

test('buildIndex covers the tagged findings and the bug families', () => {
  const idx = drills.buildIndex();
  assert.ok(idx.ids.length >= 400, `expected a large drill pool, got ${idx.ids.length}`);
  for (const fam of ['reentrancy', 'oracle', 'arithmetic', 'access-control']) {
    assert.ok(idx.families.includes(fam), `missing family ${fam}`);
  }
});

test('redact removes giveaway bug-name terms', () => {
  const out = drills.redact('This is a reentrancy via an oracle with an overflow and access control.');
  assert.doesNotMatch(out, /reentran|oracle|overflow|access[- ]control/i);
});

test('promptFor never leaks the bug name', () => {
  const prompt = drills.promptFor(REENTRANCY_ID);
  assert.ok(prompt.length > 0);
  assert.doesNotMatch(prompt, /reentran|checks-effects/i);
});

test('no prompt leaks its own family or distinctive class tokens (corpus-wide)', () => {
  // Independent of the redaction internals: scan every served prompt for the
  // answer appearing as a word (inflection-tolerant), minus generic tokens.
  const GENERIC = new Set([
    'contract', 'function', 'funds', 'logic', 'missing', 'check', 'price', 'value',
    'values', 'data', 'call', 'calls', 'loop', 'state', 'error', 'address', 'token',
    'tokens', 'reward', 'rewards', 'vault', 'pool', 'amount', 'based', 'first',
  ]);
  const idx = drills.buildIndex();
  const leaks = [];
  for (const id of idx.ids) {
    const meta = idx.byId.get(id);
    const prompt = drills.promptFor(id).toLowerCase();
    const famRe = new RegExp(`\\b${meta.family.replace(/-/g, '[- ]?')}`, 'i');
    if (famRe.test(prompt)) leaks.push(`${id}:family(${meta.family})`);
    for (const tok of meta.klass.split('/').slice(1).join('/').split(/[/-]/)) {
      if (tok.length >= 5 && !GENERIC.has(tok) && new RegExp(`\\b${tok}`, 'i').test(prompt)) {
        leaks.push(`${id}:${tok}`);
      }
    }
  }
  assert.deepEqual(leaks, [], `prompts leaking the answer (first 8): ${leaks.slice(0, 8).join(', ')}`);
});

test('drillView returns a prompt and 4 family options including the answer', () => {
  const v = drills.drillView(REENTRANCY_ID);
  assert.equal(v.familyOptions.length, 4);
  assert.ok(v.familyOptions.includes('reentrancy'));
  assert.doesNotMatch(v.prompt, /reentran/i);
});

test('gradeFamily grades both paths and returns class options', () => {
  const right = drills.gradeFamily(REENTRANCY_ID, 'reentrancy');
  assert.equal(right.correct, true);
  assert.ok(right.classOptions.includes('reentrancy/single-function'));
  const wrong = drills.gradeFamily(REENTRANCY_ID, 'oracle');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.answer, 'reentrancy');
});

test('gradeClass reveals the real finding only after answering', () => {
  const r = drills.gradeClass(REENTRANCY_ID, 'reentrancy/single-function');
  assert.equal(r.correct, true);
  assert.equal(r.reveal.findingId, REENTRANCY_ID);
  assert.ok(r.reveal.title && r.reveal.title.length > 0);
  assert.equal(r.reveal.family, 'reentrancy');
});

test('hasDrill validates membership', () => {
  assert.equal(drills.hasDrill(REENTRANCY_ID), true);
  assert.equal(drills.hasDrill('99-not-real'), false);
});

test('nextDrill excludes recently seen ids', () => {
  const all = drills.buildIndex().ids;
  const exclude = all.slice(0, all.length - 1); // leave exactly one choosable
  const d = drills.nextDrill(exclude);
  assert.equal(d.id, all[all.length - 1]);
});
