import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { EntitlementService } from '../services/entitlement.service';
import { entitlementCheckSchema, updateEntitlementRuleSchema } from '@repo/validation';

export const entitlementRouter = Router();

/**
 * POST /api/v1/entitlements/check
 * Evaluate access and remaining limits for an entitlement key.
 */
entitlementRouter.post(
  '/check',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = entitlementCheckSchema.parse(req.body);
      const authUser = (req as any).user;
      const result = await EntitlementService.checkAccess(
        authUser.userId,
        parsed.key,
        authUser,
        parsed.currentUsage
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/entitlements/my
 * Get all resolved entitlements and live limits for current user.
 */
entitlementRouter.get(
  '/my',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).user;
      const data = await EntitlementService.getUserEntitlements(authUser.userId, authUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/entitlements/plan/:planCode
 * Get all rules for a specific plan tier.
 */
entitlementRouter.get(
  '/plan/:planCode',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planCode } = req.params;
      const data = await EntitlementService.getPlanEntitlements(planCode);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/entitlements
 * List all configured entitlement rules (Admin).
 */
entitlementRouter.get(
  '/admin/all',
  authenticate,
  requirePermission(PERMISSIONS.ENTITLEMENTS_MANAGE),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await EntitlementService.listAllEntitlements();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/admin/entitlements/:planCode/:key
 * Update an entitlement rule dynamically (Admin).
 */
entitlementRouter.put(
  '/admin/:planCode/:key',
  authenticate,
  requirePermission(PERMISSIONS.ENTITLEMENTS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planCode, key } = req.params;
      const parsed = updateEntitlementRuleSchema.parse(req.body);
      const data = await EntitlementService.updateEntitlementRule(
        planCode,
        key,
        parsed.entitlementValue
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);
