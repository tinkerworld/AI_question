import { z } from 'zod';

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
