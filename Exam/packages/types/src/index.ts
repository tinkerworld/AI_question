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
