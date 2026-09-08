import { Router, Request, Response, NextFunction } from 'express';
import { WritingEvaluationService, BUILTIN_WRITING_RUBRICS } from '../services/writing-evaluation.service';
import { authenticate } from '../middleware/auth';
import { requireFeatureActive } from '../middleware/maintenance.middleware';

export const writingRouter = Router();
writingRouter.use(requireFeatureActive('writing'));

/**
 * GET /api/v1/writing/rubrics
 * List all standard built-in writing rubric presets (IELTS, TOEFL, Academic).
 */
writingRouter.get('/rubrics', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const presets = WritingEvaluationService.getRubricPresets();
    res.json({ success: true, data: presets });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/writing/evaluate-preview
 * Dry-run evaluate an essay against a rubric (Staff & Students).
 */
writingRouter.post(['/evaluate', '/evaluate-preview'], authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      essayText,
      submissionText,
      rubric,
      rubricId,
      minWordCount,
      minWords,
      maxWordCount,
      maxWords,
      promptText,
      promptStem,
    } = req.body;

    const text = essayText || submissionText || '';
    const stem = promptText || promptStem || '';
    const minW = Number(minWordCount || minWords || 150);
    const maxW = Number(maxWordCount || maxWords || 400);

    let targetRubric = BUILTIN_WRITING_RUBRICS.IELTS_TASK_2.criteria;
    if (Array.isArray(rubric) && rubric.length > 0) {
      targetRubric = rubric;
    } else if (rubricId && BUILTIN_WRITING_RUBRICS[rubricId]) {
      targetRubric = BUILTIN_WRITING_RUBRICS[rubricId].criteria;
    }

    const evaluation = await WritingEvaluationService.evaluateWriting(
      text,
      targetRubric,
      minW,
      maxW,
      stem
    );

    res.json({ success: true, data: evaluation });
  } catch (err) {
    next(err);
  }
});
