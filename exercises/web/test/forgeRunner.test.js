'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runExploit, runFix, redactForClient } = require('../src/forgeRunner');
const { EXERCISES_ROOT } = require('../src/config');

// These tests invoke the real forge toolchain, so they are slow. They are the
// core integration guarantee for the Fix oracle.
const TIMEOUT = 180_000;
const ID = '01-access-control';
const read = (rel) => fs.readFileSync(path.join(EXERCISES_ROOT, rel), 'utf8');

test('exploit: reference solution passes', { timeout: TIMEOUT }, async () => {
  const r = await runExploit(ID, read(`${ID}/solution/Solution.t.sol`));
  assert.equal(r.passed, true, r.reason);
});

test('exploit: untouched stub fails', { timeout: TIMEOUT }, async () => {
  const r = await runExploit(ID, read(`${ID}/test/Exploit.t.sol`));
  assert.equal(r.passed, false);
});

test('exploit: non-compiling code is reported, not passed', { timeout: TIMEOUT }, async () => {
  const r = await runExploit(ID, 'this is not solidity');
  assert.equal(r.passed, false);
  assert.match(r.reason, /compile/i);
});

test('fix: patched contract holds (functionality + exploit defeated)', { timeout: TIMEOUT }, async () => {
  const patched = read(`${ID}/src/Treasury.sol`).replace(
    'function setOwner(address newOwner) external {',
    'function setOwner(address newOwner) external {\n        require(msg.sender == owner, "not owner");',
  );
  const r = await runFix(ID, patched);
  assert.equal(r.passed, true, r.reason);
});

test('fix: unpatched contract is rejected (exploit still works)', { timeout: TIMEOUT }, async () => {
  const r = await runFix(ID, read(`${ID}/src/Treasury.sol`));
  assert.equal(r.passed, false);
  assert.match(r.reason, /exploit still succeeds/i);
});

test('redactForClient strips solution source, snippets, and paths', () => {
  const raw = [
    'Error (1234): Member "foo" not found.',
    '  --> 01-access-control/solution/Functionality.t.sol:23:9:',
    '   23 |     vault.secretSolutionLogic();',
    '      |           ^^^^^^^^^^^^^^^^^^^^',
    '/var/folders/x/T/auditvault-ctf-abcd/01-access-control/solution/Solution.t.sol',
  ].join('\n');
  const out = redactForClient(raw);
  assert.ok(!out.includes('secretSolutionLogic'), 'source snippet must be stripped');
  assert.ok(!/solution\/\S+\.sol/.test(out), 'solution paths must be redacted');
  assert.ok(!out.includes('auditvault-ctf-abcd'), 'sandbox path must be redacted');
  assert.match(out, /Member "foo" not found/, 'error messages are preserved');
});

test('runner never mutates the canonical exercise files', { timeout: TIMEOUT }, async () => {
  const target = `${ID}/src/Treasury.sol`;
  const before = read(target);
  await runExploit(ID, read(`${ID}/solution/Solution.t.sol`));
  await runFix(ID, before);
  assert.equal(read(target), before, 'source file must be unchanged after runs');
});
