const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

async function migratePhase13() {
  const dbPath = path.resolve(__dirname, '../../../../postgres-data');
  const pidFile = path.join(dbPath, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }

  console.log('Applying Phase 13 Schema Migration (Subscriptions, Entitlements & Billing) to:', dbPath);
  const db = new PGlite(dbPath);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS "plans" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT UNIQUE NOT NULL,
      "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
      "description" TEXT,
      "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "entitlement_rules" (
      "id" TEXT PRIMARY KEY,
      "planCode" TEXT NOT NULL REFERENCES "plans"("code") ON DELETE CASCADE,
      "entitlementKey" TEXT NOT NULL,
      "entitlementType" TEXT NOT NULL DEFAULT 'BOOLEAN',
      "entitlementValue" TEXT NOT NULL DEFAULT 'false',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("planCode", "entitlementKey")
    );

    CREATE TABLE IF NOT EXISTS "subscriptions" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "planCode" TEXT NOT NULL DEFAULT 'FREE',
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "startDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" TIMESTAMP NOT NULL,
      "cancelledAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "ai_credit_packages" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "creditsCount" INT NOT NULL DEFAULT 5,
      "price" DOUBLE PRECISION NOT NULL DEFAULT 9.99,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "invoices" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "status" TEXT NOT NULL DEFAULT 'PAID',
      "externalId" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "refund_transactions" (
      "id" TEXT PRIMARY KEY,
      "subscriptionId" TEXT REFERENCES "subscriptions"("id") ON DELETE SET NULL,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "actorUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "gateway" TEXT NOT NULL DEFAULT 'MOCK',
      "gatewayPaymentId" TEXT NOT NULL,
      "gatewayRefundId" TEXT NOT NULL,
      "originalAmount" DOUBLE PRECISION NOT NULL,
      "refundAmount" DOUBLE PRECISION NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "isPartial" BOOLEAN NOT NULL DEFAULT false,
      "clawbackCreditsCount" INT NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'COMPLETED',
      "reason" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "idx_subscriptions_user" ON "subscriptions"("userId");
    CREATE INDEX IF NOT EXISTS "idx_invoices_user" ON "invoices"("userId");
    CREATE INDEX IF NOT EXISTS "idx_refund_transactions_user" ON "refund_transactions"("userId");
    CREATE INDEX IF NOT EXISTS "idx_refund_transactions_gateway_payment" ON "refund_transactions"("gatewayPaymentId");
  `);

  console.log('Phase 13 Schema Migration Completed Successfully!');
  process.exit(0);
}

migratePhase13().catch((e) => {
  console.error('Phase 13 Migration failed:', e);
  process.exit(1);
});
