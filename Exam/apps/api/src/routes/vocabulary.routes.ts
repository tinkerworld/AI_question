import { Router, Request, Response, NextFunction } from 'express';
import { VocabularyService } from '../services/vocabulary.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import { requireFeatureActive } from '../middleware/maintenance.middleware';

export const vocabularyRouter = Router();

// Apply feature-level maintenance guard
vocabularyRouter.use(requireFeatureActive('vocabulary_practice'));

/**
 * GET /api/v1/vocabulary/words
 * List or search vocabulary words.
 */
vocabularyRouter.get('/words', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, difficulty, search, page, limit } = req.query;
    const data = await VocabularyService.listWords({
      courseId: courseId as string,
      difficulty: difficulty as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/vocabulary/words
 * Create a new vocabulary word (Staff).
 */
vocabularyRouter.post(
  '/words',
  authenticate,
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await VocabularyService.createWord(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/vocabulary/practice-deck
 * Retrieve practice deck due for review for active user.
 */
vocabularyRouter.get(['/practice-deck', '/due'], authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = (req as any).user;
    const { courseId, limit } = req.query;
    const deck = await VocabularyService.getPracticeDeck(
      authUser.userId,
      courseId as string,
      limit ? Number(limit) : 10
    );
    res.json({ success: true, data: deck });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/vocabulary/submit-drill
 * Submit result of a flashcard/spelling drill to update SM-2 schedule.
 */
vocabularyRouter.post(['/submit-drill', '/review'], authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = (req as any).user;
    const { wordId, isCorrect, qualityRating, quality } = req.body;
    if (!wordId) {
      return res.status(400).json({ success: false, message: 'wordId is required' });
    }

    const q = qualityRating !== undefined ? Number(qualityRating) : (quality !== undefined ? Number(quality) : 4);
    const correct = isCorrect !== undefined ? Boolean(isCorrect) : (q >= 3);

    const progress = await VocabularyService.submitDrillResult(
      authUser.userId,
      wordId,
      correct,
      q
    );
    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/vocabulary/stats
 * Get student mastery overview statistics.
 */
vocabularyRouter.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = (req as any).user;
    const stats = await VocabularyService.getStudentStats(authUser.userId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});
