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

