'use strict';
const http = require('node:http');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = process.env.EXAMOS_ROOT;
if (!root || !path.isAbsolute(root)) throw new Error('EXAMOS_ROOT is required');
const express = createRequire(path.join(root, 'Exam/package.json'))('express');
const app = express();
app.disable('x-powered-by');
const apiPort = Number(process.env.API_PORT);
const webPort = Number(process.env.WEB_PORT);
if (![apiPort, webPort].every(p => Number.isInteger(p) && p >= 1024 && p <= 65535)) {
  throw new Error('Valid API_PORT and WEB_PORT are required');
}
app.use((req, res, next) => {
  if (!req.url.startsWith('/api/')) return next();
  const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` };
  // Strip hop-by-hop headers; upstream destination is fixed, never user supplied.
  const hop = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
  const connectionHeaders = String(headers.connection || '').split(',').map(x => x.trim().toLowerCase());
  for (const name of [...hop, ...connectionHeaders]) delete headers[name];
  const upstreamPath = req.url === '/api/__cicd/ready' ? '/ready' : req.url;
  const upstream = http.request({ hostname: '127.0.0.1', port: apiPort, path: upstreamPath,
    method: req.method, headers, timeout: 300000 }, reply => {
    const responseHeaders = { ...reply.headers };
    for (const name of hop) delete responseHeaders[name];
    res.writeHead(reply.statusCode || 502, responseHeaders);
    reply.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => {
    if (!res.headersSent) res.status(502).json({ error: 'API unavailable' });
    else res.destroy();
  });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => { if (!res.writableFinished) upstream.destroy(); });
  req.pipe(upstream);
});
const dist = path.join(root, 'Exam/apps/web/dist');
app.use(express.static(dist, { dotfiles: 'deny', maxAge: 0, index: false }));
app.use((req, res) => {
  if (req.method !== 'GET' || path.extname(req.path)) return res.sendStatus(404);
  res.sendFile(path.join(dist, 'index.html'));
});
const server = app.listen(webPort, '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
});
