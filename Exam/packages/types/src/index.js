"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = exports.BASELINE_LANGUAGES = void 0;
exports.BASELINE_LANGUAGES = [
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
exports.PERMISSIONS = {
    // Users
    USERS_CREATE: 'users.create',
    USERS_READ: 'users.read',
    USERS_UPDATE: 'users.update',
    USERS_DELETE: 'users.delete',
    // Roles & Permissions
    ROLES_MANAGE: 'roles.manage',
    // Audit Logs
    AUDIT_READ: 'audit.read',
    // System Preferences & i18n
    I18N_MANAGE: 'i18n.manage',
    PREFERENCES_UPDATE: 'preferences.update',
    // Courses & Syllabus
    COURSES_CREATE: 'courses.create',
    COURSES_READ: 'courses.read',
    COURSES_UPDATE: 'courses.update',
    COURSES_DELETE: 'courses.delete',
    // Question Bank
    QUESTIONS_CREATE: 'questions.create',
    QUESTIONS_READ: 'questions.read',
    QUESTIONS_UPDATE: 'questions.update',
    QUESTIONS_DELETE: 'questions.delete',
    // Exams
    EXAMS_CREATE: 'exams.create',
    EXAMS_READ: 'exams.read',
    EXAMS_PUBLISH: 'exams.publish',
    EXAMS_ATTEMPT: 'exams.attempt',
    // Results & Flags
    RESULTS_READ_OWN: 'results.read_own',
    RESULTS_FLAG: 'results.flag',
    // Phase 7: Published Archive
    ARCHIVE_READ: 'archive.read',
    ARCHIVE_ANSWER_KEY: 'archive.answer_key',
    ARCHIVE_CORRECT: 'archive.correct',
    ARCHIVE_EXPORT: 'archive.export',
    // Phase 8: Student Analytics & Mastery
    ANALYTICS_READ_OWN: 'analytics.read_own',
    ANALYTICS_READ: 'analytics.read',
    // Phase 9: Personalized Practice & Mastery Tracking
    PRACTICE_CREATE: 'practice.create',
    PRACTICE_READ: 'practice.read',
    PRACTICE_ATTEMPT: 'practice.attempt',
    PRACTICE_EVALUATE: 'practice.evaluate',
    // Phase 10: Preview & Impersonation System
    PREVIEW_USE: 'preview.use',
    PREVIEW_CONFIG: 'preview.config',
    IMPERSONATE_USE: 'impersonate.use',
    PREVIEW_AUDIT_READ: 'preview.audit_read',
    // Phase 11: AI Question System & Gateway
    AI_MODIFY: 'ai.modify',
    AI_GENERATE: 'ai.generate',
    AI_BATCH: 'ai.batch',
    AI_REVIEW: 'ai.review',
    AI_USAGE_READ: 'ai.usage_read',
    AI_ADMIN_CONFIG: 'ai.admin_config',
    // Phase 12: AI Interview System
    INTERVIEW_ATTEMPT: 'interview.attempt',
    INTERVIEW_READ_OWN: 'interview.read_own',
    INTERVIEW_MANAGE: 'interview.manage',
    INTERVIEW_EVALUATE: 'interview.evaluate',
    // Phase 13: Subscriptions, Entitlements & Billing
    SUBSCRIPTIONS_READ: 'subscriptions.read',
    SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
    ENTITLEMENTS_READ: 'entitlements.read',
    ENTITLEMENTS_MANAGE: 'entitlements.manage',
    BILLING_READ_OWN: 'billing.read_own',
    BILLING_MANAGE: 'billing.manage',
    // Phase 15: V2 Core & Maintenance
    SYSTEM_MAINTENANCE: 'system.maintenance',
};
