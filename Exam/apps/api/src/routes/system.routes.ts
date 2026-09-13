import { Router, Request, Response } from 'express';
import { pgDb } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { FestivalKey } from '@repo/types';

export const systemRouter = Router();

const VALID_FESTIVALS: FestivalKey[] = [
  'HOLI',
  'DIWALI',
  'NEW_YEAR',
  'GUDI_PADWA',
  'CHRISTMAS',
  'EID',
  'INDEPENDENCE_DAY',
  'REPUBLIC_DAY',
];

/**
 * GET /festival-theme (Public)
 * Returns the currently active site-wide festival theme
 */
systemRouter.get('/festival-theme', async (req: Request, res: Response) => {
  try {
    const result = await pgDb.query(
      `SELECT "value" FROM "system_settings" WHERE "key" = 'active_festival_theme' LIMIT 1`
    );
    if (result.rows.length > 0 && result.rows[0].value) {
      const val = result.rows[0].value;
      const festival = typeof val === 'object' && val !== null ? val.festival : null;
      return res.json({
        success: true,
        data: { festival: festival || null },
      });
    }

    return res.json({
      success: true,
      data: { festival: null },
    });
  } catch (err: any) {
    console.error('Error fetching site-wide festival theme:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /festival-theme (Admin Only)
 * Sets or clears the site-wide festival theme
 */
systemRouter.patch('/festival-theme', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isMainAdmin = user?.roles?.includes('MAIN_ADMIN') || user?.roles?.includes('SUB_ADMIN');
    const hasAdminPerm =
      user?.permissions?.includes('*') ||
      user?.permissions?.includes('system.maintenance') ||
      user?.permissions?.includes('ai.admin_config');

    if (!isMainAdmin && !hasAdminPerm) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        message: 'Only administrators can configure site-wide festive themes',
      });
    }

    const { festival } = req.body;
    let targetFestival: FestivalKey | null = null;

    if (festival !== null && festival !== undefined && festival !== 'none' && festival !== '') {
      const upper = String(festival).toUpperCase().trim() as FestivalKey;
      if (!VALID_FESTIVALS.includes(upper)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_FESTIVAL',
          message: `Invalid festival theme: ${festival}. Valid options: ${VALID_FESTIVALS.join(', ')}, or null to deactivate.`,
        });
      }
      targetFestival = upper;
    }

    const valuePayload = JSON.stringify({ festival: targetFestival });

    await pgDb.query(
      `INSERT INTO "system_settings" ("key", "value", "updatedBy", "updatedAt")
       VALUES ('active_festival_theme', $1::jsonb, $2, CURRENT_TIMESTAMP)
       ON CONFLICT ("key") DO UPDATE
       SET "value" = EXCLUDED."value",
           "updatedBy" = EXCLUDED."updatedBy",
           "updatedAt" = CURRENT_TIMESTAMP`,
      [valuePayload, user?.id || 'admin']
    );

    return res.json({
      success: true,
      message: targetFestival
        ? `Site-wide festive theme set to ${targetFestival}`
        : 'Site-wide festive theme deactivated (reset to standard)',
      data: { festival: targetFestival },
    });
  } catch (err: any) {
    console.error('Error updating site-wide festival theme:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
