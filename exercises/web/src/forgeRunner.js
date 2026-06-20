'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { EXERCISES_ROOT, FORGE_TIMEOUT_MS } = require('./config');
const { loadManifest } = require('./manifest');

// Runs a learner's Solidity submission against the real Foundry toolchain inside
// an isolated temp sandbox. Canonical exercise files are NEVER mutated: the
// exercise is copied into the OS temp dir, the target file is overwritten there,
// forge runs scoped to that exercise, and the sandbox is removed afterwards.
//
// Security note: this compiles and runs user-supplied Solidity via solc + forge's
// in-process EVM. The EVM has no host access. forge/solc run as the local user, so
// this is intended strictly as a single-user LOCAL dev tool, not a public service.

const FORGE_BIN = process.env.FORGE_BIN || 'forge';
const COMPILE_ERROR = /Compiler run failed|Compilation failed|Error \(\d{3,4}\):/;
// Guard: a match-path that selects nothing makes forge exit 0 ("Ran 0 test
// suites"). That must never be read as success.
const NO_TESTS = /Ran 0 test suites/;

/**
 * Strip solc source-snippet lines (e.g. "  12 | uint x = ...") and absolute
 * sandbox paths from forge output before returning it to the client. This
 * prevents reference-solution source from leaking if a solution/functionality
 * file fails to compile against a learner's patched contract. Full output is
 * still logged server-side by callers if needed.
 * @param {string} output
 * @returns {string}
 */
function redactForClient(output) {
  return output
    .split('\n')
    .filter((line) => !/^\s*\d+\s*\|/.test(line))
    .map((line) => line
      .replace(/\/[^\s:]*auditvault-ctf-[^\s:]*/g, '<sandbox>')        // absolute sandbox paths
      .replace(/(^|[\s/])solution\/\S+\.sol/g, '$1<solution>'))        // relative reference-solution paths
    .join('\n');
}

/**
 * Build an isolated sandbox containing the project config, shared sources, the
 * one exercise, and a symlink to the (large) forge-std lib.
 * @param {string} id
 * @returns {string} absolute path to the sandbox root
 */
function createSandbox(id, { includeSolution = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'auditvault-ctf-'));
  for (const f of ['foundry.toml', 'remappings.txt']) {
    fs.copyFileSync(path.join(EXERCISES_ROOT, f), path.join(root, f));
  }
  fs.cpSync(path.join(EXERCISES_ROOT, 'shared'), path.join(root, 'shared'), { recursive: true });
  fs.cpSync(path.join(EXERCISES_ROOT, id), path.join(root, id), { recursive: true });
  // The exploit stage never runs the reference solution — drop it so it is not
  // even compiled (faster, and removes any solution-source leak channel).
  if (!includeSolution) {
    fs.rmSync(path.join(root, id, 'solution'), { recursive: true, force: true });
  }
  // Symlink lib rather than copy — forge-std is large and read-only here.
  fs.symlinkSync(path.join(EXERCISES_ROOT, 'lib'), path.join(root, 'lib'), 'dir');
  return root;
}

/**
 * Run `forge test` in the sandbox, scoped to one path, with a hard timeout.
 * @param {string} cwd
 * @param {string} matchPath
 * @returns {Promise<{ code: number, output: string, timedOut: boolean }>}
 */
function runForge(cwd, matchPath) {
  return new Promise((resolve) => {
    // detached:true puts forge in its own process group so we can kill the whole
    // group (forge + its solc descendants) on timeout — killing only forge's PID
    // would leave a runaway solc alive past the deadline.
    const child = spawn(FORGE_BIN, ['test', '--match-path', matchPath, '-vv'], { cwd, detached: true });
    let output = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    }, FORGE_TIMEOUT_MS);

    child.stdout.on('data', (d) => { output += d.toString(); });
    child.stderr.on('data', (d) => { output += d.toString(); });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: 127, output: `Failed to launch forge: ${err.message}`, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, output, timedOut });
    });
  });
}

function overwrite(sandbox, id, relFile, code) {
  fs.writeFileSync(path.join(sandbox, id, relFile), code);
}

function cleanup(sandbox) {
  try {
    fs.rmSync(sandbox, { recursive: true, force: true });
  } catch {
    // best-effort; the OS will reclaim temp space regardless
  }
}

/** @returns {{ passed: boolean, reason: string, output: string }} */
function result(passed, reason, output) {
  return { passed, reason, output };
}

/**
 * EXPLOIT stage: the learner's exploit must make the exercise's test pass.
 * @param {string} id
 * @param {string} code  contents for the exploit test file
 * @returns {Promise<{ passed: boolean, reason: string, output: string }>}
 */
async function runExploit(id, code) {
  const m = loadManifest(id);
  const sandbox = createSandbox(id, { includeSolution: false });
  try {
    overwrite(sandbox, id, m.files.exploitStub, code);
    const { code: exit, output, timedOut } = await runForge(sandbox, `${id}/${m.files.exploitStub}`);
    const out = redactForClient(output);
    if (timedOut) return result(false, 'Run timed out', out);
    if (COMPILE_ERROR.test(output)) return result(false, 'Your exploit code does not compile', out);
    if (NO_TESTS.test(output)) return result(false, 'No test was executed', out);
    if (exit === 0) return result(true, 'Exploit succeeded — the target was drained', out);
    return result(false, 'Your exploit did not satisfy the test assertions yet', out);
  } finally {
    cleanup(sandbox);
  }
}

/**
 * FIX stage: the learner's patched contract must (1) compile, (2) keep the
 * functionality test passing, and (3) make the reference exploit FAIL.
 * @param {string} id
 * @param {string} code  contents for the vulnerable source file
 * @returns {Promise<{ passed: boolean, reason: string, output: string }>}
 */
async function runFix(id, code) {
  const m = loadManifest(id);
  if (m.stages?.fix?.mode !== 'auto') {
    throw new Error(`Exercise '${id}' does not support an auto-graded fix`);
  }
  const sandbox = createSandbox(id, { includeSolution: true });
  try {
    overwrite(sandbox, id, m.stages.fix.editFile, code);

    const func = await runForge(sandbox, `${id}/${m.files.functionalityTest}`);
    const funcOut = redactForClient(func.output);
    if (func.timedOut) return result(false, 'Run timed out', funcOut);
    if (COMPILE_ERROR.test(func.output)) {
      // A compile error here is usually the learner changing the public interface
      // the reference tests depend on. Return only the curated reason — never the
      // raw output, which can reference reference-solution files/symbols.
      return result(false, 'Your fix does not compile against the reference tests — keep the public function signatures unchanged', '');
    }
    if (NO_TESTS.test(func.output)) return result(false, 'Functionality check did not run', funcOut);
    if (func.code !== 0) return result(false, 'Your fix breaks legitimate functionality', funcOut);

    const exploit = await runForge(sandbox, `${id}/${m.files.solutionTest}`);
    const exploitOut = redactForClient(exploit.output);
    if (exploit.timedOut) return result(false, 'Run timed out', exploitOut);
    if (COMPILE_ERROR.test(exploit.output) || NO_TESTS.test(exploit.output)) {
      return result(false, 'Could not verify the fix (exploit test did not run)', exploitOut);
    }
    if (exploit.code === 0) {
      return result(false, 'The exploit still succeeds against your fix', exploitOut);
    }
    return result(true, 'Fix holds: functionality preserved and the exploit is defeated', `${funcOut}\n${exploitOut}`);
  } finally {
    cleanup(sandbox);
  }
}

module.exports = { runExploit, runFix, createSandbox, runForge, redactForClient };
