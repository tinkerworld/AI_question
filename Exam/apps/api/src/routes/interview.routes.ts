import express, { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { startInterviewSchema, submitInterviewTurnSchema } from '@repo/validation';
import { InterviewService } from '../services/interview.service';
import { AppError } from '../middleware/error';
import { pgDb } from '@repo/database';

import { requireFeatureActive } from '../middleware/maintenance.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireFeatureActive('interview'));

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
 * GET /api/v1/interview/candidate-profile
 * Retrieves persistent cross-session interview profile for the authenticated candidate.
 */
router.get(
  '/candidate-profile',
  requirePermission(PERMISSIONS.INTERVIEW_READ_OWN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await InterviewService.getCandidateProfile((req as any).user.userId);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/interview/candidate-profile
 * Resets/clears persistent cross-session interview profile for the authenticated candidate.
 */
router.delete(
  '/candidate-profile',
  requirePermission(PERMISSIONS.INTERVIEW_READ_OWN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await InterviewService.clearCandidateProfile((req as any).user.userId);
      res.json({ success: true, message: 'Candidate profile cleared successfully' });
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
  ['/sessions', '/sessions/start'],
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
  ['/sessions/:id/turns', '/sessions/:id/turn'],
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

/**
 * POST /api/v1/interview/simulate-turn
 * Authoring workbench simulation for staff/admin to test interview persona and boundary rules.
 */
router.post(
  '/simulate-turn',
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await InterviewService.simulateTurn(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/interview/generate-from-document
 * Authoring workbench: generates interview question structure from reference document (PDF/TXT/MD).
 */
router.post(
  '/generate-from-document',
  express.json({ limit: '100mb' }),
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileBase64, fileText, fileName, mimeType, roleContext } = req.body;
      const user = (req as any).user;
      const result = await InterviewService.generateFromDocument({
        fileBase64,
        fileText,
        fileName,
        mimeType,
        roleContext,
        userId: user.userId,
        tenantId: user.tenantId || user.userId,
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({
          success: false,
          errorCode: err.errorCode,
          message: err.message,
          details: err.details,
        });
      }
      if (err.message === 'INSUFFICIENT_AI_CREDITS' || err.message === 'AI_MONTHLY_TOKEN_CAP_REACHED') {
        return res.status(402).json({
          success: false,
          errorCode: err.message,
          message: err.message === 'AI_MONTHLY_TOKEN_CAP_REACHED'
            ? 'Monthly AI token limit reached. Please contact your administrator or upgrade.'
            : 'Insufficient AI credits.',
        });
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/interview/questions/:id/dataset
 * Retrieves decoupled knowledge dataset and behavioral prompt settings for a question.
 */
router.get(
  '/questions/:id/dataset',
  requirePermission(PERMISSIONS.QUESTIONS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await InterviewService.getQuestionDataset(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/interview/sessions/:id/scorecard
 * Retrieves full evidence-grounded rubric scorecard for a completed session.
 */
router.get(
  '/sessions/:id/scorecard',
  requirePermission(PERMISSIONS.INTERVIEW_READ_OWN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scorecard = await InterviewService.getSessionScorecard(req.params.id, {
        userId: (req as any).user.userId,
        roles: (req as any).user.roles || [],
      });
      res.json({ success: true, data: scorecard });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/interview/analytics/student/:userId
 * Retrieves longitudinal interview progress timeseries and trend analysis with Section 7 IDOR check.
 */
router.get(
  '/analytics/student/:userId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : undefined;
      const progress = await InterviewService.getStudentLongitudinalProgress(
        req.params.userId,
        {
          userId: (req as any).user.userId,
          roles: (req as any).user.roles || [],
        },
        courseId
      );
      res.json({ success: true, data: progress });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/interview/sessions/:id/override-score
 * Teacher / Administrator manual grade adjustment with audit logging.
 */
router.post(
  '/sessions/:id/override-score',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await InterviewService.overrideSessionScore(
        req.params.id,
        req.body,
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
 * DELETE /api/v1/interview/admin/user-sessions/:userId
 * Admin route to purge test sessions for a user (for testing repeatability and admin cleanup).
 */
router.delete(
  '/admin/user-sessions/:userId',
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const db = pgDb;
      await db.query(
        `DELETE FROM "interview_turns" WHERE "sessionId" IN (SELECT id FROM "interview_sessions" WHERE "userId" = $1)`,
        [userId]
      );
      await db.query(`DELETE FROM "interview_sessions" WHERE "userId" = $1`, [userId]);
      await db.query(`DELETE FROM "candidate_interview_profiles" WHERE "userId" = $1`, [userId]);
      await db.query(`DELETE FROM "ai_usage_history" WHERE "userId" = $1 AND "feature" = 'interview'`, [userId]);
      res.json({ success: true, message: `Sessions for user ${userId} deleted` });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/interview/voice-profile
 * Retrieves candidate's persisted acoustic VoiceProfile (Sprint 3)
 */
router.get(
  '/voice-profile',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await InterviewService.getVoiceProfile((req as any).user.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/interview/voice-profile
 * Persists candidate's measured acoustic VoiceProfile to user record (Sprint 3)
 */
router.post(
  '/voice-profile',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = req.body?.profile !== undefined ? req.body.profile : req.body;
      if (!profile || typeof profile !== 'object' || Object.keys(profile).length === 0) {
        throw new AppError(400, 'INVALID_VOICE_PROFILE', 'Invalid voice profile payload');
      }
      const result = await InterviewService.saveVoiceProfile((req as any).user.userId, profile);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
