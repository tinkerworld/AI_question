const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Dynamic Network API Base Resolution', () => {
  function resolveApiBase(windowObj, envObj = {}) {
    const envUrl = envObj.VITE_API_BASE_URL;

    if (typeof windowObj !== 'undefined' && windowObj.location) {
      const { hostname } = windowObj.location;
      const isClientOnLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

      if (envUrl) {
        if (!isClientOnLocalhost && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(envUrl)) {
          return '/api/v1';
        }
        return envUrl;
      }

      return '/api/v1';
    }

    return envUrl || 'http://localhost:4043/api/v1';
  }

  test('routes through /api/v1 proxy on local development', () => {
    const result = resolveApiBase({
      location: { protocol: 'http:', hostname: 'localhost', port: '3000' },
    });
    assert.strictEqual(result, '/api/v1');
  });

  test('routes through /api/v1 proxy on LAN IP (192.168.x.x) on port 3000 to prevent firewall timeout', () => {
    const result = resolveApiBase({
      location: { protocol: 'http:', hostname: '192.168.29.80', port: '3000' },
    });
    assert.strictEqual(result, '/api/v1');
  });

  test('replaces hardcoded localhost in VITE_API_BASE_URL with /api/v1 when accessing from LAN device', () => {
    const result = resolveApiBase(
      {
        location: { protocol: 'http:', hostname: '192.168.1.100', port: '3000' },
      },
      { VITE_API_BASE_URL: 'http://localhost:4043/api/v1' }
    );
    assert.strictEqual(result, '/api/v1');
  });

  test('preserves explicit external URL in VITE_API_BASE_URL when specified', () => {
    const result = resolveApiBase(
      {
        location: { protocol: 'http:', hostname: '192.168.1.100', port: '3000' },
      },
      { VITE_API_BASE_URL: 'https://api.external.com/api/v1' }
    );
    assert.strictEqual(result, 'https://api.external.com/api/v1');
  });

  test('falls back cleanly to http://localhost:4043/api/v1 in non-browser/SSR environment', () => {
    const result = resolveApiBase(undefined);
    assert.strictEqual(result, 'http://localhost:4043/api/v1');
  });
});
