'use strict';

const fs = require('fs');
const path = require('path');
const { FINDINGS_DIR } = require('./config');
const { NotFoundError } = require('./validate');

// "Spot the Vuln" recognition drills, generated live from the tagged findings.
// A drill shows a real finding's described mechanism (with the bug name redacted)
// and asks the learner to classify it: first the family, then the exact class.
//
// The findings corpus is the single source of truth — nothing is duplicated.

const VULN_TAG = /^\s*- vuln\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\s*$/gm;
const FIX_TAG = /^\s*- fix\/([a-z0-9-]+)\s*$/m;
const SECTOR_TAG = /^\s*- sector\/([a-z0-9-]+)\s*$/m;
const OPTIONS_PER_QUESTION = 4;

const REDACTED = '░░░';

// Curated cross-cutting giveaways: synonyms/stems a report may use that aren't
// the literal taxonomy tag (e.g. "reentrant" for reentrancy/, "checks-effects").
// Stems use \w* so plurals/inflections are caught ("oracles", "replays").
const CURATED = [
  /reentran\w*/gi, /re-?enter\w*/gi, /checks?-?effects?(?:-?interactions?)?/gi, /\bCEI\b/g,
  /overflow\w*/gi, /underflow\w*/gi, /\bround\w*/gi, /\bprecision\b/gi, /\bdecimals?\b/gi,
  /arithmetic\w*/gi, /off-by-one/gi,
  /oracle\w*/gi, /spot[- ]?price\w*/gi, /price manipulation/gi, /\bTWAP\b/gi, /stale\w*/gi, /manipulat\w*/gi,
  /access[- ]?control\w*/gi, /onlyOwner/gi, /unauthori[sz]\w*/gi, /missing (?:modifier|access|signer|check)/gi,
  /permission\w*/gi, /privilege\w*/gi,
  /denial[- ]of[- ]service/gi, /\bDoS\b/g, /grief\w*/gi, /\bfrozen\b/gi, /\bunbounded\b/gi,
  /\bPDA\b/g, /\bseeds?\b/gi, /reinitiali[sz]\w*/gi, /\bsigner\b/gi,
  /bridge\w*/gi, /replay\w*/gi, /cross-?chain\w*/gi,
  /governance\w*/gi, /\bvot(?:e|ing|es)\b/gi, /proposal\w*/gi,
  /liquidat\w*/gi, /upgrade\w*/gi, /read-?only\w*/gi,
];

// Generic class-leaf tokens that must NOT be redacted (they appear in normal
// prose and aren't the answer signal).
const LEAF_STOP = new Set([
  'contract', 'function', 'funds', 'logic', 'missing', 'check', 'price', 'value',
  'values', 'data', 'call', 'calls', 'loop', 'state', 'error', 'address', 'token',
  'tokens', 'reward', 'rewards', 'vault', 'pool', 'amount', 'based', 'first',
]);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A family name as an inflection-tolerant pattern; short names use word
// boundaries so e.g. "dos" never matches "does".
function familyPattern(family) {
  const esc = escapeRe(family).replace(/-/g, '[- ]?');
  return family.length <= 4 ? new RegExp(`\\b${esc}\\b`, 'gi') : new RegExp(`${esc}\\w*`, 'gi');
}

// Patterns for the class leaf (the part after "family/"): the whole phrase plus
// each distinctive (>=5 char, non-generic) token, all inflection-tolerant.
function leafPatterns(klass) {
  const leaf = klass.split('/').slice(1).join('/');
  if (!leaf) return [];
  const pats = [new RegExp(`${escapeRe(leaf).replace(/[/-]/g, '[- ]?')}\\w*`, 'gi')];
  for (const tok of leaf.split(/[/-]/)) {
    if (tok.length >= 5 && !LEAF_STOP.has(tok)) pats.push(new RegExp(`${escapeRe(tok)}\\w*`, 'gi'));
  }
  return pats;
}

let cache = null;

// ── Index ─────────────────────────────────────────────────────────────────────

function familyOf(klass) {
  return klass.split('/')[0];
}

/** Scan findings/ once, indexing every finding that carries a vuln/ tag. */
function buildIndex() {
  if (cache) return cache;
  const byId = new Map();
  const familyClasses = new Map(); // family -> Set(class)

  for (const file of fs.readdirSync(FINDINGS_DIR).filter((f) => f.endsWith('.md'))) {
    const content = fs.readFileSync(path.join(FINDINGS_DIR, file), 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const fm = fmMatch ? fmMatch[1] : '';
    if (!fm) continue;

    const vulnMatches = [...fm.matchAll(VULN_TAG)].map((m) => m[1]);
    if (!vulnMatches.length) continue;

    const klass = vulnMatches[0];
    const family = familyOf(klass);
    const id = file.replace(/\.md$/, '');
    byId.set(id, {
      id,
      family,
      klass,
      sector: (fm.match(SECTOR_TAG) || [])[1] || null,
      fixTag: (fm.match(FIX_TAG) || [])[1] || null,
    });
    if (!familyClasses.has(family)) familyClasses.set(family, new Set());
    familyClasses.get(family).add(klass);
  }

  cache = {
    byId,
    ids: [...byId.keys()],
    families: [...familyClasses.keys()].sort(),
    familyClasses,
  };
  return cache;
}

function hasDrill(id) {
  return buildIndex().byId.has(id);
}

// ── Prompt extraction + redaction ───────────────────────────────────────────────

// Redact giveaways from a prompt. `meta` (the served finding's family/klass) makes
// redaction self-defending: a new tag's own name/tokens are always stripped, so a
// future class can't silently leak even if CURATED doesn't list it.
function redact(text, meta) {
  let out = CURATED.reduce((acc, re) => acc.replace(re, REDACTED), text);
  if (meta && meta.family) {
    out = out.replace(familyPattern(meta.family), REDACTED);
    for (const p of leafPatterns(meta.klass)) out = out.replace(p, REDACTED);
  }
  return out;
}

/** Pull the human description (Summary section, else post-frontmatter body). */
function rawDescription(content) {
  const summary = content.match(/##\s*Summary\s*\n([\s\S]*?)(?:\n##\s|\n*$)/);
  if (summary) return summary[1].trim();
  const afterFm = content.replace(/^---[\s\S]*?\n---\n/, '');
  return afterFm.replace(/^#.*\n/, '').replace(/^- \w+:.*\n/gm, '').trim();
}

/** The redacted, length-capped prompt shown to the learner (no bug name). */
function promptFor(id) {
  const meta = buildIndex().byId.get(id);
  if (!meta) throw new NotFoundError(`No drill '${id}'`);
  const content = fs.readFileSync(path.join(FINDINGS_DIR, `${id}.md`), 'utf8');
  const desc = rawDescription(content).slice(0, 1200);
  return redact(desc, meta);
}

// ── Multiple-choice option building ─────────────────────────────────────────────

// Deterministic shuffle seeded by a string — avoids Math.random (and keeps tests
// stable) while still mixing the correct answer among distractors.
function seededShuffle(items, seed) {
  const arr = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildOptions(correct, pool, seed) {
  const distractors = seededShuffle(pool.filter((x) => x !== correct), seed).slice(0, OPTIONS_PER_QUESTION - 1);
  return seededShuffle([correct, ...distractors], `${seed}:opts`);
}

function familyOptions(id) {
  const { byId, families } = buildIndex();
  return buildOptions(byId.get(id).family, families, id);
}

function classOptions(id) {
  const idx = buildIndex();
  const { family, klass } = idx.byId.get(id);
  const siblings = [...(idx.familyClasses.get(family) || [])];
  // Prefer same-family siblings; pad with other classes if a family is small.
  let pool = siblings;
  if (pool.length < OPTIONS_PER_QUESTION) {
    const all = [...idx.familyClasses.values()].flatMap((s) => [...s]);
    pool = [...new Set([...siblings, ...all])];
  }
  return buildOptions(klass, pool, `${id}:class`);
}

// ── Public drill operations ─────────────────────────────────────────────────────

/** A random drill, excluding ids the client has recently seen. */
function nextDrill(excludeIds = []) {
  const { ids } = buildIndex();
  const exclude = new Set(excludeIds);
  const pool = ids.filter((id) => !exclude.has(id));
  const choosable = pool.length ? pool : ids;
  const picked = choosable[Math.floor(Math.random() * choosable.length)];
  return drillView(picked);
}

function drillView(id) {
  return { id, prompt: promptFor(id), familyOptions: familyOptions(id) };
}

function gradeFamily(id, value) {
  const meta = buildIndex().byId.get(id);
  if (!meta) throw new NotFoundError(`No drill '${id}'`);
  const correct = value === meta.family;
  return { correct, answer: meta.family, classOptions: classOptions(id) };
}

/** Title (real bug name) + source URL — shown only AFTER the class is answered. */
function revealMeta(id) {
  const content = fs.readFileSync(path.join(FINDINGS_DIR, `${id}.md`), 'utf8');
  return {
    title: (content.match(/^#\s+(.+)$/m) || [])[1] || id,
    source: (content.match(/^- source:\s*(\S+)/m) || [])[1] || null,
  };
}

function gradeClass(id, value) {
  const meta = buildIndex().byId.get(id);
  if (!meta) throw new NotFoundError(`No drill '${id}'`);
  const correct = value === meta.klass;
  const { title, source } = revealMeta(id);
  return {
    correct,
    answer: meta.klass,
    reveal: { findingId: id, title, source, klass: meta.klass, family: meta.family, sector: meta.sector, fixTag: meta.fixTag },
  };
}

function stats() {
  const idx = buildIndex();
  return {
    total: idx.ids.length,
    families: idx.families.map((f) => ({ family: f, classes: [...idx.familyClasses.get(f)].length })),
  };
}

module.exports = {
  buildIndex,
  hasDrill,
  redact,
  promptFor,
  nextDrill,
  drillView,
  gradeFamily,
  gradeClass,
  stats,
  _internals: { seededShuffle, classOptions, familyOptions },
};
