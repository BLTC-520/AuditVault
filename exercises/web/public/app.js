'use strict';

// AuditVault CTF — front-end SPA. Talks to the JSON API in ../src/api.js.
// No framework, no build step: plain DOM + fetch.

const PROGRESS_KEY = 'auditvault-ctf-progress';
const STAGES = ['identify', 'exploit', 'fix'];

const state = {
  list: [],
  detail: null,
  stage: 'identify',
  hintsShown: 0,
};

// ── Helpers ──────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const k of kids) node.append(k);
  return node;
};
async function getJSON(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Request failed');
  return body.data;
}
async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Request failed');
  return body.data;
}

// ── Progress (localStorage) ──────────────────────────────
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}
function markDone(id, stage) {
  const p = loadProgress();
  p[id] = { ...(p[id] || {}), [stage]: true };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  renderList();
  renderTabs();
}
function stageDone(id, stage) {
  return Boolean(loadProgress()[id]?.[stage]);
}

// ── Sidebar list ─────────────────────────────────────────
function renderList() {
  const ul = $('#exercise-list');
  ul.replaceChildren();
  for (const ex of state.list) {
    const prog = loadProgress()[ex.id] || {};
    const doneCount = STAGES.filter((s) => prog[s]).length;
    const li = el('li', { className: state.detail?.id === ex.id ? 'active' : '' });
    li.append(
      el('div', { className: 'ex-title', textContent: `${String(ex.order).padStart(2, '0')}. ${ex.title}` }),
      el('div', { className: 'ex-meta' },
        el('span', { className: `badge ${ex.difficulty}`, textContent: ex.difficulty }),
        el('span', { className: doneCount === 3 ? 'done' : '', textContent: `${doneCount}/3` })),
    );
    li.addEventListener('click', () => selectExercise(ex.id));
    ul.append(li);
  }
}

// ── Load an exercise ─────────────────────────────────────
async function selectExercise(id) {
  state.detail = await getJSON(`/api/exercises/${id}`);
  state.hintsShown = 0;
  // resume at the first incomplete stage
  state.stage = STAGES.find((s) => !stageDone(id, s)) || 'fix';
  $('#welcome').hidden = true;
  $('#exercise').hidden = false;
  renderHeader();
  renderList();
  renderTabs();
  renderHints();
  renderStagePanel();
}

function renderHeader() {
  const d = state.detail;
  $('#exercise-header').replaceChildren(
    el('h2', { textContent: `${String(d.order).padStart(2, '0')}. ${d.title}` }),
    el('div', { className: 'badges' },
      el('span', { className: `badge ${d.difficulty}`, textContent: d.difficulty }),
      el('span', { className: 'badge', textContent: d.vuln }),
      el('span', { className: 'badge', textContent: `sector/${d.sector}` })),
    el('p', { className: 'summary', textContent: d.summary }),
    el('p', { className: 'web2', textContent: `Web2 analog: ${d.web2Analog}` }),
  );
}

// ── Stage tabs ───────────────────────────────────────────
function stageUnlocked(stage) {
  if (stage === 'identify') return true;
  if (stage === 'exploit') return stageDone(state.detail.id, 'identify');
  return stageDone(state.detail.id, 'exploit');
}
function renderTabs() {
  document.querySelectorAll('.stage-tab').forEach((tab) => {
    const stage = tab.dataset.stage;
    tab.classList.toggle('active', stage === state.stage);
    tab.classList.toggle('done', state.detail && stageDone(state.detail.id, stage));
    tab.disabled = state.detail ? !stageUnlocked(stage) : true;
    tab.onclick = () => { if (stageUnlocked(stage)) { state.stage = stage; renderTabs(); renderStagePanel(); } };
  });
}

// ── Stage panels ─────────────────────────────────────────
function renderStagePanel() {
  const panel = $('#stage-panel');
  panel.replaceChildren();
  if (state.stage === 'identify') return renderIdentify(panel);
  if (state.stage === 'exploit') return renderExploit(panel);
  return renderFix(panel);
}

function renderIdentify(panel) {
  const d = state.detail;
  const form = el('form');
  const opts = el('ul', { className: 'options' });
  d.identify.options.forEach((opt, i) => {
    const label = el('label');
    label.append(
      Object.assign(document.createElement('input'), { type: 'radio', name: 'answer', value: String(i) }),
      el('span', { textContent: opt }));
    opts.append(el('li', {}, label));
  });
  const out = el('div');
  const btn = el('button', { className: 'run', type: 'submit', textContent: 'Submit answer' });
  form.append(el('p', { textContent: d.identify.question }), opts, btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const choice = form.querySelector('input[name=answer]:checked');
    if (!choice) return;
    const r = await postJSON(`/api/exercises/${d.id}/run`, { stage: 'identify', answerIndex: Number(choice.value) });
    showResult(out, r);
    if (r.passed) { markDone(d.id, 'identify'); }
  });
  panel.append(el('p', { className: 'summary', textContent: 'Read the contract below, then pick the line/decision that introduces the bug.' }),
    codeBlock(d.vulnerableCode), form, out);
}

function renderExploit(panel) {
  const d = state.detail;
  const editor = el('textarea', { className: 'editor', spellcheck: false, value: d.exploitStub });
  enableTab(editor);
  const out = el('div');
  const btn = el('button', { className: 'run', textContent: 'Run exploit' });
  btn.addEventListener('click', () => runCode(btn, out, 'exploit', editor.value, d.id));
  panel.append(
    el('p', { className: 'summary', textContent: 'Complete the exploit test so it drains the target. The vulnerable contract:' }),
    codeBlock(d.vulnerableCode),
    el('p', { className: 'hint-note', textContent: `Edit ${d.files.exploitStub}:` }),
    editor, btn, out);
}

function renderFix(panel) {
  const d = state.detail;
  if (d.stages.fix.mode === 'explain') {
    panel.append(
      el('p', { className: 'summary', textContent: 'This bug is fixed at the architecture level, so it is not auto-graded here. The recommended fix:' }),
      el('div', { className: 'result info' }, el('div', { className: 'reason', textContent: d.stages.fix.fixTag }),
        el('div', { textContent: d.stages.fix.recommendedFix })));
    markDone(d.id, 'fix');
    return;
  }
  const editor = el('textarea', { className: 'editor', spellcheck: false, value: d.vulnerableCode });
  enableTab(editor);
  const out = el('div');
  const btn = el('button', { className: 'run', textContent: 'Run fix check' });
  btn.addEventListener('click', () => runCode(btn, out, 'fix', editor.value, d.id));
  panel.append(
    el('p', { className: 'summary', textContent: 'Patch the contract so the exploit fails but normal use still works. Edit and re-check:' }),
    editor, btn, out);
}

async function runCode(btn, out, stage, code, id) {
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Running forge…';
  out.replaceChildren(el('p', { className: 'hint-note', textContent: 'Compiling and running the test suite — this can take a few seconds.' }));
  try {
    const r = await postJSON(`/api/exercises/${id}/run`, { stage, code });
    showResult(out, r);
    if (r.passed) markDone(id, stage);
  } catch (err) {
    showResult(out, { passed: false, reason: err.message });
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// ── Shared rendering ─────────────────────────────────────
function codeBlock(text) {
  // textContent is categorically XSS-safe (no HTML parsing), unlike innerHTML.
  return el('pre', { className: 'code-block', textContent: text });
}
function showResult(container, r) {
  const cls = r.passed ? 'pass' : r.passed === null ? 'info' : 'failresult';
  const node = el('div', { className: `result ${cls}` }, el('div', { className: 'reason', textContent: r.reason || '' }));
  if (r.explanation) node.append(el('div', { textContent: r.explanation }));
  if (r.output) node.append(el('pre', { textContent: r.output }));
  container.replaceChildren(node);
}
function renderHints() {
  $('#hints').replaceChildren();
  state.hintsShown = 0;
  $('#hint-btn').onclick = () => {
    const hints = state.detail.hints || [];
    if (state.hintsShown >= hints.length) return;
    $('#hints').append(el('li', { textContent: hints[state.hintsShown] }));
    state.hintsShown += 1;
    if (state.hintsShown >= hints.length) $('#hint-btn').textContent = 'No more hints';
  };
}

// Tab key inserts spaces instead of moving focus.
function enableTab(textarea) {
  textarea.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const { selectionStart: s, selectionEnd: en, value } = textarea;
    textarea.value = value.slice(0, s) + '    ' + value.slice(en);
    textarea.selectionStart = textarea.selectionEnd = s + 4;
  });
}

// ── Drills (recognition mode) ─────────────────────────────
const DRILL_STATS_KEY = 'auditvault-ctf-drillstats';
const drill = { current: null, recent: [] };

function loadDrillStats() {
  try { return JSON.parse(localStorage.getItem(DRILL_STATS_KEY)) || {}; }
  catch { return {}; }
}
function recordDrill(part, key, correct) {
  const s = loadDrillStats();
  s.byFamily = s.byFamily || {};
  if (part === 'family') {
    const f = s.byFamily[key] || { seen: 0, correct: 0 };
    f.seen += 1; if (correct) f.correct += 1;
    s.byFamily[key] = f;
  } else {
    s.classSeen = (s.classSeen || 0) + 1;
    if (correct) s.classCorrect = (s.classCorrect || 0) + 1;
  }
  localStorage.setItem(DRILL_STATS_KEY, JSON.stringify(s));
  renderDrillStats();
}
function renderDrillStats() {
  const box = $('#drill-stats');
  if (!box) return;
  const s = loadDrillStats();
  const fam = Object.values(s.byFamily || {});
  const seen = fam.reduce((a, f) => a + f.seen, 0);
  const correct = fam.reduce((a, f) => a + f.correct, 0);
  const rows = Object.entries(s.byFamily || {}).sort().map(([f, v]) =>
    el('div', { className: 'stat-row' },
      el('span', { textContent: f }),
      el('span', { textContent: `${v.correct}/${v.seen}` })));
  box.replaceChildren(
    el('div', { className: 'stat-total', textContent: `Family ${correct}/${seen} · Class ${s.classCorrect || 0}/${s.classSeen || 0}` }),
    ...rows);
}

async function loadNextDrill() {
  $('#drill-feedback').replaceChildren();
  $('#drill-question').replaceChildren();
  $('#drill-next').hidden = true;
  try {
    const d = await getJSON(`/api/drills/next?exclude=${encodeURIComponent(drill.recent.join(','))}`);
    drill.current = d;
    drill.recent = [d.id, ...drill.recent].slice(0, 30);
    $('#drill-prompt').textContent = d.prompt;
    renderDrillQuestion('What family of bug is this?', d.familyOptions, answerFamily);
  } catch (err) {
    $('#drill-feedback').replaceChildren(el('div', { className: 'drill-fb no', textContent: err.message }));
  }
}

function renderDrillQuestion(title, options, onPick) {
  const wrap = el('div', { className: 'drill-options' });
  options.forEach((opt) => {
    const b = el('button', { className: 'drill-opt', textContent: opt });
    b.addEventListener('click', () => { [...wrap.children].forEach((c) => { c.disabled = true; }); onPick(opt, b); });
    wrap.append(b);
  });
  $('#drill-question').replaceChildren(el('p', { className: 'drill-q', textContent: title }), wrap);
}

function markPick(btn, correct, answer) {
  if (!btn) return;
  [...btn.parentElement.children].forEach((c) => { if (c.textContent === answer) c.classList.add('opt-correct'); });
  if (!correct) btn.classList.add('opt-wrong');
}
function appendFeedback(text, ok) {
  $('#drill-feedback').append(el('div', { className: `drill-fb ${ok ? 'ok' : 'no'}`, textContent: text }));
}

async function answerFamily(value, btn) {
  const r = await postJSON(`/api/drills/${drill.current.id}/answer`, { step: 'family', value });
  recordDrill('family', r.answer, r.correct);
  markPick(btn, r.correct, r.answer);
  appendFeedback(r.correct ? 'Family correct.' : `Family: it was "${r.answer}".`, r.correct);
  renderDrillQuestion('Now the exact class:', r.classOptions, answerClass);
}

async function answerClass(value, btn) {
  const r = await postJSON(`/api/drills/${drill.current.id}/answer`, { step: 'class', value });
  recordDrill('class', r.answer, r.correct);
  markPick(btn, r.correct, r.answer);
  revealDrill(r);
  $('#drill-next').hidden = false;
}

function revealDrill(r) {
  const rev = r.reveal;
  const card = el('div', { className: `result ${r.correct ? 'pass' : 'failresult'}` },
    el('div', { className: 'reason', textContent: r.correct ? `Correct — ${rev.klass}` : `It was: ${rev.klass}` }),
    el('div', { textContent: `Real finding: ${rev.title}` }));
  if (rev.fixTag) card.append(el('div', { textContent: `Typical fix: fix/${rev.fixTag}` }));
  if (rev.sector) card.append(el('div', { textContent: `Sector: ${rev.sector}` }));
  if (rev.source && /^https?:\/\//.test(rev.source)) {
    card.append(el('div', {}, el('a', { href: rev.source, textContent: 'Read the original report ↗', target: '_blank', rel: 'noopener' })));
  }
  $('#drill-feedback').append(card);
}

// ── Mode switching ────────────────────────────────────────
function setMode(mode) {
  const drillMode = mode === 'drills';
  document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  $('#exercise-list').hidden = drillMode;
  $('#drill-side').hidden = !drillMode;
  $('#drill').hidden = !drillMode;
  if (drillMode) {
    $('#welcome').hidden = true;
    $('#exercise').hidden = true;
    renderDrillStats();
    if (!drill.current) loadNextDrill();
  } else {
    $('#exercise').hidden = !state.detail;
    $('#welcome').hidden = Boolean(state.detail);
  }
}

// ── Boot ─────────────────────────────────────────────────
(async () => {
  document.querySelectorAll('.mode-btn').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#drill-next').addEventListener('click', loadNextDrill);
  try {
    state.list = await getJSON('/api/exercises');
    renderList();
  } catch (err) {
    $('#main').replaceChildren(el('p', { textContent: `Failed to load exercises: ${err.message}` }));
  }
})();
