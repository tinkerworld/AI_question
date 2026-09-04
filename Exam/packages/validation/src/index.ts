import { z } from 'zod';
export { z };

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
  roleIds: z.array(z.string()).optional(),
});

export const userStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']),
});

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).min(1, 'At least one permission is required'),
});

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
});

export const auditQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Phase 2 Validation Schemas (Academic Structure)
export const createCourseSchema = z.object({
  name: z.string().min(2, 'Course name is required'),
  code: z.string().min(2, 'Course code is required'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  durationMonths: z.number().min(1).default(12),
});

export const updateCourseSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  durationMonths: z.number().min(1).optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(2, 'Subject name is required'),
  code: z.string().min(2, 'Subject code is required'),
  description: z.string().optional(),
  credits: z.number().min(1).default(1),
  order: z.number().min(0).default(0),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  credits: z.number().min(1).optional(),
  order: z.number().min(0).optional(),
});

export const createSyllabusNodeSchema = z.object({
  parentId: z.string().optional(),
  title: z.string().min(2, 'Node title is required'),
  type: z.enum(['UNIT', 'TOPIC', 'SUBTOPIC', 'CONCEPT']).default('UNIT'),
  orderIndex: z.number().min(0).default(0),
  description: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  estimatedMinutes: z.number().min(1, 'Estimated minutes must be positive').default(60),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
  tags: z.array(z.string()).optional(),
});

export const updateSyllabusNodeSchema = z.object({
  title: z.string().min(2).optional(),
  type: z.enum(['UNIT', 'TOPIC', 'SUBTOPIC', 'CONCEPT']).optional(),
  description: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  estimatedMinutes: z.number().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  tags: z.array(z.string()).optional(),
});

export const reorderSyllabusNodeSchema = z.object({
  parentId: z.string().nullable().optional(),
  orderIndex: z.number().min(0),
});

export const createEnrollmentSchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
  courseId: z.string().uuid('Valid course ID is required'),
});

// Phase 3 Validation Schemas (Question Bank)
export const createQuestionSchema = z.object({
  type: z.string().min(1, 'Question type is required'),
  content: z.string().min(5, 'Question content must be at least 5 characters'),
  data: z.record(z.any()),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  marks: z.number().min(0.5).default(1.0),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  courseId: z.string().optional(),
  subjectId: z.string().optional(),
  syllabusNodeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateQuestionSchema = z.object({
  content: z.string().min(5).optional(),
  data: z.record(z.any()).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  marks: z.number().min(0.5).optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  courseId: z.string().optional(),
  subjectId: z.string().optional(),
  syllabusNodeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const questionStatusSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']),
});

export const addExamUsageSchema = z.object({
  examName: z.string().min(2, 'Exam name is required'),
  year: z.number().min(1990).max(2100),
  shift: z.string().optional(),
});

export const tagSchema = z.object({
  name: z.string().min(2, 'Tag name is required'),
});

// Phase 4 Validation Schemas (Exam Pattern System)
export const createExamPatternSchema = z.object({
  name: z.string().min(2, 'Exam pattern name is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  levelId: z.string().optional(),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute').default(60),
  description: z.string().optional(),
  type: z.enum(['SINGLE', 'MULTI']).default('SINGLE'),
  subjectIds: z.array(z.string()).optional(),
});

export const updateExamPatternSchema = z.object({
  name: z.string().min(2).optional(),
  courseId: z.string().min(1).optional(),
  levelId: z.string().optional(),
  durationMinutes: z.number().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  type: z.enum(['SINGLE', 'MULTI']).optional(),
  subjectIds: z.array(z.string()).optional(),
});

export const createExamPatternSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  subjectId: z.string().optional(),
  sequenceOrder: z.number().min(0).default(0),
  numQuestions: z.number().min(1, 'Number of questions must be at least 1'),
  marksPerQuestion: z.number().min(0.1, 'Marks per question must be positive').default(1.0),
  marksCorrect: z.number().optional(),
  marksWrong: z.number().optional(),
  marksUnattempted: z.number().optional(),
});

export const updateExamPatternSectionSchema = z.object({
  name: z.string().min(1).optional(),
  subjectId: z.string().optional(),
  sequenceOrder: z.number().min(0).optional(),
  numQuestions: z.number().min(1).optional(),
  marksPerQuestion: z.number().min(0.1).optional(),
  marksCorrect: z.number().optional(),
  marksWrong: z.number().optional(),
  marksUnattempted: z.number().optional(),
});

export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.string()).min(1, 'Section IDs array is required'),
});

export const setSectionRulesSchema = z.object({
  allowedQuestionTypes: z.array(z.string()).optional(),
  allowedCategories: z.array(z.string()).optional(),
  selectionMode: z.enum(['RANDOM', 'BALANCED']).default('RANDOM'),
  sourceFilters: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

export const setSectionTopicsSchema = z.object({
  distributionType: z.enum(['COUNT', 'PERCENT']).default('COUNT'),
  topics: z.array(
    z.object({
      topicId: z.string().min(1, 'Topic ID is required'),
      value: z.number().min(0, 'Value must be non-negative'),
    })
  ),
});

export const setSectionDifficultySchema = z.object({
  distributionType: z.enum(['COUNT', 'PERCENT']).default('COUNT'),
  isAutomatic: z.boolean().default(false),
  difficulties: z.array(
    z.object({
      difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']),
      value: z.number().min(0, 'Value must be non-negative'),
    })
  ).optional(),
});

export const setMarkingSchemeSchema = z.object({
  marksCorrect: z.number().min(0.1, 'Marks correct must be positive'),
  marksWrong: z.number().max(0, 'Marks wrong must be 0 or negative'),
  marksUnattempted: z.number().default(0),
});

export const multiSubjectAllocationSchema = z.object({
  subjectAllocations: z.array(
    z.object({
      subjectId: z.string().min(1, 'Subject ID is required'),
      targetMarks: z.number().min(0).optional(),
    })
  ),
  sectionSubjectMappings: z.array(
    z.object({
      sectionId: z.string().min(1, 'Section ID is required'),
      subjectId: z.string().min(1, 'Subject ID is required'),
    })
  ).optional(),
});

// Phase 5 Validation Schemas (Exam Generator & Inspection)
export const generateExamSchema = z.object({
  patternId: z.string().min(1, 'Pattern ID is required'),
  name: z.string().min(2).optional(),
  instructions: z.string().optional(),
  startTime: z.string().datetime({ offset: true }).or(z.string()).optional(),
  endTime: z.string().datetime({ offset: true }).or(z.string()).optional(),
  avoidRecentDays: z.number().min(0).optional(),
  excludeQuestionIds: z.array(z.string()).optional(),
});

export const createManualExamSchema = z.object({
  name: z.string().min(2, 'Exam name must be at least 2 characters'),
  courseId: z.string().optional(),
  instructions: z.string().optional(),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute').default(60),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export const updateExamMetadataSchema = z.object({
  name: z.string().min(2).optional(),
  instructions: z.string().optional(),
  durationMinutes: z.number().min(1).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED']).optional(),
  targetCourseId: z.string().optional(),
  targetSubjectId: z.string().optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  },
  {
    message: 'Scheduled end time must be strictly after start time',
    path: ['endTime'],
  }
);

export const createManualExamSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  subjectId: z.string().optional(),
  sequenceOrder: z.number().min(0).default(0),
  marksPerQuestion: z.number().min(0.1).default(1.0),
  marksCorrect: z.number().min(0.1).optional(),
  marksWrong: z.number().max(0).optional(),
  marksUnattempted: z.number().default(0).optional(),
});

export const addExamQuestionsSchema = z.object({
  sectionId: z.string().min(1, 'Section ID is required'),
  questionIds: z.array(z.string().min(1)).min(1, 'At least one question ID is required'),
});

export const swapExamQuestionSchema = z.object({
  newQuestionId: z.string().min(1, 'New question ID is required'),
});

export const reorderExamQuestionsSchema = z.object({
  sectionId: z.string().min(1, 'Section ID is required'),
  questionIds: z.array(z.string().min(1)).min(1, 'Question IDs are required'),
});

// Phase 6 Validation Schemas (Exam System & Attempts Engine)
export const startAttemptSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required').optional(),
  exam_id: z.string().min(1, 'Exam ID is required').optional(),
}).refine((data) => Boolean(data.examId || data.exam_id), {
  message: 'Exam ID is required (examId or exam_id)',
  path: ['examId'],
});

export const syncAnswerItemSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  studentAnswer: z.any().optional(),
  isMarkedForReview: z.boolean().optional(),
  timeSpentSeconds: z.number().min(0).optional(),
});

export const syncAttemptSchema = z.object({
  questionId: z.string().min(1).optional(),
  studentAnswer: z.any().optional(),
  isMarkedForReview: z.boolean().optional(),
  timeSpentSeconds: z.number().min(0).optional(),
  answers: z.array(syncAnswerItemSchema).optional(),
}).refine((data) => Boolean(data.questionId || (data.answers && data.answers.length > 0)), {
  message: 'Either questionId and answer or answers array is required for sync',
  path: ['questionId'],
});

export const flagAttemptSchema = z.object({
  reason: z.string().min(1, 'Reason for flagging result is required'),
});

// Phase 7 Validation Schemas (Published Exam Archive & Immutability Engine)
export const updateExamWorkflowStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PREVIEW', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']),
  notes: z.string().optional(),
});

export const assignExamReviewerSchema = z.object({
  reviewerId: z.string().min(1, 'Reviewer ID is required'),
});

export const initiateExamCorrectionSchema = z.object({
  reason: z.string().min(3, 'Reason for post-publish correction is required'),
  changes: z.array(
    z.object({
      questionId: z.string().min(1, 'Question ID is required'),
      correctedAnswerKey: z.record(z.any()),
      explanation: z.string().optional(),
    })
  ).min(1, 'At least one question correction is required'),
});

// Phase 9 Validation Schemas (Personalized Practice & Adaptive Mastery)
export const generatePracticePaperSchema = z.object({
  targetNodeIds: z.array(z.string()).optional(),
  count: z.number().min(1).max(50).optional().default(10),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'ADAPTIVE']).optional().default('ADAPTIVE'),
  courseId: z.string().optional(),
  title: z.string().optional(),
});

export const submitPracticeAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  selectedOption: z.string().optional(),
  selectedOptions: z.array(z.string()).optional(),
  numericalAnswer: z.string().optional(),
  timeSpentSeconds: z.number().min(0).optional().default(0),
});

export const evaluatePracticeSubmissionSchema = z.object({
  answers: z.array(submitPracticeAnswerSchema).optional(),
});

// Phase 10 Validation Schemas (Preview & Impersonation System)
export const createPreviewProfileSchema = z.object({
  name: z.string().min(2, 'Profile name must be at least 2 characters'),
  billingPlan: z.enum(['FREE', 'PREMIUM', 'PREMIUM_PLUS']).default('FREE'),
  contentVersion: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED']).default('PUBLISHED'),
  usageMode: z.enum(['NORMAL', 'UNLIMITED_QA']).default('NORMAL'),
  courseAccess: z.array(z.string()).default([]),
  featureFlags: z.record(z.boolean()).default({}),
});

export const updatePreviewProfileSchema = z.object({
  name: z.string().min(2).optional(),
  billingPlan: z.enum(['FREE', 'PREMIUM', 'PREMIUM_PLUS']).optional(),
  contentVersion: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED']).optional(),
  usageMode: z.enum(['NORMAL', 'UNLIMITED_QA']).optional(),
  courseAccess: z.array(z.string()).optional(),
  featureFlags: z.record(z.boolean()).optional(),
});

export const startPreviewSessionSchema = z.object({
  profileId: z.string().optional(),
  billingPlan: z.enum(['FREE', 'PREMIUM', 'PREMIUM_PLUS']).optional(),
  contentVersion: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED']).optional(),
  usageMode: z.enum(['NORMAL', 'UNLIMITED_QA']).optional(),
  courseAccess: z.array(z.string()).optional(),
  featureFlags: z.record(z.boolean()).optional(),
  preset: z.enum(['FREE', 'PREMIUM', 'PREMIUM_PLUS', 'DRAFT_REVIEWER']).optional(),
});

export const startImpersonationSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  reason: z.string().min(10, 'Reason for impersonation must be at least 10 characters for audit compliance'),
});

// Phase 11 Validation Schemas (AI Question System & Gateway)
export const modifyQuestionAISchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  count: z.number().min(1).max(5).default(1),
  varianceLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  instructions: z.string().optional(),
});

export const generateQuestionsAISchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  topicId: z.string().optional(),
  conceptId: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  type: z.string().default('SINGLE_CHOICE'),
  marks: z.number().min(0.5).max(100).default(4),
  count: z.number().min(1).max(20).default(1),
  customPrompt: z.string().optional(),
});

export const reviewDraftQuestionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export const updateAIProviderSchema = z.object({
  name: z.string().optional(),
  modelId: z.string().optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  priority: z.number().optional(),
  isActive: z.boolean().optional(),
  circuitBroken: z.boolean().optional(),
});

export const routeAIRequestSchema = z.object({
  featureKey: z.string().min(1, 'featureKey is required'),
  scope: z.string().min(1, 'scope is required (e.g. question_authoring, interview)'),
  prompt: z.string().optional(),
  messages: z.array(z.any()).optional(),
  variables: z.record(z.any()).optional(),
  preferredProviderId: z.string().optional(),
  userId: z.string().optional(),
  contextData: z.record(z.any()).optional(),
});

// Phase 12 Validation Schemas (AI Interview System)
export const startInterviewSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  mode: z.enum(['PRACTICE', 'EXAM']).default('PRACTICE'),
  courseId: z.string().optional(),
});

export const submitInterviewTurnSchema = z.object({
  message: z.string().min(1, 'Response message is required'),
  audioUrl: z.string().optional(),
  durationSeconds: z.number().optional(),
});

export const interviewQuestionDataSchema = z.object({
  scenario: z.string().min(5, 'Interview opening scenario is required'),
  rubric: z
    .array(
      z.object({
        id: z.string().min(1, 'Rubric criterion ID is required'),
        name: z.string().min(1, 'Rubric criterion name is required'),
        description: z.string().optional(),
        maxScore: z.number().min(0.5, 'Max score must be positive'),
        weight: z.number().optional(),
        criteria: z.array(z.string()).optional(),
      })
    )
    .min(1, 'At least one rubric criterion is required'),
  preset: z.string().optional(),
  maxTurns: z.number().min(1).max(20).default(5),
  expectedDurationMinutes: z.number().min(1).max(120).default(15),
  systemInstructions: z.string().optional(),
  openingQuestion: z.string().optional(),
});

// Phase 13 Validation Schemas (Subscriptions, Entitlements & Billing)
export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  code: z.string().min(1, 'Plan code is required'),
  price: z.number().min(0, 'Price must be non-negative'),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
  description: z.string().optional(),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = z.object({
  name: z.string().optional(),
  price: z.number().min(0).optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const subscribeSchema = z.object({
  planCode: z.string().min(1, 'Plan code is required'),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

export const updateSubscriptionStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']),
  endDate: z.string().optional(),
});

export const updateEntitlementRuleSchema = z.object({
  entitlementValue: z.string().min(1, 'Entitlement value is required'),
});

export const entitlementCheckSchema = z.object({
  key: z.string().min(1, 'Entitlement key is required'),
  currentUsage: z.number().optional().default(0),
});

export const purchaseCreditPackageSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
});

export const checkoutSchema = z.object({
  itemType: z.enum(['SUBSCRIPTION', 'CREDIT_PACKAGE']),
  itemId: z.string().min(1, 'Item ID is required'),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

export const processRefundSchema = z.object({
  gatewayPaymentId: z.string().optional(),
  subscriptionId: z.string().optional(),
  amount: z.number().min(0.01, 'Refund amount must be greater than zero'),
  reason: z.string().min(3, 'Valid reason for refund is required'),
  clawbackCredits: z.boolean().default(true),
});


