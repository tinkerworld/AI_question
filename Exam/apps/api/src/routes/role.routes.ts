import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { createRoleSchema, updateRolePermissionsSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';
import crypto from 'crypto';

const router = Router();

router.use(authenticate);

// List roles & permissions
router.get(
  '/',
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rolesRes = await pgDb.query(`SELECT * FROM "roles" ORDER BY "name" ASC`);
      const formatted = [];

      for (const r of rolesRes.rows) {
        const permsRes = await pgDb.query(
          `SELECT p."key" FROM "permissions" p
           JOIN "role_permissions" rp ON rp."permissionId" = p."id"
           WHERE rp."roleId" = $1`,
          [r.id]
        );
        formatted.push({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          permissions: permsRes.rows.map((p: any) => p.key),
        });
      }

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

      const existingRes = await pgDb.query(`SELECT "id" FROM "roles" WHERE "name" = $1`, [name]);
      if (existingRes.rows.length > 0) {
        throw new AppError(400, 'ROLE_EXISTS', `Role '${name}' already exists`);
      }

      const id = `r_${crypto.randomBytes(8).toString('hex')}`;
      await pgDb.query(
        `INSERT INTO "roles" ("id", "name", "description", "isSystem", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, false, NOW(), NOW())`,
        [id, name, description || null]
      );

      const perms: string[] = [];
      if (permissionIds && Array.isArray(permissionIds)) {
        for (const permissionId of permissionIds) {
          const rpId = `rp_${crypto.randomBytes(8).toString('hex')}`;
          await pgDb.query(
            `INSERT INTO "role_permissions" ("id", "roleId", "permissionId") VALUES ($1, $2, $3)`,
            [rpId, id, permissionId]
          );
          const pRes = await pgDb.query(`SELECT "key" FROM "permissions" WHERE "id" = $1`, [permissionId]);
          if (pRes.rows.length > 0) {
            perms.push(pRes.rows[0].key);
          }
        }
      }

      res.status(201).json({
        success: true,
        data: {
          id,
          name,
          description,
          permissions: perms,
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

      const roleRes = await pgDb.query(`SELECT * FROM "roles" WHERE "id" = $1`, [id]);
      if (roleRes.rows.length === 0) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
      const role = roleRes.rows[0];

      await pgDb.query(`DELETE FROM "role_permissions" WHERE "roleId" = $1`, [id]);
      const perms: string[] = [];

      if (permissionIds && Array.isArray(permissionIds)) {
        for (const permissionId of permissionIds) {
          const rpId = `rp_${crypto.randomBytes(8).toString('hex')}`;
          await pgDb.query(
            `INSERT INTO "role_permissions" ("id", "roleId", "permissionId") VALUES ($1, $2, $3)`,
            [rpId, id, permissionId]
          );
          const pRes = await pgDb.query(`SELECT "key" FROM "permissions" WHERE "id" = $1`, [permissionId]);
          if (pRes.rows.length > 0) {
            perms.push(pRes.rows[0].key);
          }
        }
      }

      res.json({
        success: true,
        data: {
          id: role.id,
          name: role.name,
          permissions: perms,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
