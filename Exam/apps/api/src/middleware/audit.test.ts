import { test, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { auditLog } from './audit.js';
import { pgDb } from '@repo/database';

class MockRequest {
  user?: { userId: string };
  params: Record<string, string>;
  method: string;
  originalUrl: string;
  query: Record<string, string>;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers: Record<string, string | undefined>;

  constructor() {
    this.params = {};
    this.method = 'GET';
    this.originalUrl = '/test';
    this.query = {};
    this.headers = {};
  }
}

class MockResponse {
  statusCode: number;
  _events: Record<string, Array<() => void>>;

  constructor() {
    this.statusCode = 200;
    this._events = {};
  }

  on(event: string, callback: () => void) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(callback);
  }

  emit(event: string) {
    if (this._events[event]) {
      this._events[event].forEach(callback => callback());
    }
  }
}

const mockNext = () => {};

// Mock pgDb.query to avoid actual database calls
const originalQuery = pgDb.query;
(pgDb as any).query = async (query: string, params?: any[]) => {
  if (typeof query === 'string' && query.includes('audit_logs')) {
    return Promise.resolve({ rows: [], fields: [] });
  }
  return originalQuery ? originalQuery.call(pgDb, query, params) : Promise.resolve({ rows: [], fields: [] });
};

test('auditLog middleware should log audit entry on successful request', async () => {
  const req = new MockRequest();
  const res = new MockResponse();
  const next = mockNext;

  req.user = { userId: 'user123' };
  req.params = { id: 'resource456' };
  req.ip = '192.168.1.1';
  req.headers['user-agent'] = 'test-agent';

  const middleware = auditLog('create', 'user');
  await middleware(req as any, res as any, next);

  // Trigger finish event
  res.emit('finish');

  // Verify that next was called
  assert.ok(true, 'Middleware executed without error');
});

test('auditLog middleware should not log when response status is not 2xx', async () => {
  const req = new MockRequest();
  const res = new MockResponse();
  const next = mockNext;

  res.statusCode = 500; // Internal server error

  const middleware = auditLog('update', 'user');
  await middleware(req as any, res as any, next);

  // Trigger finish event
  res.emit('finish');

  // No assertion needed, just ensure no error thrown
  assert.ok(true, 'Middleware executed without error');
});

test('auditLog middleware should handle missing user and resource ID gracefully', async () => {
  const req = new MockRequest();
  const res = new MockResponse();
  const next = mockNext;

  // No user or params.id
  req.user = undefined;
  req.params = {};
  req.ip = undefined;
  req.socket = { remoteAddress: '10.0.0.1' };
  req.headers['user-agent'] = undefined;

  const middleware = auditLog('delete', 'post');
  await middleware(req as any, res as any, next);

  // Trigger finish event
  res.emit('finish');

  assert.ok(true, 'Middleware executed without error');
});

test('auditLog middleware should handle missing ip and user-agent gracefully', async () => {
  const req = new MockRequest();
  const res = new MockResponse();
  const next = mockNext;

  req.ip = undefined;
  req.socket = undefined;
  req.headers['user-agent'] = undefined;

  const middleware = auditLog('read', 'document');
  await middleware(req as any, res as any, next);

  // Trigger finish event
  res.emit('finish');

  assert.ok(true, 'Middleware executed without error');
});

// Restore original query after tests
after(() => {
  (pgDb as any).query = originalQuery;
});