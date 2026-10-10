import { Router, Request, Response, NextFunction } from 'express';
import { WritingEvaluationService, BUILTIN_WRITING_RUBRICS } from '../services/writing-evaluation.service';
import {
  WritingEvaluationEngineService,
  computeCombinedIeltsWritingScore,
  roundToIeltsBand,
  IELTS_TASK_CRITERIA_IDS,
} from '../services/writing-evaluation-engine.service';
import { authenticate } from '../middleware/auth';
import { requireFeatureActive } from '../middleware/maintenance.middleware';
import { AppError } from '../middleware/error';
import { pgDb } from '@repo/database';

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
 * POST /api/v1/writing/evaluate
 * POST /api/v1/writing/evaluate-preview
 * Synchronously evaluate an essay against IELTS descriptors or custom rubric.
 */
writingRouter.post(['/evaluate', '/evaluate-preview'], authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const {
      questionId,
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
      taskType,
      timeSpentSeconds,
      allowTestMock,
    } = req.body;

    const text = essayText || submissionText || '';
    const stem = promptText || promptStem || '';
    const minW = Number(minWordCount || minWords || 150);
    const maxW = Number(maxWordCount || maxWords || 400);

    // If questionId provided, run through WritingEvaluationEngineService
    if (questionId) {
      const isIsolatedTest =
        process.env.ALLOW_WRITING_TEST_MOCK === 'true' &&
        req.headers['x-isolated-test'] === 'true';
      const effectiveAllowTestMock = isIsolatedTest && Boolean(allowTestMock);

      const result = await WritingEvaluationEngineService.evaluateSubmission({
        userId: user.userId,
        questionId,
        essayText: text,
        taskType,
        timeSpentSeconds,
        allowTestMock: effectiveAllowTestMock,
      });
      return res.json({ success: true, data: result });
    }

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

/**
 * POST /api/v1/writing/evaluations/submit
 * Asynchronously persist and submit an essay for evaluation.
 */
writingRouter.post('/evaluations/submit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { questionId, essayText, submittedText, taskType, sessionId, attemptId, timeSpentSeconds, allowTestMock } = req.body;

    if (!questionId || typeof questionId !== 'string') {
      throw new AppError(400, 'BAD_REQUEST', 'Missing required parameter: questionId');
    }

    if (essayText !== undefined && typeof essayText !== 'string') {
      throw new AppError(400, 'BAD_REQUEST', 'essayText must be a string');
    }

    if (submittedText !== undefined && typeof submittedText !== 'string') {
      throw new AppError(400, 'BAD_REQUEST', 'submittedText must be a string');
    }

    const isIsolatedTest =
      process.env.ALLOW_WRITING_TEST_MOCK === 'true' &&
      req.headers['x-isolated-test'] === 'true';
    const effectiveAllowTestMock = isIsolatedTest && Boolean(allowTestMock);

    const result = await WritingEvaluationEngineService.evaluateSubmission({
      userId: user.userId,
      questionId,
      essayText: essayText || submittedText || '',
      taskType,
      sessionId,
      attemptId,
      timeSpentSeconds,
      allowTestMock: effectiveAllowTestMock,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/writing/evaluations/:id
 * Retrieve full evaluation result, text stats, and evidence quotes.
 */
writingRouter.get('/evaluations/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const evaluation = await WritingEvaluationEngineService.getEvaluationById(req.params.id, {
      userId: user.userId,
      roles: user.roles || [],
    });
    res.json({ success: true, data: evaluation });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/writing/combined-estimate
 * Produces official combined IELTS Writing estimate:
 * Task 2 is weighted twice as heavily as Task 1: (Task 1 + 2 * Task 2) / 3
 */
writingRouter.get('/combined-estimate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const task1Id = String(req.query.task1Id || '');
    const task2Id = String(req.query.task2Id || '');

    if (!task1Id || !task2Id) {
      throw new AppError(400, 'BAD_REQUEST', 'Both task1Id and task2Id query parameters are required');
    }

    const eval1 = await WritingEvaluationEngineService.getEvaluationById(task1Id, user);
    const eval2 = await WritingEvaluationEngineService.getEvaluationById(task2Id, user);

    const task1Score = eval1.rawAverageScore ?? eval1.overallScore;
    const task2Score = eval2.rawAverageScore ?? eval2.overallScore;

    const combined = computeCombinedIeltsWritingScore(task1Score, task2Score);

    res.json({
      success: true,
      data: {
        task1: {
          id: eval1.id,
          taskType: 'TASK_1',
          overallScore: eval1.overallScore,
          band: eval1.band,
        },
        task2: {
          id: eval2.id,
          taskType: 'TASK_2',
          overallScore: eval2.overallScore,
          band: eval2.band,
        },
        rawCombined: combined.rawCombined,
        roundedBand: combined.roundedBand,
        bandLabel: combined.bandLabel,
        formula: 'Official IELTS Weighting: (Task 1 + 2 * Task 2) / 3, rounded to nearest half-band',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/writing/chart-facts/:questionId
 * Retrieves teacher-verified chart data for Task 1 questions.
 */
writingRouter.get('/chart-facts/:questionId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facts = await WritingEvaluationEngineService.getChartFactsByQuestionId(req.params.questionId);
    if (!facts) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: `No verified chart facts found for question '${req.params.questionId}'`,
      });
    }
    res.json({ success: true, data: facts });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/writing/reviews/pending
 * Lists evaluations awaiting teacher review (Teachers & Admins only).
 */
writingRouter.get('/reviews/pending', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const isStaff = (user.roles || []).some((r: string) => ['MAIN_ADMIN', 'SUB_ADMIN', 'TEACHER'].includes(r));
    if (!isStaff) {
      throw new AppError(403, 'FORBIDDEN', 'Teacher authorization required');
    }

    const reviews = await WritingEvaluationEngineService.getPendingTeacherReviews({
      taskType: req.query.taskType as string,
      courseId: req.query.courseId as string,
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/writing/reviews/export
 * Exports approved, de-identified training records in JSONL format (Teachers & Admins only).
 */
writingRouter.get('/reviews/export', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const isStaff = (user.roles || []).some((r: string) => ['MAIN_ADMIN', 'SUB_ADMIN', 'TEACHER'].includes(r));
    if (!isStaff) {
      throw new AppError(403, 'FORBIDDEN', 'Teacher authorization required for dataset export');
    }

    const dataset = await WritingEvaluationEngineService.exportTrainingDataset({
      datasetVersion: req.query.version as string,
    });

    if (req.query.format === 'raw' || req.query.format === 'text') {
      res.setHeader('Content-Type', 'application/x-jsonlines; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ielts-writing-training-${dataset.datasetVersion}.jsonl"`);
      return res.send(dataset.jsonlContent);
    }

    res.json({ success: true, data: dataset });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/writing/reviews/:id/submit
 * Teacher approves or corrects criterion scores and adds pedagogical notes.
 */
writingRouter.post('/reviews/:id/submit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { correctedCriteriaScores, correctedOverallScore, teacherNotes, isApproved } = req.body;

    const evalRes = await pgDb.query(`SELECT "taskType" FROM "writing_evaluations" WHERE "id" = $1`, [req.params.id]);
    if (evalRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Writing evaluation '${req.params.id}' not found`);
    }

    const evalRow = evalRes.rows[0] as any;
    const taskType: 'TASK_1' | 'TASK_2' = evalRow.taskType === 'TASK_1' ? 'TASK_1' : 'TASK_2';
    const expectedCriteria = IELTS_TASK_CRITERIA_IDS[taskType];

    if (!correctedCriteriaScores || typeof correctedCriteriaScores !== 'object' || Array.isArray(correctedCriteriaScores)) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing or invalid correctedCriteriaScores object');
    }

    const submittedKeys = Object.keys(correctedCriteriaScores);
    if (submittedKeys.length !== expectedCriteria.length) {
      throw new AppError(
        400,
        'BAD_REQUEST',
        `Invalid criterion set for ${taskType}. Exactly ${expectedCriteria.length} criteria required: ${expectedCriteria.join(', ')}`
      );
    }

    for (const key of submittedKeys) {
      if (!expectedCriteria.includes(key)) {
        throw new AppError(
          400,
          'BAD_REQUEST',
          `Unknown or invalid criterion '${key}' for ${taskType}. Allowed criteria are: ${expectedCriteria.join(', ')}`
        );
      }
    }

    const entries = Object.entries(correctedCriteriaScores);
    for (const [critId, val] of entries) {
      const score = Number(val);
      if (typeof val !== 'number' || isNaN(score) || score < 0 || score > 9) {
        throw new AppError(400, 'BAD_REQUEST', `Invalid score for criterion '${critId}': must be a valid number between 0 and 9`);
      }
    }

    if (correctedOverallScore !== undefined) {
      const overall = Number(correctedOverallScore);
      if (typeof correctedOverallScore !== 'number' || isNaN(overall) || overall < 0 || overall > 9) {
        throw new AppError(400, 'BAD_REQUEST', 'Corrected overall score must be a number between 0 and 9');
      }
    }

    const numericScores = entries.map(([, v]) => Number(v));
    const sum = numericScores.reduce((a, b) => a + b, 0);
    const finalOverall = roundToIeltsBand(sum / numericScores.length);

    const review = await WritingEvaluationEngineService.submitTeacherReview(
      req.params.id,
      { userId: user.userId, roles: user.roles || [] },
      {
        correctedCriteriaScores,
        correctedOverallScore: finalOverall,
        teacherNotes: teacherNotes || '',
        isApproved: isApproved !== false,
      }
    );

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/writing/eligibility
 * Returns derived course eligibility, eligible courses, and available writing questions.
 */
writingRouter.get(
  '/eligibility',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eligibility = await WritingEvaluationService.getUserEligibility(
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
 * POST /api/v1/writing/sessions/start
 * Starts a new standalone writing practice attempt.
 */
writingRouter.post(
  ['/sessions', '/sessions/start'],
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WritingEvaluationService.startWritingSession(req.body, {
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
 * GET /api/v1/writing/sessions
 * List past writing practice attempts for user.
 */
writingRouter.get(
  '/sessions',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await WritingEvaluationService.getUserSessions((req as any).user.userId);
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/writing/sessions/:id
 * Retrieves writing practice session details.
 */
writingRouter.get(
  '/sessions/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await WritingEvaluationService.getWritingSession(req.params.id, {
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
 * POST /api/v1/writing/sessions/:id/submit
 * Submits candidate essay and auto-evaluates the writing session.
 */
writingRouter.post(
  ['/sessions/:id/submit', '/sessions/:id/complete'],
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isIsolatedTest =
        process.env.ALLOW_WRITING_TEST_MOCK === 'true' &&
        req.headers['x-isolated-test'] === 'true';
      const result = await WritingEvaluationService.submitWritingSession(
        req.params.id,
        req.body,
        {
          userId: (req as any).user.userId,
          roles: (req as any).user.roles || [],
          isIsolatedTest,
        }
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/writing/admin/audit/evaluations
 * Read-only audit query to identify historical evaluations affected by engine/evaluator version changes.
 */
writingRouter.get(
  '/admin/audit/evaluations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const isStaff = (user?.roles || []).some((r: string) =>
        ['MAIN_ADMIN', 'SUB_ADMIN', 'TEACHER'].includes(r)
      );
      if (!isStaff) {
        throw new AppError(403, 'FORBIDDEN', 'Teacher or Admin privilege required for historical evaluation audit');
      }

      const limit = Number(req.query.limit || 100);
      const auditData = await WritingEvaluationEngineService.getHistoricalEvaluationsAudit(limit);
      res.json({ success: true, data: auditData });
    } catch (err) {
      next(err);
    }
  }
);
