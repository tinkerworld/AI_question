import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { practiceService } from '../services/practice.service';
import { authenticate } from '../middleware/auth';
import { PERMISSIONS, hasPermission } from '@repo/permissions';

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

// ----------------------------------------------------------------------------
// Feature 8.1 — Mastery Engine Summary & Profile
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/students/:id/mastery
 * GET /api/v1/mastery/student/:id
 */
analyticsRouter.get(
  ['/students/:id/mastery', '/mastery/student/:id'],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.id;
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const elevated = isElevatedUser(req.user);

      const mastery = await analyticsService.getStudentMastery(studentId, currentUserId, elevated);
      res.json({
        success: true,
        data: mastery,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/students/:id/recalculate
 */
analyticsRouter.post(
  '/students/:id/recalculate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.id;
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const elevated = isElevatedUser(req.user);

      if (studentId !== currentUserId && !elevated) {
        res.status(403).json({
          success: false,
          errorCode: 'FORBIDDEN_ANALYTICS_ACCESS',
          message: 'Forbidden: You cannot recalculate another student\'s mastery',
        });
        return;
      }

      const mastery = await analyticsService.recalculateStudentMastery(studentId);
      res.json({
        success: true,
        data: mastery,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 8.2 — Strengths Identification
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/students/:id/strengths
 * GET /api/v1/mastery/strengths (for current authenticated user)
 */
analyticsRouter.get('/mastery/strengths', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const strengths = await analyticsService.getStudentStrengths(currentUserId, currentUserId, false);
    res.json({
      success: true,
      data: strengths,
      meta: { count: strengths.length },
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/students/:id/strengths', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.id;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);

    const strengths = await analyticsService.getStudentStrengths(studentId, currentUserId, elevated);
    res.json({
      success: true,
      data: strengths,
      meta: { count: strengths.length },
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// Feature 8.3 — Weaknesses Identification
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/students/:id/weaknesses
 * GET /api/v1/mastery/weaknesses (for current authenticated user)
 */
analyticsRouter.get('/mastery/weaknesses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const weaknesses = await analyticsService.getStudentWeaknesses(currentUserId, currentUserId, false);
    res.json({
      success: true,
      data: weaknesses,
      meta: { count: weaknesses.length },
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/students/:id/weaknesses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.id;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);

    const weaknesses = await analyticsService.getStudentWeaknesses(studentId, currentUserId, elevated);
    res.json({
      success: true,
      data: weaknesses,
      meta: { count: weaknesses.length },
    });
  } catch (error) {
    next(error);
  }
});

// Feature 9.1 — Weakness Pool Endpoint
analyticsRouter.get(
  ['/students/:id/weakness-pool', '/mastery/weakness-pool'],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.id || req.user?.userId || (req.user as any)?.id;
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const elevated = isElevatedUser(req.user);

      const pool = await practiceService.getWeaknessPool(studentId, currentUserId, elevated);
      res.json({
        success: true,
        data: pool,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 8.4 — Syllabus Proficiency Map
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/students/:id/syllabus-proficiency/:courseId
 * GET /api/v1/mastery/map
 */
analyticsRouter.get('/mastery/map', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const courseId = (req.query.courseId as string) || '';
    const map = await analyticsService.getSyllabusProficiencyMap(currentUserId, courseId, currentUserId, false);
    res.json({
      success: true,
      data: map,
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get(
  '/students/:id/syllabus-proficiency/:courseId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.id;
      const courseId = req.params.courseId;
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const elevated = isElevatedUser(req.user);

      const map = await analyticsService.getSyllabusProficiencyMap(studentId, courseId, currentUserId, elevated);
      res.json({
        success: true,
        data: map,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 8.5 — Progress Tracking & Trends
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/students/:id/progress
 * GET /api/v1/mastery/progress
 */
analyticsRouter.get('/mastery/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const range = (req.query.range as any) || 'all';
    const progress = await analyticsService.getStudentProgress(currentUserId, currentUserId, false, range);
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/students/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.id;
    const currentUserId = req.user?.userId || (req.user as any)?.id;
    const elevated = isElevatedUser(req.user);
    const range = (req.query.range as any) || 'all';

    const progress = await analyticsService.getStudentProgress(studentId, currentUserId, elevated, range);
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// Feature 8.7 — Class & Topic Analytics (Teacher/Admin View)
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/analytics/class/:courseId
 */
analyticsRouter.get(
  ['/analytics/class/:courseId', '/analytics/classes/:courseId'],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isElevatedUser(req.user)) {
        res.status(403).json({
          success: false,
          errorCode: 'FORBIDDEN_ANALYTICS_ACCESS',
          message: 'Forbidden: Class analytics requires teacher or administrator privileges',
        });
        return;
      }

      const courseId = req.params.courseId;
      const classData = await analyticsService.getClassAnalytics(courseId);
      res.json({
        success: true,
        data: classData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/topics/:courseId
 */
analyticsRouter.get(
  '/analytics/topics/:courseId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isElevatedUser(req.user)) {
        res.status(403).json({
          success: false,
          errorCode: 'FORBIDDEN_ANALYTICS_ACCESS',
          message: 'Forbidden: Topic analytics requires teacher or administrator privileges',
        });
        return;
      }

      const courseId = req.params.courseId;
      const topicsData = await analyticsService.getTopicAnalytics(courseId);
      res.json({
        success: true,
        data: topicsData,
      });
    } catch (error) {
      next(error);
    }
  }
);
