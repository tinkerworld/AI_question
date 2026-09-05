import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { practiceService } from '../services/practice.service';
import { authenticate } from '../middleware/auth';
import { PERMISSIONS, hasPermission } from '@repo/permissions';
import { z } from '@repo/validation';

export const analyticsRouter = Router();

// All analytics routes require authentication
analyticsRouter.use(authenticate);

function isElevatedUser(user: any): boolean {
  if (!user) return false;
  const perms = user.permissions || [];
  const roles = user.roles || [];
  return (
    hasPermission(perms, (PERMISSIONS as any).ANALYTICS_READ || 'analytics.read') ||
    hasPermission(perms, (PERMISSIONS as any).EXAMS_CREATE || 'exams.create') ||
    hasPermission(perms, (PERMISSIONS as any).ROLES_MANAGE || 'roles.manage') ||
    roles.includes('MAIN_ADMIN') ||
    roles.includes('SUB_ADMIN') ||
    roles.includes('TEACHER')
  );
}

// Strict validation & sanitization schemas against SQL injection and invalid payloads
const identifierRegex = /^[a-zA-Z0-9_\-]+$/;

const studentParamSchema = z.object({
  id: z.string().min(1, 'Student ID required').max(128).regex(identifierRegex, 'Invalid student identifier format'),
});

const courseParamSchema = z.object({
  courseId: z.string().min(1, 'Course ID required').max(128).regex(identifierRegex, 'Invalid course identifier format'),
});

const syllabusProficiencyParamSchema = z.object({
  id: z.string().min(1).max(128).regex(identifierRegex, 'Invalid student identifier format'),
  courseId: z.string().min(1).max(128).regex(identifierRegex, 'Invalid course identifier format'),
});

const syllabusMapQuerySchema = z.object({
  courseId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]*$/, 'Invalid course ID format').optional().default(''),
});

const progressQuerySchema = z.object({
  range: z.enum(['week', 'month', 'all']).optional().default('all'),
});

function validateParams<T>(schema: z.ZodSchema<T>, data: any, res: Response): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      success: false,
      errorCode: 'INVALID_INPUT_PARAMETERS',
      message: 'Input parameter failed sanitization or validation check',
      errors: result.error.flatten(),
    });
    return null;
  }
  return result.data;
}

// ----------------------------------------------------------------------------
// Feature 8.1 — Mastery Engine Summary & Profile (Parameterized & Sanitized)
// ----------------------------------------------------------------------------
analyticsRouter.get(['/students/:id/mastery', '/mastery/student/:id'], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = validateParams(studentParamSchema, req.params, res);
    if (!params) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);
    const mastery = await analyticsService.getStudentMastery(params.id, currentUserId, elevated);
    res.json({ success: true, data: mastery });
  } catch (error) { next(error); }
});

analyticsRouter.post('/students/:id/recalculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = validateParams(studentParamSchema, req.params, res);
    if (!params) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);
    if (params.id !== currentUserId && !elevated) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_ANALYTICS_ACCESS',
        message: 'Forbidden: You cannot recalculate another student\'s mastery',
      });
    }
    const mastery = await analyticsService.recalculateStudentMastery(params.id);
    res.json({ success: true, data: mastery });
  } catch (error) { next(error); }
});

// ----------------------------------------------------------------------------
// Feature 8.2 — Strengths Identification
// ----------------------------------------------------------------------------
analyticsRouter.get('/mastery/strengths', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const strengths = await analyticsService.getStudentStrengths(currentUserId, currentUserId, false);
    res.json({ success: true, data: strengths, meta: { count: strengths.length } });
  } catch (error) { next(error); }
});

analyticsRouter.get('/students/:id/strengths', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = validateParams(studentParamSchema, req.params, res);
    if (!params) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);
    const strengths = await analyticsService.getStudentStrengths(params.id, currentUserId, elevated);
    res.json({ success: true, data: strengths, meta: { count: strengths.length } });
  } catch (error) { next(error); }
});

// ----------------------------------------------------------------------------
// Feature 8.3 — Weaknesses Identification (Fully Implemented & Sanitized)
// ----------------------------------------------------------------------------
analyticsRouter.get('/mastery/weaknesses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const weaknesses = await analyticsService.getStudentWeaknesses(currentUserId, currentUserId, false);
    res.json({ success: true, data: weaknesses, meta: { count: weaknesses.length } });
  } catch (error) { next(error); }
});

analyticsRouter.get('/students/:id/weaknesses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = validateParams(studentParamSchema, req.params, res);
    if (!params) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);
    const weaknesses = await analyticsService.getStudentWeaknesses(params.id, currentUserId, elevated);
    res.json({ success: true, data: weaknesses, meta: { count: weaknesses.length } });
  } catch (error) { next(error); }
});

// Feature 9.1 — Weakness Pool Endpoint
analyticsRouter.get(['/students/:id/weakness-pool', '/mastery/weakness-pool'], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id || req.user?.userId || (req.user as any)?.id;
    const params = validateParams(studentParamSchema, { id: rawId }, res);
    if (!params) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);
    const pool = await practiceService.getWeaknessPool(params.id, currentUserId, elevated);
    res.json({ success: true, data: pool });
  } catch (error) { next(error); }
});

// ----------------------------------------------------------------------------
// Feature 8.4 — Syllabus Proficiency Map
// ----------------------------------------------------------------------------
analyticsRouter.get('/mastery/map', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = validateParams(syllabusMapQuerySchema, req.query, res);
    if (!query) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const map = await analyticsService.getSyllabusProficiencyMap(currentUserId, query.courseId || '', currentUserId, false);
    res.json({ success: true, data: map });
  } catch (error) { next(error); }
});

analyticsRouter.get('/students/:id/syllabus-proficiency/:courseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = validateParams(syllabusProficiencyParamSchema, req.params, res);
    if (!params) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);
    const map = await analyticsService.getSyllabusProficiencyMap(params.id, params.courseId, currentUserId, elevated);
    res.json({ success: true, data: map });
  } catch (error) { next(error); }
});

// ----------------------------------------------------------------------------
// Feature 8.5 — Progress Tracking & Trends
// ----------------------------------------------------------------------------
analyticsRouter.get('/mastery/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = validateParams(progressQuerySchema, req.query, res);
    if (!query) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const progress = await analyticsService.getStudentProgress(currentUserId, currentUserId, false, query.range);
    res.json({ success: true, data: progress });
  } catch (error) { next(error); }
});

analyticsRouter.get('/students/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = validateParams(studentParamSchema, req.params, res);
    if (!params) return;
    const query = validateParams(progressQuerySchema, req.query, res);
    if (!query) return;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);
    const progress = await analyticsService.getStudentProgress(params.id, currentUserId, elevated, query.range);
    res.json({ success: true, data: progress });
  } catch (error) { next(error); }
});

// ----------------------------------------------------------------------------
// Feature 8.7 — Class & Topic Analytics (Teacher/Admin View)
// ----------------------------------------------------------------------------
analyticsRouter.get(['/analytics/class/:courseId', '/analytics/classes/:courseId'], async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isElevatedUser(req.user)) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_ANALYTICS_ACCESS',
        message: 'Forbidden: Class analytics requires teacher or administrator privileges',
      });
    }
    const params = validateParams(courseParamSchema, req.params, res);
    if (!params) return;
    const classData = await analyticsService.getClassAnalytics(params.courseId);
    res.json({ success: true, data: classData });
  } catch (error) { next(error); }
});

analyticsRouter.get('/analytics/topics/:courseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isElevatedUser(req.user)) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_ANALYTICS_ACCESS',
        message: 'Forbidden: Topic analytics requires teacher or administrator privileges',
      });
    }
    const params = validateParams(courseParamSchema, req.params, res);
    if (!params) return;
    const topicsData = await analyticsService.getTopicAnalytics(params.courseId);
    res.json({ success: true, data: topicsData });
  } catch (error) { next(error); }
});

