import { pgDb } from '@repo/database';
import {
  PlanDTO,
  CreatePlanDTO,
  UpdatePlanDTO,
  SubscriptionDTO,
  SubscriptionStatus,
} from '@repo/types';
import { EntitlementEngine, BASELINE_PLAN_CONFIGS } from '@repo/entitlement-engine';
import crypto from 'crypto';

export class SubscriptionService {
  /**
   * List all subscription plans.
   */
  static async listPlans(includeInactive: boolean = false): Promise<PlanDTO[]> {
    const res = await pgDb.query(
      `SELECT * FROM "plans" ${includeInactive ? '' : 'WHERE "isActive" = true'} ORDER BY "price" ASC`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      price: r.price,
      billingCycle: r.billingCycle,
      description: r.description,
      features: r.features || [],
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Get plan details by code.
   */
  static async getPlanByCode(code: string): Promise<PlanDTO | null> {
    const normalized = EntitlementEngine.normalizePlanTier(code);
    const res = await pgDb.query(
      `SELECT * FROM "plans" WHERE "code" = $1`,
      [normalized]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0] as any;
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      price: r.price,
      billingCycle: r.billingCycle,
      description: r.description,
      features: r.features || [],
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  /**
   * Create a new subscription plan (Admin).
   */
  static async createPlan(dto: CreatePlanDTO): Promise<PlanDTO> {
    const id = `plan_${crypto.randomBytes(8).toString('hex')}`;
    const code = dto.code.trim().toUpperCase();
    const res = await pgDb.query(
      `INSERT INTO "plans" ("id", "name", "code", "price", "billingCycle", "description", "features", "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        dto.name.trim(),
        code,
        dto.price,
        dto.billingCycle || 'monthly',
        dto.description || null,
        dto.features || [],
        dto.isActive !== false,
      ]
    );
    const r = res.rows[0] as any;
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      price: r.price,
      billingCycle: r.billingCycle,
      description: r.description,
      features: r.features || [],
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  /**
   * Update an existing plan (Admin).
   */
  static async updatePlan(id: string, dto: UpdatePlanDTO): Promise<PlanDTO> {
    const existingRes = await pgDb.query(`SELECT * FROM "plans" WHERE "id" = $1`, [id]);
    if (existingRes.rows.length === 0) {
      throw new Error('PLAN_NOT_FOUND: Subscription plan not found');
    }
    const current = existingRes.rows[0] as any;

    const name = dto.name !== undefined ? dto.name.trim() : current.name;
    const price = dto.price !== undefined ? dto.price : current.price;
    const billingCycle = dto.billingCycle !== undefined ? dto.billingCycle : current.billingCycle;
    const description = dto.description !== undefined ? dto.description : current.description;
    const features = dto.features !== undefined ? dto.features : current.features;
    const isActive = dto.isActive !== undefined ? dto.isActive : current.isActive;

    const res = await pgDb.query(
      `UPDATE "plans"
       SET "name" = $1, "price" = $2, "billingCycle" = $3, "description" = $4, "features" = $5, "isActive" = $6, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $7
       RETURNING *`,
      [name, price, billingCycle, description, features, isActive, id]
    );
    const r = res.rows[0] as any;
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      price: r.price,
      billingCycle: r.billingCycle,
      description: r.description,
      features: r.features || [],
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  /**
   * Get current active subscription for a user.
   */
  static async getUserSubscription(userId: string): Promise<SubscriptionDTO> {
    const res = await pgDb.query(
      `SELECT s.*, p.name as "planName", p.price as "planPrice", p.description as "planDescription", p.features as "planFeatures", p."billingCycle" as "planBillingCycle"
       FROM "subscriptions" s
       LEFT JOIN "plans" p ON s."planCode" = p.code
       WHERE s."userId" = $1 AND s.status = 'ACTIVE' AND s."endDate" >= CURRENT_TIMESTAMP
       ORDER BY s."createdAt" DESC LIMIT 1`,
      [userId]
    );

    if (res.rows.length > 0) {
      const r = res.rows[0] as any;
      return {
        id: r.id,
        userId: r.userId,
        planCode: r.planCode,
        status: r.status as SubscriptionStatus,
        startDate: r.startDate,
        endDate: r.endDate,
        cancelledAt: r.cancelledAt,
        plan: r.planName
          ? {
              id: `plan_${r.planCode.toLowerCase()}`,
              name: r.planName,
              code: r.planCode,
              price: r.planPrice,
              billingCycle: r.planBillingCycle,
              description: r.planDescription,
              features: r.planFeatures || [],
              isActive: true,
              createdAt: r.startDate,
              updatedAt: r.updatedAt,
            }
          : undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }

    // Default to FREE starter tier
    const freePlan = await this.getPlanByCode('FREE');
    return {
      id: `sub_free_${userId}`,
      userId,
      planCode: 'FREE',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      plan: freePlan || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Subscribe user to a plan.
   */
  static async subscribeUser(
    userId: string,
    planCode: string,
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): Promise<SubscriptionDTO> {
    const normalized = EntitlementEngine.normalizePlanTier(planCode);
    const plan = await this.getPlanByCode(normalized);
    if (!plan) {
      throw new Error(`PLAN_NOT_FOUND: Plan with code '${planCode}' does not exist`);
    }

    // Expire any existing active subscriptions for this user
    await pgDb.query(
      `UPDATE "subscriptions"
       SET "status" = 'EXPIRED', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "userId" = $1 AND "status" = 'ACTIVE'`,
      [userId]
    );

    const subId = `sub_${crypto.randomBytes(8).toString('hex')}`;
    const daysToAdd = billingCycle === 'annual' ? 365 : 30;
    const endDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    const insertRes = await pgDb.query(
      `INSERT INTO "subscriptions" ("id", "userId", "planCode", "status", "startDate", "endDate")
       VALUES ($1, $2, $3, 'ACTIVE', CURRENT_TIMESTAMP, $4)
       RETURNING *`,
      [subId, userId, normalized, endDate]
    );

    // Update base daily AI credits in user_ai_credits according to the plan
    const baselinePlan = BASELINE_PLAN_CONFIGS[normalized];
    if (baselinePlan && baselinePlan.entitlements.daily_ai_credits) {
      const dailyCredits = Number(baselinePlan.entitlements.daily_ai_credits);
      await pgDb.query(
        `UPDATE "user_ai_credits" SET "includedDailyCredits" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $2`,
        [dailyCredits, userId]
      );
    }

    const r = insertRes.rows[0] as any;
    return {
      id: r.id,
      userId: r.userId,
      planCode: r.planCode,
      status: r.status as SubscriptionStatus,
      startDate: r.startDate,
      endDate: r.endDate,
      plan,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  /**
   * Cancel subscription (remains active until endDate, then expires).
   */
  static async cancelSubscription(userId: string): Promise<SubscriptionDTO> {
    const res = await pgDb.query(
      `UPDATE "subscriptions"
       SET "status" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "userId" = $1 AND "status" = 'ACTIVE'
       RETURNING *`,
      [userId]
    );

    if (res.rows.length === 0) {
      throw new Error('NO_ACTIVE_SUBSCRIPTION: No active subscription found to cancel');
    }

    const r = res.rows[0] as any;
    const plan = await this.getPlanByCode(r.planCode);
    return {
      id: r.id,
      userId: r.userId,
      planCode: r.planCode,
      status: r.status as SubscriptionStatus,
      startDate: r.startDate,
      endDate: r.endDate,
      cancelledAt: r.cancelledAt,
      plan: plan || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  /**
   * Update subscription status directly (Admin).
   */
  static async updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatus,
    endDate?: string
  ): Promise<SubscriptionDTO> {
    const res = await pgDb.query(
      `UPDATE "subscriptions"
       SET "status" = $1, "endDate" = COALESCE($2, "endDate"), "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $3
       RETURNING *`,
      [status, endDate || null, id]
    );

    if (res.rows.length === 0) {
      throw new Error('SUBSCRIPTION_NOT_FOUND: Subscription not found');
    }

    const r = res.rows[0] as any;
    const plan = await this.getPlanByCode(r.planCode);
    return {
      id: r.id,
      userId: r.userId,
      planCode: r.planCode,
      status: r.status as SubscriptionStatus,
      startDate: r.startDate,
      endDate: r.endDate,
      cancelledAt: r.cancelledAt,
      plan: plan || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
