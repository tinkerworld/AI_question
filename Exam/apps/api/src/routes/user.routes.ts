import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@repo/database';
import { createUserSchema, updateUserSchema, userStatusSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

const router = Router();

// Apply auth to all user routes
router.use(authenticate);

// List users
router.get(
  '/',
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: { role: true },
          },
        },
      });

      const formatted = users.map((u) => ({
        ...u,
        roles: u.userRoles.map((ur) => ur.role.name),
        userRoles: undefined,
      }));

      res.json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }
);

// Create user
router.post(
  '/',
  requirePermission(PERMISSIONS.USERS_CREATE),
  validate(createUserSchema),
  auditLog('CREATE', 'user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, roleIds } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError(400, 'EMAIL_EXISTS', 'A user with this email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          userRoles: roleIds
            ? {
                create: roleIds.map((roleId: string) => ({ roleId })),
              }
            : undefined,
        },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          roles: user.userRoles.map((ur) => ur.role.name),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get user by ID (with IDOR ownership & permission check per Section 7 of Build Directive)
router.get(
  '/:id',
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const caller = req.user!;

      // Ownership vs. Permission check per Section 7 requirement:
      // Caller must have users.read permission AND caller can access if (a) caller is self, OR (b) caller is admin/sub-admin
      const isSelf = caller.userId === id;
      const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Cannot access resources belonging to another user');
      }

      const user = await prisma.user.findUnique({
        where: { id },
        include: { userRoles: { include: { role: true } } },
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', `User with ID ${id} not found`);
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          roles: user.userRoles.map((ur) => ur.role.name),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update user (with IDOR ownership & permission check per Section 7 of Build Directive)
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(updateUserSchema),
  auditLog('UPDATE', 'user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const caller = req.user!;

      // Section 7 Security Gate: IDOR Ownership vs Permission validation
      const isSelf = caller.userId === id;
      const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Cannot update resources belonging to another user');
      }

      const { firstName, lastName, status, roleIds } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          firstName,
          lastName,
          status,
        },
        include: { userRoles: { include: { role: true } } },
      });

      if (roleIds && isAdmin) {
        await prisma.userRole.deleteMany({ where: { userId: id } });
        await prisma.userRole.createMany({
          data: roleIds.map((roleId: string) => ({ userId: id, roleId })),
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete user (with IDOR ownership & permission check per Section 7 of Build Directive)
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.USERS_DELETE),
  auditLog('DELETE', 'user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const caller = req.user!;

      // Section 7 Security Gate: IDOR validation
      const isAdmin = caller.roles.includes('MAIN_ADMIN');
      if (!isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Only MAIN_ADMIN can delete user accounts');
      }

      await prisma.user.delete({ where: { id } });

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
