'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { serveStatic } = require('../src/static');

// Minimal mock of http.ServerResponse capturing the synchronous paths
// (403/404). The 200 streaming path is covered via the HTTP server in api.test.js.
function mockRes() {
  return {
    statusCode: null,
    body: '',
    writeHead(status) { this.statusCode = status; },
    end(chunk) { if (chunk) this.body += chunk; },
  };
}

test('serveStatic blocks path traversal with 403', () => {
  const res = mockRes();
  serveStatic(res, '/../server.js');
  assert.equal(res.statusCode, 403);
});

test('serveStatic returns 404 for a missing file', () => {
  const res = mockRes();
  serveStatic(res, '/definitely-missing.css');
  assert.equal(res.statusCode, 404);
});
