'use strict';

const path = require('path');

// The web app lives at exercises/web/ ; the Foundry project root is exercises/.
const WEB_DIR = path.resolve(__dirname, '..');
const EXERCISES_ROOT = path.resolve(WEB_DIR, '..');
const PUBLIC_DIR = path.join(WEB_DIR, 'public');

module.exports = {
  WEB_DIR,
  EXERCISES_ROOT,
  PUBLIC_DIR,
  // Hard limits at the trust boundary.
  MAX_CODE_BYTES: 40_000,
  FORGE_TIMEOUT_MS: 90_000,
  PORT: Number(process.env.PORT) || 4626,
  STAGES: ['identify', 'exploit', 'fix'],
};
