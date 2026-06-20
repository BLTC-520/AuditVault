'use strict';

const fs = require('fs');
const path = require('path');
const { EXERCISES_ROOT } = require('./config');
const { validateExerciseId, NotFoundError } = require('./validate');

// Loads and validates per-exercise manifest.json files. The manifest is the
// single source of truth for the web app (identify quiz, hints, stage config).

const REQUIRED_KEYS = ['id', 'order', 'title', 'difficulty', 'vuln', 'summary', 'files', 'identify', 'hints', 'stages'];

/**
 * @param {string} id
 * @returns {string} absolute path to the exercise directory
 */
function exerciseDir(id) {
  return path.join(EXERCISES_ROOT, validateExerciseId(id));
}

/**
 * Read + validate a single manifest.
 * @param {string} id
 * @returns {Readonly<object>}
 */
function loadManifest(id) {
  const file = path.join(exerciseDir(id), 'manifest.json');
  if (!fs.existsSync(file)) {
    throw new NotFoundError(`No manifest for exercise '${id}'`);
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Malformed manifest for '${id}': ${err.message}`);
  }
  for (const key of REQUIRED_KEYS) {
    if (!(key in manifest)) {
      throw new Error(`Manifest '${id}' is missing required key '${key}'`);
    }
  }
  if (manifest.id !== id) {
    throw new Error(`Manifest id '${manifest.id}' does not match directory '${id}'`);
  }
  return Object.freeze(manifest);
}

/**
 * All manifests, sorted by `order`. Directories without a manifest are skipped.
 * @returns {ReadonlyArray<Readonly<object>>}
 */
function listManifests() {
  if (!fs.existsSync(EXERCISES_ROOT)) return [];
  return fs.readdirSync(EXERCISES_ROOT)
    .filter(name => /^[0-9]{2}-/.test(name))
    .filter(name => fs.existsSync(path.join(EXERCISES_ROOT, name, 'manifest.json')))
    .map(name => loadManifest(name))
    .sort((a, b) => a.order - b.order);
}

/** Summary projection for the exercise list (no quiz answers leaked). */
function toSummary(m) {
  return {
    id: m.id,
    order: m.order,
    title: m.title,
    difficulty: m.difficulty,
    vuln: m.vuln,
    sector: m.sector,
    summary: m.summary,
  };
}

/**
 * Safely read a source file that must live inside the exercise directory.
 * @param {string} dir absolute exercise dir
 * @param {string} relPath path relative to the exercises root or exercise dir
 * @returns {string}
 */
function readSource(rel) {
  const abs = path.resolve(EXERCISES_ROOT, rel);
  if (!abs.startsWith(EXERCISES_ROOT + path.sep)) {
    throw new Error('Refusing to read outside the exercises root');
  }
  // Never expose reference-solution or functionality-check source to the client,
  // even if a manifest mistakenly lists one as a displayed source file.
  if (/(^|[/\\])solution[/\\]/.test(abs) || /Solution\.t\.sol|Functionality\.t\.sol/.test(abs)) {
    return '';
  }
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

/**
 * Full detail for one exercise: manifest + source code the UI displays/prefills.
 * The identify answer index and explanation are NOT included (checked server-side).
 * @param {string} id
 * @returns {object}
 */
function getExerciseDetail(id) {
  const m = loadManifest(id);
  const { answerIndex, explanation, ...identifyPublic } = m.identify;

  const vulnerableCode = readSource(`${id}/${m.files.vulnerable}`);
  const extraSources = (m.files.extraSources || []).map(rel => ({
    path: rel,
    code: readSource(rel.startsWith('shared/') ? rel : `${id}/${rel}`),
  }));
  const exploitStub = readSource(`${id}/${m.files.exploitStub}`);

  return {
    ...toSummary(m),
    web2Analog: m.web2Analog,
    hints: m.hints,
    identify: identifyPublic,
    stages: m.stages,
    source: m.source,
    files: m.files,
    vulnerableCode,
    extraSources,
    exploitStub,
  };
}

module.exports = {
  loadManifest,
  listManifests,
  toSummary,
  getExerciseDetail,
  exerciseDir,
};
