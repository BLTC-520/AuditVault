'use strict';

const { listManifests, toSummary, getExerciseDetail, loadManifest } = require('./manifest');
const { runExploit, runFix } = require('./forgeRunner');
const {
  ValidationError,
  NotFoundError,
  validateExerciseId,
  validateStage,
  validateCode,
  validateAnswerIndex,
} = require('./validate');
const { MAX_CODE_BYTES } = require('./config');

// JSON API for the CTF web app. Responses use a consistent envelope:
//   { success: true, data }  |  { success: false, error }

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

const ok = (res, data) => send(res, 200, { success: true, data });
const fail = (res, status, error) => send(res, status, { success: false, error });

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<object>} parsed JSON body
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const limit = MAX_CODE_BYTES + 4_000; // code + JSON envelope overhead
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new ValidationError('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new ValidationError('Body must be valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Grade a stage submission. Identify is checked here against the manifest;
 * exploit/fix delegate to the sandboxed forge runner.
 * @returns {Promise<object>} stage result
 */
async function gradeStage(id, body) {
  const stage = validateStage(body.stage);

  if (stage === 'identify') {
    const answerIndex = validateAnswerIndex(body.answerIndex);
    const m = loadManifest(id);
    if (answerIndex >= m.identify.options.length) {
      throw new ValidationError(`answerIndex must be 0..${m.identify.options.length - 1}`);
    }
    const passed = answerIndex === m.identify.answerIndex;
    return {
      stage,
      passed,
      reason: passed ? 'Correct — you spotted the bug.' : 'Not quite — re-read the contract and try again.',
      explanation: passed ? m.identify.explanation : undefined,
    };
  }

  if (stage === 'exploit') {
    const code = validateCode(body.code);
    return { stage, ...(await runExploit(id, code)) };
  }

  // fix
  const m = loadManifest(id);
  if (m.stages?.fix?.mode === 'explain') {
    return {
      stage,
      mode: 'explain',
      passed: null,
      reason: 'This bug is fixed at the architecture level — study the recommended fix.',
      recommendedFix: m.stages.fix.recommendedFix,
      fixTag: m.stages.fix.fixTag,
    };
  }
  const code = validateCode(body.code);
  return { stage, ...(await runFix(id, code)) };
}

/**
 * Route an /api/* request. Returns true if handled.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} pathname
 * @returns {Promise<boolean>}
 */
async function handleApi(req, res, pathname) {
  if (!pathname.startsWith('/api/')) return false;

  try {
    // GET /api/exercises
    if (req.method === 'GET' && pathname === '/api/exercises') {
      ok(res, listManifests().map(toSummary));
      return true;
    }

    const detailMatch = pathname.match(/^\/api\/exercises\/([^/]+)$/);
    if (req.method === 'GET' && detailMatch) {
      const id = validateExerciseId(decodeURIComponent(detailMatch[1]));
      ok(res, getExerciseDetail(id));
      return true;
    }

    const runMatch = pathname.match(/^\/api\/exercises\/([^/]+)\/run$/);
    if (req.method === 'POST' && runMatch) {
      const id = validateExerciseId(decodeURIComponent(runMatch[1]));
      const body = await readJsonBody(req);
      ok(res, await gradeStage(id, body));
      return true;
    }

    fail(res, 404, 'Unknown API route');
    return true;
  } catch (err) {
    if (err instanceof ValidationError) {
      fail(res, 400, err.message);
    } else if (err instanceof NotFoundError) {
      fail(res, 404, err.message);
    } else {
      // Log server-side detail; return a generic message to the client.
      process.stderr.write(`[api] ${err && err.stack ? err.stack : err}\n`);
      fail(res, 500, 'Internal error while handling the request');
    }
    return true;
  }
}

module.exports = { handleApi, gradeStage };
