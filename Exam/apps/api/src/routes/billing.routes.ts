import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { BillingService } from '../services/billing.service';
import { checkoutSchema, processRefundSchema } from '@repo/validation';

export const billingRouter = Router();

/**
 * POST /api/v1/billing/checkout
 * Initiate checkout for plan subscription or credit pack.
 */
billingRouter.post(
  '/checkout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = checkoutSchema.parse(req.body);
      const authUser = (req as any).user;
      const isPreview = authUser.isImpersonation && authUser.impersonationMode === 'PREVIEW_STUDENT';

      if (parsed.itemType === 'CREDIT_PACKAGE') {
        const data = await BillingService.purchaseCreditPackage(
          authUser.userId,
          parsed.itemId,
          authUser.email,
          isPreview
        );
        res.status(201).json({ success: true, data });
      } else {
        const data = await BillingService.checkoutSubscription(
          authUser.userId,
          parsed.itemId,
          parsed.billingCycle,
          authUser.email,
          isPreview
        );
        res.status(201).json({ success: true, data });
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/billing/invoices
 * Get invoices for current user.
 */
billingRouter.get(
  '/invoices',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).user;
      const data = await BillingService.listUserInvoices(authUser.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/billing/transactions
 * List financial audit transactions (Admin).
 */
billingRouter.get(
  '/transactions',
  authenticate,
  requirePermission(PERMISSIONS.BILLING_MANAGE),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await BillingService.listFinancialTransactions();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/billing/refunds
 * Process refund ("return money") with unspent credit/plan clawback (Admin).
 */
billingRouter.post(
  '/refunds',
  authenticate,
  requirePermission(PERMISSIONS.BILLING_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = processRefundSchema.parse(req.body);
      const authUser = (req as any).user;
      const data = await BillingService.processRefund(authUser.userId, parsed, false);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/billing/refunds/:id
 * Get details of a refund transaction.
 */
billingRouter.get(
  '/refunds/:id',
  authenticate,
  requirePermission(PERMISSIONS.BILLING_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await BillingService.getRefundById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Refund transaction not found' });
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/billing/preview/refund-sim
 * Simulate refund in Preview Student mode.
 */
billingRouter.post(
  '/preview/refund-sim',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = processRefundSchema.parse(req.body);
      const authUser = (req as any).user;
      const data = await BillingService.processRefund(authUser.userId, parsed, true);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);
