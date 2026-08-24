import { pgDb } from '@repo/database';
import {
  UserAICreditsDTO,
  AIUsageHistoryDTO,
} from '@repo/types';
import crypto from 'crypto';

export class AIUsageService {
  /**
   * Get user credits with automated daily reset handling.
   */
  static async getUserCredits(userId: string): Promise<UserAICreditsDTO> {
    const db = pgDb;

    let res = await db.query(
      `SELECT * FROM "user_ai_credits" WHERE "userId" = $1`,
      [userId]
    );

    const { EntitlementService } = await import('./entitlement.service');
    const planAllowance = await EntitlementService.getDailyAiCreditsAllowance(userId);

    if (res.rows.length === 0) {
      // Auto-initialize default credits with plan tier allowance
      const initId = `crd_${userId}`;
      await db.query(
        `INSERT INTO "user_ai_credits" ("id", "userId", "includedDailyCredits", "dailyCreditsUsed", "purchasedCredits", "monthlyTokenCap", "tokensUsedThisMonth", "isCapped")
         VALUES ($1, $2, $3, 0, 0, 500000, 0, false)`,
        [initId, userId, planAllowance]
      );
      res = await db.query(`SELECT * FROM "user_ai_credits" WHERE "userId" = $1`, [userId]);
    }

    const row = res.rows[0] as any;

    // Synchronize daily credit allowance if plan tier changed
    if (row.includedDailyCredits !== planAllowance) {
      await db.query(
        `UPDATE "user_ai_credits" SET "includedDailyCredits" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $2`,
        [planAllowance, userId]
      );
      row.includedDailyCredits = planAllowance;
    }

    // Check if daily reset is needed (if last reset was before today 00:00 UTC)
    const now = new Date();
    const lastReset = new Date(row.lastDailyReset || row.createdAt);
    const isDifferentDay =
      now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCDate() !== lastReset.getUTCDate();

    if (isDifferentDay) {
      await db.query(
        `UPDATE "user_ai_credits" SET "dailyCreditsUsed" = 0, "lastDailyReset" = CURRENT_TIMESTAMP WHERE "userId" = $1`,
        [userId]
      );
      row.dailyCreditsUsed = 0;
    }

    const remainingDailyCredits = Math.max(0, row.includedDailyCredits - row.dailyCreditsUsed);
    const totalAvailableCredits = remainingDailyCredits + (row.purchasedCredits || 0);

    return {
      id: row.id,
      userId: row.userId,
      includedDailyCredits: row.includedDailyCredits,
      dailyCreditsUsed: row.dailyCreditsUsed,
      remainingDailyCredits,
      purchasedCredits: row.purchasedCredits,
      totalAvailableCredits,
      monthlyTokenCap: row.monthlyTokenCap,
      tokensUsedThisMonth: row.tokensUsedThisMonth,
      isCapped: row.isCapped || row.tokensUsedThisMonth >= row.monthlyTokenCap,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Check if user has exceeded the daily limit for a specific AI feature.
   * Compares usage today in ai_usage_history against the configurable limit in ai_prompt_templates.
   */
  static async checkFeatureDailyLimit(
    userId: string,
    featureKey: string
  ): Promise<{ allowed: boolean; countToday: number; dailyLimit: number | null }> {
    const db = pgDb;

    // 1. Fetch configurable limit for this featureKey
    const tmplRes = await db.query(
      `SELECT "dailyLimit" FROM "ai_prompt_templates" WHERE "featureKey" = $1 AND "isActive" = true ORDER BY "version" DESC LIMIT 1`,
      [featureKey]
    );

    const dailyLimit = (tmplRes.rows[0] as any)?.dailyLimit;
    // If no limit is configured or limit is null/<=0, this feature is uncapped
    if (dailyLimit === undefined || dailyLimit === null || dailyLimit <= 0) {
      return { allowed: true, countToday: 0, dailyLimit: null };
    }

    // 2. Count consumed actions today for this user and feature
    const countRes = await db.query(
      `SELECT COUNT(*)::int as count FROM "ai_usage_history"
       WHERE "userId" = $1 AND "feature" = $2 AND "status" = 'CONSUMED' AND "createdAt" >= CURRENT_DATE`,
      [userId, featureKey]
    );

    const countToday = (countRes.rows[0] as any)?.count || 0;
    if (countToday >= dailyLimit) {
      throw new Error(`FEATURE_DAILY_LIMIT_EXCEEDED: Daily limit of ${dailyLimit} requests for feature '${featureKey}' has been reached for today.`);
    }

    return { allowed: true, countToday, dailyLimit };
  }

  /**
   * Enforce credit limits and deduct required credits before an AI operation.
   */
  static async deductCredits(
    userId: string,
    feature: string,
    creditsRequired: number = 1,
    jobId?: string
  ): Promise<{ success: boolean; creditType: 'INCLUDED' | 'PURCHASED'; usageId: string }> {
    const db = pgDb;
    const credits = await this.getUserCredits(userId);

    if (credits.isCapped) {
      throw new Error('AI_MONTHLY_TOKEN_CAP_REACHED');
    }

    if (credits.totalAvailableCredits < creditsRequired) {
      throw new Error('INSUFFICIENT_AI_CREDITS');
    }

    let creditType: 'INCLUDED' | 'PURCHASED' = 'INCLUDED';

    if (credits.remainingDailyCredits >= creditsRequired) {
      // Deduct from included daily credits first
      await db.query(
        `UPDATE "user_ai_credits" SET "dailyCreditsUsed" = "dailyCreditsUsed" + $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $2`,
        [creditsRequired, userId]
      );
      creditType = 'INCLUDED';
    } else {
      // Deduct remainder from purchased credits
      const fromDaily = credits.remainingDailyCredits;
      const fromPurchased = creditsRequired - fromDaily;

      await db.query(
        `UPDATE "user_ai_credits" SET "dailyCreditsUsed" = "includedDailyCredits", "purchasedCredits" = "purchasedCredits" - $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $2`,
        [fromPurchased, userId]
      );
      creditType = 'PURCHASED';
    }

    const usageId = `usg_${crypto.randomBytes(8).toString('hex')}`;
    await db.query(
      `INSERT INTO "ai_usage_history" ("id", "userId", "feature", "creditType", "creditsDeducted", "tokensUsed", "status", "jobId")
       VALUES ($1, $2, $3, $4, $5, 0, 'CONSUMED', $6)`,
      [usageId, userId, feature, creditType, creditsRequired, jobId || null]
    );

    return { success: true, creditType, usageId };
  }

  /**
   * Update token consumption and check monthly cap.
   */
  static async recordTokensUsed(userId: string, usageId: string, tokens: number): Promise<void> {
    const db = pgDb;
    await db.query(
      `UPDATE "ai_usage_history" SET "tokensUsed" = $1 WHERE "id" = $2`,
      [tokens, usageId]
    );

    await db.query(
      `UPDATE "user_ai_credits" SET "tokensUsedThisMonth" = "tokensUsedThisMonth" + $1, "isCapped" = ("tokensUsedThisMonth" + $1 >= "monthlyTokenCap") WHERE "userId" = $2`,
      [tokens, userId]
    );
  }

  /**
   * Refund credits on unexpected failure.
   */
  static async refundCredits(userId: string, usageId: string): Promise<void> {
    const db = pgDb;
    const res = await db.query(
      `SELECT * FROM "ai_usage_history" WHERE "id" = $1 AND "status" = 'CONSUMED'`,
      [usageId]
    );

    if (res.rows.length === 0) return;

    const row = res.rows[0] as any;
    const amount = row.creditsDeducted;

    if (row.creditType === 'PURCHASED') {
      await db.query(
        `UPDATE "user_ai_credits" SET "purchasedCredits" = "purchasedCredits" + $1 WHERE "userId" = $2`,
        [amount, userId]
      );
    } else {
      await db.query(
        `UPDATE "user_ai_credits" SET "dailyCreditsUsed" = GREATEST(0, "dailyCreditsUsed" - $1) WHERE "userId" = $2`,
        [amount, userId]
      );
    }

    await db.query(
      `UPDATE "ai_usage_history" SET "status" = 'REFUNDED' WHERE "id" = $1`,
      [usageId]
    );
  }

  /**
   * Get user usage history.
   */
  static async getUserUsageHistory(userId: string, limit: number = 50): Promise<AIUsageHistoryDTO[]> {
    const db = pgDb;
    const res = await db.query(
      `SELECT * FROM "ai_usage_history" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
      [userId, limit]
    );
    return res.rows as any[];
  }

  /**
   * Aggregated admin usage report.
   */
  static async getAdminUsageReport(): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalEstimatedCost: number;
    totalCreditsConsumed: number;
    topUsers: any[];
  }> {
    const db = pgDb;

    const statsRes = await db.query(`
      SELECT 
        COUNT(*)::int as "totalRequests",
        COALESCE(SUM("totalTokens"), 0)::int as "totalTokens",
        COALESCE(SUM("estimatedCost"), 0)::float as "totalEstimatedCost"
      FROM "ai_gateway_logs"
    `);

    const creditsRes = await db.query(`
      SELECT COALESCE(SUM("creditsDeducted"), 0)::int as "totalCredits"
      FROM "ai_usage_history"
      WHERE "status" = 'CONSUMED' AND "creditsDeducted" > 0
    `);

    const topUsersRes = await db.query(`
      SELECT u."id", u."email", u."firstName", u."lastName", 
             COUNT(h."id")::int as "actionsCount",
             COALESCE(SUM(h."creditsDeducted"), 0)::int as "creditsUsed",
             COALESCE(SUM(h."tokensUsed"), 0)::int as "tokensUsed"
      FROM "users" u
      JOIN "ai_usage_history" h ON u."id" = h."userId" AND h."status" = 'CONSUMED' AND h."creditsDeducted" > 0
      GROUP BY u."id", u."email", u."firstName", u."lastName"
      ORDER BY "creditsUsed" DESC
      LIMIT 10
    `);

    const statsRow = (statsRes.rows[0] || {}) as any;
    const rawCredits = creditsRes.rows[0] ? Object.values(creditsRes.rows[0])[0] : 0;

    return {
      totalRequests: Number(statsRow.totalRequests ?? statsRow.totalrequests ?? 0),
      totalTokens: Number(statsRow.totalTokens ?? statsRow.totaltokens ?? 0),
      totalEstimatedCost: Number(statsRow.totalEstimatedCost ?? statsRow.totalestimatedcost ?? 0.0),
      totalCreditsConsumed: Number(rawCredits || 0),
      topUsers: topUsersRes.rows,
    };
  }
}
