import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AudioConfigService } from '../services/audio/audio-config.service';
import { TTSService } from '../services/audio/tts.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { requireFeatureActive } from '../middleware/maintenance.middleware';

export const audioRouter = Router();
audioRouter.use(requireFeatureActive('audio'));

/**
 * GET /api/v1/audio/stream/:filename
 * Streams synthesized or uploaded audio (MP3 / WAV) with HTTP 206 Partial Content support.
 * Does not require Bearer token so standard HTML5 <audio> players can stream directly.
 */
audioRouter.get('/stream/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(TTSService.getStorageDir(), filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Audio file not found' });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const isWav = filename.toLowerCase().endsWith('.wav');
    const contentType = isWav ? 'audio/wav' : 'audio/mpeg';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

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
