// Runner: node tests/feature-i18n-frontend.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runI18nFrontendTests() {
  console.log('====================================================');
  console.log(' EXAMOS I18N FRONTEND & INTERACTION TEST SUITE');
  console.log(' Language Panel, Verification UI, Export/Import & Pages');
  console.log('====================================================\n');

  const panelPath = path.resolve(__dirname, '../apps/web/src/components/i18n/LanguageManagementPanel.tsx');
  const loginPath = path.resolve(__dirname, '../apps/web/src/pages/LoginPage.tsx');
  const settingsPath = path.resolve(__dirname, '../apps/web/src/pages/SettingsPage.tsx');
  const qbPath = path.resolve(__dirname, '../apps/web/src/pages/QuestionBankPage.tsx');
  const coursesPath = path.resolve(__dirname, '../apps/web/src/pages/CoursesPage.tsx');
  const usersPath = path.resolve(__dirname, '../apps/web/src/pages/UsersPage.tsx');

  assert.ok(fs.existsSync(panelPath), 'LanguageManagementPanel.tsx must exist');
  assert.ok(fs.existsSync(loginPath), 'LoginPage.tsx must exist');
  assert.ok(fs.existsSync(settingsPath), 'SettingsPage.tsx must exist');
  assert.ok(fs.existsSync(qbPath), 'QuestionBankPage.tsx must exist');
  assert.ok(fs.existsSync(coursesPath), 'CoursesPage.tsx must exist');
  assert.ok(fs.existsSync(usersPath), 'UsersPage.tsx must exist');

  const panelCode = fs.readFileSync(panelPath, 'utf8');
  const loginCode = fs.readFileSync(loginPath, 'utf8');
  const settingsCode = fs.readFileSync(settingsPath, 'utf8');
  const qbCode = fs.readFileSync(qbPath, 'utf8');
  const coursesCode = fs.readFileSync(coursesPath, 'utf8');
  const usersCode = fs.readFileSync(usersPath, 'utf8');

  // --------------------------------------------------------------------------
  // 1. Language Management Panel: Verification Badges & Metrics
  // --------------------------------------------------------------------------
  console.log('1. Testing LanguageManagementPanel metrics & verification badges...');
  assert.ok(panelCode.includes('unverifiedCount'), 'LanguageManagementPanel must track unverifiedCount');
  assert.ok(panelCode.includes('unverified') || panelCode.includes('Verified'), 'Must display unverified status badges');
  assert.ok(panelCode.includes('verifiedMap'), 'Must track verifiedMap for individual keys');
  console.log('   ✓ Verification badges and unverified counters correctly declared');

  // --------------------------------------------------------------------------
  // 2. Language Management Panel: Export & Backup Buttons
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Export & Backup Tooling in LanguageManagementPanel...');
  assert.ok(panelCode.includes('handleExportSingle') || panelCode.includes('/export/'), 'Must have single language export handler');
  assert.ok(panelCode.includes('handleExportAll') || panelCode.includes('/export/all'), 'Must have export all languages handler');
  assert.ok(panelCode.includes('Export JSON'), 'Must have Export JSON action button');
  assert.ok(panelCode.includes('Export CSV'), 'Must have Export CSV action button');
  assert.ok(panelCode.includes('Backup All'), 'Must have Backup All action button');
  assert.ok(panelCode.includes('btn-import-all') && panelCode.includes('Import All'), 'Must have Import All action button');
  assert.ok(panelCode.includes('handleTriggerImportAll'), 'Must have handleTriggerImportAll handler');
  assert.ok(panelCode.includes('handleBulkFilesSelected'), 'Must have handleBulkFilesSelected handler');
  assert.ok(panelCode.includes('extractLanguageCodeFromFilename'), 'Must have extractLanguageCodeFromFilename helper');
  console.log('   ✓ Export JSON, Export CSV, Backup All, and Import All buttons wired');

  // --------------------------------------------------------------------------
  // 3. Language Management Panel: Import Modal & Bulk Import Modal
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Import Modals, File Pickers & Summary Reporting...');
  assert.ok(panelCode.includes('showImportModal'), 'Must declare showImportModal state');
  assert.ok(panelCode.includes('handleImportSubmit'), 'Must have handleImportSubmit handler');
  assert.ok(panelCode.includes('importSummary') || panelCode.includes('updatedCount'), 'Must track import summary metrics');
  assert.ok(panelCode.includes('.json') && panelCode.includes('.csv'), 'File picker must accept both .json and .csv');
  assert.ok(panelCode.includes('/i18n/import'), 'Must call /api/v1/i18n/import endpoint');

  // Bulk Import Modal assertions
  assert.ok(panelCode.includes('showBulkImportModal'), 'Must declare showBulkImportModal state');
  assert.ok(panelCode.includes('bulkProgress'), 'Must track bulkProgress list');
  assert.ok(panelCode.includes('bulkSummary'), 'Must track bulkSummary metrics');
  assert.ok(panelCode.includes('bulk-import-modal'), 'Must render bulk-import-modal');
  assert.ok(panelCode.includes('bulk-import-summary'), 'Must render bulk-import-summary');
  assert.ok(panelCode.includes('multiple'), 'Bulk file picker must have multiple enabled');
  console.log('   ✓ Import modal and Bulk Import All modal with progress & summary correctly wired');

  // --------------------------------------------------------------------------
  // 4. Component Translation Wiring: LoginPage
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Translation Wiring on LoginPage...');
  assert.ok(loginCode.includes("t('login_heading')"), "LoginPage must use t('login_heading')");
  assert.ok(loginCode.includes("t('login_subheading')"), "LoginPage must use t('login_subheading')");
  assert.ok(loginCode.includes("t('login_email_label')"), "LoginPage must use t('login_email_label')");
  assert.ok(loginCode.includes("t('login_password_label')"), "LoginPage must use t('login_password_label')");
  assert.ok(loginCode.includes("t('login_btn_submit')"), "LoginPage must use t('login_btn_submit')");
  console.log('   ✓ LoginPage fully wired with translation keys');

  // --------------------------------------------------------------------------
  // 5. Component Translation Wiring: SettingsPage
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Translation Wiring on SettingsPage...');
  assert.ok(settingsCode.includes("t('settings_header_title')"), "SettingsPage must use t('settings_header_title')");
  assert.ok(settingsCode.includes("t('settings_header_desc')"), "SettingsPage must use t('settings_header_desc')");
  assert.ok(settingsCode.includes("t('settings_tab_languages')"), "SettingsPage must use t('settings_tab_languages')");
  console.log('   ✓ SettingsPage header and subtabs wired with translation keys');

  // --------------------------------------------------------------------------
  // 6. Component Translation Wiring: QuestionBankPage
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Translation Wiring on QuestionBankPage...');
  assert.ok(qbCode.includes("t('qb_title')"), "QuestionBankPage must use t('qb_title')");
  assert.ok(qbCode.includes("t('qb_desc')"), "QuestionBankPage must use t('qb_desc')");
  assert.ok(qbCode.includes("t('qb_search_placeholder')"), "QuestionBankPage must use t('qb_search_placeholder')");
  assert.ok(qbCode.includes("t('qb_filter_difficulty')"), "QuestionBankPage must use t('qb_filter_difficulty')");
  assert.ok(qbCode.includes("t('qb_no_questions')"), "QuestionBankPage must use t('qb_no_questions')");
  console.log('   ✓ QuestionBankPage wired with translation keys');

  // --------------------------------------------------------------------------
  // 7. Component Translation Wiring: CoursesPage
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Translation Wiring on CoursesPage...');
  assert.ok(coursesCode.includes("t('courses_title')"), "CoursesPage must use t('courses_title')");
  assert.ok(coursesCode.includes("t('courses_desc')"), "CoursesPage must use t('courses_desc')");
  assert.ok(coursesCode.includes("t('courses_add_course')"), "CoursesPage must use t('courses_add_course')");
  assert.ok(coursesCode.includes("t('courses_no_courses')"), "CoursesPage must use t('courses_no_courses')");
  console.log('   ✓ CoursesPage wired with translation keys');

  // --------------------------------------------------------------------------
  // 8. Component Translation Wiring: UsersPage
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Translation Wiring on UsersPage...');
  assert.ok(usersCode.includes("t('users_title')"), "UsersPage must use t('users_title')");
  assert.ok(usersCode.includes("t('users_desc')"), "UsersPage must use t('users_desc')");
  assert.ok(usersCode.includes("t('users_add_user')"), "UsersPage must use t('users_add_user')");
  assert.ok(usersCode.includes("t('users_search_placeholder')"), "UsersPage must use t('users_search_placeholder')");
  assert.ok(usersCode.includes("t('users_role_filter')"), "UsersPage must use t('users_role_filter')");
  assert.ok(usersCode.includes("t('users_no_users')"), "UsersPage must use t('users_no_users')");
  console.log('   ✓ UsersPage wired with translation keys');

  // --------------------------------------------------------------------------
  // 9. Language Lifecycle UI: Enable/Disable Toggle & Delete
  // --------------------------------------------------------------------------
  console.log('\n9. Testing Language Lifecycle UI (Enable/Disable & Delete)...');
  const selectorPath = path.resolve(__dirname, '../apps/web/src/components/LanguageSelector.tsx');
  const contextPath = path.resolve(__dirname, '../apps/web/src/context/I18nContext.tsx');
  assert.ok(fs.existsSync(selectorPath), 'LanguageSelector.tsx must exist');
  assert.ok(fs.existsSync(contextPath), 'I18nContext.tsx must exist');

  const selectorCode = fs.readFileSync(selectorPath, 'utf8');
  const contextCode = fs.readFileSync(contextPath, 'utf8');

  // Panel state and handlers
  assert.ok(panelCode.includes('handleToggleActive'), 'LanguageManagementPanel must define handleToggleActive');
  assert.ok(panelCode.includes('handleConfirmDeleteLanguage'), 'LanguageManagementPanel must define handleConfirmDeleteLanguage');
  assert.ok(panelCode.includes('languageToDelete'), 'LanguageManagementPanel must track languageToDelete');
  assert.ok(panelCode.includes('btn-toggle-active-'), 'LanguageManagementPanel must render btn-toggle-active buttons');
  assert.ok(panelCode.includes('btn-delete-'), 'LanguageManagementPanel must render btn-delete buttons');
  assert.ok(panelCode.includes('badge-inactive-'), 'LanguageManagementPanel must render badge-inactive badges');
  assert.ok(panelCode.includes('INACTIVE'), 'LanguageManagementPanel must render INACTIVE badge text');
  assert.ok(panelCode.includes('delete-language-modal'), 'LanguageManagementPanel must render delete-language-modal');
  assert.ok(panelCode.includes('btn-confirm-delete-language'), 'LanguageManagementPanel must have confirm delete button');
  assert.ok(panelCode.includes('btn-cancel-delete-language'), 'LanguageManagementPanel must have cancel delete button');
  assert.ok(panelCode.includes('!isDefaultOrEn'), 'LanguageManagementPanel must hide lifecycle buttons for default/en language');

  // Student-facing filtering
  assert.ok(contextCode.includes('activeOnly=true'), 'I18nContext fetchLanguages must query with activeOnly=true');
  assert.ok(selectorCode.includes('lang.isActive !== false'), 'LanguageSelector must filter out inactive languages');
  console.log('   ✓ Language lifecycle buttons, guards, badges, modal, and student-facing activeOnly filters verified');

  console.log('\n====================================================');
  console.log('✅ ALL I18N FRONTEND & INTERACTION TESTS PASSED!');
  console.log('====================================================\n');
}

runI18nFrontendTests().catch((err) => {
  console.error('[FAIL] I18n Frontend Test Failed:', err);
  process.exit(1);
});
