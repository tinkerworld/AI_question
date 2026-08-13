import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';
import { createCourseSchema, updateCourseSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

const router = Router();

router.use(authenticate);

// List courses
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caller = req.user!;
    const isStudent = caller.roles.includes('STUDENT') && !caller.roles.includes('MAIN_ADMIN') && !caller.roles.includes('SUB_ADMIN');

    const statusFilter = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};

    if (isStudent) {
      where.status = 'PUBLISHED';
    } else if (statusFilter) {
      where.status = statusFilter;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subjects: true,
      },
    });

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
      const { name, code, description, status, thumbnailUrl, durationMonths } = req.body;

      const existing = await prisma.course.findUnique({ where: { code } });
      if (existing) {
        throw new AppError(400, 'DUPLICATE_CODE', `Course code '${code}' already exists`);
      }

      const course = await prisma.course.create({
        data: {
          name,
          code,
          description,
          status,
          thumbnailUrl,
          durationMonths,
          createdById: req.user!.userId,
        },
      });

      res.status(201).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  }
);

// Get course by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        subjects: {
          include: {
            syllabusNodes: true,
          },
        },
      },
    });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', `Course with ID ${id} not found`);
    }

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

      const existing = await prisma.course.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
      }

      // Valid state machine transitions: DRAFT -> PUBLISHED -> ARCHIVED
      if (status && status !== existing.status) {
        if (existing.status === 'ARCHIVED' && status === 'DRAFT') {
          throw new AppError(400, 'INVALID_TRANSITION', 'Cannot transition course from ARCHIVED back to DRAFT directly');
        }
      }

      const updated = await prisma.course.update({
        where: { id },
        data: {
          name,
          description,
          status,
          thumbnailUrl,
          durationMonths,
        },
      });

      res.json({ success: true, data: updated });
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
      await prisma.course.delete({ where: { id } });
      res.json({ success: true, message: 'Course deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
