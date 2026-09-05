const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Dynamic Network API Base Resolution', () => {
  function resolveApiBase(windowObj, envObj = {}) {
    const envUrl = envObj.VITE_API_BASE_URL;

    if (typeof windowObj !== 'undefined' && windowObj.location) {
      const { protocol, hostname, port } = windowObj.location;
      const formattedHost =
        hostname.includes(':') && !hostname.startsWith('[')
          ? `[${hostname}]`
          : hostname;

      const isClientOnLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

      if (envUrl) {
        if (!isClientOnLocalhost && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(envUrl)) {
          return envUrl.replace(/localhost|127\.0\.0\.1/i, formattedHost);
        }
        return envUrl;
      }

      const apiPort = envObj.VITE_API_PORT || '4043';

      if (!port || port === '80' || port === '443') {
        return `${protocol}//${formattedHost}/api/v1`;
      }

      return `${protocol}//${formattedHost}:${apiPort}/api/v1`;
    }

    return envUrl || 'http://localhost:4043/api/v1';
  }

  test('resolves http://localhost:4043/api/v1 on local development', () => {
    const result = resolveApiBase({
      location: { protocol: 'http:', hostname: 'localhost', port: '3000' },
    });
    assert.strictEqual(result, 'http://localhost:4043/api/v1');
  });

  test('dynamically adapts to LAN IP (192.168.x.x) on port 3000', () => {
    const result = resolveApiBase({
      location: { protocol: 'http:', hostname: '192.168.29.80', port: '3000' },
    });
    assert.strictEqual(result, 'http://192.168.29.80:4043/api/v1');
  });

  test('dynamically adapts to alternative LAN IP (10.0.0.x)', () => {
    const result = resolveApiBase({
      location: { protocol: 'http:', hostname: '10.0.0.15', port: '3000' },
    });
    assert.strictEqual(result, 'http://10.0.0.15:4043/api/v1');
  });

  test('replaces hardcoded localhost in VITE_API_BASE_URL when accessing from LAN device', () => {
    const result = resolveApiBase(
      {
        location: { protocol: 'http:', hostname: '192.168.1.100', port: '3000' },
      },
      { VITE_API_BASE_URL: 'http://localhost:4043/api/v1' }
    );
    assert.strictEqual(result, 'http://192.168.1.100:4043/api/v1');
  });

  test('formats IPv6 network addresses correctly with brackets', () => {
    const result = resolveApiBase({
      location: { protocol: 'http:', hostname: 'fe80::1', port: '3000' },
    });
    assert.strictEqual(result, 'http://[fe80::1]:4043/api/v1');
  });

  test('routes standard port 443 / reverse proxy to origin /api/v1', () => {
    const result = resolveApiBase({
      location: { protocol: 'https:', hostname: 'examos.myorg.internal', port: '443' },
    });
    assert.strictEqual(result, 'https://examos.myorg.internal/api/v1');
  });

  test('falls back cleanly to localhost:4043 in non-browser/SSR environment', () => {
    const result = resolveApiBase(undefined);
    assert.strictEqual(result, 'http://localhost:4043/api/v1');
  });
});
