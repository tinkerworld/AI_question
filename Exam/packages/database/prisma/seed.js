"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_TRANSLATIONS = exports.TRANSLATION_KEYS = exports.BASELINE_LANGUAGES = exports.USERS = exports.ROLES = exports.PERMISSIONS = void 0;
exports.runSeed = runSeed;
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const index_1 = require("../src/index");
const prisma = new client_1.PrismaClient();
exports.PERMISSIONS = [
    { id: 'p1', key: 'users.create', description: 'Create user accounts', module: 'users' },
    { id: 'p2', key: 'users.read', description: 'View user profiles', module: 'users' },
    { id: 'p3', key: 'users.update', description: 'Update user profiles', module: 'users' },
    { id: 'p4', key: 'users.delete', description: 'Delete user accounts', module: 'users' },
    { id: 'p5', key: 'roles.manage', description: 'Manage roles and permissions', module: 'roles' },
    { id: 'p6', key: 'audit.read', description: 'View system audit logs', module: 'audit' },
    { id: 'p7', key: 'i18n.manage', description: 'Manage multilingual translations', module: 'i18n' },
    { id: 'p8', key: 'preferences.update', description: 'Update system preferences', module: 'preferences' },
    { id: 'p9', key: 'courses.create', description: 'Create courses and subjects', module: 'courses' },
    { id: 'p10', key: 'courses.read', description: 'View courses and syllabus', module: 'courses' },
    { id: 'p11', key: 'courses.update', description: 'Update courses and syllabus', module: 'courses' },
    { id: 'p12', key: 'courses.delete', description: 'Delete courses', module: 'courses' },
    { id: 'p13', key: 'questions.create', description: 'Create question bank items', module: 'questions' },
    { id: 'p14', key: 'questions.read', description: 'View question bank', module: 'questions' },
    { id: 'p15', key: 'questions.update', description: 'Update question items', module: 'questions' },
    { id: 'p16', key: 'questions.delete', description: 'Delete question items', module: 'questions' },
    { id: 'p17', key: 'exams.create', description: 'Create exam patterns', module: 'exams' },
    { id: 'p18', key: 'exams.read', description: 'View exam patterns and results', module: 'exams' },
    { id: 'p19', key: 'exams.publish', description: 'Publish exams', module: 'exams' },
    { id: 'p20', key: 'exams.attempt', description: 'Attempt student exams', module: 'exams' },
];
exports.ROLES = [
    {
        id: 'r1',
        name: 'MAIN_ADMIN',
        description: 'System Super Administrator with full authority',
        isSystem: true,
        permissions: exports.PERMISSIONS.map((p) => p.key),
    },
    {
        id: 'r2',
        name: 'SUB_ADMIN',
        description: 'Delegated Administrator for content & user ops',
        isSystem: true,
        permissions: [
            'users.read', 'users.create', 'users.update',
            'courses.read', 'courses.create', 'courses.update',
            'questions.read', 'questions.create', 'questions.update',
            'exams.read', 'exams.create', 'exams.publish', 'audit.read',
        ],
    },
    {
        id: 'r3',
        name: 'TEACHER',
        description: 'Faculty and question author',
        isSystem: true,
        permissions: [
            'courses.read', 'questions.read', 'questions.create',
            'questions.update', 'exams.read', 'exams.create', 'exams.publish',
        ],
    },
    {
        id: 'r4',
        name: 'STUDENT',
        description: 'Enrolled learner persona',
        isSystem: true,
        permissions: ['courses.read', 'exams.read', 'exams.attempt'],
    },
];
exports.USERS = [
    {
        id: 'usr_admin_test',
        email: 'admin@examos.com',
        password: 'Admin@123',
        firstName: 'Admin',
        lastName: 'User',
        roleId: 'r1',
        roleName: 'MAIN_ADMIN',
    },
    {
        id: 'usr_subadmin_test',
        email: 'subadmin@examos.com',
        password: 'SubAdmin@123',
        firstName: 'SubAdmin',
        lastName: 'User',
        roleId: 'r2',
        roleName: 'SUB_ADMIN',
    },
    {
        id: 'usr_teacher_test',
        email: 'teacher@examos.com',
        password: 'Teacher@123',
        firstName: 'Teacher',
        lastName: 'Faculty',
        roleId: 'r3',
        roleName: 'TEACHER',
    },
    {
        id: 'usr_student_test',
        email: 'student@examos.com',
        password: 'Student@123',
        firstName: 'Student',
        lastName: 'Learner',
        roleId: 'r4',
        roleName: 'STUDENT',
    },
];
// 23 Baseline Languages
exports.BASELINE_LANGUAGES = [
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
exports.TRANSLATION_KEYS = [
    { key: 'welcome', description: 'Welcome banner heading', module: 'common' },
    { key: 'app_title', description: 'Application header title', module: 'common' },
    { key: 'dashboard', description: 'Navigation dashboard label', module: 'navigation' },
    { key: 'users', description: 'Navigation user management label', module: 'navigation' },
    { key: 'courses', description: 'Navigation academic courses label', module: 'navigation' },
    { key: 'question_bank', description: 'Navigation question bank label', module: 'navigation' },
    { key: 'exam_patterns', description: 'Navigation exam patterns label', module: 'navigation' },
    { key: 'analytics', description: 'Navigation student analytics label', module: 'navigation' },
];
exports.SEED_TRANSLATIONS = {
    en: { welcome: 'Welcome to ExamOS Platform', app_title: 'ExamOS // Adaptive Learning Platform', dashboard: 'Dashboard', users: 'User Management', courses: 'Academic Courses', question_bank: 'Question Bank', exam_patterns: 'Exam Patterns', analytics: 'Student Analytics' },
    hi: { welcome: 'ExamOS प्लेटफॉर्म में आपका स्वागत है', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'छात्र विश्लेषण' },
    bn: { welcome: 'ExamOS প্ল্যাটফর্মে স্বাগতম', app_title: 'ExamOS // অ্যাডাপ্টিভ লার্নিং প্ল্যাটফর্ম', dashboard: 'ড্যাশবোর্ড', users: 'ব্যবহারকারী পরিচালনা', courses: 'একাডেমিক কোর্স', question_bank: 'প্রশ্ন ব্যাংক', exam_patterns: 'পরীক্ষার প্যাটার্ন', analytics: 'ছাত্র অ্যানালিটিক্স' },
    te: { welcome: 'ExamOS ప్లాట్‌ఫారమ్‌కు స్వాగతం', app_title: 'ExamOS // అడాప్టివ్ లెర్నింగ్ ప్లాట్‌ఫారమ్', dashboard: 'డాష్‌బోర్డ్', users: 'వినియోగదారు నిర్వహణ', courses: 'అకాడమిక్ కోర్సులు', question_bank: 'ప్రశ్నల బ్యాంక్', exam_patterns: 'పరీక్షా సరళి', analytics: 'విద్యార్థుల విశ్లేషణ' },
    mr: { welcome: 'ExamOS प्लॅटफॉर्मवर आपले स्वागत आहे', app_title: 'ExamOS // अ‍ॅडॉप्टिव्ह लर्निंग प्लॅटफॉर्म', dashboard: 'डॅशबोर्ड', users: 'वापरकर्ता व्यवस्थापन', courses: 'शैक्षणिक अभ्यासक्रम', question_bank: 'प्रश्न संच', exam_patterns: 'परीक्षा पद्धती', analytics: 'विद्यार्थी विश्लेषण' },
    ta: { welcome: 'ExamOS தளத்திற்கு உங்களை வரவேற்கிறோம்', app_title: 'ExamOS // தகவமைப்பு கற்றல் தளம்', dashboard: 'டாஷ்போர்டு', users: 'பயனர் நிர்வாகம்', courses: 'கல்விப் பாடங்கள்', question_bank: 'வினா வங்கி', exam_patterns: 'தேர்வு முறைகள்', analytics: 'மாணவர் பகுப்பாய்வு' },
    ur: { welcome: 'ExamOS پلیٹ فارم میں خوش آمدید', app_title: 'ExamOS // موافقانہ تعلیمی پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین کا انتظام', courses: 'تعليمى نصاب', question_bank: 'سوالات کا بنک', exam_patterns: 'امتحانی پیٹرن', analytics: 'طالب علم کا تجزیہ' },
    gu: { welcome: 'ExamOS પ્લેટફોર્મ પર આપનું સ્વાગત છે', app_title: 'ExamOS // અનુકૂલનશીલ શિક્ષણ પ્લેટફોર્મ', dashboard: 'ડેશબોર્ડ', users: 'વપરાશકર્તા સંચાલન', courses: 'શૈક્ષણિક અભ્યાસક્રમો', question_bank: 'પ્રશ્ન બેંક', exam_patterns: 'પરીક્ષા પેટર્ન', analytics: 'વિદ્યાર્થી પૃથ્થકરણ' },
    kn: { welcome: 'ExamOS ವೇದಿಕೆಗೆ ನಿಮಗೆ ಸುಸ್ವಾಗತ', app_title: 'ExamOS // ಅಡಾಪ್ಟಿವ್ ಕಲಿಕಾ ವೇದಿಕೆ', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', users: 'ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ', courses: 'ಶೈಕ್ಷಣಿಕ ಕೋರ್ಸ್‌ಗಳು', question_bank: 'ಪ್ರಶ್ನೆ ಬ್ಯಾಂಕ್', exam_patterns: 'ಪರೀಕ್ಷಾ ಮಾದರಿಗಳು', analytics: 'ವಿದ್ಯಾರ್ಥಿ ವಿಶ್ಲೇಷಣೆ' },
    ml: { welcome: 'ExamOS പ്ലാറ്റ്‌ഫോമിലേക്ക് സ്വാgatam', app_title: 'ExamOS // അഡാപ്റ്റീവ് ലേണിംഗ് പ്ലാറ്റ്‌ഫോം', dashboard: 'ഡാഷ്‌ബോർഡ്', users: 'ഉപയോക്തൃ മാനേജ്മെന്റ്', courses: 'അക്കാദമിക് കോഴ്‌സുകൾ', question_bank: 'ചോദ്യ ബാങ്ക്', exam_patterns: 'പരീക്ഷാ പാറ്റേൺ', analytics: 'വിദ്യാർത്ഥി വിശകലനം' },
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
async function runSeed() {
    console.log('Seeding permissions & roles into PostgreSQL...');
    for (const p of exports.PERMISSIONS) {
        await index_1.pgDb.query(`INSERT INTO "permissions" ("id", "key", "description", "module")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "module" = EXCLUDED."module"`, [p.id, p.key, p.description, p.module]);
    }
    for (const r of exports.ROLES) {
        await index_1.pgDb.query(`INSERT INTO "roles" ("id", "name", "description", "isSystem")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description", "isSystem" = EXCLUDED."isSystem"`, [r.id, r.name, r.description, r.isSystem]);
    }
    console.log('Seeding role_permissions mappings into PostgreSQL...');
    for (const r of exports.ROLES) {
        for (const permKey of r.permissions) {
            const permRes = await index_1.pgDb.query(`SELECT "id" FROM "permissions" WHERE "key" = $1`, [permKey]);
            if (permRes.rows.length > 0) {
                const permId = permRes.rows[0].id;
                await index_1.pgDb.query(`INSERT INTO "role_permissions" ("roleId", "permissionId")
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`, [r.id, permId]);
            }
        }
    }
    console.log('Seeding 4 baseline persona users (Admin, SubAdmin, Teacher, Student)...');
    for (const u of exports.USERS) {
        const passwordHash = bcrypt.hashSync(u.password, 10);
        await index_1.pgDb.query(`INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "status")
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       ON CONFLICT ("email") DO UPDATE SET
         "passwordHash" = EXCLUDED."passwordHash",
         "firstName" = EXCLUDED."firstName",
         "lastName" = EXCLUDED."lastName",
         "status" = 'ACTIVE'`, [u.id, u.email, passwordHash, u.firstName, u.lastName]);
        await index_1.pgDb.query(`INSERT INTO "user_roles" ("userId", "roleId")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`, [u.id, u.roleId]);
    }
    console.log('Seeding default Course & Subjects into PostgreSQL...');
    await index_1.pgDb.query(`INSERT INTO "courses" ("id", "name", "code", "description", "status", "durationMonths")
     VALUES ('c1', 'Engineering Entrance Course', 'ENG-101', 'JEE & Engineering Foundation Course', 'PUBLISHED', 12)
     ON CONFLICT ("code") DO NOTHING`);
    await index_1.pgDb.query(`INSERT INTO "subjects" ("id", "courseId", "name", "code", "description", "credits", "order")
     VALUES ('sub_phy', 'c1', 'Physics', 'PHY-101', 'General Physics', 4, 1)
     ON CONFLICT ("courseId", "code") DO NOTHING`);
    await index_1.pgDb.query(`INSERT INTO "subjects" ("id", "courseId", "name", "code", "description", "credits", "order")
     VALUES ('sub_chem', 'c1', 'Chemistry', 'CHEM-101', 'General Chemistry', 4, 2)
     ON CONFLICT ("courseId", "code") DO NOTHING`);
    await index_1.pgDb.query(`INSERT INTO "syllabus_nodes" ("id", "subjectId", "title", "type", "orderIndex", "depth")
     VALUES ('top_mech', 'sub_phy', 'Mechanics', 'TOPIC', 1, 1)
     ON CONFLICT ("id") DO NOTHING`);
    await index_1.pgDb.query(`INSERT INTO "syllabus_nodes" ("id", "subjectId", "title", "type", "orderIndex", "depth")
     VALUES ('top_optics', 'sub_phy', 'Optics', 'TOPIC', 2, 1)
     ON CONFLICT ("id") DO NOTHING`);
    console.log('Seeding 23 baseline languages into PostgreSQL...');
    for (const l of exports.BASELINE_LANGUAGES) {
        const langId = `lang_${l.code}`;
        await index_1.pgDb.query(`INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "nativeName" = EXCLUDED."nativeName"`, [langId, l.code, l.name, l.nativeName, l.isDefault]);
    }
    console.log('Seeding translation keys & values into PostgreSQL...');
    for (const k of exports.TRANSLATION_KEYS) {
        const keyId = `tk_${k.key}`;
        await index_1.pgDb.query(`INSERT INTO "translation_keys" ("id", "key", "description", "module")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "module" = EXCLUDED."module"`, [keyId, k.key, k.description, k.module]);
    }
    let totalTranslationsSeeded = 0;
    let languagesWithFullTranslations = 0;
    for (const [langCode, keyVals] of Object.entries(exports.SEED_TRANSLATIONS)) {
        const langRes = await index_1.pgDb.query(`SELECT "id" FROM "languages" WHERE "code" = $1`, [langCode]);
        if (langRes.rows.length > 0) {
            const langId = langRes.rows[0].id;
            let countForLang = 0;
            for (const [key, value] of Object.entries(keyVals)) {
                const keyRes = await index_1.pgDb.query(`SELECT "id" FROM "translation_keys" WHERE "key" = $1`, [key]);
                if (keyRes.rows.length > 0) {
                    const keyId = keyRes.rows[0].id;
                    const trId = `tr_${langCode}_${key}`;
                    await index_1.pgDb.query(`INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value")
             VALUES ($1, $2, $3, $4)
             ON CONFLICT ("languageId", "translationKeyId") DO UPDATE SET "value" = EXCLUDED."value"`, [trId, langId, keyId, value]);
                    totalTranslationsSeeded++;
                    countForLang++;
                }
            }
            if (countForLang === exports.TRANSLATION_KEYS.length) {
                languagesWithFullTranslations++;
            }
        }
    }
    console.log(`Database seed complete: Registered ${exports.BASELINE_LANGUAGES.length} baseline languages; seeded ${totalTranslationsSeeded} translation entries across ${languagesWithFullTranslations} languages with 100% full 8-key coverage.`);
}
if (require.main === module) {
    runSeed()
        .catch((e) => {
        console.error(e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
