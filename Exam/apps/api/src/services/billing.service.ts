import { pgDb } from '@repo/database';
import {
  InvoiceDTO,
  RefundTransactionDTO,
  AICreditPackageDTO,
  PurchaseCreditPackageDTO,
  ProcessRefundRequestDTO,
} from '@repo/types';
import { defaultBillingAdapter } from './billing/mock-billing.adapter';
import { BillingAdapter } from './billing/billing-adapter.interface';
import { SubscriptionService } from './subscription.service';
import crypto from 'crypto';

export class BillingService {
  private static adapter: BillingAdapter = defaultBillingAdapter;

  static setAdapter(adapter: BillingAdapter) {
    this.adapter = adapter;
  }

  static getAdapter(): BillingAdapter {
    return this.adapter;
  }

  /**
   * List available AI credit packages.
   */
  static async listCreditPackages(): Promise<AICreditPackageDTO[]> {
    const res = await pgDb.query(
      `SELECT * FROM "ai_credit_packages" WHERE "isActive" = true ORDER BY "price" ASC`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      creditsCount: r.creditsCount,
      price: r.price,
      currency: r.currency || 'USD',
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Purchase an AI credit package via the billing engine.
   */
  static async purchaseCreditPackage(
    userId: string,
    packageId: string,
    userEmail: string = 'user@examos.local',
    isPreview: boolean = false
  ): Promise<{
    invoice: InvoiceDTO;
    creditsAdded: number;
    newTotalPurchasedCredits: number;
    transactionId: string;
  }> {
    const pkgRes = await pgDb.query(
      `SELECT * FROM "ai_credit_packages" WHERE "id" = $1 AND "isActive" = true`,
      [packageId]
    );

    if (pkgRes.rows.length === 0) {
      throw new Error(`PACKAGE_NOT_FOUND: Credit package '${packageId}' does not exist.`);
    }

    const pkg = pkgRes.rows[0] as any;
    const amount = pkg.price;
    const creditsCount = pkg.creditsCount;

    // 1. Process transaction through BillingAdapter (or simulated for preview)
    let transactionId = `tx_sim_${crypto.randomBytes(8).toString('hex')}`;
    if (!isPreview) {
      const checkoutResult = await this.adapter.createCheckoutSession({
        userId,
        userEmail,
        amount,
        currency: pkg.currency || 'USD',
        itemType: 'CREDIT_PACKAGE',
        itemId: pkg.id,
        itemName: pkg.name,
      });
      transactionId = checkoutResult.transactionId;
    }

    // 2. Add purchased credits to user_ai_credits
    await pgDb.query(
      `INSERT INTO "user_ai_credits" ("id", "userId", "includedDailyCredits", "dailyCreditsUsed", "purchasedCredits", "monthlyTokenCap", "tokensUsedThisMonth", "isCapped")
       VALUES ($1, $2, 20, 0, $3, 500000, 0, false)
       ON CONFLICT ("userId") DO UPDATE SET "purchasedCredits" = "user_ai_credits"."purchasedCredits" + $3, "updatedAt" = CURRENT_TIMESTAMP`,
      [`crd_${userId}`, userId, creditsCount]
    );

    // 3. Record invoice
    const invoiceId = `inv_${crypto.randomBytes(8).toString('hex')}`;
    const invoiceItems = [
      {
        name: pkg.name,
        amount,
        quantity: 1,
        type: 'CREDIT_PACKAGE' as const,
      },
    ];

    const invRes = await pgDb.query(
      `INSERT INTO "invoices" ("id", "userId", "amount", "currency", "items", "status", "externalId")
       VALUES ($1, $2, $3, $4, $5, 'PAID', $6)
       RETURNING *`,
      [invoiceId, userId, amount, pkg.currency || 'USD', JSON.stringify(invoiceItems), transactionId]
    );

    // 4. Log AI usage credit acquisition entry
    const usageId = `usg_${crypto.randomBytes(8).toString('hex')}`;
    await pgDb.query(
      `INSERT INTO "ai_usage_history" ("id", "userId", "feature", "creditType", "creditsDeducted", "tokensUsed", "status")
       VALUES ($1, $2, 'credit_pack_purchase', 'PURCHASED', $3, 0, 'TOP_UP')`,
      [usageId, userId, creditsCount]
    );

    const creditsRes = await pgDb.query(
      `SELECT "purchasedCredits" FROM "user_ai_credits" WHERE "userId" = $1`,
      [userId]
    );
    const newTotal = (creditsRes.rows[0] as any)?.purchasedCredits || creditsCount;

    const r = invRes.rows[0] as any;
    return {
      invoice: {
        id: r.id,
        userId: r.userId,
        amount: r.amount,
        currency: r.currency,
        items: r.items,
        status: r.status,
        externalId: r.externalId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
      creditsAdded: creditsCount,
      newTotalPurchasedCredits: newTotal,
      transactionId,
    };
  }

  /**
   * Checkout workflow for Plan Subscription.
   */
  static async checkoutSubscription(
    userId: string,
    planCode: string,
    billingCycle: 'monthly' | 'annual' = 'monthly',
    userEmail: string = 'user@examos.local',
    isPreview: boolean = false
  ): Promise<{
    invoice: InvoiceDTO;
    subscription: any;
    transactionId: string;
  }> {
    const plan = await SubscriptionService.getPlanByCode(planCode);
    if (!plan) {
      throw new Error(`PLAN_NOT_FOUND: Plan '${planCode}' does not exist.`);
    }

    const amount = plan.price;
    let transactionId = `tx_sim_${crypto.randomBytes(8).toString('hex')}`;

    if (!isPreview && amount > 0) {
      const checkoutResult = await this.adapter.createCheckoutSession({
        userId,
        userEmail,
        amount,
        currency: 'USD',
        itemType: 'SUBSCRIPTION',
        itemId: plan.code,
        itemName: `${plan.name} (${billingCycle})`,
        billingCycle,
      });
      transactionId = checkoutResult.transactionId;
    }

    // 1. Activate subscription
    const subscription = await SubscriptionService.subscribeUser(userId, plan.code, billingCycle);

    // 2. Generate invoice
    const invoiceId = `inv_${crypto.randomBytes(8).toString('hex')}`;
    const items = [
      {
        name: `${plan.name} Subscription (${billingCycle})`,
        amount,
        quantity: 1,
        type: 'SUBSCRIPTION' as const,
      },
    ];

    const invRes = await pgDb.query(
      `INSERT INTO "invoices" ("id", "userId", "amount", "currency", "items", "status", "externalId")
       VALUES ($1, $2, $3, 'USD', $4, 'PAID', $5)
       RETURNING *`,
      [invoiceId, userId, amount, JSON.stringify(items), transactionId]
    );

    const r = invRes.rows[0] as any;
    return {
      invoice: {
        id: r.id,
        userId: r.userId,
        amount: r.amount,
        currency: r.currency,
        items: r.items,
        status: r.status,
        externalId: r.externalId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
      subscription,
      transactionId,
    };
  }

  /**
   * Process full or partial refund ("return money") with automated credit & entitlement clawback.
   */
  static async processRefund(
    actorUserId: string,
    dto: ProcessRefundRequestDTO,
    isPreview: boolean = false
  ): Promise<RefundTransactionDTO> {
    const amount = dto.amount;
    const reason = dto.reason.trim();

    // 1. Find the target payment transaction / invoice
    let invoiceRow: any = null;
    if (dto.gatewayPaymentId) {
      const res = await pgDb.query(
        `SELECT * FROM "invoices" WHERE "externalId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        [dto.gatewayPaymentId]
      );
      if (res.rows.length > 0) invoiceRow = res.rows[0];
    }

    if (!invoiceRow && dto.subscriptionId) {
      const subRes = await pgDb.query(
        `SELECT * FROM "subscriptions" WHERE "id" = $1`,
        [dto.subscriptionId]
      );
      if (subRes.rows.length > 0) {
        const sub = subRes.rows[0] as any;
        const invRes = await pgDb.query(
          `SELECT * FROM "invoices" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
          [sub.userId]
        );
        if (invRes.rows.length > 0) invoiceRow = invRes.rows[0];
      }
    }

    const targetUserId = invoiceRow ? invoiceRow.userId : actorUserId;
    const originalAmount = invoiceRow ? invoiceRow.amount : amount;
    const paymentId = dto.gatewayPaymentId || invoiceRow?.externalId || `tx_manual_${Date.now()}`;

    // 2. Validate refund threshold
    if (amount > originalAmount && originalAmount > 0) {
      throw new Error(`REFUND_EXCEEDS_ORIGINAL: Refund amount ($${amount}) cannot exceed original transaction ($${originalAmount}).`);
    }

    // 3. Process refund through Gateway Adapter
    let gatewayRefundId = `ref_sim_${crypto.randomBytes(8).toString('hex')}`;
    if (!isPreview) {
      const adapterResult = await this.adapter.processRefund({
        gatewayPaymentId: paymentId,
        amount,
        reason,
      });
      gatewayRefundId = adapterResult.gatewayRefundId;
    }

    // 4. Automated Clawback
    let clawbackCreditsCount = 0;
    const shouldClawback = dto.clawbackCredits !== false;

    if (shouldClawback) {
      // If invoice was for a credit pack, revoke unspent purchased credits
      if (invoiceRow && Array.isArray(invoiceRow.items)) {
        const creditItem = invoiceRow.items.find((i: any) => i.type === 'CREDIT_PACKAGE');
        if (creditItem) {
          // Estimate credits from amount or standard pack size (e.g. $9.99 = 5 credits)
          const creditsToClaw = amount >= 29.99 ? 20 : amount >= 9.99 ? 5 : 1;
          await pgDb.query(
            `UPDATE "user_ai_credits"
             SET "purchasedCredits" = GREATEST(0, "purchasedCredits" - $1), "updatedAt" = CURRENT_TIMESTAMP
             WHERE "userId" = $2`,
            [creditsToClaw, targetUserId]
          );
          clawbackCreditsCount = creditsToClaw;
        }
      }

      // If subscription was refunded, downgrade or cancel subscription
      if (dto.subscriptionId) {
        await pgDb.query(
          `UPDATE "subscriptions"
           SET "status" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          [dto.subscriptionId]
        );
      } else if (invoiceRow) {
        // Cancel active subscription for the refunded student
        await pgDb.query(
          `UPDATE "subscriptions"
           SET "status" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "userId" = $1 AND "status" = 'ACTIVE'`,
          [targetUserId]
        );
      }
    }

    // 5. Update invoice status to REFUNDED
    if (invoiceRow) {
      await pgDb.query(
        `UPDATE "invoices" SET "status" = 'REFUNDED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
        [invoiceRow.id]
      );
    }

    // 6. Record refund transaction audit record
    const refundId = `ref_tx_${crypto.randomBytes(8).toString('hex')}`;
    const isPartial = amount < originalAmount;

    const res = await pgDb.query(
      `INSERT INTO "refund_transactions" (
        "id", "subscriptionId", "userId", "actorUserId", "gateway", "gatewayPaymentId", "gatewayRefundId",
        "originalAmount", "refundAmount", "currency", "isPartial", "clawbackCreditsCount", "status", "reason"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'USD', $10, $11, 'COMPLETED', $12)
      RETURNING *`,
      [
        refundId,
        dto.subscriptionId || null,
        targetUserId,
        actorUserId,
        isPreview ? 'SIMULATED' : this.adapter.name,
        paymentId,
        gatewayRefundId,
        originalAmount,
        amount,
        isPartial,
        clawbackCreditsCount,
        reason,
      ]
    );

    const r = res.rows[0] as any;
    return {
      id: r.id,
      subscriptionId: r.subscriptionId,
      userId: r.userId,
      actorUserId: r.actorUserId,
      gateway: r.gateway,
      gatewayPaymentId: r.gatewayPaymentId,
      gatewayRefundId: r.gatewayRefundId,
      originalAmount: r.originalAmount,
      refundAmount: r.refundAmount,
      currency: r.currency,
      isPartial: r.isPartial,
      clawbackCreditsCount: r.clawbackCreditsCount,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  /**
   * List invoices for a user.
   */
  static async listUserInvoices(userId: string): Promise<InvoiceDTO[]> {
    const res = await pgDb.query(
      `SELECT * FROM "invoices" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [userId]
    );
    return res.rows as any[];
  }

  /**
   * List all transactions and refunds for Admin Financial Audit.
   */
  static async listFinancialTransactions(limit: number = 50): Promise<RefundTransactionDTO[]> {
    const res = await pgDb.query(
      `SELECT * FROM "refund_transactions" ORDER BY "createdAt" DESC LIMIT $1`,
      [limit]
    );
    return res.rows as any[];
  }

  /**
   * Get refund transaction details by ID.
   */
  static async getRefundById(id: string): Promise<RefundTransactionDTO | null> {
    const res = await pgDb.query(
      `SELECT * FROM "refund_transactions" WHERE "id" = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0] as any;
  }
}
