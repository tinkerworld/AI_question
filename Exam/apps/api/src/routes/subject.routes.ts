import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';
import { createSubjectSchema, updateSubjectSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

const router = Router({ mergeParams: true });

router.use(authenticate);

// List subjects for a course
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const subjects = await prisma.subject.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
    res.json({ success: true, data: subjects });
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
      const { name, code, description, credits, order } = req.body;

      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        throw new AppError(404, 'COURSE_NOT_FOUND', `Course ${courseId} not found`);
      }

      const existingCode = await prisma.subject.findUnique({
        where: {
          courseId_code: {
            courseId,
            code,
          },
        },
      });

      if (existingCode) {
        throw new AppError(400, 'DUPLICATE_SUBJECT_CODE', `Subject code '${code}' already exists in this course`);
      }

      const subject = await prisma.subject.create({
        data: {
          courseId,
          name,
          code,
          description,
          credits,
          order,
        },
      });

      res.status(201).json({ success: true, data: subject });
    } catch (err) {
      next(err);
    }
  }
);

// Get single subject
router.get('/subject/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { syllabusNodes: true },
    });

    if (!subject) {
      throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
    }

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

      const updated = await prisma.subject.update({
        where: { id },
        data: { name, description, credits, order },
      });

      res.json({ success: true, data: updated });
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
      await prisma.subject.delete({ where: { id } });
      res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
