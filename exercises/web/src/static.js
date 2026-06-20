'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR } = require('./config');

// Minimal static file server for the public/ SPA assets. Refuses any path that
// escapes PUBLIC_DIR (path-traversal guard).

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/**
 * Serve a static asset for the given URL path.
 * @param {import('http').ServerResponse} res
 * @param {string} pathname
 * @returns {boolean} true if a file was served (or a 404 sent for a public path)
 */
function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const abs = path.resolve(PUBLIC_DIR, rel);

  if (abs !== PUBLIC_DIR && !abs.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return true;
  }

  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return true;
  }

  const type = CONTENT_TYPES[path.extname(abs)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(abs).pipe(res);
  return true;
}

module.exports = { serveStatic };
