export type PlanTier = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';

export type EntitlementType = 'BOOLEAN' | 'NUMBER';

export type StandardEntitlementKey =
  | 'mock_tests'
  | 'ai_interview_daily'
  | 'demo_duration'
  | 'daily_ai_credits'
  | 'full_assessment'
  | 'personalized_practice'
  | 'custom_topic'
  | 'ai_question_modify'
  | 'priority_ai';

export interface EntitlementRuleDefinition {
  key: string;
  type: EntitlementType;
  defaultValue: boolean | number;
  description: string;
}

export interface EntitlementRule {
  id?: string;
  planCode: string;
  entitlementKey: string;
  entitlementType: EntitlementType;
  entitlementValue: string; // 'true', 'false', or numerical string '2'
}

export interface EntitlementEvaluationResult {
  allowed: boolean;
  key: string;
  planTier: string;
  type: EntitlementType;
  limit: number | null;
  value: boolean | number;
  currentUsage?: number;
  remaining?: number | null;
  reason?: string;
}

export interface PlanTierConfig {
  code: PlanTier;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'annual';
  entitlements: Record<StandardEntitlementKey | string, boolean | number>;
}

export const BASELINE_ENTITLEMENT_DEFINITIONS: Record<StandardEntitlementKey, EntitlementRuleDefinition> = {
  mock_tests: {
    key: 'mock_tests',
    type: 'NUMBER',
    defaultValue: 2,
    description: 'Total number of exam / mock test attempts permitted',
  },
  ai_interview_daily: {
    key: 'ai_interview_daily',
    type: 'NUMBER',
    defaultValue: 1,
    description: 'Number of AI oral interview sessions allowed per day',
  },
  demo_duration: {
    key: 'demo_duration',
    type: 'NUMBER',
    defaultValue: 5,
    description: 'Maximum duration in minutes permitted per interview session',
  },
  daily_ai_credits: {
    key: 'daily_ai_credits',
    type: 'NUMBER',
    defaultValue: 5,
    description: 'Daily base AI credits allocated with subscription tier',
  },
  full_assessment: {
    key: 'full_assessment',
    type: 'BOOLEAN',
    defaultValue: false,
    description: 'Access to detailed question-by-question diagnostic rubric evaluation & solutions',
  },
  personalized_practice: {
    key: 'personalized_practice',
    type: 'BOOLEAN',
    defaultValue: false,
    description: 'Ability to generate targeted adaptive practice papers from weakness pool',
  },
  custom_topic: {
    key: 'custom_topic',
    type: 'BOOLEAN',
    defaultValue: false,
    description: 'Create custom practice papers and topic configurations',
  },
  ai_question_modify: {
    key: 'ai_question_modify',
    type: 'BOOLEAN',
    defaultValue: false,
    description: 'Generate AI variations and concept mutations for question authoring',
  },
  priority_ai: {
    key: 'priority_ai',
    type: 'BOOLEAN',
    defaultValue: false,
    description: 'Priority queue dispatch and low-latency cloud model routing for AI calls',
  },
};

export const BASELINE_PLAN_CONFIGS: Record<PlanTier, PlanTierConfig> = {
  FREE: {
    code: 'FREE',
    name: 'Free Starter',
    description: 'Basic access to exploration exams and sample oral interviews',
    price: 0.0,
    billingCycle: 'monthly',
    entitlements: {
      mock_tests: 2,
      ai_interview_daily: 1,
      demo_duration: 5,
      daily_ai_credits: 5,
      full_assessment: false,
      personalized_practice: false,
      custom_topic: false,
      ai_question_modify: false,
      priority_ai: false,
    },
  },
  PREMIUM: {
    code: 'PREMIUM',
    name: 'Premium Scholar',
    description: 'Full access to examinations, personalized practice, and daily AI interviews',
    price: 29.99,
    billingCycle: 'monthly',
    entitlements: {
      mock_tests: 999999,
      ai_interview_daily: 2,
      demo_duration: 30,
      daily_ai_credits: 20,
      full_assessment: true,
      personalized_practice: true,
      custom_topic: true,
      ai_question_modify: true,
      priority_ai: false,
    },
  },
  PREMIUM_PLUS: {
    code: 'PREMIUM_PLUS',
    name: 'Premium+ Master',
    description: 'Unlimited exams, high-capacity AI interview quotas, and priority processing',
    price: 59.99,
    billingCycle: 'monthly',
    entitlements: {
      mock_tests: 999999,
      ai_interview_daily: 10,
      demo_duration: 60,
      daily_ai_credits: 50,
      full_assessment: true,
      personalized_practice: true,
      custom_topic: true,
      ai_question_modify: true,
      priority_ai: true,
    },
  },
};

export class EntitlementEngine {
  /**
   * Normalize plan tier identifier with fallback to FREE.
   */
  static normalizePlanTier(plan?: string | null): PlanTier {
    if (!plan) return 'FREE';
    const upper = plan.trim().toUpperCase();
    if (upper === 'PREMIUM' || upper === 'PREMIUM_PLUS' || upper === 'FREE') {
      return upper as PlanTier;
    }
    if (upper === 'PRO' || upper === 'PREMIUM+' || upper === 'PLUS' || upper === 'INSTITUTIONAL' || upper === 'ADMIN' || upper === 'ENTERPRISE') {
      return 'PREMIUM_PLUS';
    }
    return 'FREE';
  }

  /**
   * Resolve effective entitlement value for a given plan tier, applying any custom database rule overrides.
   */
  static resolveEntitlementValue(
    planTier: string,
    key: string,
    customRules: EntitlementRule[] = []
  ): { type: EntitlementType; value: boolean | number } {
    const tier = this.normalizePlanTier(planTier);

    // 1. Check custom database rules first
    const customRule = customRules.find(
      (r) => r.planCode.toUpperCase() === tier && r.entitlementKey === key
    );

    if (customRule) {
      if (customRule.entitlementType === 'BOOLEAN') {
        const val = customRule.entitlementValue === 'true' || customRule.entitlementValue === '1';
        return { type: 'BOOLEAN', value: val };
      } else {
        const parsed = parseFloat(customRule.entitlementValue);
        const val = isNaN(parsed) ? 0 : parsed;
        return { type: 'NUMBER', value: val };
      }
    }

    // 2. Check baseline plan configuration
    const baselinePlan = BASELINE_PLAN_CONFIGS[tier];
    if (baselinePlan && baselinePlan.entitlements[key] !== undefined) {
      const rawVal = baselinePlan.entitlements[key];
      if (typeof rawVal === 'boolean') {
        return { type: 'BOOLEAN', value: rawVal };
      } else {
        return { type: 'NUMBER', value: rawVal };
      }
    }

    // 3. Fallback to global definition or restrictive default
    const def = BASELINE_ENTITLEMENT_DEFINITIONS[key as StandardEntitlementKey];
    if (def) {
      return { type: def.type, value: def.defaultValue };
    }

    return { type: 'BOOLEAN', value: false };
  }

  /**
   * Evaluate whether an action is allowed for a user on a given plan tier with current usage metrics.
   */
  static evaluateEntitlement(
    planTier: string,
    key: string,
    currentUsage: number = 0,
    customRules: EntitlementRule[] = []
  ): EntitlementEvaluationResult {
    const tier = this.normalizePlanTier(planTier);
    const resolved = this.resolveEntitlementValue(tier, key, customRules);

    if (resolved.type === 'BOOLEAN') {
      const isAllowed = Boolean(resolved.value);
      return {
        allowed: isAllowed,
        key,
        planTier: tier,
        type: 'BOOLEAN',
        limit: null,
        value: isAllowed,
        currentUsage,
        remaining: null,
        reason: isAllowed ? undefined : `Feature '${key}' is not included in the ${tier} plan. Please upgrade to unlock.`,
      };
    } else {
      const limit = Number(resolved.value);
      const remaining = Math.max(0, limit - currentUsage);
      const isAllowed = currentUsage < limit;

      return {
        allowed: isAllowed,
        key,
        planTier: tier,
        type: 'NUMBER',
        limit,
        value: limit,
        currentUsage,
        remaining,
        reason: isAllowed
          ? undefined
          : `Usage limit of ${limit} for '${key}' reached for ${tier} plan (used: ${currentUsage}). Please upgrade for higher allowances.`,
      };
    }
  }

  /**
   * Get complete dictionary of all resolved entitlements for a specific plan tier.
   */
  static getAllEntitlementsForPlan(
    planTier: string,
    customRules: EntitlementRule[] = []
  ): Record<string, { type: EntitlementType; value: boolean | number }> {
    const tier = this.normalizePlanTier(planTier);
    const result: Record<string, { type: EntitlementType; value: boolean | number }> = {};

    // Populate standard keys
    for (const key of Object.keys(BASELINE_ENTITLEMENT_DEFINITIONS)) {
      result[key] = this.resolveEntitlementValue(tier, key, customRules);
    }

    // Populate any extra custom rules
    customRules
      .filter((r) => r.planCode.toUpperCase() === tier)
      .forEach((r) => {
        if (!result[r.entitlementKey]) {
          result[r.entitlementKey] = this.resolveEntitlementValue(tier, r.entitlementKey, customRules);
        }
      });

    return result;
  }
}
