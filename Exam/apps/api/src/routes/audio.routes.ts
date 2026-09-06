import { Router, Request, Response, NextFunction } from 'express';
import { AudioConfigService } from '../services/audio/audio-config.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';

export const audioRouter = Router();

/**
 * GET /api/v1/audio/voices
 * List available voice and accent profiles.
 */
audioRouter.get(['/voices', '/voice-profiles'], authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await AudioConfigService.getVoiceProfiles();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/audio/voices
 * Create a new voice profile (Admin / Faculty).
 */
audioRouter.post(
  '/voices',
  authenticate,
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AudioConfigService.createVoiceProfile(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/audio/synthesize-preview
 * Generate transient synthesized preview audio from script.
 */
audioRouter.post(
  '/synthesize-preview',
  authenticate,
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { script, voiceId, speed } = req.body;
      const data = await AudioConfigService.synthesizePreview(script, voiceId, speed);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);
