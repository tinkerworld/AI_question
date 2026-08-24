import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { SubscriptionService } from '../services/subscription.service';
import {
  createPlanSchema,
  updatePlanSchema,
  subscribeSchema,
  updateSubscriptionStatusSchema,
} from '@repo/validation';

export const subscriptionRouter = Router();

/**
 * GET /api/v1/subscriptions/plans
 * List all active subscription plans.
 */
subscriptionRouter.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await SubscriptionService.listPlans();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/subscriptions/plans
 * Create a new subscription plan (Admin).
 */
subscriptionRouter.post(
  '/plans',
  authenticate,
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createPlanSchema.parse(req.body);
      const data = await SubscriptionService.createPlan(parsed);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/subscriptions/plans/:id
 * Update an existing subscription plan (Admin).
 */
subscriptionRouter.put(
  '/plans/:id',
  authenticate,
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = updatePlanSchema.parse(req.body);
      const data = await SubscriptionService.updatePlan(id, parsed);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/subscriptions/me
 * Get current user's active subscription.
 */
subscriptionRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).user;
      const data = await SubscriptionService.getUserSubscription(authUser.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/subscriptions
 * Subscribe to a plan.
 */
subscriptionRouter.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = subscribeSchema.parse(req.body);
      const authUser = (req as any).user;
      const data = await SubscriptionService.subscribeUser(
        authUser.userId,
        parsed.planCode,
        parsed.billingCycle
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/subscriptions/cancel
 * Cancel current subscription.
 */
subscriptionRouter.post(
  '/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).user;
      const data = await SubscriptionService.cancelSubscription(authUser.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/subscriptions/:id
 * Update subscription status (Admin).
 */
subscriptionRouter.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = updateSubscriptionStatusSchema.parse(req.body);
      const data = await SubscriptionService.updateSubscriptionStatus(
        id,
        parsed.status,
        parsed.endDate
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);
