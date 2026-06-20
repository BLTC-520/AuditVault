'use strict';

const http = require('http');
const { handleApi } = require('./src/api');
const { serveStatic } = require('./src/static');
const { PORT } = require('./src/config');

// Entry point for the AuditVault CTF learning website.
// Routes /api/* to the JSON API; everything else is served from public/.

async function requestHandler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (await handleApi(req, res, pathname)) return;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain', Allow: 'GET, HEAD' });
      res.end('Method Not Allowed');
      return;
    }
    serveStatic(res, pathname);
  } catch (err) {
    process.stderr.write(`[server] ${err && err.stack ? err.stack : err}\n`);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal error');
    }
  }
}

function createServer() {
  return http.createServer(requestHandler);
}

// Bind to loopback only — this tool executes user-supplied Solidity locally and
// must not be exposed on the network. Only start when run directly (not on import).
if (require.main === module) {
  createServer().listen(PORT, '127.0.0.1', () => {
    process.stdout.write(`AuditVault CTF running at http://127.0.0.1:${PORT}\n`);
  });
}

module.exports = { createServer, requestHandler };
