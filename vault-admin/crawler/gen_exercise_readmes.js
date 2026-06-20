#!/usr/bin/env node
'use strict';

// Generate per-exercise README.md (and the exercises/ index) from each
// exercise's manifest.json. The manifest is the single source of truth — edit
// it, then re-run this. Idempotent: every run overwrites the generated READMEs
// (each carries `generated: true` in its frontmatter) with identical output.
// Do not hand-edit the generated READMEs; edit the manifest instead.

const fs   = require('fs');
const path = require('path');

const VAULT_ROOT    = path.resolve(__dirname, '../..');
const EXERCISES_DIR = path.join(VAULT_ROOT, 'exercises');

// ── Load ──────────────────────────────────────────────────────────────────────

/** Read + parse every exercise manifest.json, sorted by `order`. */
function loadManifests() {
  if (!fs.existsSync(EXERCISES_DIR)) return [];
  return fs.readdirSync(EXERCISES_DIR)
    .map(name => path.join(EXERCISES_DIR, name, 'manifest.json'))
    .filter(p => fs.existsSync(p))
    .map(p => {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (err) {
        throw new Error(`Invalid manifest ${p}: ${err.message}`);
      }
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

// ── Render ────────────────────────────────────────────────────────────────────

function pad2(n) {
  return String(n).padStart(2, '0');
}

function hintBlocks(hints) {
  return hints
    .map((h, i) => `<details>\n<summary>Hint ${i + 1}</summary>\n\n${h}\n</details>`)
    .join('\n\n');
}

function fixSection(m) {
  const fix = m.stages?.fix;
  if (!fix) return '';
  if (fix.mode === 'explain') {
    return `4. **Fix** *(discussion)* — this bug's real fix is architectural, so it is not ` +
      `auto-graded. Recommended fix:\n\n   > ${fix.recommendedFix}\n\n   See \`${fix.fixTag}\` in the taxonomy.`;
  }
  return `4. **Fix** — patch \`${fix.editFile}\` so the exploit no longer works while normal use still ` +
    `passes. Graded by re-running the solution exploit (must now fail) and \`solution/Functionality.t.sol\` ` +
    `(must still pass). Mitigation family: \`${fix.fixTag}\`.`;
}

function renderExercise(m) {
  const tags = [
    '  - exercise',
    `  - ${m.vuln}`,
    `  - sector/${m.sector}`,
    `  - difficulty/${m.difficulty}`,
  ].join('\n');

  const matchPath = `${m.id}/test/*`;

  return (
    `---\ntags:\n${tags}\ngenerated: true\n---\n` +
    `# ${pad2(m.order)}. ${m.title}\n\n` +
    `> **Difficulty:** ${m.difficulty} · **Bug class:** \`${m.vuln}\` · **Source finding:** [[${m.source}]]\n\n` +
    `${m.summary}\n\n` +
    `**Web2 analog:** ${m.web2Analog}\n\n` +
    `## How to play\n` +
    `1. Read the vulnerable contract: \`${m.files.vulnerable}\`` +
    (m.files.extraSources?.length ? ` (context: ${m.files.extraSources.map(s => `\`${s}\``).join(', ')})` : '') + `\n` +
    `2. **Identify** — answer: *${m.identify.question}*\n` +
    `3. **Exploit** — complete \`${m.files.exploitStub}\`, then run:\n   \`\`\`bash\n   forge test --match-path '${matchPath}' -vvv\n   \`\`\`\n` +
    `${fixSection(m)}\n\n` +
    `## Hints\n\n${hintBlocks(m.hints)}\n\n` +
    `## Learn more\n` +
    `- Real-world finding: [[${m.source}]]\n` +
    `- Sector checklist: [[${m.sector}-checklist]]\n` +
    `- Reference solution (spoiler): \`${m.files.solutionTest}\`\n`
  );
}

function renderIndex(manifests) {
  const rows = manifests
    .map(m => `| ${pad2(m.order)} | [[${m.id}/README\\|${m.title}]] | ${m.difficulty} | \`${m.vuln}\` |`)
    .join('\n');

  return (
    `---\ntags:\n  - exercise\ngenerated: true\n---\n` +
    `# AuditVault CTF Exercises\n\n` +
    `Hands-on Foundry exercises. For each one you **identify** the bug, **exploit** it, then **fix** it — ` +
    `every exercise is anchored to a real finding in the vault.\n\n` +
    `## Setup\n\`\`\`bash\ncd exercises\nforge install foundry-rs/forge-std   # first time only\nforge build\n\`\`\`\n\n` +
    `Run one exercise's exploit:\n\`\`\`bash\nforge test --match-path '03-vault-inflation/test/*' -vvv\n\`\`\`\n\n` +
    `Prefer a guided UI? See \`web/\` for the local learning website.\n\n` +
    `## Curriculum\n\n| # | Exercise | Difficulty | Bug class |\n| ---: | --- | --- | --- |\n${rows}\n`
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const manifests = loadManifests();
  if (!manifests.length) {
    console.log('No exercise manifests found; nothing to generate.');
    return;
  }

  let written = 0;
  for (const m of manifests) {
    fs.writeFileSync(path.join(EXERCISES_DIR, m.id, 'README.md'), renderExercise(m));
    written++;
  }
  fs.writeFileSync(path.join(EXERCISES_DIR, 'README.md'), renderIndex(manifests));

  console.log(`Wrote ${written} exercise READMEs + index.`);
}

main();
