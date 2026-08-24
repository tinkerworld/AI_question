import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { pgDb } from '@repo/database';
import { createUserSchema, updateUserSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';
import crypto from 'crypto';

const router = Router();

// Apply auth to all user routes
router.use(authenticate);

function inferUserChangeSummary(
  existing: { firstName?: string; lastName?: string; status?: string; roles?: string[] },
  updates: { firstName?: string; lastName?: string; status?: string; newRoles?: string[] }
): string {
  const changes: string[] = [];

  if (updates.firstName !== undefined && updates.firstName !== existing.firstName) {
    changes.push(`First name changed '${existing.firstName || ''}' -> '${updates.firstName}'`);
  }

  if (updates.lastName !== undefined && updates.lastName !== existing.lastName) {
    changes.push(`Last name changed '${existing.lastName || ''}' -> '${updates.lastName}'`);
  }

  if (updates.status !== undefined && updates.status !== existing.status) {
    changes.push(`Status changed ${existing.status} -> ${updates.status}`);
  }

  if (updates.newRoles !== undefined) {
    const oldRolesStr = (existing.roles || []).slice().sort().join(', ');
    const newRolesStr = (updates.newRoles || []).slice().sort().join(', ');
    if (oldRolesStr !== newRolesStr) {
      changes.push(`Role changed from ${oldRolesStr || 'None'} to ${newRolesStr || 'None'}`);
    }
  }

  return changes.length > 0 ? changes.join(', ') : 'User profile updated';
}

// List users
router.get(
  '/',
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usersRes = await pgDb.query(`SELECT "id", "email", "firstName", "lastName", "status", "createdAt", "updatedAt" FROM "users" ORDER BY "createdAt" DESC`);
      const formatted = [];

      for (const u of usersRes.rows as any[]) {
        const rolesRes = await pgDb.query(
          `SELECT r."name" FROM "roles" r
           JOIN "user_roles" ur ON ur."roleId" = r."id"
           WHERE ur."userId" = $1`,
          [u.id]
        );
        formatted.push({
          ...u,
          roles: (rolesRes.rows as any[]).map((r: any) => r.name),
        });
      }

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

      const existingRes = await pgDb.query(`SELECT "id" FROM "users" WHERE "email" = $1`, [email]);
      if (existingRes.rows.length > 0) {
        throw new AppError(400, 'EMAIL_EXISTS', 'A user with this email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const id = `usr_${crypto.randomBytes(8).toString('hex')}`;

      await pgDb.query(
        `INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())`,
        [id, email, passwordHash, firstName, lastName]
      );

      const roles: string[] = [];
      if (roleIds && Array.isArray(roleIds)) {
        for (const roleId of roleIds) {
          await pgDb.query(
            `INSERT INTO "user_roles" ("userId", "roleId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, roleId]
          );
          const rRes = await pgDb.query(`SELECT "name" FROM "roles" WHERE "id" = $1`, [roleId]);
          if (rRes.rows.length > 0) {
            roles.push((rRes.rows[0] as any).name);
          }
        }
      }

      const userPayload = {
        id,
        email,
        firstName,
        lastName,
        status: 'ACTIVE',
        roles,
      };

      // Record baseline version 1 in entity_versions
      const evId = `ev_usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      await pgDb.query(
        `INSERT INTO "entity_versions" ("id", "entityType", "entityId", "version", "data", "changeSummary", "createdBy", "createdAt")
         VALUES ($1, 'User', $2, 1, $3, $4, $5, NOW())`,
        [
          evId,
          id,
          JSON.stringify(userPayload),
          'User account created',
          req.user?.userId || id,
        ]
      );

      res.status(201).json({
        success: true,
        data: userPayload,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature: User Version History & Rollback (ADR-010)
// ----------------------------------------------------------------------------

// GET /api/v1/users/:id/versions — Version History
router.get(
  '/:id/versions',
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const caller = req.user!;

      const isSelf = caller.userId === id;
      const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Cannot access resources belonging to another user');
      }

      const userRes = await pgDb.query(
        `SELECT "id", "email", "firstName", "lastName", "status", "createdAt", "updatedAt" FROM "users" WHERE "id" = $1`,
        [id]
      );
      if (userRes.rows.length === 0) {
        throw new AppError(404, 'USER_NOT_FOUND', `User with ID ${id} not found`);
      }

      let evRes = await pgDb.query(
        `SELECT * FROM "entity_versions" WHERE "entityType" = 'User' AND "entityId" = $1 ORDER BY "version" DESC`,
        [id]
      );

      // If no version rows exist yet for an existing seeded user, create baseline version 1
      if (evRes.rows.length === 0) {
        const u = userRes.rows[0];
        const rolesRes = await pgDb.query(
          `SELECT r."name" FROM "roles" r JOIN "user_roles" ur ON ur."roleId" = r."id" WHERE ur."userId" = $1`,
          [id]
        );
        const roles = rolesRes.rows.map((r: any) => r.name);
        const baselineData = {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          status: u.status,
          roles,
        };

        const evId = `ev_usr_${Date.now()}_init`;
        await pgDb.query(
          `INSERT INTO "entity_versions" ("id", "entityType", "entityId", "version", "data", "changeSummary", "createdBy", "createdAt")
           VALUES ($1, 'User', $2, 1, $3, $4, $5, NOW()) ON CONFLICT DO NOTHING`,
          [
            evId,
            id,
            JSON.stringify(baselineData),
            'Initial baseline version',
            caller.userId,
          ]
        );

        evRes = await pgDb.query(
          `SELECT * FROM "entity_versions" WHERE "entityType" = 'User' AND "entityId" = $1 ORDER BY "version" DESC`,
          [id]
        );
      }

      res.json({ success: true, data: evRes.rows });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/users/:id/versions/:version/rollback — Rollback to past version
router.post(
  '/:id/versions/:version/rollback',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  auditLog('ROLLBACK', 'user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, version } = req.params;
      const caller = req.user!;

      const isSelf = caller.userId === id;
      const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Cannot update resources belonging to another user');
      }

      const targetVersionNum = parseInt(version, 10);
      const targetRes = await pgDb.query(
        `SELECT * FROM "entity_versions" WHERE "entityType" = 'User' AND "entityId" = $1 AND "version" = $2`,
        [id, targetVersionNum]
      );

      if (targetRes.rows.length === 0) {
        throw new AppError(404, 'VERSION_NOT_FOUND', `Version ${targetVersionNum} not found for user ${id}`);
      }

      const targetData = typeof targetRes.rows[0].data === 'string'
        ? JSON.parse(targetRes.rows[0].data)
        : targetRes.rows[0].data;

      // Restore user fields in database
      await pgDb.query(
        `UPDATE "users"
         SET "firstName" = $1, "lastName" = $2, "status" = $3, "updatedAt" = NOW()
         WHERE "id" = $4`,
        [targetData.firstName, targetData.lastName, targetData.status || 'ACTIVE', id]
      );

      // Restore user roles if present in snapshot and caller is admin
      if (isAdmin && targetData.roles && Array.isArray(targetData.roles)) {
        await pgDb.query(`DELETE FROM "user_roles" WHERE "userId" = $1`, [id]);
        for (const roleName of targetData.roles) {
          const roleLookup = await pgDb.query(`SELECT "id" FROM "roles" WHERE "name" = $1`, [roleName]);
          if (roleLookup.rows.length > 0) {
            await pgDb.query(
              `INSERT INTO "user_roles" ("userId", "roleId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [id, roleLookup.rows[0].id]
            );
          }
        }
      }

      // Determine next version number in entity_versions
      const maxVRes = await pgDb.query(
        `SELECT MAX("version") as "maxVersion" FROM "entity_versions" WHERE "entityType" = 'User' AND "entityId" = $1`,
        [id]
      );
      const nextVersionNum = (maxVRes.rows[0]?.maxVersion ? parseInt(maxVRes.rows[0].maxVersion, 10) : targetVersionNum) + 1;

      // Fetch fresh restored user state
      const userRes = await pgDb.query(
        `SELECT "id", "email", "firstName", "lastName", "status", "createdAt", "updatedAt" FROM "users" WHERE "id" = $1`,
        [id]
      );
      const rolesRes = await pgDb.query(
        `SELECT r."name" FROM "roles" r JOIN "user_roles" ur ON ur."roleId" = r."id" WHERE ur."userId" = $1`,
        [id]
      );
      const currentRoles = rolesRes.rows.map((r: any) => r.name);
      const restoredUserPayload = {
        ...userRes.rows[0],
        roles: currentRoles,
      };

      const rollbackSummary = `Rollback to version ${targetVersionNum}`;
      const evId = `ev_usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      await pgDb.query(
        `INSERT INTO "entity_versions" ("id", "entityType", "entityId", "version", "data", "changeSummary", "createdBy", "createdAt")
         VALUES ($1, 'User', $2, $3, $4, $5, $6, NOW())`,
        [
          evId,
          id,
          nextVersionNum,
          JSON.stringify(restoredUserPayload),
          rollbackSummary,
          caller.userId,
        ]
      );

      res.json({
        success: true,
        data: restoredUserPayload,
        rollbackVersion: nextVersionNum,
        message: `Successfully rolled back user profile to version ${targetVersionNum}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get user by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const caller = req.user!;

      const isSelf = caller.userId === id;
      const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Cannot access resources belonging to another user');
      }

      const userRes = await pgDb.query(
        `SELECT "id", "email", "firstName", "lastName", "status", "createdAt", "updatedAt" FROM "users" WHERE "id" = $1`,
        [id]
      );

      if (userRes.rows.length === 0) {
        throw new AppError(404, 'USER_NOT_FOUND', `User with ID ${id} not found`);
      }
      const user = userRes.rows[0];

      const rolesRes = await pgDb.query(
        `SELECT r."name" FROM "roles" r
         JOIN "user_roles" ur ON ur."roleId" = r."id"
         WHERE ur."userId" = $1`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...(user as any),
          roles: rolesRes.rows.map((r: any) => r.name),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update user (with version recording in entity_versions)
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(updateUserSchema),
  auditLog('UPDATE', 'user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const caller = req.user!;

      const isSelf = caller.userId === id;
      const isAdmin = caller.roles.includes('MAIN_ADMIN') || caller.roles.includes('SUB_ADMIN');

      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Cannot update resources belonging to another user');
      }

      const { firstName, lastName, status, roleIds } = req.body;

      const userRes = await pgDb.query(`SELECT * FROM "users" WHERE "id" = $1`, [id]);
      if (userRes.rows.length === 0) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }
      const existing = userRes.rows[0] as any;

      const rolesRes = await pgDb.query(
        `SELECT r."name" FROM "roles" r JOIN "user_roles" ur ON ur."roleId" = r."id" WHERE ur."userId" = $1`,
        [id]
      );
      const existingRoles = rolesRes.rows.map((r: any) => r.name);

      const updatedFn = firstName !== undefined ? firstName : existing.firstName;
      const updatedLn = lastName !== undefined ? lastName : existing.lastName;
      const updatedSt = status !== undefined ? status : existing.status;

      let newRoles = existingRoles;
      if (roleIds && isAdmin && Array.isArray(roleIds)) {
        if (roleIds.length > 0) {
          const newRolesRes = await pgDb.query(
            `SELECT "name" FROM "roles" WHERE "id" = ANY($1::text[])`,
            [roleIds]
          );
          newRoles = newRolesRes.rows.map((r: any) => r.name);
        } else {
          newRoles = [];
        }
      }

      const changeSummary = inferUserChangeSummary(
        {
          firstName: existing.firstName,
          lastName: existing.lastName,
          status: existing.status,
          roles: existingRoles,
        },
        {
          firstName: updatedFn,
          lastName: updatedLn,
          status: updatedSt,
          newRoles: roleIds ? newRoles : undefined,
        }
      );

      // Check max version in entity_versions
      const maxVRes = await pgDb.query(
        `SELECT MAX("version") as "maxVersion" FROM "entity_versions" WHERE "entityType" = 'User' AND "entityId" = $1`,
        [id]
      );
      let currentVersion = maxVRes.rows[0]?.maxVersion ? parseInt(maxVRes.rows[0].maxVersion, 10) : 0;

      // If no version 1 exists, record baseline version 1 first
      if (currentVersion === 0) {
        await pgDb.query(
          `INSERT INTO "entity_versions" ("id", "entityType", "entityId", "version", "data", "changeSummary", "createdBy", "createdAt")
           VALUES ($1, 'User', $2, 1, $3, $4, $5, NOW()) ON CONFLICT DO NOTHING`,
          [
            `ev_usr_${Date.now()}_v1`,
            id,
            JSON.stringify({
              id: existing.id,
              email: existing.email,
              firstName: existing.firstName,
              lastName: existing.lastName,
              status: existing.status,
              roles: existingRoles,
            }),
            'Initial baseline version',
            caller.userId,
          ]
        );
        currentVersion = 1;
      }

      const nextVersion = currentVersion + 1;

      const updateRes = await pgDb.query(
        `UPDATE "users"
         SET "firstName" = $1, "lastName" = $2, "status" = $3, "updatedAt" = NOW()
         WHERE "id" = $4
         RETURNING "id", "email", "firstName", "lastName", "status"`,
        [updatedFn, updatedLn, updatedSt, id]
      );

      if (roleIds && isAdmin && Array.isArray(roleIds)) {
        await pgDb.query(`DELETE FROM "user_roles" WHERE "userId" = $1`, [id]);
        for (const roleId of roleIds) {
          await pgDb.query(`INSERT INTO "user_roles" ("userId", "roleId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, roleId]);
        }
      }

      const updatedPayload = {
        ...updateRes.rows[0],
        roles: newRoles,
      };

      const evId = `ev_usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      await pgDb.query(
        `INSERT INTO "entity_versions" ("id", "entityType", "entityId", "version", "data", "changeSummary", "createdBy", "createdAt")
         VALUES ($1, 'User', $2, $3, $4, $5, $6, NOW())`,
        [
          evId,
          id,
          nextVersion,
          JSON.stringify(updatedPayload),
          changeSummary,
          caller.userId,
        ]
      );

      res.json({
        success: true,
        data: updatedPayload,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete user
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.USERS_DELETE),
  auditLog('DELETE', 'user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const caller = req.user!;

      const isAdmin = caller.roles.includes('MAIN_ADMIN');
      if (!isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Only MAIN_ADMIN can delete user accounts');
      }

      await pgDb.query(`DELETE FROM "entity_versions" WHERE "entityType" = 'User' AND "entityId" = $1`, [id]);
      await pgDb.query(`DELETE FROM "user_roles" WHERE "userId" = $1`, [id]);
      await pgDb.query(`DELETE FROM "users" WHERE "id" = $1`, [id]);

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
