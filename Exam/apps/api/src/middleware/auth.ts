import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthContext, JWTPayload } from '@repo/types';
import { pgDb } from '@repo/database';
import { AppError } from './error';

export const JWT_SECRET = process.env.JWT_SECRET || 'examos_super_secret_jwt_key_2026';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'examos_super_secret_refresh_key_2026';

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
      actor?: {
        userId: string;
        email: string;
      };
      impersonation?: {
        sessionId: string;
        mode: string;
        actorUserId: string;
        actorEmail: string;
        effectiveUserId: string;
        effectiveEmail: string;
        sessionData: any;
      };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication token required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;

    if (payload.isImpersonation) {
      const sessionId = payload.impersonationSessionId;
      if (!sessionId) {
        return next(new AppError(401, 'INVALID_IMPERSONATION_SESSION', 'Impersonation session ID missing from token'));
      }

      // Option 1: Server-side validation of active session in database on every request
      const sessionRes = await pgDb.query(
        `SELECT "id", "isActive", ("expiresAt" < CURRENT_TIMESTAMP) as "isExpired"
         FROM "impersonation_sessions"
         WHERE "id" = $1`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0 || !sessionRes.rows[0].isActive) {
        return next(
          new AppError(
            401,
            'IMPERSONATION_SESSION_REVOKED',
            'Impersonation/preview session has ended or been revoked'
          )
        );
      }

      if (sessionRes.rows[0].isExpired) {
        return next(
          new AppError(
            401,
            'IMPERSONATION_SESSION_EXPIRED',
            'Impersonation/preview session has expired'
          )
        );
      }

      req.actor = {
        userId: payload.actorUserId,
        email: payload.actorEmail,
      };
      req.impersonation = {
        sessionId: payload.impersonationSessionId,
        mode: payload.impersonationMode,
        actorUserId: payload.actorUserId,
        actorEmail: payload.actorEmail,
        effectiveUserId: payload.sub,
        effectiveEmail: payload.email,
        sessionData: payload.sessionData,
      };
    }

    req.user = {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      isImpersonation: Boolean(payload.isImpersonation),
      impersonationMode: payload.impersonationMode,
      impersonationSessionId: payload.impersonationSessionId,
      sessionData: payload.sessionData,
    } as any;

    next();
  } catch (err) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token'));
  }
}
