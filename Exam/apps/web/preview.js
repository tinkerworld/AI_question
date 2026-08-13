const http = require('http');

const PORT = 3000;

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ExamOS // Adaptive Multilingual Learning Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root, [data-theme="dark"] {
      --bg-color: #0b0f19;
      --panel-bg: #131b2e;
      --card-bg: #1c273e;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: #2e3d5a;
      --accent-color: #06b6d4;
    }
    [data-theme="gray"] {
      --bg-color: #1e293b;
      --panel-bg: #334155;
      --card-bg: #475569;
      --text-main: #f1f5f9;
      --text-muted: #cbd5e1;
      --border-color: #64748b;
      --accent-color: #38bdf8;
    }
    [data-theme="light"] {
      --bg-color: #f8fafc;
      --panel-bg: #ffffff;
      --card-bg: #f1f5f9;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: #cbd5e1;
      --accent-color: #0284c7;
    }
    * { box-sizing: border-box; }
    body {
      background-color: var(--bg-color);
      color: var(--text-main);
      font-family: 'Inter', system-ui, sans-serif;
      margin: 0;
      padding: 0;
      transition: all 0.3s ease;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: var(--panel-bg);
      border-bottom: 1px solid var(--border-color);
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .logo-box {
      width: 36px; height: 36px; border-radius: 8px;
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; font-family: 'JetBrains Mono', monospace; color: #fff;
    }
    .app-shell { flex: 1; display: flex; }
    aside {
      width: 260px; background: var(--panel-bg);
      border-right: 1px solid var(--border-color);
      padding: 24px 16px;
    }
    .nav-item {
      display: block; padding: 10px 14px; border-radius: 6px;
      margin-bottom: 8px; cursor: pointer; font-size: 13px;
      transition: all 0.2s;
    }
    .active-nav {
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid var(--accent-color);
      color: var(--accent-color); font-weight: bold;
    }
    .inactive-nav {
      border: 1px solid transparent; color: var(--text-main);
    }
    .inactive-nav:hover { background: rgba(255,255,255,0.05); }
    main { flex: 1; padding: 32px; }
    .card {
      background: var(--panel-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px; padding: 28px;
      margin-bottom: 24px;
    }
    .btn-theme {
      padding: 6px 12px; border-radius: 6px; border: none;
      cursor: pointer; font-size: 12px; display: inline-flex;
      align-items: center; gap: 6px; font-weight: 500;
    }
    .btn-theme-active { background: #06b6d4; color: #000; font-weight: bold; }
    .btn-theme-inactive { background: transparent; color: #fff; }
    select, input {
      padding: 8px 12px; border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--card-bg); color: var(--text-main);
      font-size: 13px; outline: none;
    }
    .btn-action {
      padding: 8px 16px; border-radius: 6px; border: none;
      background: #06b6d4; color: #000; font-weight: bold;
      cursor: pointer; font-size: 12px; transition: opacity 0.2s;
    }
    .btn-action:hover { opacity: 0.9; }
    .badge {
      display: inline-block; padding: 4px 8px; border-radius: 4px;
      font-size: 11px; font-weight: bold; font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>
  <header>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div class="logo-box">EX</div>
      <div>
        <div id="app-title" style="font-weight: bold; font-family: 'JetBrains Mono', monospace; font-size: 16px;">
          ExamOS // Adaptive Learning Platform
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">
          Phase 1 Foundation • Multilingual Engine (ADR-013)
        </div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 12px;">
      <!-- Theme Switcher -->
      <div style="display: flex; gap: 4px; background: rgba(255,255,255,0.08); padding: 4px; border-radius: 8px;">
        <button class="btn-theme btn-theme-active" id="btn-dark" onclick="setTheme('dark')">🌙 Dark</button>
        <button class="btn-theme btn-theme-inactive" id="btn-gray" onclick="setTheme('gray')">🌫️ Slate</button>
        <button class="btn-theme btn-theme-inactive" id="btn-light" onclick="setTheme('light')">☀️ Light</button>
      </div>

      <!-- 23 Baseline Language Selector -->
      <select id="lang-select" onchange="setLanguage(this.value)">
        <!-- Options populated dynamically -->
      </select>

      <!-- Add Language Button -->
      <button class="btn-action" onclick="toggleAddLangModal()">+ Add Language</button>
    </div>
  </header>

  <div class="app-shell">
    <aside>
      <div style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); margin-bottom: 12px;">
        NAVIGATION
      </div>
      <div class="nav-item active-nav" id="nav-dashboard">📊 <span id="lbl-dashboard">Dashboard</span></div>
      <div class="nav-item inactive-nav">👥 <span id="lbl-users">User Management</span></div>
      <div class="nav-item inactive-nav">📚 <span id="lbl-courses">Academic Courses</span></div>
      <div class="nav-item inactive-nav">❓ <span id="lbl-questions">Question Bank</span></div>
      <div class="nav-item inactive-nav">📝 <span id="lbl-exams">Exam Patterns</span></div>
      <div class="nav-item inactive-nav">📈 <span id="lbl-analytics">Student Analytics</span></div>
    </aside>

    <main>
      <!-- Add Language Modal / Form (Hidden by default) -->
      <div id="add-lang-modal" class="card" style="display: none; border-color: #06b6d4; background: rgba(6, 182, 212, 0.05);">
        <h3 style="margin-top: 0; font-family: 'JetBrains Mono', monospace; color: #06b6d4;">
          ➕ Register New Language / Customize Translation Dictionary
        </h3>
        <p style="font-size: 13px; color: var(--text-muted);">
          Add custom languages or override translations dynamically. All missing translation keys automatically fallback to English defaults.
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Language Code (ISO)</label>
            <input type="text" id="new-code" placeholder="e.g. fr, es, de, bho" style="width: 100%;">
          </div>
          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Language Name (English)</label>
            <input type="text" id="new-name" placeholder="e.g. French, Spanish, Bhojpuri" style="width: 100%;">
          </div>
          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Native Name</label>
            <input type="text" id="new-native" placeholder="e.g. Français, Español, भोजपुरी" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Welcome Heading Translation</label>
            <input type="text" id="new-trans-welcome" placeholder="Translated 'Welcome to ExamOS Platform'" style="width: 100%;">
          </div>
          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">App Title Translation</label>
            <input type="text" id="new-trans-title" placeholder="Translated 'ExamOS // Adaptive Learning Platform'" style="width: 100%;">
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn-action" onclick="registerCustomLanguage()">Save Language & Activate</button>
          <button class="btn-theme btn-theme-inactive" style="border: 1px solid var(--border-color);" onclick="toggleAddLangModal()">Cancel</button>
        </div>
      </div>

      <!-- Main Overview Card -->
      <div class="card">
        <h1 id="welcome-heading" style="margin-top: 0; font-size: 24px; font-family: 'JetBrains Mono', monospace;">
          Welcome to ExamOS Platform
        </h1>
        <p id="welcome-desc" style="color: var(--text-muted); line-height: 1.6;">
          Phase 1 Foundation fully functional. 23 Official Indian Languages + custom language registration engine active with English fallback strategy.
        </p>

        <div style="margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="background: var(--card-bg); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">MULTILINGUAL ENGINE</div>
            <div style="font-size: 18px; font-weight: bold; color: #10b981;">23 Baseline + Custom</div>
          </div>
          <div style="background: var(--card-bg); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">ACTIVE THEME</div>
            <div id="status-theme" style="font-size: 18px; font-weight: bold; color: var(--accent-color);">Dark Slate</div>
          </div>
          <div style="background: var(--card-bg); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">ACTIVE LANGUAGE</div>
            <div id="status-lang" style="font-size: 18px; font-weight: bold; color: #8b5cf6;">English (en)</div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    // 23 Official Baseline Languages Configuration
    let languagesList = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
      { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
      { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
      { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
      { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
      { code: 'or', name: 'Odia', nativeName: 'ওড়িয়া' },
      { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
      { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
      { code: 'ma', name: 'Maithili', nativeName: 'मैथिली' },
      { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
      { code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी' },
      { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
      { code: 'sd', name: 'Sindhi', nativeName: 'सिंधी' },
      { code: 'br', name: 'Bodo', nativeName: 'बोडो' },
      { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
      { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্' },
      { code: 'sat', name: 'Santhali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ' },
      { code: 'lus', name: 'Mizo', nativeName: 'Mizo' }
    ];

    // Complete Translation Dictionaries for All 23 Baseline Languages
    let translations = {
      en: { welcome: 'Welcome to ExamOS Platform', app_title: 'ExamOS // Adaptive Learning Platform', dashboard: 'Dashboard', users: 'User Management', courses: 'Academic Courses', questions: 'Question Bank', exams: 'Exam Patterns', analytics: 'Student Analytics' },
      hi: { welcome: 'ExamOS प्लेटफॉर्म में आपका स्वागत है', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक पाठ्यक्रम', questions: 'प्रश्न बैंक', exams: 'परीक्षा पैटर्न', analytics: 'छात्र विश्लेषण' },
      bn: { welcome: 'ExamOS প্ল্যাটফর্মে স্বাগতম', app_title: 'ExamOS // অ্যাডাপ্টিভ লার্নিং প্ল্যাটফর্ম', dashboard: 'ড্যাশবোর্ড', users: 'ব্যবহারকারী পরিচালনা', courses: 'একাডেমিক কোর্স', questions: 'প্রশ্ন ব্যাংক', exams: 'পরীক্ষার প্যাটার্ন', analytics: 'ছাত্র অ্যানালিটিক্স' },
      te: { welcome: 'ExamOS ప్లాట్‌ఫారమ్‌కు స్వాగతం', app_title: 'ExamOS // అడాప్టివ్ లెర్నింగ్ ప్లాట్‌ఫారమ్', dashboard: 'డాష్‌బోర్డ్', users: 'వినియోగదారు నిర్వహణ', courses: 'అకాడమిక్ కోర్సులు', questions: 'ప్రశ్నల బ్యాంక్', exams: 'పరీక్షా సరళి', analytics: 'విద్యార్థుల విశ్లేషణ' },
      mr: { welcome: 'ExamOS प्लॅटफॉर्मवर आपले स्वागत आहे', app_title: 'ExamOS // अ‍ॅडॉप्टिव्ह लर्निंग प्लॅटफॉर्म', dashboard: 'डॅशबोर्ड', users: 'वापरकर्ता व्यवस्थापन', courses: 'शैक्षणिक अभ्यासक्रम', questions: 'प्रश्न संच', exams: 'परीक्षा पद्धती', analytics: 'विद्यार्थी विश्लेषण' },
      ta: { welcome: 'ExamOS தளத்திற்கு உங்களை வரவேற்கிறோம்', app_title: 'ExamOS // தகவமைப்பு கற்றல் தளம்', dashboard: 'டாஷ்போர்டு', users: 'பயனர் நிர்வாகம்', courses: 'கல்விப் பாடங்கள்', questions: 'வினா வங்கி', exams: 'தேர்வு முறைகள்', analytics: 'மாணவர் பகுப்பாய்வு' },
      ur: { welcome: 'ExamOS پلیٹ فارم میں خوش آمدید', app_title: 'ExamOS // موافقانہ تعلیمی پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین کا انتظام', courses: 'تعليمى نصاب', questions: 'سوالات کا بنک', exams: 'امتحانی پیٹرن', analytics: 'طالب علم کا تجزیہ' },
      gu: { welcome: 'ExamOS પ્લેટફોર્મ પર આપનું સ્વાગત છે', app_title: 'ExamOS // અનુકૂલનશીલ શિક્ષણ પ્લેટફોર્મ', dashboard: 'ડેશબોર્ડ', users: 'વપરાશકર્તા સંચાલન', courses: 'શૈક્ષણિક અભ્યાસક્રમો', questions: 'પ્રશ્ન બેંક', exams: 'પરીક્ષા પેટર્ન', analytics: 'વિદ્યાર્થી પૃથ્થકરણ' },
      kn: { welcome: 'ExamOS ವೇದಿಕೆಗೆ ನಿಮಗೆ ಸುಸ್ವಾಗತ', app_title: 'ExamOS // ಅಡಾಪ್ಟಿವ್ ಕಲಿಕಾ ವೇದಿಕೆ', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', users: 'ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ', courses: 'ಶೈಕ್ಷಣಿಕ ಕೋರ್ಸ್‌ಗಳು', questions: 'ಪ್ರಶ್ನೆ ಬ್ಯಾಂಕ್', exams: 'ಪರೀಕ್ಷಾ ಮಾದರಿಗಳು', analytics: 'ವಿದ್ಯಾರ್ಥಿ ವಿಶ್ಲೇಷಣೆ' },
      ml: { welcome: 'ExamOS പ്ലാറ്റ്‌ഫോമിലേക്ക് സ്വാഗതം', app_title: 'ExamOS // അഡാപ്റ്റീവ് ലേണിംഗ് പ്ലാറ്റ്‌ഫോം', dashboard: 'ഡാഷ്‌ബോർഡ്', users: 'ഉപയോക്തൃ മാനേജ്മെന്റ്', courses: 'അക്കാദമിക് കോഴ്‌സുകൾ', questions: 'ചോദ്യ ബാങ്ക്', exams: 'പരീക്ഷാ പാറ്റേൺ', analytics: 'വിദ്യാർത്ഥി വിശകലനം' },
      or: { welcome: 'ExamOS ପ୍ଲାଟଫର୍ମକୁ ସ୍ୱାଗତ', app_title: 'ExamOS // ଆଡାପ୍ଟିଭ୍ ଶିକ୍ଷଣ ପ୍ଲାଟଫର୍ମ', dashboard: 'ଡ୍ୟାସବୋର୍ଡ', users: 'ବ୍ୟବହାରକାରୀ ପରିଚାଳନା', courses: 'ଶିକ୍ଷାଗତ ପାଠ୍ୟକ୍ରମ', questions: 'ପ୍ରଶ୍ନ ବ୍ୟାଙ୍କ', exams: 'ପରୀକ୍ଷା ପ୍ୟାଟର୍ନ', analytics: 'ଛାତ୍ର ବିଶ୍ଳେଷଣ' },
      pa: { welcome: 'ExamOS ਪਲੇਟਫਾਰਮ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ', app_title: 'ExamOS // ਅਨੁਕੂਲ ਸਿਖਲਾਈ ਪਲੇਟਫਾਰਮ', dashboard: 'ਡੈਸ਼ਬੋਰਡ', users: 'ਉਪਭੋਗਤਾ ਪ੍ਰਬੰਧਨ', courses: 'ਅਕਾਦਮਿਕ ਕੋਰਸ', questions: 'ਪ੍ਰਸ਼ਨ ਬੈਂਕ', exams: 'ਪ੍ਰੀਖਿਆ ਪੈਟਰਨ', analytics: 'ਵਿਦਿਆਰਥੀ ਵਿਸ਼ਲੇਸ਼ਣ' },
      as: { welcome: 'ExamOS মঞ্চলৈ স্বাগতম', app_title: 'ExamOS // অভিযোজনযোগ্য শিক্ষণ মঞ্চ', dashboard: 'ড্যাশবৰ্ড', users: 'ব্যৱহাৰকাৰী ব্যৱস্থাপনা', courses: 'শৈক্ষিক পাঠ্যক্ৰম', questions: 'প্ৰশ্ন বেংক', exams: 'পৰীক্ষাৰ আৰ্হি', analytics: 'ছাত্ৰ বিশ্লেষণ' },
      ma: { welcome: 'ExamOS मंच पर स्वागत अछि', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'प्रयोक्ता प्रबंधन', courses: 'शैक्षणिक पाठ्यक्रम', questions: 'प्रश्न बैंक', exams: 'परीक्षा संरचना', analytics: 'छात्र विश्लेषण' },
      sa: { welcome: 'ExamOS मञ्चे भवतः स्वागतम् अस्ति', app_title: 'ExamOS // अनुकूलनीय-शिक्षण-मञ्चः', dashboard: 'फलकम्', users: 'उपयोक्तृ-प्रबन्धनम्', courses: 'शैक्षणिक-पाठ्यक्रमः', questions: 'प्रश्न-कोषः', exams: 'परीक्षा-स्वरूपम्', analytics: 'छात्र-विश्लेषणम्' },
      ks: { welcome: 'ExamOS پلیٹ فارمس پؠٹھ بَلائے تہٕ خوش آمدید', app_title: 'ExamOS // تعلیمی پلیٹ فارم', dashboard: 'ڈیش بورڈ', users: 'صارفین ہُنٛد اِنتظام', courses: 'کورس', questions: 'سوال بنک', exams: 'امتحان پیٹرن', analytics: 'طالب علم تجزیہ' },
      ne: { welcome: 'ExamOS प्लेटफर्ममा स्वागत छ', app_title: 'ExamOS // अनुकूलन सिकाइ प्लेटफर्म', dashboard: 'ड्यासबोर्ड', users: 'प्रयोगकर्ता व्यवस्थापन', courses: 'शैक्षिक पाठ्यक्रम', questions: 'प्रश्न बैंक', exams: 'परीक्षा ढाँचा', analytics: 'विद्यार्थी विश्लेषण' },
      sd: { welcome: 'ExamOS پليٽ فارم ۾ ڀليڪار', app_title: 'ExamOS // لڙڪندڙ تعليمي پليٽ فارم', dashboard: 'ڊيش بورڊ', users: 'استعمال ڪندڙن جو انتظام', courses: 'تعليمي ڪورس', questions: 'سوالن جي بئنڪ', exams: 'امتحاني نمونو', analytics: 'شاگردن جو تجزيو' },
      br: { welcome: 'ExamOS प्लेटफर्मआव बरायबाय', app_title: 'ExamOS // सोलोंथाय प्लेटफर्म', dashboard: 'डैशबोर्ड', users: 'बाहायगिरि सामलायनाय', courses: 'फरायलाइ', questions: 'सोंथि ब्यांक', exams: 'आनजाद रोखोम', analytics: 'फरायसुला बिजिरनाय' },
      doi: { welcome: 'ExamOS प्लेटफार्म पर थुंदा स्वागत ऐ', app_title: 'ExamOS // शिक्षण प्लेटफार्म', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'शैक्षणिक कोर्स', questions: 'सवाल बैंक', exams: 'परीक्षा पैटर्न', analytics: 'विद्यार्थी विश्लेषण' },
      mni: { welcome: 'ExamOS פ্লাטফোর্মদা তরাম্না ওকচরি', app_title: 'ExamOS // তম্বা প্লাטফোর্ম', dashboard: 'ড্যাশবোর্ড', users: 'শিজিন্নরিবা মীয়াম', courses: 'পারা লাইরিক', questions: 'Wahang Bank', exams: 'Exams Pattern', analytics: 'Student Analytics' },
      sat: { welcome: 'ExamOS ᱯᱞᱮᱴᱯᱷᱚᱨᱢ ᱨᱮ ᱥᱟᱹᱜᱩᱱ ᱫᱟᱨᱟᱢ', app_title: 'ExamOS // ᱪᱮᱫᱚᱜ ᱯᱞᱮᱴᱯᱷᱚᱨᱢ', dashboard: 'ᱰᱮᱥᱵᱳᱨᱰ', users: 'ᱵᱮᱣᱦᱟᱨᱤᱭᱟᱹ ᱥᱟ cross', courses: 'ᱠᱳᱨᱥ', questions: 'ᱠᱩᱠᱞᱤ ᱵᱮᱸᱠ', exams: 'ᱵᱤᱱᱤᱰ ᱯᱮᱴᱟᱨᱱ', analytics: 'ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱵᱤᱪᱟᱹᱨ' },
      lus: { welcome: 'ExamOS Platform-ah te lo lawm a ni', app_title: 'ExamOS // Zirna Platform', dashboard: 'Dashboard', users: 'Hmannu Inenkawlna', courses: 'Zirna Courses', questions: 'Zawhna Bank', exams: 'Chhenna Pattern', analytics: 'Zirlai Analysis' }
    };

    function renderLanguageOptions() {
      const select = document.getElementById('lang-select');
      select.innerHTML = languagesList.map(l => 
        \`<option value="\${l.code}">\${l.nativeName} (\${l.name})</option>\`
      ).join('');
    }

    function setTheme(mode) {
      document.documentElement.setAttribute('data-theme', mode);
      ['dark', 'gray', 'light'].forEach(m => {
        const btn = document.getElementById('btn-' + m);
        btn.className = 'btn-theme ' + (m === mode ? 'btn-theme-active' : 'btn-theme-inactive');
      });
      document.getElementById('status-theme').innerText = mode.toUpperCase();
    }

    function setLanguage(lang) {
      // Fallback Strategy: check selected language dictionary, fallback to English if key missing
      const dict = translations[lang] || {};
      const fallback = translations['en'];

      const getStr = (key) => dict[key] || fallback[key] || key;

      document.getElementById('welcome-heading').innerText = getStr('welcome');
      document.getElementById('app-title').innerText = getStr('app_title');
      document.getElementById('lbl-dashboard').innerText = getStr('dashboard');
      document.getElementById('lbl-users').innerText = getStr('users');
      document.getElementById('lbl-courses').innerText = getStr('courses');
      document.getElementById('lbl-questions').innerText = getStr('questions');
      document.getElementById('lbl-exams').innerText = getStr('exams');
      document.getElementById('lbl-analytics').innerText = getStr('analytics');
      
      const langObj = languagesList.find(l => l.code === lang);
      const displayName = langObj ? \`\${langObj.nativeName} (\${lang})\` : lang;
      document.getElementById('status-lang').innerText = displayName;
    }

    function toggleAddLangModal() {
      const modal = document.getElementById('add-lang-modal');
      modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    }

    function registerCustomLanguage() {
      const code = document.getElementById('new-code').value.trim().toLowerCase();
      const name = document.getElementById('new-name').value.trim();
      const nativeName = document.getElementById('new-native').value.trim() || name;
      const transWelcome = document.getElementById('new-trans-welcome').value.trim();
      const transTitle = document.getElementById('new-trans-title').value.trim();

      if (!code || !name) {
        alert('Please fill in Language Code and Language Name!');
        return;
      }

      // 1. Add to languages list
      const existingIdx = languagesList.findIndex(l => l.code === code);
      if (existingIdx >= 0) {
        languagesList[existingIdx] = { code, name, nativeName };
      } else {
        languagesList.push({ code, name, nativeName });
      }

      // 2. Register dictionary translations (with English fallbacks)
      translations[code] = {
        welcome: transWelcome || \`Welcome to ExamOS (\${name})\`,
        app_title: transTitle || \`ExamOS // \${name} Edition\`,
        dashboard: translations['en'].dashboard,
        users: translations['en'].users,
        courses: translations['en'].courses,
        questions: translations['en'].questions,
        exams: translations['en'].exams,
        analytics: translations['en'].analytics,
      };

      // 3. Update UI dropdown and set active
      renderLanguageOptions();
      document.getElementById('lang-select').value = code;
      setLanguage(code);

      // Hide modal
      toggleAddLangModal();
      alert(\`Language '\${name}' (\${code}) successfully registered and set as active!\`);
    }

    // Initialize UI on load
    renderLanguageOptions();
    setLanguage('en');
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`ExamOS Web Application server running at http://localhost:${PORT}`);
});
