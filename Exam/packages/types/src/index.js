"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = void 0;
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
