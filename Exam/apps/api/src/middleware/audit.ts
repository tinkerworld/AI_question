import { Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';

export function auditLog(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const id = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const userId = req.user?.userId || null;
          const resourceId = req.params.id || null;
          const details = JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            query: req.query,
          });
          const ipAddress = req.ip || req.socket?.remoteAddress || null;
          const userAgent = (req.headers['user-agent'] as string) || null;

          await pgDb.query(
            `INSERT INTO "audit_logs" ("id", "userId", "action", "resource", "resourceId", "details", "ipAddress", "userAgent", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
            [id, userId, action, resource, resourceId, details, ipAddress, userAgent]
          );
        } catch (e) {
          console.error('[AuditLog Error]', e);
        }
      }
    });
    next();
  };
}
