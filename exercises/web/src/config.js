'use strict';

const path = require('path');

// The web app lives at exercises/web/ ; the Foundry project root is exercises/ ;
// the vault root (one level above) holds findings/ used by the recognition drills.
const WEB_DIR = path.resolve(__dirname, '..');
const EXERCISES_ROOT = path.resolve(WEB_DIR, '..');
const VAULT_ROOT = path.resolve(EXERCISES_ROOT, '..');
const FINDINGS_DIR = path.join(VAULT_ROOT, 'findings');
const PUBLIC_DIR = path.join(WEB_DIR, 'public');

module.exports = {
  WEB_DIR,
  EXERCISES_ROOT,
  VAULT_ROOT,
  FINDINGS_DIR,
  PUBLIC_DIR,
  // Hard limits at the trust boundary.
  MAX_CODE_BYTES: 40_000,
  FORGE_TIMEOUT_MS: 90_000,
  PORT: Number(process.env.PORT) || 4626,
  STAGES: ['identify', 'exploit', 'fix'],
};
