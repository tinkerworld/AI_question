import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { createSubjectSchema, updateSubjectSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';
import crypto from 'crypto';

const router = Router({ mergeParams: true });

router.use(authenticate);

// List subjects for a course
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    let query = `SELECT * FROM "subjects"`;
    const params: any[] = [];
    if (courseId) {
      params.push(courseId);
      query += ` WHERE "courseId" = $1`;
    }
    query += ` ORDER BY "order" ASC`;
    const subjectsRes = await pgDb.query(query, params);
    res.json({ success: true, data: subjectsRes.rows });
  } catch (err) {
    next(err);
  }
});

// Create subject under a course
router.post(
  '/',
  requirePermission(PERMISSIONS.COURSES_CREATE),
  validate(createSubjectSchema),
  auditLog('CREATE', 'subject'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const { name, code, description, credits = 4, order = 0 } = req.body;

      const courseRes = await pgDb.query(`SELECT "id" FROM "courses" WHERE "id" = $1`, [courseId]);
      if (courseRes.rows.length === 0) {
        throw new AppError(404, 'COURSE_NOT_FOUND', `Course ${courseId} not found`);
      }

      const existingRes = await pgDb.query(`SELECT "id" FROM "subjects" WHERE "courseId" = $1 AND "code" = $2`, [courseId, code]);
      if (existingRes.rows.length > 0) {
        throw new AppError(400, 'DUPLICATE_SUBJECT_CODE', `Subject code '${code}' already exists in this course`);
      }

      const id = `sub_${crypto.randomBytes(8).toString('hex')}`;
      const insertRes = await pgDb.query(
        `INSERT INTO "subjects" ("id", "courseId", "name", "code", "description", "credits", "order", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [id, courseId, name, code, description || null, credits, order]
      );

      res.status(201).json({ success: true, data: insertRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Get single subject
router.get('/subject/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const subRes = await pgDb.query(`SELECT * FROM "subjects" WHERE "id" = $1`, [id]);
    if (subRes.rows.length === 0) {
      throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
    }
    const subject = subRes.rows[0];
    const nodeRes = await pgDb.query(`SELECT * FROM "syllabus_nodes" WHERE "subjectId" = $1 ORDER BY "orderIndex" ASC`, [id]);
    subject.syllabusNodes = nodeRes.rows;

    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

// Update subject
router.patch(
  '/subject/:id',
  requirePermission(PERMISSIONS.COURSES_UPDATE),
  validate(updateSubjectSchema),
  auditLog('UPDATE', 'subject'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, description, credits, order } = req.body;

      const subRes = await pgDb.query(`SELECT * FROM "subjects" WHERE "id" = $1`, [id]);
      if (subRes.rows.length === 0) {
        throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
      }
      const existing = subRes.rows[0];

      const updatedName = name !== undefined ? name : existing.name;
      const updatedDesc = description !== undefined ? description : existing.description;
      const updatedCredits = credits !== undefined ? credits : existing.credits;
      const updatedOrder = order !== undefined ? order : existing.order;

      const updateRes = await pgDb.query(
        `UPDATE "subjects"
         SET "name" = $1, "description" = $2, "credits" = $3, "order" = $4, "updatedAt" = NOW()
         WHERE "id" = $5
         RETURNING *`,
        [updatedName, updatedDesc, updatedCredits, updatedOrder, id]
      );

      res.json({ success: true, data: updateRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Delete subject
router.delete(
  '/subject/:id',
  requirePermission(PERMISSIONS.COURSES_DELETE),
  auditLog('DELETE', 'subject'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await pgDb.query(`DELETE FROM "subjects" WHERE "id" = $1`, [id]);
      res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
