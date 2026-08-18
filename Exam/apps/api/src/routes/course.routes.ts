import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { createCourseSchema, updateCourseSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';
import crypto from 'crypto';

const router = Router();

router.use(authenticate);

// List courses
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caller = req.user!;
    const isStudent = caller.roles.includes('STUDENT') && !caller.roles.includes('MAIN_ADMIN') && !caller.roles.includes('SUB_ADMIN');

    const statusFilter = req.query.status as string;
    const search = req.query.search as string;

    let query = `SELECT * FROM "courses" WHERE 1=1`;
    const params: any[] = [];

    if (isStudent) {
      params.push('PUBLISHED');
      query += ` AND "status" = $${params.length}`;
    } else if (statusFilter) {
      params.push(statusFilter);
      query += ` AND "status" = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND ("name" ILIKE $${params.length} OR "code" ILIKE $${params.length})`;
    }

    query += ` ORDER BY "createdAt" DESC`;
    const coursesRes = await pgDb.query(query, params);
    const courses = [];
    for (const c of coursesRes.rows) {
      const subRes = await pgDb.query(`SELECT * FROM "subjects" WHERE "courseId" = $1 ORDER BY "order" ASC`, [c.id]);
      courses.push({ ...c, subjects: subRes.rows });
    }

    res.json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
});

// Create course
router.post(
  '/',
  requirePermission(PERMISSIONS.COURSES_CREATE),
  validate(createCourseSchema),
  auditLog('CREATE', 'course'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, code, description, status = 'DRAFT', thumbnailUrl, durationMonths = 12 } = req.body;

      const existingRes = await pgDb.query(`SELECT "id" FROM "courses" WHERE "code" = $1`, [code]);
      if (existingRes.rows.length > 0) {
        throw new AppError(400, 'DUPLICATE_CODE', `Course code '${code}' already exists`);
      }

      const id = `c_${crypto.randomBytes(8).toString('hex')}`;
      const insertRes = await pgDb.query(
        `INSERT INTO "courses" ("id", "name", "code", "description", "status", "thumbnailUrl", "durationMonths", "createdById", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [id, name, code, description || null, status, thumbnailUrl || null, durationMonths, req.user!.userId]
      );

      res.status(201).json({ success: true, data: insertRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Get course by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const courseRes = await pgDb.query(`SELECT * FROM "courses" WHERE "id" = $1`, [id]);
    if (courseRes.rows.length === 0) {
      throw new AppError(404, 'COURSE_NOT_FOUND', `Course with ID ${id} not found`);
    }
    const course = courseRes.rows[0];
    const subRes = await pgDb.query(`SELECT * FROM "subjects" WHERE "courseId" = $1 ORDER BY "order" ASC`, [id]);
    const subjects = [];
    for (const s of subRes.rows) {
      const nodeRes = await pgDb.query(`SELECT * FROM "syllabus_nodes" WHERE "subjectId" = $1 ORDER BY "orderIndex" ASC`, [s.id]);
      subjects.push({ ...s, syllabusNodes: nodeRes.rows });
    }
    course.subjects = subjects;

    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
});

// Update course / state transition
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.COURSES_UPDATE),
  validate(updateCourseSchema),
  auditLog('UPDATE', 'course'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, description, status, thumbnailUrl, durationMonths } = req.body;

      const existingRes = await pgDb.query(`SELECT * FROM "courses" WHERE "id" = $1`, [id]);
      if (existingRes.rows.length === 0) {
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
      }
      const existing = existingRes.rows[0];

      // Valid state machine transitions: DRAFT -> PUBLISHED -> ARCHIVED
      if (status && status !== existing.status) {
        if (existing.status === 'ARCHIVED' && status === 'DRAFT') {
          throw new AppError(400, 'INVALID_TRANSITION', 'Cannot transition course from ARCHIVED back to DRAFT directly');
        }
      }

      const updatedName = name !== undefined ? name : existing.name;
      const updatedDesc = description !== undefined ? description : existing.description;
      const updatedStatus = status !== undefined ? status : existing.status;
      const updatedThumb = thumbnailUrl !== undefined ? thumbnailUrl : existing.thumbnailUrl;
      const updatedDur = durationMonths !== undefined ? durationMonths : existing.durationMonths;

      const updateRes = await pgDb.query(
        `UPDATE "courses"
         SET "name" = $1, "description" = $2, "status" = $3, "thumbnailUrl" = $4, "durationMonths" = $5, "updatedAt" = NOW()
         WHERE "id" = $6
         RETURNING *`,
        [updatedName, updatedDesc, updatedStatus, updatedThumb, updatedDur, id]
      );

      res.json({ success: true, data: updateRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Delete course
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.COURSES_DELETE),
  auditLog('DELETE', 'course'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await pgDb.query(`DELETE FROM "courses" WHERE "id" = $1`, [id]);
      res.json({ success: true, message: 'Course deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
