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
