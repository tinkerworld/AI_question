import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { startInterviewSchema, submitInterviewTurnSchema } from '@repo/validation';
import { InterviewService } from '../services/interview.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/interview/eligibility
 * Returns derived course eligibility, eligible courses, and available interview questions.
 */
router.get(
  '/eligibility',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eligibility = await InterviewService.getUserEligibility(
        (req as any).user.userId,
        (req as any).user.roles || []
      );
      res.json({ success: true, data: eligibility });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/interview/sessions/start
 * Starts a new interview session (Practice or Exam mode).
 */
router.post(
  '/sessions/start',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = startInterviewSchema.parse(req.body);
      const result = await InterviewService.startInterviewSession(parsed, {
        userId: (req as any).user.userId,
        roles: (req as any).user.roles || [],
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/interview/sessions/:id
 * Retrieves full session state, turns transcript, and rubric scorecard.
 */
router.get(
  '/sessions/:id',
  requirePermission(PERMISSIONS.INTERVIEW_READ_OWN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await InterviewService.getSession(req.params.id, {
        userId: (req as any).user.userId,
        roles: (req as any).user.roles || [],
      });
      res.json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/interview/sessions/:id/turns
 * Submits candidate response for current turn and gets the AI follow-up.
 */
router.post(
  '/sessions/:id/turns',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = submitInterviewTurnSchema.parse(req.body);
      const result = await InterviewService.submitInterviewTurn(
        req.params.id,
        parsed,
        {
          userId: (req as any).user.userId,
          roles: (req as any).user.roles || [],
        }
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/interview/sessions/:id/complete
 * Concludes the interview and triggers multi-criteria rubric evaluation.
 */
router.post(
  '/sessions/:id/complete',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await InterviewService.completeAndEvaluateInterview(
        req.params.id,
        {
          userId: (req as any).user.userId,
          roles: (req as any).user.roles || [],
        }
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/interview/sessions
 * Lists student's past interview sessions.
 */
router.get(
  '/sessions',
  requirePermission(PERMISSIONS.INTERVIEW_READ_OWN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = {
        mode: typeof req.query.mode === 'string' ? req.query.mode : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      };
      const sessions = await InterviewService.listUserSessions(
        (req as any).user.userId,
        query
      );
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
