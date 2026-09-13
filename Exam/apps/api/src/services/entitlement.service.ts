import { pgDb } from '@repo/database';
import {
  EntitlementEngine,
  EntitlementRule,
  StandardEntitlementKey,
  BASELINE_ENTITLEMENT_DEFINITIONS,
  BASELINE_PLAN_CONFIGS,
  PlanTier,
} from '@repo/entitlement-engine';
import {
  EntitlementCheckDTO,
  EntitlementRuleDTO,
  AuthContext,
} from '@repo/types';
import crypto from 'crypto';

export class EntitlementService {
  /**
   * Resolve user's active plan tier.
   * If running in Preview Student impersonation mode, honors the in-memory simulatedPlan.
   */
  static async getEffectiveUserPlan(
    userId: string,
    authContext?: any
  ): Promise<string> {
    // 1. Check if active session is Preview Student mode with simulatedPlan
    if (
      authContext?.isImpersonation &&
      (authContext?.impersonationMode === 'PREVIEW_STUDENT' ||
        authContext?.impersonation?.mode === 'PREVIEW_STUDENT' ||
        authContext?.sessionData?.simulatedPlan ||
        authContext?.sessionData?.billingPlan)
    ) {
      const simulatedPlan =
        authContext?.sessionData?.simulatedPlan ||
        authContext?.sessionData?.billingPlan ||
        authContext?.impersonation?.sessionData?.simulatedPlan ||
        authContext?.impersonation?.sessionData?.billingPlan ||
        'FREE';
      return EntitlementEngine.normalizePlanTier(simulatedPlan);
    }

    if (userId === 'usr_preview_student') {
      const activeSessRes = await pgDb.query(
        `SELECT "sessionData" FROM "impersonation_sessions" WHERE "effectiveUserId" = 'usr_preview_student' AND "isActive" = true ORDER BY "createdAt" DESC LIMIT 1`
      );
      if (activeSessRes.rows.length > 0) {
        const rawData = (activeSessRes.rows[0] as any).sessionData;
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const plan = data?.simulatedPlan || data?.billingPlan || 'FREE';
        return EntitlementEngine.normalizePlanTier(plan);
      }
    }

    // 2. Grant Institutional tier to admin, faculty, and primary demo accounts
    const roles = Array.isArray(authContext?.roles) ? authContext.roles : (authContext?.role ? [authContext.role] : []);
    if (
      roles.includes('ADMIN') ||
      roles.includes('MAIN_ADMIN') ||
      roles.includes('SUB_ADMIN') ||
      roles.includes('TEACHER') ||
      userId === 'usr_student_test' ||
      authContext?.userId === 'usr_student_test' ||
      authContext?.email === 'student@examos.com'
    ) {
      return 'INSTITUTIONAL';
    }

    // 3. Query active subscription from database
    const res = await pgDb.query(
      `SELECT "planCode", "status", "endDate" FROM "subscriptions"
       WHERE "userId" = $1 AND "status" = 'ACTIVE' AND "endDate" >= CURRENT_TIMESTAMP
       ORDER BY "createdAt" DESC LIMIT 1`,
      [userId]
    );

    if (res.rows.length > 0) {
      return EntitlementEngine.normalizePlanTier((res.rows[0] as any).planCode);
    }

    return 'FREE';
  }

  /**
   * Fetch custom database entitlement rules.
   */
  static async getCustomEntitlementRules(): Promise<EntitlementRule[]> {
    const res = await pgDb.query(
      `SELECT "id", "planCode", "entitlementKey", "entitlementType", "entitlementValue" FROM "entitlement_rules"`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      planCode: r.planCode,
      entitlementKey: r.entitlementKey,
      entitlementType: r.entitlementType,
      entitlementValue: r.entitlementValue,
    }));
  }

  /**
   * Count current student usage for numerical entitlements.
   */
  static async getCurrentUsage(
    userId: string,
    key: string,
    authContext?: any
  ): Promise<number> {
    // In Preview Mode, simulated usage can be evaluated
    if (authContext?.isImpersonation && authContext?.impersonationMode === 'PREVIEW_STUDENT') {
      return 0; // Default clean slate for preview testing
    }

    if (key === 'mock_tests') {
      const res = await pgDb.query(
        `SELECT COUNT(*)::int as count FROM "exam_attempts"
         WHERE "userId" = $1
           AND "createdAt" >= COALESCE((SELECT "startDate" FROM "subscriptions" WHERE "userId" = $1 AND "status" = 'ACTIVE' ORDER BY "createdAt" DESC LIMIT 1), CURRENT_TIMESTAMP)`,
        [userId]
      );
      return (res.rows[0] as any)?.count || 0;
    }

    if (key === 'ai_interview_daily') {
      const res = await pgDb.query(
        `SELECT COUNT(*)::int as count FROM "interview_sessions"
         WHERE "userId" = $1 AND "createdAt" >= CURRENT_DATE`,
        [userId]
      );
      return (res.rows[0] as any)?.count || 0;
    }

    if (key === 'daily_ai_credits') {
      const res = await pgDb.query(
        `SELECT "dailyCreditsUsed" FROM "user_ai_credits" WHERE "userId" = $1`,
        [userId]
      );
      return (res.rows[0] as any)?.dailyCreditsUsed || 0;
    }

    return 0;
  }

  /**
   * Check access and limits for a specific entitlement key.
   */
  static async checkAccess(
    userId: string,
    key: string,
    authContext?: any,
    currentUsageOverride?: number
  ): Promise<EntitlementCheckDTO> {
    const planTier = await this.getEffectiveUserPlan(userId, authContext);
    const customRules = await this.getCustomEntitlementRules();

    // Check active promotional window
    const activePromos = await this.getActivePromotions();
    const matchingPromo = (activePromos as any[]).find((p: any) => p.featureKey === key);
    if (matchingPromo) {
      return {
        allowed: true,
        key,
        planTier,
        limit: null,
        value: true,
        currentUsage: 0,
        remaining: null,
        reason: `Unlocked via active promotional window: ${matchingPromo.description || 'Promotional trial'}`,
      };
    }

    const currentUsage =
      currentUsageOverride !== undefined
        ? currentUsageOverride
        : await this.getCurrentUsage(userId, key, authContext);

    const evaluation = EntitlementEngine.evaluateEntitlement(
      planTier,
      key,
      currentUsage,
      customRules
    );

    return {
      allowed: evaluation.allowed,
      key: evaluation.key,
      planTier: evaluation.planTier,
      limit: evaluation.limit,
      value: evaluation.value,
      currentUsage,
      remaining: evaluation.remaining,
      reason: evaluation.reason,
    };
  }

  /**
   * Get all resolved entitlements with live limits and usage counts for a user.
   */
  static async getUserEntitlements(
    userId: string,
    authContext?: any
  ): Promise<{
    planTier: string;
    entitlements: Record<string, EntitlementCheckDTO>;
  }> {
    const planTier = await this.getEffectiveUserPlan(userId, authContext);
    const customRules = await this.getCustomEntitlementRules();
    const result: Record<string, EntitlementCheckDTO> = {};

    for (const key of Object.keys(BASELINE_ENTITLEMENT_DEFINITIONS)) {
      const currentUsage = await this.getCurrentUsage(userId, key, authContext);
      const evalResult = EntitlementEngine.evaluateEntitlement(
        planTier,
        key,
        currentUsage,
        customRules
      );

      result[key] = {
        allowed: evalResult.allowed,
        key: evalResult.key,
        planTier: evalResult.planTier,
        limit: evalResult.limit,
        value: evalResult.value,
        currentUsage,
        remaining: evalResult.remaining,
        reason: evalResult.reason,
      };
    }

    return { planTier, entitlements: result };
  }

  /**
   * Get all entitlement rules configured for a plan.
   */
  static async getPlanEntitlements(planCode: string): Promise<EntitlementRuleDTO[]> {
    const normalized = EntitlementEngine.normalizePlanTier(planCode);
    const res = await pgDb.query(
      `SELECT * FROM "entitlement_rules" WHERE "planCode" = $1 ORDER BY "entitlementKey" ASC`,
      [normalized]
    );
    return res.rows as any[];
  }

  /**
   * List all entitlement rules across all plans for Admin panel.
   */
  static async listAllEntitlements(): Promise<EntitlementRuleDTO[]> {
    const res = await pgDb.query(
      `SELECT * FROM "entitlement_rules" ORDER BY "planCode" ASC, "entitlementKey" ASC`
    );
    return res.rows as any[];
  }

  /**
   * Update an entitlement rule's value dynamically (Main Admin).
   */
  static async updateEntitlementRule(
    planCode: string,
    entitlementKey: string,
    entitlementValue: string
  ): Promise<EntitlementRuleDTO> {
    const normalized = EntitlementEngine.normalizePlanTier(planCode);
    const res = await pgDb.query(
      `UPDATE "entitlement_rules"
       SET "entitlementValue" = $1, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "planCode" = $2 AND "entitlementKey" = $3
       RETURNING *`,
      [entitlementValue.trim(), normalized, entitlementKey.trim()]
    );

    if (res.rows.length === 0) {
      // Insert if not existing
      const id = `ent_${normalized.toLowerCase()}_${entitlementKey}`;
      const type = ['mock_tests', 'ai_interview_daily', 'demo_duration', 'daily_ai_credits'].includes(entitlementKey)
        ? 'NUMBER'
        : 'BOOLEAN';

      const insertRes = await pgDb.query(
        `INSERT INTO "entitlement_rules" ("id", "planCode", "entitlementKey", "entitlementType", "entitlementValue")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, normalized, entitlementKey, type, entitlementValue.trim()]
      );
      return insertRes.rows[0] as any;
    }

    return res.rows[0] as any;
  }

  /**
   * Helper for AIUsageService to determine user daily included credit allowance based on subscription.
   */
  static async getDailyAiCreditsAllowance(
    userId: string,
    authContext?: any
  ): Promise<number> {
    const planTier = await this.getEffectiveUserPlan(userId, authContext);
    const customRules = await this.getCustomEntitlementRules();
    const resolved = EntitlementEngine.resolveEntitlementValue(
      planTier,
      'daily_ai_credits',
      customRules
    );
    return Number(resolved.value) || 5;
  }

  // ==========================================================================
  // Phase 15: Feature Registry, Dynamic Matrix & Promotional Entitlements
  // ==========================================================================

  /**
   * List all registered features from feature_registry.
   */
  static async listRegisteredFeatures(): Promise<any[]> {
    const res = await pgDb.query(
      `SELECT * FROM "feature_registry" ORDER BY "category" ASC, "name" ASC`
    );
    return res.rows;
  }

  /**
   * Register a new feature in the feature_registry.
   */
  static async createFeatureRegistryItem(data: {
    key: string;
    name: string;
    type?: 'BOOLEAN' | 'NUMBER';
    defaultValue?: string;
    category?: string;
    description: string;
  }): Promise<any> {
    const id = `feat_${data.key.trim()}`;
    const res = await pgDb.query(
      `INSERT INTO "feature_registry" ("id", "key", "name", "type", "defaultValue", "category", "description")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("key") DO UPDATE SET
         "name" = EXCLUDED."name",
         "type" = EXCLUDED."type",
         "defaultValue" = EXCLUDED."defaultValue",
         "category" = EXCLUDED."category",
         "description" = EXCLUDED."description"
       RETURNING *`,
      [
        id,
        data.key.trim(),
        data.name.trim(),
        data.type || 'BOOLEAN',
        data.defaultValue || 'false',
        data.category || 'general',
        data.description.trim(),
      ]
    );
    return res.rows[0];
  }

  /**
   * List all active and historical promotional rules.
   */
  static async listPromotions(): Promise<any[]> {
    const res = await pgDb.query(
      `SELECT * FROM "promotional_entitlement_rules" ORDER BY "startsAt" DESC`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      featureKey: r.featureKey,
      courseId: r.courseId,
      startsAt: r.startsAt ? new Date(r.startsAt).toISOString() : '',
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : '',
      isActive: Boolean(r.isActive),
      description: r.description,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    }));
  }

  /**
   * Fetch currently active promotional rules (now >= startsAt and now <= expiresAt).
   */
  static async getActivePromotions(): Promise<any[]> {
    const res = await pgDb.query(
      `SELECT * FROM "promotional_entitlement_rules"
       WHERE "isActive" = true
         AND "startsAt" <= CURRENT_TIMESTAMP
         AND "expiresAt" >= CURRENT_TIMESTAMP`
    );
    return res.rows;
  }

  /**
   * Create a date-based promotional access window.
   */
  static async createPromotion(data: {
    featureKey: string;
    courseId?: string;
    startsAt?: string;
    expiresAt: string;
    description?: string;
  }): Promise<any> {
    const id = `promo_${crypto.randomBytes(6).toString('hex')}`;
    const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
    const expiresAt = new Date(data.expiresAt);

    const res = await pgDb.query(
      `INSERT INTO "promotional_entitlement_rules" ("id", "featureKey", "courseId", "startsAt", "expiresAt", "isActive", "description")
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING *`,
      [id, data.featureKey.trim(), data.courseId || null, startsAt, expiresAt, data.description || 'Promotional Free Window']
    );
    return res.rows[0];
  }

  /**
   * Get dynamic plan matrix comparing features across FREE, PREMIUM, PREMIUM_PLUS.
   */
  static async getDynamicMatrix(): Promise<any> {
    const features = await this.listRegisteredFeatures();
    const rules = await this.listAllEntitlements();
    const promotions = await this.listPromotions();

    const plans: Record<string, Record<string, any>> = {
      FREE: {},
      PREMIUM: {},
      PREMIUM_PLUS: {},
    };

    const tiers = ['FREE', 'PREMIUM', 'PREMIUM_PLUS'] as const;
    for (const tier of tiers) {
      for (const f of features) {
        // Find override rule or fall back to default
        const rule = rules.find((r) => r.planCode === tier && r.entitlementKey === f.key);
        if (rule) {
          plans[tier][f.key] = f.type === 'NUMBER' ? Number(rule.entitlementValue) : rule.entitlementValue === 'true';
        } else {
          // Check baseline config
          const baseline = BASELINE_PLAN_CONFIGS[tier]?.entitlements?.[f.key];
          plans[tier][f.key] = baseline !== undefined ? baseline : (f.type === 'NUMBER' ? Number(f.defaultValue) : f.defaultValue === 'true');
        }
      }
    }

    return {
      features,
      plans,
      promotions,
    };
  }

  /**
   * Consolidated evaluated feature status for caller.
   */
  static async getMyStatus(
    userId: string,
    authContext?: any
  ): Promise<any> {
    const planTier = await this.getEffectiveUserPlan(userId, authContext);
    const registered = await this.listRegisteredFeatures();
    const activePromos = await this.getActivePromotions();
    const customRules = await this.getCustomEntitlementRules();
    const features: Record<string, any> = {};

    for (const feat of registered) {
      const promo = activePromos.find((p) => p.featureKey === feat.key);
      if (promo) {
        features[feat.key] = {
          allowed: true,
          key: feat.key,
          planTier,
          limit: null,
          value: true,
          isPromotional: true,
          reason: promo.description || 'Promotional Free Access Window',
        };
        continue;
      }

      const evalRes = EntitlementEngine.evaluateEntitlement(
        planTier,
        feat.key as any,
        0,
        customRules
      );
      features[feat.key] = {
        allowed: evalRes.allowed,
        key: feat.key,
        planTier,
        limit: evalRes.limit,
        value: evalRes.value,
        isPromotional: false,
        reason: evalRes.reason,
      };
    }

    return { planTier, features, activePromotions: activePromos };
  }
}
