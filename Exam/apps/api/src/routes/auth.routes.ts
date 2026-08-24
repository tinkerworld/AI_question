import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pgDb } from '@repo/database';
import { loginSchema, refreshTokenSchema } from '@repo/validation';
import { validate } from '../middleware/validate';
import { authenticate, JWT_SECRET, JWT_REFRESH_SECRET } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const userRes = await pgDb.query(`SELECT * FROM "users" WHERE "email" = $1`, [email]);
    if (userRes.rows.length === 0) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const user = userRes.rows[0];

    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'ACCOUNT_INACTIVE', `User account is ${user.status.toLowerCase()}`);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const rolesRes = await pgDb.query(
      `SELECT r.name as "roleName", p.key as "permKey"
       FROM "user_roles" ur
       JOIN "roles" r ON ur."roleId" = r.id
       LEFT JOIN "role_permissions" rp ON r.id = rp."roleId"
       LEFT JOIN "permissions" p ON rp."permissionId" = p.id
       WHERE ur."userId" = $1`,
      [user.id]
    );

    const rolesSet = new Set<string>();
    const permissionsSet = new Set<string>();

    rolesRes.rows.forEach((r: any) => {
      if (r.roleName) rolesSet.add(r.roleName);
      if (r.permKey) permissionsSet.add(r.permKey);
    });

    const roles = Array.from(rolesSet);
    if (roles.includes('MAIN_ADMIN')) {
      permissionsSet.add('*');
    }
    const permissions = Array.from(permissionsSet);

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, roles, permissions },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, email: user.email, jti: `jti_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const rfId = `rf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pgDb.query(
      `INSERT INTO "refresh_tokens" ("id", "userId", "token", "expiresAt", "revoked", "createdAt")
       VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)`,
      [rfId, user.id, refreshToken, expiresAt]
    );

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          roles,
          permissions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    const rfRes = await pgDb.query(
      `SELECT * FROM "refresh_tokens" WHERE "token" = $1 AND "revoked" = false`,
      [refreshToken]
    );

    if (rfRes.rows.length === 0) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }

    const storedToken = rfRes.rows[0];
    if (new Date(storedToken.expiresAt) < new Date()) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has expired');
    }

    // Token Rotation: revoke used token (revoked: true)
    await pgDb.query(`UPDATE "refresh_tokens" SET "revoked" = true WHERE "id" = $1`, [storedToken.id]);

    const userRes = await pgDb.query(`SELECT * FROM "users" WHERE "id" = $1`, [storedToken.userId]);
    if (userRes.rows.length === 0) {
      throw new AppError(401, 'USER_NOT_FOUND', 'User not found');
    }
    const user = userRes.rows[0];

    const rolesRes = await pgDb.query(
      `SELECT r.name as "roleName", p.key as "permKey"
       FROM "user_roles" ur
       JOIN "roles" r ON ur."roleId" = r.id
       LEFT JOIN "role_permissions" rp ON r.id = rp."roleId"
       LEFT JOIN "permissions" p ON rp."permissionId" = p.id
       WHERE ur."userId" = $1`,
      [user.id]
    );

    const rolesSet = new Set<string>();
    const permissionsSet = new Set<string>();
    rolesRes.rows.forEach((r: any) => {
      if (r.roleName) rolesSet.add(r.roleName);
      if (r.permKey) permissionsSet.add(r.permKey);
    });

    const roles = Array.from(rolesSet);
    if (roles.includes('MAIN_ADMIN')) {
      permissionsSet.add('*');
    }
    const permissions = Array.from(permissionsSet);

    const newAccessToken = jwt.sign(
      { sub: user.id, email: user.email, roles, permissions },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { sub: user.id, email: user.email, jti: `jti_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const newRfId = `rf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pgDb.query(
      `INSERT INTO "refresh_tokens" ("id", "userId", "token", "expiresAt", "revoked", "createdAt")
       VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)`,
      [newRfId, user.id, newRefreshToken, expiresAt]
    );

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pgDb.query(
        `UPDATE "refresh_tokens" SET "revoked" = true WHERE "token" = $1 AND "userId" = $2`,
        [refreshToken, req.user!.userId]
      );
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRes = await pgDb.query(`SELECT * FROM "users" WHERE "id" = $1`, [req.user!.userId]);
    if (userRes.rows.length === 0) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const user = userRes.rows[0];
    const rolesRes = await pgDb.query(
      `SELECT r.name as "roleName", p.key as "permKey"
       FROM "user_roles" ur
       JOIN "roles" r ON ur."roleId" = r.id
       LEFT JOIN "role_permissions" rp ON r.id = rp."roleId"
       LEFT JOIN "permissions" p ON rp."permissionId" = p.id
       WHERE ur."userId" = $1`,
      [user.id]
    );

    const rolesSet = new Set<string>();
    const permissionsSet = new Set<string>();
    rolesRes.rows.forEach((r: any) => {
      if (r.roleName) rolesSet.add(r.roleName);
      if (r.permKey) permissionsSet.add(r.permKey);
    });

    const roles = Array.from(rolesSet);
    if (roles.length === 0 && req.user?.roles) {
      roles.push(...req.user.roles);
    }
    if (roles.includes('MAIN_ADMIN')) {
      permissionsSet.add('*');
    }
    if (permissionsSet.size === 0 && req.user?.permissions) {
      req.user.permissions.forEach((p: string) => permissionsSet.add(p));
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles,
        permissions: Array.from(permissionsSet),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
