import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/v1/users/me/preferences — Get current user preferences from DB
// ----------------------------------------------------------------------------
router.get('/me/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    let pref = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.userPreference.create({
        data: {
          userId,
          themeMode: 'DARK',
          languageCode: 'en',
        },
      });
    }

    res.json({ success: true, data: pref });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// PATCH /api/v1/users/me/preferences — Update user preferences in DB
// ----------------------------------------------------------------------------
router.patch(
  '/me/preferences',
  requirePermission(PERMISSIONS.PREFERENCES_UPDATE),
  auditLog('UPDATE', 'user_preference'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { themeMode, languageCode } = req.body;

      const updateData: any = {};
      if (themeMode && ['LIGHT', 'GRAY', 'DARK'].includes(themeMode)) {
        updateData.themeMode = themeMode;
      }
      if (languageCode) {
        updateData.languageCode = String(languageCode).toLowerCase().trim();
      }

      const pref = await prisma.userPreference.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          themeMode: updateData.themeMode || 'DARK',
          languageCode: updateData.languageCode || 'en',
        },
      });

      res.json({ success: true, data: pref });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
