import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.AUDIT_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE 1=1`;
      const params: any[] = [];

      if (req.query.userId) {
        params.push(req.query.userId);
        whereClause += ` AND "userId" = $${params.length}`;
      }
      if (req.query.action) {
        params.push(req.query.action);
        whereClause += ` AND "action" = $${params.length}`;
      }
      if (req.query.resource) {
        params.push(req.query.resource);
        whereClause += ` AND "resource" = $${params.length}`;
      }

      const countRes = await pgDb.query(`SELECT COUNT(*) as total FROM "audit_logs" ${whereClause}`, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      params.push(limit, offset);
      const logsRes = await pgDb.query(
        `SELECT a.*, u."email", u."firstName", u."lastName"
         FROM "audit_logs" a
         LEFT JOIN "users" u ON u."id" = a."userId"
         ${whereClause}
         ORDER BY a."createdAt" DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      const items = logsRes.rows.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        details: row.details,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        user: row.email ? { email: row.email, firstName: row.firstName, lastName: row.lastName } : null,
      }));

      res.json({
        success: true,
        data: {
          items,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
