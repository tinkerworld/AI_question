import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'users.create', description: 'Create user accounts', module: 'users' },
  { key: 'users.read', description: 'View user profiles', module: 'users' },
  { key: 'users.update', description: 'Update user profiles', module: 'users' },
  { key: 'users.delete', description: 'Delete user accounts', module: 'users' },
  { key: 'roles.manage', description: 'Manage roles and permissions', module: 'roles' },
  { key: 'audit.read', description: 'View system audit logs', module: 'audit' },
  { key: 'i18n.manage', description: 'Manage multilingual translations', module: 'i18n' },
  { key: 'preferences.update', description: 'Update system preferences', module: 'preferences' },
  { key: 'courses.create', description: 'Create courses and subjects', module: 'courses' },
  { key: 'courses.read', description: 'View courses and syllabus', module: 'courses' },
  { key: 'courses.update', description: 'Update courses and syllabus', module: 'courses' },
  { key: 'courses.delete', description: 'Delete courses', module: 'courses' },
  { key: 'questions.create', description: 'Create question bank items', module: 'questions' },
  { key: 'questions.read', description: 'View question bank', module: 'questions' },
  { key: 'questions.update', description: 'Update question items', module: 'questions' },
  { key: 'questions.delete', description: 'Delete question items', module: 'questions' },
  { key: 'exams.create', description: 'Create exam patterns', module: 'exams' },
  { key: 'exams.read', description: 'View exam patterns and results', module: 'exams' },
  { key: 'exams.publish', description: 'Publish exams', module: 'exams' },
  { key: 'exams.attempt', description: 'Attempt student exams', module: 'exams' },
];

const ROLES = [
  {
    name: 'MAIN_ADMIN',
    description: 'System Super Administrator with full authority',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    name: 'SUB_ADMIN',
    description: 'Delegated Administrator for content & user ops',
    isSystem: true,
    permissions: [
      'users.read', 'users.create', 'users.update',
      'courses.read', 'courses.create', 'courses.update',
      'questions.read', 'questions.create', 'questions.update',
      'exams.read', 'audit.read',
    ],
  },
  {
    name: 'TEACHER',
    description: 'Faculty and question author',
    isSystem: true,
    permissions: [
      'courses.read', 'questions.read', 'questions.create',
      'questions.update', 'exams.read', 'exams.create',
    ],
  },
  {
    name: 'STUDENT',
    description: 'Enrolled learner persona',
    isSystem: true,
    permissions: ['courses.read', 'exams.read', 'exams.attempt'],
  },
];

// 23 Baseline Languages
const BASELINE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', isDefault: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isDefault: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isDefault: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isDefault: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', isDefault: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isDefault: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isDefault: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isDefault: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isDefault: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isDefault: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isDefault: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isDefault: false },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', isDefault: false },
  { code: 'ma', name: 'Maithili', nativeName: 'मैथिली', isDefault: false },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', isDefault: false },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी', isDefault: false },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', isDefault: false },
  { code: 'sd', name: 'Sindhi', nativeName: 'सिंधी', isDefault: false },
  { code: 'br', name: 'Bodo', nativeName: 'बोडो', isDefault: false },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', isDefault: false },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', isDefault: false },
  { code: 'sat', name: 'Santhali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', isDefault: false },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo', isDefault: false },
];

const TRANSLATION_KEYS = [
  { key: 'welcome', description: 'Welcome banner heading', module: 'common' },
  { key: 'app_title', description: 'Application header title', module: 'common' },
  { key: 'dashboard', description: 'Navigation dashboard label', module: 'navigation' },
  { key: 'users', description: 'Navigation user management label', module: 'navigation' },
  { key: 'courses', description: 'Navigation academic courses label', module: 'navigation' },
  { key: 'question_bank', description: 'Navigation question bank label', module: 'navigation' },
  { key: 'exam_patterns', description: 'Navigation exam patterns label', module: 'navigation' },
  { key: 'analytics', description: 'Navigation student analytics label', module: 'navigation' },
];

const SEED_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: { welcome: 'Welcome to ExamOS Platform', app_title: 'ExamOS // Adaptive Learning Platform', dashboard: 'Dashboard', users: 'User Management', courses: 'Academic Courses', question_bank: 'Question Bank', exam_patterns: 'Exam Patterns', analytics: 'Student Analytics' },
  hi: { welcome: 'ExamOS प्लेटफॉर्म में आपका स्वागत है', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'छात्र विश्लेषण' },
  bn: { welcome: 'ExamOS প্ল্যাটফর্মে স্বাগতম', app_title: 'ExamOS // অ্যাডাপ্টিভ লার্নিং প্ল্যাটফর্ম', dashboard: 'ড্যাশবোর্ড', users: 'ব্যবহারকারী পরিচালনা', courses: 'একাডেমিক কোর্স', question_bank: 'প্রশ্ন ব্যাংক', exam_patterns: 'পরীক্ষার প্যাটার্ন', analytics: 'ছাত্র অ্যানালিটিক্স' },
  te: { welcome: 'ExamOS ప్లాట్‌ఫారమ్‌కు స్వాగతం', app_title: 'ExamOS // అడాప్టివ్ లెర్నింగ్ ప్లాట్‌ఫారమ్', dashboard: 'డాష్‌బోర్డ్', users: 'వినియోగదారు నిర్వహణ', courses: 'అకాడమిక్ కోర్సులు', question_bank: 'ప్రశ్నల బ్యాంక్', exam_patterns: 'పరీక్షా సరళి', analytics: 'విద్యార్థుల విశ్లేషణ' },
  mr: { welcome: 'ExamOS प्लॅटफॉर्मवर आपले स्वागत आहे', app_title: 'ExamOS // अ‍ॅडॉप्टिव्ह लर्निंग प्लॅटफॉर्म', dashboard: 'डॅशबोर्ड', users: 'वापरकर्ता व्यवस्थापन', courses: 'शैक्षणिक अभ्यासक्रम', question_bank: 'प्रश्न संच', exam_patterns: 'परीक्षा पद्धती', analytics: 'विद्यार्थी विश्लेषण' },
  ta: { welcome: 'ExamOS தளத்திற்கு உங்களை வரவேற்கிறோம்', app_title: 'ExamOS // தகவமைப்பு கற்றல் தளம்', dashboard: 'டாஷ்போர்டு', users: 'பயனர் நிர்வாகம்', courses: 'கல்விப் பாடங்கள்', question_bank: 'வினா வங்கி', exam_patterns: 'தேர்வு முறைகள்', analytics: 'மாணவர் பகுப்பாய்வு' },
  ur: { welcome: 'ExamOS پلیٹ فارم میں خوش آمدید', app_title: 'ExamOS // موافقانہ تعلیمی پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین کا انتظام', courses: 'تعليمى نصاب', question_bank: 'سوالات کا بنک', exam_patterns: 'امتحانی پیٹرن', analytics: 'طالب علم کا تجزیہ' },
  gu: { welcome: 'ExamOS પ્લેટફોર્મ પર આપનું સ્વાગત છે', app_title: 'ExamOS // અનુકૂલનશીલ શિક્ષણ પ્લેટફોર્મ', dashboard: 'ડેશબોર્ડ', users: 'વપરાશકર્તા સંચાલન', courses: 'શૈક્ષણિક અભ્યાસક્રમો', question_bank: 'પ્રશ્ન બેંક', exam_patterns: 'પરીક્ષા પેટર્ન', analytics: 'વિદ્યાર્થી પૃથ્થકરણ' },
  kn: { welcome: 'ExamOS ವೇದಿಕೆಗೆ ನಿಮಗೆ ಸುಸ್ವಾಗತ', app_title: 'ExamOS // ಅಡಾಪ್ಟಿವ್ ಕಲಿಕಾ ವೇದಿಕೆ', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', users: 'ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ', courses: 'ಶೈಕ್ಷಣಿಕ ಕೋರ್ಸ್‌ಗಳು', question_bank: 'ಪ್ರಶ್ನೆ ಬ್ಯಾಂಕ್', exam_patterns: 'ಪರೀಕ್ಷಾ ಮಾದರಿಗಳು', analytics: 'ವಿದ್ಯಾರ್ಥಿ ವಿಶ್ಲೇಷಣೆ' },
  ml: { welcome: 'ExamOS പ്ലാറ്റ്‌ഫോമിലേക്ക് സ്വാഗതം', app_title: 'ExamOS // അഡാപ്റ്റീവ് ലേണിംഗ് പ്ലാറ്റ്‌ഫോം', dashboard: 'ഡാഷ്‌ബോർഡ്', users: 'ഉപയോക്തൃ മാനേജ്മെന്റ്', courses: 'അക്കാദമിക് കോഴ്‌സുകൾ', question_bank: 'ചോദ്യ ബാങ്ക്', exam_patterns: 'പരീക്ഷാ പാറ്റേൺ', analytics: 'വിദ്യാർത്ഥി വിശകലനം' },
  or: { welcome: 'ExamOS ପ୍ଲାଟଫର୍ମକୁ ସ୍ୱାଗତ', app_title: 'ExamOS // ଆଡାପ୍ଟିଭ୍ ଶିକ୍ଷଣ ପ୍ଲାଟଫର୍ମ', dashboard: 'ଡ୍ୟାସବୋର୍ଡ', users: 'ବ୍ୟବହାରକାରୀ ପରିଚାଳନା', courses: 'ଶିକ୍ଷାଗତ ପାଠ୍ୟକ୍ରମ', question_bank: 'ପ୍ରଶ୍ନ ବ୍ୟାଙ୍କ', exam_patterns: 'ପରୀକ୍ଷା ପ୍ୟାଟର୍ନ', analytics: 'ଛାତ୍ର ବିଶ୍ଳେଷଣ' },
  pa: { welcome: 'ExamOS ਪਲੇਟਫਾਰਮ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ', app_title: 'ExamOS // ਅਨੁਕੂਲ ਸਿਖਲਾਈ ਪਲੇਟਫਾਰਮ', dashboard: 'ਡੈਸ਼ਬੋਰਡ', users: 'ਉਪਭੋਗਤਾ ਪ੍ਰਬੰਧਨ', courses: 'ਅਕਾਦਮਿਕ ਕੋਰਸ', question_bank: 'ਪ੍ਰਸ਼ਨ ਬੈਂਕ', exam_patterns: 'ਪ੍ਰੀਖਿਆ ਪੈਟਰਨ', analytics: 'ਵਿਦਿਆਰਥੀ ਵਿਸ਼ਲੇਸ਼ਣ' },
  as: { welcome: 'ExamOS মঞ্চলৈ স্বাগতম', app_title: 'ExamOS // অভিযোজনযোগ্য শিক্ষণ মঞ্চ', dashboard: 'ড্যাশবৰ্ড', users: 'ব্যৱহাৰকাৰী ব্যৱস্থাপনা', courses: 'শৈক্ষিক পাঠ্যক্ৰম', question_bank: 'প্ৰশ্ন বেংক', exam_patterns: 'পৰীক্ষাৰ আৰ্হি', analytics: 'ছাত্ৰ বিশ্লেষণ' },
  ma: { welcome: 'ExamOS मंच पर स्वागत अछि', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'प्रयोक्ता प्रबंधन', courses: 'शैक्षणिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा संरचना', analytics: 'छात्र विश्लेषण' },
  sa: { welcome: 'ExamOS मञ्चे भवतः स्वागतम् अस्ति', app_title: 'ExamOS // अनुकूलनीय-शिक्षण-मञ्चः', dashboard: 'फलकम्', users: 'उपयोक्तृ-प्रबन्धनम्', courses: 'शैक्षणिक-पाठ्यक्रमः', question_bank: 'प्रश्न-कोषः', exam_patterns: 'परीक्षा-स्वरूपम्', analytics: 'छात्र-विश्लेषणम्' },
  ks: { welcome: 'ExamOS پلیٹ فارمس پؠٹھ بَلائے تہٕ خوش آمدید', app_title: 'ExamOS // تعلیمی پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین ہُنٛد اِنتظام', courses: 'کورس', question_bank: 'سوال بنک', exam_patterns: 'امتحان پیٹرن', analytics: 'طالب علم تجزیہ' },
  ne: { welcome: 'ExamOS प्लेटफर्ममा स्वागत छ', app_title: 'ExamOS // अनुकूलन सिकाइ प्लेटफर्म', dashboard: 'ड्यासबोर्ड', users: 'प्रयोगकर्ता व्यवस्थापन', courses: 'शैक्षिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा ढाँचा', analytics: 'विद्यार्थी विश्लेषण' },
  sd: { welcome: 'ExamOS پليٽ فارم ۾ ڀليڪار', app_title: 'ExamOS // لڙڪندڙ تعليمي پليٽ فارم', dashboard: 'ڊيش بورڊ', users: 'استعمال ڪندڙن جو انتظام', courses: 'تعليمي ڪورس', question_bank: 'سوالن جي بئنڪ', exam_patterns: 'امتحاني نمونو', analytics: 'شاگردن جو تجزيو' },
  br: { welcome: 'ExamOS प्लेटफर्मआव बरायबाय', app_title: 'ExamOS // सोलोंथाय प्लेटफर्म', dashboard: 'डैशबोर्ड', users: 'बाहायगिरि सामलायनाय', courses: 'फरायलाइ', question_bank: 'सोंथि ब्यांक', exam_patterns: 'आनजाद रोखोम', analytics: 'फरायसुला बिजिरनाय' },
  doi: { welcome: 'ExamOS प्लेटफार्म पर थुंदा स्वागत ऐ', app_title: 'ExamOS // शिक्षण प्लेटफार्म', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'शैक्षणिक कोर्स', question_bank: 'सवाल बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'विद्यार्थी विश्लेषण' },
  mni: { welcome: 'ExamOS פ্লাটফোর্মদা তরাম্না ওকচরি', app_title: 'ExamOS // তম্বা প্লাটফোর্ম', dashboard: 'ড্যাশবোর্ড', users: 'শিজিন্নরিবা মীয়াম', courses: 'পারা লাইরিক', question_bank: 'Wahang Bank', exam_patterns: 'Exams Pattern', analytics: 'Student Analytics' },
  sat: { welcome: 'ExamOS ᱯᱞᱮᱴᱯᱷᱚᱨᱢ ᱨᱮ ᱥᱟᱹᱜᱩᱱ ᱫᱟᱨᱟᱢ', app_title: 'ExamOS // ᱪᱮᱫᱚᱜ ᱯᱞᱮᱴᱯᱷᱚᱨᱢ', dashboard: 'ᱰᱮᱥᱵᱳᱨᱰ', users: 'ᱵᱮᱣᱦᱟᱨᱤᱭᱟᱹ ᱥᱟ cross', courses: 'ᱠᱳᱨᱥ', question_bank: 'ᱠᱩᱠᱞᱤ ᱵᱮᱸᱠ', exam_patterns: 'ᱵᱤᱱᱤᱰ ᱯᱮᱴᱟᱨᱱ', analytics: 'ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱵᱤᱪᱟᱹᱨ' },
  lus: { welcome: 'ExamOS Platform-ah te lo lawm a ni', app_title: 'ExamOS // Zirna Platform', dashboard: 'Dashboard', users: 'Hmannu Inenkawlna', courses: 'Zirna Courses', question_bank: 'Zawhna Bank', exam_patterns: 'Chhenna Pattern', analytics: 'Zirlai Analysis' },
};

async function seed() {
  console.log('Seeding permissions & roles...');
  const permMap = new Map<string, string>();
  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description, module: p.module },
      create: { key: p.key, description: p.description, module: p.module },
    });
    permMap.set(p.key, perm.id);
  }

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: r.isSystem },
      create: { name: r.name, description: r.description, isSystem: r.isSystem },
    });
    for (const permKey of r.permissions) {
      const permId = permMap.get(permKey);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }

  console.log('Seeding 23 baseline languages into database...');
  const langMap = new Map<string, string>();
  for (const l of BASELINE_LANGUAGES) {
    const lang = await prisma.language.upsert({
      where: { code: l.code },
      update: { name: l.name, nativeName: l.nativeName, isDefault: l.isDefault },
      create: { code: l.code, name: l.name, nativeName: l.nativeName, isDefault: l.isDefault },
    });
    langMap.set(l.code, lang.id);
  }

  console.log('Seeding translation keys & values into database...');
  const keyMap = new Map<string, string>();
  for (const k of TRANSLATION_KEYS) {
    const tk = await prisma.translationKey.upsert({
      where: { key: k.key },
      update: { description: k.description, module: k.module },
      create: { key: k.key, description: k.description, module: k.module },
    });
    keyMap.set(k.key, tk.id);
  }

  let totalTranslationsSeeded = 0;
  let languagesWithFullTranslations = 0;

  for (const [langCode, keyVals] of Object.entries(SEED_TRANSLATIONS)) {
    const langId = langMap.get(langCode);
    if (langId) {
      let countForLang = 0;
      for (const [key, value] of Object.entries(keyVals)) {
        const keyId = keyMap.get(key);
        if (keyId) {
          await prisma.translation.upsert({
            where: {
              languageId_translationKeyId: { languageId: langId, translationKeyId: keyId },
            },
            update: { value },
            create: { languageId: langId, translationKeyId: keyId, value },
          });
          totalTranslationsSeeded++;
          countForLang++;
        }
      }
      if (countForLang === TRANSLATION_KEYS.length) {
        languagesWithFullTranslations++;
      }
    }
  }

  console.log(`Database seed complete: Registered ${BASELINE_LANGUAGES.length} baseline languages; seeded ${totalTranslationsSeeded} translation entries across ${languagesWithFullTranslations} languages with 100% full 8-key coverage.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
