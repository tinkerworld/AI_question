import * as bcrypt from 'bcryptjs';
import { pgDb } from '../src/index';

export const PERMISSIONS = [
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
  { id: 'p17', key: 'exams.create', description: 'Create exam patterns and generate exams', module: 'exams' },
  { id: 'p18', key: 'exams.read', description: 'View exam patterns, drafts and exams', module: 'exams' },
  { id: 'p19', key: 'exams.publish', description: 'Publish exams and manage schedules', module: 'exams' },
  { id: 'p20', key: 'exams.attempt', description: 'Attempt student exams', module: 'exams' },
];

export const ROLES = [
  {
    id: 'r1',
    name: 'MAIN_ADMIN',
    description: 'System Super Administrator with full authority',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.key),
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

export const USERS = [
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

export const BASELINE_LANGUAGES = [
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

export const TRANSLATION_KEYS = [
  { key: 'welcome', description: 'Welcome banner heading', module: 'common' },
  { key: 'app_title', description: 'Application header title', module: 'common' },
  { key: 'dashboard', description: 'Navigation dashboard label', module: 'navigation' },
  { key: 'users', description: 'Navigation user management label', module: 'navigation' },
  { key: 'courses', description: 'Navigation academic courses label', module: 'navigation' },
  { key: 'question_bank', description: 'Navigation question bank label', module: 'navigation' },
  { key: 'exam_patterns', description: 'Navigation exam patterns label', module: 'navigation' },
  { key: 'exams', description: 'Navigation exams generator label', module: 'navigation' },
  { key: 'analytics', description: 'Navigation student analytics label', module: 'navigation' },
];

export const SEED_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: { welcome: 'Welcome to ExamOS Platform', app_title: 'ExamOS // Adaptive Learning Platform', dashboard: 'Dashboard', users: 'User Management', courses: 'Academic Courses', question_bank: 'Question Bank', exam_patterns: 'Exam Patterns', exams: 'Exam Generator', analytics: 'Student Analytics' },
  hi: { welcome: 'ExamOS प्लेटफॉर्म में आपका स्वागत है', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा पैटर्न', exams: 'परीक्षा जनरेटर', analytics: 'छात्र विश्लेषण' },
  bn: { welcome: 'ExamOS প্ল্যাটফর্মে স্বাগতম', app_title: 'ExamOS // অ্যাডাপ্টিভ লার্নিং প্ল্যাটফর্ম', dashboard: 'ড্যাশবোর্ড', users: 'ব্যবহারকারী পরিচালনা', courses: 'একাডেমিক কোর্স', question_bank: 'প্রশ্ন ব্যাংক', exam_patterns: 'পরীক্ষার প্যাটার্ন', exams: 'পরীক্ষা জেনারেটর', analytics: 'ছাত্র অ্যানালিটিক্স' },
  te: { welcome: 'ExamOS ప్లాట్‌ఫారమ్‌కు స్వాగతం', app_title: 'ExamOS // అడాప్టివ్ లెర్నింగ్ ప్లాట్‌ఫారమ్', dashboard: 'డాష్‌బోర్డ్', users: 'వినియోగదారు నిర్వహణ', courses: 'అకాడమిక్ కోర్సులు', question_bank: 'ప్రశ్నల బ్యాంక్', exam_patterns: 'పరీక్షా సరళి', exams: 'పరీక్ష జనరేటర్', analytics: 'విద్యార్థుల విశ్లేషణ' },
  mr: { welcome: 'ExamOS प्लॅटफॉर्मवर आपले स्वागत आहे', app_title: 'ExamOS // अ‍ॅडॉप्टिव्ह लर्निंग प्लॅटफॉर्म', dashboard: 'डॅशबोर्ड', users: 'वापरकर्ता व्यवस्थापन', courses: 'शैक्षणिक अभ्यासक्रम', question_bank: 'प्रश्न संच', exam_patterns: 'परीक्षा पद्धती', exams: 'परीक्षा जनरेटर', analytics: 'विद्यार्थी विश्लेषण' },
  ta: { welcome: 'ExamOS தளத்திற்கு உங்களை வரவேற்கிறோம்', app_title: 'ExamOS // தகவமைப்பு கற்றல் தளம்', dashboard: 'டாஷ்போர்டு', users: 'பயனர் நிர்வாகம்', courses: 'கல்விப் பாடங்கள்', question_bank: 'வினா வங்கி', exam_patterns: 'தேர்வு முறைகள்', exams: 'தேர்வு ஜெனரேட்டர்', analytics: 'மாணவர் பகுப்பாய்வு' },
  ur: { welcome: 'ExamOS پلیٹ فارم میں خوش آمدید', app_title: 'ExamOS // موافقانہ تعلیمی پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین کا انتظام', courses: 'تعليمى نصاب', question_bank: 'سوالات کا بنک', exam_patterns: 'امتحانی پیٹرن', exams: 'امتحان جنریٹر', analytics: 'طالب علم کا تجزیہ' },
  gu: { welcome: 'ExamOS પ્લેટફોર્મ પર આપનું સ્વાગત છે', app_title: 'ExamOS // અનુકૂલનશીલ શિક્ષણ પ્લેટફોર્મ', dashboard: 'ડેશબોર્ડ', users: 'વપરાશકર્તા સંચાલન', courses: 'શૈક્ષણિક અભ્યાસક્રમો', question_bank: 'પ્રશ્ન બેંક', exam_patterns: 'પરીક્ષા પેટર્ન', exams: 'પરીક્ષા જનરેટર', analytics: 'વિદ્યાર્થી પૃથ્થકરણ' },
  kn: { welcome: 'ExamOS ವೇದಿಕೆಗೆ ನಿಮಗೆ ಸುಸ್ವಾಗತ', app_title: 'ExamOS // ಅಡಾಪ್ಟಿವ್ ಕಲಿಕಾ ವೇದಿಕೆ', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', users: 'ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ', courses: 'ಶೈಕ್ಷಣಿಕ ಕೋರ್ಸ್‌ಗಳು', question_bank: 'ಪ್ರಶ್ನೆ ಬ್ಯಾಂಕ್', exam_patterns: 'ಪರೀಕ್ಷಾ ಮಾದರಿಗಳು', exams: 'ಪರೀಕ್ಷಾ ಜನರೇಟರ್', analytics: 'ವಿದ್ಯಾರ್ಥಿ ವಿಶ್ಲೇಷಣೆ' },
  ml: { welcome: 'ExamOS പ്ലാറ്റ്‌ഫോമിലേക്ക് സ്വാgatam', app_title: 'ExamOS // അഡാപ്റ്റീവ് ലേണിംഗ് പ്ലാറ്റ്‌ഫോം', dashboard: 'ഡാഷ്‌ബോർഡ്', users: 'ഉപയോക്തൃ മാനേജ്മെന്റ്', courses: 'അക്കാദമിക് കോഴ്‌സുകൾ', question_bank: 'ചോദ്യ ബാങ്ക്', exam_patterns: 'പരീക്ഷാ പാറ്റേൺ', exams: 'പരീക്ഷാ ജനറേറ്റർ', analytics: 'വിദ്യാർത്ഥി വിശകലനം' },
  or: { welcome: 'ExamOS ପ୍ଲାଟଫର୍ମକୁ ସ୍ୱାଗତ', app_title: 'ExamOS // ଆଡାପ୍ଟିଭ୍ ଶିକ୍ଷଣ ପ୍ଲାଟଫର୍ମ', dashboard: 'ଡ୍ୟାସବୋର୍ଡ', users: 'ବ୍ୟବହାରକାରୀ ପରିଚାଳନା', courses: 'ଶିକ୍ଷାଗତ ପାଠ୍ୟକ୍ରମ', question_bank: 'ପ୍ରଶ୍ନ ବ୍ୟାଙ୍କ', exam_patterns: 'ପରୀକ୍ଷା ପ୍ୟାଟର୍ନ', exams: 'ପରୀକ୍ଷା ଜେନେରେଟର', analytics: 'ଛାତ୍ର ବିଶ୍ଳେଷଣ' },
  pa: { welcome: 'ExamOS ਪਲੇਟਫਾਰਮ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ', app_title: 'ExamOS // ਅਨੁਕੂਲ ਸਿਖਲਾਈ ਪਲੇਟਫਾਰਮ', dashboard: 'ਡੈਸ਼ਬੋਰਡ', users: 'ਉਪਭੋਗਤਾ ਪ੍ਰਬੰਧਨ', courses: 'ਅਕਾਦਮਿਕ ਕੋਰਸ', question_bank: 'ਪ੍ਰਸ਼ਨ ਬੈਂਕ', exam_patterns: 'ਪ੍ਰੀਖਿਆ ਪੈਟਰਨ', exams: 'ਪ੍ਰੀਖਿਆ ਜਨਰੇਟਰ', analytics: 'ਵਿਦਿਆਰਥੀ ਵਿਸ਼ਲੇਸ਼ਣ' },
  as: { welcome: 'ExamOS মঞ্চলৈ স্বাগতম', app_title: 'ExamOS // অভিযোজনযোগ্য শিক্ষণ মঞ্চ', dashboard: 'ড্যাশবৰ্ড', users: 'ব্যৱহাৰকাৰী ব্যৱস্থাপনা', courses: 'শৈক্ষিক পাঠ্যক্ৰম', question_bank: 'প্ৰশ্ন বেংক', exam_patterns: 'পৰীক্ষাৰ আৰ্হি', exams: 'পৰীক্ষা জেনেৰেটৰ', analytics: 'ছাত্ৰ বিশ্লেষণ' },
  ma: { welcome: 'ExamOS मंच पर स्वागत अछि', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'प्रयोक्ता प्रबंधन', courses: 'शैक्षणिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा संरचना', exams: 'परीक्षा जनक', analytics: 'छात्र विश्लेषण' },
  sa: { welcome: 'ExamOS मञ्चे भवतः स्वागतम् अस्ति', app_title: 'ExamOS // अनुकूलनीय-शिक्षण-मञ्चः', dashboard: 'फलकम्', users: 'उपयोक्तृ-प्रबन्धनम्', courses: 'शैक्षणिक-पाठ्यक्रमः', question_bank: 'प्रश्न-कोषः', exam_patterns: 'परीक्षा-स्वरूपम्', exams: 'परीक्षा-सृजकः', analytics: 'छात्र-विश्लेषणम्' },
  ks: { welcome: 'ExamOS پلیٹ فارمس پؠٹھ بَلائے تہٕ خوش آمدید', app_title: 'ExamOS // تعلیمی پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین ہُنٛد اِنتظام', courses: 'کورس', question_bank: 'سوال بنک', exam_patterns: 'امتحان پیٹرن', exams: 'امتحان جنریٹر', analytics: 'طالب علم تجزیہ' },
  ne: { welcome: 'ExamOS प्लेटफर्ममा स्वागत छ', app_title: 'ExamOS // अनुकूलन सिकाइ प्लेटफर्म', dashboard: 'ड्यासबोर्ड', users: 'प्रयोगकर्ता व्यवस्थापन', courses: 'शैक्षिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा ढाँचा', exams: 'परीक्षा जनरेटर', analytics: 'विद्यार्थी विश्लेषण' },
  sd: { welcome: 'ExamOS پليٽ فارم ۾ ڀليڪار', app_title: 'ExamOS // لڙڪندڙ تعليمي پليٽ فارم', dashboard: 'ڊيش بورڊ', users: 'استعمال ڪندڙن جو انتظام', courses: 'تعليمي ڪورس', question_bank: 'سوالن جي بئنڪ', exam_patterns: 'امتحاني نمونو', exams: 'امتحان جنريٽر', analytics: 'شاگردن جو تجزيو' },
  br: { welcome: 'ExamOS प्लेटफर्मआव बरायबाय', app_title: 'ExamOS // सोलोंथाय प्लेटफर्म', dashboard: 'डैशबोर्ड', users: 'बाहायगिरि सामलायनाय', courses: 'फरायलाइ', question_bank: 'सोंथि ब्यांक', exam_patterns: 'आनजाद रोखोम', exams: 'आनजाद दिहुनगिरि', analytics: 'फरायसुला बिजिरनाय' },
  doi: { welcome: 'ExamOS प्लेटफार्म पर थुंदा स्वागत ऐ', app_title: 'ExamOS // शिक्षण प्लेटफार्म', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'शैक्षणिक कोर्स', question_bank: 'सवाल बैंक', exam_patterns: 'परीक्षा पैटर्न', exams: 'परीक्षा जनरेटर', analytics: 'विद्यार्थी विश्लेषण' },
  mni: { welcome: 'ExamOS פ্লাটফোর্মদা তরাম্না ওকচরি', app_title: 'ExamOS // তম্বা প্লাটফোর্ম', dashboard: 'ড্যাশবোর্ড', users: 'শিজিন্নরিবা মীয়াম', courses: 'পারা লাইরিক', question_bank: 'Wahang Bank', exam_patterns: 'Exams Pattern', exams: 'Exam Generator', analytics: 'Student Analytics' },
  sat: { welcome: 'ExamOS ᱯᱞᱮᱴᱯᱷᱚᱨᱢ ᱨᱮ ᱥᱟᱹᱜᱩᱱ ᱫᱟᱨᱟᱢ', app_title: 'ExamOS // ᱪᱮᱫᱚᱜ ᱯᱞᱮᱴᱯᱷᱚᱨᱢ', dashboard: 'ᱰᱮᱥᱵᱳᱨᱰ', users: 'ᱵᱮᱣᱦᱟᱨᱤᱭᱟᱹ ᱥᱟ cross', courses: 'ᱠᱳᱨᱥ', question_bank: 'ᱠᱩᱠᱞᱤ ᱵᱮᱸᱠ', exam_patterns: 'ᱵᱤᱱᱤᱰ ᱯᱮᱴᱟᱨᱱ', exams: 'ᱵᱤᱱᱤᱰ ᱛᱮᱭᱟᱨ', analytics: 'ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱵᱤᱪᱟᱹᱨ' },
  lus: { welcome: 'ExamOS Platform-ah te lo lawm a ni', app_title: 'ExamOS // Zirna Platform', dashboard: 'Dashboard', users: 'Hmannu Inenkawlna', courses: 'Zirna Courses', question_bank: 'Zawhna Bank', exam_patterns: 'Chhenna Pattern', exams: 'Chhenna Siattu', analytics: 'Zirlai Analysis' },
};

export const SEED_COURSES = [
  { id: 'c1', name: 'Engineering Entrance Course (JEE)', code: 'ENG-101', description: 'Comprehensive JEE Main & Advanced Engineering Foundation', durationMonths: 12 },
  { id: 'c2', name: 'Medical Entrance Course (NEET)', code: 'MED-101', description: 'Comprehensive NEET Medical Foundation Course', durationMonths: 12 },
];

export const SEED_SUBJECTS = [
  { id: 'sub_phy', courseId: 'c1', name: 'Physics', code: 'PHY-101', description: 'General & Applied Physics', credits: 4, order: 1 },
  { id: 'sub_chem', courseId: 'c1', name: 'Chemistry', code: 'CHEM-101', description: 'Physical, Inorganic & Organic Chemistry', credits: 4, order: 2 },
  { id: 'sub_math', courseId: 'c1', name: 'Mathematics', code: 'MATH-101', description: 'Calculus, Algebra & Coordinate Geometry', credits: 4, order: 3 },
  { id: 'sub_bio', courseId: 'c2', name: 'Biology', code: 'BIO-101', description: 'Genetics, Physiology & Ecology', credits: 4, order: 1 },
];

export const SEED_TOPICS = [
  // Physics
  { id: 'top_mech', subjectId: 'sub_phy', title: 'Mechanics & Dynamics', orderIndex: 1 },
  { id: 'top_optics', subjectId: 'sub_phy', title: 'Geometrical & Wave Optics', orderIndex: 2 },
  { id: 'top_electromag', subjectId: 'sub_phy', title: 'Electromagnetism & Circuits', orderIndex: 3 },
  { id: 'top_modern_phy', subjectId: 'sub_phy', title: 'Modern & Nuclear Physics', orderIndex: 4 },
  // Chemistry
  { id: 'top_thermo', subjectId: 'sub_chem', title: 'Chemical Thermodynamics', orderIndex: 1 },
  { id: 'top_organic', subjectId: 'sub_chem', title: 'Organic Reactions & Mechanisms', orderIndex: 2 },
  { id: 'top_inorganic', subjectId: 'sub_chem', title: 'Inorganic & Coordination Chemistry', orderIndex: 3 },
  { id: 'top_physical_chem', subjectId: 'sub_chem', title: 'Physical Chemistry & Kinetics', orderIndex: 4 },
  // Mathematics
  { id: 'top_calculus', subjectId: 'sub_math', title: 'Differential & Integral Calculus', orderIndex: 1 },
  { id: 'top_algebra', subjectId: 'sub_math', title: 'Linear Algebra & Matrices', orderIndex: 2 },
  { id: 'top_coordinate_geom', subjectId: 'sub_math', title: 'Coordinate Geometry & Vectors', orderIndex: 3 },
  { id: 'top_probability', subjectId: 'sub_math', title: 'Probability, Permutations & Statistics', orderIndex: 4 },
];

// Rich Question Bank seed dataset: 120 authentic questions across 12 topics (10 questions per topic: 3 EASY, 4 MEDIUM, 3 HARD)
export const SEED_QUESTIONS: Array<{
  id: string;
  subjectId: string;
  topicId: string;
  type: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks: number;
  content: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  correctOptionId: string;
  explanation: string;
}> = [
  // --------------------------------------------------------------------------
  // TOPIC 1: Mechanics & Dynamics (sub_phy / top_mech)
  // --------------------------------------------------------------------------
  {
    id: 'q_phy_mech_01',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the SI unit of Force in the metric system?',
    options: [
      { id: 'opt_a', text: 'Newton (N)', isCorrect: true },
      { id: 'opt_b', text: 'Joule (J)', isCorrect: false },
      { id: 'opt_c', text: 'Pascal (Pa)', isCorrect: false },
      { id: 'opt_d', text: 'Watt (W)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '1 Newton is defined as 1 kg·m/s², the force required to accelerate 1 kg at 1 m/s².',
  },
  {
    id: 'q_phy_mech_02',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'A particle moves in a circular path of radius R with constant speed v. What is its centripetal acceleration?',
    options: [
      { id: 'opt_a', text: 'v² / R directed toward the center', isCorrect: true },
      { id: 'opt_b', text: 'v / R² directed tangentially', isCorrect: false },
      { id: 'opt_c', text: 'v · R directed outward', isCorrect: false },
      { id: 'opt_d', text: 'Zero because the speed is constant', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Centripetal acceleration is given by a_c = v²/R, constantly directed toward the center of curvature.',
  },
  {
    id: 'q_phy_mech_03',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: "Which of Newton's laws of motion provides the quantitative definition of inertia?",
    options: [
      { id: 'opt_a', text: "Newton's First Law", isCorrect: true },
      { id: 'opt_b', text: "Newton's Second Law", isCorrect: false },
      { id: 'opt_c', text: "Newton's Third Law", isCorrect: false },
      { id: 'opt_d', text: 'Law of Universal Gravitation', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'The first law states an object remains at rest or uniform motion unless acted upon by a net external force (Law of Inertia).',
  },
  {
    id: 'q_phy_mech_04',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'A block of mass 5 kg is pulled on a frictionless horizontal floor with a force of 20 N applied at an angle of 60° to the horizontal. What is the acceleration of the block?',
    options: [
      { id: 'opt_a', text: '2.0 m/s²', isCorrect: true },
      { id: 'opt_b', text: '4.0 m/s²', isCorrect: false },
      { id: 'opt_c', text: '1.73 m/s²', isCorrect: false },
      { id: 'opt_d', text: '3.46 m/s²', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Horizontal component of force F_x = 20 · cos(60°) = 20 · 0.5 = 10 N. Acceleration a = F_x / m = 10 N / 5 kg = 2.0 m/s².',
  },
  {
    id: 'q_phy_mech_05',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the moment of inertia of a uniform solid cylinder of mass M and radius R about its longitudinal central axis?',
    options: [
      { id: 'opt_a', text: '1/2 M R²', isCorrect: true },
      { id: 'opt_b', text: 'M R²', isCorrect: false },
      { id: 'opt_c', text: '2/5 M R²', isCorrect: false },
      { id: 'opt_d', text: '1/12 M R²', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'For a solid cylinder of mass M and radius R, I = 1/2 M R² about its central longitudinal axis.',
  },
  {
    id: 'q_phy_mech_06',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'If the escape velocity from Earth’s surface is 11.2 km/s, what is the escape velocity from a hypothetical planet with 2x the mass and 2x the radius of Earth?',
    options: [
      { id: 'opt_a', text: '11.2 km/s', isCorrect: true },
      { id: 'opt_b', text: '22.4 km/s', isCorrect: false },
      { id: 'opt_c', text: '5.6 km/s', isCorrect: false },
      { id: 'opt_d', text: '15.8 km/s', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Escape velocity v_e = sqrt(2 G M / R). If M -> 2M and R -> 2R, the ratio M/R is unchanged, so v_e = 11.2 km/s.',
  },
  {
    id: 'q_phy_mech_07',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'An ideal spring with spring constant k is compressed by a distance x. What is the elastic potential energy stored in the spring?',
    options: [
      { id: 'opt_a', text: '1/2 k x²', isCorrect: true },
      { id: 'opt_b', text: 'k x', isCorrect: false },
      { id: 'opt_c', text: '1/2 k² x', isCorrect: false },
      { id: 'opt_d', text: '2 k x²', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'The work done in compressing an ideal spring is the integral of k·x dx = 1/2 k x².',
  },
  {
    id: 'q_phy_mech_08',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'A solid uniform sphere of mass M and radius R rolls down an inclined plane of angle θ without slipping. What is the acceleration of its center of mass?',
    options: [
      { id: 'opt_a', text: '(5/7) g sin θ', isCorrect: true },
      { id: 'opt_b', text: '(2/3) g sin θ', isCorrect: false },
      { id: 'opt_c', text: '(1/2) g sin θ', isCorrect: false },
      { id: 'opt_d', text: '(5/9) g sin θ', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'For pure rolling down an incline: a = (g sin θ) / (1 + I/(M R²)) = (g sin θ) / (1 + 2/5) = (5/7) g sin θ.',
  },
  {
    id: 'q_phy_mech_09',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'Two blocks of masses m₁ and m₂ (m₁ > m₂) are connected by a light inextensible string over a frictionless ideal pulley (Atwood machine). What is the tension T in the string?',
    options: [
      { id: 'opt_a', text: '(2 m₁ m₂ g) / (m₁ + m₂)', isCorrect: true },
      { id: 'opt_b', text: '(m₁ - m₂) g / (m₁ + m₂)', isCorrect: false },
      { id: 'opt_c', text: '(m₁ m₂ g) / (m₁ + m₂)', isCorrect: false },
      { id: 'opt_d', text: '(m₁ + m₂) g / 2', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Acceleration a = (m₁ - m₂) g / (m₁ + m₂). Tension T = m₁ (g - a) = (2 m₁ m₂ g) / (m₁ + m₂).',
  },
  {
    id: 'q_phy_mech_10',
    subjectId: 'sub_phy',
    topicId: 'top_mech',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'A projectile is launched with velocity u at an angle θ above the horizontal. What is the radius of curvature of its trajectory at the highest point?',
    options: [
      { id: 'opt_a', text: '(u² cos² θ) / g', isCorrect: true },
      { id: 'opt_b', text: '(u² sin² θ) / g', isCorrect: false },
      { id: 'opt_c', text: 'u² / g', isCorrect: false },
      { id: 'opt_d', text: '(2 u² cos θ) / g', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'At the apex, velocity is strictly horizontal: v = u cos θ. Normal acceleration is g. Radius of curvature R = v² / a_n = (u² cos² θ) / g.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 2: Geometrical & Wave Optics (sub_phy / top_optics)
  // --------------------------------------------------------------------------
  {
    id: 'q_phy_opt_01',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the focal length of a flat plane mirror?',
    options: [
      { id: 'opt_a', text: 'Infinity (∞)', isCorrect: true },
      { id: 'opt_b', text: 'Zero (0)', isCorrect: false },
      { id: 'opt_c', text: '1.0 meter', isCorrect: false },
      { id: 'opt_d', text: '-1.0 meter', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'A plane mirror has radius of curvature R = ∞, hence focal length f = R/2 = ∞.',
  },
  {
    id: 'q_phy_opt_02',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'The separation of white light into its constituent wavelengths when passing through a prism is called:',
    options: [
      { id: 'opt_a', text: 'Dispersion', isCorrect: true },
      { id: 'opt_b', text: 'Polarization', isCorrect: false },
      { id: 'opt_c', text: 'Total Internal Reflection', isCorrect: false },
      { id: 'opt_d', text: 'Diffraction', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Dispersion occurs because different wavelengths experience different refractive indices in the prism medium.',
  },
  {
    id: 'q_phy_opt_03',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the refractive index of a perfect vacuum?',
    options: [
      { id: 'opt_a', text: '1.0000 exactly', isCorrect: true },
      { id: 'opt_b', text: '0.0000', isCorrect: false },
      { id: 'opt_c', text: '1.3333', isCorrect: false },
      { id: 'opt_d', text: 'Infinity', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'By definition, the refractive index of vacuum is n = c / c = 1.',
  },
  {
    id: 'q_phy_opt_04',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: "In Young's Double Slit Experiment, if the distance between the slits (d) is halved and screen distance (D) is doubled, how does the fringe width (β) change?",
    options: [
      { id: 'opt_a', text: 'Increases by 4 times', isCorrect: true },
      { id: 'opt_b', text: 'Decreases to half', isCorrect: false },
      { id: 'opt_c', text: 'Doubles (2 times)', isCorrect: false },
      { id: 'opt_d', text: 'Remains unchanged', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Fringe width β = λ D / d. If D -> 2D and d -> d/2, β_new = λ (2D) / (d/2) = 4 (λ D / d) = 4 β.',
  },
  {
    id: 'q_phy_opt_05',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'A thin convex lens has focal length 20 cm. At what distance in front of the lens must an object be placed to form a real image of the exact same size?',
    options: [
      { id: 'opt_a', text: '40 cm', isCorrect: true },
      { id: 'opt_b', text: '20 cm', isCorrect: false },
      { id: 'opt_c', text: '10 cm', isCorrect: false },
      { id: 'opt_d', text: '60 cm', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'To form a real image of unit magnification (m = -1), the object must be at 2f = 2 × 20 cm = 40 cm.',
  },
  {
    id: 'q_phy_opt_06',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: "The polarizing Brewster's angle for a transparent dielectric medium is 60°. What is the refractive index of the medium?",
    options: [
      { id: 'opt_a', text: '√3 ≈ 1.732', isCorrect: true },
      { id: 'opt_b', text: '1/√3 ≈ 0.577', isCorrect: false },
      { id: 'opt_c', text: '1.500', isCorrect: false },
      { id: 'opt_d', text: '2.000', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: "By Brewster's Law: n = tan(θ_B) = tan(60°) = √3.",
  },
  {
    id: 'q_phy_opt_07',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'Two coherent monochromatic light waves have intensity ratio I₁ / I₂ = 9 / 1. What is the ratio of maximum to minimum intensity in their interference pattern?',
    options: [
      { id: 'opt_a', text: '4 : 1', isCorrect: true },
      { id: 'opt_b', text: '16 : 1', isCorrect: false },
      { id: 'opt_c', text: '9 : 1', isCorrect: false },
      { id: 'opt_d', text: '25 : 1', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Amplitude ratio a₁/a₂ = sqrt(9/1) = 3/1. I_max/I_min = ((a₁ + a₂) / (a₁ - a₂))² = ((3 + 1) / (3 - 1))² = (4/2)² = 4:1.',
  },
  {
    id: 'q_phy_opt_08',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'A monochromatic ray of light undergoes minimum deviation of 30° through an equilateral glass prism (refracting angle A = 60°). What is the refractive index of the prism?',
    options: [
      { id: 'opt_a', text: '√2 ≈ 1.414', isCorrect: true },
      { id: 'opt_b', text: '√3 ≈ 1.732', isCorrect: false },
      { id: 'opt_c', text: '1.500', isCorrect: false },
      { id: 'opt_d', text: '1.625', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'n = sin((A + δ_m)/2) / sin(A/2) = sin((60° + 30°)/2) / sin(30°) = sin(45°) / sin(30°) = (1/√2) / (1/2) = √2.',
  },
  {
    id: 'q_phy_opt_09',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'In Fraunhofer single-slit diffraction with slit width a and light wavelength λ, what is the total angular spread (width) of the central diffraction peak?',
    options: [
      { id: 'opt_a', text: '2 λ / a', isCorrect: true },
      { id: 'opt_b', text: 'λ / a', isCorrect: false },
      { id: 'opt_c', text: 'λ / (2a)', isCorrect: false },
      { id: 'opt_d', text: '4 λ / a', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'First minima occur at sin θ ≈ θ = ± λ/a. The angular spread between the two first minima is 2θ = 2λ/a.',
  },
  {
    id: 'q_phy_opt_10',
    subjectId: 'sub_phy',
    topicId: 'top_optics',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'A compound microscope has an objective with magnification m_o = 10 and an eyepiece of focal length f_e = 5 cm. If the final image is formed at the near point (D = 25 cm), what is the overall angular magnification?',
    options: [
      { id: 'opt_a', text: '60', isCorrect: true },
      { id: 'opt_b', text: '50', isCorrect: false },
      { id: 'opt_c', text: '40', isCorrect: false },
      { id: 'opt_d', text: '30', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Eyepiece magnification m_e = 1 + D/f_e = 1 + 25/5 = 6. Total magnification M = m_o × m_e = 10 × 6 = 60.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 3: Electromagnetism & Circuits (sub_phy / top_electromag)
  // --------------------------------------------------------------------------
  {
    id: 'q_phy_em_01',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the SI unit of electrical capacitance?',
    options: [
      { id: 'opt_a', text: 'Farad (F)', isCorrect: true },
      { id: 'opt_b', text: 'Henry (H)', isCorrect: false },
      { id: 'opt_c', text: 'Tesla (T)', isCorrect: false },
      { id: 'opt_d', text: 'Weber (Wb)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Capacitance C = Q/V has SI unit of Farads (Coulombs per Volt).',
  },
  {
    id: 'q_phy_em_02',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the electrostatic field inside a charged hollow spherical conductor of radius R in electrostatic equilibrium?',
    options: [
      { id: 'opt_a', text: 'Zero everywhere inside', isCorrect: true },
      { id: 'opt_b', text: 'Uniform and positive', isCorrect: false },
      { id: 'opt_c', text: 'Proportional to distance r from center', isCorrect: false },
      { id: 'opt_d', text: 'Inversely proportional to r²', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: "By Gauss's Law, the enclosed charge within any Gaussian surface inside the hollow cavity is zero, so E = 0.",
  },
  {
    id: 'q_phy_em_03',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the internal resistance of an ideal voltmeter?',
    options: [
      { id: 'opt_a', text: 'Infinite (∞)', isCorrect: true },
      { id: 'opt_b', text: 'Zero (0)', isCorrect: false },
      { id: 'opt_c', text: '50 Ohms', isCorrect: false },
      { id: 'opt_d', text: '1 Megaohm', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'An ideal voltmeter draws zero current from the circuit branch across which it measures potential difference, requiring infinite resistance.',
  },
  {
    id: 'q_phy_em_04',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'Three identical resistors of 6 Ω each are connected in parallel. What is their net equivalent resistance?',
    options: [
      { id: 'opt_a', text: '2.0 Ω', isCorrect: true },
      { id: 'opt_b', text: '18.0 Ω', isCorrect: false },
      { id: 'opt_c', text: '3.0 Ω', isCorrect: false },
      { id: 'opt_d', text: '0.5 Ω', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '1/R_eq = 1/6 + 1/6 + 1/6 = 3/6 = 1/2 => R_eq = 2.0 Ω.',
  },
  {
    id: 'q_phy_em_05',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'A particle of charge q and mass m enters a uniform magnetic field B with velocity v perpendicular to B. What is the orbital radius of its trajectory?',
    options: [
      { id: 'opt_a', text: '(m v) / (q B)', isCorrect: true },
      { id: 'opt_b', text: '(q B) / (m v)', isCorrect: false },
      { id: 'opt_c', text: '(q v) / (m B)', isCorrect: false },
      { id: 'opt_d', text: '(m B) / (q v)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Lorentz force provides centripetal force: q v B = m v² / r => r = m v / (q B).',
  },
  {
    id: 'q_phy_em_06',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'In an AC circuit with an inductor L and capacitor C, what is the resonant angular frequency ω₀?',
    options: [
      { id: 'opt_a', text: '1 / √(L C)', isCorrect: true },
      { id: 'opt_b', text: '√(L C)', isCorrect: false },
      { id: 'opt_c', text: '1 / (L C)', isCorrect: false },
      { id: 'opt_d', text: 'L / C', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Resonance occurs when inductive reactance equals capacitive reactance: ω L = 1 / (ω C) => ω₀ = 1 / √(LC).',
  },
  {
    id: 'q_phy_em_07',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the magnetic field B at the center of a circular wire loop of radius R carrying a steady current I?',
    options: [
      { id: 'opt_a', text: '(μ₀ I) / (2 R)', isCorrect: true },
      { id: 'opt_b', text: '(μ₀ I) / (4 π R)', isCorrect: false },
      { id: 'opt_c', text: '(μ₀ I) / R', isCorrect: false },
      { id: 'opt_d', text: '(2 μ₀ I) / R', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'By Biot-Savart Law, integrating around the circle gives B = μ₀ I / (2 R).',
  },
  {
    id: 'q_phy_em_08',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'A parallel plate capacitor with plate area A and separation d is filled with two slabs of dielectric constants K₁ and K₂, each having thickness d/2 in series. What is the effective capacitance?',
    options: [
      { id: 'opt_a', text: '(2 ε₀ A / d) · [ (K₁ K₂) / (K₁ + K₂) ]', isCorrect: true },
      { id: 'opt_b', text: '(ε₀ A / d) · (K₁ + K₂)', isCorrect: false },
      { id: 'opt_c', text: '(4 ε₀ A / d) · [ (K₁ K₂) / (K₁ + K₂) ]', isCorrect: false },
      { id: 'opt_d', text: '(ε₀ A / 2d) · (K₁ + K₂)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'C₁ = K₁ ε₀ A / (d/2), C₂ = K₂ ε₀ A / (d/2). 1/C_eq = 1/C₁ + 1/C₂ => C_eq = (2 ε₀ A / d) · (K₁ K₂ / (K₁ + K₂)).',
  },
  {
    id: 'q_phy_em_09',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'A conducting metal rod of length L rotates with constant angular speed ω about one pivot end in a uniform magnetic field B perpendicular to the plane of rotation. What is the motional EMF induced across the rod ends?',
    options: [
      { id: 'opt_a', text: '1/2 B ω L²', isCorrect: true },
      { id: 'opt_b', text: 'B ω L²', isCorrect: false },
      { id: 'opt_c', text: '1/4 B ω L²', isCorrect: false },
      { id: 'opt_d', text: '2 B ω L²', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'dε = B v dr = B (ω r) dr. Integrating from r = 0 to L yields ε = 1/2 B ω L².',
  },
  {
    id: 'q_phy_em_10',
    subjectId: 'sub_phy',
    topicId: 'top_electromag',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'In a series L-C-R resonant circuit with R = 10 Ω, L = 2 H, and C = 32 μF, what is the Quality Factor (Q-factor) of the resonance?',
    options: [
      { id: 'opt_a', text: '25.0', isCorrect: true },
      { id: 'opt_b', text: '10.0', isCorrect: false },
      { id: 'opt_c', text: '50.0', isCorrect: false },
      { id: 'opt_d', text: '5.0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Q = (1/R) √(L/C) = (1/10) √(2 / (32 × 10^-6)) = (1/10) √(62500) = 250 / 10 = 25.0.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 4: Modern & Nuclear Physics (sub_phy / top_modern_phy)
  // --------------------------------------------------------------------------
  {
    id: 'q_phy_mod_01',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'Who formulated the quantum photon model explaining the Photoelectric Effect (earning the 1921 Nobel Prize in Physics)?',
    options: [
      { id: 'opt_a', text: 'Albert Einstein', isCorrect: true },
      { id: 'opt_b', text: 'Max Planck', isCorrect: false },
      { id: 'opt_c', text: 'Niels Bohr', isCorrect: false },
      { id: 'opt_d', text: 'Louis de Broglie', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Albert Einstein proposed that light energy is quantized into discrete packets (photons) with energy E = hν.',
  },
  {
    id: 'q_phy_mod_02',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the electric charge of an alpha particle (α-particle)?',
    options: [
      { id: 'opt_a', text: '+2e (Helium nucleus)', isCorrect: true },
      { id: 'opt_b', text: '+1e (Proton)', isCorrect: false },
      { id: 'opt_c', text: '-1e (Electron)', isCorrect: false },
      { id: 'opt_d', text: 'Neutral (Zero)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'An alpha particle is a doubly ionized Helium atom (⁴He²⁺), consisting of 2 protons and 2 neutrons.',
  },
  {
    id: 'q_phy_mod_03',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the de Broglie wavelength λ of a particle with linear momentum p?',
    options: [
      { id: 'opt_a', text: 'λ = h / p', isCorrect: true },
      { id: 'opt_b', text: 'λ = p / h', isCorrect: false },
      { id: 'opt_c', text: 'λ = h · p', isCorrect: false },
      { id: 'opt_d', text: 'λ = h / (2 p)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'The de Broglie relation is λ = h / p, where h is Planck’s constant.',
  },
  {
    id: 'q_phy_mod_04',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'In the Bohr model of the Hydrogen atom, what is the ratio of radii of the 1st orbit (n=1) to the 2nd orbit (n=2)?',
    options: [
      { id: 'opt_a', text: '1 : 4', isCorrect: true },
      { id: 'opt_b', text: '1 : 2', isCorrect: false },
      { id: 'opt_c', text: '1 : 8', isCorrect: false },
      { id: 'opt_d', text: '1 : 1', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Bohr orbit radius scales as r_n ∝ n². Therefore r₁ / r₂ = 1² / 2² = 1/4.',
  },
  {
    id: 'q_phy_mod_05',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'A metal has a work function of Φ = 2.0 eV. When illuminated by monochromatic light with photon energy 3.5 eV, what is the maximum kinetic energy (K_max) of the ejected photoelectrons?',
    options: [
      { id: 'opt_a', text: '1.5 eV', isCorrect: true },
      { id: 'opt_b', text: '5.5 eV', isCorrect: false },
      { id: 'opt_c', text: '2.0 eV', isCorrect: false },
      { id: 'opt_d', text: '3.5 eV', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'By Einstein’s photoelectric equation: K_max = hν - Φ = 3.5 eV - 2.0 eV = 1.5 eV.',
  },
  {
    id: 'q_phy_mod_06',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'A radioactive isotope has a half-life of 10 days. What fraction of the original active radioactive nuclei remains undecayed after 30 days?',
    options: [
      { id: 'opt_a', text: '1 / 8 (12.5%)', isCorrect: true },
      { id: 'opt_b', text: '1 / 4 (25%)', isCorrect: false },
      { id: 'opt_c', text: '1 / 16 (6.25%)', isCorrect: false },
      { id: 'opt_d', text: '1 / 2 (50%)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Number of half-lives n = 30 / 10 = 3. Undecayed fraction = (1/2)³ = 1/8.',
  },
  {
    id: 'q_phy_mod_07',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'When a semiconductor p-n junction diode is connected in forward bias, what happens to the depletion layer barrier width?',
    options: [
      { id: 'opt_a', text: 'It decreases in width', isCorrect: true },
      { id: 'opt_b', text: 'It increases in width', isCorrect: false },
      { id: 'opt_c', text: 'It remains completely unchanged', isCorrect: false },
      { id: 'opt_d', text: 'It expands to the entire crystal', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Forward bias opposes the built-in potential barrier, pushing majority carriers toward the junction and reducing the depletion width.',
  },
  {
    id: 'q_phy_mod_08',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What is the shortest wavelength (series limit) in the Balmer series of the Hydrogen atom emission spectrum (in terms of Rydberg constant R)?',
    options: [
      { id: 'opt_a', text: '4 / R', isCorrect: true },
      { id: 'opt_b', text: '1 / R', isCorrect: false },
      { id: 'opt_c', text: '9 / R', isCorrect: false },
      { id: 'opt_d', text: '16 / R', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Balmer series has n₁ = 2. Series limit corresponds to n₂ = ∞. 1/λ = R (1/2² - 1/∞) = R/4 => λ = 4/R.',
  },
  {
    id: 'q_phy_mod_09',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'An electron (mass m_e) and a proton (mass m_p) have the exact same kinetic energy. What is the ratio of their de Broglie wavelengths (λ_e / λ_p)?',
    options: [
      { id: 'opt_a', text: '√(m_p / m_e)', isCorrect: true },
      { id: 'opt_b', text: '√(m_e / m_p)', isCorrect: false },
      { id: 'opt_c', text: 'm_p / m_e', isCorrect: false },
      { id: 'opt_d', text: '1.0 (Identical)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'λ = h / √(2 m K). For equal K, λ ∝ 1/√m => λ_e / λ_p = √(m_p / m_e).',
  },
  {
    id: 'q_phy_mod_10',
    subjectId: 'sub_phy',
    topicId: 'top_modern_phy',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'In nuclear binding energy curves, why does the binding energy per nucleon (BE/A) decrease for very heavy nuclei (A > 200)?',
    options: [
      { id: 'opt_a', text: 'Long-range Coulomb repulsion between protons begins to overcome short-range nuclear strong force', isCorrect: true },
      { id: 'opt_b', text: 'Nuclear strong force becomes repulsive at long distances', isCorrect: false },
      { id: 'opt_c', text: 'Excess electrons in heavy atoms neutralize nuclear charge', isCorrect: false },
      { id: 'opt_d', text: 'Neutrons undergo spontaneous pair annihilation', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Nuclear strong force has short range (~1-2 fm) acting on neighbors, while Coulomb electrostatic repulsion is long-range acting across all protons.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 5: Chemical Thermodynamics (sub_chem / top_thermo)
  // --------------------------------------------------------------------------
  {
    id: 'q_chem_th_01',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'In an adiabatic thermodynamic process, which quantity is strictly zero across the system boundary?',
    options: [
      { id: 'opt_a', text: 'Heat exchange (q = 0)', isCorrect: true },
      { id: 'opt_b', text: 'Work done (w = 0)', isCorrect: false },
      { id: 'opt_c', text: 'Change in internal energy (ΔU = 0)', isCorrect: false },
      { id: 'opt_d', text: 'Change in temperature (ΔT = 0)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'An adiabatic process is insulated such that no heat enters or leaves the system (q = 0).',
  },
  {
    id: 'q_chem_th_02',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the change in internal energy (ΔU) for the isothermal expansion of an ideal gas?',
    options: [
      { id: 'opt_a', text: 'Zero (0)', isCorrect: true },
      { id: 'opt_b', text: 'Positive (+)', isCorrect: false },
      { id: 'opt_c', text: 'Negative (-)', isCorrect: false },
      { id: 'opt_d', text: 'Equal to enthalpy change ΔH', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: "Internal energy of an ideal gas depends solely on temperature: ΔU = n C_v ΔT = 0 when ΔT = 0.",
  },
  {
    id: 'q_chem_th_03',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the standard thermodynamic reference temperature defined in chemical data tables?',
    options: [
      { id: 'opt_a', text: '298.15 K (25 °C)', isCorrect: true },
      { id: 'opt_b', text: '273.15 K (0 °C)', isCorrect: false },
      { id: 'opt_c', text: '300.00 K', isCorrect: false },
      { id: 'opt_d', text: '373.15 K (100 °C)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Standard thermodynamic states are tabulated at 298.15 K (25 °C) and 1 bar pressure.',
  },
  {
    id: 'q_chem_th_04',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'A thermodynamic system absorbs 300 J of heat from surroundings and performs 120 J of expansion work. What is the change in internal energy (ΔU)?',
    options: [
      { id: 'opt_a', text: '+180 J', isCorrect: true },
      { id: 'opt_b', text: '+420 J', isCorrect: false },
      { id: 'opt_c', text: '-180 J', isCorrect: false },
      { id: 'opt_d', text: '-420 J', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'By First Law of Thermodynamics: ΔU = q + w = +300 J + (-120 J) = +180 J.',
  },
  {
    id: 'q_chem_th_05',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'For a chemical process occurring at constant temperature and pressure, which condition guarantees spontaneous forward progress?',
    options: [
      { id: 'opt_a', text: 'ΔG < 0 (Gibbs Free Energy decrease)', isCorrect: true },
      { id: 'opt_b', text: 'ΔG > 0', isCorrect: false },
      { id: 'opt_c', text: 'ΔH > 0', isCorrect: false },
      { id: 'opt_d', text: 'ΔS < 0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'A negative change in Gibbs free energy (ΔG < 0) is the thermodynamic criterion for spontaneity at constant T and P.',
  },
  {
    id: 'q_chem_th_06',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the relationship between reaction enthalpy ΔH and internal energy change ΔU for ideal gaseous reactions?',
    options: [
      { id: 'opt_a', text: 'ΔH = ΔU + (Δn_g) R T', isCorrect: true },
      { id: 'opt_b', text: 'ΔH = ΔU - (Δn_g) R T', isCorrect: false },
      { id: 'opt_c', text: 'ΔH = ΔU / (Δn_g R T)', isCorrect: false },
      { id: 'opt_d', text: 'ΔH = (Δn_g) R T', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'H = U + P V. For ideal gases P V = n R T, so ΔH = ΔU + Δ(n_g R T) = ΔU + (Δn_g) R T.',
  },
  {
    id: 'q_chem_th_07',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'Which standard thermodynamic property is zero by convention for an element in its standard reference physical state?',
    options: [
      { id: 'opt_a', text: 'Standard enthalpy of formation (ΔH_f°)', isCorrect: true },
      { id: 'opt_b', text: 'Standard molar entropy (S°)', isCorrect: false },
      { id: 'opt_c', text: 'Heat capacity (C_p)', isCorrect: false },
      { id: 'opt_d', text: 'Absolute internal energy', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'By convention, the standard enthalpy of formation (ΔH_f°) of pure elements in their most stable allotrope is zero.',
  },
  {
    id: 'q_chem_th_08',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: '1 mole of an ideal gas expands isothermally and reversibly at 300 K from 10 L to 100 L. What is the work done by the gas (w_rev)? (Use R = 8.314 J/mol K)',
    options: [
      { id: 'opt_a', text: '5.74 kJ', isCorrect: true },
      { id: 'opt_b', text: '2.30 kJ', isCorrect: false },
      { id: 'opt_c', text: '11.48 kJ', isCorrect: false },
      { id: 'opt_d', text: '0.57 kJ', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'w = - n R T ln(V₂/V₁) = - 1 × 8.314 × 300 × 2.303 log₁₀(10) = - 5.744 kJ. Work done by gas = +5.74 kJ.',
  },
  {
    id: 'q_chem_th_09',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'For a chemical reaction with ΔH° = -40 kJ/mol and ΔS° = -100 J/(mol·K), at what temperature does the reaction transition from spontaneous to non-spontaneous?',
    options: [
      { id: 'opt_a', text: '400 K', isCorrect: true },
      { id: 'opt_b', text: '250 K', isCorrect: false },
      { id: 'opt_c', text: '500 K', isCorrect: false },
      { id: 'opt_d', text: '300 K', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Transition equilibrium occurs when ΔG° = 0 => T = ΔH° / ΔS° = (-40,000 J) / (-100 J/K) = 400 K.',
  },
  {
    id: 'q_chem_th_10',
    subjectId: 'sub_chem',
    topicId: 'top_thermo',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'The equilibrium constant K_p for a gas-phase reaction at 300 K is 100. What is the standard Gibbs free energy change ΔG° (R = 8.314 J/mol K)?',
    options: [
      { id: 'opt_a', text: '-11.48 kJ/mol', isCorrect: true },
      { id: 'opt_b', text: '+11.48 kJ/mol', isCorrect: false },
      { id: 'opt_c', text: '-5.74 kJ/mol', isCorrect: false },
      { id: 'opt_d', text: '-22.96 kJ/mol', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'ΔG° = - R T ln(K_p) = - 8.314 × 300 × 2.303 × log₁₀(100) = - 8.314 × 300 × 4.605 = -11.48 kJ/mol.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 6: Organic Reactions & Mechanisms (sub_chem / top_organic)
  // --------------------------------------------------------------------------
  {
    id: 'q_chem_org_01',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the hybridization of the central carbon atom in methane (CH₄)?',
    options: [
      { id: 'opt_a', text: 'sp³', isCorrect: true },
      { id: 'opt_b', text: 'sp²', isCorrect: false },
      { id: 'opt_c', text: 'sp', isCorrect: false },
      { id: 'opt_d', text: 'dsp²', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Carbon forms 4 equivalent sigma bonds directed toward tetrahedral corners with 109.5° bond angles (sp³).',
  },
  {
    id: 'q_chem_org_02',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'Which characteristic functional group is present in aldehydes?',
    options: [
      { id: 'opt_a', text: '-CHO (Formyl group)', isCorrect: true },
      { id: 'opt_b', text: '-COOH (Carboxyl group)', isCorrect: false },
      { id: 'opt_c', text: '-OH (Hydroxyl group)', isCorrect: false },
      { id: 'opt_d', text: '-C(=O)- (Ketone carbonyl)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Aldehydes contain the terminal carbonyl group -CHO.',
  },
  {
    id: 'q_chem_org_03',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the systematic IUPAC name for common acetic acid (CH₃COOH)?',
    options: [
      { id: 'opt_a', text: 'Ethanoic acid', isCorrect: true },
      { id: 'opt_b', text: 'Methanoic acid', isCorrect: false },
      { id: 'opt_c', text: 'Propanoic acid', isCorrect: false },
      { id: 'opt_d', text: 'Ethanol', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'A 2-carbon carboxylic acid chain is named ethanoic acid.',
  },
  {
    id: 'q_chem_org_04',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'Which of the following carbocations is the most thermodynamically stable due to hyperconjugation and inductive effects?',
    options: [
      { id: 'opt_a', text: 'Tertiary carbocation (3°)', isCorrect: true },
      { id: 'opt_b', text: 'Secondary carbocation (2°)', isCorrect: false },
      { id: 'opt_c', text: 'Primary carbocation (1°)', isCorrect: false },
      { id: 'opt_d', text: 'Methyl cation (CH₃⁺)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Stability order of simple alkyl carbocations is 3° > 2° > 1° > methyl due to 9 alpha C-H hyperconjugative structures.',
  },
  {
    id: 'q_chem_org_05',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the major electrophilic addition product when propene (CH₃-CH=CH₂) reacts with HBr in the absence of peroxides?',
    options: [
      { id: 'opt_a', text: '2-Bromopropane (Markovnikov product)', isCorrect: true },
      { id: 'opt_b', text: '1-Bromopropane', isCorrect: false },
      { id: 'opt_c', text: '1,2-Dibromopropane', isCorrect: false },
      { id: 'opt_d', text: '2,2-Dibromopropane', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: "Markovnikov's rule: proton adds to the less substituted carbon to generate the more stable secondary carbocation.",
  },
  {
    id: 'q_chem_org_06',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'Which chemical reagent is used in Tollens’ test (silver mirror test) to distinguish aldehydes from ketones?',
    options: [
      { id: 'opt_a', text: 'Ammoniacal silver nitrate solution [Ag(NH₃)₂]⁺', isCorrect: true },
      { id: 'opt_b', text: 'Alkaline copper sulfate with sodium potassium tartrate', isCorrect: false },
      { id: 'opt_c', text: 'Anhydrous ZnCl₂ in concentrated HCl', isCorrect: false },
      { id: 'opt_d', text: 'Acidified potassium permanganate', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: "Tollens' reagent is ammoniacal silver nitrate, reduced by aldehydes to deposit a metallic silver mirror.",
  },
  {
    id: 'q_chem_org_07',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What reaction mechanism is followed during the nucleophilic substitution of tertiary butyl bromide in aqueous alkaline medium?',
    options: [
      { id: 'opt_a', text: 'S_N1 (Unimolecular nucleophilic substitution)', isCorrect: true },
      { id: 'opt_b', text: 'S_N2 (Bimolecular nucleophilic substitution)', isCorrect: false },
      { id: 'opt_c', text: 'E2 elimination exclusively', isCorrect: false },
      { id: 'opt_d', text: 'Free radical substitution', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Steric crowding prevents backside S_N2 attack; ionization forms a stable tertiary carbocation in the rate-determining S_N1 step.',
  },
  {
    id: 'q_chem_org_08',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'When benzaldehyde (lacking α-hydrogens) is heated with 50% concentrated NaOH, it undergoes redox disproportionation known as:',
    options: [
      { id: 'opt_a', text: 'Cannizzaro Reaction', isCorrect: true },
      { id: 'opt_b', text: 'Aldol Condensation', isCorrect: false },
      { id: 'opt_c', text: 'Perkin Reaction', isCorrect: false },
      { id: 'opt_d', text: 'Clemmensen Reduction', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Aldehydes with no α-hydrogen atoms undergo Cannizzaro self-redox to produce benzyl alcohol and sodium benzoate.',
  },
  {
    id: 'q_chem_org_09',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What are the cleavage products from reductive ozonolysis (O₃ followed by Zn/H₂O) of 2-methylbut-2-ene (CH₃-C(CH₃)=CH-CH₃)?',
    options: [
      { id: 'opt_a', text: 'Acetone (Propanone) and Acetaldehyde (Ethanal)', isCorrect: true },
      { id: 'opt_b', text: 'Two molecules of Acetaldehyde', isCorrect: false },
      { id: 'opt_c', text: 'Butanone and Formaldehyde', isCorrect: false },
      { id: 'opt_d', text: 'Acetic acid and Acetone', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Cleaving the double bond in (CH₃)₂C=CH-CH₃ yields (CH₃)₂C=O (propanone) and CH₃CHO (ethanal).',
  },
  {
    id: 'q_chem_org_10',
    subjectId: 'sub_chem',
    topicId: 'top_organic',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'In an S_N2 nucleophilic displacement on chiral (R)-2-bromobutane by cyanide ion (CN⁻), the stereochemical outcome of the product is:',
    options: [
      { id: 'opt_a', text: '100% (S)-configuration due to Walden inversion', isCorrect: true },
      { id: 'opt_b', text: '100% (R)-configuration with retention', isCorrect: false },
      { id: 'opt_c', text: 'Racemic mixture (50% R, 50% S)', isCorrect: false },
      { id: 'opt_d', text: 'Complete loss of chirality to an achiral meso form', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'The concerted backside attack of S_N2 mechanism causes complete 100% inversion of configuration (Walden inversion).',
  },

  // --------------------------------------------------------------------------
  // TOPIC 7: Inorganic & Coordination Chemistry (sub_chem / top_inorganic)
  // --------------------------------------------------------------------------
  {
    id: 'q_chem_inorg_01',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'Which chemical element possesses the highest electronegativity on the Pauling scale?',
    options: [
      { id: 'opt_a', text: 'Fluorine (F = 3.98)', isCorrect: true },
      { id: 'opt_b', text: 'Chlorine (Cl = 3.16)', isCorrect: false },
      { id: 'opt_c', text: 'Oxygen (O = 3.44)', isCorrect: false },
      { id: 'opt_d', text: 'Nitrogen (N = 3.04)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Fluorine is the most electronegative element with Pauling value ~4.0.',
  },
  {
    id: 'q_chem_inorg_02',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the oxidation state of Chromium (Cr) in potassium dichromate (K₂Cr₂O₇)?',
    options: [
      { id: 'opt_a', text: '+6', isCorrect: true },
      { id: 'opt_b', text: '+3', isCorrect: false },
      { id: 'opt_c', text: '+7', isCorrect: false },
      { id: 'opt_d', text: '+4', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '2(+1) + 2(Cr) + 7(-2) = 0 => 2 Cr - 12 = 0 => Cr = +6.',
  },
  {
    id: 'q_chem_inorg_03',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the molecular geometry of Sulfur Hexafluoride (SF₆) according to VSEPR theory?',
    options: [
      { id: 'opt_a', text: 'Octahedral', isCorrect: true },
      { id: 'opt_b', text: 'Tetrahedral', isCorrect: false },
      { id: 'opt_c', text: 'Trigonal Bipyramidal', isCorrect: false },
      { id: 'opt_d', text: 'Square Planar', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'SF₆ has 6 bond pairs and 0 lone pairs on sulfur (sp³d² hybridization, octahedral geometry).',
  },
  {
    id: 'q_chem_inorg_04',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What are the coordination number and oxidation state of Cobalt in the complex [Co(NH₃)₆]Cl₃?',
    options: [
      { id: 'opt_a', text: 'Coordination number = 6, Oxidation state = +3', isCorrect: true },
      { id: 'opt_b', text: 'Coordination number = 6, Oxidation state = +2', isCorrect: false },
      { id: 'opt_c', text: 'Coordination number = 3, Oxidation state = +3', isCorrect: false },
      { id: 'opt_d', text: 'Coordination number = 4, Oxidation state = +2', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Co binds to 6 neutral NH₃ ligands (C.N. = 6); balancing 3 Cl⁻ counterions gives oxidation state +3.',
  },
  {
    id: 'q_chem_inorg_05',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'According to Crystal Field Theory (CFT), how do d-orbitals split in an octahedral ligand field?',
    options: [
      { id: 'opt_a', text: 'Lower energy t_2g triplet (d_xy, d_yz, d_xz) and higher energy e_g doublet (d_x²-y², d_z²)', isCorrect: true },
      { id: 'opt_b', text: 'Lower energy e_g doublet and higher energy t_2g triplet', isCorrect: false },
      { id: 'opt_c', text: 'All 5 d-orbitals remain completely degenerate', isCorrect: false },
      { id: 'opt_d', text: 'Splits into four distinct energy tiers', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Ligands approach along the Cartesian axes, repelling axial d_x²-y² and d_z² orbitals (e_g) higher than non-axial t_2g orbitals.',
  },
  {
    id: 'q_chem_inorg_06',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'Which of the following is a classic bidentate chelating ligand?',
    options: [
      { id: 'opt_a', text: 'Oxalate ion (C₂O₄²⁻)', isCorrect: true },
      { id: 'opt_b', text: 'Ammonia (NH₃)', isCorrect: false },
      { id: 'opt_c', text: 'Chloride ion (Cl⁻)', isCorrect: false },
      { id: 'opt_d', text: 'Cyanide ion (CN⁻)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Oxalate (ox) donates two pairs of electrons through two oxygen atoms, forming a 5-membered chelate ring.',
  },
  {
    id: 'q_chem_inorg_07',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the primary electronic mechanism giving rise to bright colors in aqueous transition metal coordination complexes?',
    options: [
      { id: 'opt_a', text: 'd-d electronic transitions in split crystal fields', isCorrect: true },
      { id: 'opt_b', text: 'Nuclear spin magnetic resonance', isCorrect: false },
      { id: 'opt_c', text: 'Thermal blackbody radiation', isCorrect: false },
      { id: 'opt_d', text: 'Scattering of visible photons by colloidal micelles', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Absorption of visible photons promotes electrons between split t_2g and e_g d-orbitals, transmitting complementary colors.',
  },
  {
    id: 'q_chem_inorg_08',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What is the spin-only magnetic moment (μ_s) of the high-spin complex ion [Fe(H₂O)₆]²⁺ (Fe atomic number Z = 26)?',
    options: [
      { id: 'opt_a', text: '4.90 BM (Bohr Magnetons)', isCorrect: true },
      { id: 'opt_b', text: '5.92 BM', isCorrect: false },
      { id: 'opt_c', text: '2.83 BM', isCorrect: false },
      { id: 'opt_d', text: '1.73 BM', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Fe²⁺ has 3d⁶ configuration. H₂O is weak-field, giving t_2g⁴ e_g² with n = 4 unpaired electrons. μ = √(4(4+2)) = √24 ≈ 4.90 BM.',
  },
  {
    id: 'q_chem_inorg_09',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What type of structural isomerism is exhibited between [Co(NH₃)₅(SO₄)]Br and [Co(NH₃)₅(Br)]SO₄?',
    options: [
      { id: 'opt_a', text: 'Ionization Isomerism', isCorrect: true },
      { id: 'opt_b', text: 'Linkage Isomerism', isCorrect: false },
      { id: 'opt_c', text: 'Coordination Isomerism', isCorrect: false },
      { id: 'opt_d', text: 'Hydrate Isomerism', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'These isomers yield different ions in solution (one precipitates AgBr with AgNO₃, the other BaSO₄ with BaCl₂).',
  },
  {
    id: 'q_chem_inorg_10',
    subjectId: 'sub_chem',
    topicId: 'top_inorganic',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'Which of the following square planar complexes exhibits geometric (cis-trans) isomerism?',
    options: [
      { id: 'opt_a', text: '[Pt(NH₃)₂Cl₂]', isCorrect: true },
      { id: 'opt_b', text: '[Pt(NH₃)₃Cl]⁺', isCorrect: false },
      { id: 'opt_c', text: '[Pt(NH₃)Cl₃]⁻', isCorrect: false },
      { id: 'opt_d', text: '[Pt(NH₃)₄]²⁺', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Square planar [Ma₂b₂] systems exist in cis (Cisplatin antitumor agent) and trans geometric forms.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 8: Physical Chemistry & Kinetics (sub_chem / top_physical_chem)
  // --------------------------------------------------------------------------
  {
    id: 'q_chem_kin_01',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What are the units of the rate constant k for a first-order chemical reaction?',
    options: [
      { id: 'opt_a', text: 's⁻¹ (or time⁻¹)', isCorrect: true },
      { id: 'opt_b', text: 'mol L⁻¹ s⁻¹', isCorrect: false },
      { id: 'opt_c', text: 'L mol⁻¹ s⁻¹', isCorrect: false },
      { id: 'opt_d', text: 'L² mol⁻² s⁻¹', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Rate = k [A] => (mol L⁻¹ s⁻¹) = k (mol L⁻¹) => k has units s⁻¹.',
  },
  {
    id: 'q_chem_kin_02',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the pH of a 0.01 M aqueous solution of strong hydrochloric acid (HCl)?',
    options: [
      { id: 'opt_a', text: '2.0', isCorrect: true },
      { id: 'opt_b', text: '1.0', isCorrect: false },
      { id: 'opt_c', text: '3.0', isCorrect: false },
      { id: 'opt_d', text: '7.0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'pH = -log₁₀[H⁺] = -log₁₀(10⁻²) = 2.0.',
  },
  {
    id: 'q_chem_kin_03',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What generally happens to the speed (rate) of a chemical reaction when the temperature is increased?',
    options: [
      { id: 'opt_a', text: 'The reaction rate increases exponentially', isCorrect: true },
      { id: 'opt_b', text: 'The reaction rate decreases', isCorrect: false },
      { id: 'opt_c', text: 'The reaction rate remains completely unchanged', isCorrect: false },
      { id: 'opt_d', text: 'The reaction rate immediately drops to zero', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Higher temperature increases the kinetic energy and fraction of molecules possessing energy equal to or greater than activation energy E_a.',
  },
  {
    id: 'q_chem_kin_04',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'For a first-order chemical reaction with rate constant k, what is the expression for its half-life (t_1/2)?',
    options: [
      { id: 'opt_a', text: '0.693 / k (independent of initial concentration)', isCorrect: true },
      { id: 'opt_b', text: '1 / (k [A]₀)', isCorrect: false },
      { id: 'opt_c', text: '[A]₀ / (2 k)', isCorrect: false },
      { id: 'opt_d', text: 'k / 0.693', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 't_1/2 = ln(2) / k = 0.69315 / k.',
  },
  {
    id: 'q_chem_kin_05',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'In the Arrhenius rate equation k = A · exp(-E_a / (R T)), what physical parameter does E_a represent?',
    options: [
      { id: 'opt_a', text: 'Activation Energy', isCorrect: true },
      { id: 'opt_b', text: 'Enthalpy of reaction', isCorrect: false },
      { id: 'opt_c', text: 'Gibbs free energy of reaction', isCorrect: false },
      { id: 'opt_d', text: 'Entropy of activation', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'E_a is the minimum kinetic energy reactant molecules must possess to overcome the transition state barrier.',
  },
  {
    id: 'q_chem_kin_06',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the approximate quantity of electric charge represented by 1 Faraday (1 F) in electrochemistry?',
    options: [
      { id: 'opt_a', text: '96,485 Coulombs / mol e⁻', isCorrect: true },
      { id: 'opt_b', text: '1.602 × 10⁻¹⁹ Coulombs', isCorrect: false },
      { id: 'opt_c', text: '6.022 × 10²³ Coulombs', isCorrect: false },
      { id: 'opt_d', text: '8.314 Joules', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '1 F = N_A × e = 6.022 × 10²³ × 1.602 × 10⁻¹⁹ C ≈ 96,500 Coulombs per mole of electrons.',
  },
  {
    id: 'q_chem_kin_07',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'For the Haber process equilibrium N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g), what is the relationship between K_p and K_c?',
    options: [
      { id: 'opt_a', text: 'K_p = K_c (R T)⁻²', isCorrect: true },
      { id: 'opt_b', text: 'K_p = K_c (R T)²', isCorrect: false },
      { id: 'opt_c', text: 'K_p = K_c (R T)⁻¹', isCorrect: false },
      { id: 'opt_d', text: 'K_p = K_c', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Δn_g = 2 - (1 + 3) = -2. K_p = K_c (R T)^(Δn_g) = K_c (R T)⁻².',
  },
  {
    id: 'q_chem_kin_08',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'If the rate constant k of a reaction doubles when temperature is raised from 300 K to 310 K, what is the activation energy E_a? (R = 8.314 J/mol K)',
    options: [
      { id: 'opt_a', text: '53.6 kJ/mol', isCorrect: true },
      { id: 'opt_b', text: '26.8 kJ/mol', isCorrect: false },
      { id: 'opt_c', text: '107.2 kJ/mol', isCorrect: false },
      { id: 'opt_d', text: '12.4 kJ/mol', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'ln(k₂/k₁) = ln(2) = (E_a / R) (1/300 - 1/310) => 0.69315 = (E_a / 8.314) (10 / 93000) => E_a ≈ 53,598 J/mol ≈ 53.6 kJ/mol.',
  },
  {
    id: 'q_chem_kin_09',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What is the standard cell potential (E°_cell) for the Daniell cell Zn(s) | Zn²⁺(1M) || Cu²⁺(1M) | Cu(s), given E°(Zn²⁺/Zn) = -0.76 V and E°(Cu²⁺/Cu) = +0.34 V?',
    options: [
      { id: 'opt_a', text: '+1.10 V', isCorrect: true },
      { id: 'opt_b', text: '-1.10 V', isCorrect: false },
      { id: 'opt_c', text: '+0.42 V', isCorrect: false },
      { id: 'opt_d', text: '+0.76 V', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'E°_cell = E°_cathode - E°_anode = +0.34 V - (-0.76 V) = +1.10 V.',
  },
  {
    id: 'q_chem_kin_10',
    subjectId: 'sub_chem',
    topicId: 'top_physical_chem',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'The solubility product K_sp of silver chromate (Ag₂CrO₄) is 1.1 × 10⁻¹² at 298 K. What is its molar solubility (S) in pure water?',
    options: [
      { id: 'opt_a', text: '6.5 × 10⁻⁵ M', isCorrect: true },
      { id: 'opt_b', text: '1.05 × 10⁻⁶ M', isCorrect: false },
      { id: 'opt_c', text: '2.3 × 10⁻⁴ M', isCorrect: false },
      { id: 'opt_d', text: '1.1 × 10⁻⁴ M', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Ag₂CrO₄(s) ⇌ 2 Ag⁺ + CrO₄²⁻. K_sp = (2S)² (S) = 4 S³ => S = (1.1 × 10⁻¹² / 4)^(1/3) = (2.75 × 10⁻¹³)^(1/3) ≈ 6.5 × 10⁻⁵ M.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 9: Differential & Integral Calculus (sub_math / top_calculus)
  // --------------------------------------------------------------------------
  {
    id: 'q_math_calc_01',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the derivative of sin(x) with respect to x?',
    options: [
      { id: 'opt_a', text: 'cos(x)', isCorrect: true },
      { id: 'opt_b', text: '-cos(x)', isCorrect: false },
      { id: 'opt_c', text: '-sin(x)', isCorrect: false },
      { id: 'opt_d', text: 'tan(x)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'd/dx [sin(x)] = cos(x).',
  },
  {
    id: 'q_math_calc_02',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the indefinite integral ∫ (1/x) dx for x > 0?',
    options: [
      { id: 'opt_a', text: 'ln(x) + C', isCorrect: true },
      { id: 'opt_b', text: 'e^x + C', isCorrect: false },
      { id: 'opt_c', text: '-1/x² + C', isCorrect: false },
      { id: 'opt_d', text: 'x² / 2 + C', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'The antiderivative of 1/x is the natural logarithm ln|x| + C.',
  },
  {
    id: 'q_math_calc_03',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the limit of (sin x) / x as x approaches 0?',
    options: [
      { id: 'opt_a', text: '1.0', isCorrect: true },
      { id: 'opt_b', text: '0.0', isCorrect: false },
      { id: 'opt_c', text: 'Infinity (∞)', isCorrect: false },
      { id: 'opt_d', text: '-1.0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'lim (x->0) [sin(x)/x] = 1 by L’Hôpital’s rule or Taylor series expansion.',
  },
  {
    id: 'q_math_calc_04',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the derivative of f(x) = x · ln(x) for x > 0?',
    options: [
      { id: 'opt_a', text: '1 + ln(x)', isCorrect: true },
      { id: 'opt_b', text: 'ln(x)', isCorrect: false },
      { id: 'opt_c', text: '1 / x', isCorrect: false },
      { id: 'opt_d', text: 'x + ln(x)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'By product rule: d/dx [x · ln(x)] = (1)(ln x) + x (1/x) = ln(x) + 1.',
  },
  {
    id: 'q_math_calc_05',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'Evaluate the definite integral ∫₀¹ e^(2x) dx.',
    options: [
      { id: 'opt_a', text: '1/2 (e² - 1)', isCorrect: true },
      { id: 'opt_b', text: 'e² - 1', isCorrect: false },
      { id: 'opt_c', text: '2 (e² - 1)', isCorrect: false },
      { id: 'opt_d', text: '1/2 e²', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '[ (1/2) e^(2x) ] from 0 to 1 = 1/2 e² - 1/2 e⁰ = 1/2 (e² - 1).',
  },
  {
    id: 'q_math_calc_06',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What are the critical points of the polynomial function f(x) = 2 x³ - 9 x² + 12 x + 5?',
    options: [
      { id: 'opt_a', text: 'x = 1 and x = 2', isCorrect: true },
      { id: 'opt_b', text: 'x = -1 and x = -2', isCorrect: false },
      { id: 'opt_c', text: 'x = 0 and x = 3', isCorrect: false },
      { id: 'opt_d', text: 'x = 2 and x = 3', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: "f'(x) = 6 x² - 18 x + 12 = 6 (x² - 3x + 2) = 6(x - 1)(x - 2) = 0 => x = 1, 2.",
  },
  {
    id: 'q_math_calc_07',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the integrating factor (I.F.) for the linear first-order differential equation dy/dx + 2 y = e^x?',
    options: [
      { id: 'opt_a', text: 'e^(2x)', isCorrect: true },
      { id: 'opt_b', text: 'e^(-2x)', isCorrect: false },
      { id: 'opt_c', text: '2 x', isCorrect: false },
      { id: 'opt_d', text: 'e^x', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'I.F. = exp(∫ P(x) dx) = exp(∫ 2 dx) = e^(2x).',
  },
  {
    id: 'q_math_calc_08',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What is the area enclosed by the parabola y² = 4 a x and its latus rectum line x = a?',
    options: [
      { id: 'opt_a', text: '(8/3) a²', isCorrect: true },
      { id: 'opt_b', text: '(4/3) a²', isCorrect: false },
      { id: 'opt_c', text: '(16/3) a²', isCorrect: false },
      { id: 'opt_d', text: '2 a²', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Area = 2 ∫₀^a 2 √(a) x^(1/2) dx = 4 √(a) [ (2/3) x^(3/2) ]₀^a = (8/3) a².',
  },
  {
    id: 'q_math_calc_09',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'Evaluate the definite integral I = ∫₀^(π/2) [ sin³(x) / (sin³(x) + cos³(x)) ] dx.',
    options: [
      { id: 'opt_a', text: 'π / 4', isCorrect: true },
      { id: 'opt_b', text: 'π / 2', isCorrect: false },
      { id: 'opt_c', text: '1.0', isCorrect: false },
      { id: 'opt_d', text: 'π', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Using King’s property ∫₀^a f(x) dx = ∫₀^a f(a-x) dx: 2I = ∫₀^(π/2) 1 dx = π/2 => I = π/4.',
  },
  {
    id: 'q_math_calc_10',
    subjectId: 'sub_math',
    topicId: 'top_calculus',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'If y = (tan x)^(tan x), what is the value of dy/dx evaluated at x = π/4?',
    options: [
      { id: 'opt_a', text: '2.0', isCorrect: true },
      { id: 'opt_b', text: '1.0', isCorrect: false },
      { id: 'opt_c', text: '4.0', isCorrect: false },
      { id: 'opt_d', text: '0.0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'ln y = tan(x) ln(tan x) => (1/y) y’ = sec²(x) ln(tan x) + tan(x) (sec² x / tan x) = sec²(x) [ln(tan x) + 1]. At x = π/4, y = 1, sec²(π/4) = 2, ln(1) = 0 => y’ = 1 · 2 [0 + 1] = 2.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 10: Linear Algebra & Matrices (sub_math / top_algebra)
  // --------------------------------------------------------------------------
  {
    id: 'q_math_alg_01',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'If matrix A has dimension 2 × 3 and matrix B has dimension 3 × 4, what is the dimension of product AB?',
    options: [
      { id: 'opt_a', text: '2 × 4', isCorrect: true },
      { id: 'opt_b', text: '3 × 3', isCorrect: false },
      { id: 'opt_c', text: '4 × 2', isCorrect: false },
      { id: 'opt_d', text: 'They cannot be multiplied', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '(m × k) multiplied by (k × n) produces an (m × n) matrix = 2 × 4.',
  },
  {
    id: 'q_math_alg_02',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the determinant of the 3 × 3 identity matrix I₃?',
    options: [
      { id: 'opt_a', text: '1.0', isCorrect: true },
      { id: 'opt_b', text: '0.0', isCorrect: false },
      { id: 'opt_c', text: '3.0', isCorrect: false },
      { id: 'opt_d', text: '-1.0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'The determinant of any identity matrix is 1.',
  },
  {
    id: 'q_math_alg_03',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the complex conjugate of z = 3 - 4 i?',
    options: [
      { id: 'opt_a', text: '3 + 4 i', isCorrect: true },
      { id: 'opt_b', text: '-3 - 4 i', isCorrect: false },
      { id: 'opt_c', text: '-3 + 4 i', isCorrect: false },
      { id: 'opt_d', text: '4 - 3 i', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'The complex conjugate replaces i with -i: z* = 3 + 4i.',
  },
  {
    id: 'q_math_alg_04',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'If A is a 3 × 3 square matrix with determinant det(A) = 5, what is det(2 A)?',
    options: [
      { id: 'opt_a', text: '40', isCorrect: true },
      { id: 'opt_b', text: '10', isCorrect: false },
      { id: 'opt_c', text: '20', isCorrect: false },
      { id: 'opt_d', text: '30', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'For an n × n matrix, det(k A) = k^n det(A). Here 2³ × 5 = 8 × 5 = 40.',
  },
  {
    id: 'q_math_alg_05',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What are the roots of the quadratic equation x² - 5 x + 6 = 0?',
    options: [
      { id: 'opt_a', text: 'x = 2 and x = 3', isCorrect: true },
      { id: 'opt_b', text: 'x = -2 and x = -3', isCorrect: false },
      { id: 'opt_c', text: 'x = 1 and x = 6', isCorrect: false },
      { id: 'opt_d', text: 'x = -1 and x = -6', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '(x - 2)(x - 3) = 0 => x = 2, 3.',
  },
  {
    id: 'q_math_alg_06',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'For any invertible non-singular matrix A, what is (Aᵀ)⁻¹ in terms of (A⁻¹)?',
    options: [
      { id: 'opt_a', text: '(A⁻¹)ᵀ (Transpose of Inverse)', isCorrect: true },
      { id: 'opt_b', text: 'Aᵀ', isCorrect: false },
      { id: 'opt_c', text: 'A⁻¹', isCorrect: false },
      { id: 'opt_d', text: 'Identity I', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'The inverse and transpose operations commute: (Aᵀ)⁻¹ = (A⁻¹)ᵀ.',
  },
  {
    id: 'q_math_alg_07',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the sum of the infinite geometric progression S = 1 + 1/2 + 1/4 + 1/8 + ...?',
    options: [
      { id: 'opt_a', text: '2.0', isCorrect: true },
      { id: 'opt_b', text: '3.0', isCorrect: false },
      { id: 'opt_c', text: '1.5', isCorrect: false },
      { id: 'opt_d', text: 'Infinity (∞)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'S_∞ = a / (1 - r) = 1 / (1 - 1/2) = 1 / (0.5) = 2.0.',
  },
  {
    id: 'q_math_alg_08',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What are the characteristic eigenvalues (λ) of the symmetric matrix M = [[2, 1], [1, 2]]?',
    options: [
      { id: 'opt_a', text: 'λ = 3 and λ = 1', isCorrect: true },
      { id: 'opt_b', text: 'λ = 2 and λ = 2', isCorrect: false },
      { id: 'opt_c', text: 'λ = 4 and λ = 0', isCorrect: false },
      { id: 'opt_d', text: 'λ = 1 and λ = -1', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'det(M - λ I) = (2 - λ)² - 1 = λ² - 4λ + 3 = (λ - 3)(λ - 1) = 0 => λ = 3, 1.',
  },
  {
    id: 'q_math_alg_09',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'If ω is a complex cube root of unity (1 + ω + ω² = 0, ω³ = 1), evaluate (1 - ω + ω²)(1 + ω - ω²).',
    options: [
      { id: 'opt_a', text: '4', isCorrect: true },
      { id: 'opt_b', text: '-4', isCorrect: false },
      { id: 'opt_c', text: '2', isCorrect: false },
      { id: 'opt_d', text: '0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '1 + ω² = -ω => (1 - ω + ω²) = -2ω. 1 + ω = -ω² => (1 + ω - ω²) = -2ω². Product = (-2ω)(-2ω²) = 4 ω³ = 4(1) = 4.',
  },
  {
    id: 'q_math_alg_10',
    subjectId: 'sub_math',
    topicId: 'top_algebra',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'For what value of parameter k does the system of linear equations x + y + z = 6, x + 2y + 3z = 10, x + 2y + k z = 12 have NO consistent solution (inconsistent)?',
    options: [
      { id: 'opt_a', text: 'k = 3', isCorrect: true },
      { id: 'opt_b', text: 'k = 2', isCorrect: false },
      { id: 'opt_c', text: 'k = 0', isCorrect: false },
      { id: 'opt_d', text: 'k = -3', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'If k = 3, the LHS of eq 2 and eq 3 are identical (x + 2y + 3z) while RHS are 10 and 12 (contradiction 10 = 12, no solution).',
  },

  // --------------------------------------------------------------------------
  // TOPIC 11: Coordinate Geometry & Vectors (sub_math / top_coordinate_geom)
  // --------------------------------------------------------------------------
  {
    id: 'q_math_geom_01',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the Euclidean distance between the origin (0, 0) and the point (3, 4)?',
    options: [
      { id: 'opt_a', text: '5 units', isCorrect: true },
      { id: 'opt_b', text: '7 units', isCorrect: false },
      { id: 'opt_c', text: '25 units', isCorrect: false },
      { id: 'opt_d', text: '1 unit', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'd = √(3² + 4²) = √(9 + 16) = √25 = 5.',
  },
  {
    id: 'q_math_geom_02',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the slope of a straight line perpendicular to a line with slope m = 2?',
    options: [
      { id: 'opt_a', text: '-1/2 (-0.5)', isCorrect: true },
      { id: 'opt_b', text: '2.0', isCorrect: false },
      { id: 'opt_c', text: '1/2 (0.5)', isCorrect: false },
      { id: 'opt_d', text: '-2.0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Perpendicular lines satisfy m₁ · m₂ = -1 => m₂ = -1/2.',
  },
  {
    id: 'q_math_geom_03',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the scalar dot product of two non-zero vectors that are mutually perpendicular (orthogonal)?',
    options: [
      { id: 'opt_a', text: '0.0', isCorrect: true },
      { id: 'opt_b', text: '1.0', isCorrect: false },
      { id: 'opt_c', text: '-1.0', isCorrect: false },
      { id: 'opt_d', text: 'Infinity', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'a · b = |a| |b| cos(90°) = 0.',
  },
  {
    id: 'q_math_geom_04',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the radius of the circle given by the equation x² + y² - 4 x + 6 y - 12 = 0?',
    options: [
      { id: 'opt_a', text: '5.0 units', isCorrect: true },
      { id: 'opt_b', text: '25.0 units', isCorrect: false },
      { id: 'opt_c', text: '√13 units', isCorrect: false },
      { id: 'opt_d', text: '7.0 units', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Center is (-g, -f) = (2, -3). Radius r = √(g² + f² - c) = √(2² + (-3)² - (-12)) = √(4 + 9 + 12) = √25 = 5.',
  },
  {
    id: 'q_math_geom_05',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the eccentricity (e) of the standard ellipse x² / 25 + y² / 16 = 1?',
    options: [
      { id: 'opt_a', text: '3 / 5 (0.6)', isCorrect: true },
      { id: 'opt_b', text: '4 / 5 (0.8)', isCorrect: false },
      { id: 'opt_c', text: '9 / 25', isCorrect: false },
      { id: 'opt_d', text: '16 / 25', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'b² = a² (1 - e²) => 16 = 25 (1 - e²) => e² = 9/25 => e = 3/5.',
  },
  {
    id: 'q_math_geom_06',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the vector cross product of orthogonal unit vectors î × ĵ in a right-handed Cartesian coordinate system?',
    options: [
      { id: 'opt_a', text: 'k̂', isCorrect: true },
      { id: 'opt_b', text: '-k̂', isCorrect: false },
      { id: 'opt_c', text: '0 (Zero vector)', isCorrect: false },
      { id: 'opt_d', text: '1 (Scalar)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'î × ĵ = k̂ by the right-hand rule for unit basis vectors.',
  },
  {
    id: 'q_math_geom_07',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the perpendicular distance from point P(1, 2) to the straight line 3 x + 4 y - 1 = 0?',
    options: [
      { id: 'opt_a', text: '2.0 units', isCorrect: true },
      { id: 'opt_b', text: '1.0 unit', isCorrect: false },
      { id: 'opt_c', text: '10.0 units', isCorrect: false },
      { id: 'opt_d', text: '5.0 units', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'd = |3(1) + 4(2) - 1| / √(3² + 4²) = |3 + 8 - 1| / 5 = 10 / 5 = 2.0.',
  },
  {
    id: 'q_math_geom_08',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What is the equation of the tangent line to the parabola y² = 8 x having slope m = 2?',
    options: [
      { id: 'opt_a', text: 'y = 2 x + 1', isCorrect: true },
      { id: 'opt_b', text: 'y = 2 x + 2', isCorrect: false },
      { id: 'opt_c', text: 'y = 2 x + 4', isCorrect: false },
      { id: 'opt_d', text: 'y = 2 x - 1', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'For y² = 4ax (4a = 8 => a = 2), tangent equation is y = mx + a/m = 2x + 2/2 = 2x + 1.',
  },
  {
    id: 'q_math_geom_09',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What is the cosine of the angle θ between vectors a = 2 î + 2 ĵ - k̂ and b = 6 î - 3 ĵ + 2 k̂?',
    options: [
      { id: 'opt_a', text: 'cos θ = 4 / 21', isCorrect: true },
      { id: 'opt_b', text: 'cos θ = 8 / 21', isCorrect: false },
      { id: 'opt_c', text: 'cos θ = 12 / 21', isCorrect: false },
      { id: 'opt_d', text: 'cos θ = 0 (90°)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'a · b = (2)(6) + (2)(-3) + (-1)(2) = 12 - 6 - 2 = 4. |a| = √(4+4+1) = 3, |b| = √(36+9+4) = 7. cos θ = 4 / (3 × 7) = 4/21.',
  },
  {
    id: 'q_math_geom_10',
    subjectId: 'sub_math',
    topicId: 'top_coordinate_geom',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'What is the area of the triangle formed by the vector vertices with position vectors a = î + ĵ, b = 2 î + 3 ĵ, and c = 4 î + ĵ?',
    options: [
      { id: 'opt_a', text: '3.0 square units', isCorrect: true },
      { id: 'opt_b', text: '6.0 square units', isCorrect: false },
      { id: 'opt_c', text: '1.5 square units', isCorrect: false },
      { id: 'opt_d', text: '4.5 square units', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'AB = î + 2ĵ, AC = 3î. Area = 1/2 |AB × AC| = 1/2 |(î + 2ĵ) × 3î| = 1/2 |-6 k̂| = 3.0.',
  },

  // --------------------------------------------------------------------------
  // TOPIC 12: Probability & Statistics (sub_math / top_probability)
  // --------------------------------------------------------------------------
  {
    id: 'q_math_prob_01',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the probability of tossing a fair coin and getting heads?',
    options: [
      { id: 'opt_a', text: '1 / 2 (0.50)', isCorrect: true },
      { id: 'opt_b', text: '1.00', isCorrect: false },
      { id: 'opt_c', text: '0.00', isCorrect: false },
      { id: 'opt_d', text: '1 / 4 (0.25)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '1 favorable outcome out of 2 equally likely outcomes = 1/2.',
  },
  {
    id: 'q_math_prob_02',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the value of 5! (5 factorial)?',
    options: [
      { id: 'opt_a', text: '120', isCorrect: true },
      { id: 'opt_b', text: '60', isCorrect: false },
      { id: 'opt_c', text: '24', isCorrect: false },
      { id: 'opt_d', text: '720', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '5! = 5 × 4 × 3 × 2 × 1 = 120.',
  },
  {
    id: 'q_math_prob_03',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 4.0,
    content: 'What is the median of the ordered data set [3, 7, 8, 12, 14]?',
    options: [
      { id: 'opt_a', text: '8.0', isCorrect: true },
      { id: 'opt_b', text: '7.0', isCorrect: false },
      { id: 'opt_c', text: '8.8 (Mean)', isCorrect: false },
      { id: 'opt_d', text: '12.0', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'In a sorted list of 5 items, the middle 3rd item is 8.0.',
  },
  {
    id: 'q_math_prob_04',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'Two standard fair 6-sided dice are rolled simultaneously. What is the probability that the sum of the numbers on the dice is equal to 7?',
    options: [
      { id: 'opt_a', text: '1 / 6 (6 in 36)', isCorrect: true },
      { id: 'opt_b', text: '1 / 12', isCorrect: false },
      { id: 'opt_c', text: '7 / 36', isCorrect: false },
      { id: 'opt_d', text: '5 / 36', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Favorable pairs for sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6 pairs. P = 6/36 = 1/6.',
  },
  {
    id: 'q_math_prob_05',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'If events A and B satisfy P(A) = 0.6, P(B) = 0.5, and P(A ∩ B) = 0.3, what is P(A ∪ B)?',
    options: [
      { id: 'opt_a', text: '0.80', isCorrect: true },
      { id: 'opt_b', text: '0.70', isCorrect: false },
      { id: 'opt_c', text: '0.90', isCorrect: false },
      { id: 'opt_d', text: '0.50', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'P(A ∪ B) = P(A) + P(B) - P(A ∩ B) = 0.6 + 0.5 - 0.3 = 0.80.',
  },
  {
    id: 'q_math_prob_06',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'In how many distinct ways can a committee of 3 members be selected from a group of 8 eligible candidates (8C3)?',
    options: [
      { id: 'opt_a', text: '56', isCorrect: true },
      { id: 'opt_b', text: '336', isCorrect: false },
      { id: 'opt_c', text: '24', isCorrect: false },
      { id: 'opt_d', text: '120', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: '8C3 = (8 × 7 × 6) / (3 × 2 × 1) = 56.',
  },
  {
    id: 'q_math_prob_07',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 4.0,
    content: 'What is the relationship between the statistical variance (Var) and standard deviation (σ) of a distribution?',
    options: [
      { id: 'opt_a', text: 'Var = σ²', isCorrect: true },
      { id: 'opt_b', text: 'Var = √σ', isCorrect: false },
      { id: 'opt_c', text: 'Var = 2 σ', isCorrect: false },
      { id: 'opt_d', text: 'Var = σ / 2', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Variance is defined as the square of standard deviation: σ².',
  },
  {
    id: 'q_math_prob_08',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'An urn contains 4 red balls and 6 black balls. If 3 balls are drawn at random without replacement, what is the probability that exactly 2 are red?',
    options: [
      { id: 'opt_a', text: '3 / 10 (or 36 / 120)', isCorrect: true },
      { id: 'opt_b', text: '1 / 5', isCorrect: false },
      { id: 'opt_c', text: '1 / 2', isCorrect: false },
      { id: 'opt_d', text: '2 / 5', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'Favorable ways = 4C2 × 6C1 = 6 × 6 = 36. Total ways = 10C3 = 120. P = 36/120 = 3/10 = 0.30.',
  },
  {
    id: 'q_math_prob_09',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'A rare disease affects 1% of a population. A diagnostic test has 95% true positive rate (sensitivity) and 90% true negative rate (specificity). If a random individual tests positive, what is the posterior probability that they actually have the disease (by Bayes’ Theorem)?',
    options: [
      { id: 'opt_a', text: '8.76% (approx 0.088)', isCorrect: true },
      { id: 'opt_b', text: '95.00%', isCorrect: false },
      { id: 'opt_c', text: '50.00%', isCorrect: false },
      { id: 'opt_d', text: '1.00%', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'P(D|+) = (0.95 × 0.01) / [ (0.95 × 0.01) + (0.10 × 0.99) ] = 0.0095 / (0.0095 + 0.0990) = 0.0095 / 0.1085 ≈ 8.76%.',
  },
  {
    id: 'q_math_prob_10',
    subjectId: 'sub_math',
    topicId: 'top_probability',
    type: 'MCQ',
    difficulty: 'HARD',
    marks: 4.0,
    content: 'A fair coin is tossed 10 times. What is the probability of obtaining exactly 6 heads (Binomial distribution B(10, 0.5))?',
    options: [
      { id: 'opt_a', text: '210 / 1024 ≈ 0.2051', isCorrect: true },
      { id: 'opt_b', text: '105 / 1024 ≈ 0.1025', isCorrect: false },
      { id: 'opt_c', text: '252 / 1024 ≈ 0.2461', isCorrect: false },
      { id: 'opt_d', text: '1 / 2 (0.5000)', isCorrect: false },
    ],
    correctOptionId: 'opt_a',
    explanation: 'P(X=6) = 10C6 (1/2)⁶ (1/2)⁴ = 210 / 1024 ≈ 0.2051.',
  },
];

export async function runSeed() {
  console.log('1. Seeding permissions & roles into PostgreSQL...');
  for (const p of PERMISSIONS) {
    await pgDb.query(
      `INSERT INTO "permissions" ("id", "key", "description", "module")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "module" = EXCLUDED."module"`,
      [p.id, p.key, p.description, p.module]
    );
  }

  for (const r of ROLES) {
    await pgDb.query(
      `INSERT INTO "roles" ("id", "name", "description", "isSystem")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description", "isSystem" = EXCLUDED."isSystem"`,
      [r.id, r.name, r.description, r.isSystem]
    );
  }

  console.log('2. Seeding role_permissions mappings into PostgreSQL...');
  for (const r of ROLES) {
    for (const permKey of r.permissions) {
      const permRes = await pgDb.query(`SELECT "id" FROM "permissions" WHERE "key" = $1`, [permKey]);
      if (permRes.rows.length > 0) {
        const permId = (permRes.rows[0] as any).id;
        await pgDb.query(
          `INSERT INTO "role_permissions" ("roleId", "permissionId")
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [r.id, permId]
        );
      }
    }
  }

  console.log('3. Seeding baseline persona users (Admin, SubAdmin, Teacher, Student)...');
  for (const u of USERS) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    await pgDb.query(
      `INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "status")
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       ON CONFLICT ("email") DO UPDATE SET
         "passwordHash" = EXCLUDED."passwordHash",
         "firstName" = EXCLUDED."firstName",
         "lastName" = EXCLUDED."lastName",
         "status" = 'ACTIVE'`,
      [u.id, u.email, passwordHash, u.firstName, u.lastName]
    );

    await pgDb.query(
      `INSERT INTO "user_roles" ("userId", "roleId")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [u.id, u.roleId]
    );
  }

  console.log('4. Seeding Courses, Subjects & Syllabus Topics into PostgreSQL...');
  for (const c of SEED_COURSES) {
    await pgDb.query(
      `INSERT INTO "courses" ("id", "name", "code", "description", "status", "durationMonths")
       VALUES ($1, $2, $3, $4, 'PUBLISHED', $5)
       ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description"`,
      [c.id, c.name, c.code, c.description, c.durationMonths]
    );
  }

  for (const s of SEED_SUBJECTS) {
    await pgDb.query(
      `INSERT INTO "subjects" ("id", "courseId", "name", "code", "description", "credits", "order")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("courseId", "code") DO UPDATE SET "name" = EXCLUDED."name", "credits" = EXCLUDED."credits"`,
      [s.id, s.courseId, s.name, s.code, s.description, s.credits, s.order]
    );
  }

  for (const t of SEED_TOPICS) {
    await pgDb.query(
      `INSERT INTO "syllabus_nodes" ("id", "subjectId", "title", "type", "orderIndex", "depth")
       VALUES ($1, $2, $3, 'TOPIC', $4, 1)
       ON CONFLICT ("id") DO UPDATE SET "title" = EXCLUDED."title", "subjectId" = EXCLUDED."subjectId"`,
      [t.id, t.subjectId, t.title, t.orderIndex]
    );
  }

  console.log(`5. Seeding ${SEED_QUESTIONS.length} rich Question Bank items across 3 subjects & 12 topics with mixed difficulties...`);
  let questionCount = 0;
  for (const q of SEED_QUESTIONS) {
    const dataPayload = JSON.stringify({
      options: q.options,
      correctOptionId: q.correctOptionId,
      explanation: q.explanation,
    });

    await pgDb.query(
      `INSERT INTO "questions" (
        "id", "type", "content", "data", "difficulty", "marks", "status", "version",
        "courseId", "subjectId", "syllabusNodeId", "createdById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED', 1, 'c1', $7, $8, 'usr_admin_test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "type" = EXCLUDED."type",
        "content" = EXCLUDED."content",
        "data" = EXCLUDED."data",
        "difficulty" = EXCLUDED."difficulty",
        "marks" = EXCLUDED."marks",
        "status" = 'PUBLISHED',
        "courseId" = 'c1',
        "subjectId" = EXCLUDED."subjectId",
        "syllabusNodeId" = EXCLUDED."syllabusNodeId"`,
      [q.id, q.type, q.content, dataPayload, q.difficulty, q.marks, q.subjectId, q.topicId]
    );
    questionCount++;
  }

  console.log('6. Seeding 23 baseline languages into PostgreSQL...');
  for (const l of BASELINE_LANGUAGES) {
    const langId = `lang_${l.code}`;
    await pgDb.query(
      `INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "nativeName" = EXCLUDED."nativeName"`,
      [langId, l.code, l.name, l.nativeName, l.isDefault]
    );
  }

  console.log('7. Seeding translation keys & values into PostgreSQL...');
  for (const k of TRANSLATION_KEYS) {
    const keyId = `tk_${k.key}`;
    await pgDb.query(
      `INSERT INTO "translation_keys" ("id", "key", "description", "module")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "module" = EXCLUDED."module"`,
      [keyId, k.key, k.description, k.module]
    );
  }

  let totalTranslationsSeeded = 0;
  for (const [langCode, keyVals] of Object.entries(SEED_TRANSLATIONS)) {
    const langRes = await pgDb.query(`SELECT "id" FROM "languages" WHERE "code" = $1`, [langCode]);
    if (langRes.rows.length > 0) {
      const langId = (langRes.rows[0] as any).id;
      for (const [key, value] of Object.entries(keyVals)) {
        const keyRes = await pgDb.query(`SELECT "id" FROM "translation_keys" WHERE "key" = $1`, [key]);
        if (keyRes.rows.length > 0) {
          const keyId = (keyRes.rows[0] as any).id;
          const trId = `tr_${langCode}_${key}`;
          await pgDb.query(
            `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value")
             VALUES ($1, $2, $3, $4)
             ON CONFLICT ("languageId", "translationKeyId") DO UPDATE SET "value" = EXCLUDED."value"`,
            [trId, langId, keyId, value]
          );
          totalTranslationsSeeded++;
        }
      }
    }
  }

  console.log('8. Seeding standard authentic JEE Main Exam Pattern blueprint...');
  await pgDb.query(`
    INSERT INTO "exam_patterns" (
      "id", "name", "courseId", "durationMinutes", "description", "status", "type", "totalMarks", "version", "createdById", "createdAt", "updatedAt"
    ) VALUES (
      'pat_jee_main_standard',
      'JEE Main Grand Blueprint (PCM)',
      'c1',
      180,
      'Standard 3-hour examination covering Physics, Chemistry, and Mathematics (30 questions each, +4 / -1)',
      'PUBLISHED',
      'MULTI',
      300.0,
      1,
      'usr_admin_test',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ) ON CONFLICT ("id") DO UPDATE SET
      "name" = EXCLUDED."name",
      "status" = 'PUBLISHED',
      "totalMarks" = 300.0
  `);

  for (const sub of [{ id: 'sub_phy', marks: 100 }, { id: 'sub_chem', marks: 100 }, { id: 'sub_math', marks: 100 }]) {
    await pgDb.query(`
      INSERT INTO "exam_pattern_subjects" ("examPatternId", "subjectId", "targetMarks")
      VALUES ('pat_jee_main_standard', $1, $2)
      ON CONFLICT ("examPatternId", "subjectId") DO UPDATE SET "targetMarks" = EXCLUDED."targetMarks"
    `, [sub.id, sub.marks]);
  }

  const baselineSections = [
    { id: 'sec_jee_phy', name: 'Section A: Physics', subjectId: 'sub_phy', numQ: 10, marks: 4.0, wrong: -1.0, order: 1 },
    { id: 'sec_jee_chem', name: 'Section B: Chemistry', subjectId: 'sub_chem', numQ: 10, marks: 4.0, wrong: -1.0, order: 2 },
    { id: 'sec_jee_math', name: 'Section C: Mathematics', subjectId: 'sub_math', numQ: 10, marks: 4.0, wrong: -1.0, order: 3 },
  ];

  for (const s of baselineSections) {
    await pgDb.query(`
      INSERT INTO "exam_pattern_sections" (
        "id", "examPatternId", "subjectId", "name", "sequenceOrder", "numQuestions", "marksPerQuestion", "totalMarks", "marksCorrect", "marksWrong", "marksUnattempted", "createdAt", "updatedAt"
      ) VALUES ($1, 'pat_jee_main_standard', $2, $3, $4, $5, $6, $7, $8, $9, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "numQuestions" = EXCLUDED."numQuestions",
        "marksPerQuestion" = EXCLUDED."marksPerQuestion",
        "totalMarks" = EXCLUDED."totalMarks"
    `, [s.id, s.subjectId, s.name, s.order, s.numQ, s.marks, s.numQ * s.marks, s.marks, s.wrong]);
  }

  console.log('================================================================');
  console.log(`✅ DATABASE SEED COMPLETE:`);
  console.log(`   - Courses: ${SEED_COURSES.length} (Engineering Entrance & Medical Foundation)`);
  console.log(`   - Subjects: ${SEED_SUBJECTS.length} (Physics, Chemistry, Mathematics, Biology)`);
  console.log(`   - Topics: ${SEED_TOPICS.length} syllabus topics`);
  console.log(`   - Questions: ${questionCount} published questions seeded across all 12 topics (10 per topic: 3 EASY, 4 MEDIUM, 3 HARD)`);
  console.log(`   - Blueprints: 1 standard authentic JEE Main Grand Blueprint (pat_jee_main_standard) with 3 sections`);
  console.log(`   - Languages: ${BASELINE_LANGUAGES.length} (Full 23-language Indian baseline)`);
  console.log(`   - Translations: ${totalTranslationsSeeded}`);
  console.log('================================================================');
}

if (require.main === module) {
  runSeed()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
