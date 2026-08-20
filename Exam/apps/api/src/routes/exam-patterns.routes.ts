import { Router, Request, Response } from 'express';
import { pgDb } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import {
  createExamPatternSchema,
  updateExamPatternSchema,
  createExamPatternSectionSchema,
  updateExamPatternSectionSchema,
  reorderSectionsSchema,
  setSectionRulesSchema,
  setSectionTopicsSchema,
  setSectionDifficultySchema,
  setMarkingSchemeSchema,
  multiSubjectAllocationSchema,
} from '@repo/validation';

export const examPatternRouter = Router();

// Helper to recalculate total marks for an exam pattern
async function recalculatePatternTotalMarks(patternId: string): Promise<number> {
  const res = await pgDb.query(
    `SELECT COALESCE(SUM("totalMarks"), 0) as total FROM "exam_pattern_sections" WHERE "examPatternId" = $1`,
    [patternId]
  );
  const total = parseFloat(res.rows[0]?.total || '0');
  await pgDb.query(
    `UPDATE "exam_patterns" SET "totalMarks" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
    [total, patternId]
  );
  return total;
}

// -----------------------------------------------------------------------------
// Feature 4.1 — Exam Pattern CRUD
// -----------------------------------------------------------------------------

// POST /api/v1/exam-patterns — Create Pattern
examPatternRouter.post(
  '/',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const body = createExamPatternSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      const patternId = `pat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      let validCreatedById = null;
      if (userId) {
        const userCheck = await pgDb.query(`SELECT "id" FROM "users" WHERE "id" = $1`, [userId]);
        if (userCheck.rows.length > 0) validCreatedById = userId;
      }

      // Create pattern
      const insertQuery = `
        INSERT INTO "exam_patterns"
        ("id", "name", "courseId", "levelId", "durationMinutes", "description", "status", "type", "totalMarks", "createdById", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', $7, 0.0, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const patternRes = await pgDb.query(insertQuery, [
        patternId,
        body.name,
        body.courseId,
        body.levelId || null,
        body.durationMinutes || 60,
        body.description || null,
        body.type || 'SINGLE',
        validCreatedById,
      ]);

      const pattern = patternRes.rows[0];

      // Link subjects if provided
      if (body.subjectIds && Array.isArray(body.subjectIds) && body.subjectIds.length > 0) {
        for (const subId of body.subjectIds) {
          await pgDb.query(
            `INSERT INTO "exam_pattern_subjects" ("examPatternId", "subjectId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [patternId, subId]
          );
        }
      }

      // Fetch linked subjects
      const subRes = await pgDb.query(
        `SELECT "subjectId", "targetMarks" FROM "exam_pattern_subjects" WHERE "examPatternId" = $1`,
        [patternId]
      );
      pattern.subjects = subRes.rows;

      res.status(201).json({ success: true, data: pattern });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/exam-patterns — List Patterns
examPatternRouter.get(
  '/',
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId, status, type, search } = req.query;
      let query = `SELECT p.*, c.name as "courseName" FROM "exam_patterns" p LEFT JOIN "courses" c ON p."courseId" = c.id WHERE 1=1`;
      const params: any[] = [];

      if (courseId) {
        params.push(courseId);
        query += ` AND p."courseId" = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND p."status" = $${params.length}`;
      }
      if (type) {
        params.push(type);
        query += ` AND p."type" = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        query += ` AND p."name" ILIKE $${params.length}`;
      }

      query += ` ORDER BY p."createdAt" DESC`;

      const result = await pgDb.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/exam-patterns/:id — Get Pattern Details
examPatternRouter.get(
  '/:id',
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const patternRes = await pgDb.query(`SELECT * FROM "exam_patterns" WHERE "id" = $1`, [id]);
      if (patternRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Exam Pattern ${id} not found` });
        return;
      }

      const pattern = patternRes.rows[0];

      // Subjects
      const subRes = await pgDb.query(
        `SELECT eps."subjectId", eps."targetMarks", s.name as "subjectName", s.code as "subjectCode"
         FROM "exam_pattern_subjects" eps
         LEFT JOIN "subjects" s ON eps."subjectId" = s.id
         WHERE eps."examPatternId" = $1`,
        [id]
      );
      pattern.subjects = subRes.rows;

      // Sections with rules & topics
      const secRes = await pgDb.query(
        `SELECT * FROM "exam_pattern_sections" WHERE "examPatternId" = $1 ORDER BY "sequenceOrder" ASC`,
        [id]
      );
      
      const sections = secRes.rows;
      for (const sec of sections) {
        const ruleRes = await pgDb.query(`SELECT * FROM "exam_pattern_section_rules" WHERE "sectionId" = $1`, [sec.id]);
        sec.rules = ruleRes.rows[0] || null;

        const topicRes = await pgDb.query(`SELECT * FROM "exam_pattern_section_topics" WHERE "sectionId" = $1`, [sec.id]);
        sec.topics = topicRes.rows;

        const diffRes = await pgDb.query(`SELECT * FROM "exam_pattern_section_difficulties" WHERE "sectionId" = $1`, [sec.id]);
        sec.difficulties = diffRes.rows;
      }
      pattern.sections = sections;

      res.json({ success: true, data: pattern });
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// PATCH /api/v1/exam-patterns/:id — Update Pattern
examPatternRouter.patch(
  '/:id',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = updateExamPatternSchema.parse(req.body);

      const existingRes = await pgDb.query(`SELECT * FROM "exam_patterns" WHERE "id" = $1`, [id]);
      if (existingRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Exam Pattern ${id} not found` });
        return;
      }

      const existing = existingRes.rows[0];

      // Status transition checks
      if (body.status && body.status !== existing.status) {
        // Valid transitions: DRAFT -> PUBLISHED, PUBLISHED -> ARCHIVED
        if (existing.status === 'ARCHIVED' && body.status === 'DRAFT') {
          res.status(400).json({ success: false, errorCode: 'INVALID_STATUS', message: 'Cannot transition ARCHIVED pattern back to DRAFT' });
          return;
        }
      }

      // Feature 4.9: If pattern is PUBLISHED and edited structural details, create new version snapshot
      let newVersion = existing.version;
      let newPatternId = id;

      if (existing.status === 'PUBLISHED' && (body.name || body.durationMinutes || body.type)) {
        // Save current entity version
        await pgDb.query(
          `INSERT INTO "entity_versions" ("id", "entityType", "entityId", "version", "data", "changeSummary", "createdBy", "createdAt")
           VALUES ($1, 'ExamPattern', $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            `ev_pat_${Date.now()}`,
            id,
            existing.version,
            JSON.stringify(existing),
            'Published Exam Pattern Modified — New Version Created',
            (req as any).user?.userId || 'system',
          ]
        );
        newVersion = existing.version + 1;
      }

      const fields: string[] = [];
      const values: any[] = [];

      if (body.name) { values.push(body.name); fields.push(`"name" = $${values.length}`); }
      if (body.courseId) { values.push(body.courseId); fields.push(`"courseId" = $${values.length}`); }
      if (body.levelId !== undefined) { values.push(body.levelId); fields.push(`"levelId" = $${values.length}`); }
      if (body.durationMinutes) { values.push(body.durationMinutes); fields.push(`"durationMinutes" = $${values.length}`); }
      if (body.description !== undefined) { values.push(body.description); fields.push(`"description" = $${values.length}`); }
      if (body.status) { values.push(body.status); fields.push(`"status" = $${values.length}`); }
      if (body.type) { values.push(body.type); fields.push(`"type" = $${values.length}`); }
      if (newVersion !== existing.version) { values.push(newVersion); fields.push(`"version" = $${values.length}`); }

      fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `UPDATE "exam_patterns" SET ${fields.join(', ')} WHERE "id" = $${values.length} RETURNING *`;
      const updateRes = await pgDb.query(updateQuery, values);

      // Subject link updates
      if (body.subjectIds && Array.isArray(body.subjectIds)) {
        await pgDb.query(`DELETE FROM "exam_pattern_subjects" WHERE "examPatternId" = $1`, [id]);
        for (const subId of body.subjectIds) {
          await pgDb.query(
            `INSERT INTO "exam_pattern_subjects" ("examPatternId", "subjectId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, subId]
          );
        }
      }

      res.json({ success: true, data: updateRes.rows[0] });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// DELETE /api/v1/exam-patterns/:id — Delete / Archive Pattern
examPatternRouter.delete(
  '/:id',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const existingRes = await pgDb.query(`SELECT * FROM "exam_patterns" WHERE "id" = $1`, [id]);
      if (existingRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Exam Pattern ${id} not found` });
        return;
      }

      const existing = existingRes.rows[0];
      if (existing.status === 'PUBLISHED') {
        res.status(409).json({ success: false, errorCode: 'CONFLICT', message: 'Cannot delete a PUBLISHED exam pattern. Archive it instead.' });
        return;
      }

      // Cascade delete all child entities of the pattern
      await pgDb.query(
        `DELETE FROM "exam_pattern_section_topics" WHERE "sectionId" IN (SELECT "id" FROM "exam_pattern_sections" WHERE "examPatternId" = $1)`,
        [id]
      );
      await pgDb.query(
        `DELETE FROM "exam_pattern_section_difficulties" WHERE "sectionId" IN (SELECT "id" FROM "exam_pattern_sections" WHERE "examPatternId" = $1)`,
        [id]
      );
      await pgDb.query(
        `DELETE FROM "exam_pattern_section_rules" WHERE "sectionId" IN (SELECT "id" FROM "exam_pattern_sections" WHERE "examPatternId" = $1)`,
        [id]
      );
      await pgDb.query(`DELETE FROM "exam_pattern_sections" WHERE "examPatternId" = $1`, [id]);
      await pgDb.query(`DELETE FROM "exam_pattern_subjects" WHERE "examPatternId" = $1`, [id]);
      await pgDb.query(`DELETE FROM "exam_patterns" WHERE "id" = $1`, [id]);

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// Feature 4.2 — Exam Pattern Sections
// -----------------------------------------------------------------------------

// POST /api/v1/exam-patterns/:id/sections — Add Section
examPatternRouter.post(
  '/:id/sections',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = createExamPatternSectionSchema.parse(req.body);

      if (body.numQuestions <= 0) {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'numQuestions must be greater than 0' });
        return;
      }

      const secId = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const totalMarks = body.numQuestions * body.marksPerQuestion;
      const marksCorrect = body.marksCorrect !== undefined ? body.marksCorrect : body.marksPerQuestion;
      const marksWrong = body.marksWrong !== undefined ? body.marksWrong : 0.0;
      const marksUnattempted = body.marksUnattempted !== undefined ? body.marksUnattempted : 0.0;

      const insertRes = await pgDb.query(
        `INSERT INTO "exam_pattern_sections"
         ("id", "examPatternId", "subjectId", "name", "sequenceOrder", "numQuestions", "marksPerQuestion", "totalMarks", "marksCorrect", "marksWrong", "marksUnattempted", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          secId,
          id,
          body.subjectId || null,
          body.name,
          body.sequenceOrder || 0,
          body.numQuestions,
          body.marksPerQuestion,
          totalMarks,
          marksCorrect,
          marksWrong,
          marksUnattempted,
        ]
      );

      const patternTotal = await recalculatePatternTotalMarks(id);
      const section = insertRes.rows[0];

      res.status(201).json({ success: true, data: section, meta: { patternTotalMarks: patternTotal } });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/exam-patterns/:id/sections — List Sections
examPatternRouter.get(
  '/:id/sections',
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await pgDb.query(
        `SELECT * FROM "exam_pattern_sections" WHERE "examPatternId" = $1 ORDER BY "sequenceOrder" ASC`,
        [id]
      );
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// PATCH /api/v1/exam-patterns/:id/sections/reorder — Reorder Sections
examPatternRouter.patch(
  '/:id/sections/reorder',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = reorderSectionsSchema.parse(req.body);

      // Verify all sectionIds belong to pattern
      const secCheck = await pgDb.query(
        `SELECT "id" FROM "exam_pattern_sections" WHERE "examPatternId" = $1`,
        [id]
      );
      const validIds = secCheck.rows.map((r: any) => r.id);
      const allBelong = body.sectionIds.every((secId) => validIds.includes(secId));

      if (!allBelong) {
        res.status(400).json({ success: false, errorCode: 'INVALID_SECTION', message: 'One or more section IDs do not belong to this exam pattern' });
        return;
      }

      for (let idx = 0; idx < body.sectionIds.length; idx++) {
        await pgDb.query(
          `UPDATE "exam_pattern_sections" SET "sequenceOrder" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
          [idx, body.sectionIds[idx]]
        );
      }

      res.json({ success: true, message: 'Sections reordered successfully' });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// PATCH /api/v1/exam-patterns/:id/sections/:sectionId — Update Section
examPatternRouter.patch(
  '/:id/sections/:sectionId',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, sectionId } = req.params;
      const body = updateExamPatternSectionSchema.parse(req.body);

      const secRes = await pgDb.query(
        `SELECT * FROM "exam_pattern_sections" WHERE "id" = $1 AND "examPatternId" = $2`,
        [sectionId, id]
      );
      if (secRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Section ${sectionId} not found` });
        return;
      }

      const existing = secRes.rows[0];
      const numQuestions = body.numQuestions !== undefined ? body.numQuestions : existing.numQuestions;
      const marksPerQuestion = body.marksPerQuestion !== undefined ? body.marksPerQuestion : existing.marksPerQuestion;
      const totalMarks = numQuestions * marksPerQuestion;

      const fields: string[] = [];
      const values: any[] = [];

      if (body.name) { values.push(body.name); fields.push(`"name" = $${values.length}`); }
      if (body.subjectId !== undefined) { values.push(body.subjectId); fields.push(`"subjectId" = $${values.length}`); }
      if (body.sequenceOrder !== undefined) { values.push(body.sequenceOrder); fields.push(`"sequenceOrder" = $${values.length}`); }
      
      values.push(numQuestions); fields.push(`"numQuestions" = $${values.length}`);
      values.push(marksPerQuestion); fields.push(`"marksPerQuestion" = $${values.length}`);
      values.push(totalMarks); fields.push(`"totalMarks" = $${values.length}`);

      if (body.marksCorrect !== undefined) { values.push(body.marksCorrect); fields.push(`"marksCorrect" = $${values.length}`); }
      if (body.marksWrong !== undefined) { values.push(body.marksWrong); fields.push(`"marksWrong" = $${values.length}`); }
      if (body.marksUnattempted !== undefined) { values.push(body.marksUnattempted); fields.push(`"marksUnattempted" = $${values.length}`); }

      fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
      values.push(sectionId);

      const updateRes = await pgDb.query(
        `UPDATE "exam_pattern_sections" SET ${fields.join(', ')} WHERE "id" = $${values.length} RETURNING *`,
        values
      );

      const patternTotal = await recalculatePatternTotalMarks(id);
      res.json({ success: true, data: updateRes.rows[0], meta: { patternTotalMarks: patternTotal } });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// DELETE /api/v1/exam-patterns/:id/sections/:sectionId — Delete Section
examPatternRouter.delete(
  '/:id/sections/:sectionId',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, sectionId } = req.params;
      await pgDb.query(`DELETE FROM "exam_pattern_sections" WHERE "id" = $1 AND "examPatternId" = $2`, [sectionId, id]);
      await recalculatePatternTotalMarks(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// Feature 4.3 — Section Question Rules
// -----------------------------------------------------------------------------

// PUT /api/v1/exam-patterns/:id/sections/:sectionId/rules — Set Rules
examPatternRouter.put(
  '/:id/sections/:sectionId/rules',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sectionId } = req.params;
      const body = setSectionRulesSchema.parse(req.body);

      // Validate question types if specified
      if (body.allowedQuestionTypes && body.allowedQuestionTypes.includes('UNKNOWN')) {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'Invalid question type specified in section rules' });
        return;
      }

      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const upsertQuery = `
        INSERT INTO "exam_pattern_section_rules"
        ("id", "sectionId", "allowedQuestionTypes", "allowedCategories", "selectionMode", "sourceFilters", "tags", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("sectionId") DO UPDATE SET
          "allowedQuestionTypes" = EXCLUDED."allowedQuestionTypes",
          "allowedCategories" = EXCLUDED."allowedCategories",
          "selectionMode" = EXCLUDED."selectionMode",
          "sourceFilters" = EXCLUDED."sourceFilters",
          "tags" = EXCLUDED."tags",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await pgDb.query(upsertQuery, [
        ruleId,
        sectionId,
        body.allowedQuestionTypes ? JSON.stringify(body.allowedQuestionTypes) : null,
        body.allowedCategories ? JSON.stringify(body.allowedCategories) : null,
        body.selectionMode || 'RANDOM',
        body.sourceFilters ? JSON.stringify(body.sourceFilters) : null,
        body.tags ? JSON.stringify(body.tags) : null,
      ]);

      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/exam-patterns/:id/sections/:sectionId/rules — Get Rules
examPatternRouter.get(
  '/:id/sections/:sectionId/rules',
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sectionId } = req.params;
      const result = await pgDb.query(`SELECT * FROM "exam_pattern_section_rules" WHERE "sectionId" = $1`, [sectionId]);
      res.json({ success: true, data: result.rows[0] || null });
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// Feature 4.4 — Topic Distribution
// -----------------------------------------------------------------------------

// PUT /api/v1/exam-patterns/:id/sections/:sectionId/topics — Set Topic Distribution
examPatternRouter.put(
  ['/:id/sections/:sectionId/topics', '/:id/sections/:sectionId/topics-distribution'],
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sectionId } = req.params;
      const body = setSectionTopicsSchema.parse(req.body);

      const secRes = await pgDb.query(`SELECT * FROM "exam_pattern_sections" WHERE "id" = $1`, [sectionId]);
      if (secRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Section ${sectionId} not found` });
        return;
      }

      const section = secRes.rows[0];
      const sumValue = body.topics.reduce((acc, t) => acc + t.value, 0);

      if (body.distributionType === 'COUNT') {
        if (sumValue !== section.numQuestions) {
          res.status(400).json({
            success: false,
            errorCode: 'VALIDATION_ERROR',
            message: `Sum of topic counts (${sumValue}) does not match section required question count (${section.numQuestions})`,
          });
          return;
        }
      } else if (body.distributionType === 'PERCENT') {
        const EPSILON = 0.01;
        if (Math.abs(sumValue - 100) > EPSILON) {
          res.status(400).json({
            success: false,
            errorCode: 'VALIDATION_ERROR',
            message: `Sum of topic percentages (${sumValue}%) must equal 100%`,
          });
          return;
        }
      }

      // Clear existing & insert new topics
      await pgDb.query(`DELETE FROM "exam_pattern_section_topics" WHERE "sectionId" = $1`, [sectionId]);

      for (const t of body.topics) {
        const topId = `top_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await pgDb.query(
          `INSERT INTO "exam_pattern_section_topics" ("id", "sectionId", "topicId", "distributionType", "value", "createdAt")
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [topId, sectionId, t.topicId, body.distributionType, t.value]
        );
      }

      const result = await pgDb.query(`SELECT * FROM "exam_pattern_section_topics" WHERE "sectionId" = $1`, [sectionId]);
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/exam-patterns/:id/sections/:sectionId/topics — Get Topic Distribution
examPatternRouter.get(
  ['/:id/sections/:sectionId/topics', '/:id/sections/:sectionId/topics-distribution'],
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sectionId } = req.params;
      const result = await pgDb.query(`SELECT * FROM "exam_pattern_section_topics" WHERE "sectionId" = $1`, [sectionId]);
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// Feature 4.5 — Difficulty Distribution
// -----------------------------------------------------------------------------

// PUT /api/v1/exam-patterns/:id/sections/:sectionId/difficulty — Set Difficulty Distribution
examPatternRouter.put(
  ['/:id/sections/:sectionId/difficulty', '/:id/sections/:sectionId/difficulties', '/:id/sections/:sectionId/difficulties-distribution'],
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sectionId } = req.params;
      const body = setSectionDifficultySchema.parse(req.body);

      const secRes = await pgDb.query(`SELECT * FROM "exam_pattern_sections" WHERE "id" = $1`, [sectionId]);
      if (secRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Section ${sectionId} not found` });
        return;
      }

      const section = secRes.rows[0];

      if (!body.isAutomatic && body.difficulties && body.difficulties.length > 0) {
        const sumValue = body.difficulties.reduce((acc, d) => acc + d.value, 0);
        if (body.distributionType === 'COUNT') {
          if (sumValue !== section.numQuestions) {
            res.status(400).json({
              success: false,
              errorCode: 'VALIDATION_ERROR',
              message: `Sum of difficulty counts (${sumValue}) does not match section required question count (${section.numQuestions})`,
            });
            return;
          }
        } else if (body.distributionType === 'PERCENT') {
          const EPSILON = 0.01;
          if (Math.abs(sumValue - 100) > EPSILON) {
            res.status(400).json({
              success: false,
              errorCode: 'VALIDATION_ERROR',
              message: `Sum of difficulty percentages (${sumValue}%) must equal 100%`,
            });
            return;
          }
        }
      }

      // Clear existing & insert new difficulty distribution
      await pgDb.query(`DELETE FROM "exam_pattern_section_difficulties" WHERE "sectionId" = $1`, [sectionId]);

      if (!body.isAutomatic && body.difficulties) {
        for (const d of body.difficulties) {
          const diffId = `diff_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          await pgDb.query(
            `INSERT INTO "exam_pattern_section_difficulties" ("id", "sectionId", "difficultyLevel", "distributionType", "value", "isAutomatic", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [diffId, sectionId, d.difficultyLevel, body.distributionType || 'COUNT', d.value, false]
          );
        }
      }

      const result = await pgDb.query(`SELECT * FROM "exam_pattern_section_difficulties" WHERE "sectionId" = $1`, [sectionId]);
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/exam-patterns/:id/sections/:sectionId/difficulty — Get Difficulty Distribution
examPatternRouter.get(
  ['/:id/sections/:sectionId/difficulty', '/:id/sections/:sectionId/difficulties', '/:id/sections/:sectionId/difficulties-distribution'],
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sectionId } = req.params;
      const result = await pgDb.query(`SELECT * FROM "exam_pattern_section_difficulties" WHERE "sectionId" = $1`, [sectionId]);
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// Feature 4.6 — Negative Marking Configuration
// -----------------------------------------------------------------------------

// PUT /api/v1/exam-patterns/:id/sections/:sectionId/marking — Set Marking Scheme
examPatternRouter.put(
  '/:id/sections/:sectionId/marking',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, sectionId } = req.params;
      const body = setMarkingSchemeSchema.parse(req.body);

      const secRes = await pgDb.query(`SELECT * FROM "exam_pattern_sections" WHERE "id" = $1 AND "examPatternId" = $2`, [sectionId, id]);
      if (secRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Section ${sectionId} not found` });
        return;
      }

      const section = secRes.rows[0];
      if (body.marksCorrect !== section.marksPerQuestion) {
        res.status(400).json({
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: `marksCorrect (${body.marksCorrect}) must match section marksPerQuestion (${section.marksPerQuestion})`,
        });
        return;
      }

      const updateRes = await pgDb.query(
        `UPDATE "exam_pattern_sections"
         SET "marksCorrect" = $1, "marksWrong" = $2, "marksUnattempted" = $3, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $4 RETURNING *`,
        [body.marksCorrect, body.marksWrong, body.marksUnattempted || 0.0, sectionId]
      );

      res.json({ success: true, data: updateRes.rows[0] });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// Feature 4.7 — Multi-Subject Allocation
// -----------------------------------------------------------------------------

// PUT /api/v1/exam-patterns/:id/subjects-allocation — Set Multi-Subject Allocation
examPatternRouter.put(
  '/:id/subjects-allocation',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = multiSubjectAllocationSchema.parse(req.body);

      const patternRes = await pgDb.query(`SELECT * FROM "exam_patterns" WHERE "id" = $1`, [id]);
      if (patternRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Exam Pattern ${id} not found` });
        return;
      }

      // Update subject target marks
      for (const subAlloc of body.subjectAllocations) {
        await pgDb.query(
          `INSERT INTO "exam_pattern_subjects" ("examPatternId", "subjectId", "targetMarks")
           VALUES ($1, $2, $3)
           ON CONFLICT ("examPatternId", "subjectId") DO UPDATE SET "targetMarks" = EXCLUDED."targetMarks"`,
          [id, subAlloc.subjectId, subAlloc.targetMarks || null]
        );
      }

      // Update section to subject mappings
      if (body.sectionSubjectMappings) {
        for (const map of body.sectionSubjectMappings) {
          await pgDb.query(
            `UPDATE "exam_pattern_sections" SET "subjectId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2 AND "examPatternId" = $3`,
            [map.subjectId, map.sectionId, id]
          );
        }
      }

      const subRes = await pgDb.query(
        `SELECT eps.*, s.name as "subjectName" FROM "exam_pattern_subjects" eps LEFT JOIN "subjects" s ON eps."subjectId" = s.id WHERE eps."examPatternId" = $1`,
        [id]
      );

      res.json({ success: true, data: subRes.rows });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// Feature 4.8 — Exam Pattern Validation Engine
// -----------------------------------------------------------------------------

// POST /api/v1/exam-patterns/:id/validate — Run Validation Engine
examPatternRouter.post(
  '/:id/validate',
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const patternRes = await pgDb.query(`SELECT * FROM "exam_patterns" WHERE "id" = $1`, [id]);
      if (patternRes.rows.length === 0) {
        res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: `Exam Pattern ${id} not found` });
        return;
      }

      const pattern = patternRes.rows[0];
      const secRes = await pgDb.query(`SELECT * FROM "exam_pattern_sections" WHERE "examPatternId" = $1`, [id]);
      const sections = secRes.rows;

      let isValid = true;
      const errors: string[] = [];
      const warnings: string[] = [];
      const details: any[] = [];

      if (sections.length === 0) {
        isValid = false;
        errors.push('Exam pattern has no sections defined.');
      }

      for (const sec of sections) {
        // Query available questions in Question Bank matching section criteria
        let qQuery = `SELECT COUNT(*) as cnt FROM "questions" WHERE "status" = 'PUBLISHED'`;
        const qParams: any[] = [];

        if (sec.subjectId) {
          qParams.push(sec.subjectId);
          qQuery += ` AND ("subjectId" = $${qParams.length} OR "subjectId" IS NULL)`;
        }

        const countRes = await pgDb.query(qQuery, qParams);
        const avail = parseInt(countRes.rows[0]?.cnt || '0', 10);
        const reqCount = sec.numQuestions;

        if (avail < reqCount) {
          isValid = false;
          const msg = `Section "${sec.name}" requires ${reqCount} questions, but only ${avail} available in Question Bank.`;
          errors.push(msg);
          details.push({
            sectionId: sec.id,
            sectionName: sec.name,
            requiredCount: reqCount,
            availableCount: avail,
            status: 'DEFICIT',
            message: msg,
          });
        } else {
          details.push({
            sectionId: sec.id,
            sectionName: sec.name,
            requiredCount: reqCount,
            availableCount: avail,
            status: 'OK',
          });
        }
      }

      res.json({
        success: true,
        data: {
          isValid,
          errors,
          warnings,
          details,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// Feature 4.9 — Exam Pattern Versioning
// -----------------------------------------------------------------------------

// GET /api/v1/exam-patterns/:id/versions — Version History
examPatternRouter.get(
  '/:id/versions',
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const evRes = await pgDb.query(
        `SELECT * FROM "entity_versions" WHERE "entityType" = 'ExamPattern' AND "entityId" = $1 ORDER BY "version" DESC`,
        [id]
      );
      res.json({ success: true, data: evRes.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: err.message });
    }
  }
);
