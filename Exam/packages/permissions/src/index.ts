export const PERMISSIONS = {
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
} as const;

export type PermissionString = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const SYSTEM_ROLES = {
  MAIN_ADMIN: 'MAIN_ADMIN',
  SUB_ADMIN: 'SUB_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;

export const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  [SYSTEM_ROLES.MAIN_ADMIN]: Object.values(PERMISSIONS),
  [SYSTEM_ROLES.SUB_ADMIN]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.COURSES_READ,
    PERMISSIONS.COURSES_CREATE,
    PERMISSIONS.COURSES_UPDATE,
    PERMISSIONS.QUESTIONS_READ,
    PERMISSIONS.QUESTIONS_CREATE,
    PERMISSIONS.QUESTIONS_UPDATE,
    PERMISSIONS.EXAMS_READ,
    PERMISSIONS.EXAMS_CREATE,
    PERMISSIONS.EXAMS_PUBLISH,
    PERMISSIONS.AUDIT_READ,
  ],
  [SYSTEM_ROLES.TEACHER]: [
    PERMISSIONS.COURSES_READ,
    PERMISSIONS.QUESTIONS_READ,
    PERMISSIONS.QUESTIONS_CREATE,
    PERMISSIONS.QUESTIONS_UPDATE,
    PERMISSIONS.EXAMS_READ,
    PERMISSIONS.EXAMS_CREATE,
  ],
  [SYSTEM_ROLES.STUDENT]: [
    PERMISSIONS.COURSES_READ,
    PERMISSIONS.EXAMS_READ,
    PERMISSIONS.EXAMS_ATTEMPT,
  ],
};

export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: string
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
}
