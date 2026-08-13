import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

const router = Router();

const BASELINE_LANGUAGES = [
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

// ----------------------------------------------------------------------------
// GET /api/v1/i18n/languages — List all registered languages from DB
// ----------------------------------------------------------------------------
router.get('/languages', async (req: Request, res: Response) => {
  try {
    const dbRes = await pgDb.query(`SELECT "id", "code", "name", "nativeName", "isDefault" FROM "languages" ORDER BY "name" ASC`);
    if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
      return res.json({ success: true, data: dbRes.rows });
    }
  } catch (err) {
    console.warn('Querying baseline languages fallback');
  }
  return res.json({ success: true, data: BASELINE_LANGUAGES });
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
        await pgDb.query(
          `INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name"`,
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
// GET /api/v1/i18n/translations/:langCode — Get translation dictionary for language from DB
// ----------------------------------------------------------------------------
router.get('/translations/:langCode', async (req: Request, res: Response) => {
  const { langCode } = req.params;
  const targetCode = String(langCode).toLowerCase().trim();
  const dict: Record<string, string> = { ...SEED_TRANSLATIONS['en'] };

  if (SEED_TRANSLATIONS[targetCode]) {
    Object.assign(dict, SEED_TRANSLATIONS[targetCode]);
  }

  try {
    const transRes = await pgDb.query(
      `SELECT t."value", tk."key"
       FROM "translations" t
       JOIN "languages" l ON t."languageId" = l."id"
       JOIN "translation_keys" tk ON t."translationKeyId" = tk."id"
       WHERE l."code" = $1`,
      [targetCode]
    );

    if (transRes && transRes.rows) {
      transRes.rows.forEach((row: any) => {
        dict[row.key] = row.value;
      });
    }
  } catch (err) {
    console.warn('Using translation dictionary fallback for', targetCode);
  }

  return res.json({ success: true, data: { languageCode: targetCode, translations: dict } });
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
          `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value") VALUES ($1, $2, $3, $4)
           ON CONFLICT ("languageId", "translationKeyId") DO UPDATE SET "value" = EXCLUDED."value"`,
          [transId, langId, keyId, String(value)]
        );

        return res.json({ success: true, data: { id: transId, languageCode: langCode, key: keyStr, value: String(value) } });
      } catch (e) {
        console.warn('Upsert fallback for translation', keyStr);
      }

      if (!SEED_TRANSLATIONS[langCode]) SEED_TRANSLATIONS[langCode] = {};
      SEED_TRANSLATIONS[langCode][keyStr] = String(value);

      return res.json({ success: true, data: { languageCode: langCode, key: keyStr, value: String(value) } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
