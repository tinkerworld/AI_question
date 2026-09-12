import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET Handler — Retrieve current user preferences from DB
// Supports GET /api/v1/users/me/preferences and GET /api/v1/preferences
// ----------------------------------------------------------------------------
const getPreferencesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    let resDb = await pgDb.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);

    if (resDb.rows.length === 0) {
      const id = `pref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pgDb.query(
        `INSERT INTO "user_preferences" ("id", "userId", "themeMode", "languageCode", "accentColor", "highContrast", "fontScale", "reducedMotion")
         VALUES ($1, $2, 'DARK', 'en', 'cyan', false, 'normal', false)`,
        [id, userId]
      );
      resDb = await pgDb.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);
    }

    const row = resDb.rows[0];
    res.json({
      success: true,
      data: {
        ...row,
        accentColor: row.accentColor || 'cyan',
        highContrast: Boolean(row.highContrast),
        fontScale: row.fontScale || 'normal',
        reducedMotion: Boolean(row.reducedMotion),
      },
    });
  } catch (err) {
    next(err);
  }
};

router.get('/me/preferences', getPreferencesHandler);
router.get('/', getPreferencesHandler);

// ----------------------------------------------------------------------------
// PATCH/PUT Handler — Update current user visual and language preferences in DB
// Supports PATCH/PUT /api/v1/users/me/preferences and /api/v1/preferences
// ----------------------------------------------------------------------------
const updatePreferencesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    let { themeMode, languageCode, accentColor, accentPalette, highContrast, fontScale, reducedMotion } = req.body;

    // Support accentPalette alias if accentColor not explicitly passed
    if (!accentColor && accentPalette) {
      accentColor = accentPalette;
    }

    const existingRes = await pgDb.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);
    const prefId = existingRes.rows.length > 0 ? existingRes.rows[0].id : `pref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const current = existingRes.rows.length > 0 ? existingRes.rows[0] : {};

    // Normalize theme mode
    let finalTheme = current.themeMode || 'DARK';
    if (themeMode && typeof themeMode === 'string') {
      const upperTheme = themeMode.toUpperCase();
      if (['LIGHT', 'GRAY', 'DARK'].includes(upperTheme)) {
        finalTheme = upperTheme;
      }
    }

    // Normalize language
    const finalLang = languageCode ? String(languageCode).toLowerCase().trim() : (current.languageCode || 'en');

    // Normalize accent color
    let finalAccent = current.accentColor || 'cyan';
    if (accentColor && typeof accentColor === 'string') {
      const lowerAccent = accentColor.toLowerCase();
      const validAccents = ['cyan', 'purple', 'emerald', 'amber', 'rose', 'blue'];
      if (validAccents.includes(lowerAccent)) {
        finalAccent = lowerAccent;
      } else if (lowerAccent === 'violet') {
        finalAccent = 'purple';
      } else if (lowerAccent === 'crimson') {
        finalAccent = 'rose';
      } else if (lowerAccent === 'indigo' || lowerAccent === 'royal_blue') {
        finalAccent = 'blue';
      }
    }

    const finalHighContrast = typeof highContrast === 'boolean' ? highContrast : Boolean(current.highContrast);

    // Normalize font scale
    let finalFontScale = current.fontScale || 'normal';
    if (fontScale && typeof fontScale === 'string') {
      const lowerScale = fontScale.toLowerCase();
      if (['small', 'normal', 'large'].includes(lowerScale)) {
        finalFontScale = lowerScale;
      } else if (lowerScale === 'xlarge') {
        finalFontScale = 'large';
      }
    }

    const finalReducedMotion = typeof reducedMotion === 'boolean' ? reducedMotion : Boolean(current.reducedMotion);

    await pgDb.query(
      `INSERT INTO "user_preferences" ("id", "userId", "themeMode", "languageCode", "accentColor", "highContrast", "fontScale", "reducedMotion", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT ("userId") DO UPDATE
       SET "themeMode" = EXCLUDED."themeMode",
           "languageCode" = EXCLUDED."languageCode",
           "accentColor" = EXCLUDED."accentColor",
           "highContrast" = EXCLUDED."highContrast",
           "fontScale" = EXCLUDED."fontScale",
           "reducedMotion" = EXCLUDED."reducedMotion",
           "updatedAt" = CURRENT_TIMESTAMP`,
      [prefId, userId, finalTheme, finalLang, finalAccent, finalHighContrast, finalFontScale, finalReducedMotion]
    );

    const updatedRes = await pgDb.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);
    const row = updatedRes.rows[0];

    res.json({
      success: true,
      data: {
        ...row,
        accentColor: row.accentColor || 'cyan',
        highContrast: Boolean(row.highContrast),
        fontScale: row.fontScale || 'normal',
        reducedMotion: Boolean(row.reducedMotion),
      },
    });
  } catch (err) {
    next(err);
  }
};

router.patch('/me/preferences', auditLog('UPDATE', 'user_preference'), updatePreferencesHandler);
router.patch('/', auditLog('UPDATE', 'user_preference'), updatePreferencesHandler);
router.put('/me/preferences', auditLog('UPDATE', 'user_preference'), updatePreferencesHandler);
router.put('/', auditLog('UPDATE', 'user_preference'), updatePreferencesHandler);

export default router;
