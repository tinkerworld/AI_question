import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';
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
    const totalQuestions = await prisma.question.count();

    const byDifficultyRaw = await prisma.question.groupBy({
      by: ['difficulty'],
      _count: { _all: true },
    });

    const byTypeRaw = await prisma.question.groupBy({
      by: ['type'],
      _count: { _all: true },
    });

    const byStatusRaw = await prisma.question.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const byDifficulty: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
    byDifficultyRaw.forEach((g) => {
      byDifficulty[g.difficulty] = g._count._all;
    });

    const byType: Record<string, number> = {};
    byTypeRaw.forEach((g) => {
      byType[g.type] = g._count._all;
    });

    const byStatus: Record<string, number> = {};
    byStatusRaw.forEach((g) => {
      byStatus[g.status] = g._count._all;
    });

    const totalNodes = await prisma.syllabusNode.count();
    const nodesWithQuestions = await prisma.syllabusNode.count({
      where: { questions: { some: {} } },
    });

    const syllabusCoverageRatio = totalNodes > 0 ? nodesWithQuestions / totalNodes : 1.0;

    res.json({
      success: true,
      data: {
        totalQuestions,
        byDifficulty,
        byType,
        byStatus,
        syllabusCoverageRatio,
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
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: tags });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// Feature 3.2 — List Questions with Advanced Filters
// ----------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, subjectId, syllabusNodeId, difficulty, type, status, tag } = req.query;

    const where: any = {};
    if (courseId) where.courseId = courseId as string;
    if (subjectId) where.subjectId = subjectId as string;
    if (syllabusNodeId) where.syllabusNodeId = syllabusNodeId as string;
    if (difficulty) where.difficulty = difficulty as string;
    if (type) where.type = (type as string).toUpperCase();
    if (status) where.status = status as string;

    if (tag) {
      where.questionTags = {
        some: {
          tag: { name: { equals: tag as string, mode: 'insensitive' } },
        },
      };
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        questionTags: { include: { tag: true } },
        examUsages: true,
      },
    });

    const formatted = questions.map((q) => ({
      ...q,
      tags: q.questionTags.map((qt) => qt.tag.name),
      questionTags: undefined,
    }));

    res.json({ success: true, data: formatted });
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
      const { type, content, data, difficulty, marks, status, courseId, subjectId, syllabusNodeId, tags } = req.body;

      // Validate question type & payload via @repo/question-types
      const typeKey = type.toUpperCase();
      const handler = questionTypeRegistry.getType(typeKey);
      if (!handler.validate(data)) {
        throw new AppError(400, 'INVALID_TYPE_PAYLOAD', `Invalid type-specific data payload for question type '${typeKey}'`);
      }

      const question = await prisma.question.create({
        data: {
          type: typeKey,
          content,
          data,
          difficulty: difficulty || 'MEDIUM',
          marks: marks || 1.0,
          status: status || 'DRAFT',
          courseId: courseId || null,
          subjectId: subjectId || null,
          syllabusNodeId: syllabusNodeId || null,
          createdById: req.user!.userId,
          versions: {
            create: {
              version: 1,
              content,
              data,
              difficulty: difficulty || 'MEDIUM',
              marks: marks || 1.0,
              changedById: req.user!.userId,
            },
          },
        },
      });

      // Handle tags
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tagName of tags) {
          const tagObj = await prisma.tag.upsert({
            where: { name: tagName.toLowerCase().trim() },
            update: {},
            create: { name: tagName.toLowerCase().trim() },
          });
          await prisma.questionTag.create({
            data: { questionId: question.id, tagId: tagObj.id },
          });
        }
      }

      res.status(201).json({ success: true, data: question });
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
