import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';
import { AITranslationService, KeyToTranslate } from '../services/ai-translation.service';

const router = Router();

export const BASELINE_LANGUAGES = [
  { id: 'l1', code: 'en', name: 'English', nativeName: 'English', isDefault: true },
  { id: 'l2', code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isDefault: false },
  { id: 'l3', code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isDefault: false },
  { id: 'l4', code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isDefault: false },
  { id: 'l5', code: 'mr', name: 'Marathi', nativeName: 'मराठी', isDefault: false },
  { id: 'l6', code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isDefault: false },
  { id: 'l7', code: 'ur', name: 'Urdu', nativeName: 'اردو', isDefault: false },
  { id: 'l8', code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isDefault: false },
  { id: 'l9', code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isDefault: false },
  { id: 'l10', code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isDefault: false },
  { id: 'l11', code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isDefault: false },
  { id: 'l12', code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isDefault: false },
  { id: 'l13', code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', isDefault: false },
  { id: 'l14', code: 'ma', name: 'Maithili', nativeName: 'मैथिली', isDefault: false },
  { id: 'l15', code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', isDefault: false },
  { id: 'l16', code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी', isDefault: false },
  { id: 'l17', code: 'ne', name: 'Nepali', nativeName: 'नेपाली', isDefault: false },
  { id: 'l18', code: 'sd', name: 'Sindhi', nativeName: 'सिंधी', isDefault: false },
  { id: 'l19', code: 'br', name: 'Bodo', nativeName: 'बोडो', isDefault: false },
  { id: 'l20', code: 'doi', name: 'Dogri', nativeName: 'डोगरी', isDefault: false },
  { id: 'l21', code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', isDefault: false },
  { id: 'l22', code: 'sat', name: 'Santhali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', isDefault: false },
  { id: 'l23', code: 'lus', name: 'Mizo', nativeName: 'Mizo', isDefault: false },
];

const SEED_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: { welcome: 'Welcome to ExamOS Platform', app_title: 'ExamOS // Adaptive Learning Platform', dashboard: 'Dashboard', users: 'User Management', courses: 'Academic Courses', question_bank: 'Question Bank', exam_patterns: 'Exam Patterns', analytics: 'Student Analytics' },
  hi: { welcome: 'ExamOS प्लेटफॉर्म में आपका स्वागत है', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'छात्र विश्लेषण' },
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
    const totalKeysRes = await pgDb.query(`SELECT COUNT(*)::int AS count FROM "translation_keys"`);
    const totalKeys = totalKeysRes.rows[0]?.count || 10;

    const dbRes = await pgDb.query(`
      SELECT 
        l."id", 
        l."code", 
        l."name", 
        l."nativeName", 
        l."isDefault",
        COUNT(t."id")::int AS "translatedCount",
        COUNT(CASE WHEN t."isVerified" = false THEN 1 END)::int AS "unverifiedCount"
      FROM "languages" l
      LEFT JOIN "translations" t ON t."languageId" = l."id"
      GROUP BY l."id", l."code", l."name", l."nativeName", l."isDefault"
      ORDER BY l."name" ASC
    `);
    if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
      const data = dbRes.rows.map((row: any) => ({
        ...row,
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
    data: BASELINE_LANGUAGES.map((l) => ({ ...l, translatedCount: 10, totalKeys: 10, unverifiedCount: 0 })),
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
        data: { id, code: langCode, name: String(name).trim(), nativeName: String(nativeName).trim(), isDefault: Boolean(isDefault) },
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
// POST /api/v1/i18n/import — Import translations from JSON or CSV
// ----------------------------------------------------------------------------
router.post(
  '/import',
  authenticate,
  requirePermission(PERMISSIONS.I18N_MANAGE),
  auditLog('IMPORT', 'translations'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { languageCode, csvContent, translations, format, content } = req.body;
      let targetCode = languageCode ? String(languageCode).toLowerCase().trim() : '';

      if (!csvContent && !translations && content) {
        if (format === 'json') {
          try {
            translations = typeof content === 'string' ? JSON.parse(content) : content;
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
            } catch {
              csvContent = content;
            }
          } else {
            csvContent = content;
          }
        } else {
          translations = content;
        }
      }

      // Dictionary of key -> value extracted from payload
      const pairsToImport: Record<string, string> = {};

      if (csvContent) {
        const rows = parseCsv(String(csvContent));
        if (rows.length < 2) {
          throw new AppError(400, 'VALIDATION_ERROR', 'CSV must have a header row and at least one data row');
        }
        const header = rows[0].map((h) => h.toLowerCase().trim().replace(/^\uFEFF/, ''));
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

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const k = row[keyIdx]?.trim();
          const v = row[transIdx];
          if (k) {
            pairsToImport[k] = v !== undefined ? v : '';
          }
        }
      } else if (translations && typeof translations === 'object') {
        if (Array.isArray(translations)) {
          translations.forEach((item) => {
            if (item && item.key) {
              pairsToImport[String(item.key).trim()] = item.translation !== undefined ? String(item.translation) : String(item.value ?? '');
            }
          });
        } else {
          for (const [k, v] of Object.entries(translations)) {
            if (k) pairsToImport[k.trim()] = String(v ?? '');
          }
        }
      } else {
        throw new AppError(400, 'VALIDATION_ERROR', 'Either translations object or csvContent must be provided');
      }

      if (!targetCode) {
        throw new AppError(400, 'VALIDATION_ERROR', 'languageCode is required');
      }

      // 1. Strictly validate that language exists in DB (do NOT auto-create on import)
      const langRes = await pgDb.query(`SELECT "id", "code", "name" FROM "languages" WHERE "code" = $1`, [targetCode]);
      if (!langRes.rows.length) {
        throw new AppError(400, 'UNKNOWN_LANGUAGE', `Language code '${targetCode}' does not exist. Please register the language before importing.`);
      }
      const lang = langRes.rows[0];

      // 2. Fetch all registered translation keys
      const allKeysRes = await pgDb.query(`SELECT "id", "key" FROM "translation_keys"`);
      const keyMap = new Map<string, string>();
      allKeysRes.rows.forEach((r: any) => keyMap.set(r.key, r.id));

      const unknownKeys: string[] = [];
      let updatedCount = 0;
      let skippedCount = 0;

      for (const [key, val] of Object.entries(pairsToImport)) {
        // If key doesn't exist in translation_keys, skip it without failing the whole batch
        if (!keyMap.has(key)) {
          unknownKeys.push(key);
          skippedCount++;
          continue;
        }

        const keyId = keyMap.get(key)!;
        const transId = `t_${targetCode}_${key}`;

        // Upsert into translations with isVerified = true (human supplied)
        await pgDb.query(
          `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value", "isVerified")
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT ("languageId", "translationKeyId")
           DO UPDATE SET "value" = EXCLUDED."value", "isVerified" = true`,
          [transId, lang.id, keyId, val]
        );
        updatedCount++;
      }

      return res.json({
        success: true,
        data: {
          languageCode: targetCode,
          languageName: lang.name,
          updatedCount,
          skippedCount,
          unknownKeys,
          failedCount: 0,
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
