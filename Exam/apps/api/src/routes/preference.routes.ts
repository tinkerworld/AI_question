import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
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

    let resDb = await pgDb.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);

    if (resDb.rows.length === 0) {
      const id = `pref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pgDb.query(
        `INSERT INTO "user_preferences" ("id", "userId", "themeMode", "languageCode")
         VALUES ($1, $2, 'DARK', 'en')`,
        [id, userId]
      );
      resDb = await pgDb.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);
    }

    res.json({ success: true, data: resDb.rows[0] });
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

      const existingRes = await pgDb.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);
      const prefId = existingRes.rows.length > 0 ? existingRes.rows[0].id : `pref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const currentTheme = existingRes.rows.length > 0 ? existingRes.rows[0].themeMode : 'DARK';
      const currentLang = existingRes.rows.length > 0 ? existingRes.rows[0].languageCode : 'en';

      const finalTheme = themeMode && ['LIGHT', 'GRAY', 'DARK'].includes(themeMode) ? themeMode : currentTheme;
      const finalLang = languageCode ? String(languageCode).toLowerCase().trim() : currentLang;

      await pgDb.query(
        `INSERT INTO "user_preferences" ("id", "userId", "themeMode", "languageCode", "updatedAt")
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT ("userId") DO UPDATE
         SET "themeMode" = EXCLUDED."themeMode", "languageCode" = EXCLUDED."languageCode", "updatedAt" = CURRENT_TIMESTAMP`,
        [prefId, userId, finalTheme, finalLang]
      );

      const updatedRes = await pgDb.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);

      res.json({ success: true, data: updatedRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
