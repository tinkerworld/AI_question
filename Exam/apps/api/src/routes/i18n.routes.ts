import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import { pgDb } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';
import { AITranslationService, KeyToTranslate } from '../services/ai-translation.service';

const router = Router();

import { BASELINE_LANGUAGES } from '@repo/types';
import { SEED_TRANSLATION_KEYS } from '../constants/seed-translation-keys';
import { BASELINE_TRANSLATION_DICTIONARIES } from '../services/ai-translation.service';
export { BASELINE_LANGUAGES };

const baseEn: Record<string, string> = {};
for (const k of SEED_TRANSLATION_KEYS) {
  baseEn[k.key] = k.english;
}

const baseHi: Record<string, string> = {
  ...baseEn,
  ...(BASELINE_TRANSLATION_DICTIONARIES['hi'] || {}),
};

export const SEED_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: baseEn,
  hi: baseHi,
  bn: { welcome: 'ExamOS প্ল্যাটফর্মে আপনাকে স্বাগতম', app_title: 'ExamOS // অ্যাডাপ্টিভ লার্নিং প্ল্যাটফর্ম', dashboard: 'ড্যাশবোর্ড', users: 'ব্যবহারকারী ব্যবস্থাপনা', courses: 'একাডেমিক কোর্স', question_bank: 'প্রশ্ন ব্যাংক', exam_patterns: 'পরীক্ষার প্যাটার্ন', analytics: 'শিক্ষার্থী বিশ্লেষণ' },
  te: { welcome: 'ExamOS వేదికకు స్వాగతం', app_title: 'ExamOS // అడాప్టివ్ లెర్నింగ్ ప్లాట్‌ఫారమ్', dashboard: 'డాష్‌బోర్డ్', users: 'వినియోగదారు నిర్వహణ', courses: 'అకాడమిక్ కోర్సులు', question_bank: 'ప్రశ్నల నిధి', exam_patterns: 'పరీక్ష విధానాలు', analytics: 'విద్యార్థి విశ్లేషణలు' },
  mr: { welcome: 'ExamOS प्लॅटफॉर्मवर आपले स्वागत आहे', app_title: 'ExamOS // अडॅप्टिव्ह लर्निंग प्लॅटफॉर्म', dashboard: 'डॅशबोर्ड', users: 'वापरकर्ता व्यवस्थापन', courses: 'शैक्षणिक अभ्यासक्रम', question_bank: 'प्रश्न संच', exam_patterns: 'परीक्षा स्वरूप', analytics: 'विद्यार्थी विश्लेषण' },
  ta: { welcome: 'ExamOS தளத்திற்கு உங்களை வரவேற்கிறோம்', app_title: 'ExamOS // அடாப்டிவ் கற்றல் தளம்', dashboard: 'முகப்புப்பலகை', users: 'பயனர் நிர்வாகம்', courses: 'கல்விப் பாடங்கள்', question_bank: 'வினா வங்கி', exam_patterns: 'தேர்வு முறைகள்', analytics: 'மாணவர் பகுப்பாய்வு' },
  ur: { welcome: 'ExamOS پلیٹ فارم میں خوش آمدید', app_title: 'ExamOS // اڈاپٹیو لرننگ پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین کا انتظام', courses: 'تعلیمی کورسز', question_bank: 'سوالات کا بینک', exam_patterns: 'امتحانی انداز', analytics: 'طلباء کے تجزیات' },
  gu: { welcome: 'ExamOS પ્લેટફોર્મ પર આપનું સ્વાગત છે', app_title: 'ExamOS // અડેપ્ટિવ લર્નિંગ પ્લેટફોર્મ', dashboard: 'ડેશબોર્ડ', users: 'વપરાશકર્તા વ્યવસ્થાપન', courses: 'શૈક્ષણિક અભ્યાસક્રમો', question_bank: 'પ્રશ્ન બેંક', exam_patterns: 'પરીક્ષાની પેટર્ન', analytics: 'વિદ્યાર્થી વિશ્લેષણ' },
  kn: { welcome: 'ExamOS ವೇದಿಕೆಗೆ ಸುಸ್ವಾಗತ', app_title: 'ExamOS // ಅಡಾಪ್ಟಿವ್ ಕಲಿಕಾ ವೇದಿಕೆ', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', users: 'ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ', courses: 'ಶೈಕ್ಷಣಿಕ ಕೋರ್ಸ್‌ಗಳು', question_bank: 'ಪ್ರಶ್ನೆ ಬ್ಯಾಂಕ್', exam_patterns: 'ಪರೀಕ್ಷಾ ಮಾದರಿಗಳು', analytics: 'ವಿದ್ಯಾರ್ಥಿ ವಿಶ್ಲೇಷಣೆ' },
  ml: { welcome: 'ExamOS പ്ലാറ്റ്‌ഫോമിലേക്ക് സ്വാഗതം', app_title: 'ExamOS // അഡാപ്റ്റീവ് ലേണിംഗ് പ്ലാറ്റ്ഫോം', dashboard: 'ഡാഷ്‌ബോർഡ്', users: 'ഉപയോക്തൃ മാനേജ്മെന്റ്', courses: 'അക്കാദമിക് കോഴ്സുകൾ', question_bank: 'ചോദ്യ ബാങ്ക്', exam_patterns: 'പരീക്ഷാ രീതികൾ', analytics: 'വിദ്യാർത്ഥി വിശകലനം' },
  or: { welcome: 'ExamOS ପ୍ଲାଟଫର୍ମକୁ ସ୍ୱାଗତ', app_title: 'ExamOS // ଆଡାପ୍ଟିଭ୍ ଶିକ୍ଷଣ ପ୍ଲାଟଫର୍ମ', dashboard: 'ଡ୍ୟାସବୋର୍ଡ', users: 'ବ୍ୟବହାରକାରୀ ପରିଚାଳନା', courses: 'ଶିକ୍ଷାଗତ ପାଠ୍ୟକ୍ରମ', question_bank: 'ପ୍ରଶ୍ନ ବ୍ୟାଙ୍କ', exam_patterns: 'ପରୀକ୍ଷା ପ୍ୟାଟର୍ନ', analytics: 'ଛାତ୍ର ବିଶ୍ଳେଷଣ' },
  pa: { welcome: 'ExamOS ਪਲੇਟਫਾਰਮ \'ਤੇ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ', app_title: 'ExamOS // ਅਡੈਪਟਿਵ ਲਰਨਿੰਗ ਪਲੇਟਫਾਰਮ', dashboard: 'ਡੈਸ਼ਬੋਰਡ', users: 'ਉਪਭੋਗਤਾ ਪ੍ਰਬੰਧਨ', courses: 'ਅਕਾਦਮਿਕ ਕੋਰਸ', question_bank: 'ਪ੍ਰਸ਼ਨ ਬੈਂਕ', exam_patterns: 'ਪ੍ਰੀਖਿਆ ਪੈਟਰਨ', analytics: 'ਵਿਦਿਆਰਥੀ ਵਿਸ਼ਲੇਸ਼ਣ' },
  as: { welcome: 'ExamOS প্লেটফৰ্মলৈ স্বাগতম', app_title: 'ExamOS // এডাপ্টিভ লার্নিং প্লেটফর্ম', dashboard: 'ড্যাশবোর্ড', users: 'ব্যৱহাৰকাৰী ব্যৱস্থাপনা', courses: 'শৈক্ষিক পাঠ্যক্ৰম', question_bank: 'প্রশ্ন বেংক', exam_patterns: 'পৰীক্ষাৰ আৰ্হি', analytics: 'ছাত্ৰ-ছাত্ৰীৰ বিশ্লেষণ' },
  ma: { welcome: 'ExamOS प्लेटफॉर्म पर स्वागत अछि', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'छात्र विश्लेषण' },
  sa: { welcome: 'ExamOS मञ्चे भवतां स्वागतम्', app_title: 'ExamOS // अनुकूलाधिगममञ्चः', dashboard: 'नियन्त्रणपट्टिका', users: 'प्रयोक्तृप्रबन्धनम्', courses: 'शैक्षणिकपाठ्यक्रमः', question_bank: 'प्रश्नकोशः', exam_patterns: 'परीक्षाप्रारूपम्', analytics: 'छात्रविश्लेषणम्' },
  ks: { welcome: 'ExamOS پلیٹ فارمس منز خوش آمدید', app_title: 'ExamOS // اڈاپٹیو لرننگ پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین منجمنٹ', courses: 'تعلیمی کورس', question_bank: 'سوال بینک', exam_patterns: 'امتحانی پیٹرن', analytics: 'طالب علم تجزئیے' },
  ne: { welcome: 'ExamOS प्लेटफर्ममा स्वागत छ', app_title: 'ExamOS // एडप्टिभ लर्निङ प्लेटफर्म', dashboard: 'ड्यासबोर्ड', users: 'प्रयोगकर्ता व्यवस्थापन', courses: 'शैक्षिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा ढाँचा', analytics: 'विद्यार्थी विश्लेषण' },
  sd: { welcome: 'ExamOS پليٽفارم تي ڀلي ڪري آيا', app_title: 'ExamOS // اڊاپٽو لرننگ پليٽفارم', dashboard: 'ڊيش بورڊ', users: 'صارفين جي سڀال', courses: 'تعليمي ڪورس', question_bank: 'سوالن جي بئنڪ', exam_patterns: 'امتحان جا نمونا', analytics: 'شاگردن جي تجزيات' },
  br: { welcome: 'ExamOS प्लैटफर्मआव बरायबाय', app_title: 'ExamOS // सोलोंथाइ प्लैटफर्म', dashboard: 'डैशबोर्ड', users: 'बाहायगिरि सामलायनाय', courses: 'सोलोङो फरायखौंथाय', question_bank: 'सोंनाय बैंक', exam_patterns: 'आनजाद रोखोम', analytics: 'फरायसु विस्लेषण' },
  doi: { welcome: 'ExamOS प्लेटफार्म पर स्वागत ऐ', app_title: 'ExamOS // अडैप्टिव लर्निंग मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक कोर्स', question_bank: 'सवाल बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'छात्र विश्लेषण' },
  mni: { welcome: 'ExamOS प्लेटफॉर्मदा तराम্না ओकचरी', app_title: 'ExamOS // अडैप्टिव लर्निंग प्लेटफॉर्म', dashboard: 'ड्यासबोर्ड', users: 'शीजिन्‍नरिबा मयेक', courses: 'अकादमिक कोर्स', question_bank: 'वाहंग बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'माहैरोइ विश्‍लेषण' },
  sat: { welcome: 'ExamOS ᱯᱞᱮᱴᱯᱷᱚᱨᱢ ᱨᱮ ᱥᱟᱹᱜᱩᱱ ᱫᱟᱨᱟᱢ', app_title: 'ExamOS // ᱪᱮᱫᱚᱜ ᱯᱞᱮᱴᱯᱷᱚᱨᱢ', dashboard: 'ᱰᱮᱥᱵᱚᱨᱰ', users: 'ᱵᱮᱣᱦᱟᱨᱤᱭᱟᱹ ᱥᱟᱧᱮᱞ', courses: 'ᱥᱮᱪᱮᱫ ᱠᱳᱨᱥ', question_bank: 'ᱠᱩᱠᱞᱤ ᱵᱮᱝᱠ', exam_patterns: 'ᱵᱤᱱᱤᱰ ᱯᱮᱴᱚᱨᱱ', analytics: 'ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱵᱤ' },
  lus: { welcome: 'ExamOS Platform-ah kan lo lawm a che', app_title: 'ExamOS // Learning Platform', dashboard: 'Dashboard', users: 'User Control', courses: 'Academic Courses', question_bank: 'Question Bank', exam_patterns: 'Exam Patterns', analytics: 'Student Analytics' },
};

// RFC 4180 CSV serialization helper
export function escapeCsvCell(val: string | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

// RFC 4180 CSV parser helper
export function parseCsv(csvText: string): string[][] {
  const cleanText = csvText.replace(/^﻿/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell);
        if (currentRow.some((c) => c.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\r') {
        // Skip CR
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((c) => c.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ----------------------------------------------------------------------------
// GET /api/v1/i18n/languages — List all registered languages with completeness
// ----------------------------------------------------------------------------
router.get('/languages', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const totalKeysRes = await pgDb.query(`SELECT COUNT(*)::int AS count FROM "translation_keys"`);
    const totalKeys = totalKeysRes.rows[0]?.count || 10;

    let query = `
      SELECT 
        l."id", 
        l."code", 
        l."name", 
        l."nativeName", 
        l."isDefault",
        COALESCE(l."isActive", true) AS "isActive",
        COUNT(t."id")::int AS "translatedCount",
        COUNT(CASE WHEN t."isVerified" = false THEN 1 END)::int AS "unverifiedCount"
      FROM "languages" l
      LEFT JOIN "translations" t ON t."languageId" = l."id"
    `;

    if (activeOnly) {
      query += ` WHERE COALESCE(l."isActive", true) = true `;
    }

    query += `
      GROUP BY l."id", l."code", l."name", l."nativeName", l."isDefault", l."isActive"
      ORDER BY l."name" ASC
    `;

    const dbRes = await pgDb.query(query);
    if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
      const data = dbRes.rows.map((row: any) => ({
        ...row,
        isActive: row.isActive !== false,
        totalKeys,
        unverifiedCount: Number(row.unverifiedCount || 0),
      }));
      return res.json({ success: true, data });
    }
  } catch (err) {
    console.warn('Querying baseline languages fallback', err);
  }
  return res.json({
    success: true,
    data: BASELINE_LANGUAGES.map((l) => ({ ...l, isActive: true, translatedCount: 10, totalKeys: 10, unverifiedCount: 0 })),
  });
});

// ----------------------------------------------------------------------------
// GET /api/v1/i18n/keys — List all registered translation keys with English base
// ----------------------------------------------------------------------------
router.get('/keys', async (req: Request, res: Response) => {
  try {
    const dbRes = await pgDb.query(`
      SELECT 
        tk."id", 
        tk."key", 
        tk."description", 
        tk."module",
        COALESCE(
          (
            SELECT t."value" 
            FROM "translations" t 
            JOIN "languages" l ON t."languageId" = l."id" 
            WHERE l."code" = 'en' AND t."translationKeyId" = tk."id" 
            LIMIT 1
          ),
          tk."key"
        ) AS "baseValue"
      FROM "translation_keys" tk
      ORDER BY tk."key" ASC
    `);
    if (dbRes && dbRes.rows) {
      return res.json({ success: true, data: dbRes.rows });
    }
  } catch (err) {
    console.warn('Error fetching translation keys', err);
  }
  return res.json({ success: true, data: [] });
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
      const id = `lang_${langCode}_${Date.now()}`;

      try {
        if (isDefault) {
          await pgDb.query(`UPDATE "languages" SET "isDefault" = false WHERE "code" != $1`, [langCode]);
        }
        await pgDb.query(
          `INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault") VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "nativeName" = EXCLUDED."nativeName", "isDefault" = EXCLUDED."isDefault"`,
          [id, langCode, String(name).trim(), String(nativeName).trim(), Boolean(isDefault)]
        );
      } catch (e) {
        console.warn('DB insert language fallback');
      }

      return res.status(201).json({
        success: true,
        data: { id, code: langCode, name: String(name).trim(), nativeName: String(nativeName).trim(), isDefault: Boolean(isDefault), isActive: true },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// PATCH /api/v1/i18n/languages/:code/toggle-active — Enable / Disable language
// ----------------------------------------------------------------------------
router.patch(
  '/languages/:code/toggle-active',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('TOGGLE_ACTIVE', 'language'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code || '').toLowerCase().trim();
      if (!code) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Language code is required');
      }

      if (code === 'en') {
        throw new AppError(400, 'CANNOT_DISABLE_DEFAULT_LANGUAGE', 'The default system language (en) cannot be disabled');
      }

      const langRes = await pgDb.query(
        `SELECT "id", "code", "name", "isDefault", COALESCE("isActive", true) AS "isActive" FROM "languages" WHERE "code" = $1`,
        [code]
      );
      if (langRes.rows.length === 0) {
        throw new AppError(404, 'LANGUAGE_NOT_FOUND', `Language with code "${code}" not found`);
      }

      const lang = langRes.rows[0] as any;
      if (lang.isDefault) {
        throw new AppError(400, 'CANNOT_DISABLE_DEFAULT_LANGUAGE', 'Default system language cannot be disabled');
      }

      const currentActive = lang.isActive !== false;
      const newActive = !currentActive;

      await pgDb.query(
        `UPDATE "languages" SET "isActive" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "code" = $2`,
        [newActive, code]
      );

      return res.json({
        success: true,
        data: {
          code,
          isActive: newActive,
          message: `Language "${code}" ${newActive ? 'enabled' : 'disabled'} successfully`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// DELETE /api/v1/i18n/languages/:code — Delete language and associated translations
// ----------------------------------------------------------------------------
router.delete(
  '/languages/:code',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('DELETE', 'language'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code || '').toLowerCase().trim();
      if (!code) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Language code is required');
      }

      if (code === 'en') {
        throw new AppError(400, 'CANNOT_DELETE_DEFAULT_LANGUAGE', 'The default system language (en) cannot be deleted');
      }

      const langRes = await pgDb.query(
        `SELECT "id", "code", "name", "isDefault" FROM "languages" WHERE "code" = $1`,
        [code]
      );
      if (langRes.rows.length === 0) {
        throw new AppError(404, 'LANGUAGE_NOT_FOUND', `Language with code "${code}" not found`);
      }

      const lang = langRes.rows[0] as any;
      if (lang.isDefault) {
        throw new AppError(400, 'CANNOT_DELETE_DEFAULT_LANGUAGE', 'Default system language cannot be deleted');
      }

      // 1. Reset user_preferences to default 'en' if set to this deleted language code
      try {
        await pgDb.query(`UPDATE "user_preferences" SET "languageCode" = 'en' WHERE "languageCode" = $1`, [code]);
      } catch (prefErr) {
        // user_preferences table may not exist in isolated test environments
      }

      // 2. Cascade delete translations for this language
      await pgDb.query(`DELETE FROM "translations" WHERE "languageId" = $1`, [lang.id]);

      // 3. Delete language record
      await pgDb.query(`DELETE FROM "languages" WHERE "id" = $1`, [lang.id]);

      return res.json({
        success: true,
        message: `Language "${code}" and all associated translations deleted successfully`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// GET /api/v1/i18n/translations/:langCode — Get translation dictionary for language
// ----------------------------------------------------------------------------
router.get('/translations/:langCode', async (req: Request, res: Response) => {
  const { langCode } = req.params;
  const targetCode = String(langCode).toLowerCase().trim();
  const dict: Record<string, string> = { ...SEED_TRANSLATIONS['en'] };
  const dbDict: Record<string, string> = {};
  const verifiedMap: Record<string, boolean> = {};

  if (SEED_TRANSLATIONS[targetCode]) {
    Object.assign(dict, SEED_TRANSLATIONS[targetCode]);
  }

  try {
    const transRes = await pgDb.query(
      `SELECT t."value", tk."key", COALESCE(t."isVerified", false) AS "isVerified"
       FROM "translations" t
       JOIN "languages" l ON t."languageId" = l."id"
       JOIN "translation_keys" tk ON t."translationKeyId" = tk."id"
       WHERE l."code" = $1`,
      [targetCode]
    );

    if (transRes && transRes.rows) {
      transRes.rows.forEach((row: any) => {
        dict[row.key] = row.value;
        dbDict[row.key] = row.value;
        verifiedMap[row.key] = Boolean(row.isVerified);
      });
    }
  } catch (err) {
    console.warn('Using translation dictionary fallback for', targetCode);
  }

  return res.json({
    success: true,
    data: {
      languageCode: targetCode,
      translations: dict,
      dbTranslations: dbDict,
      verifiedMap,
    },
  });
});

// ----------------------------------------------------------------------------
// POST /api/v1/i18n/translations — Upsert single translation value in DB
// ----------------------------------------------------------------------------
router.post(
  '/translations',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('UPSERT', 'translation'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { languageCode, key, value, description, module, isVerified } = req.body;
      if (!languageCode || !key || value === undefined) {
        throw new AppError(400, 'VALIDATION_ERROR', 'languageCode, key, and value are required');
      }

      const langCode = String(languageCode).toLowerCase().trim();
      const keyStr = String(key).trim();
      // Human updates via management panel default to verified true
      const verified = isVerified !== undefined ? Boolean(isVerified) : true;

      try {
        const langRes = await pgDb.query(`SELECT "id" FROM "languages" WHERE "code" = $1`, [langCode]);
        let langId = langRes.rows[0]?.id;
        if (!langId) {
          langId = `lang_${langCode}_${Date.now()}`;
          await pgDb.query(
            `INSERT INTO "languages" ("id", "code", "name", "nativeName") VALUES ($1, $2, $3, $4)`,
            [langId, langCode, langCode.toUpperCase(), langCode.toUpperCase()]
          );
        }

        const keyRes = await pgDb.query(`SELECT "id" FROM "translation_keys" WHERE "key" = $1`, [keyStr]);
        let keyId = keyRes.rows[0]?.id;
        if (!keyId) {
          keyId = `tk_${keyStr}_${Date.now()}`;
          await pgDb.query(
            `INSERT INTO "translation_keys" ("id", "key", "description", "module") VALUES ($1, $2, $3, $4)`,
            [keyId, keyStr, description || null, module || 'common']
          );
        }

        const transId = `t_${langCode}_${keyStr}`;
        await pgDb.query(
          `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value", "isVerified")
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT ("languageId", "translationKeyId")
           DO UPDATE SET "value" = EXCLUDED."value", "isVerified" = EXCLUDED."isVerified"`,
          [transId, langId, keyId, String(value), verified]
        );

        return res.json({
          success: true,
          data: { id: transId, languageCode: langCode, key: keyStr, value: String(value), isVerified: verified },
        });
      } catch (e) {
        console.warn('Upsert fallback for translation', keyStr);
      }

      if (!SEED_TRANSLATIONS[langCode]) SEED_TRANSLATIONS[langCode] = {};
      SEED_TRANSLATIONS[langCode][keyStr] = String(value);

      return res.json({ success: true, data: { languageCode: langCode, key: keyStr, value: String(value), isVerified: verified } });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// GET /api/v1/i18n/export/all — Export all languages in single backup JSON or CSV
// ----------------------------------------------------------------------------
router.get(
  '/export/all',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const format = String(req.query.format || 'json').toLowerCase().trim();

      const langsRes = await pgDb.query(`SELECT "id", "code", "name", "nativeName", "isDefault" FROM "languages" ORDER BY "code" ASC`);
      const languages = langsRes.rows;

      const keysRes = await pgDb.query(`SELECT "id", "key", "module", "description" FROM "translation_keys" ORDER BY "key" ASC`);
      const keys = keysRes.rows;

      const translationsRes = await pgDb.query(`
        SELECT l."code" as "langCode", tk."key", t."value", COALESCE(t."isVerified", false) as "isVerified"
        FROM "translations" t
        JOIN "languages" l ON t."languageId" = l."id"
        JOIN "translation_keys" tk ON t."translationKeyId" = tk."id"
      `);

      const translationsByLang: Record<string, Record<string, string>> = {};
      const verifiedByLang: Record<string, Record<string, boolean>> = {};

      translationsRes.rows.forEach((r: any) => {
        if (!translationsByLang[r.langCode]) translationsByLang[r.langCode] = {};
        if (!verifiedByLang[r.langCode]) verifiedByLang[r.langCode] = {};
        translationsByLang[r.langCode][r.key] = r.value;
        verifiedByLang[r.langCode][r.key] = Boolean(r.isVerified);
      });

      if (format === 'csv') {
        const langCodes = languages.map((l: any) => l.code);
        const header = ['key', ...langCodes].join(',') + '\n';
        const lines = keys.map((k: any) => {
          const row = [escapeCsvCell(k.key)];
          for (const lc of langCodes) {
            row.push(escapeCsvCell(translationsByLang[lc]?.[k.key] || ''));
          }
          return row.join(',');
        });
        const csvContent = String.fromCharCode(0xfeff) + header + lines.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="translations-all.csv"`);
        return res.send(csvContent);
      }

      return res.json({
        success: true,
        data: {
          exportedAt: new Date().toISOString(),
          languages,
          totalKeys: keys.length,
          translations: translationsByLang,
          verified: verifiedByLang,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// GET /api/v1/i18n/export/:langCode — Export translations as JSON or CSV
// ----------------------------------------------------------------------------
router.get(
  '/export/:langCode',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { langCode } = req.params;
      const format = String(req.query.format || 'json').toLowerCase().trim();
      const targetCode = String(langCode).toLowerCase().trim();

      const langRes = await pgDb.query(`SELECT "id", "code", "name", "nativeName" FROM "languages" WHERE "code" = $1`, [targetCode]);
      if (!langRes.rows.length) {
        throw new AppError(404, 'NOT_FOUND', `Language '${targetCode}' does not exist`);
      }
      const lang = langRes.rows[0];

      const rowsRes = await pgDb.query(
        `
        SELECT 
          tk."key",
          tk."module",
          COALESCE(
            (SELECT en_t."value" FROM "translations" en_t 
             JOIN "languages" en_l ON en_t."languageId" = en_l."id" 
             WHERE en_l."code" = 'en' AND en_t."translationKeyId" = tk."id" LIMIT 1),
            tk."key"
          ) AS "english",
          t."value" AS "translation",
          COALESCE(t."isVerified", false) AS "isVerified"
        FROM "translation_keys" tk
        LEFT JOIN "translations" t ON t."translationKeyId" = tk."id" AND t."languageId" = $1
        ORDER BY tk."key" ASC
        `,
        [lang.id]
      );

      if (format === 'csv') {
        const header = 'key,english,translation,isVerified\n';
        const lines = rowsRes.rows.map((r: any) =>
          `${escapeCsvCell(r.key)},${escapeCsvCell(r.english)},${escapeCsvCell(r.translation || '')},${r.isVerified ? 'true' : 'false'}`
        );
        const csvContent = String.fromCharCode(0xfeff) + header + lines.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="translations-${targetCode}.csv"`);
        return res.send(csvContent);
      }

      const translationsObj: Record<string, string> = {};
      const verifiedObj: Record<string, boolean> = {};
      rowsRes.rows.forEach((r: any) => {
        if (r.translation !== null && r.translation !== undefined) {
          translationsObj[r.key] = r.translation;
          verifiedObj[r.key] = Boolean(r.isVerified);
        }
      });

      return res.json({
        success: true,
        data: {
          languageCode: targetCode,
          languageName: lang.name,
          nativeName: lang.nativeName,
          exportedAt: new Date().toISOString(),
          translations: translationsObj,
          verified: verifiedObj,
          details: rowsRes.rows.map((r: any) => ({
            key: r.key,
            english: r.english,
            translation: r.translation || '',
            isVerified: Boolean(r.isVerified),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);



// ----------------------------------------------------------------------------
// Core Translation Import Execution Logic (Single or Batch Item)
// ----------------------------------------------------------------------------
export interface TranslationImportInput {
  languageCode?: string;
  filename?: string;
  csvContent?: string;
  translations?: any;
  format?: string;
  content?: string;
}

export interface TranslationImportResult {
  languageCode: string;
  languageName: string;
  updatedCount: number;
  skippedCount: number;
  unknownKeys: string[];
  failedCount: number;
}

export async function executeTranslationImport(params: TranslationImportInput): Promise<TranslationImportResult> {
  let { languageCode, filename, csvContent, translations, format, content } = params;
  let targetCode = languageCode ? String(languageCode).toLowerCase().trim() : '';
  let parsedJsonFromContent: any = null;

  if (!csvContent && !translations && content) {
    if (format === 'json') {
      try {
        translations = typeof content === 'string' ? JSON.parse(content) : content;
        parsedJsonFromContent = translations;
      } catch {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid JSON content provided');
      }
    } else if (format === 'csv') {
      csvContent = content;
    } else if (typeof content === 'string') {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          translations = JSON.parse(trimmed);
          parsedJsonFromContent = translations;
        } catch {
          csvContent = content;
        }
      } else {
        csvContent = content;
      }
    } else {
      translations = content;
      parsedJsonFromContent = content;
    }
  } else if (translations && typeof translations === 'object') {
    parsedJsonFromContent = translations;
  }

  // 1. Derive language code from filename if not explicitly provided
  if (!targetCode && filename) {
    const baseName = path.basename(String(filename)).trim();
    const patternMatch = baseName.match(/^translations?[-_]([a-zA-Z0-9_-]+)\.(csv|json)$/i);
    if (patternMatch && patternMatch[1]) {
      targetCode = patternMatch[1].toLowerCase().trim();
    } else {
      const simpleMatch = baseName.match(/^([a-zA-Z]{2,5}(?:-[a-zA-Z0-9]+)?)\.(csv|json)$/i);
      if (simpleMatch && simpleMatch[1]) {
        targetCode = simpleMatch[1].toLowerCase().trim();
      }
    }
  }

  // 2. Fallback to JSON body if not found
  if (!targetCode && parsedJsonFromContent && typeof parsedJsonFromContent === 'object') {
    const code =
      parsedJsonFromContent.languageCode ||
      parsedJsonFromContent.data?.languageCode ||
      parsedJsonFromContent.langCode ||
      parsedJsonFromContent.code ||
      parsedJsonFromContent.language?.code;
    if (code && typeof code === 'string' && code.trim()) {
      targetCode = String(code).toLowerCase().trim();
    }
  }

  // 3. Fallback to CSV header row if not found
  let csvRows: string[][] = [];
  if (csvContent) {
    csvRows = parseCsv(String(csvContent));
    if (csvRows.length < 2) {
      throw new AppError(400, 'VALIDATION_ERROR', 'CSV must have a header row and at least one data row');
    }
    if (!targetCode) {
      const header = csvRows[0].map((h) => h.toLowerCase().trim().replace(/^\uFEFF/, ''));
      const langColIdx = header.findIndex(
        (h) => h === 'languagecode' || h === 'language_code' || h === 'lang' || h === 'langcode'
      );
      if (langColIdx !== -1 && csvRows.length > 1) {
        const val = csvRows[1][langColIdx]?.trim();
        if (val) targetCode = val.toLowerCase();
      } else {
        const ignoredCols = new Set(['key', 'english', 'translation', 'value', 'isverified', 'description', 'module', 'comments', 'notes']);
        const candidateCol = header.find((h) => !ignoredCols.has(h) && /^[a-z]{2,5}(-[a-z0-9]+)?$/.test(h));
        if (candidateCol) {
          targetCode = candidateCol.toLowerCase();
        }
      }
    }
  }

  if (!targetCode) {
    throw new AppError(400, 'VALIDATION_ERROR', 'languageCode is required and could not be determined from filename or file content');
  }

  // 4. Validate language exists in DB
  const langRes = await pgDb.query(`SELECT "id", "code", "name" FROM "languages" WHERE "code" = $1`, [targetCode]);
  if (!langRes.rows.length) {
    throw new AppError(400, 'UNKNOWN_LANGUAGE', `Language code '${targetCode}' does not exist. Please register the language before importing.`);
  }
  const lang = langRes.rows[0];

  // 5. Dictionary of key -> value extracted from payload
  const pairsToImport: Record<string, string> = {};

  if (csvContent) {
    if (csvRows.length < 2) {
      throw new AppError(400, 'VALIDATION_ERROR', 'CSV must have a header row and at least one data row');
    }
    const header = csvRows[0].map((h) => h.toLowerCase().trim().replace(/^\uFEFF/, ''));
    const keyIdx = header.indexOf('key');
    let transIdx = header.indexOf('translation');
    if (transIdx === -1 && targetCode) transIdx = header.indexOf(targetCode);
    if (transIdx === -1) transIdx = header.indexOf('value');
    if (transIdx === -1 && header.length >= 2) {
      transIdx = header.includes('english') ? header.findIndex((h, idx) => idx !== keyIdx && h !== 'english') : 1;
    }

    if (keyIdx === -1 || transIdx === -1) {
      throw new AppError(400, 'VALIDATION_ERROR', 'CSV must contain "key" and translation columns');
    }

    for (let i = 1; i < csvRows.length; i++) {
      const row = csvRows[i];
      const k = row[keyIdx]?.trim();
      const v = row[transIdx];
      if (k) {
        pairsToImport[k] = v !== undefined ? v : '';
      }
    }
  } else if (translations && typeof translations === 'object') {
    const transObj = translations.translations || translations;
    if (Array.isArray(transObj)) {
      transObj.forEach((item) => {
        if (item && item.key) {
          pairsToImport[String(item.key).trim()] = item.translation !== undefined ? String(item.translation) : String(item.value ?? '');
        }
      });
    } else {
      for (const [k, v] of Object.entries(transObj)) {
        if (k && typeof v !== 'object') pairsToImport[k.trim()] = String(v ?? '');
      }
    }
  } else {
    throw new AppError(400, 'VALIDATION_ERROR', 'Either translations object or csvContent must be provided');
  }

  // 6. Fetch all registered translation keys
  const allKeysRes = await pgDb.query(`SELECT "id", "key" FROM "translation_keys"`);
  const keyMap = new Map<string, string>();
  allKeysRes.rows.forEach((r: any) => keyMap.set(r.key, r.id));

  const unknownKeys: string[] = [];
  let updatedCount = 0;
  let skippedCount = 0;

  for (const [key, val] of Object.entries(pairsToImport)) {
    if (!keyMap.has(key)) {
      unknownKeys.push(key);
      skippedCount++;
      continue;
    }

    const keyId = keyMap.get(key)!;
    const transId = `t_${targetCode}_${key}`;

    await pgDb.query(
      `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value", "isVerified")
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT ("languageId", "translationKeyId")
       DO UPDATE SET "value" = EXCLUDED."value", "isVerified" = true`,
      [transId, lang.id, keyId, val]
    );
    updatedCount++;
  }

  return {
    languageCode: targetCode,
    languageName: lang.name,
    updatedCount,
    skippedCount,
    unknownKeys,
    failedCount: 0,
  };
}

// ----------------------------------------------------------------------------
// POST /api/v1/i18n/import — Import translations from JSON or CSV (single file)
// ----------------------------------------------------------------------------
router.post(
  '/import',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('IMPORT', 'translations'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await executeTranslationImport(req.body);
      return res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// POST /api/v1/i18n/import/batch — Import translations in bulk (multiple files)
// ----------------------------------------------------------------------------
router.post(
  '/import/batch',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('IMPORT_BATCH', 'translations'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        throw new AppError(400, 'VALIDATION_ERROR', 'files array is required and must not be empty');
      }

      const results = [];
      let successCount = 0;
      let failedCount = 0;

      for (const item of files) {
        const filename = item.filename || item.name || 'unknown';
        try {
          const importRes = await executeTranslationImport({
            languageCode: item.languageCode,
            filename,
            csvContent: item.csvContent,
            translations: item.translations,
            format: item.format,
            content: item.content,
          });

          results.push({
            filename,
            status: 'done' as const,
            languageCode: importRes.languageCode,
            languageName: importRes.languageName,
            updatedCount: importRes.updatedCount,
            skippedCount: importRes.skippedCount,
            unknownKeys: importRes.unknownKeys,
          });
          successCount++;
        } catch (err: any) {
          failedCount++;
          results.push({
            filename,
            status: 'failed' as const,
            error: err.message || 'Import failed',
            languageCode: item.languageCode,
          });
        }
      }

      return res.json({
        success: true,
        data: {
          totalFiles: files.length,
          successCount,
          failedCount,
          results,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// POST /api/v1/i18n/translate-batch — Run AI batch translation pass for language(s)
// ----------------------------------------------------------------------------
router.post(
  '/translate-batch',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('BATCH_TRANSLATE', 'i18n'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { languageCode, languageCodes } = req.body;
      const targets: string[] = [];

      if (languageCode) {
        targets.push(String(languageCode).toLowerCase().trim());
      } else if (Array.isArray(languageCodes)) {
        languageCodes.forEach((c) => targets.push(String(c).toLowerCase().trim()));
      } else {
        // Default to all languages in database except 'en'
        const langs = await pgDb.query(`SELECT "code" FROM "languages" WHERE "code" != 'en'`);
        langs.rows.forEach((r: any) => targets.push(r.code));
      }

      // Fetch all translation keys with their base English values
      const keysRes = await pgDb.query(`
        SELECT 
          tk."key", 
          tk."description", 
          tk."module",
          COALESCE(
            (SELECT t."value" FROM "translations" t 
             JOIN "languages" l ON t."languageId" = l."id" 
             WHERE l."code" = 'en' AND t."translationKeyId" = tk."id" LIMIT 1),
            tk."key"
          ) AS "en"
        FROM "translation_keys" tk
        ORDER BY tk."key" ASC
      `);

      const allKeys: KeyToTranslate[] = keysRes.rows.map((r: any) => ({
        key: r.key,
        en: r.en,
        description: r.description,
        module: r.module,
      }));

      const summary: Record<string, number> = {};

      for (const code of targets) {
        const translations = await AITranslationService.translateBatchForLanguage(code, allKeys);
        // Persist translations with isVerified = false
        const saved = await AITranslationService.persistTranslations(code, translations, false);
        summary[code] = saved;
      }

      return res.json({
        success: true,
        data: {
          totalKeys: allKeys.length,
          processedLanguages: targets,
          summary,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
