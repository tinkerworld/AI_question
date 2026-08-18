import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { createEnrollmentSchema } from '@repo/validation';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';
import crypto from 'crypto';

const router = Router();

router.use(authenticate);

// Enroll student in course
router.post(
  '/',
  validate(createEnrollmentSchema),
  auditLog('CREATE', 'enrollment'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, courseId } = req.body;
      const caller = req.user!;

      // Enforce caller security: Student can only enroll self, Admins can enroll anyone
      const isSelf = caller.userId === userId;
      const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'FORBIDDEN_ENROLLMENT', 'Forbidden: Cannot enroll another student');
      }

      const existingRes = await pgDb.query(
        `SELECT "id" FROM "enrollments" WHERE "userId" = $1 AND "courseId" = $2`,
        [userId, courseId]
      );

      if (existingRes.rows.length > 0) {
        throw new AppError(409, 'DUPLICATE_ENROLLMENT', 'User is already enrolled in this course');
      }

      const id = `enr_${crypto.randomBytes(8).toString('hex')}`;
      const insertRes = await pgDb.query(
        `INSERT INTO "enrollments" ("id", "userId", "courseId", "status", "enrolledAt")
         VALUES ($1, $2, $3, 'ACTIVE', NOW())
         RETURNING *`,
        [id, userId, courseId]
      );

      const enrollment = insertRes.rows[0];
      const courseRes = await pgDb.query(`SELECT * FROM "courses" WHERE "id" = $1`, [courseId]);
      enrollment.course = courseRes.rows[0] || null;

      res.status(201).json({ success: true, data: enrollment });
    } catch (err) {
      next(err);
    }
  }
);

// Unenroll / drop course
router.delete(
  '/',
  auditLog('DELETE', 'enrollment'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, courseId } = req.body;
      const caller = req.user!;

      const isSelf = caller.userId === userId;
      const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'FORBIDDEN_ENROLLMENT', 'Forbidden: Cannot unenroll another student');
      }

      await pgDb.query(
        `DELETE FROM "enrollments" WHERE "userId" = $1 AND "courseId" = $2`,
        [userId, courseId]
      );

      res.json({ success: true, message: 'Unenrolled successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// List student courses
router.get('/students/:id/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const caller = req.user!;

    const isSelf = caller.userId === id;
    const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

    if (!isSelf && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN_ACCESS', 'Forbidden: Cannot view another student\'s enrollments');
    }

    const enrRes = await pgDb.query(`SELECT * FROM "enrollments" WHERE "userId" = $1`, [id]);
    const enrollments = [];
    for (const enr of enrRes.rows) {
      const courseRes = await pgDb.query(`SELECT * FROM "courses" WHERE "id" = $1`, [enr.courseId]);
      enrollments.push({ ...enr, course: courseRes.rows[0] || null });
    }

    res.json({ success: true, data: enrollments });
  } catch (err) {
    next(err);
  }
});

export default router;
