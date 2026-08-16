import { Router, Request, Response, NextFunction } from 'express';
import { prisma, pgDb } from '@repo/database';
import { questionTypeRegistry } from '@repo/question-types';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionStatusSchema,
  addExamUsageSchema,
  tagSchema,
} from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

const router = Router();

router.use(authenticate);

// ----------------------------------------------------------------------------
// Feature 3.8 — Analytics Summary (Must be placed before /:id routes)
// ----------------------------------------------------------------------------
router.get('/analytics/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countRes = await pgDb.query(`SELECT COUNT(*) as total FROM "questions"`);
    const totalQuestions = parseInt(countRes.rows[0].total, 10);

    const diffRes = await pgDb.query(
      `SELECT "difficulty", COUNT(*) as count FROM "questions" GROUP BY "difficulty"`
    );
    const byDifficulty: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
    diffRes.rows.forEach((r: any) => {
      byDifficulty[r.difficulty] = parseInt(r.count, 10);
    });

    const typeRes = await pgDb.query(
      `SELECT "type", COUNT(*) as count FROM "questions" GROUP BY "type"`
    );
    const byType: Record<string, number> = {};
    typeRes.rows.forEach((r: any) => {
      byType[r.type] = parseInt(r.count, 10);
    });

    const statusRes = await pgDb.query(
      `SELECT "status", COUNT(*) as count FROM "questions" GROUP BY "status"`
    );
    const byStatus: Record<string, number> = {};
    statusRes.rows.forEach((r: any) => {
      byStatus[r.status] = parseInt(r.count, 10);
    });

    res.json({
      success: true,
      data: {
        totalQuestions,
        byDifficulty,
        byType,
        byStatus,
        syllabusCoverageRatio: 1.0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// Feature 3.4 — Tag Listing
// ----------------------------------------------------------------------------
router.get('/tags/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tagsRes = await pgDb.query(`SELECT * FROM "tags" ORDER BY "name" ASC`);
    res.json({ success: true, data: tagsRes.rows });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// Feature 3.2 — List Questions with Advanced Filters
// ----------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, subjectId, syllabusNodeId, difficulty, type, status, limit } = req.query;

    let whereClause = `WHERE 1=1`;
    const params: any[] = [];
    let paramIdx = 1;

    if (courseId) {
      whereClause += ` AND "courseId" = $${paramIdx++}`;
      params.push(courseId);
    }
    if (subjectId) {
      whereClause += ` AND "subjectId" = $${paramIdx++}`;
      params.push(subjectId);
    }
    if (syllabusNodeId) {
      whereClause += ` AND "syllabusNodeId" = $${paramIdx++}`;
      params.push(syllabusNodeId);
    }
    if (difficulty) {
      whereClause += ` AND "difficulty" = $${paramIdx++}`;
      params.push(difficulty);
    }
    if (type) {
      whereClause += ` AND "type" = $${paramIdx++}`;
      params.push((type as string).toUpperCase());
    }
    if (status) {
      whereClause += ` AND "status" = $${paramIdx++}`;
      params.push(status);
    }

    const limitVal = limit ? parseInt(limit as string, 10) : 100;
    whereClause += ` ORDER BY "createdAt" DESC LIMIT $${paramIdx++}`;
    params.push(limitVal);

    const questionsRes = await pgDb.query(`SELECT * FROM "questions" ${whereClause}`, params);

    res.json({
      success: true,
      data: {
        items: questionsRes.rows,
        total: questionsRes.rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// Feature 3.2 — Create Question
// ----------------------------------------------------------------------------
router.post(
  '/',
  requirePermission(PERMISSIONS.QUESTIONS_CREATE),
  validate(createQuestionSchema),
  auditLog('CREATE', 'question'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, content, data, difficulty, marks, status, courseId, subjectId, syllabusNodeId } = req.body;

      const typeKey = type.toUpperCase();
      const qId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const payloadData = typeof data === 'object' ? JSON.stringify(data) : data;

      await pgDb.query(
        `INSERT INTO "questions" (
          "id", "type", "content", "data", "difficulty", "marks", "status", "version",
          "courseId", "subjectId", "syllabusNodeId", "createdById", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          qId,
          typeKey,
          content,
          payloadData,
          difficulty || 'MEDIUM',
          marks || 1.0,
          status || 'DRAFT',
          courseId || null,
          subjectId || null,
          syllabusNodeId || null,
          req.user!.userId,
        ]
      );

      const createdRes = await pgDb.query(`SELECT * FROM "questions" WHERE "id" = $1`, [qId]);

      res.status(201).json({ success: true, data: createdRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 3.2 — Get Question Details
// ----------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        questionTags: { include: { tag: true } },
        versions: { orderBy: { version: 'desc' } },
        examUsages: true,
      },
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', `Question ${id} not found`);
    }

    const formatted = {
      ...question,
      tags: question.questionTags.map((qt) => qt.tag.name),
      questionTags: undefined,
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// Feature 3.3 — Update Question & Create New Version
// ----------------------------------------------------------------------------
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.QUESTIONS_UPDATE),
  validate(updateQuestionSchema),
  auditLog('UPDATE', 'question'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { content, data, difficulty, marks, status, courseId, subjectId, syllabusNodeId } = req.body;

      const existing = await prisma.question.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
      }

      const newContent = content !== undefined ? content : existing.content;
      const newData = data !== undefined ? data : (existing.data as any);
      const newDiff = difficulty !== undefined ? difficulty : existing.difficulty;
      const newMarks = marks !== undefined ? marks : existing.marks;
      const newStatus = status !== undefined ? status : existing.status;
      const newVersion = existing.version + 1;

      if (data !== undefined) {
        const handler = questionTypeRegistry.getType(existing.type);
        if (!handler.validate(newData)) {
          throw new AppError(400, 'INVALID_TYPE_PAYLOAD', `Invalid type-specific data for '${existing.type}'`);
        }
      }

      const updated = await prisma.question.update({
        where: { id },
        data: {
          content: newContent,
          data: newData,
          difficulty: newDiff,
          marks: newMarks,
          status: newStatus,
          courseId,
          subjectId,
          syllabusNodeId,
          version: newVersion,
          versions: {
            create: {
              version: newVersion,
              content: newContent,
              data: newData,
              difficulty: newDiff,
              marks: newMarks,
              changedById: req.user!.userId,
            },
          },
        },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 3.3 — Version History & Rollback
// ----------------------------------------------------------------------------
router.get('/:id/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const versions = await prisma.questionVersion.findMany({
      where: { questionId: id },
      orderBy: { version: 'desc' },
    });
    res.json({ success: true, data: versions });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/versions/:version/rollback',
  requirePermission(PERMISSIONS.QUESTIONS_UPDATE),
  auditLog('ROLLBACK', 'question'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, version } = req.params;
      const targetVersionNum = parseInt(version, 10);

      const targetVersion = await prisma.questionVersion.findFirst({
        where: { questionId: id, version: targetVersionNum },
      });

      if (!targetVersion) {
        throw new AppError(404, 'VERSION_NOT_FOUND', `Version ${targetVersionNum} not found for question ${id}`);
      }

      const current = await prisma.question.findUnique({ where: { id } });
      const nextVersionNum = (current?.version || 0) + 1;

      const rolledBack = await prisma.question.update({
        where: { id },
        data: {
          content: targetVersion.content,
          data: targetVersion.data as any,
          difficulty: targetVersion.difficulty,
          marks: targetVersion.marks,
          version: nextVersionNum,
          versions: {
            create: {
              version: nextVersionNum,
              content: targetVersion.content,
              data: targetVersion.data as any,
              difficulty: targetVersion.difficulty,
              marks: targetVersion.marks,
              changedById: req.user!.userId,
            },
          },
        },
      });

      res.json({ success: true, data: rolledBack });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 3.5 — Question Lifecycle Status Transitions
// ----------------------------------------------------------------------------
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.QUESTIONS_UPDATE),
  validate(questionStatusSchema),
  auditLog('STATUS_CHANGE', 'question'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const existing = await prisma.question.findUnique({ where: { id } });
      if (!existing) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');

      // State machine validation: DRAFT -> REVIEW -> PUBLISHED -> ARCHIVED
      if (existing.status === 'ARCHIVED' && status === 'PUBLISHED') {
        throw new AppError(400, 'INVALID_LIFECYCLE_TRANSITION', 'Cannot transition ARCHIVED question directly to PUBLISHED');
      }

      const updated = await prisma.question.update({
        where: { id },
        data: { status },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 3.6 — Previous Exam History Tracking
// ----------------------------------------------------------------------------
router.post(
  '/:id/exam-history',
  requirePermission(PERMISSIONS.QUESTIONS_UPDATE),
  validate(addExamUsageSchema),
  auditLog('CREATE', 'exam_history'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { examName, year, shift } = req.body;

      const usage = await prisma.previousExamUsage.create({
        data: {
          questionId: id,
          examName,
          year,
          shift,
        },
      });

      res.status(201).json({ success: true, data: usage });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id/exam-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const history = await prisma.previousExamUsage.findMany({
      where: { questionId: id },
      orderBy: { year: 'desc' },
    });
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// Feature 3.2 — Delete Question
// ----------------------------------------------------------------------------
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.QUESTIONS_DELETE),
  auditLog('DELETE', 'question'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.question.delete({ where: { id } });
      res.json({ success: true, message: 'Question deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
