'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listManifests, loadManifest, getExerciseDetail, toSummary } = require('../src/manifest');

test('listManifests returns all 8 exercises, sorted by order', () => {
  const all = listManifests();
  assert.equal(all.length, 8);
  const orders = all.map((m) => m.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
});

test('loadManifest returns required keys and matching id', () => {
  const m = loadManifest('03-vault-inflation');
  for (const k of ['id', 'order', 'title', 'difficulty', 'vuln', 'summary', 'files', 'identify', 'hints', 'stages']) {
    assert.ok(k in m, `missing ${k}`);
  }
  assert.equal(m.id, '03-vault-inflation');
});

test('loadManifest throws for unknown exercise', () => {
  assert.throws(() => loadManifest('99-nope'));
});

test('getExerciseDetail never leaks the identify answer', () => {
  const d = getExerciseDetail('03-vault-inflation');
  assert.ok(!('answerIndex' in d.identify), 'answerIndex must be stripped');
  assert.ok(!('explanation' in d.identify), 'explanation must be stripped');
  assert.ok(d.identify.question && Array.isArray(d.identify.options));
  assert.ok(d.vulnerableCode.length > 0, 'vulnerable code should be included');
});

test('toSummary projects only public list fields', () => {
  const s = toSummary(loadManifest('01-access-control'));
  assert.deepEqual(Object.keys(s).sort(), ['difficulty', 'id', 'order', 'sector', 'summary', 'title', 'vuln'].sort());
});
