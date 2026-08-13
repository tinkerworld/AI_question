import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthContext, JWTPayload } from '@repo/types';
import { AppError } from './error';

export const JWT_SECRET = process.env.JWT_SECRET || 'examos_super_secret_jwt_key_2026';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'examos_super_secret_refresh_key_2026';

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication token required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
    next();
  } catch (err) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token'));
  }
}
