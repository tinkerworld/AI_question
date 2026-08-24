import { Router, Request, Response, NextFunction } from 'express';
import { attemptService } from '../services/attempt.service';
import {
  startAttemptSchema,
  syncAttemptSchema,
  flagAttemptSchema,
} from '@repo/validation';
import { PERMISSIONS, hasPermission } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';

export const attemptRouter = Router();

// All attempt routes require authentication
attemptRouter.use(authenticate);

function isElevatedUser(user: any): boolean {
  if (!user) return false;
  const perms = user.permissions || [];
  const roles = user.roles || [];
  return (
    hasPermission(perms, PERMISSIONS.EXAMS_CREATE) ||
    hasPermission(perms, PERMISSIONS.AUDIT_READ) ||
    hasPermission(perms, PERMISSIONS.ROLES_MANAGE) ||
    roles.includes('MAIN_ADMIN') ||
    roles.includes('SUB_ADMIN') ||
    roles.includes('TEACHER')
  );
}

// ----------------------------------------------------------------------------
// Feature 6.1 — Student Exam Access & Instructions
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/student/exams OR /api/v1/exams/active
 * Discover active/published exams available for the student
 */
attemptRouter.get('/student/exams', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId || (req.user as any)?.id;
    const previewOptions = req.impersonation?.sessionData;
    const exams = await attemptService.getStudentExams(userId, previewOptions);
    res.json({
      success: true,
      data: exams,
      meta: { count: exams.length },
    });
  } catch (error) {
    next(error);
  }
});

attemptRouter.get('/exams/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId || (req.user as any)?.id;
    const previewOptions = req.impersonation?.sessionData;
    const exams = await attemptService.getStudentExams(userId, previewOptions);
    res.json({
      success: true,
      data: exams,
      meta: { count: exams.length },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/student/exams/:id/instructions OR /api/v1/exams/:id/instructions
 * Read exam instructions & section breakdown before starting
 */
attemptRouter.get('/student/exams/:id/instructions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId || (req.user as any)?.id;
    const previewOptions = req.impersonation?.sessionData;
    const instructions = await attemptService.getExamInstructions(req.params.id, userId, previewOptions);
    res.json({
      success: true,
      data: instructions,
    });
  } catch (error) {
    next(error);
  }
});

attemptRouter.get('/exams/:id/instructions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId || (req.user as any)?.id;
    const previewOptions = req.impersonation?.sessionData;
    const instructions = await attemptService.getExamInstructions(req.params.id, userId, previewOptions);
    res.json({
      success: true,
      data: instructions,
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// Feature 6.2 — Exam Attempt Session
// ----------------------------------------------------------------------------

/**
 * POST /api/v1/attempts/start
 * Initializes a new student exam attempt session
 */
attemptRouter.post(
  '/attempts/start',
  requirePermission(PERMISSIONS.EXAMS_ATTEMPT),
  validate(startAttemptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId || (req.user as any)?.id;
      const examId = req.body.examId || req.body.exam_id;
      const previewOptions = req.impersonation?.sessionData;
      const attemptState = await attemptService.startAttempt(examId, userId, previewOptions);
      const statusCode = (attemptState as any).isResumed ? 200 : 201;
      res.status(statusCode).json({
        success: true,
        data: attemptState,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/attempts/:id/state
 * Retrieves the current attempt session state (with timer check & IDOR protection)
 */
attemptRouter.get('/attempts/:id/state', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const userId = user.userId || (user as any).id;
    const isElevated = isElevatedUser(user);
    const attemptState = await attemptService.getAttemptState(req.params.id, userId, isElevated);
    res.json({
      success: true,
      data: attemptState,
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// Feature 6.3 — Real-Time Answer Synchronization
// ----------------------------------------------------------------------------

/**
 * PUT /api/v1/attempts/:id/sync (and POST /api/v1/attempts/:id/sync, PUT /api/v1/attempts/:id/answer)
 * Auto-saves student answers in real-time
 */
const handleSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId || (req.user as any)?.id;
    const result = await attemptService.syncAnswers(req.params.id, userId, req.body);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

attemptRouter.put(
  '/attempts/:id/sync',
  requirePermission(PERMISSIONS.EXAMS_ATTEMPT),
  validate(syncAttemptSchema),
  handleSync
);

attemptRouter.post(
  '/attempts/:id/sync',
  requirePermission(PERMISSIONS.EXAMS_ATTEMPT),
  validate(syncAttemptSchema),
  handleSync
);

attemptRouter.put(
  '/attempts/:id/answer',
  requirePermission(PERMISSIONS.EXAMS_ATTEMPT),
  validate(syncAttemptSchema),
  handleSync
);

// ----------------------------------------------------------------------------
// Feature 6.4 — Exam Completion & Submission
// ----------------------------------------------------------------------------

/**
 * POST /api/v1/attempts/:id/submit
 * Concludes the attempt and runs the Auto-Evaluation Engine
 */
attemptRouter.post(
  '/attempts/:id/submit',
  requirePermission(PERMISSIONS.EXAMS_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId || (req.user as any)?.id;
      const result = await attemptService.submitAttempt(req.params.id, userId, false);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 6.7 — Result Display & Review
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/attempts/:id/results (and /result, /review)
 * View comprehensive results scorecard and question-by-question review
 */
const handleGetResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const userId = user.userId || (user as any).id;
    const isElevated = isElevatedUser(user);
    const results = await attemptService.getAttemptResults(req.params.id, userId, isElevated);
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

attemptRouter.get('/attempts/:id/results', handleGetResults);
attemptRouter.get('/attempts/:id/result', handleGetResults);
attemptRouter.get('/attempts/:id/review', handleGetResults);

/**
 * POST /api/v1/attempts/:id/flag
 * Flag attempt result for teacher review (writes to audit_logs)
 */
attemptRouter.post(
  '/attempts/:id/flag',
  validate(flagAttemptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId || (req.user as any)?.id;
      const reqIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await attemptService.flagResult(
        req.params.id,
        userId,
        req.body.reason,
        reqIp,
        userAgent
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);
