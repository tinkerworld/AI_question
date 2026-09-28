"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPreviewProfileSchema = exports.evaluatePracticeSubmissionSchema = exports.submitPracticeAnswerSchema = exports.generatePracticePaperSchema = exports.initiateExamCorrectionSchema = exports.assignExamReviewerSchema = exports.updateExamWorkflowStatusSchema = exports.flagAttemptSchema = exports.syncAttemptSchema = exports.syncAnswerItemSchema = exports.startAttemptSchema = exports.reorderExamQuestionsSchema = exports.swapExamQuestionSchema = exports.addExamQuestionsSchema = exports.createManualExamSectionSchema = exports.updateExamMetadataSchema = exports.createManualExamSchema = exports.generateExamSchema = exports.multiSubjectAllocationSchema = exports.setMarkingSchemeSchema = exports.setSectionDifficultySchema = exports.setSectionTopicsSchema = exports.setSectionRulesSchema = exports.reorderSectionsSchema = exports.updateExamPatternSectionSchema = exports.createExamPatternSectionSchema = exports.updateExamPatternSchema = exports.createExamPatternSchema = exports.tagSchema = exports.addExamUsageSchema = exports.questionStatusSchema = exports.updateQuestionSchema = exports.createQuestionSchema = exports.createEnrollmentSchema = exports.reorderSyllabusNodeSchema = exports.updateSyllabusNodeSchema = exports.createSyllabusNodeSchema = exports.updateSubjectSchema = exports.createSubjectSchema = exports.updateCourseSchema = exports.createCourseSchema = exports.auditQuerySchema = exports.updateRolePermissionsSchema = exports.createRoleSchema = exports.userStatusSchema = exports.updateUserSchema = exports.createUserSchema = exports.refreshTokenSchema = exports.loginSchema = exports.z = void 0;
exports.importExecuteRequestSchema = exports.importValidateRequestSchema = exports.courseExportItemSchema = exports.subjectExportItemSchema = exports.syllabusNodeExportItemSchema = exports.questionExportItemSchema = exports.importExportMetadataSchema = exports.conflictResolutionStrategySchema = exports.processRefundSchema = exports.checkoutSchema = exports.purchaseCreditPackageSchema = exports.entitlementCheckSchema = exports.updateEntitlementRuleSchema = exports.updateSubscriptionStatusSchema = exports.subscribeSchema = exports.updatePlanSchema = exports.createPlanSchema = exports.overrideScoreSchema = exports.simulateInterviewTurnSchema = exports.interviewQuestionDataSchema = exports.interviewBehavioralPromptSchema = exports.interviewKnowledgeDatasetSchema = exports.submitInterviewTurnSchema = exports.startInterviewSchema = exports.routeAIRequestSchema = exports.updateAIProviderSchema = exports.reviewDraftQuestionSchema = exports.generateQuestionsAISchema = exports.modifyQuestionAISchema = exports.startImpersonationSchema = exports.startPreviewSessionSchema = exports.updatePreviewProfileSchema = void 0;
const zod_1 = require("zod");
Object.defineProperty(exports, "z", { enumerable: true, get: function () { return zod_1.z; } });
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    roleIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
    roleIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.userStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']),
});
exports.createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Role name must be at least 2 characters'),
    description: zod_1.z.string().optional(),
    permissionIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one permission is required'),
});
exports.updateRolePermissionsSchema = zod_1.z.object({
    permissionIds: zod_1.z.array(zod_1.z.string()),
});
exports.auditQuerySchema = zod_1.z.object({
    userId: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
    resource: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
});
// Phase 2 Validation Schemas (Academic Structure)
exports.createCourseSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Course name is required'),
    code: zod_1.z.string().min(2, 'Course code is required'),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
    thumbnailUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    durationMonths: zod_1.z.number().min(1).default(12),
});
exports.updateCourseSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    thumbnailUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    durationMonths: zod_1.z.number().min(1).optional(),
});
exports.createSubjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Subject name is required'),
    code: zod_1.z.string().min(2, 'Subject code is required'),
    description: zod_1.z.string().optional(),
    credits: zod_1.z.number().min(1).default(1),
    order: zod_1.z.number().min(0).default(0),
});
exports.updateSubjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
    credits: zod_1.z.number().min(1).optional(),
    order: zod_1.z.number().min(0).optional(),
});
exports.createSyllabusNodeSchema = zod_1.z.object({
    parentId: zod_1.z.string().optional(),
    title: zod_1.z.string().min(2, 'Node title is required'),
    type: zod_1.z.enum(['UNIT', 'TOPIC', 'SUBTOPIC', 'CONCEPT']).default('UNIT'),
    orderIndex: zod_1.z.number().min(0).default(0),
    description: zod_1.z.string().optional(),
    learningObjectives: zod_1.z.array(zod_1.z.string()).optional(),
    estimatedMinutes: zod_1.z.number().min(1, 'Estimated minutes must be positive').default(60),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateSyllabusNodeSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).optional(),
    type: zod_1.z.enum(['UNIT', 'TOPIC', 'SUBTOPIC', 'CONCEPT']).optional(),
    description: zod_1.z.string().optional(),
    learningObjectives: zod_1.z.array(zod_1.z.string()).optional(),
    estimatedMinutes: zod_1.z.number().min(1).optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.reorderSyllabusNodeSchema = zod_1.z.object({
    parentId: zod_1.z.string().nullable().optional(),
    orderIndex: zod_1.z.number().min(0),
});
exports.createEnrollmentSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Valid user ID is required'),
    courseId: zod_1.z.string().uuid('Valid course ID is required'),
});
// Phase 3 Validation Schemas (Question Bank)
exports.createQuestionSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: zod_1.z.string().min(1, 'Question type is required'),
    content: zod_1.z.string().min(5, 'Question content must be at least 5 characters'),
    data: zod_1.z.record(zod_1.z.any()),
    difficulty: zod_1.z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
    marks: zod_1.z.number().min(0.5).default(1.0),
    status: zod_1.z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
    courseId: zod_1.z.string().optional(),
    subjectId: zod_1.z.string().optional(),
    syllabusNodeId: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateQuestionSchema = zod_1.z.object({
    content: zod_1.z.string().min(5).optional(),
    data: zod_1.z.record(zod_1.z.any()).optional(),
    difficulty: zod_1.z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    marks: zod_1.z.number().min(0.5).optional(),
    status: zod_1.z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
    courseId: zod_1.z.string().optional(),
    subjectId: zod_1.z.string().optional(),
    syllabusNodeId: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.questionStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']),
});
exports.addExamUsageSchema = zod_1.z.object({
    examName: zod_1.z.string().min(2, 'Exam name is required'),
    year: zod_1.z.number().min(1990).max(2100),
    shift: zod_1.z.string().optional(),
});
exports.tagSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Tag name is required'),
});
// Phase 4 Validation Schemas (Exam Pattern System)
exports.createExamPatternSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Exam pattern name is required'),
    courseId: zod_1.z.string().min(1, 'Course ID is required'),
    levelId: zod_1.z.string().optional(),
    durationMinutes: zod_1.z.number().min(1, 'Duration must be at least 1 minute').default(60),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['SINGLE', 'MULTI']).default('SINGLE'),
    subjectIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateExamPatternSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    courseId: zod_1.z.string().min(1).optional(),
    levelId: zod_1.z.string().optional(),
    durationMinutes: zod_1.z.number().min(1).optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    type: zod_1.z.enum(['SINGLE', 'MULTI']).optional(),
    subjectIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.createExamPatternSectionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Section name is required'),
    subjectId: zod_1.z.string().optional(),
    sequenceOrder: zod_1.z.number().min(0).default(0),
    numQuestions: zod_1.z.number().min(1, 'Number of questions must be at least 1'),
    marksPerQuestion: zod_1.z.number().min(0.1, 'Marks per question must be positive').default(1.0),
    marksCorrect: zod_1.z.number().optional(),
    marksWrong: zod_1.z.number().optional(),
    marksUnattempted: zod_1.z.number().optional(),
});
exports.updateExamPatternSectionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    subjectId: zod_1.z.string().optional(),
    sequenceOrder: zod_1.z.number().min(0).optional(),
    numQuestions: zod_1.z.number().min(1).optional(),
    marksPerQuestion: zod_1.z.number().min(0.1).optional(),
    marksCorrect: zod_1.z.number().optional(),
    marksWrong: zod_1.z.number().optional(),
    marksUnattempted: zod_1.z.number().optional(),
});
exports.reorderSectionsSchema = zod_1.z.object({
    sectionIds: zod_1.z.array(zod_1.z.string()).min(1, 'Section IDs array is required'),
});
exports.setSectionRulesSchema = zod_1.z.object({
    allowedQuestionTypes: zod_1.z.array(zod_1.z.string()).optional(),
    allowedCategories: zod_1.z.array(zod_1.z.string()).optional(),
    selectionMode: zod_1.z.enum(['RANDOM', 'BALANCED']).default('RANDOM'),
    sourceFilters: zod_1.z.record(zod_1.z.any()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.setSectionTopicsSchema = zod_1.z.object({
    distributionType: zod_1.z.enum(['COUNT', 'PERCENT']).default('COUNT'),
    topics: zod_1.z.array(zod_1.z.object({
        topicId: zod_1.z.string().min(1, 'Topic ID is required'),
        value: zod_1.z.number().min(0, 'Value must be non-negative'),
    })),
});
exports.setSectionDifficultySchema = zod_1.z.object({
    distributionType: zod_1.z.enum(['COUNT', 'PERCENT']).default('COUNT'),
    isAutomatic: zod_1.z.boolean().default(false),
    difficulties: zod_1.z.array(zod_1.z.object({
        difficultyLevel: zod_1.z.enum(['EASY', 'MEDIUM', 'HARD']),
        value: zod_1.z.number().min(0, 'Value must be non-negative'),
    })).optional(),
});
exports.setMarkingSchemeSchema = zod_1.z.object({
    marksCorrect: zod_1.z.number().min(0.1, 'Marks correct must be positive'),
    marksWrong: zod_1.z.number().max(0, 'Marks wrong must be 0 or negative'),
    marksUnattempted: zod_1.z.number().default(0),
});
exports.multiSubjectAllocationSchema = zod_1.z.object({
    subjectAllocations: zod_1.z.array(zod_1.z.object({
        subjectId: zod_1.z.string().min(1, 'Subject ID is required'),
        targetMarks: zod_1.z.number().min(0).optional(),
    })),
    sectionSubjectMappings: zod_1.z.array(zod_1.z.object({
        sectionId: zod_1.z.string().min(1, 'Section ID is required'),
        subjectId: zod_1.z.string().min(1, 'Subject ID is required'),
    })).optional(),
});
// Phase 5 Validation Schemas (Exam Generator & Inspection)
exports.generateExamSchema = zod_1.z.object({
    patternId: zod_1.z.string().min(1, 'Pattern ID is required'),
    name: zod_1.z.string().min(2).optional(),
    instructions: zod_1.z.string().optional(),
    startTime: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string()).optional(),
    endTime: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string()).optional(),
    avoidRecentDays: zod_1.z.number().min(0).optional(),
    excludeQuestionIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.createManualExamSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Exam name must be at least 2 characters'),
    courseId: zod_1.z.string().optional(),
    instructions: zod_1.z.string().optional(),
    durationMinutes: zod_1.z.number().min(1, 'Duration must be at least 1 minute').default(60),
    startTime: zod_1.z.string().optional(),
    endTime: zod_1.z.string().optional(),
});
exports.updateExamMetadataSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    instructions: zod_1.z.string().optional(),
    durationMinutes: zod_1.z.number().min(1).optional(),
    startTime: zod_1.z.string().nullable().optional(),
    endTime: zod_1.z.string().nullable().optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED']).optional(),
    targetCourseId: zod_1.z.string().optional(),
    targetSubjectId: zod_1.z.string().optional(),
}).refine((data) => {
    if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
}, {
    message: 'Scheduled end time must be strictly after start time',
    path: ['endTime'],
});
exports.createManualExamSectionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Section name is required'),
    subjectId: zod_1.z.string().optional(),
    sequenceOrder: zod_1.z.number().min(0).default(0),
    marksPerQuestion: zod_1.z.number().min(0.1).default(1.0),
    marksCorrect: zod_1.z.number().min(0.1).optional(),
    marksWrong: zod_1.z.number().max(0).optional(),
    marksUnattempted: zod_1.z.number().default(0).optional(),
});
exports.addExamQuestionsSchema = zod_1.z.object({
    sectionId: zod_1.z.string().min(1, 'Section ID is required'),
    questionIds: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'At least one question ID is required'),
});
exports.swapExamQuestionSchema = zod_1.z.object({
    newQuestionId: zod_1.z.string().min(1, 'New question ID is required'),
});
exports.reorderExamQuestionsSchema = zod_1.z.object({
    sectionId: zod_1.z.string().min(1, 'Section ID is required'),
    questionIds: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'Question IDs are required'),
});
// Phase 6 Validation Schemas (Exam System & Attempts Engine)
exports.startAttemptSchema = zod_1.z.object({
    examId: zod_1.z.string().min(1, 'Exam ID is required').optional(),
    exam_id: zod_1.z.string().min(1, 'Exam ID is required').optional(),
}).refine((data) => Boolean(data.examId || data.exam_id), {
    message: 'Exam ID is required (examId or exam_id)',
    path: ['examId'],
});
exports.syncAnswerItemSchema = zod_1.z.object({
    questionId: zod_1.z.string().min(1, 'Question ID is required'),
    studentAnswer: zod_1.z.any().optional(),
    isMarkedForReview: zod_1.z.boolean().optional(),
    timeSpentSeconds: zod_1.z.number().min(0).optional(),
});
exports.syncAttemptSchema = zod_1.z.object({
    questionId: zod_1.z.string().min(1).optional(),
    studentAnswer: zod_1.z.any().optional(),
    isMarkedForReview: zod_1.z.boolean().optional(),
    timeSpentSeconds: zod_1.z.number().min(0).optional(),
    answers: zod_1.z.array(exports.syncAnswerItemSchema).optional(),
}).refine((data) => Boolean(data.questionId || (data.answers && data.answers.length > 0)), {
    message: 'Either questionId and answer or answers array is required for sync',
    path: ['questionId'],
});
exports.flagAttemptSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, 'Reason for flagging result is required'),
});
// Phase 7 Validation Schemas (Published Exam Archive & Immutability Engine)
exports.updateExamWorkflowStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'PREVIEW', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']),
    notes: zod_1.z.string().optional(),
});
exports.assignExamReviewerSchema = zod_1.z.object({
    reviewerId: zod_1.z.string().min(1, 'Reviewer ID is required'),
});
exports.initiateExamCorrectionSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3, 'Reason for post-publish correction is required'),
    changes: zod_1.z.array(zod_1.z.object({
        questionId: zod_1.z.string().min(1, 'Question ID is required'),
        correctedAnswerKey: zod_1.z.record(zod_1.z.any()),
        explanation: zod_1.z.string().optional(),
    })).min(1, 'At least one question correction is required'),
});
// Phase 9 Validation Schemas (Personalized Practice & Adaptive Mastery)
exports.generatePracticePaperSchema = zod_1.z.object({
    targetNodeIds: zod_1.z.array(zod_1.z.string()).optional(),
    count: zod_1.z.number().min(1).max(50).optional().default(10),
    difficulty: zod_1.z.enum(['EASY', 'MEDIUM', 'HARD', 'ADAPTIVE']).optional().default('ADAPTIVE'),
    courseId: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
});
exports.submitPracticeAnswerSchema = zod_1.z.object({
    questionId: zod_1.z.string().min(1, 'Question ID is required'),
    selectedOption: zod_1.z.string().optional(),
    selectedOptions: zod_1.z.array(zod_1.z.string()).optional(),
    numericalAnswer: zod_1.z.string().optional(),
    timeSpentSeconds: zod_1.z.number().min(0).optional().default(0),
});
exports.evaluatePracticeSubmissionSchema = zod_1.z.object({
    answers: zod_1.z.array(exports.submitPracticeAnswerSchema).optional(),
});
// Phase 10 Validation Schemas (Preview & Impersonation System)
exports.createPreviewProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Profile name must be at least 2 characters'),
    billingPlan: zod_1.z.enum(['FREE', 'PREMIUM', 'PREMIUM_PLUS']).default('FREE'),
    contentVersion: zod_1.z.enum(['DRAFT', 'REVIEW', 'PUBLISHED']).default('PUBLISHED'),
    usageMode: zod_1.z.enum(['NORMAL', 'UNLIMITED_QA']).default('NORMAL'),
    courseAccess: zod_1.z.array(zod_1.z.string()).default([]),
    featureFlags: zod_1.z.record(zod_1.z.boolean()).default({}),
});
exports.updatePreviewProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    billingPlan: zod_1.z.enum(['FREE', 'PREMIUM', 'PREMIUM_PLUS']).optional(),
    contentVersion: zod_1.z.enum(['DRAFT', 'REVIEW', 'PUBLISHED']).optional(),
    usageMode: zod_1.z.enum(['NORMAL', 'UNLIMITED_QA']).optional(),
    courseAccess: zod_1.z.array(zod_1.z.string()).optional(),
    featureFlags: zod_1.z.record(zod_1.z.boolean()).optional(),
});
exports.startPreviewSessionSchema = zod_1.z.object({
    profileId: zod_1.z.string().optional(),
    billingPlan: zod_1.z.enum(['FREE', 'PREMIUM', 'PREMIUM_PLUS']).optional(),
    contentVersion: zod_1.z.enum(['DRAFT', 'REVIEW', 'PUBLISHED']).optional(),
    usageMode: zod_1.z.enum(['NORMAL', 'UNLIMITED_QA']).optional(),
    courseAccess: zod_1.z.array(zod_1.z.string()).optional(),
    featureFlags: zod_1.z.record(zod_1.z.boolean()).optional(),
    preset: zod_1.z.enum(['FREE', 'PREMIUM', 'PREMIUM_PLUS', 'DRAFT_REVIEWER']).optional(),
});
exports.startImpersonationSchema = zod_1.z.object({
    targetUserId: zod_1.z.string().min(1, 'Target user ID is required'),
    reason: zod_1.z.string().min(10, 'Reason for impersonation must be at least 10 characters for audit compliance'),
});
// Phase 11 Validation Schemas (AI Question System & Gateway)
exports.modifyQuestionAISchema = zod_1.z.object({
    questionId: zod_1.z.string().min(1, 'Question ID is required'),
    count: zod_1.z.number().min(1).max(5).default(1),
    varianceLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    instructions: zod_1.z.string().optional(),
});
exports.generateQuestionsAISchema = zod_1.z.object({
    subjectId: zod_1.z.string().min(1, 'Subject ID is required'),
    topicId: zod_1.z.string().optional(),
    conceptId: zod_1.z.string().optional(),
    difficulty: zod_1.z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
    type: zod_1.z.string().default('SINGLE_CHOICE'),
    marks: zod_1.z.number().min(0.5).max(100).default(4),
    count: zod_1.z.number().min(1).max(20).default(1),
    customPrompt: zod_1.z.string().optional(),
});
exports.reviewDraftQuestionSchema = zod_1.z.object({
    action: zod_1.z.enum(['APPROVE', 'REJECT']),
    rejectionReason: zod_1.z.string().optional(),
});
exports.updateAIProviderSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    modelId: zod_1.z.string().optional(),
    baseUrl: zod_1.z.string().optional(),
    apiKey: zod_1.z.string().optional(),
    priority: zod_1.z.number().optional(),
    isActive: zod_1.z.boolean().optional(),
    circuitBroken: zod_1.z.boolean().optional(),
});
exports.routeAIRequestSchema = zod_1.z.object({
    featureKey: zod_1.z.string().min(1, 'featureKey is required'),
    scope: zod_1.z.string().min(1, 'scope is required (e.g. question_authoring, interview)'),
    prompt: zod_1.z.string().optional(),
    messages: zod_1.z.array(zod_1.z.any()).optional(),
    variables: zod_1.z.record(zod_1.z.any()).optional(),
    preferredProviderId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    contextData: zod_1.z.record(zod_1.z.any()).optional(),
});
// Phase 12 Validation Schemas (AI Interview System)
exports.startInterviewSchema = zod_1.z.object({
    questionId: zod_1.z.string().min(1, 'Question ID is required'),
    mode: zod_1.z.enum(['PRACTICE', 'EXAM']).default('PRACTICE'),
    courseId: zod_1.z.string().optional(),
    voicePersona: zod_1.z.string().optional(),
    workspaceId: zod_1.z.string().optional(),
});
exports.submitInterviewTurnSchema = zod_1.z.object({
    message: zod_1.z.string().min(1, 'Response message is required'),
    audioUrl: zod_1.z.string().optional(),
    durationSeconds: zod_1.z.number().optional(),
    audioBase64: zod_1.z.string().optional(),
    audioFormat: zod_1.z.string().optional(),
});
exports.interviewKnowledgeDatasetSchema = zod_1.z.object({
    summary: zod_1.z.string().optional(),
    sourceDocuments: zod_1.z
        .array(zod_1.z.object({
        title: zod_1.z.string(),
        content: zod_1.z.string(),
    }))
        .optional(),
    groundTruthFacts: zod_1.z.array(zod_1.z.string()).optional(),
    facts: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.interviewBehavioralPromptSchema = zod_1.z.object({
    persona: zod_1.z.string().optional(),
    tone: zod_1.z.string().optional(),
    difficultyLevel: zod_1.z.string().optional(),
    focusAreas: zod_1.z.array(zod_1.z.string()).optional(),
    avoidList: zod_1.z.array(zod_1.z.string()).optional(),
    followUpAggressiveness: zod_1.z.string().optional(),
});
exports.interviewQuestionDataSchema = zod_1.z.object({
    scenario: zod_1.z.string().min(5, 'Interview opening scenario is required'),
    rubric: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string().min(1, 'Rubric criterion ID is required'),
        name: zod_1.z.string().min(1, 'Rubric criterion name is required'),
        description: zod_1.z.string().optional(),
        maxScore: zod_1.z.number().min(0.5, 'Max score must be positive'),
        weight: zod_1.z.number().optional(),
        criteria: zod_1.z.array(zod_1.z.string()).optional(),
        evidenceQuotes: zod_1.z.array(zod_1.z.any()).optional(),
        improvementTip: zod_1.z.string().optional(),
    }))
        .min(1, 'At least one rubric criterion is required'),
    preset: zod_1.z.string().optional(),
    maxTurns: zod_1.z.number().min(1).max(20).default(5),
    expectedDurationMinutes: zod_1.z.number().min(1).max(120).default(15),
    systemInstructions: zod_1.z.string().optional(),
    openingQuestion: zod_1.z.string().optional(),
    knowledgeDataset: exports.interviewKnowledgeDatasetSchema.optional(),
    behavioralPrompt: exports.interviewBehavioralPromptSchema.optional(),
});
exports.simulateInterviewTurnSchema = zod_1.z.object({
    scenario: zod_1.z.string().optional().default('Standard viva voce examination'),
    candidateMessage: zod_1.z.string().min(1, 'Candidate message is required'),
    knowledgeDataset: exports.interviewKnowledgeDatasetSchema.optional(),
    behavioralPrompt: exports.interviewBehavioralPromptSchema.optional(),
    previousTurns: zod_1.z
        .array(zod_1.z.object({
        speaker: zod_1.z.enum(['AI', 'CANDIDATE']),
        message: zod_1.z.string(),
    }))
        .optional(),
    conversationHistory: zod_1.z.array(zod_1.z.any()).optional(),
});
exports.overrideScoreSchema = zod_1.z.object({
    finalScore: zod_1.z.number().min(0, 'Final score must be non-negative'),
    rubricScores: zod_1.z.array(zod_1.z.any()).optional(),
    teacherNotes: zod_1.z.string().optional(),
});
// Phase 13 Validation Schemas (Subscriptions, Entitlements & Billing)
exports.createPlanSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Plan name is required'),
    code: zod_1.z.string().min(1, 'Plan code is required'),
    price: zod_1.z.number().min(0, 'Price must be non-negative'),
    billingCycle: zod_1.z.enum(['monthly', 'annual']).default('monthly'),
    description: zod_1.z.string().optional(),
    features: zod_1.z.array(zod_1.z.string()).default([]),
    isActive: zod_1.z.boolean().default(true),
});
exports.updatePlanSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    price: zod_1.z.number().min(0).optional(),
    billingCycle: zod_1.z.enum(['monthly', 'annual']).optional(),
    description: zod_1.z.string().optional(),
    features: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.subscribeSchema = zod_1.z.object({
    planCode: zod_1.z.string().min(1, 'Plan code is required'),
    billingCycle: zod_1.z.enum(['monthly', 'annual']).default('monthly'),
});
exports.updateSubscriptionStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']),
    endDate: zod_1.z.string().optional(),
});
exports.updateEntitlementRuleSchema = zod_1.z.object({
    entitlementValue: zod_1.z.string().min(1, 'Entitlement value is required'),
});
exports.entitlementCheckSchema = zod_1.z.object({
    key: zod_1.z.string().min(1, 'Entitlement key is required'),
    currentUsage: zod_1.z.number().optional().default(0),
});
exports.purchaseCreditPackageSchema = zod_1.z.object({
    packageId: zod_1.z.string().min(1, 'Package ID is required'),
});
exports.checkoutSchema = zod_1.z.object({
    itemType: zod_1.z.enum(['SUBSCRIPTION', 'CREDIT_PACKAGE']),
    itemId: zod_1.z.string().min(1, 'Item ID is required'),
    billingCycle: zod_1.z.enum(['monthly', 'annual']).default('monthly'),
});
exports.processRefundSchema = zod_1.z.object({
    gatewayPaymentId: zod_1.z.string().optional(),
    subscriptionId: zod_1.z.string().optional(),
    amount: zod_1.z.number().min(0.01, 'Refund amount must be greater than zero'),
    reason: zod_1.z.string().min(3, 'Valid reason for refund is required'),
    clawbackCredits: zod_1.z.boolean().default(true),
});
// ==========================================
// Feature 15.16: Schema-Validated JSON Import & Export Schemas
// ==========================================
exports.conflictResolutionStrategySchema = zod_1.z.enum(['SKIP_EXISTING', 'OVERWRITE', 'CREATE_COPY']);
exports.importExportMetadataSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('2.0'),
    exportedAt: zod_1.z.string(),
    exportedBy: zod_1.z.string().optional(),
    institution: zod_1.z.string().optional(),
    entityType: zod_1.z.enum(['QUESTIONS', 'COURSES']),
    itemCount: zod_1.z.number().int().nonnegative(),
});
exports.questionExportItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: zod_1.z.string().min(1, 'Question type is required'),
    content: zod_1.z.string().min(3, 'Question content must be at least 3 characters'),
    data: zod_1.z.record(zod_1.z.any()),
    difficulty: zod_1.z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
    marks: zod_1.z.number().positive('Marks must be greater than 0').default(1.0),
    status: zod_1.z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
    courseCode: zod_1.z.string().optional(),
    subjectCode: zod_1.z.string().optional(),
    syllabusNodeTitle: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    examUsages: zod_1.z.array(zod_1.z.object({
        examName: zod_1.z.string().min(1, 'Exam name is required'),
        year: zod_1.z.number().int().min(1950).max(2100),
        shift: zod_1.z.string().optional(),
    })).optional(),
});
exports.syllabusNodeExportItemSchema = zod_1.z.lazy(() => zod_1.z.object({
    id: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1, 'Node title is required'),
    type: zod_1.z.enum(['UNIT', 'TOPIC', 'SUBTOPIC', 'CONCEPT']).default('UNIT'),
    orderIndex: zod_1.z.number().int().default(0),
    description: zod_1.z.string().optional(),
    estimatedMinutes: zod_1.z.number().int().positive().optional(),
    learningObjectives: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    parentTitle: zod_1.z.string().optional(),
    children: zod_1.z.array(exports.syllabusNodeExportItemSchema).optional(),
}));
exports.subjectExportItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    code: zod_1.z.string().min(1, 'Subject code is required'),
    name: zod_1.z.string().min(1, 'Subject name is required'),
    description: zod_1.z.string().optional(),
    credits: zod_1.z.number().int().positive().optional(),
    order: zod_1.z.number().int().default(0),
    syllabusNodes: zod_1.z.array(exports.syllabusNodeExportItemSchema).optional(),
});
exports.courseExportItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    code: zod_1.z.string().min(1, 'Course code is required'),
    name: zod_1.z.string().min(1, 'Course name is required'),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
    durationMonths: zod_1.z.number().int().positive().optional(),
    thumbnailUrl: zod_1.z.string().optional(),
    subjects: zod_1.z.array(exports.subjectExportItemSchema).optional(),
});
exports.importValidateRequestSchema = zod_1.z.object({
    entityType: zod_1.z.enum(['QUESTIONS', 'COURSES']),
    items: zod_1.z.array(zod_1.z.any()).min(1, 'At least one item is required in the import payload'),
    metadata: exports.importExportMetadataSchema.optional(),
});
exports.importExecuteRequestSchema = zod_1.z.object({
    entityType: zod_1.z.enum(['QUESTIONS', 'COURSES']),
    items: zod_1.z.array(zod_1.z.any()).min(1, 'At least one item is required in the import payload'),
    conflictStrategy: exports.conflictResolutionStrategySchema.default('SKIP_EXISTING'),
});
