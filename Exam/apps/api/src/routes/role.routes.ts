import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';
import { createRoleSchema, updateRolePermissionsSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

const router = Router();

router.use(authenticate);

// List roles & permissions
router.get(
  '/',
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await prisma.role.findMany({
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });

      const formatted = roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.rolePermissions.map((rp) => rp.permission.key),
      }));

      res.json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }
);

// Create custom role
router.post(
  '/',
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validate(createRoleSchema),
  auditLog('CREATE', 'role'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, permissionIds } = req.body;

      const existing = await prisma.role.findUnique({ where: { name } });
      if (existing) {
        throw new AppError(400, 'ROLE_EXISTS', `Role '${name}' already exists`);
      }

      const role = await prisma.role.create({
        data: {
          name,
          description,
          rolePermissions: {
            create: permissionIds.map((permissionId: string) => ({ permissionId })),
          },
        },
        include: { rolePermissions: { include: { permission: true } } },
      });

      res.status(201).json({
        success: true,
        data: {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.rolePermissions.map((rp) => rp.permission.key),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update role permissions
router.patch(
  '/:id/permissions',
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validate(updateRolePermissionsSchema),
  auditLog('UPDATE', 'role_permissions'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;

      const role = await prisma.role.findUnique({ where: { id } });
      if (!role) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');

      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({ roleId: id, permissionId })),
      });

      const updated = await prisma.role.findUnique({
        where: { id },
        include: { rolePermissions: { include: { permission: true } } },
      });

      res.json({
        success: true,
        data: {
          id: updated!.id,
          name: updated!.name,
          permissions: updated!.rolePermissions.map((rp) => rp.permission.key),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
