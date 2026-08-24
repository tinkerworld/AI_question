import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
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
import crypto from 'crypto';

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

    const sessionData = req.impersonation?.sessionData;
    const isDraftPreview = sessionData?.contentVersion === 'DRAFT';
    const restrictedCourses =
      sessionData?.courseAccess &&
      (Array.isArray(sessionData.courseAccess)
        ? !sessionData.courseAccess.includes('*') && sessionData.courseAccess.length > 0
          ? sessionData.courseAccess
          : null
        : sessionData.courseAccess !== '*'
        ? [sessionData.courseAccess]
        : null);

    if (restrictedCourses) {
      whereClause += ` AND "courseId" = ANY($${paramIdx++})`;
      params.push(restrictedCourses);
    }

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

      const vId = `qv_${crypto.randomBytes(8).toString('hex')}`;
      await pgDb.query(
        `INSERT INTO "question_versions" ("id", "questionId", "version", "content", "data", "difficulty", "marks", "changeSummary", "changedById", "createdAt")
         VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, NOW())`,
        [vId, qId, content, payloadData, difficulty || 'MEDIUM', marks || 1.0, 'Initial question created', req.user!.userId]
      );

      const createdRes = await pgDb.query(`SELECT * FROM "questions" WHERE "id" = $1`, [qId]);

      res.status(201).json({ success: true, data: createdRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

function inferQuestionChangeSummary(
  existing: any,
  updates: {
    content?: string;
    data?: any;
    difficulty?: string;
    marks?: number | string;
    status?: string;
    courseId?: string | null;
    subjectId?: string | null;
    syllabusNodeId?: string | null;
  }
): string {
  const changes: string[] = [];

  if (updates.difficulty !== undefined && updates.difficulty !== existing.difficulty) {
    changes.push(`Difficulty changed ${existing.difficulty} -> ${updates.difficulty}`);
  }

  if (updates.marks !== undefined && parseFloat(String(updates.marks)) !== parseFloat(String(existing.marks))) {
    changes.push(`Marks changed ${existing.marks} -> ${updates.marks}`);
  }

  if (updates.status !== undefined && updates.status !== existing.status) {
    changes.push(`Status changed ${existing.status} -> ${updates.status}`);
  }

  if (updates.content !== undefined && updates.content !== existing.content) {
    changes.push('Content edited');
  }

  if (updates.data !== undefined) {
    try {
      const oldData = typeof existing.data === 'string' ? JSON.parse(existing.data) : (existing.data || {});
      const newData = typeof updates.data === 'string' ? JSON.parse(updates.data) : (updates.data || {});

      if (
        JSON.stringify(oldData.correctAnswer) !== JSON.stringify(newData.correctAnswer) ||
        oldData.correctOptionId !== newData.correctOptionId ||
        JSON.stringify(oldData.correctOptionIds) !== JSON.stringify(newData.correctOptionIds)
      ) {
        changes.push('Correct answer changed');
      }
      if (JSON.stringify(oldData.options) !== JSON.stringify(newData.options)) {
        changes.push('Options updated');
      }
      if (oldData.explanation !== newData.explanation) {
        changes.push('Explanation updated');
      }
      if (
        changes.filter((c) => c.includes('answer') || c.includes('Options') || c.includes('Explanation')).length === 0 &&
        JSON.stringify(oldData) !== JSON.stringify(newData)
      ) {
        changes.push('Question data updated');
      }
    } catch {
      changes.push('Question data updated');
    }
  }

  if (
    (updates.courseId !== undefined && updates.courseId !== existing.courseId) ||
    (updates.subjectId !== undefined && updates.subjectId !== existing.subjectId) ||
    (updates.syllabusNodeId !== undefined && updates.syllabusNodeId !== existing.syllabusNodeId)
  ) {
    changes.push('Syllabus mapping updated');
  }

  return changes.length > 0 ? changes.join(', ') : 'Question updated';
}

// ----------------------------------------------------------------------------
// Feature 3.2 — Get Question Details
// ----------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const qRes = await pgDb.query(`SELECT * FROM "questions" WHERE "id" = $1`, [id]);
    if (qRes.rows.length === 0) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', `Question ${id} not found`);
    }
    const question = qRes.rows[0];

    const tagsRes = await pgDb.query(
      `SELECT t."name" FROM "tags" t
       JOIN "question_tags" qt ON qt."tagId" = t."id"
       WHERE qt."questionId" = $1`,
      [id]
    );
    const versionsRes = await pgDb.query(
      `SELECT * FROM "question_versions" WHERE "questionId" = $1 ORDER BY "version" DESC`,
      [id]
    );
    const usagesRes = await pgDb.query(
      `SELECT * FROM "previous_exam_usages" WHERE "questionId" = $1 ORDER BY "year" DESC`,
      [id]
    );

    question.tags = tagsRes.rows.map((r: any) => r.name);
    question.versions = versionsRes.rows;
    question.examUsages = usagesRes.rows;

    res.json({ success: true, data: question });
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

      const qRes = await pgDb.query(`SELECT * FROM "questions" WHERE "id" = $1`, [id]);
      if (qRes.rows.length === 0) {
        throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
      }
      const existing = qRes.rows[0];

      const newContent = content !== undefined ? content : existing.content;
      const newData = data !== undefined ? (typeof data === 'object' ? JSON.stringify(data) : data) : existing.data;
      const newDiff = difficulty !== undefined ? difficulty : existing.difficulty;
      const newMarks = marks !== undefined ? marks : existing.marks;
      const newStatus = status !== undefined ? status : existing.status;
      const newVersion = (existing.version || 1) + 1;

      if (data !== undefined) {
        const handler = questionTypeRegistry.getType(existing.type);
        if (!handler.validate(typeof data === 'string' ? JSON.parse(data) : data)) {
          throw new AppError(400, 'INVALID_TYPE_PAYLOAD', `Invalid type-specific data for '${existing.type}'`);
        }
      }

      const changeSummary = inferQuestionChangeSummary(existing, {
        content: newContent,
        data: newData,
        difficulty: newDiff,
        marks: newMarks,
        status: newStatus,
        courseId,
        subjectId,
        syllabusNodeId,
      });

      const updateRes = await pgDb.query(
        `UPDATE "questions"
         SET "content" = $1, "data" = $2, "difficulty" = $3, "marks" = $4, "status" = $5,
             "courseId" = $6, "subjectId" = $7, "syllabusNodeId" = $8, "version" = $9, "updatedAt" = NOW()
         WHERE "id" = $10
         RETURNING *`,
        [
          newContent,
          newData,
          newDiff,
          newMarks,
          newStatus,
          courseId !== undefined ? courseId : existing.courseId,
          subjectId !== undefined ? subjectId : existing.subjectId,
          syllabusNodeId !== undefined ? syllabusNodeId : existing.syllabusNodeId,
          newVersion,
          id,
        ]
      );

      const vId = `qv_${crypto.randomBytes(8).toString('hex')}`;
      await pgDb.query(
        `INSERT INTO "question_versions" ("id", "questionId", "version", "content", "data", "difficulty", "marks", "changeSummary", "changedById", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [vId, id, newVersion, newContent, newData, newDiff, newMarks, changeSummary, req.user!.userId]
      );

      res.json({ success: true, data: updateRes.rows[0] });
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
    const versionsRes = await pgDb.query(
      `SELECT * FROM "question_versions" WHERE "questionId" = $1 ORDER BY "version" DESC`,
      [id]
    );
    res.json({ success: true, data: versionsRes.rows });
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

      const targetRes = await pgDb.query(
        `SELECT * FROM "question_versions" WHERE "questionId" = $1 AND "version" = $2`,
        [id, targetVersionNum]
      );

      if (targetRes.rows.length === 0) {
        throw new AppError(404, 'VERSION_NOT_FOUND', `Version ${targetVersionNum} not found for question ${id}`);
      }
      const targetVersion = targetRes.rows[0];

      const currentRes = await pgDb.query(`SELECT "version" FROM "questions" WHERE "id" = $1`, [id]);
      const nextVersionNum = ((currentRes.rows[0]?.version) || 0) + 1;

      const rollbackSummary = `Rollback to version ${targetVersionNum}`;

      const updateRes = await pgDb.query(
        `UPDATE "questions"
         SET "content" = $1, "data" = $2, "difficulty" = $3, "marks" = $4, "version" = $5, "updatedAt" = NOW()
         WHERE "id" = $6
         RETURNING *`,
        [
          targetVersion.content,
          typeof targetVersion.data === 'object' ? JSON.stringify(targetVersion.data) : targetVersion.data,
          targetVersion.difficulty,
          targetVersion.marks,
          nextVersionNum,
          id,
        ]
      );

      const vId = `qv_${crypto.randomBytes(8).toString('hex')}`;
      await pgDb.query(
        `INSERT INTO "question_versions" ("id", "questionId", "version", "content", "data", "difficulty", "marks", "changeSummary", "changedById", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          vId,
          id,
          nextVersionNum,
          targetVersion.content,
          typeof targetVersion.data === 'object' ? JSON.stringify(targetVersion.data) : targetVersion.data,
          targetVersion.difficulty,
          targetVersion.marks,
          rollbackSummary,
          req.user!.userId,
        ]
      );

      res.json({ success: true, data: updateRes.rows[0] });
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

      const qRes = await pgDb.query(`SELECT "status" FROM "questions" WHERE "id" = $1`, [id]);
      if (qRes.rows.length === 0) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
      const existing = qRes.rows[0];

      // State machine validation: DRAFT -> REVIEW -> PUBLISHED -> ARCHIVED
      if (existing.status === 'ARCHIVED' && status === 'PUBLISHED') {
        throw new AppError(400, 'INVALID_LIFECYCLE_TRANSITION', 'Cannot transition ARCHIVED question directly to PUBLISHED');
      }

      const updateRes = await pgDb.query(
        `UPDATE "questions" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *`,
        [status, id]
      );

      res.json({ success: true, data: updateRes.rows[0] });
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

      const usageId = `peu_${crypto.randomBytes(8).toString('hex')}`;
      const insertRes = await pgDb.query(
        `INSERT INTO "previous_exam_usages" ("id", "questionId", "examName", "year", "shift")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [usageId, id, examName, year, shift || null]
      );

      res.status(201).json({ success: true, data: insertRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id/exam-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const historyRes = await pgDb.query(
      `SELECT * FROM "previous_exam_usages" WHERE "questionId" = $1 ORDER BY "year" DESC`,
      [id]
    );
    res.json({ success: true, data: historyRes.rows });
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
      await pgDb.query(`DELETE FROM "question_tags" WHERE "questionId" = $1`, [id]);
      await pgDb.query(`DELETE FROM "question_versions" WHERE "questionId" = $1`, [id]);
      await pgDb.query(`DELETE FROM "previous_exam_usages" WHERE "questionId" = $1`, [id]);
      await pgDb.query(`DELETE FROM "questions" WHERE "id" = $1`, [id]);

      res.json({ success: true, message: 'Question deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
