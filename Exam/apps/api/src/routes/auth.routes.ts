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

// Student Self-Registration (AUTH-01)
router.post('/student-register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, termsAccepted } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Email, password, first name and last name are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(400, 'INVALID_EMAIL', 'Invalid email address format');
    }

    if (password.length < 8) {
      throw new AppError(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters long');
    }

    if (termsAccepted === false) {
      throw new AppError(400, 'TERMS_REQUIRED', 'You must accept the terms and conditions to register');
    }

    const existingRes = await pgDb.query(`SELECT "id" FROM "users" WHERE LOWER("email") = LOWER($1)`, [email.trim()]);
    if (existingRes.rows.length > 0) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const userMetadata = {
      registeredVia: 'SELF_REGISTRATION',
      registrationDate: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firstName + '_' + lastName)}`,
      communicationPreferences: { marketing: true, academic: true, billing: true }
    };

    await pgDb.query(`
      INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "status", "phone", "metadata", "version")
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7, 1)
    `, [
      userId,
      email.trim().toLowerCase(),
      passwordHash,
      firstName.trim(),
      lastName.trim(),
      phone || null,
      JSON.stringify(userMetadata)
    ]);

    // Assign STUDENT role
    const studentRoleRes = await pgDb.query(`SELECT "id" FROM "roles" WHERE "name" = 'STUDENT'`);
    if (studentRoleRes.rows.length > 0) {
      const roleId = studentRoleRes.rows[0].id;
      await pgDb.query(`
        INSERT INTO "user_roles" ("userId", "roleId")
        VALUES ($1, $2)
        ON CONFLICT ("userId", "roleId") DO NOTHING
      `, [userId, roleId]);
    }

    // Baseline permissions for STUDENT
    const permissions = [
      'exams.attempt',
      'practice.attempt',
      'interview.attempt',
      'analytics.read_own',
      'results.read_own',
      'subscriptions.read',
      'preferences.update'
    ];
    const roles = ['STUDENT'];

    const accessToken = jwt.sign(
      { sub: userId, email: email.trim().toLowerCase(), roles, permissions },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const refreshToken = jwt.sign(
      { sub: userId, email: email.trim().toLowerCase(), jti: `jti_${Date.now()}` },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await pgDb.query(`
      INSERT INTO "refresh_tokens" ("id", "userId", "token", "expiresAt", "revoked", "createdAt")
      VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
    `, [`rf_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, userId, refreshToken, new Date(Date.now() + 7 * 86400000)]);

    res.status(201).json({
      success: true,
      message: 'Student registration completed successfully',
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          id: userId,
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          status: 'ACTIVE',
          roles,
          permissions,
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
