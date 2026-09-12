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

/**
 * GET /api/v1/interview/workspaces
 * Lists available knowledge workspaces from the microservice.
 */
router.get(
  '/workspaces',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaces = await InterviewService.getWorkspaces();
      res.json({ success: true, data: workspaces });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/interview/voice-personas
 * Lists available examiner voice personas.
 */
router.get(
  '/voice-personas',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const personas = InterviewService.getVoicePersonas();
      res.json({ success: true, data: personas });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/interview/sessions/:id/skip
 * Skips current question turn in the interview.
 */
router.post(
  '/sessions/:id/skip',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await InterviewService.skipTurn(req.params.id, {
        userId: (req as any).user.userId,
        roles: (req as any).user.roles || [],
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/interview/audio/health
 * Checks health of Whisper ASR & Piper TTS audio microservice.
 */
router.get(
  '/audio/health',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await InterviewService.getAudioHealth();
      res.json({ success: true, data: health });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/interview/audio/transcribe
 * Direct Whisper speech-to-text transcription proxy.
 */
router.post(
  '/audio/transcribe',
  express.json({ limit: '50mb' }),
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { audio_base64, audioBase64, audio_format, audioFormat, language, min_words, minWords } = req.body || {};
      const base64Data = audio_base64 || audioBase64;
      if (!base64Data) {
        throw new AppError(400, 'BAD_REQUEST', 'audio_base64 or audioBase64 is required');
      }

      const result = await InterviewService.transcribeAudio({
        audio_base64: base64Data,
        audio_format: audio_format || audioFormat || 'webm',
        language: language || 'en',
        min_words: min_words ?? minWords ?? 1,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET & POST /api/v1/interview/audio/synthesize
 * Direct Piper text-to-speech audio synthesis proxy.
 */
router.all(
  '/audio/synthesize',
  express.json({ limit: '10mb' }),
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const text = (req.method === 'GET' ? req.query.text : req.body?.text) as string;
      const voice = ((req.method === 'GET' ? req.query.voice : req.body?.voice) as string) || 'emma';
      const rate = Number(req.method === 'GET' ? req.query.rate : req.body?.rate) || 1.0;

      if (!text) {
        throw new AppError(400, 'BAD_REQUEST', 'text parameter is required');
      }

      const audioBuffer = await InterviewService.synthesizeAudio({ text, voice, rate });
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('X-TTS-Voice', voice);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(audioBuffer));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET & POST /api/v1/interview/workspaces/:id/search
 * Cosine similarity vector search in specified knowledge workspace.
 */
router.all(
  '/workspaces/:id/search',
  requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = req.params.id;
      const query = (req.method === 'GET' ? req.query.q || req.query.query : req.body?.query || req.body?.q) as string;
      const k = Number(req.method === 'GET' ? req.query.k : req.body?.k) || 3;

      if (!query) {
        throw new AppError(400, 'BAD_REQUEST', 'query parameter is required');
      }

      const results = await InterviewService.searchWorkspace(workspaceId, query, k);
      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
