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

// List users
router.get(
  '/',
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usersRes = await pgDb.query(`SELECT "id", "email", "firstName", "lastName", "status", "createdAt", "updatedAt" FROM "users" ORDER BY "createdAt" DESC`);
      const formatted = [];

      for (const u of usersRes.rows) {
        const rolesRes = await pgDb.query(
          `SELECT r."name" FROM "roles" r
           JOIN "user_roles" ur ON ur."roleId" = r."id"
           WHERE ur."userId" = $1`,
          [u.id]
        );
        formatted.push({
          ...u,
          roles: rolesRes.rows.map((r: any) => r.name),
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
          const urId = `ur_${crypto.randomBytes(8).toString('hex')}`;
          await pgDb.query(
            `INSERT INTO "user_roles" ("id", "userId", "roleId") VALUES ($1, $2, $3)`,
            [urId, id, roleId]
          );
          const rRes = await pgDb.query(`SELECT "name" FROM "roles" WHERE "id" = $1`, [roleId]);
          if (rRes.rows.length > 0) {
            roles.push(rRes.rows[0].name);
          }
        }
      }

      res.status(201).json({
        success: true,
        data: {
          id,
          email,
          firstName,
          lastName,
          status: 'ACTIVE',
          roles,
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
          ...user,
          roles: rolesRes.rows.map((r: any) => r.name),
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
      const existing = userRes.rows[0];

      const updatedFn = firstName !== undefined ? firstName : existing.firstName;
      const updatedLn = lastName !== undefined ? lastName : existing.lastName;
      const updatedSt = status !== undefined ? status : existing.status;

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
          const urId = `ur_${crypto.randomBytes(8).toString('hex')}`;
          await pgDb.query(`INSERT INTO "user_roles" ("id", "userId", "roleId") VALUES ($1, $2, $3)`, [urId, id, roleId]);
        }
      }

      res.json({
        success: true,
        data: updateRes.rows[0],
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

      const isAdmin = caller.roles.includes('MAIN_ADMIN');
      if (!isAdmin) {
        throw new AppError(403, 'IDOR_DENIED', 'Forbidden: Only MAIN_ADMIN can delete user accounts');
      }

      await pgDb.query(`DELETE FROM "user_roles" WHERE "userId" = $1`, [id]);
      await pgDb.query(`DELETE FROM "users" WHERE "id" = $1`, [id]);

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
