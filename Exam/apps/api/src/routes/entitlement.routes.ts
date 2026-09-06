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

// ============================================================================
// Phase 15: Feature Registry, Dynamic Matrix & Promotional Windows
// ============================================================================

/**
 * GET /api/v1/entitlements/features
 * List registered system features.
 */
entitlementRouter.get('/features', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await EntitlementService.listRegisteredFeatures();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/entitlements/features
 * Register a new system feature key (Admin).
 */
entitlementRouter.post(
  '/features',
  authenticate,
  requirePermission(PERMISSIONS.ENTITLEMENTS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await EntitlementService.createFeatureRegistryItem(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/entitlements/matrix
 * Get interactive plan vs feature matrix (Admin).
 */
entitlementRouter.get(
  '/matrix',
  authenticate,
  requirePermission(PERMISSIONS.ENTITLEMENTS_MANAGE),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await EntitlementService.getDynamicMatrix();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/entitlements/rules
 * Update rule value for a specific plan tier and feature key (Admin).
 */
entitlementRouter.put(
  '/rules',
  authenticate,
  requirePermission(PERMISSIONS.ENTITLEMENTS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planCode, featureKey, value } = req.body;
      const data = await EntitlementService.updateEntitlementRule(
        planCode,
        featureKey,
        String(value)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/entitlements/promotions
 * List promotional entitlement windows.
 */
entitlementRouter.get(
  '/promotions',
  authenticate,
  requirePermission(PERMISSIONS.ENTITLEMENTS_MANAGE),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await EntitlementService.listPromotions();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/entitlements/promotions
 * Create a promotional access window (Admin).
 */
entitlementRouter.post(
  '/promotions',
  authenticate,
  requirePermission(PERMISSIONS.ENTITLEMENTS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await EntitlementService.createPromotion(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/entitlements/my-status
 * Consolidated evaluated feature status for caller with promotional flags.
 */
entitlementRouter.get(
  '/my-status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).user;
      const data = await EntitlementService.getMyStatus(authUser.userId, authUser);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

