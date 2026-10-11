const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('production web server serves only build output and proxies API requests', { timeout: 15000 }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'examos-web-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'Exam/apps/web/dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'Exam/package.json'), '{}');
  fs.writeFileSync(path.join(root, 'Exam/.env'), 'DO_NOT_SERVE_BACKEND_SECRET');
  fs.writeFileSync(path.join(root, 'Exam/apps/web/dist/index.html'), '<html>tested build</html>');
  fs.writeFileSync(path.join(root, 'Exam/apps/web/dist/__release.json'), '{"commit":"test-sha"}');
  fs.symlinkSync(process.env.EXAMOS_TEST_NODE_MODULES || path.resolve('Exam/node_modules'), path.join(root, 'Exam/node_modules'), 'dir');
  const api = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ url: req.url, method: req.method, body }));
    });
  });
  api.listen(0, '127.0.0.1'); await once(api, 'listening');
  t.after(() => { api.closeAllConnections(); api.close(); });
  const reserve = http.createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const child = spawn(process.execPath, [path.resolve(__dirname, '../serve-web.cjs')], {
    env: { ...process.env, EXAMOS_ROOT: root, API_PORT: String(api.address().port), WEB_PORT: String(port) },
    stdio: 'ignore'
  });
  t.after(async () => { if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(base); if (r.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'server starts');
  assert.match(await (await fetch(base + '/student/dashboard')).text(), /tested build/);
  assert.deepEqual(await (await fetch(base + '/__release.json')).json(), { commit: 'test-sha' });
  const response = await fetch(base + '/api/v1/example?x=1', { method: 'POST', body: 'payload' });
  assert.deepEqual(await response.json(), { url: '/api/v1/example?x=1', method: 'POST', body: 'payload' });
  assert.equal((await fetch(base + '/package.json')).status, 404);
  assert.doesNotMatch(await (await fetch(base + '/.env')).text(), /DO_NOT_SERVE_BACKEND_SECRET/);
});
