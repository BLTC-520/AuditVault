'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ValidationError,
  validateExerciseId,
  validateStage,
  validateCode,
  validateAnswerIndex,
} = require('../src/validate');

test('validateExerciseId accepts well-formed ids', () => {
  assert.equal(validateExerciseId('03-vault-inflation'), '03-vault-inflation');
  assert.equal(validateExerciseId('01-access-control'), '01-access-control');
});

test('validateExerciseId rejects traversal and malformed ids', () => {
  for (const bad of ['../etc', 'abc', '3-x', '', 'AA-x', '03_under', 42, null]) {
    assert.throws(() => validateExerciseId(bad), ValidationError, `expected reject: ${bad}`);
  }
});

test('validateStage accepts the three stages only', () => {
  for (const s of ['identify', 'exploit', 'fix']) assert.equal(validateStage(s), s);
  for (const bad of ['', 'IDENTIFY', 'run', 1]) assert.throws(() => validateStage(bad), ValidationError);
});

test('validateCode enforces type, non-empty, size, and no NUL', () => {
  assert.equal(validateCode('contract X {}'), 'contract X {}');
  assert.throws(() => validateCode(''), ValidationError);
  assert.throws(() => validateCode(123), ValidationError);
  assert.throws(() => validateCode('a'.repeat(40_001)), ValidationError);
  assert.throws(() => validateCode('a' + String.fromCharCode(0) + 'b'), ValidationError);
});

test('validateAnswerIndex requires a non-negative integer', () => {
  assert.equal(validateAnswerIndex(0), 0);
  assert.equal(validateAnswerIndex(3), 3);
  for (const bad of [-1, 1.5, 'a', NaN, 999]) assert.throws(() => validateAnswerIndex(bad), ValidationError);
});
