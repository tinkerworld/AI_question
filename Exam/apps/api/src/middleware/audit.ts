import { Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';

export function auditLog(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.userId || null,
              action,
              resource,
              resourceId: req.params.id || null,
              details: {
                method: req.method,
                path: req.originalUrl,
                query: req.query,
              },
              ipAddress: req.ip || req.socket.remoteAddress,
              userAgent: req.headers['user-agent'] || null,
            },
          });
        } catch (e) {
          console.error('[AuditLog Error]', e);
        }
      }
    });
    next();
  };
}
