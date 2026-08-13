import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

const router = Router();

// ----------------------------------------------------------------------------
// GET /api/v1/i18n/languages — List all registered languages from DB
// ----------------------------------------------------------------------------
router.get('/languages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const languages = await prisma.language.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: languages });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /api/v1/i18n/languages — Register new language in DB
// ----------------------------------------------------------------------------
router.post(
  '/languages',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('CREATE', 'language'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, nativeName, isDefault } = req.body;
      if (!code || !name || !nativeName) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Language code, name, and nativeName are required');
      }

      const langCode = String(code).toLowerCase().trim();

      const existing = await prisma.language.findUnique({ where: { code: langCode } });
      if (existing) {
        throw new AppError(409, 'LANGUAGE_EXISTS', `Language '${langCode}' already registered`);
      }

      const language = await prisma.language.create({
        data: {
          code: langCode,
          name: String(name).trim(),
          nativeName: String(nativeName).trim(),
          isDefault: Boolean(isDefault),
        },
      });

      res.status(201).json({ success: true, data: language });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// GET /api/v1/i18n/translations/:langCode — Get translation dictionary for language from DB
// ----------------------------------------------------------------------------
router.get('/translations/:langCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { langCode } = req.params;
    const targetCode = String(langCode).toLowerCase().trim();

    // 1. Fetch target language from DB
    const language = await prisma.language.findUnique({
      where: { code: targetCode },
    });

    // 2. Fetch default (English) language from DB for fallback
    const defaultLang = await prisma.language.findFirst({
      where: { isDefault: true },
    });

    const dict: Record<string, string> = {};

    // 3. Populate default English fallback strings first
    if (defaultLang) {
      const defaultTrans = await prisma.translation.findMany({
        where: { languageId: defaultLang.id },
        include: { translationKey: true },
      });
      defaultTrans.forEach((t) => {
        dict[t.translationKey.key] = t.value;
      });
    }

    // 4. Override with target language translations from DB
    if (language && language.id !== defaultLang?.id) {
      const targetTrans = await prisma.translation.findMany({
        where: { languageId: language.id },
        include: { translationKey: true },
      });
      targetTrans.forEach((t) => {
        dict[t.translationKey.key] = t.value;
      });
    }

    res.json({ success: true, data: { languageCode: targetCode, translations: dict } });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /api/v1/i18n/translations — Upsert translation value in DB
// ----------------------------------------------------------------------------
router.post(
  '/translations',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('UPSERT', 'translation'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { languageCode, key, value, description, module } = req.body;
      if (!languageCode || !key || !value) {
        throw new AppError(400, 'VALIDATION_ERROR', 'languageCode, key, and value are required');
      }

      const langCode = String(languageCode).toLowerCase().trim();
      const keyStr = String(key).trim();

      // Ensure language exists in DB
      let language = await prisma.language.findUnique({ where: { code: langCode } });
      if (!language) {
        language = await prisma.language.create({
          data: {
            code: langCode,
            name: langCode.toUpperCase(),
            nativeName: langCode.toUpperCase(),
          },
        });
      }

      // Ensure translation key exists in DB
      const translationKey = await prisma.translationKey.upsert({
        where: { key: keyStr },
        update: { description, module },
        create: { key: keyStr, description, module: module || 'common' },
      });

      // Upsert translation entry in DB
      const translation = await prisma.translation.upsert({
        where: {
          languageId_translationKeyId: {
            languageId: language.id,
            translationKeyId: translationKey.id,
          },
        },
        update: { value: String(value) },
        create: {
          languageId: language.id,
          translationKeyId: translationKey.id,
          value: String(value),
        },
      });

      res.json({ success: true, data: translation });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
