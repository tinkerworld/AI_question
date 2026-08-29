import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { authenticate } from './auth';
import jwt from 'jsonwebtoken';
import { AppError } from './error';
import { pgDb } from '@repo/database';

// Mock pgDb.query to avoid actual database calls
const mockPgDbQuery = {
  query: async (query: string, params: any[]) => {
    if (query.includes('impersonation_sessions')) {
      // Simulate a valid active session
      return {
        rows: [
          {
            id: 'test-session-id',
            isActive: true,
            isExpired: false,
          },
        ],
      };
    }
    return { rows: [] };
  },
};

// Replace pgDb with mock
Object.assign(pgDb, mockPgDbQuery);

const JWT_SECRET = 'examos_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = 'examos_super_secret_refresh_key_2026';

// Helper to create a valid JWT token
function createToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Helper to create impersonation token
function createImpersonationToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

test('authenticate middleware should reject missing authorization header', async () => {
  const req = {
    headers: {},
  } as any;
  const res = {} as any;
  const next = (err: any) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 401);
    assert.equal(err.errorCode, 'AUTH_REQUIRED');
  };

  await authenticate(req, res, next);
});

test('authenticate middleware should reject invalid authorization header format', async () => {
  const req = {
    headers: {
      authorization: 'InvalidToken',
    },
  } as any;
  const res = {} as any;
  const next = (err: any) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 401);
    assert.equal(err.errorCode, 'AUTH_REQUIRED');
  };

  await authenticate(req, res, next);
});

test('authenticate middleware should reject invalid token', async () => {
  const req = {
    headers: {
      authorization: 'Bearer invalid-token',
    },
  } as any;
  const res = {} as any;
  const next = (err: any) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 401);
    assert.equal(err.errorCode, 'INVALID_TOKEN');
  };

  await authenticate(req, res, next);
});

test('authenticate middleware should set user context for valid token', async () => {
  const payload = {
    sub: 'user123',
    email: 'user@example.com',
    roles: ['user'],
    permissions: ['read'],
  };
  const token = createToken(payload);

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  } as any;
  const res = {} as any;
  const next = () => {
    assert.ok(req.user);
    assert.equal(req.user.userId, 'user123');
    assert.equal(req.user.email, 'user@example.com');
    assert.deepEqual(req.user.roles, ['user']);
    assert.deepEqual(req.user.permissions, ['read']);
    assert.equal(req.user.isImpersonation, false);
  };

  await authenticate(req, res, next);
});

test('authenticate middleware should set impersonation context for valid impersonation token', async () => {
  const payload = {
    sub: 'effective-user-123',
    email: 'effective@example.com',
    actorUserId: 'actor-user-456',
    actorEmail: 'actor@example.com',
    impersonationSessionId: 'test-session-id',
    impersonationMode: 'preview',
    isImpersonation: true,
    sessionData: { test: 'data' },
  };
  const token = createImpersonationToken(payload);

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  } as any;
  const res = {} as any;
  const next = () => {
    assert.ok(req.user);
    assert.ok(req.impersonation);
    assert.ok(req.actor);
    assert.equal(req.user.userId, 'effective-user-123');
    assert.equal(req.impersonation.sessionId, 'test-session-id');
    assert.equal(req.impersonation.mode, 'preview');
    assert.equal(req.actor.userId, 'actor-user-456');
  };

  await authenticate(req, res, next);
});

test('authenticate middleware should reject impersonation token without session ID', async () => {
  const payload = {
    sub: 'effective-user-123',
    email: 'effective@example.com',
    actorUserId: 'actor-user-456',
    actorEmail: 'actor@example.com',
    impersonationMode: 'preview',
    isImpersonation: true,
    // Missing impersonationSessionId
  };
  const token = createImpersonationToken(payload);

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  } as any;
  const res = {} as any;
  const next = (err: any) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 401);
    assert.equal(err.errorCode, 'INVALID_IMPERSONATION_SESSION');
  };

  await authenticate(req, res, next);
});

