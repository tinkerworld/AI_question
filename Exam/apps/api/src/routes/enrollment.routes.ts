import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';
import { createEnrollmentSchema } from '@repo/validation';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

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

      const existing = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId },
        },
      });

      if (existing) {
        throw new AppError(409, 'DUPLICATE_ENROLLMENT', 'User is already enrolled in this course');
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: 'ACTIVE',
        },
        include: { course: true },
      });

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

      await prisma.enrollment.delete({
        where: {
          userId_courseId: { userId, courseId },
        },
      });

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

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: id },
      include: { course: true },
    });

    res.json({ success: true, data: enrollments });
  } catch (err) {
    next(err);
  }
});

export default router;
