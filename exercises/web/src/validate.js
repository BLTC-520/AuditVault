'use strict';

const { STAGES, MAX_CODE_BYTES } = require('./config');

// Input validation at the trust boundary. Every value here originates from an
// HTTP request and must be treated as untrusted. Validators throw ValidationError
// with a user-safe message; callers map that to a 400 response.

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// A validly-formed request for a resource that does not exist (→ 404, not 500).
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Exercise ids are directory names like "03-vault-inflation". The strict pattern
// also prevents path traversal (no slashes, dots, or separators allowed).
const ID_PATTERN = /^[0-9]{2}-[a-z0-9-]+$/;
// Built from an escaped string so no literal NUL ever appears in this source.
const NULL_BYTE = new RegExp('\\x00');
// Defensive sanity cap; the authoritative per-question bound is enforced in
// api.js against the manifest's option count.
const MAX_ANSWER_INDEX = 100;

/**
 * @param {unknown} id
 * @returns {string} the validated exercise id
 */
function validateExerciseId(id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new ValidationError('Invalid exercise id');
  }
  return id;
}

/**
 * @param {unknown} stage
 * @returns {'identify' | 'exploit' | 'fix'}
 */
function validateStage(stage) {
  if (typeof stage !== 'string' || !STAGES.includes(stage)) {
    throw new ValidationError(`stage must be one of: ${STAGES.join(', ')}`);
  }
  return stage;
}

/**
 * Solidity source submitted by the learner for an exploit/fix run.
 * @param {unknown} code
 * @returns {string}
 */
function validateCode(code) {
  if (typeof code !== 'string') {
    throw new ValidationError('code must be a string');
  }
  if (code.length === 0) {
    throw new ValidationError('code must not be empty');
  }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    throw new ValidationError(`code exceeds the ${MAX_CODE_BYTES}-byte limit`);
  }
  if (NULL_BYTE.test(code)) {
    throw new ValidationError('code must not contain null bytes');
  }
  return code;
}

// Finding ids are slugs like "13206-multiple-checks-effects-violations". The
// pattern blocks path traversal; existence is then confirmed against the index.
const DRILL_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,120}$/;
const DRILL_STEPS = ['family', 'class'];

/**
 * @param {unknown} id
 * @returns {string}
 */
function validateDrillId(id) {
  if (typeof id !== 'string' || !DRILL_ID_PATTERN.test(id)) {
    throw new ValidationError('Invalid drill id');
  }
  return id;
}

/**
 * @param {unknown} step
 * @returns {'family' | 'class'}
 */
function validateDrillStep(step) {
  if (typeof step !== 'string' || !DRILL_STEPS.includes(step)) {
    throw new ValidationError(`step must be one of: ${DRILL_STEPS.join(', ')}`);
  }
  return step;
}

/**
 * A multiple-choice answer value (a family or class tag string).
 * @param {unknown} value
 * @returns {string}
 */
function validateChoice(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 120) {
    throw new ValidationError('value must be a short non-empty string');
  }
  return value;
}

/**
 * Answer index for the multiple-choice identify stage.
 * @param {unknown} answerIndex
 * @returns {number}
 */
function validateAnswerIndex(answerIndex) {
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > MAX_ANSWER_INDEX) {
    throw new ValidationError(`answerIndex must be an integer in 0..${MAX_ANSWER_INDEX}`);
  }
  return answerIndex;
}

module.exports = {
  ValidationError,
  NotFoundError,
  validateExerciseId,
  validateStage,
  validateCode,
  validateAnswerIndex,
  validateDrillId,
  validateDrillStep,
  validateChoice,
};
