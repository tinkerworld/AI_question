import { Router, Request, Response, NextFunction } from 'express';
import { ListeningService } from '../services/listening.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { requireFeatureActive } from '../middleware/maintenance.middleware';

export const listeningRouter = Router();
listeningRouter.use(requireFeatureActive('audio'));

/**
 * GET /api/v1/listening/voices
 * List available voice profiles and accents for listening authoring.
 */
listeningRouter.get(['/voices', '/voice-profiles'], authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ListeningService.getVoiceProfiles();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/listening/synthesize-preview
 * Generate synthesized audio preview for listening passage script.
 */
listeningRouter.post(
  ['/synthesize', '/synthesize-preview'],
  authenticate,
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { script, voiceId, speed } = req.body;
      const data = await ListeningService.synthesizePreview(script, voiceId, speed);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/listening/validate
 * Validate a listening question data payload.
 */
listeningRouter.post(
  '/validate',
  authenticate,
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = ListeningService.validateListeningConfig(req.body);
      res.json({ success: validation.isValid, data: validation });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/listening/evaluate
 * Dry-run evaluate answers for listening sub-questions.
 */
listeningRouter.post(
  '/evaluate',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionData, userAnswers } = req.body;
      const result = ListeningService.evaluateAnswers(questionData, userAnswers);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/listening/eligibility
 * Returns derived course eligibility, eligible courses, and available listening questions.
 */
listeningRouter.get(
  '/eligibility',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eligibility = await ListeningService.getUserEligibility(
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
 * POST /api/v1/listening/sessions/start
 * Starts a new standalone listening practice attempt.
 */
listeningRouter.post(
  ['/sessions', '/sessions/start'],
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ListeningService.startListeningSession(req.body, {
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
 * GET /api/v1/listening/sessions
 * List past listening practice attempts for user.
 */
listeningRouter.get(
  '/sessions',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await ListeningService.getUserSessions((req as any).user.userId);
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/listening/sessions/:id
 * Retrieves listening practice session details.
 */
listeningRouter.get(
  '/sessions/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await ListeningService.getListeningSession(req.params.id, {
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
 * POST /api/v1/listening/sessions/:id/submit
 * Submits candidate answers and auto-evaluates the listening session.
 */
listeningRouter.post(
  ['/sessions/:id/submit', '/sessions/:id/complete'],
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ListeningService.submitListeningSession(
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

