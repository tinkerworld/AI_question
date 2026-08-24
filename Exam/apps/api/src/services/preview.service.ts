import { pgDb } from '@repo/database';
import { AppError } from '../middleware/error';
import {
  BillingPlan,
  ContentVersion,
  UsageMode,
  ImpersonationMode,
  PreviewProfileDTO,
  CreatePreviewProfileDTO,
  UpdatePreviewProfileDTO,
  StartPreviewSessionDTO,
  StartImpersonationDTO,
  ImpersonationSessionDTO,
  PreviewAuditLogDTO,
  PaginatedResponse,
} from '@repo/types';
import { ROLE_PERMISSIONS_MAP, SYSTEM_ROLES } from '@repo/permissions';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';
import crypto from 'crypto';

function safeParseJson(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Fetch role permissions dynamically from the database to avoid static map duplication.
 */
async function fetchRolePermissionsFromDb(roleName: string): Promise<string[]> {
  const res = await pgDb.query(
    `SELECT p.key as "permKey"
     FROM "roles" r
     JOIN "role_permissions" rp ON r.id = rp."roleId"
     JOIN "permissions" p ON rp."permissionId" = p.id
     WHERE r.name = $1`,
    [roleName]
  );
  const permissions = res.rows.map((r: any) => r.permKey).filter(Boolean);
  if (roleName === 'MAIN_ADMIN') permissions.push('*');
  if (permissions.length === 0 && ROLE_PERMISSIONS_MAP[roleName]) {
    return ROLE_PERMISSIONS_MAP[roleName];
  }
  return permissions;
}

/**
 * Fetch user effective roles and permissions dynamically from the database.
 */
async function fetchUserEffectivePermissions(
  userId: string,
  defaultRoles: string[] = ['STUDENT']
): Promise<{ roles: string[]; permissions: string[] }> {
  const rolesRes = await pgDb.query(
    `SELECT r.name as "roleName", p.key as "permKey"
     FROM "user_roles" ur
     JOIN "roles" r ON ur."roleId" = r.id
     LEFT JOIN "role_permissions" rp ON r.id = rp."roleId"
     LEFT JOIN "permissions" p ON rp."permissionId" = p.id
     WHERE ur."userId" = $1`,
    [userId]
  );
  const rolesSet = new Set<string>();
  const permissionsSet = new Set<string>();
  rolesRes.rows.forEach((r: any) => {
    if (r.roleName) rolesSet.add(r.roleName);
    if (r.permKey) permissionsSet.add(r.permKey);
  });
  const roles = rolesSet.size > 0 ? Array.from(rolesSet) : defaultRoles;
  if (roles.includes('MAIN_ADMIN')) permissionsSet.add('*');
  let permissions = Array.from(permissionsSet);
  if (permissions.length === 0) {
    permissions = ROLE_PERMISSIONS_MAP[roles[0]] || ROLE_PERMISSIONS_MAP[SYSTEM_ROLES.STUDENT] || [];
  }
  return { roles, permissions };
}

export class PreviewService {
  /**
   * 10.1: Create Preview Student Profile
   */
  async createPreviewProfile(
    dto: CreatePreviewProfileDTO,
    createdById: string
  ): Promise<PreviewProfileDTO> {
    const id = `prev_prof_${crypto.randomBytes(8).toString('hex')}`;
    const name = dto.name.trim();
    const billingPlan = dto.billingPlan || 'FREE';
    const contentVersion = dto.contentVersion || 'PUBLISHED';
    const usageMode = dto.usageMode || 'NORMAL';
    const courseAccess = JSON.stringify(dto.courseAccess || []);
    const featureFlags = JSON.stringify(dto.featureFlags || {});

    const query = `
      INSERT INTO "preview_profiles" (
        "id", "name", "createdById", "billingPlan", "contentVersion", "usageMode", "courseAccess", "featureFlags"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const res = await pgDb.query(query, [
      id,
      name,
      createdById,
      billingPlan,
      contentVersion,
      usageMode,
      courseAccess,
      featureFlags,
    ]);

    const row = res.rows[0];
    return this.mapProfileRow(row);
  }

  /**
   * 10.1: Get Preview Profile by ID
   */
  async getPreviewProfile(id: string): Promise<PreviewProfileDTO> {
    const res = await pgDb.query(`SELECT * FROM "preview_profiles" WHERE "id" = $1`, [id]);
    if (res.rows.length === 0) {
      throw new AppError(404, 'PREVIEW_PROFILE_NOT_FOUND', 'Preview profile not found');
    }
    return this.mapProfileRow(res.rows[0]);
  }

  /**
   * 10.1: Update Preview Profile
   */
  async updatePreviewProfile(
    id: string,
    dto: UpdatePreviewProfileDTO
  ): Promise<PreviewProfileDTO> {
    const existing = await this.getPreviewProfile(id);

    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    const billingPlan = dto.billingPlan || existing.billingPlan;
    const contentVersion = dto.contentVersion || existing.contentVersion;
    const usageMode = dto.usageMode || existing.usageMode;
    const courseAccess = JSON.stringify(dto.courseAccess !== undefined ? dto.courseAccess : existing.courseAccess);
    const featureFlags = JSON.stringify(dto.featureFlags !== undefined ? dto.featureFlags : existing.featureFlags);

    const query = `
      UPDATE "preview_profiles"
      SET 
        "name" = $1,
        "billingPlan" = $2,
        "contentVersion" = $3,
        "usageMode" = $4,
        "courseAccess" = $5,
        "featureFlags" = $6,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $7
      RETURNING *
    `;

    const res = await pgDb.query(query, [
      name,
      billingPlan,
      contentVersion,
      usageMode,
      courseAccess,
      featureFlags,
      id,
    ]);

    return this.mapProfileRow(res.rows[0]);
  }

  /**
   * 10.1: List Preview Profiles
   */
  async listPreviewProfiles(createdById?: string): Promise<PreviewProfileDTO[]> {
    let query = `SELECT * FROM "preview_profiles"`;
    const params: any[] = [];
    if (createdById) {
      query += ` WHERE "createdById" = $1`;
      params.push(createdById);
    }
    query += ` ORDER BY "createdAt" DESC`;

    const res = await pgDb.query(query, params);
    return res.rows.map((row) => this.mapProfileRow(row));
  }

  /**
   * 10.3 / 10.4: Start Preview Session (Simulated Persona)
   */
  async startPreviewSession(
    dto: StartPreviewSessionDTO,
    actorUser: { userId: string; email: string; roles: string[]; permissions: string[] },
    reqInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ sessionToken: string; session: ImpersonationSessionDTO }> {
    // 1. Resolve configuration from Profile, Preset, or direct inputs
    let billingPlan: BillingPlan = 'FREE';
    let contentVersion: ContentVersion = 'PUBLISHED';
    let usageMode: UsageMode = 'NORMAL';
    let courseAccess: string[] = [];
    let featureFlags: Record<string, boolean> = {};

    if (dto.profileId) {
      const profile = await this.getPreviewProfile(dto.profileId);
      billingPlan = profile.billingPlan;
      contentVersion = profile.contentVersion;
      usageMode = profile.usageMode;
      courseAccess = profile.courseAccess;
      featureFlags = profile.featureFlags;
    } else if (dto.preset) {
      switch (dto.preset) {
        case 'FREE':
          billingPlan = 'FREE';
          contentVersion = 'PUBLISHED';
          usageMode = 'NORMAL';
          courseAccess = [];
          break;
        case 'PREMIUM':
          billingPlan = 'PREMIUM';
          contentVersion = 'PUBLISHED';
          usageMode = 'NORMAL';
          courseAccess = ['*'];
          break;
        case 'PREMIUM_PLUS':
          billingPlan = 'PREMIUM_PLUS';
          contentVersion = 'DRAFT';
          usageMode = 'UNLIMITED_QA';
          courseAccess = ['*'];
          break;
        case 'DRAFT_REVIEWER':
          billingPlan = 'PREMIUM_PLUS';
          contentVersion = 'DRAFT';
          usageMode = 'UNLIMITED_QA';
          courseAccess = ['*'];
          break;
      }
    }

    if (dto.billingPlan) billingPlan = dto.billingPlan;
    if (dto.contentVersion) contentVersion = dto.contentVersion;
    if (dto.usageMode) usageMode = dto.usageMode;
    if (dto.courseAccess) courseAccess = dto.courseAccess;
    if (dto.featureFlags) featureFlags = dto.featureFlags;

    const sessionId = `prev_sess_${crypto.randomBytes(8).toString('hex')}`;
    const effectiveUserId = 'usr_preview_student';
    const effectiveEmail = 'preview.student@examos.local';
    const studentPermissions = await fetchRolePermissionsFromDb(SYSTEM_ROLES.STUDENT);

    // Ensure preview student record exists in users table for relational integrity
    await pgDb.query(
      `INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, 'PREVIEW_NO_LOGIN', 'Preview', 'Student', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT ("id") DO NOTHING`,
      [effectiveUserId, effectiveEmail]
    );

    const sessionData = {
      simulatedPlan: billingPlan,
      contentVersion,
      usageMode,
      courseAccess,
      featureFlags,
    };

    const durationSeconds = 60 * 60; // 60 minutes
    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

    // 2. Generate secure dual-identity JWT Token
    const jwtPayload = {
      sub: effectiveUserId,
      email: effectiveEmail,
      roles: ['STUDENT'],
      permissions: studentPermissions,
      isImpersonation: true,
      actorUserId: actorUser.userId,
      actorEmail: actorUser.email,
      impersonationMode: 'PREVIEW_STUDENT' as ImpersonationMode,
      impersonationSessionId: sessionId,
      sessionData,
    };

    const sessionToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: `${durationSeconds}s` });

    // 3. Persist impersonation session
    const insertQuery = `
      INSERT INTO "impersonation_sessions" (
        "id", "token", "actorUserId", "effectiveUserId", "effectiveUserEmail", "mode", "reason", "sessionData", "expiresAt", "isActive"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP + INTERVAL '60 minutes', $9)
      RETURNING *
    `;

    const res = await pgDb.query(insertQuery, [
      sessionId,
      sessionToken,
      actorUser.userId,
      effectiveUserId,
      effectiveEmail,
      'PREVIEW_STUDENT',
      'Preview mode test session',
      JSON.stringify(sessionData),
      true,
    ]);

    // 4. Record load-bearing audit trail
    await this.recordAuditLog({
      actorUserId: actorUser.userId,
      actorEmail: actorUser.email,
      effectiveUserId,
      effectiveEmail,
      mode: 'PREVIEW_STUDENT',
      action: 'PREVIEW_SESSION_START',
      resource: 'preview_session',
      resourceId: sessionId,
      details: {
        billingPlan,
        contentVersion,
        usageMode,
        courseAccess,
      },
      ipAddress: reqInfo?.ip,
      userAgent: reqInfo?.userAgent,
    });

    const sessionDTO = this.mapSessionRow(res.rows[0]);
    return { sessionToken, session: sessionDTO };
  }

  /**
   * 10.3: Start Impersonation of Real Student
   */
  async startImpersonationSession(
    dto: StartImpersonationDTO,
    actorUser: { userId: string; email: string; roles: string[]; permissions: string[] },
    reqInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ sessionToken: string; session: ImpersonationSessionDTO }> {
    // 1. Role / Permission check: Teachers CANNOT impersonate real students
    const isMainAdmin = actorUser.roles.includes('MAIN_ADMIN');
    const isSubAdmin = actorUser.roles.includes('SUB_ADMIN');

    if (!isMainAdmin && !isSubAdmin) {
      throw new AppError(403, 'TEACHER_IMPERSONATION_FORBIDDEN', 'Forbidden: Only administrators may impersonate real students');
    }

    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new AppError(400, 'REASON_REQUIRED', 'A detailed justification (min 10 characters) is required to impersonate a real student');
    }

    // 2. Validate Target User (Must exist and must NOT have staff/admin roles)
    const userRes = await pgDb.query(
      `
      SELECT u."id", u."email", u."firstName", u."lastName", u."status",
             COALESCE(json_agg(r."name") FILTER (WHERE r."name" IS NOT NULL), '[]') as roles
      FROM "users" u
      LEFT JOIN "user_roles" ur ON u."id" = ur."userId"
      LEFT JOIN "roles" r ON ur."roleId" = r."id"
      WHERE u."id" = $1
      GROUP BY u."id"
      `,
      [dto.targetUserId]
    );

    if (userRes.rows.length === 0) {
      throw new AppError(404, 'STUDENT_NOT_FOUND', 'Target student user not found');
    }

    const targetUser = userRes.rows[0];
    const targetRoles: string[] = safeParseJson(targetUser.roles) || [];

    // Privilege check: cannot impersonate another admin or teacher
    if (targetRoles.includes('MAIN_ADMIN') || targetRoles.includes('SUB_ADMIN') || targetRoles.includes('TEACHER')) {
      throw new AppError(403, 'CANNOT_IMPERSONATE_STAFF', 'Forbidden: Cannot impersonate administrative or faculty staff members');
    }

    const sessionId = `imp_sess_${crypto.randomBytes(8).toString('hex')}`;
    const { roles: userRoles, permissions: userPermissions } = await fetchUserEffectivePermissions(targetUser.id, targetRoles);
    const durationSeconds = 60 * 60; // 60 minutes TTL
    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

    const sessionData = {
      simulatedPlan: 'PREMIUM' as BillingPlan,
      contentVersion: 'PUBLISHED' as ContentVersion,
      usageMode: 'NORMAL' as UsageMode,
      courseAccess: ['*'],
      featureFlags: {},
    };

    // 3. Issue dual-identity JWT Token
    const jwtPayload = {
      sub: targetUser.id,
      email: targetUser.email,
      roles: userRoles,
      permissions: userPermissions,
      isImpersonation: true,
      actorUserId: actorUser.userId,
      actorEmail: actorUser.email,
      impersonationMode: 'IMPERSONATE_REAL_STUDENT' as ImpersonationMode,
      impersonationSessionId: sessionId,
      reason: dto.reason.trim(),
      sessionData,
    };

    const sessionToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: `${durationSeconds}s` });

    // 4. Insert into database
    const insertQuery = `
      INSERT INTO "impersonation_sessions" (
        "id", "token", "actorUserId", "effectiveUserId", "effectiveUserEmail", "mode", "reason", "sessionData", "expiresAt", "isActive"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP + INTERVAL '60 minutes', $9)
      RETURNING *
    `;

    const res = await pgDb.query(insertQuery, [
      sessionId,
      sessionToken,
      actorUser.userId,
      targetUser.id,
      targetUser.email,
      'IMPERSONATE_REAL_STUDENT',
      dto.reason.trim(),
      JSON.stringify(sessionData),
      true,
    ]);

    // 5. Explicit Audit Trail Entry
    await this.recordAuditLog({
      actorUserId: actorUser.userId,
      actorEmail: actorUser.email,
      effectiveUserId: targetUser.id,
      effectiveEmail: targetUser.email,
      mode: 'IMPERSONATE_REAL_STUDENT',
      action: 'IMPERSONATION_SESSION_START',
      resource: 'student_account',
      resourceId: targetUser.id,
      details: {
        reason: dto.reason.trim(),
        targetName: `${targetUser.firstName} ${targetUser.lastName}`,
      },
      ipAddress: reqInfo?.ip,
      userAgent: reqInfo?.userAgent,
    });

    const sessionDTO = this.mapSessionRow(res.rows[0]);
    return { sessionToken, session: sessionDTO };
  }

  /**
   * 10.3: End Impersonation / Preview Session
   */
  async stopSession(
    sessionId: string,
    actorUserId: string,
    reqInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean }> {
    const res = await pgDb.query(
      `SELECT * FROM "impersonation_sessions" WHERE "id" = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) {
      // If session not found by ID, still report success gracefully
      return { success: true };
    }

    const session = res.rows[0];

    await pgDb.query(
      `UPDATE "impersonation_sessions" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [sessionId]
    );

    // Audit termination
    await this.recordAuditLog({
      actorUserId: session.actorUserId,
      effectiveUserId: session.effectiveUserId,
      effectiveEmail: session.effectiveUserEmail,
      mode: session.mode as ImpersonationMode,
      action: 'IMPERSONATION_SESSION_STOP',
      resource: 'impersonation_session',
      resourceId: sessionId,
      details: { terminatedBy: actorUserId },
      ipAddress: reqInfo?.ip,
      userAgent: reqInfo?.userAgent,
    });

    return { success: true };
  }

  /**
   * 10.3: Get Session Status
   */
  async getSessionStatus(sessionId: string): Promise<ImpersonationSessionDTO | null> {
    const res = await pgDb.query(
      `SELECT * FROM "impersonation_sessions" WHERE "id" = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) return null;
    return this.mapSessionRow(res.rows[0]);
  }

  /**
   * 10.5: Record Audit Trail Entry
   */
  async recordAuditLog(entry: {
    actorUserId: string;
    actorEmail?: string;
    effectiveUserId: string;
    effectiveEmail?: string;
    mode: ImpersonationMode;
    action: string;
    resource?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const id = `aud_${crypto.randomBytes(8).toString('hex')}`;
    const query = `
      INSERT INTO "preview_audit_logs" (
        "id", "actorUserId", "actorEmail", "effectiveUserId", "effectiveEmail", "mode", "action", "resource", "resourceId", "details", "ipAddress", "userAgent"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await pgDb.query(query, [
      id,
      entry.actorUserId,
      entry.actorEmail || null,
      entry.effectiveUserId,
      entry.effectiveEmail || null,
      entry.mode,
      entry.action,
      entry.resource || null,
      entry.resourceId || null,
      JSON.stringify(entry.details || {}),
      entry.ipAddress || null,
      entry.userAgent || null,
    ]);

    // Also mirror to global audit_logs table for single-pane queries
    try {
      const globalAuditId = `aud_glob_${crypto.randomBytes(8).toString('hex')}`;
      await pgDb.query(
        `
        INSERT INTO "audit_logs" (
          "id", "userId", "action", "resource", "resourceId", "details", "ipAddress", "userAgent"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          globalAuditId,
          entry.actorUserId,
          `[${entry.mode}] ${entry.action}`,
          entry.resource || 'impersonation',
          entry.resourceId || null,
          JSON.stringify({
            effectiveUserId: entry.effectiveUserId,
            effectiveEmail: entry.effectiveEmail,
            mode: entry.mode,
            ...entry.details,
          }),
          entry.ipAddress || null,
          entry.userAgent || null,
        ]
      );
    } catch {
      // Best-effort mirror
    }
  }

  /**
   * 10.5: Retrieve Paginated Audit Logs
   */
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    actorUserId?: string;
    mode?: string;
  }): Promise<PaginatedResponse<PreviewAuditLogDTO>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    if (params.actorUserId) {
      queryParams.push(params.actorUserId);
      whereClauses.push(`"actorUserId" = $${queryParams.length}`);
    }

    if (params.mode) {
      queryParams.push(params.mode);
      whereClauses.push(`"mode" = $${queryParams.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await pgDb.query(
      `SELECT COUNT(*) as count FROM "preview_audit_logs" ${whereSql}`,
      queryParams
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataQuery = `
      SELECT * FROM "preview_audit_logs"
      ${whereSql}
      ORDER BY "createdAt" DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const dataRes = await pgDb.query(dataQuery, [...queryParams, limit, offset]);

    const items: PreviewAuditLogDTO[] = dataRes.rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      actorEmail: row.actorEmail || undefined,
      effectiveUserId: row.effectiveUserId,
      effectiveEmail: row.effectiveEmail || undefined,
      mode: row.mode as ImpersonationMode,
      action: row.action,
      resource: row.resource || undefined,
      resourceId: row.resourceId || undefined,
      details: safeParseJson(row.details),
      ipAddress: row.ipAddress || undefined,
      userAgent: row.userAgent || undefined,
      createdAt: new Date(row.createdAt).toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapProfileRow(row: any): PreviewProfileDTO {
    return {
      id: row.id,
      name: row.name,
      createdById: row.createdById,
      billingPlan: row.billingPlan as BillingPlan,
      contentVersion: row.contentVersion as ContentVersion,
      usageMode: row.usageMode as UsageMode,
      courseAccess: safeParseJson(row.courseAccess) || [],
      featureFlags: safeParseJson(row.featureFlags) || {},
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  private mapSessionRow(row: any): ImpersonationSessionDTO {
    return {
      id: row.id,
      token: row.token,
      actorUserId: row.actorUserId,
      actorEmail: row.actorEmail || undefined,
      effectiveUserId: row.effectiveUserId,
      effectiveEmail: row.effectiveUserEmail || undefined,
      mode: row.mode as ImpersonationMode,
      reason: row.reason || undefined,
      sessionData: safeParseJson(row.sessionData) || {
        simulatedPlan: 'FREE',
        contentVersion: 'PUBLISHED',
        usageMode: 'NORMAL',
        courseAccess: [],
        featureFlags: {},
      },
      startedAt: new Date(row.startedAt).toISOString(),
      expiresAt: new Date(row.expiresAt).toISOString(),
      isActive: Boolean(row.isActive),
    };
  }
}

export const previewService = new PreviewService();
