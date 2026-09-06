import { pgDb } from '@repo/database';
import { MaintenanceConfigDTO, MaintenanceStatusDTO } from '@repo/types';

interface CachedState {
  timestamp: number;
  globalConfig: any;
  featureConfigs: Map<string, any>;
}

export class MaintenanceService {
  private static cache: CachedState | null = null;
  private static readonly TTL_MS = 10000; // 10 seconds

  private static async loadConfigs(): Promise<CachedState> {
    const now = Date.now();
    if (this.cache && now - this.cache.timestamp < this.TTL_MS) {
      return this.cache;
    }

    try {
      const res = await pgDb.query(`SELECT * FROM "maintenance_configs"`);
      let globalConfig: any = null;
      const featureConfigs = new Map<string, any>();

      for (const row of (res.rows as any[])) {
        if (row.scope === 'GLOBAL') {
          globalConfig = row;
        } else if (row.scope === 'FEATURE' && row.featureKey) {
          featureConfigs.set(row.featureKey, row);
        }
      }

      this.cache = {
        timestamp: now,
        globalConfig,
        featureConfigs,
      };
      return this.cache;
    } catch (err) {
      // Fallback safe state
      return {
        timestamp: now,
        globalConfig: null,
        featureConfigs: new Map(),
      };
    }
  }

  static invalidateCache(): void {
    this.cache = null;
  }

  static async checkFeature(
    featureKey?: string,
    user?: any
  ): Promise<{
    isUnderMaintenance: boolean;
    message: string;
    estimatedEnd?: string | null;
    featureKey?: string | null;
  }> {
    // Staff bypass check (MAIN_ADMIN, SUB_ADMIN or system.maintenance permission)
    if (user) {
      const roles: string[] = user.roles || [];
      const permissions: string[] = user.permissions || [];
      if (
        roles.includes('MAIN_ADMIN') ||
        roles.includes('SUB_ADMIN') ||
        permissions.includes('system.maintenance') ||
        permissions.includes('*')
      ) {
        return {
          isUnderMaintenance: false,
          message: 'Staff bypass active',
          featureKey: featureKey || null,
        };
      }
    }

    const { globalConfig, featureConfigs } = await this.loadConfigs();

    // 1. Check Global Maintenance
    if (globalConfig && globalConfig.isActive) {
      return {
        isUnderMaintenance: true,
        message: globalConfig.message || 'System undergoing scheduled maintenance',
        estimatedEnd: globalConfig.scheduledEnd ? new Date(globalConfig.scheduledEnd).toISOString() : null,
        featureKey: null,
      };
    }

    // 2. Check Feature Maintenance
    if (featureKey && featureConfigs.has(featureKey)) {
      const fc = featureConfigs.get(featureKey);
      if (fc && fc.isActive) {
        return {
          isUnderMaintenance: true,
          message: fc.message || `Feature '${featureKey}' is temporarily under maintenance`,
          estimatedEnd: fc.scheduledEnd ? new Date(fc.scheduledEnd).toISOString() : null,
          featureKey,
        };
      }
    }

    return {
      isUnderMaintenance: false,
      message: 'Feature active',
      featureKey: featureKey || null,
    };
  }

  static async getStatus(): Promise<MaintenanceStatusDTO> {
    const { globalConfig, featureConfigs } = await this.loadConfigs();
    const features: Record<string, any> = {};

    featureConfigs.forEach((cfg, key) => {
      features[key] = {
        isUnderMaintenance: Boolean(cfg.isActive),
        message: cfg.message,
        estimatedEnd: cfg.scheduledEnd ? new Date(cfg.scheduledEnd).toISOString() : null,
      };
    });

    return {
      isGlobalMaintenance: Boolean(globalConfig && globalConfig.isActive),
      globalMessage: globalConfig?.message || undefined,
      features,
    };
  }

  static async getConfigs(): Promise<MaintenanceConfigDTO[]> {
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
  }

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
    return rows.find((c) => c.id === id)!;
  }

  static async setFeatureMaintenance(
    featureKey: string,
    isActive: boolean,
    message?: string,
    scheduledEnd?: string,
    actorId?: string
  ): Promise<MaintenanceConfigDTO> {
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

    this.invalidateCache();
    const rows = await this.getConfigs();
    return rows.find((c) => c.id === id)!;
  }
}
