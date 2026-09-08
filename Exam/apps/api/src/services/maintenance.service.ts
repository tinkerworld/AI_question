import { pgDb } from '@repo/database';
import {
  MaintenanceConfigDTO,
  MaintenanceStatusDTO,
  FeatureControlDTO,
  FeatureStatus,
  FeatureDisplayMode,
} from '@repo/types';

interface CachedControls {
  timestamp: number;
  controls: Map<string, FeatureControlDTO>;
  globalConfig: any;
  legacyFeatureConfigs: Map<string, any>;
}

export class MaintenanceService {
  private static cache: CachedControls | null = null;
  private static readonly TTL_MS = 10000; // 10 seconds

  private static async loadState(): Promise<CachedControls> {
    const now = Date.now();
    if (this.cache && now - this.cache.timestamp < this.TTL_MS) {
      return this.cache;
    }

    try {
      // 1. Load feature_controls
      const fcRes = await pgDb.query(`SELECT * FROM "feature_controls" ORDER BY "featureKey" ASC`);
      const controls = new Map<string, FeatureControlDTO>();

      for (const r of (fcRes.rows as any[])) {
        let status = (r.status || 'ACTIVE') as FeatureStatus;
        const startAt = r.startAt ? new Date(r.startAt).toISOString() : null;
        const endAt = r.endAt ? new Date(r.endAt).toISOString() : null;

        // Auto-transition scheduled maintenance windows
        const nowMs = Date.now();
        if (startAt && nowMs >= new Date(startAt).getTime()) {
          if (endAt && nowMs > new Date(endAt).getTime()) {
            // Expired scheduled window -> auto-transition back to ACTIVE
            if (status === 'MAINTENANCE') {
              status = 'ACTIVE';
              // Update database asynchronously without blocking
              pgDb.query(
                `UPDATE "feature_controls" SET "status" = 'ACTIVE', "startAt" = NULL, "endAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
                [r.id]
              ).catch(() => {});
            }
          } else if (!endAt || nowMs <= new Date(endAt).getTime()) {
            // Currently within scheduled maintenance window
            if (status === 'ACTIVE') {
              status = 'MAINTENANCE';
            }
          }
        }

        const dto: FeatureControlDTO = {
          id: r.id,
          featureKey: r.featureKey,
          name: r.name,
          description: r.description || null,
          status,
          message: r.message || `${r.name} is currently under maintenance.`,
          reason: r.reason || null,
          startAt,
          endAt,
          allowAdmin: r.allowAdmin ?? true,
          allowTeacher: r.allowTeacher ?? false,
          allowStudent: r.allowStudent ?? false,
          displayMode: (r.displayMode || 'FULL_PAGE') as FeatureDisplayMode,
          updatedBy: r.updatedBy || null,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        };

        controls.set(r.featureKey, dto);
      }

      // 2. Load legacy maintenance_configs
      let globalConfig: any = null;
      const legacyFeatureConfigs = new Map<string, any>();
      try {
        const mcRes = await pgDb.query(`SELECT * FROM "maintenance_configs"`);
        for (const row of (mcRes.rows as any[])) {
          if (row.scope === 'GLOBAL') {
            globalConfig = row;
          } else if (row.scope === 'FEATURE' && row.featureKey) {
            legacyFeatureConfigs.set(row.featureKey, row);
          }
        }
      } catch {}

      this.cache = {
        timestamp: now,
        controls,
        globalConfig,
        legacyFeatureConfigs,
      };

      return this.cache;
    } catch (err) {
      return {
        timestamp: now,
        controls: new Map(),
        globalConfig: null,
        legacyFeatureConfigs: new Map(),
      };
    }
  }

  static invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Return all feature controls (selection-based admin list)
   */
  static async getAllFeatureControls(): Promise<FeatureControlDTO[]> {
    const { controls } = await this.loadState();
    return Array.from(controls.values());
  }

  /**
   * Get single feature control by feature key
   */
  static async getFeatureControl(featureKey: string): Promise<FeatureControlDTO | null> {
    const { controls } = await this.loadState();
    // Direct match
    if (controls.has(featureKey)) {
      return controls.get(featureKey)!;
    }
    // Handle aliases (e.g. vocabulary_practice -> vocabulary)
    if (featureKey === 'vocabulary_practice' && controls.has('vocabulary')) {
      return controls.get('vocabulary')!;
    }
    return null;
  }

  /**
   * Update feature control (status dropdown, message textarea, reason, startAt, endAt, allowAdmin/allowTeacher/allowStudent, displayMode)
   */
  static async updateFeatureControl(
    featureKey: string,
    updates: {
      status?: FeatureStatus;
      message?: string;
      reason?: string | null;
      startAt?: string | null;
      endAt?: string | null;
      allowAdmin?: boolean;
      allowTeacher?: boolean;
      allowStudent?: boolean;
      displayMode?: FeatureDisplayMode;
    },
    actorId?: string
  ): Promise<FeatureControlDTO> {
    const existing = await this.getFeatureControl(featureKey);
    const key = existing ? existing.featureKey : featureKey;

    const newStatus = updates.status || existing?.status || 'ACTIVE';
    const newMessage = updates.message ?? existing?.message ?? `${featureKey} is temporarily under maintenance.`;
    const newReason = updates.reason !== undefined ? updates.reason : (existing?.reason || null);
    const newStartAt = updates.startAt !== undefined ? (updates.startAt ? new Date(updates.startAt) : null) : (existing?.startAt ? new Date(existing.startAt) : null);
    const newEndAt = updates.endAt !== undefined ? (updates.endAt ? new Date(updates.endAt) : null) : (existing?.endAt ? new Date(existing.endAt) : null);
    const newAllowAdmin = updates.allowAdmin !== undefined ? updates.allowAdmin : (existing?.allowAdmin ?? true);
    const newAllowTeacher = updates.allowTeacher !== undefined ? updates.allowTeacher : (existing?.allowTeacher ?? false);
    const newAllowStudent = updates.allowStudent !== undefined ? updates.allowStudent : (existing?.allowStudent ?? false);
    const newDisplayMode = updates.displayMode || existing?.displayMode || 'FULL_PAGE';

    const id = `feat_ctrl_${key}`;

    await pgDb.query(
      `INSERT INTO "feature_controls" (
        "id", "featureKey", "name", "description", "status", "message", "reason",
        "startAt", "endAt", "allowAdmin", "allowTeacher", "allowStudent", "displayMode", "updatedBy", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      ON CONFLICT ("featureKey") DO UPDATE SET
        "status" = EXCLUDED."status",
        "message" = EXCLUDED."message",
        "reason" = EXCLUDED."reason",
        "startAt" = EXCLUDED."startAt",
        "endAt" = EXCLUDED."endAt",
        "allowAdmin" = EXCLUDED."allowAdmin",
        "allowTeacher" = EXCLUDED."allowTeacher",
        "allowStudent" = EXCLUDED."allowStudent",
        "displayMode" = EXCLUDED."displayMode",
        "updatedBy" = EXCLUDED."updatedBy",
        "updatedAt" = CURRENT_TIMESTAMP`,
      [
        id,
        key,
        existing?.name || key,
        existing?.description || null,
        newStatus,
        newMessage,
        newReason,
        newStartAt,
        newEndAt,
        newAllowAdmin,
        newAllowTeacher,
        newAllowStudent,
        newDisplayMode,
        actorId || 'system',
      ]
    );

    // Keep legacy table synced if vocabulary_practice
    if (key === 'vocabulary' || key === 'vocabulary_practice') {
      try {
        await pgDb.query(
          `INSERT INTO "maintenance_configs" ("id", "scope", "featureKey", "isActive", "message", "updatedBy", "updatedAt")
           VALUES ('maint_feat_vocabulary_practice', 'FEATURE', 'vocabulary_practice', $1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT ("id") DO UPDATE SET
             "isActive" = EXCLUDED."isActive",
             "message" = EXCLUDED."message",
             "updatedBy" = EXCLUDED."updatedBy",
             "updatedAt" = CURRENT_TIMESTAMP`,
          [newStatus === 'MAINTENANCE', newMessage, actorId || 'system']
        );
      } catch {}
    }

    this.invalidateCache();
    const updated = await this.getFeatureControl(key);
    return updated!;
  }

  /**
   * Bulk Deactivate All / Restore All
   * "Deactivate All" sets every seeded feature to MAINTENANCE with shared message
   * "Restore All" brings everything back to ACTIVE
   */
  static async bulkSetStatus(
    status: FeatureStatus,
    message?: string,
    reason?: string,
    actorId?: string
  ): Promise<FeatureControlDTO[]> {
    const defaultMsg =
      status === 'MAINTENANCE'
        ? 'Platform features are temporarily undergoing scheduled maintenance. Please check back shortly.'
        : 'Feature active';

    const msg = message || defaultMsg;

    if (status === 'ACTIVE') {
      await pgDb.query(
        `UPDATE "feature_controls" SET
          "status" = 'ACTIVE',
          "reason" = $1,
          "startAt" = NULL,
          "endAt" = NULL,
          "updatedBy" = $2,
          "updatedAt" = CURRENT_TIMESTAMP`,
        [reason || 'Restored all features to active', actorId || 'system']
      );

      // Sync legacy configs
      try {
        await pgDb.query(
          `UPDATE "maintenance_configs" SET "isActive" = false, "updatedBy" = $1, "updatedAt" = CURRENT_TIMESTAMP`,
          [actorId || 'system']
        );
      } catch {}
    } else {
      await pgDb.query(
        `UPDATE "feature_controls" SET
          "status" = $1,
          "message" = $2,
          "reason" = $3,
          "updatedBy" = $4,
          "updatedAt" = CURRENT_TIMESTAMP`,
        [status, msg, reason || 'Bulk status change', actorId || 'system']
      );

      // Sync legacy configs
      try {
        await pgDb.query(
          `UPDATE "maintenance_configs" SET "isActive" = true, "message" = $1, "updatedBy" = $2, "updatedAt" = CURRENT_TIMESTAMP`,
          [msg, actorId || 'system']
        );
      } catch {}
    }

    this.invalidateCache();
    return this.getAllFeatureControls();
  }

  /**
   * Evaluate Feature Availability with role bypass and active exam non-disruption rule
   */
  static async evaluateFeatureAvailability(
    featureKey: string,
    user?: any,
    requestPath?: string
  ): Promise<{
    isAllowed: boolean;
    status: FeatureStatus;
    message: string;
    reason?: string | null;
    displayMode: FeatureDisplayMode;
    featureKey: string;
  }> {
    // 1. Non-disruption rule for in-progress exam attempts:
    // "An active exam attempt in progress must not be disrupted mid-session even if its feature gets set to maintenance while the student is mid-attempt."
    if (featureKey === 'exams' && requestPath) {
      const isAttemptProgress =
        requestPath.includes('/sync') ||
        requestPath.includes('/submit') ||
        requestPath.includes('/answer') ||
        (requestPath.includes('/attempts/') && requestPath.includes('/state'));

      if (isAttemptProgress) {
        return {
          isAllowed: true,
          status: 'ACTIVE',
          message: 'Active exam attempt session permitted',
          reason: 'Exam in-progress non-disruption guarantee',
          displayMode: 'FULL_PAGE',
          featureKey,
        };
      }
    }

    const { controls, globalConfig, legacyFeatureConfigs } = await this.loadState();

    // Check legacy global maintenance
    if (globalConfig && globalConfig.isActive) {
      const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
      const perms: string[] = user?.permissions || [];
      const isStaff =
        roles.includes('MAIN_ADMIN') ||
        roles.includes('SUB_ADMIN') ||
        perms.includes('system.maintenance') ||
        perms.includes('*');

      if (!isStaff) {
        return {
          isAllowed: false,
          status: 'MAINTENANCE',
          message: globalConfig.message || 'System undergoing scheduled maintenance',
          reason: 'Global maintenance active',
          displayMode: 'FULL_PAGE',
          featureKey,
        };
      }
    }

    // Check legacy feature config for vocabulary_practice
    if (featureKey === 'vocabulary_practice' && legacyFeatureConfigs.has('vocabulary_practice')) {
      const leg = legacyFeatureConfigs.get('vocabulary_practice');
      if (leg && leg.isActive) {
        const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
        const perms: string[] = user?.permissions || [];
        const isStaff =
          roles.includes('MAIN_ADMIN') ||
          roles.includes('SUB_ADMIN') ||
          perms.includes('system.maintenance') ||
          perms.includes('*');

        if (!isStaff) {
          return {
            isAllowed: false,
            status: 'MAINTENANCE',
            message: leg.message || 'Vocabulary practice under maintenance',
            reason: 'Legacy feature maintenance active',
            displayMode: 'FULL_PAGE',
            featureKey,
          };
        }
      }
    }

    // Lookup feature control
    let control = controls.get(featureKey);
    if (!control && featureKey === 'vocabulary_practice' && controls.has('vocabulary')) {
      control = controls.get('vocabulary');
    }

    // If feature is not registered in control table, default to ACTIVE
    if (!control) {
      return {
        isAllowed: true,
        status: 'ACTIVE',
        message: 'Feature active',
        displayMode: 'FULL_PAGE',
        featureKey,
      };
    }

    // If status is ACTIVE, allow
    if (control.status === 'ACTIVE') {
      return {
        isAllowed: true,
        status: 'ACTIVE',
        message: control.message,
        displayMode: control.displayMode,
        featureKey: control.featureKey,
      };
    }

    // Check role bypass
    const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
    const perms: string[] = user?.permissions || [];
    const isAdmin =
      roles.includes('MAIN_ADMIN') ||
      roles.includes('SUB_ADMIN') ||
      roles.includes('ADMIN') ||
      perms.includes('system.maintenance') ||
      perms.includes('*');

    const isTeacher = roles.includes('TEACHER');
    const isStudent = roles.includes('STUDENT') || (!isAdmin && !isTeacher && Boolean(user));

    if (isAdmin && control.allowAdmin) {
      return {
        isAllowed: true,
        status: control.status,
        message: 'Admin staff bypass active',
        reason: control.reason,
        displayMode: control.displayMode,
        featureKey: control.featureKey,
      };
    }

    if (isTeacher && control.allowTeacher) {
      return {
        isAllowed: true,
        status: control.status,
        message: 'Teacher role bypass active',
        reason: control.reason,
        displayMode: control.displayMode,
        featureKey: control.featureKey,
      };
    }

    if (isStudent && control.allowStudent) {
      return {
        isAllowed: true,
        status: control.status,
        message: 'Student role bypass active',
        reason: control.reason,
        displayMode: control.displayMode,
        featureKey: control.featureKey,
      };
    }

    // Block request
    return {
      isAllowed: false,
      status: control.status,
      message: control.message,
      reason: isAdmin ? control.reason : null,
      displayMode: control.displayMode,
      featureKey: control.featureKey,
    };
  }

  /**
   * Backwards compatible checkFeature
   */
  static async checkFeature(
    featureKey?: string,
    user?: any
  ): Promise<{
    isUnderMaintenance: boolean;
    message: string;
    estimatedEnd?: string | null;
    featureKey?: string | null;
  }> {
    if (!featureKey) {
      const { globalConfig } = await this.loadState();
      return {
        isUnderMaintenance: Boolean(globalConfig && globalConfig.isActive),
        message: globalConfig?.message || 'System undergoing scheduled maintenance',
        estimatedEnd: globalConfig?.scheduledEnd ? new Date(globalConfig.scheduledEnd).toISOString() : null,
        featureKey: null,
      };
    }

    const evalRes = await this.evaluateFeatureAvailability(featureKey, user);
    const control = await this.getFeatureControl(featureKey);

    return {
      isUnderMaintenance: !evalRes.isAllowed,
      message: evalRes.message,
      estimatedEnd: control?.endAt || null,
      featureKey,
    };
  }

  /**
   * Public Status query
   */
  static async getStatus(): Promise<MaintenanceStatusDTO & { featureControls: Record<string, FeatureControlDTO> }> {
    const { globalConfig, controls, legacyFeatureConfigs } = await this.loadState();
    const features: Record<string, any> = {};
    const featureControlsMap: Record<string, FeatureControlDTO> = {};

    controls.forEach((ctrl, key) => {
      features[key] = {
        isUnderMaintenance: ctrl.status !== 'ACTIVE',
        status: ctrl.status,
        message: ctrl.message,
        displayMode: ctrl.displayMode,
        estimatedEnd: ctrl.endAt,
      };
      featureControlsMap[key] = ctrl;
    });

    legacyFeatureConfigs.forEach((cfg, key) => {
      if (!features[key]) {
        features[key] = {
          isUnderMaintenance: Boolean(cfg.isActive),
          message: cfg.message,
          estimatedEnd: cfg.scheduledEnd ? new Date(cfg.scheduledEnd).toISOString() : null,
        };
      }
    });

    return {
      isGlobalMaintenance: Boolean(globalConfig && globalConfig.isActive),
      globalMessage: globalConfig?.message || undefined,
      features,
      featureControls: featureControlsMap,
    };
  }

  /**
   * Backwards compatible getConfigs
   */
  static async getConfigs(): Promise<MaintenanceConfigDTO[]> {
    try {
      const res = await pgDb.query(
        `SELECT * FROM "maintenance_configs" ORDER BY "scope" ASC, "featureKey" ASC`
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        scope: r.scope,
        featureKey: r.featureKey,
        isActive: Boolean(r.isActive),
        message: r.message,
        scheduledStart: r.scheduledStart ? new Date(r.scheduledStart).toISOString() : null,
        scheduledEnd: r.scheduledEnd ? new Date(r.scheduledEnd).toISOString() : null,
        allowedRoles: Array.isArray(r.allowedRoles) ? r.allowedRoles : JSON.parse(r.allowedRoles || '[]'),
        updatedBy: r.updatedBy,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Set global maintenance
   */
  static async setGlobalMaintenance(
    isActive: boolean,
    message: string = 'System undergoing scheduled maintenance',
    scheduledEnd?: string,
    actorId?: string
  ): Promise<MaintenanceConfigDTO> {
    const id = 'maint_global';
    await pgDb.query(
      `INSERT INTO "maintenance_configs" ("id", "scope", "featureKey", "isActive", "message", "scheduledEnd", "updatedBy", "updatedAt")
       VALUES ($1, 'GLOBAL', NULL, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT ("id") DO UPDATE SET
         "isActive" = EXCLUDED."isActive",
         "message" = EXCLUDED."message",
         "scheduledEnd" = EXCLUDED."scheduledEnd",
         "updatedBy" = EXCLUDED."updatedBy",
         "updatedAt" = CURRENT_TIMESTAMP`,
      [id, isActive, message, scheduledEnd ? new Date(scheduledEnd) : null, actorId || 'system']
    );

    this.invalidateCache();
    const rows = await this.getConfigs();
    return rows.find((c) => c.id === id) || {
      id,
      scope: 'GLOBAL',
      isActive,
      message,
      allowedRoles: ['MAIN_ADMIN', 'SUB_ADMIN'],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Set feature maintenance
   */
  static async setFeatureMaintenance(
    featureKey: string,
    isActive: boolean,
    message?: string,
    scheduledEnd?: string,
    actorId?: string
  ): Promise<MaintenanceConfigDTO> {
    const status: FeatureStatus = isActive ? 'MAINTENANCE' : 'ACTIVE';
    const id = `maint_feat_${featureKey}`;
    const defaultMsg = `Feature '${featureKey}' is temporarily undergoing maintenance`;

    await pgDb.query(
      `INSERT INTO "maintenance_configs" ("id", "scope", "featureKey", "isActive", "message", "scheduledEnd", "updatedBy", "updatedAt")
       VALUES ($1, 'FEATURE', $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT ("id") DO UPDATE SET
         "isActive" = EXCLUDED."isActive",
         "message" = EXCLUDED."message",
         "scheduledEnd" = EXCLUDED."scheduledEnd",
         "updatedBy" = EXCLUDED."updatedBy",
         "updatedAt" = CURRENT_TIMESTAMP`,
      [id, featureKey, isActive, message || defaultMsg, scheduledEnd ? new Date(scheduledEnd) : null, actorId || 'system']
    );

    // Also update feature_controls if matching
    try {
      await this.updateFeatureControl(
        featureKey,
        {
          status,
          message: message || defaultMsg,
          endAt: scheduledEnd || null,
        },
        actorId
      );
    } catch {}

    this.invalidateCache();
    const rows = await this.getConfigs();
    return rows.find((c) => c.id === id) || {
      id,
      scope: 'FEATURE',
      featureKey,
      isActive,
      message: message || defaultMsg,
      allowedRoles: ['MAIN_ADMIN', 'SUB_ADMIN'],
      updatedAt: new Date().toISOString(),
    };
  }
}
