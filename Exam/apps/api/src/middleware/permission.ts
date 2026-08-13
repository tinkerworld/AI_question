import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '@repo/permissions';
import { AppError } from './error';

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication required'));
    }

    if (!hasPermission(req.user.permissions, permission)) {
      return next(
        new AppError(
          403,
          'PERMISSION_DENIED',
          `Forbidden: Requires atomic permission '${permission}'`
        )
      );
    }

    next();
  };
}
