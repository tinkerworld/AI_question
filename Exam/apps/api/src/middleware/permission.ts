import { Request, Response, NextFunction } from 'express';
import { hasPermission, ROLE_PERMISSIONS_MAP } from '@repo/permissions';
import { pgDb } from '@repo/database';
import { AppError } from './error';

/**
 * Fetch fresh active permissions for a user and their roles directly from the database.
 * Used when a token's permissions array lacks a newly added permission.
 */
export async function fetchUserPermissionsFromDb(
  userId?: string,
  roleNamesOrIds?: string[]
): Promise<string[]> {
  const permissionsSet = new Set<string>();
  const rolesSet = new Set<string>();

  if (roleNamesOrIds && Array.isArray(roleNamesOrIds)) {
    roleNamesOrIds.forEach((r) => {
      if (r) rolesSet.add(r);
    });
  }

  try {
    // 1. Query permissions and roles linked via user_roles for this userId
    if (userId) {
      const userRolesRes = await pgDb.query(
        `SELECT r.id as "roleId", r.name as "roleName", COALESCE(p.key, rp."permissionId") as "permKey"
         FROM "user_roles" ur
         JOIN "roles" r ON (ur."roleId" = r.id OR ur."roleId" = r.name)
         LEFT JOIN "role_permissions" rp ON (r.id = rp."roleId" OR r.name = rp."roleId")
         LEFT JOIN "permissions" p ON (rp."permissionId" = p.id OR rp."permissionId" = p.key)
         WHERE ur."userId" = $1`,
        [userId]
      );

      userRolesRes.rows.forEach((r: any) => {
        if (r.roleId) rolesSet.add(r.roleId);
        if (r.roleName) rolesSet.add(r.roleName);
        if (r.permKey) permissionsSet.add(r.permKey);
      });
    }

    // 2. Also check permissions for any roles in rolesSet
    const rolesArray = Array.from(rolesSet);
    if (rolesArray.length > 0) {
      const rolePermsRes = await pgDb.query(
        `SELECT r.id as "roleId", r.name as "roleName", COALESCE(p.key, rp."permissionId") as "permKey"
         FROM "roles" r
         JOIN "role_permissions" rp ON (r.id = rp."roleId" OR r.name = rp."roleId")
         LEFT JOIN "permissions" p ON (rp."permissionId" = p.id OR rp."permissionId" = p.key)
         WHERE r.id = ANY($1) OR r.name = ANY($1)`,
        [rolesArray]
      );

      rolePermsRes.rows.forEach((r: any) => {
        if (r.permKey) permissionsSet.add(r.permKey);
      });
    }

    // 3. System super admin wildcard
    if (rolesSet.has('MAIN_ADMIN') || rolesSet.has('SUPER_ADMIN')) {
      permissionsSet.add('*');
    }

    // 4. Static fallback mapping if defined in ROLE_PERMISSIONS_MAP
    for (const roleName of Array.from(rolesSet)) {
      const staticPerms = ROLE_PERMISSIONS_MAP[roleName];
      if (staticPerms && Array.isArray(staticPerms)) {
        staticPerms.forEach((p) => permissionsSet.add(p));
      }
    }

    return Array.from(permissionsSet);
  } catch (err: any) {
    if (err?.code !== '42P01') {
      console.warn('[PermissionFreshness] Error querying fresh permissions from DB:', err?.message || err);
    }
    return [];
  }
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication required'));
      }

      // 1. Fast path: Token already contains the required permission (or '*')
      if (hasPermission(req.user.permissions, permission)) {
        return next();
      }

      // 2. Permission freshness fallback:
      // When the JWT-embedded check fails, check the database for newly-assigned
      // permissions before rejecting, so admins don't have to manually log out and back in.
      const userId = req.user.userId;
      const roles = (req.user as any).roles || [];

      if (userId || (roles && roles.length > 0)) {
        const freshPermissions = await fetchUserPermissionsFromDb(userId, roles);

        // Update req.user.permissions with fresh set for this request
        req.user.permissions = freshPermissions;

        if (hasPermission(req.user.permissions, permission)) {
          return next();
        }
      }

      // 3. If still missing the required permission after fresh DB lookup, return 403
      return next(
        new AppError(
          403,
          'PERMISSION_DENIED',
          `Forbidden: Requires atomic permission '${permission}'`
        )
      );
    } catch (err) {
      next(err);
    }
  };
}
