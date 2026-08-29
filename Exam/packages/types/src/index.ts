export type ThemeMode = 'LIGHT' | 'GRAY' | 'DARK';

export type LanguageCode =
  | 'en' | 'hi' | 'bn' | 'te' | 'mr' | 'ta' | 'ur' | 'gu'
  | 'kn' | 'ml' | 'or' | 'pa' | 'as' | 'ma' | 'sa' | 'ks'
  | 'ne' | 'sd' | 'br' | 'doi' | 'mni' | 'sat' | 'lus';

export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface JWTPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  errorCode: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleIds?: string[];
}

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  roleIds?: string[];
}

export interface RoleDTO {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export interface PermissionDTO {
  id: string;
  key: string;
  description: string;
  module: string;
}

export interface AuditLogDTO {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface EntityVersionDTO {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  data: Record<string, any>;
  changeSummary: string;
  createdBy: string;
  createdAt: string;
}

// Phase 2 DTOs (Academic Structure)
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type SyllabusNodeType = 'UNIT' | 'TOPIC' | 'SUBTOPIC' | 'CONCEPT';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';

export interface CourseDTO {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: CourseStatus;
  thumbnailUrl?: string;
  durationMonths: number;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseDTO {
  name: string;
  code: string;
  description?: string;
  status?: CourseStatus;
  thumbnailUrl?: string;
  durationMonths?: number;
}

export interface UpdateCourseDTO {
  name?: string;
  description?: string;
  status?: CourseStatus;
  thumbnailUrl?: string;
  durationMonths?: number;
}

export interface SubjectDTO {
  id: string;
  courseId: string;
  name: string;
  code: string;
  description?: string;
  credits: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectDTO {
  name: string;
  code: string;
  description?: string;
  credits?: number;
  order?: number;
}

export interface UpdateSubjectDTO {
  name?: string;
  description?: string;
  credits?: number;
  order?: number;
}

export interface SyllabusNodeDTO {
  id: string;
  subjectId: string;
  parentId?: string | null;
  title: string;
  type: SyllabusNodeType;
  orderIndex: number;
  depth: number;
  description?: string;
  learningObjectives?: string[];
  estimatedMinutes: number;
  status: CourseStatus;
  tags: string[];
  children?: SyllabusNodeDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSyllabusNodeDTO {
  parentId?: string;
  title: string;
  type?: SyllabusNodeType;
  orderIndex?: number;
  description?: string;
  learningObjectives?: string[];
  estimatedMinutes?: number;
  status?: CourseStatus;
  tags?: string[];
}

export interface UpdateSyllabusNodeDTO {
  title?: string;
  type?: SyllabusNodeType;
  description?: string;
  learningObjectives?: string[];
  estimatedMinutes?: number;
  status?: CourseStatus;
  tags?: string[];
}

export interface ReorderSyllabusNodeDTO {
  parentId?: string | null;
  orderIndex: number;
}

export interface EnrollmentDTO {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
  course?: CourseDTO;
}

export interface CreateEnrollmentDTO {
  userId: string;
  courseId: string;
}

// Phase 3 DTOs (Question Bank)
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface QuestionDTO {
  id: string;
  type: string;
  content: string;
  data: Record<string, any>;
  difficulty: QuestionDifficulty;
  marks: number;
  status: QuestionStatus;
  version: number;
  courseId?: string | null;
  subjectId?: string | null;
  syllabusNodeId?: string | null;
  tags?: string[];
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionDTO {
  type: string;
  content: string;
  data: Record<string, any>;
  difficulty?: QuestionDifficulty;
  marks?: number;
  status?: QuestionStatus;
  courseId?: string;
  subjectId?: string;
  syllabusNodeId?: string;
  tags?: string[];
}

export interface UpdateQuestionDTO {
  content?: string;
  data?: Record<string, any>;
  difficulty?: QuestionDifficulty;
  marks?: number;
  status?: QuestionStatus;
  courseId?: string;
  subjectId?: string;
  syllabusNodeId?: string;
  tags?: string[];
}

export interface QuestionVersionDTO {
  id: string;
  questionId: string;
  version: number;
  content: string;
  data: Record<string, any>;
  difficulty: QuestionDifficulty;
  marks: number;
  changedById?: string | null;
  createdAt: string;
}

export interface TagDTO {
  id: string;
  name: string;
  createdAt: string;
}

export interface PreviousExamUsageDTO {
  id: string;
  questionId: string;
  examName: string;
  year: number;
  shift?: string | null;
  createdAt: string;
}

export interface QuestionBankAnalyticsDTO {
  totalQuestions: number;
  byDifficulty: Record<QuestionDifficulty, number>;
  byType: Record<string, number>;
  byStatus: Record<QuestionStatus, number>;
  syllabusCoverageRatio: number;
}

// Phase 4 DTOs (Exam Pattern System)
export type ExamPatternStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ExamPatternType = 'SINGLE' | 'MULTI';
export type DistributionType = 'COUNT' | 'PERCENT';

export interface ExamPatternDTO {
  id: string;
  name: string;
  courseId: string;
  levelId?: string | null;
  durationMinutes: number;
  description?: string | null;
  status: ExamPatternStatus;
  type: ExamPatternType;
  totalMarks: number;
  version: number;
  parentId?: string | null;
  tenantId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  subjects?: { subjectId: string; targetMarks?: number | null }[];
  sections?: ExamPatternSectionDTO[];
}

export interface CreateExamPatternDTO {
  name: string;
  courseId: string;
  levelId?: string;
  durationMinutes?: number;
  description?: string;
  type?: ExamPatternType;
  subjectIds?: string[];
}

export interface UpdateExamPatternDTO {
  name?: string;
  courseId?: string;
  levelId?: string;
  durationMinutes?: number;
  description?: string;
  status?: ExamPatternStatus;
  type?: ExamPatternType;
  subjectIds?: string[];
}

export interface ExamPatternSectionDTO {
  id: string;
  examPatternId: string;
  subjectId?: string | null;
  name: string;
  sequenceOrder: number;
  numQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  marksCorrect: number;
  marksWrong: number;
  marksUnattempted: number;
  createdAt: string;
  updatedAt: string;
  rules?: ExamPatternSectionRuleDTO | null;
  topics?: ExamPatternSectionTopicDTO[];
  difficulties?: ExamPatternSectionDifficultyDTO[];
}

export interface CreateExamPatternSectionDTO {
  name: string;
  subjectId?: string;
  sequenceOrder?: number;
  numQuestions: number;
  marksPerQuestion: number;
  marksCorrect?: number;
  marksWrong?: number;
  marksUnattempted?: number;
}

export interface UpdateExamPatternSectionDTO {
  name?: string;
  subjectId?: string;
  sequenceOrder?: number;
  numQuestions?: number;
  marksPerQuestion?: number;
  marksCorrect?: number;
  marksWrong?: number;
  marksUnattempted?: number;
}

export interface ExamPatternSectionRuleDTO {
  id: string;
  sectionId: string;
  allowedQuestionTypes?: string[];
  allowedCategories?: string[];
  selectionMode: 'RANDOM' | 'BALANCED';
  sourceFilters?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SetExamPatternSectionRuleDTO {
  allowedQuestionTypes?: string[];
  allowedCategories?: string[];
  selectionMode?: 'RANDOM' | 'BALANCED';
  sourceFilters?: Record<string, any>;
  tags?: string[];
}

export interface ExamPatternSectionTopicDTO {
  id: string;
  sectionId: string;
  topicId: string;
  distributionType: DistributionType;
  value: number;
  createdAt: string;
}

export interface SetExamPatternSectionTopicDTO {
  distributionType: DistributionType;
  topics: { topicId: string; value: number }[];
}

export interface ExamPatternSectionDifficultyDTO {
  id: string;
  sectionId: string;
  difficultyLevel: QuestionDifficulty;
  distributionType: DistributionType;
  value: number;
  isAutomatic: boolean;
  createdAt: string;
}

export interface SetExamPatternSectionDifficultyDTO {
  distributionType?: DistributionType;
  isAutomatic?: boolean;
  difficulties?: { difficultyLevel: QuestionDifficulty; value: number }[];
}

export interface MultiSubjectAllocationDTO {
  subjectAllocations: { subjectId: string; targetMarks?: number }[];
  sectionSubjectMappings?: { sectionId: string; subjectId: string }[];
}

export interface ExamPatternValidationResultDTO {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    sectionId: string;
    sectionName: string;
    requiredCount: number;
    availableCount: number;
    status: 'OK' | 'DEFICIT';
    message?: string;
  }[];
}

// Phase 5 DTOs (Exam Generator)
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';

export interface ExamDTO {
  id: string;
  patternId?: string;
  courseId?: string;
  name: string;
  instructions?: string;
  durationMinutes: number;
  totalMarks: number;
  startTime?: string;
  endTime?: string;
  status: ExamStatus;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  sections?: ExamSectionDTO[];
  questions?: ExamQuestionDTO[];
}

export interface ExamSectionDTO {
  id: string;
  examId: string;
  name: string;
  sequenceOrder: number;
  subjectId?: string;
  numQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  marksCorrect: number;
  marksWrong: number;
  marksUnattempted: number;
  createdAt: string;
  updatedAt: string;
  questions?: ExamQuestionDTO[];
}

export interface ExamQuestionDTO {
  id: string;
  examId: string;
  examSectionId: string;
  questionId: string;
  sequenceOrder: number;
  marksCorrect: number;
  marksWrong: number;
  question?: QuestionDTO;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateExamDTO {
  patternId: string;
  name?: string;
  instructions?: string;
  startTime?: string;
  endTime?: string;
  avoidRecentDays?: number;
  excludeQuestionIds?: string[];
}

export interface CreateManualExamDTO {
  name: string;
  courseId?: string;
  instructions?: string;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
}

export interface UpdateExamMetadataDTO {
  name?: string;
  instructions?: string;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
  status?: ExamStatus;
  targetCourseId?: string;
  targetSubjectId?: string;
}

export interface CreateExamSectionDTO {
  name: string;
  subjectId?: string;
  sequenceOrder?: number;
  marksPerQuestion?: number;
  marksCorrect?: number;
  marksWrong?: number;
  marksUnattempted?: number;
}

export interface AddExamQuestionsDTO {
  sectionId: string;
  questionIds: string[];
}

export interface SwapExamQuestionDTO {
  newQuestionId: string;
}

export interface ReorderExamQuestionsDTO {
  sectionId: string;
  questionIds: string[];
}

// Phase 6 DTOs (Exam System & Attempts Engine)
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATED' | 'PENDING_REVIEW';

export interface ExamAttemptDTO {
  id: string;
  examId: string;
  userId: string;
  shuffleSeed: string;
  startTime: string;
  endTime?: string | null;
  status: AttemptStatus;
  totalScore?: number | null;
  percentage?: number | null;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  marksObtained?: number | null;
  maxMarks?: number | null;
  isFlagged: boolean;
  flagReason?: string | null;
  createdAt: string;
  updatedAt: string;
  exam?: ExamDTO;
  sections?: AttemptSectionSummaryDTO[];
  questions?: AttemptQuestionItemDTO[];
}

export interface AttemptSectionSummaryDTO {
  id: string;
  name: string;
  sequenceOrder: number;
  totalQuestions: number;
  marksCorrect: number;
  marksWrong: number;
  totalMarks: number;
}

export interface AttemptQuestionItemDTO {
  id: string; // questionAttemptId
  questionId: string;
  examSectionId?: string | null;
  sectionName?: string;
  sequenceOrder: number;
  type: string;
  content: string;
  difficulty: string;
  marks: number;
  marksCorrect: number;
  marksWrong: number;
  options?: { id: string; text: string }[];
  pairs?: { left: string; right: string }[];
  studentAnswer?: any;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
  isCorrect?: boolean | null;
  marksAwarded?: number;
  correctAnswer?: any;
  explanation?: string;
  evaluatorComments?: string | null;
}

export interface StartAttemptDTO {
  examId: string;
}

export interface SyncAttemptDTO {
  questionId?: string;
  studentAnswer?: any;
  isMarkedForReview?: boolean;
  timeSpentSeconds?: number;
  answers?: {
    questionId: string;
    studentAnswer?: any;
    isMarkedForReview?: boolean;
    timeSpentSeconds?: number;
  }[];
}

export interface FlagAttemptDTO {
  reason: string;
}

export interface AttemptResultSummaryDTO {
  attemptId: string;
  examId: string;
  examName: string;
  userId: string;
  userName?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timeSpentSeconds: number;
  status: AttemptStatus;
  totalScore: number;
  maxMarks: number;
  percentage: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  isFlagged: boolean;
  flagReason?: string | null;
  sectionScores: {
    sectionId: string;
    sectionName: string;
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    wrongCount: number;
    score: number;
    maxScore: number;
  }[];
  questions: AttemptQuestionItemDTO[];
}

// Phase 7 DTOs (Published Exam Archive & Immutability Engine)
export type ExamWorkflowStatus = 'DRAFT' | 'PREVIEW' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export interface UpdateExamWorkflowStatusDTO {
  status: ExamWorkflowStatus;
  notes?: string;
}

export interface AssignExamReviewerDTO {
  reviewerId: string;
}

export interface ExamWorkflowLogDTO {
  id: string;
  examId: string;
  fromStatus: string;
  toStatus: string;
  userId?: string | null;
  userName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ExamSnapshotDTO {
  id: string;
  examId: string;
  academicYear: string;
  courseId?: string | null;
  courseName?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  examName: string;
  patternSnapshot: Record<string, any>;
  instructions?: string | null;
  durationMinutes: number;
  totalMarks: number;
  storagePath?: string | null;
  publishedAt: string;
  publishedById?: string | null;
  publishedByName?: string | null;
  version: number;
  status: string;
  createdAt: string;
  sections?: ExamSnapshotSectionDTO[];
  questionsCount?: number;
}

export interface ExamSnapshotSectionDTO {
  id: string;
  snapshotId: string;
  name: string;
  sequenceOrder: number;
  subjectId?: string | null;
  subjectName?: string | null;
  numQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  marksCorrect: number;
  marksWrong: number;
  marksUnattempted: number;
  sectionRules?: Record<string, any> | null;
  questions?: ExamSnapshotQuestionDTO[];
}

export interface ExamSnapshotQuestionDTO {
  id: string;
  snapshotSectionId: string;
  snapshotId: string;
  originalQuestionId: string;
  questionVersion: number;
  questionType: string;
  questionContent: Record<string, any>;
  answerKey?: Record<string, any>;
  marks: number;
  negativeMarks: number;
  displayOrder: number;
  createdAt: string;
}

export interface ExamAnswerKeyDTO {
  snapshotId: string;
  examName: string;
  version: number;
  publishedAt: string;
  sections: {
    sectionId: string;
    sectionName: string;
    questions: {
      questionId: string;
      originalQuestionId: string;
      displayOrder: number;
      questionType: string;
      marks: number;
      negativeMarks: number;
      answerKey: Record<string, any>;
      explanation?: string;
    }[];
  }[];
}

export interface InitiateExamCorrectionDTO {
  reason: string;
  changes: {
    questionId: string;
    correctedAnswerKey: Record<string, any>;
    explanation?: string;
  }[];
}

export interface ExamCorrectionDTO {
  id: string;
  originalSnapshotId: string;
  correctedSnapshotId?: string | null;
  version: number;
  reason: string;
  changesSummary: Record<string, any>;
  initiatedById: string;
  initiatedByName?: string;
  status: string;
  createdAt: string;
}

export interface ExamFileDTO {
  id: string;
  examId: string;
  snapshotId?: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  downloadUrl?: string;
  createdById?: string | null;
  createdAt: string;
}

// Phase 8: Student Analytics & Mastery Engine DTOs
export type MasteryStatus =
  | 'MASTERED'
  | 'STRONG'
  | 'DEVELOPING'
  | 'NEEDS_PRACTICE'
  | 'WEAK'
  | 'NOT_ATTEMPTED'
  | 'GREY';

export type MasteryColor = 'GREEN' | 'BLUE' | 'YELLOW' | 'ORANGE' | 'RED' | 'GREY';

export interface StudentMasteryDTO {
  id: string;
  userId: string;
  overallProficiency: number;
  totalExamsTaken: number;
  totalQuestionsAttempted: number;
  strongCount?: number;
  weakCount?: number;
  status: MasteryStatus;
  color: MasteryColor;
  updatedAt: string;
}

export interface TopicProgressDTO {
  id: string;
  userId: string;
  syllabusNodeId: string;
  nodeTitle?: string;
  nodeType?: string;
  subjectId?: string;
  subjectName?: string;
  courseId?: string;
  proficiencyScore: number;
  attemptsCount: number;
  correctCount: number;
  status: MasteryStatus;
  color: MasteryColor;
  statusChangedAt: string;
  lastEvaluatedAt: string;
}

export interface StudentStrengthDTO {
  id: string;
  userId: string;
  syllabusNodeId: string;
  nodeTitle: string;
  nodeType: string;
  subjectName?: string;
  masteryScore: number;
  attemptsCount: number;
  status: MasteryStatus;
  color: MasteryColor;
}

export interface StudentWeaknessDTO {
  id: string;
  userId: string;
  syllabusNodeId: string;
  nodeTitle: string;
  nodeType: string;
  subjectName?: string;
  proficiencyScore: number;
  errorRate: number;
  severity: 'CRITICAL' | 'MODERATE' | 'MINOR';
  daysInWeakness: number;
  status: MasteryStatus;
  color: MasteryColor;
}

export interface SyllabusProficiencyNodeDTO {
  id: string;
  title: string;
  type: string;
  orderIndex: number;
  depth: number;
  proficiencyScore: number;
  attemptsCount: number;
  status: MasteryStatus;
  color: MasteryColor;
  completionPercentage: number;
  children: SyllabusProficiencyNodeDTO[];
}

export interface ProgressDatapointDTO {
  date: string;
  score: number;
  examCount: number;
  questionsCount: number;
}

export interface StudentProgressDTO {
  trend: 'IMPROVING' | 'DEGRADING' | 'PLATEAU';
  trendDelta: number;
  timeseries: ProgressDatapointDTO[];
  totalAttempts: number;
}

export interface ClassAnalyticsDTO {
  courseId: string;
  courseName: string;
  totalStudents: number;
  averageMastery: number;
  passRate: number;
  masteryDistribution: {
    mastered: number;
    strong: number;
    developing: number;
    needsPractice: number;
    weak: number;
    unattempted: number;
  };
  topWeakTopics: Array<{
    syllabusNodeId: string;
    title: string;
    averageScore: number;
    failureRate: number;
    affectedStudentsCount: number;
  }>;
  students: Array<{
    userId: string;
    name: string;
    email: string;
    overallProficiency: number;
    examsTaken: number;
    status: MasteryStatus;
    color: MasteryColor;
    weaknessesCount: number;
  }>;
}

// ==========================================
// Phase 9: Personalized Practice & Adaptive Mastery
// ==========================================

export type PracticePaperStatus = 'GENERATED' | 'IN_PROGRESS' | 'COMPLETED';
export type PracticeAttemptStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export interface PracticePaperDTO {
  id: string;
  userId: string;
  title: string;
  courseId?: string | null;
  targetNodeIds: string[];
  totalQuestions: number;
  status: PracticePaperStatus;
  createdAt: string;
  updatedAt: string;
  questions?: PracticeQuestionDTO[];
}

export interface PracticeQuestionDTO {
  id: string;
  practicePaperId: string;
  questionId: string;
  syllabusNodeId?: string | null;
  topicTitle?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  displayOrder: number;
  versionNum: number;
  content: string;
  questionType: 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'NUMERICAL';
  options?: Array<{
    id: string;
    text: string;
    order: number;
  }>;
  explanation?: string;
  correctAnswer?: any;
  marks?: number;
  negativeMarks?: number;
}

export interface PracticeAttemptDTO {
  id: string;
  practicePaperId: string;
  userId: string;
  status: PracticeAttemptStatus;
  score: number;
  accuracyPercentage: number;
  correctCount: number;
  totalAttempted: number;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  answers?: PracticeAttemptAnswerDTO[];
}

export interface PracticeAttemptAnswerDTO {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOption?: string | null;
  selectedOptions?: string[] | null;
  numericalAnswer?: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
  createdAt: string;
}

export interface MasteryTrackingDTO {
  id: string;
  userId: string;
  syllabusNodeId: string;
  topicTitle?: string;
  consecutiveCorrect: number;
  masteryThreshold: number;
  isMastered: boolean;
  masteredAt?: string | null;
  lastAttemptedAt: string;
}

export interface WeaknessPoolItemDTO {
  id: string;
  userId: string;
  syllabusNodeId: string;
  topicName: string;
  subjectName?: string;
  courseName?: string;
  severity: 'CRITICAL' | 'MODERATE' | 'MILD';
  errorRate: number;
  failureCount: number;
  isActive: boolean;
  consecutiveCorrect: number;
  masteryThreshold: number;
  isMastered: boolean;
  lastAttemptDate: string;
}

export interface GeneratePracticeDTO {
  targetNodeIds?: string[];
  count?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'ADAPTIVE';
  courseId?: string;
  title?: string;
}

export interface SubmitPracticeAnswerDTO {
  questionId: string;
  selectedOption?: string;
  selectedOptions?: string[];
  numericalAnswer?: string;
  timeSpentSeconds?: number;
}

export interface EvaluatePracticeResultDTO {
  isCorrect: boolean;
  correctAnswer?: any;
  explanation?: string;
  consecutiveCorrect: number;
  masteryThreshold: number;
  isMastered: boolean;
  topicTitle?: string;
}

// ============================================================================
// Phase 10: Preview & Impersonation System Types
// ============================================================================

export type BillingPlan = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';
export type ContentVersion = 'DRAFT' | 'REVIEW' | 'PUBLISHED';
export type UsageMode = 'NORMAL' | 'UNLIMITED_QA';
export type ImpersonationMode = 'PREVIEW_STUDENT' | 'IMPERSONATE_REAL_STUDENT';

export interface PreviewProfileDTO {
  id: string;
  name: string;
  createdById: string;
  billingPlan: BillingPlan;
  contentVersion: ContentVersion;
  usageMode: UsageMode;
  courseAccess: string[];
  featureFlags: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePreviewProfileDTO {
  name: string;
  billingPlan?: BillingPlan;
  contentVersion?: ContentVersion;
  usageMode?: UsageMode;
  courseAccess?: string[];
  featureFlags?: Record<string, boolean>;
}

export interface UpdatePreviewProfileDTO {
  name?: string;
  billingPlan?: BillingPlan;
  contentVersion?: ContentVersion;
  usageMode?: UsageMode;
  courseAccess?: string[];
  featureFlags?: Record<string, boolean>;
}

export interface StartPreviewSessionDTO {
  profileId?: string;
  billingPlan?: BillingPlan;
  contentVersion?: ContentVersion;
  usageMode?: UsageMode;
  courseAccess?: string[];
  featureFlags?: Record<string, boolean>;
  preset?: 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS' | 'DRAFT_REVIEWER';
}

export interface StartImpersonationDTO {
  targetUserId: string;
  reason: string;
}

export interface ImpersonationSessionDTO {
  id: string;
  token: string;
  actorUserId: string;
  actorEmail?: string;
  effectiveUserId: string;
  effectiveEmail?: string;
  mode: ImpersonationMode;
  reason?: string;
  sessionData: {
    simulatedPlan: BillingPlan;
    contentVersion: ContentVersion;
    usageMode: UsageMode;
    courseAccess: string[];
    featureFlags: Record<string, boolean>;
  };
  startedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface PreviewAuditLogDTO {
  id: string;
  actorUserId: string;
  actorEmail?: string;
  effectiveUserId: string;
  effectiveEmail?: string;
  mode: ImpersonationMode;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ==========================================
// Phase 11: AI Question System & Gateway
// ==========================================

export type AIProviderType = 'LOCAL' | 'CLOUD' | 'MOCK';
export type AIJobType = 'SINGLE_GENERATE' | 'BATCH_GENERATE' | 'MODIFY_VARIATION';
export type AIJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AICreditStatus = 'CONSUMED' | 'REFUNDED';
export type AIGatewayStatus = 'SUCCESS' | 'FAILED' | 'RETRY' | 'CIRCUIT_BROKEN';

export interface AIProviderDTO {
  id: string;
  name: string;
  type: AIProviderType;
  modelId: string;
  baseUrl?: string;
  apiKey?: string;
  priority: number;
  scope: string;
  isActive: boolean;
  circuitBroken: boolean;
  failureCount: number;
  lastFailureAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIPromptTemplateDTO {
  id: string;
  featureKey: string;
  version: number;
  systemPrompt: string;
  userPromptTemplate: string;
  expectedSchema?: any;
  dailyLimit?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIGatewayLogDTO {
  id: string;
  userId?: string;
  featureKey: string;
  providerId?: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  status: AIGatewayStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface UserAICreditsDTO {
  id: string;
  userId: string;
  includedDailyCredits: number;
  dailyCreditsUsed: number;
  remainingDailyCredits: number;
  purchasedCredits: number;
  totalAvailableCredits: number;
  monthlyTokenCap: number;
  tokensUsedThisMonth: number;
  isCapped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIUsageHistoryDTO {
  id: string;
  userId: string;
  feature: string;
  creditType: 'INCLUDED' | 'PURCHASED';
  creditsDeducted: number;
  tokensUsed: number;
  status: AICreditStatus;
  jobId?: string;
  createdAt: string;
}

export interface AIGenerationJobDTO {
  id: string;
  userId: string;
  type: AIJobType;
  params: {
    subjectId?: string;
    topicId?: string;
    conceptId?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    type?: string;
    marks?: number;
    count?: number;
    questionId?: string;
    instructions?: string;
    varianceLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  status: AIJobStatus;
  totalCount: number;
  completedCount: number;
  progress: number;
  resultQuestionIds: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModifyQuestionAIDTO {
  questionId: string;
  count?: number;
  varianceLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  instructions?: string;
}

export interface GenerateQuestionsAIDTO {
  subjectId: string;
  topicId?: string;
  conceptId?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  type?: string;
  marks?: number;
  count: number;
  customPrompt?: string;
}

export interface ReviewDraftQuestionDTO {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

// Phase 12 DTOs (AI Interview System)
export type InterviewMode = 'PRACTICE' | 'EXAM';
export type InterviewStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type InterviewSpeaker = 'AI' | 'CANDIDATE';

export interface InterviewRubricItemDTO {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
  score?: number;
  feedback?: string;
  criteria?: string[];
}

export interface InterviewTurnDTO {
  id: string;
  sessionId: string;
  turnNumber: number;
  speaker: InterviewSpeaker;
  message: string;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  evaluationNotes?: string | null;
  mainQuestionIndex?: number;
  followUpIndex?: number;
  isMainQuestion?: boolean;
  providerId?: string | null;
  modelUsed?: string | null;
  providerType?: 'LOCAL' | 'CLOUD' | 'MOCK' | string | null;
  isFallback?: boolean;
  createdAt: string;
}

export interface InterviewEvaluationDTO {
  finalScore: number;
  maxScore: number;
  percentage: number;
  gradeBand?: string;
  rubricScores: InterviewRubricItemDTO[];
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface InterviewSessionDTO {
  id: string;
  userId: string;
  questionId: string;
  courseId?: string | null;
  mode: InterviewMode;
  status: InterviewStatus;
  currentTurn: number;
  maxTurns: number;
  mainQuestionIndex?: number;
  followUpCountForCurrentMain?: number;
  totalMainQuestions?: number;
  startedAt: string;
  completedAt?: string | null;
  finalScore?: number | null;
  maxScore?: number | null;
  rubricScores?: InterviewRubricItemDTO[] | null;
  feedback?: string | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  recommendations?: string[] | null;
  activeProviderId?: string | null;
  activeModelUsed?: string | null;
  activeProviderType?: 'LOCAL' | 'CLOUD' | 'MOCK' | string | null;
  isFallback?: boolean;
  turns?: InterviewTurnDTO[];
  question?: {
    id: string;
    content: string;
    type: string;
    data: any;
    courseId?: string | null;
    subjectId?: string | null;
    courseName?: string;
    subjectName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StartInterviewDTO {
  questionId: string;
  mode?: InterviewMode;
  courseId?: string;
  maxTurns?: number;
}

export interface SubmitInterviewTurnDTO {
  message: string;
  audioUrl?: string;
  durationSeconds?: number;
}

export interface InterviewEligibilityDTO {
  isEligible: boolean;
  eligibleCourseIds: string[];
  eligibleCourses: Array<{ id: string; name: string; code: string; interviewQuestionCount: number }>;
  availableQuestions: Array<{
    id: string;
    content: string;
    difficulty: string;
    courseId?: string;
    subjectId?: string;
    courseName?: string;
    subjectName?: string;
    preset?: string;
    maxTurns?: number;
  }>;
}

// Phase 13 DTOs (Subscriptions, Entitlements & Billing)
export type SubscriptionPlanTier = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type EntitlementRuleType = 'BOOLEAN' | 'NUMBER';
export type InvoiceStatus = 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
export type RefundStatus = 'INITIATED' | 'COMPLETED' | 'FAILED';

export interface PlanDTO {
  id: string;
  name: string;
  code: string;
  price: number;
  billingCycle: 'monthly' | 'annual';
  description?: string | null;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanDTO {
  name: string;
  code: string;
  price: number;
  billingCycle?: 'monthly' | 'annual';
  description?: string;
  features?: string[];
  isActive?: boolean;
}

export interface UpdatePlanDTO {
  name?: string;
  price?: number;
  billingCycle?: 'monthly' | 'annual';
  description?: string;
  features?: string[];
  isActive?: boolean;
}

export interface SubscriptionDTO {
  id: string;
  userId: string;
  planCode: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  cancelledAt?: string | null;
  plan?: PlanDTO;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribeRequestDTO {
  planCode: string;
  billingCycle?: 'monthly' | 'annual';
}

export interface EntitlementRuleDTO {
  id: string;
  planCode: string;
  entitlementKey: string;
  entitlementType: EntitlementRuleType;
  entitlementValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateEntitlementRuleDTO {
  entitlementValue: string;
}

export interface EntitlementCheckDTO {
  allowed: boolean;
  key: string;
  planTier: string;
  limit: number | null;
  value: boolean | number;
  currentUsage?: number;
  remaining?: number | null;
  reason?: string;
}

export interface AICreditPackageDTO {
  id: string;
  name: string;
  creditsCount: number;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseCreditPackageDTO {
  packageId: string;
}

export interface InvoiceDTO {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  items: Array<{ name: string; amount: number; quantity?: number; type: 'SUBSCRIPTION' | 'CREDIT_PACKAGE' | 'SERVICE' }>;
  status: InvoiceStatus;
  externalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefundTransactionDTO {
  id: string;
  subscriptionId?: string | null;
  userId: string;
  actorUserId: string;
  gateway: string;
  gatewayPaymentId: string;
  gatewayRefundId: string;
  originalAmount: number;
  refundAmount: number;
  currency: string;
  isPartial: boolean;
  clawbackCreditsCount: number;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessRefundRequestDTO {
  gatewayPaymentId?: string;
  subscriptionId?: string;
  amount: number;
  reason: string;
  clawbackCredits?: boolean;
}


