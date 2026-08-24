import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AIUsageService } from '../services/ai-usage.service';
import { BillingService } from '../services/billing.service';
import { purchaseCreditPackageSchema } from '@repo/validation';

export const aiCreditsRouter = Router();

/**
 * GET /api/v1/ai-credits/balance
 * Get user AI credits balance.
 */
aiCreditsRouter.get(
  '/balance',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).user;
      const data = await AIUsageService.getUserCredits(authUser.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/ai-credits/packages
 * List available credit packages for purchase.
 */
aiCreditsRouter.get('/packages', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.listCreditPackages();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ai-credits/purchase
 * Purchase an AI credit package.
 */
aiCreditsRouter.post(
  '/purchase',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = purchaseCreditPackageSchema.parse(req.body);
      const authUser = (req as any).user;
      const isPreview = authUser.isImpersonation && authUser.impersonationMode === 'PREVIEW_STUDENT';

      const data = await BillingService.purchaseCreditPackage(
        authUser.userId,
        parsed.packageId,
        authUser.email,
        isPreview
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);
