'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function api(path, options) {
  const res = await fetch(base + path, options);
  return { status: res.status, body: await res.json() };
}

test('GET /api/exercises lists all 8', async () => {
  const { status, body } = await api('/api/exercises');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.length, 8);
});

test('GET /api/exercises/:id returns detail without the answer', async () => {
  const { body } = await api('/api/exercises/03-vault-inflation');
  assert.equal(body.success, true);
  assert.ok(!('answerIndex' in body.data.identify));
});

test('GET unknown exercise id is a 400 validation error', async () => {
  const { status, body } = await api('/api/exercises/not_valid');
  assert.equal(status, 400);
  assert.equal(body.success, false);
});

test('POST identify: correct answer passes with explanation', async () => {
  const { body } = await api('/api/exercises/03-vault-inflation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'identify', answerIndex: 1 }),
  });
  assert.equal(body.data.passed, true);
  assert.ok(body.data.explanation);
});

test('POST identify: wrong answer fails and leaks no explanation', async () => {
  const { body } = await api('/api/exercises/03-vault-inflation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'identify', answerIndex: 0 }),
  });
  assert.equal(body.data.passed, false);
  assert.equal(body.data.explanation, undefined);
});

test('POST run: empty exploit code is a 400', async () => {
  const { status, body } = await api('/api/exercises/01-access-control/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'exploit', code: '' }),
  });
  assert.equal(status, 400);
  assert.equal(body.success, false);
});

test('POST fix on an explain-mode exercise returns the recommended fix', async () => {
  const { body } = await api('/api/exercises/06-oracle-spot-price/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'fix', code: 'ignored' }),
  });
  assert.equal(body.data.mode, 'explain');
  assert.ok(body.data.recommendedFix);
});

test('unknown API route returns 404', async () => {
  const { status, body } = await api('/api/nope');
  assert.equal(status, 404);
  assert.equal(body.success, false);
});

test('GET /api/drills/stats reports the drill pool', async () => {
  const { status, body } = await api('/api/drills/stats');
  assert.equal(status, 200);
  assert.ok(body.data.total >= 400);
  assert.ok(Array.isArray(body.data.families) && body.data.families.length >= 5);
});

test('GET /api/drills/next returns a redacted prompt + 4 family options', async () => {
  const { body } = await api('/api/drills/next');
  assert.ok(body.data.id && body.data.prompt);
  assert.equal(body.data.familyOptions.length, 4);
});

test('POST drill answer grades family then class', async () => {
  const next = (await api('/api/drills/next')).body.data;
  const fam = await api(`/api/drills/${next.id}/answer`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: undefined, step: 'family', value: next.familyOptions[0] }),
  });
  assert.equal(fam.status, 200);
  assert.ok('correct' in fam.body.data);
  assert.ok(Array.isArray(fam.body.data.classOptions));
});

test('POST drill answer: unknown drill id is 404, bad step is 400', async () => {
  const notFound = await api('/api/drills/99-nope/answer', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'family', value: 'oracle' }),
  });
  assert.equal(notFound.status, 404);
  const next = (await api('/api/drills/next')).body.data;
  const badStep = await api(`/api/drills/${next.id}/answer`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'nope', value: 'oracle' }),
  });
  assert.equal(badStep.status, 400);
});

test('static: GET / serves the SPA shell', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /AuditVault/);
});

test('valid-but-missing exercise id is a 404, not a 500', async () => {
  const { status, body } = await api('/api/exercises/99-nope');
  assert.equal(status, 404);
  assert.equal(body.success, false);
});

test('answerIndex beyond the option count is a 400', async () => {
  const { status } = await api('/api/exercises/03-vault-inflation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'identify', answerIndex: 99 }),
  });
  assert.equal(status, 400);
});

test('non-GET to a static path returns 405', async () => {
  const res = await fetch(base + '/', { method: 'DELETE' });
  assert.equal(res.status, 405);
});

test('static: GET /style.css serves CSS; missing asset is 404', async () => {
  const css = await fetch(base + '/style.css');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  const missing = await fetch(base + '/does-not-exist.png');
  assert.equal(missing.status, 404);
});
